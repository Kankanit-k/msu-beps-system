'use client';

/**
 * วิธีปันส่วนต้นทุนคงที่ที่คณะล็อกไว้ (ปีงบ × คณะ) — ตามมติประชุม
 *
 * - ผู้ดูแลคณะเลือก 1 ใน 3 วิธีแล้วกดล็อก → มีผลทันที ไม่ต้องรออนุมัติ
 * - คณะปลดล็อกเพื่อเปลี่ยนวิธีได้เอง
 * - อาจารย์ประจำหลักสูตรเริ่มคำนวณได้ก็ต่อเมื่อคณะล็อกแล้ว และแก้วิธีไม่ได้
 *
 * ⚠️ ตอนนี้เก็บใน localStorage ของเบราว์เซอร์ (ยังไม่มีฐานข้อมูลที่ต่อกับแอป) — สลับบทบาทในเครื่องเดียวกัน
 *    เห็นค่าร่วมกัน แต่คนละเครื่องไม่เห็น · ย้ายไปตาราง `fixed_cost_policy` (db/01_schema.sql) เมื่อมี API
 *    โดยคง `useFacultyLock` / `lockFaculty` / `unlockFaculty` ไว้ หน้าที่เรียกใช้ไม่ต้องแก้
 */
import { useCallback, useEffect, useState } from 'react';

import type { AllocChoice } from '@views/scenario-program/facultyAllocation';

export interface FacultyLock {
  year: string;
  faculty: string;
  choice: AllocChoice;
  lockedAt: string;
  lockedBy: string;
}

const KEY = 'beps:fixed-cost-lock:v1';
const EVENT = 'beps-fixed-cost-lock-change';

type Store = Record<string, FacultyLock>;

const keyOf = (year: string, faculty: string) => `${year}|${faculty}`;

const readStore = (): Store => {
  try {
    const raw = window.localStorage.getItem(KEY);

    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
};

const writeStore = (s: Store): boolean => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event(EVENT));

    return true;
  } catch {
    return false;
  }
};

/** @returns false เมื่อเบราว์เซอร์ไม่ให้บันทึก (โหมดส่วนตัว/พื้นที่เต็ม) */
export const lockFaculty = (lock: Omit<FacultyLock, 'lockedAt'>): boolean =>
  writeStore({
    ...readStore(),
    [keyOf(lock.year, lock.faculty)]: { ...lock, lockedAt: new Date().toISOString() },
  });

export const unlockFaculty = (year: string, faculty: string): boolean => {
  const s = readStore();

  delete s[keyOf(year, faculty)];

  return writeStore(s);
};

/**
 * ค่าที่ล็อกของคณะ — `ready` = อ่านจากที่เก็บแล้ว (ก่อนหน้านั้นยังไม่รู้ว่าล็อกหรือไม่
 * อย่าเพิ่งขึ้นข้อความ "ยังไม่ล็อก")
 */
export const useFacultyLock = (year: string, faculty: string | null) => {
  const [lock, setLock] = useState<FacultyLock | null>(null);
  const [ready, setReady] = useState(false);

  const read = useCallback(() => {
    setLock(faculty ? (readStore()[keyOf(year, faculty)] ?? null) : null);
    setReady(true);
  }, [year, faculty]);

  useEffect(() => {
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener('storage', read);

    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener('storage', read);
    };
  }, [read]);

  return { lock, ready };
};

export const fmtLockedAt = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
