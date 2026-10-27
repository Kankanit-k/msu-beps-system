'use client';

/**
 * แก้กติกาคงที่/ผันแปร (TFC/TVC) ของบัญชีคีย์ผสม 4 ระดับ รายปี — เสนอ → รออนุมัติ → อนุมัติแล้วจึงแทนค่าตามชีต
 * (รูปแบบเดียวกับ views/per-head-rates/rateStore.ts)
 *
 * ⚠️ ตอนนี้กติกาที่อนุมัติยังไม่มีผลกับการคำนวณ — ตัวเลขทั้งระบบยังตามชีต (แผน PLAN-2026-10-27-account-rules-calc.html)
 * ⚠️ เก็บใน localStorage ของเบราว์เซอร์ — ย้ายไปตาราง account_behavior_rule เมื่อมี API โดยคงฟังก์ชันชุดนี้ไว้
 */
import { useCallback, useEffect, useState } from 'react';

import type { AccountRule, Behavior, METHOD } from './data';

export interface RuleChange {
  beh: Behavior;
  /** สัดส่วนคงที่ 0–1 (ผันแปร = 1 − f) */
  f: number;
  m: keyof typeof METHOD;
  note: string;
  by: string;
  at: string;
}

export interface RuleLog extends RuleChange {
  action: 'propose' | 'approve' | 'reject' | 'cancel';
}

export interface RuleRecord {
  /** null = ยังไม่เคยอนุมัติ ใช้กติกาตามชีต */
  approved: (RuleChange & { approvedBy: string; approvedAt: string }) | null;
  pending: RuleChange | null;
  /** ใหม่สุดก่อน */
  log: RuleLog[];
}

/** คีย์ `${accountKey}|${year}` */
export type RuleStore = Record<string, RuleRecord>;

const KEY = 'beps:account-rules:v1';
const EVENT = 'beps-account-rules-change';

export const EMPTY_RECORD: RuleRecord = { approved: null, pending: null, log: [] };

export const recordKey = (account: string, year: number) => `${account}|${year}`;

const readStore = (): RuleStore => {
  try {
    const raw = window.localStorage.getItem(KEY);

    return raw ? (JSON.parse(raw) as RuleStore) : {};
  } catch {
    return {};
  }
};

/** @returns false เมื่อเบราว์เซอร์ไม่ให้บันทึก (โหมดส่วนตัว/พื้นที่เต็ม) */
const update = (account: string, year: number, fn: (r: RuleRecord) => RuleRecord): boolean => {
  try {
    const s = readStore();
    const k = recordKey(account, year);

    s[k] = fn(s[k] ?? EMPTY_RECORD);
    window.localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event(EVENT));

    return true;
  } catch {
    return false;
  }
};

const now = () => new Date().toISOString();

export const proposeRule = (
  account: string,
  year: number,
  change: Pick<RuleChange, 'beh' | 'f' | 'm' | 'note'>,
  by: string,
) =>
  update(account, year, (r) => {
    const c = { ...change, by, at: now() };

    return { ...r, pending: c, log: [{ ...c, action: 'propose' }, ...r.log] };
  });

export const approveRule = (account: string, year: number, by: string) =>
  update(account, year, (r) =>
    r.pending
      ? {
          approved: { ...r.pending, approvedBy: by, approvedAt: now() },
          pending: null,
          log: [{ ...r.pending, action: 'approve', note: '', by, at: now() }, ...r.log],
        }
      : r,
  );

/** ไม่อนุมัติ (ผู้อนุมัติ) หรือถอนคำเสนอ (ผู้เสนอ) — กติกาที่ใช้อยู่ไม่เปลี่ยน */
export const dropRule = (
  account: string,
  year: number,
  action: 'reject' | 'cancel',
  note: string,
  by: string,
) =>
  update(account, year, (r) =>
    r.pending
      ? { ...r, pending: null, log: [{ ...r.pending, action, note, by, at: now() }, ...r.log] }
      : r,
  );

/** ที่เก็บกติกาที่แก้ทั้งหมด — `ready` = อ่านจากที่เก็บแล้ว */
export const useRuleStore = () => {
  const [store, setStore] = useState<RuleStore>({});
  const [ready, setReady] = useState(false);

  const read = useCallback(() => {
    setStore(readStore());
    setReady(true);
  }, []);

  useEffect(() => {
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener('storage', read);

    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener('storage', read);
    };
  }, [read]);

  return { store, ready };
};

/** กติกาที่มีผล = ที่อนุมัติแล้ว ถ้ามี ไม่งั้นตามชีต */
export const effectiveRule = (base: AccountRule, rec: RuleRecord | undefined): AccountRule =>
  rec?.approved
    ? {
        ...base,
        beh: rec.approved.beh,
        f: rec.approved.f,
        v: 1 - rec.approved.f,
        m: rec.approved.m,
        note: rec.approved.note,
      }
    : base;

/** สัดส่วนคงที่ตามประเภท — MIXED ใช้ค่าที่กรอก · ยังไม่จำแนก = 0 */
export const fixedShare = (beh: Behavior, f: number) =>
  beh === 'TFC' ? 1 : beh === 'TVC' ? 0 : beh === 'MIXED' ? f : 0;

export const fmtAt = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
