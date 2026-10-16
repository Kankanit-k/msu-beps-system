/**
 * แผนที่บันทึกจากห้องจำลองแผนรับนิสิต (/scenario/sandbox) + ร่างที่กำลังกรอก
 *
 * เก็บใน localStorage ไปก่อน (ยังไม่มี apps/api) — ประกาศ async ไว้เหมือน admissionPlanStore.ts
 * ตอนย้ายขึ้นเซิร์ฟเวอร์เปลี่ยนแค่ข้างในไฟล์นี้ โดย API ต้องคืนเฉพาะแผนของผู้ใช้ที่ล็อกอิน
 * (ทุกบทบาทรวมผู้ดูแลคณะเห็นแค่ของตัวเอง — ดู ADMISSION-PLAN-API.md ข้อ 4)
 */
import type { RevenueMode } from '@beps/calc-engine';

import type { Segment } from './newProgramCalc';

export interface SandboxInput {
  fac: string | null;
  level: string;
  /** `fac|lvl|prog|deg` เหมือน refKey ของหน้าคำนวณ */
  refKey: string | null;
  semesters: number;
  segs: Segment[];
}

export interface SandboxPlan extends SandboxInput {
  id: number;
  name: string;
  /** ISO 8601 */
  savedAt: string;
  /** ปีงบของข้อมูลต้นทุนที่ใช้คำนวณ — ข้อมูลปีใหม่เข้ามา ผลเก่ายังอ่านได้ว่าคิดจากปีไหน */
  dataYear: string;
  progLabel: string;
  q: number;
  result: Record<RevenueMode, { qStar: number | null; profit: number }>;
}

const PLANS_KEY = 'beps.sandbox.plans';
const DRAFT_KEY = 'beps.sandbox.draft';
/** เก็บเท่าที่พอใช้ กัน localStorage บวม */
const MAX_PLANS = 100;

const read = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);

    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    // ข้อมูลเสีย/โหมดส่วนตัว — ถือว่าไม่มี ดีกว่าทำหน้าพัง
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // เต็มหรือถูกบล็อก — ข้อมูลในหน้าปัจจุบันยังใช้ได้ตามปกติ
  }
};

export const loadPlans = async (): Promise<SandboxPlan[]> => {
  const parsed = read<unknown>(PLANS_KEY, []);

  return Array.isArray(parsed) ? (parsed as SandboxPlan[]) : [];
};

export const savePlans = async (plans: SandboxPlan[]): Promise<void> =>
  write(PLANS_KEY, plans.slice(0, MAX_PLANS));

export const loadDraft = (): SandboxInput | null => read<SandboxInput | null>(DRAFT_KEY, null);

export const saveDraft = (d: SandboxInput | null) => write(DRAFT_KEY, d);
