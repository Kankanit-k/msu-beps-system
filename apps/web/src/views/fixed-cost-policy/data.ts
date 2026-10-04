/**
 * แปลงชุดข้อมูลตัวอย่าง (RAW) → คำขอจำลองของ W20
 *
 * ยังไม่มี API อ่านข้อมูลจริงรายคณะ (ขั้นที่ 2 ของ FIXED-COST-WORKFLOW.md) หน้านี้จึง
 * ประกอบคำขอจาก RAW แล้วส่งให้ `POST /api/fixed-cost/simulate` ซึ่งคำนวณด้วย
 * @beps/calc-engine ตัวจริง — ตัวเลขที่เห็นจึงมาจากสูตรชุดเดียวกับตอนรันจริง
 * เหลือแค่ "ที่มาของ input" ที่ยังเป็นข้อมูลตัวอย่าง
 */
import type { FixedCostPool } from '@beps/shared-types';

import { RAW } from '@/data/mockup';
import type { FacRow, ProgRow } from '@/data/mockup';

/**
 * องค์ประกอบของต้นทุนคงที่ที่ชุดข้อมูลปัจจุบัน "แยกออกจากกันได้จริง"
 *
 * ประกาศไว้ที่เดียวเพื่อให้หน้าจอ (การ์ดที่มาของต้นทุนคงที่) กับตัวคำนวณ
 * อ่านจากนิยามชุดเดียวกัน — ยอดที่โชว์กับยอดที่ปันส่วนจึงไม่มีทางหลุดจากกัน
 * รายการที่ยังแยกไม่ได้อยู่ใน `MISSING_PARTS` ด้านล่าง
 */
export type FixedCostPartKey = 'tfcProg' | 'tfcOffice' | 'dep';

export const FIXED_COST_PARTS: {
  key: FixedCostPartKey;
  label: string;
  /** ที่มาของตัวเลข — ใช้ตอบที่ประชุมว่าเลขก้อนนี้ดึงมาจากไหน */
  source: string;
  of: (p: ProgRow) => number;
}[] = [
  {
    key: 'tfcProg',
    label: 'ต้นทุนคงที่ทางตรงของหลักสูตร',
    source: 'ERP — รายการที่ผูกรหัสหลักสูตรไว้แล้ว',
    of: (p) => p.tfcProg,
  },
  {
    key: 'tfcOffice',
    label: 'งบสำนักงาน/ส่วนกลางคณะ',
    source: 'ERP — ผูกถึงระดับคณะ ยังไม่ถึงหลักสูตร',
    of: (p) => p.tfcOffice,
  },
  {
    key: 'dep',
    label: 'ค่าเสื่อมราคา — เฉพาะครุภัณฑ์',
    source: 'กองคลัง — ทะเบียนครุภัณฑ์',
    of: (p) => p.dep,
  },
];

/**
 * ต้นทุนคงที่ที่ที่ประชุมพูดถึงแต่ชุดข้อมูลยังให้ไม่ได้
 * — แสดงบนหน้าจอเป็นช่องว่าง เพื่อใช้เป็นรายการขอข้อมูลจากกองคลังในการประชุมครั้งถัดไป
 */
export const MISSING_PARTS: { label: string; status: string; ask: string }[] = [
  {
    label: 'เงินเดือนอาจารย์',
    status: 'รวมอยู่ในสองแถวแรกแล้ว แต่แยกยอดออกมาไม่ได้',
    ask: 'ขอยอดเงินเดือน/ค่าจ้างบุคลากรสายวิชาการ แยกรายคณะ (รายหลักสูตรถ้ามี)',
  },
  {
    label: 'ค่าเสื่อมราคาอาคาร',
    status: 'ยังไม่มีในระบบ — ค่าเสื่อมที่เห็นมีเฉพาะครุภัณฑ์',
    ask: 'ขอยอดค่าเสื่อมอาคาร พร้อมเกณฑ์ปันส่วนลงคณะ (เช่น พื้นที่ใช้สอย)',
  },
];

/**
 * องค์ประกอบที่นโยบายแต่ละกลุ่ม "รับไปปันส่วน" — ที่เหลือถือเป็น direct ของหลักสูตร
 * ต้นทุนคงที่ทางตรงผูกหลักสูตรอยู่แล้วจึงไม่เข้าก้อนปันส่วนของกลุ่มใดเลย
 */
const POOL_PARTS: Partial<Record<FixedCostPool, FixedCostPartKey[]>> = {
  ALL: ['tfcOffice', 'dep'],
  OFFICE_OVERHEAD: ['tfcOffice'],
  DEPRECIATION: ['dep'],
};

/** องค์ประกอบที่กลุ่มนี้ปันส่วน — กลุ่มที่ไม่ได้ประกาศไว้ถือว่าไม่ปันอะไรเลย (ก้อน = 0) */
export const partsOfPool = (pool: FixedCostPool): FixedCostPartKey[] => POOL_PARTS[pool] ?? [];

/** ยอดที่เข้าก้อนปันส่วนของกลุ่มนี้ สำหรับหลักสูตรหนึ่ง */
export const poolAmountOf =
  (pool: FixedCostPool) =>
  (p: ProgRow): number => {
    const keys = partsOfPool(pool);

    return FIXED_COST_PARTS.filter((part) => keys.includes(part.key)).reduce(
      (sum, part) => sum + part.of(p),
      0,
    );
  };

/** กลุ่มต้นทุนคงที่ที่เลือกได้บนหน้าจอ — ต้องมีที่มาในชุดข้อมูล ไม่งั้นก้อนที่ปันจะเป็น 0 */
export const POOL_OPTIONS: {
  value: FixedCostPool;
  label: string;
  hint: string;
}[] = [
  {
    value: 'ALL',
    label: 'ทั้งก้อน (สำนักงาน + ค่าเสื่อม)',
    hint: 'นโยบายฉบับเดียวคุมต้นทุนคงที่ทางอ้อมทั้งหมดของคณะ',
  },
  {
    value: 'OFFICE_OVERHEAD',
    label: 'งบสำนักงาน/ส่วนกลางคณะ',
    hint: 'แยกเฉพาะงบสำนักงานเลขานุการคณะ · ค่าเสื่อมยังใช้วิธีเดิม',
  },
  {
    value: 'DEPRECIATION',
    label: 'ค่าเสื่อมราคา',
    hint: 'แยกเฉพาะค่าเสื่อม · เหมาะกับคณะที่ครุภัณฑ์กระจุกอยู่ไม่กี่หลักสูตร',
  },
];

export const poolOption = (pool: FixedCostPool) =>
  POOL_OPTIONS.find((o) => o.value === pool) ?? POOL_OPTIONS[0]!;

/** รายชื่อคณะที่มีหลักสูตรอยู่จริง — คณะที่ไม่มีหลักสูตรจำลองไม่ได้ (NO_PROGRAM) */
export const FACULTIES: string[] = RAW.FACS.map((f: FacRow) => f.name).filter((name) =>
  RAW.PROGS.some((p: ProgRow) => p.fac === name),
);

export interface ProgramInput {
  programVersionId: string;
  label: string;
  educationLevel: string;
  ftes: number;
  q: number;
  governmentBudget: number;
  incomeBudget: number;
  tvc: number;
  directFixedCost: number;
}

export interface FacultyScope {
  faculty: string;
  /** ก้อนต้นทุนคงที่ที่นโยบายฉบับนี้ปันส่วน */
  pool: number;
  programs: ProgramInput[];
  /** นิสิตรวมของคณะ — ใช้บนแถบหัวหน้าจอ */
  q: number;
}

/**
 * หลักสูตรของคณะพร้อมคีย์แทน `program_version_id`
 *
 * RAW ยังไม่มีรหัสหลักสูตรจริง — ใช้ลำดับในชุดข้อมูลเป็นคีย์ ทุกหน้าที่ปันส่วนต้องได้คีย์ชุดเดียวกัน
 * (W20 กับ W7 ใช้ร่างสัดส่วนรายหลักสูตรร่วมกัน ซึ่งผูกกับคีย์นี้)
 */
export const facultyRows = (faculty: string): { p: ProgRow; id: string }[] =>
  RAW.PROGS.flatMap((p, i) => (p.fac === faculty ? [{ p, id: `pv-${i}` }] : []));

/**
 * ประกอบขอบเขตของนโยบายหนึ่งฉบับ = (คณะ × กลุ่มต้นทุน)
 *
 * ต้นทุนคงที่ที่ "ไม่ได้อยู่ในกลุ่มที่เลือก" ถูกนับเป็น direct ของหลักสูตรนั้น
 * เพื่อให้ TFC รวมของคณะเท่าเดิมทุกกรณี (หลักการข้อ 4 — เปลี่ยนวิธีหาร ไม่ใช่เปลี่ยนต้นทุน)
 */
export function buildFacultyScope(faculty: string, pool: FixedCostPool): FacultyScope {
  const amountOf = poolAmountOf(pool);

  const rows = facultyRows(faculty);

  const programs = rows.map(({ p, id }) => {
    const totalFixed = p.tfcProg + p.tfcOffice + p.dep;

    return {
      programVersionId: id,
      label: p.prog,
      educationLevel: p.lvl,
      // ชุดตัวอย่างมีแต่จำนวนนิสิต ยังไม่มี registration snapshot ให้ถ่วงน้ำหนัก
      // จึงเท่ากับ headcount (= ตั้งน้ำหนักทุกประเภทเป็น 1) ตามที่ ProgramWeightInput อนุญาต
      ftes: p.Q,
      q: p.Q,
      governmentBudget: p.st,
      incomeBudget: p.own,
      tvc: p.tvcProg + p.tvcOffice,
      directFixedCost: totalFixed - amountOf(p),
    } satisfies ProgramInput;
  });

  return {
    faculty,
    pool: rows.reduce((sum, { p }) => sum + amountOf(p), 0),
    programs,
    q: rows.reduce((sum, { p }) => sum + p.Q, 0),
  };
}

export interface CostCompositionRow {
  key: FixedCostPartKey;
  label: string;
  source: string;
  amount: number;
  /** องค์ประกอบนี้ถูกปันส่วนด้วยนโยบายฉบับนี้ หรือผูกหลักสูตรอยู่แล้ว */
  pooled: boolean;
}

export interface CostComposition {
  rows: CostCompositionRow[];
  /** ต้นทุนคงที่รวมของคณะ = ผลรวมทุกแถว (ไม่ขึ้นกับกลุ่มที่เลือก) */
  total: number;
  /** ก้อนที่นโยบายฉบับนี้ปันส่วน */
  pooled: number;
  /** ส่วนที่ผูกหลักสูตรอยู่แล้ว ไม่ต้องปันส่วน */
  direct: number;
  /**
   * ส่วนที่ ERP ผูกรหัสหลักสูตรมาให้จริง (tfcProg) — ต่างจาก `direct` ตรงที่ไม่ขึ้นกับกลุ่มที่เลือก
   * ใช้ตอบว่า "ต้นทุนคงที่กี่ % ที่ไม่ว่าใช้วิธีหารไหนก็ไม่ขยับ"
   */
  erpDirect: number;
}

/**
 * กางที่มาของต้นทุนคงที่รายคณะ — ตอบคำถาม "ยอดนี้มาจากอะไรบวกอะไร"
 *
 * total ต้องเท่ากับ TFC ที่หน้าอื่นแสดงเสมอ และ pooled + direct = total ทุกกรณี
 * (หลักการข้อ 4 ของ FIXED-COST-WORKFLOW.md — เปลี่ยนวิธีหาร ไม่ใช่เปลี่ยนต้นทุน)
 */
export function buildCostComposition(faculty: string, pool: FixedCostPool): CostComposition {
  const progs = RAW.PROGS.filter((p: ProgRow) => p.fac === faculty);
  const keys = partsOfPool(pool);

  const rows = FIXED_COST_PARTS.map((part) => ({
    key: part.key,
    label: part.label,
    source: part.source,
    amount: progs.reduce((sum, p) => sum + part.of(p), 0),
    pooled: keys.includes(part.key),
  }));

  const sum = (only: boolean) =>
    rows.filter((r) => r.pooled === only).reduce((s, r) => s + r.amount, 0);

  return {
    rows,
    total: rows.reduce((s, r) => s + r.amount, 0),
    pooled: sum(true),
    direct: sum(false),
    erpDirect: rows.find((r) => r.key === 'tfcProg')?.amount ?? 0,
  };
}
