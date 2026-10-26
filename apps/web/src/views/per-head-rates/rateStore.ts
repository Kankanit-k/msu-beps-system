'use client';

/**
 * อัตราค่าธรรมเนียมรายหัวที่ตั้งค่าได้รายปี (หักสมทบมหาวิทยาลัย · ค่าธรรมเนียมรายการหลัก)
 *
 * - ผู้ดูแลระดับมหาวิทยาลัยเสนออัตราใหม่ → รออนุมัติ → อนุมัติแล้วจึงมีผลกับการคำนวณ (ตัดสินใจ 2026-10-21)
 * - ยังไม่เคยอนุมัติ = ใช้อัตราตามชีต (แท็บ 4 D38/D39) · ตอนนี้ตั้งได้เฉพาะปีงบ 2568
 *
 * ⚠️ ตอนนี้เก็บใน localStorage ของเบราว์เซอร์ (ยังไม่มีฐานข้อมูลที่ต่อกับแอป) — ย้ายไปตาราง
 *    `per_student_charge` (db/01_schema.sql) เมื่อมี API โดยคง hook/ฟังก์ชันชุดนี้ไว้ หน้าที่เรียกใช้ไม่ต้องแก้
 */
import { useCallback, useEffect, useState } from 'react';

import { MAIN_FEE_RATE, UNI_SHARE_RATE } from '@views/scenario-program/newProgramCalc';

export type RateKey = 'uniShare' | 'mainFee';

export const RATE_YEAR = '2568';

/** อัตราตามชีต บาท/คน/ภาค — ใช้เมื่อยังไม่มีอัตราที่อนุมัติ */
export const SHEET_RATES: Record<RateKey, number> = {
  uniShare: UNI_SHARE_RATE,
  mainFee: MAIN_FEE_RATE,
};

export type Rates = Record<RateKey, number>;

export interface RateProposal {
  rate: number;
  note: string;
  by: string;
  at: string;
}

export interface RateLog {
  action: 'propose' | 'approve' | 'reject' | 'cancel';
  rate: number;
  note: string;
  by: string;
  at: string;
}

export interface RateRecord {
  /** null = ยังไม่เคยอนุมัติ ใช้อัตราตามชีต */
  approved: (RateProposal & { approvedBy: string; approvedAt: string }) | null;
  pending: RateProposal | null;
  /** ใหม่สุดก่อน */
  log: RateLog[];
}

const KEY = 'beps:per-head-rates:v1';
const EVENT = 'beps-per-head-rates-change';
const EMPTY: RateRecord = { approved: null, pending: null, log: [] };

type Store = Record<string, RateRecord>;

const keyOf = (k: RateKey, year: string) => `${k}|${year}`;

const readStore = (): Store => {
  try {
    const raw = window.localStorage.getItem(KEY);

    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
};

/** @returns false เมื่อเบราว์เซอร์ไม่ให้บันทึก (โหมดส่วนตัว/พื้นที่เต็ม) */
const update = (k: RateKey, year: string, fn: (r: RateRecord) => RateRecord): boolean => {
  try {
    const s = readStore();

    s[keyOf(k, year)] = fn(s[keyOf(k, year)] ?? EMPTY);
    window.localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event(EVENT));

    return true;
  } catch {
    return false;
  }
};

const now = () => new Date().toISOString();

export const proposeRate = (k: RateKey, year: string, rate: number, note: string, by: string) =>
  update(k, year, (r) => ({
    ...r,
    pending: { rate, note, by, at: now() },
    log: [{ action: 'propose', rate, note, by, at: now() }, ...r.log],
  }));

export const approveRate = (k: RateKey, year: string, by: string) =>
  update(k, year, (r) =>
    r.pending
      ? {
          approved: { ...r.pending, approvedBy: by, approvedAt: now() },
          pending: null,
          log: [{ action: 'approve', rate: r.pending.rate, note: '', by, at: now() }, ...r.log],
        }
      : r,
  );

/** ไม่อนุมัติ (ผู้อนุมัติ) หรือถอนคำเสนอ (ผู้เสนอ) — อัตราที่ใช้อยู่ไม่เปลี่ยน */
export const dropProposal = (
  k: RateKey,
  year: string,
  action: 'reject' | 'cancel',
  note: string,
  by: string,
) =>
  update(k, year, (r) =>
    r.pending
      ? {
          ...r,
          pending: null,
          log: [{ action, rate: r.pending.rate, note, by, at: now() }, ...r.log],
        }
      : r,
  );

/** บันทึกอัตราของปี — `ready` = อ่านจากที่เก็บแล้ว */
export const useRateRecord = (k: RateKey, year: string = RATE_YEAR) => {
  const [record, setRecord] = useState<RateRecord>(EMPTY);
  const [ready, setReady] = useState(false);

  const read = useCallback(() => {
    setRecord(readStore()[keyOf(k, year)] ?? EMPTY);
    setReady(true);
  }, [k, year]);

  useEffect(() => {
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener('storage', read);

    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener('storage', read);
    };
  }, [read]);

  return { record, ready };
};

/** อัตราที่มีผลกับการคำนวณ (อนุมัติแล้ว หรืออัตราตามชีต) บาท/คน/ภาค */
export const useRates = (year: string = RATE_YEAR): Rates => {
  const uni = useRateRecord('uniShare', year).record.approved;
  const main = useRateRecord('mainFee', year).record.approved;

  return {
    uniShare: uni?.rate ?? SHEET_RATES.uniShare,
    mainFee: main?.rate ?? SHEET_RATES.mainFee,
  };
};

export const fmtAt = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
