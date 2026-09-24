/**
 * ร่างนโยบายที่ยังไม่ได้เสนอ — เก็บใน localStorage
 *
 * ขั้น "กำหนดสัดส่วน" ของคณะใหญ่คือการกรอกเลขหลายสิบบรรทัด ปิดแท็บทิ้งแล้วหายหมด
 * เป็นความเสียหายที่ผู้ใช้ไม่ให้อภัย (FIXED-COST-WORKFLOW.md หัวข้อ 8) ร่างจึงถูกบันทึก
 * ทุกครั้งที่ค่าเปลี่ยน และล้างได้ด้วยปุ่มเดียวเมื่อผู้ใช้ตั้งใจทิ้ง
 *
 * ร่างผูกกับ (ปี × คณะ × กลุ่มต้นทุน) เพราะสัดส่วนของคณะหนึ่งเอาไปใช้กับอีกคณะไม่ได้
 */
import type { BucketLevel, FixedCostMethod, FixedCostSubMethod } from '@beps/calc-engine';
import type { FixedCostPool } from '@beps/shared-types';

const KEY = 'beps:fixed-cost-policy:draft:v1';
const SCOPE_KEY = 'beps:fixed-cost-policy:scope:v1';

export interface PolicyDraft {
  method: FixedCostMethod;
  bucketLevel: BucketLevel;
  subMethod: FixedCostSubMethod;
  /** bucketKey → เปอร์เซ็นต์ตามที่พิมพ์ (คงเป็นข้อความเพื่อไม่ให้ช่องกระตุกตอนพิมพ์) */
  pct: Record<string, string>;
  rationale: string;
  meetingRef: string;
  savedAt: string;
}

export type DraftScope = { year: string; faculty: string; pool: FixedCostPool };

const scopeKey = (s: DraftScope) => `${s.year}|${s.faculty}|${s.pool}`;

type Store = Record<string, PolicyDraft>;

const readStore = (): Store => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(KEY);

    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    // โควตาเต็ม/โหมดส่วนตัว/ข้อมูลเก่าที่พังแล้ว — ร่างเป็นของอำนวยความสะดวก
    // ไม่ใช่แหล่งความจริง จึงถือว่า "ไม่มีร่าง" แทนที่จะทำให้ทั้งหน้าจอล่ม
    return {};
  }
};

export const loadDraft = (scope: DraftScope): PolicyDraft | null =>
  readStore()[scopeKey(scope)] ?? null;

export const saveDraft = (
  scope: DraftScope,
  draft: Omit<PolicyDraft, 'savedAt'>,
): string | null => {
  const savedAt = new Date().toISOString();

  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...readStore(), [scopeKey(scope)]: { ...draft, savedAt } }),
    );

    return savedAt;
  } catch {
    return null;
  }
};

export const clearDraft = (scope: DraftScope): void => {
  const store = readStore();

  delete store[scopeKey(scope)];

  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ไม่มีอะไรให้ทำต่อ — ร่างที่ล้างไม่สำเร็จจะถูกเขียนทับครั้งถัดไป */
  }
};

/**
 * ขอบเขตที่เปิดค้างไว้ล่าสุด — ร่างผูกกับ (ปี × คณะ × กลุ่มต้นทุน) ถ้าเปิดหน้ามาแล้ว
 * เด้งกลับไปคณะแรกของรายการ ผู้ใช้จะเห็นเป็น "ร่างหาย" ทั้งที่ยังอยู่
 */
export const loadLastScope = (): DraftScope | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(SCOPE_KEY);

    return raw ? (JSON.parse(raw) as DraftScope) : null;
  } catch {
    return null;
  }
};

export const saveLastScope = (scope: DraftScope): void => {
  try {
    window.localStorage.setItem(SCOPE_KEY, JSON.stringify(scope));
  } catch {
    /* เก็บไม่ได้ก็แค่เปิดหน้ามาที่คณะเริ่มต้น ไม่กระทบตัวร่าง */
  }
};
