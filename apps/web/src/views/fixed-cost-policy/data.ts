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

/** กลุ่มต้นทุนคงที่ที่เลือกได้บนหน้าจอ — ต้องมีที่มาในชุดข้อมูล ไม่งั้นก้อนที่ปันจะเป็น 0 */
export const POOL_OPTIONS: {
  value: FixedCostPool;
  label: string;
  /** ส่วนของต้นทุนคงที่ที่เข้าก้อนปันส่วนของ pool นี้ */
  amountOf: (p: ProgRow) => number;
  hint: string;
}[] = [
  {
    value: 'ALL',
    label: 'ทั้งก้อน (สำนักงาน + ค่าเสื่อม)',
    amountOf: (p) => p.tfcOffice + p.dep,
    hint: 'นโยบายฉบับเดียวคุมต้นทุนคงที่ทางอ้อมทั้งหมดของคณะ',
  },
  {
    value: 'OFFICE_OVERHEAD',
    label: 'งบสำนักงาน/ส่วนกลางคณะ',
    amountOf: (p) => p.tfcOffice,
    hint: 'แยกเฉพาะงบสำนักงานเลขานุการคณะ · ค่าเสื่อมยังใช้วิธีเดิม',
  },
  {
    value: 'DEPRECIATION',
    label: 'ค่าเสื่อมราคา',
    amountOf: (p) => p.dep,
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
 * ประกอบขอบเขตของนโยบายหนึ่งฉบับ = (คณะ × กลุ่มต้นทุน)
 *
 * ต้นทุนคงที่ที่ "ไม่ได้อยู่ในกลุ่มที่เลือก" ถูกนับเป็น direct ของหลักสูตรนั้น
 * เพื่อให้ TFC รวมของคณะเท่าเดิมทุกกรณี (หลักการข้อ 4 — เปลี่ยนวิธีหาร ไม่ใช่เปลี่ยนต้นทุน)
 */
export function buildFacultyScope(faculty: string, pool: FixedCostPool): FacultyScope {
  const amountOf = poolOption(pool).amountOf;

  const rows = RAW.PROGS.map((p, i) => ({ p, i })).filter(({ p }) => p.fac === faculty);

  const programs = rows.map(({ p, i }) => {
    const totalFixed = p.tfcProg + p.tfcOffice + p.dep;

    return {
      // RAW ยังไม่มีรหัสหลักสูตรจริง — ใช้ลำดับในชุดข้อมูลเป็นคีย์แทน `program_version_id`
      programVersionId: `pv-${i}`,
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
