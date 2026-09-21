/**
 * เก็บ "แผนการรับนิสิต" (สัดส่วนกลุ่มนิสิต + อัตรารายกลุ่ม) ไว้ใน localStorage
 *
 * แยกเป็นสองชั้น:
 *   - draft  = ค่าที่ผู้ใช้กำลังปรับอยู่ เซฟอัตโนมัติ กันรีเฟรช/ปิดพลาดแล้วหาย (แยกตามหลักสูตร)
 *   - plans  = แผนที่ผู้ใช้กด "บันทึกแผน" ตั้งชื่อไว้ เอาไว้โหลดกลับมาหรือเทียบกันภายหลัง
 *
 * ยังไม่มี API ฝั่งเซิร์ฟเวอร์ (เหมือน historyStore.ts) — ทุกฟังก์ชันจึงประกาศเป็น async
 * ไว้ตั้งแต่ต้น ทั้งที่ localStorage ทำงานแบบ synchronous เพื่อให้การย้ายไป apps/api
 * (ดู ADMISSION-PLAN-API.md) เปลี่ยนแค่ข้างในไฟล์นี้ ไม่ต้องแก้หน้าจอที่เรียกใช้
 */

/** กลุ่มที่ผู้ใช้เปิด/ปิดได้ — นิสิตไทยภาคปกติเป็นส่วนที่เหลือเสมอ จึงไม่อยู่ในนี้ */
export type CategoryKey = 'thaiSpecial' | 'foreignRegular' | 'foreignSpecial' | 'continuing';

/** ทุกกลุ่มรวมนิสิตไทยภาคปกติ — ใช้กับการคำนวณแยกรายกลุ่มที่ต้องมีอัตราครบทุกกลุ่ม */
export type SegmentKey = 'thaiRegular' | CategoryKey;

export const CATEGORY_KEYS: CategoryKey[] = [
  'thaiSpecial',
  'foreignRegular',
  'foreignSpecial',
  'continuing',
];

export const SEGMENT_KEYS: SegmentKey[] = ['thaiRegular', ...CATEGORY_KEYS];

export const SEGMENT_LABELS: Record<SegmentKey, string> = {
  thaiRegular: 'นิสิตไทย · ภาคปกติ',
  thaiSpecial: 'นิสิตไทย · ภาคพิเศษ',
  foreignRegular: 'นิสิตต่างชาติ · ภาคปกติ',
  foreignSpecial: 'นิสิตต่างชาติ · ภาคพิเศษ',
  continuing: 'หลักสูตรต่อเนื่อง (รับนิสิตเชื่อมโยง)',
};

/** สัดส่วนกลุ่มนิสิตชุดหนึ่ง — ใช้ร่วมกันทั้ง draft และแผนที่บันทึกไว้ */
export interface AdmissionMix {
  enabled: Record<CategoryKey, boolean>;
  pct: Record<CategoryKey, number>;
}

/** อัตราต่อหัวของกลุ่มหนึ่ง — ตรงกับ fee_schedule / per_student_charge ใน db/01_schema.sql */
export interface SegmentRates {
  /** ค่าธรรมเนียม/หัว/ปี (บาท) */
  fee: number;
  /** เงินอุดหนุนแผ่นดิน/หัว/ปี (บาท) */
  gov: number;
  /** ต้นทุนผันแปร/หัว/ปี (บาท) */
  avc: number;
}

/** ข้อมูลที่ต้องใช้คำนวณจุดคุ้มทุนแยกรายกลุ่ม (นอกเหนือจากสัดส่วนใน AdmissionMix) */
export interface SegmentedInputs {
  /** ต้นทุนคงที่รวมของหลักสูตร (บาท) */
  tfc: number;
  rates: Record<SegmentKey, SegmentRates>;
}

export interface AdmissionPlan extends AdmissionMix {
  id: number;
  /** ชื่อแผนที่ผู้ใช้ตั้ง เช่น "แผน A — เน้นต่างชาติ" */
  name: string;
  /** หลักสูตรและ Q* ณ ตอนบันทึก เก็บไว้เตือนเมื่อโหลดข้ามบริบท */
  programName: string;
  qStar: number;
  savedAt: string;
  /** อัตรารายกลุ่ม — มีเฉพาะแผนที่บันทึกตอนใช้โหมดคำนวณแยกรายกลุ่ม */
  segmented?: SegmentedInputs;
  /** Q* ที่ได้จากการคำนวณแยกรายกลุ่ม — `null` เมื่อยังกรอกอัตราไม่ครบ/คำนวณไม่ได้ */
  segmentedQStar?: number | null;
}

export const EMPTY_MIX: AdmissionMix = {
  enabled: { thaiSpecial: false, foreignRegular: false, foreignSpecial: false, continuing: false },
  pct: { thaiSpecial: 0, foreignRegular: 0, foreignSpecial: 0, continuing: 0 },
};

const ZERO_RATES: SegmentRates = { fee: 0, gov: 0, avc: 0 };

export const EMPTY_SEGMENTED: SegmentedInputs = {
  tfc: 0,
  rates: Object.fromEntries(SEGMENT_KEYS.map((k) => [k, { ...ZERO_RATES }])) as Record<
    SegmentKey,
    SegmentRates
  >,
};

/** เติมกลุ่มที่ขาดให้ครบ — กันข้อมูลเก่าที่บันทึกไว้ก่อนเพิ่มกลุ่มใหม่ทำหน้าพัง */
export const normalizeSegmented = (s?: Partial<SegmentedInputs> | null): SegmentedInputs => ({
  tfc: Number(s?.tfc) || 0,
  rates: Object.fromEntries(
    SEGMENT_KEYS.map((k) => [k, { ...ZERO_RATES, ...(s?.rates?.[k] ?? {}) }]),
  ) as Record<SegmentKey, SegmentRates>,
});

const PLANS_KEY = 'beps.admission-plan.plans';
const DRAFT_KEY = 'beps.admission-plan.draft';

/** เก็บเท่าที่พอใช้ กัน localStorage บวม */
const MAX_PLANS = 50;

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
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // เต็มหรือถูกบล็อก — หน้าปัจจุบันยังใช้งานได้ตามปกติ
  }
};

export const loadPlans = async (): Promise<AdmissionPlan[]> => {
  const parsed = read<unknown>(PLANS_KEY, []);

  return Array.isArray(parsed) ? (parsed as AdmissionPlan[]) : [];
};

export const savePlans = async (plans: AdmissionPlan[]): Promise<void> =>
  write(PLANS_KEY, plans.slice(0, MAX_PLANS));

export interface AdmissionDraft {
  mix: AdmissionMix;
  segmented: SegmentedInputs;
}

/** draft แยกตามหลักสูตร — สลับหลักสูตรแล้วไม่ควรเอาสัดส่วนของอีกหลักสูตรมาใช้ */
type DraftMap = Record<string, Partial<AdmissionDraft> & Partial<AdmissionMix>>;

export const loadDraft = async (programName: string): Promise<AdmissionDraft | null> => {
  const saved = read<DraftMap>(DRAFT_KEY, {})[programName];

  if (!saved) return null;

  // รูปแบบเก่าเก็บ AdmissionMix ตรงๆ (ก่อนมีโหมดคำนวณแยกรายกลุ่ม)
  const mix =
    saved.mix ?? (saved.enabled && saved.pct ? { enabled: saved.enabled, pct: saved.pct } : null);

  if (!mix) return null;

  return { mix, segmented: normalizeSegmented(saved.segmented) };
};

export const saveDraft = async (programName: string, draft: AdmissionDraft): Promise<void> =>
  write(DRAFT_KEY, { ...read<DraftMap>(DRAFT_KEY, {}), [programName]: draft });

export const clearDraft = async (programName: string): Promise<void> => {
  const all = read<DraftMap>(DRAFT_KEY, {});

  delete all[programName];
  write(DRAFT_KEY, all);
};
