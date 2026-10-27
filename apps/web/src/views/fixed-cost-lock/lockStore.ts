'use client';

/**
 * วิธีปันส่วนต้นทุนคงที่ของคณะ (ปีงบ × คณะ) — มติประชุม 25 ต.ค. 2569 (ปันส่วน.pdf)
 *
 * - ไม่บังคับให้คณะเลือก: ปีนี้ยังไม่ได้ตั้งค่า → ใช้ค่าปีก่อนหน้าที่ใกล้ที่สุด → ไม่เคยตั้งเลยใช้ค่าตามแบบจำลอง
 *   Excel (หารรายหัวแยกตามระดับการศึกษา = DEFAULT_ALLOC_CHOICE) — `useFacultyLock` คืนค่าที่ใช้จริงเสมอ
 * - ผู้ดูแลคณะ "บันทึกการตั้งค่า" ของปีนั้นได้ และแก้ได้อิสระ จนกว่าจะมีหลักสูตรในคณะยืนยันเอกสารฉบับจริง
 *   ในปีนั้น → ล็อกทันที (`submitLock`) · เปลี่ยนต้องทำบันทึกขออนุมัติ แล้วกองแผนปลดล็อก
 *
 * ⚠️ ตอนนี้เก็บใน localStorage ของเบราว์เซอร์ (ยังไม่มีฐานข้อมูลที่ต่อกับแอป) — สลับบทบาทในเครื่องเดียวกัน
 *    เห็นค่าร่วมกัน แต่คนละเครื่องไม่เห็น · ย้ายไปตาราง `fixed_cost_policy` (db/01_schema.sql) เมื่อมี API
 *    โดยคงชื่อฟังก์ชันไว้ หน้าที่เรียกใช้ไม่ต้องแก้
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { facultyRows, poolAmountOf } from '@views/fixed-cost-policy/data';
import {
  allocateFaculty,
  allocBuckets,
  DEFAULT_ALLOC_CHOICE,
  levelCapIssue,
  policyOf,
  type AllocChoice,
} from '@views/scenario-program/facultyAllocation';

/** ล็อกเพราะมีหลักสูตรยืนยันเอกสารฉบับจริงแล้ว */
export interface SubmitLock {
  at: string;
  by: string;
  /** หลักสูตรที่ยืนยันเป็นรายการแรก */
  program: string;
}

/** ที่มาของวิธีที่ใช้คำนวณ */
export type PolicySource = 'config' | 'prev-year' | 'default';

export interface FacultyLock {
  year: string;
  faculty: string;
  choice: AllocChoice;
  /** เวลา/ผู้บันทึกการตั้งค่า (ชื่อฟิลด์คงเดิมจากรุ่นที่ "ล็อก" = บันทึก) */
  lockedAt: string;
  lockedBy: string;
  submitLock?: SubmitLock;
  /** ประวัติปลดล็อก (ใหม่สุดก่อน) — memo = เลขที่บันทึกข้อความขออนุมัติ */
  unlockLog?: { at: string; by: string; memo: string; program: string }[];
  /** เฉพาะค่าที่ useFacultyLock คืน — config = คณะตั้งปีนี้ · prev-year = ยกจากปี fromYear · default = ตาม Excel */
  source?: PolicySource;
  fromYear?: string;
  /** ค่าปีก่อนใช้กับปีนี้ไม่ได้ (เช่น % ไม่ครบเพราะหลักสูตรเปลี่ยน) จึงใช้ค่าตาม Excel แทน */
  prevInvalidYear?: string;
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

/**
 * บันทึกการตั้งค่าของคณะ (ปีนั้น) — แก้ทับได้จนกว่าจะล็อกจากการยืนยันเอกสาร
 * @returns false เมื่อล็อกแล้ว หรือเบราว์เซอร์ไม่ให้บันทึก (โหมดส่วนตัว/พื้นที่เต็ม)
 */
export const lockFaculty = (lock: Omit<FacultyLock, 'lockedAt'>): boolean => {
  const s = readStore();

  if (s[keyOf(lock.year, lock.faculty)]?.submitLock) return false;

  return writeStore({
    ...s,
    [keyOf(lock.year, lock.faculty)]: {
      year: lock.year,
      faculty: lock.faculty,
      choice: lock.choice,
      lockedBy: lock.lockedBy,
      lockedAt: new Date().toISOString(),
      ...(s[keyOf(lock.year, lock.faculty)]?.unlockLog
        ? { unlockLog: s[keyOf(lock.year, lock.faculty)]!.unlockLog }
        : {}),
    },
  });
};

/** ลบการตั้งค่าของปีนั้น (กลับไปใช้ค่าปีก่อน/ตาม Excel) — ทำไม่ได้เมื่อล็อกแล้ว */
export const unlockFaculty = (year: string, faculty: string): boolean => {
  const s = readStore();

  if (s[keyOf(year, faculty)]?.submitLock) return false;
  delete s[keyOf(year, faculty)];

  return writeStore(s);
};

/**
 * หลักสูตรยืนยันเอกสารฉบับจริง → บันทึกวิธีที่ใช้คำนวณเป็นการตั้งค่าของปีนั้น (ถ้ายังไม่ได้ตั้ง) แล้วล็อก
 * ล็อกอยู่แล้ว = ไม่เปลี่ยนอะไร (ล็อกตามหลักสูตรแรก)
 */
export const lockFacultyBySubmit = (
  year: string,
  faculty: string,
  used: AllocChoice,
  info: SubmitLock,
): boolean => {
  const s = readStore();
  const cur = s[keyOf(year, faculty)];

  if (cur?.submitLock) return true;

  return writeStore({
    ...s,
    [keyOf(year, faculty)]: cur
      ? { ...cur, submitLock: info }
      : {
          year,
          faculty,
          choice: used,
          lockedAt: new Date().toISOString(),
          lockedBy: `${info.by} (บันทึกอัตโนมัติเมื่อยืนยันเอกสาร)`,
          submitLock: info,
        },
  });
};

/** ล็อกจากการยืนยันเอกสารแล้วหรือยัง — การจำแนกต้นทุน (classStore) ใช้ล็อกชุดเดียวกัน */
export const isSubmitLocked = (year: string, faculty: string): boolean =>
  !!readStore()[keyOf(year, faculty)]?.submitLock;

/**
 * ปลดล็อกจากการยืนยันเอกสาร — กองแผนเท่านั้น หลังได้รับบันทึกข้อความขออนุมัติ (ต้องระบุเลขที่)
 * การตั้งค่ายังอยู่ แก้ต่อได้ · เก็บประวัติการปลดล็อกไว้ใน `unlockLog`
 */
export const unlockSubmit = (year: string, faculty: string, memo: string, by: string): boolean => {
  const s = readStore();
  const cur = s[keyOf(year, faculty)];

  if (!cur?.submitLock) return true;

  const rest = { ...cur };

  delete rest.submitLock;
  rest.unlockLog = [
    { at: new Date().toISOString(), by, memo, program: cur.submitLock.program },
    ...(cur.unlockLog ?? []),
  ];

  return writeStore({ ...s, [keyOf(year, faculty)]: rest });
};

/** วิธีนี้ใช้กับหลักสูตรของคณะในชุดข้อมูลปัจจุบันได้ไหม (เช่น กำหนด % ต้องครบ 100 และตรงกับหลักสูตรที่มีอยู่) */
export const choiceValidFor = (faculty: string, choice: AllocChoice): boolean => {
  const programs = facultyRows(faculty).map(({ p, id }) => ({
    id,
    label: p.prog,
    educationLevel: p.lvl,
    q: p.Q,
    sheetShare: poolAmountOf('ALL')(p),
  }));

  if (programs.length === 0) return false;

  const scenario = { pool: programs.reduce((a, p) => a + p.sheetShare, 0), programs };
  const buckets = allocBuckets(scenario, choice.bucketLevel);

  return (
    allocateFaculty(scenario, policyOf(choice, buckets)).applied && !levelCapIssue(choice, buckets)
  );
};

/** ค่าที่ใช้คำนวณจริง: ปีนี้ → ปีก่อนที่ใกล้ที่สุด (ที่ใช้ได้) → ตาม Excel */
export const resolveFacultyPolicy = (
  store: Store,
  year: string,
  faculty: string,
  isValid: (choice: AllocChoice) => boolean = (c) => choiceValidFor(faculty, c),
): FacultyLock => {
  const own = store[keyOf(year, faculty)];

  if (own) return { ...own, source: 'config' };

  const prev = Object.values(store)
    .filter((l) => l.faculty === faculty && Number(l.year) < Number(year))
    .sort((a, b) => Number(b.year) - Number(a.year))[0];

  if (prev && isValid(prev.choice)) {
    return {
      year,
      faculty,
      choice: prev.choice,
      lockedAt: prev.lockedAt,
      lockedBy: prev.lockedBy,
      source: 'prev-year',
      fromYear: prev.year,
    };
  }

  return {
    year,
    faculty,
    choice: DEFAULT_ALLOC_CHOICE,
    lockedAt: '',
    lockedBy: '',
    source: 'default',
    ...(prev ? { prevInvalidYear: prev.year } : {}),
  };
};

/** ป้ายบอกที่มาของวิธีที่ใช้ */
export const policySourceLabel = (l: FacultyLock): string =>
  l.source === 'prev-year'
    ? `ใช้ค่าปี ${l.fromYear} (คณะยังไม่ได้ตั้งค่าปี ${l.year})`
    : l.source === 'default'
      ? 'ค่าเริ่มต้นตามแบบจำลอง Excel (คณะยังไม่เคยตั้งค่า)'
      : l.submitLock
        ? `🔒 คณะตั้งค่าปี ${l.year} · ล็อกแล้ว`
        : `คณะตั้งค่าปี ${l.year}`;

const useStore = () => {
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

  return { store, ready };
};

/**
 * วิธีปันส่วนที่ใช้คำนวณจริงของคณะ (มีค่าเสมอเมื่อเลือกคณะแล้ว — ดู `source`)
 * `ready` = อ่านจากที่เก็บแล้ว (ก่อนหน้านั้นยังไม่รู้ค่า อย่าเพิ่งแสดงผล)
 */
export const useFacultyLock = (year: string, faculty: string | null) => {
  const { store, ready } = useStore();
  // คืนวัตถุเดิมเมื่อที่เก็บไม่เปลี่ยน — หน้าที่ใส่ lock ใน deps ของ effect จะได้ไม่วนซ้ำ
  const lock = useMemo(
    () => (ready && faculty ? resolveFacultyPolicy(store, year, faculty) : null),
    [store, ready, year, faculty],
  );

  return { lock, ready };
};

/** การตั้งค่าของคณะปีนั้นตามที่บันทึกจริง (null = ยังไม่ได้ตั้ง) — หน้าตั้งค่าใช้ตัวนี้ */
export const useFacultyConfig = (year: string, faculty: string | null) => {
  const { store, ready } = useStore();

  return { config: faculty ? (store[keyOf(year, faculty)] ?? null) : null, ready };
};

export const fmtLockedAt = (iso: string) =>
  iso ? new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
