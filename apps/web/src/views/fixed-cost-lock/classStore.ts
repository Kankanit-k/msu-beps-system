'use client';

/**
 * การจำแนกต้นทุนคงที่/ผันแปรของคณะ (ปี × คณะ) — มติ "ตั้งค่าต้นทุน.pdf" 27 ต.ค. 2569 (PLAN-2026-10-27-cost-config)
 *
 * - เป็นนโยบายระดับคณะ: ทุกหลักสูตรในคณะใช้ชุดเดียวกัน · เก็บเฉพาะรายการที่ต่างจากค่าตั้งต้นของมหาวิทยาลัย
 * - ค่าที่มีผลต่อบัญชี: คณะตั้งปีนี้ → คณะตั้งปีก่อนที่ใกล้ที่สุด → ค่าตั้งต้นมหาวิทยาลัย (account-rules ที่อนุมัติ → Excel)
 * - ล็อกพร้อมวิธีปันส่วน: ใช้ submitLock ของ lockStore (ยืนยัน/พิมพ์ฉบับจริงแล้ว = แก้ไม่ได้ จนกองแผนปลดล็อก)
 *
 * ⚠️ ยังไม่มีผลกับตัวเลข — ต้องมีงบรายบรรทัดแยกคณะก่อน (AR-1/AR-2) · เก็บใน localStorage จนกว่าจะมี API
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Behavior } from '@views/account-rules/data';

import { isSubmitLocked } from './lockStore';

export interface ClassRow {
  beh: Behavior;
  /** สัดส่วนคงที่ 0–1 (ผันแปร = 1 − f) */
  f: number;
}

export interface FacultyClassification {
  year: string;
  faculty: string;
  /** key = คีย์ผสม 4 ระดับ · เฉพาะรายการที่ต่างจากค่าตั้งต้น */
  rows: Record<string, ClassRow>;
  savedAt: string;
  savedBy: string;
}

export type ClassSource = 'config' | 'prev-year' | 'default';

export interface ResolvedClassification {
  rows: Record<string, ClassRow>;
  source: ClassSource;
  fromYear?: string;
}

const KEY = 'beps:faculty-classification:v1';
const EVENT = 'beps-faculty-classification-change';

type Store = Record<string, FacultyClassification>;

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

/** @returns false เมื่อล็อกแล้ว หรือเบราว์เซอร์ไม่ให้บันทึก */
export const saveClassification = (
  year: string,
  faculty: string,
  rows: Record<string, ClassRow>,
  savedBy: string,
): boolean =>
  !isSubmitLocked(year, faculty) &&
  writeStore({
    ...readStore(),
    [keyOf(year, faculty)]: { year, faculty, rows, savedBy, savedAt: new Date().toISOString() },
  });

/** ลบการจำแนกของปีนั้น → กลับไปใช้ค่าปีก่อน/ค่าตั้งต้น */
export const clearClassification = (year: string, faculty: string): boolean => {
  if (isSubmitLocked(year, faculty)) return false;
  const s = readStore();

  delete s[keyOf(year, faculty)];

  return writeStore(s);
};

/** ค่าที่มีผล: ปีนี้ → ปีก่อนที่ใกล้ที่สุด → ค่าตั้งต้น (rows ว่าง) */
export const resolveClassification = (
  store: Store,
  year: string,
  faculty: string,
): ResolvedClassification => {
  const own = store[keyOf(year, faculty)];

  if (own) return { rows: own.rows, source: 'config' };

  const prev = Object.values(store)
    .filter((c) => c.faculty === faculty && Number(c.year) < Number(year))
    .sort((a, b) => Number(b.year) - Number(a.year))[0];

  return prev
    ? { rows: prev.rows, source: 'prev-year', fromYear: prev.year }
    : { rows: {}, source: 'default' };
};

/** การจำแนกของคณะ: `config` = ที่บันทึกปีนี้ (null = ยังไม่ตั้ง) · `effective` = ค่าที่มีผล */
export const useFacultyClassification = (year: string, faculty: string | null) => {
  const [store, setStore] = useState<Store>({});
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

  const effective = useMemo(
    () => (faculty ? resolveClassification(store, year, faculty) : null),
    [store, year, faculty],
  );

  return { config: faculty ? (store[keyOf(year, faculty)] ?? null) : null, effective, ready };
};
