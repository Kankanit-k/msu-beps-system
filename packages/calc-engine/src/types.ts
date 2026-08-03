/**
 * ชนิดข้อมูลของเครื่องคำนวณจุดคุ้มทุน — ส่วนที่ "ตกลงแล้ว" จาก SA.md หัวข้อ 7.1 และ 11.1
 *
 * ยังไม่รวมตัวสูตรเอง (สูตร 1–7) เพราะรอการตัดสินใจ A–D ใน SA.md หัวข้อ 17
 * ดู packages/calc-engine/TODO.md
 */

/** ฐานรายได้ 2 กรณี — สูตร 5a / 5b */
export type RevenueMode = 'with_government' | 'without_government';

/** ระดับที่คำนวณผล — ต้องรองรับทั้ง 3 ระดับตาม hierarchy ใน SA.md หัวข้อ 7.2 */
export type ScopeLevel = 'program' | 'education_level' | 'faculty' | 'university';

/**
 * วิธีคำนวณ Q* ระดับที่สูงกว่าหลักสูตร — สูตร 6a / 6b
 * - `sum_of_programs` = ผลรวม Q* ของหลักสูตรย่อย (ค่าหลักตาม v8)
 * - `pooled` = คำนวณจากยอดรวมของหน่วยนั้น (ค่าเทียบ)
 */
export type QStarMethod = 'sum_of_programs' | 'pooled';

/** เหตุผลที่คำนวณ Q* ไม่ได้ หรือได้ค่าที่ตีความต่างจากปกติ */
export type QStarStatus =
  /** ปกติ: CM > 0 ใช้สูตร 1 */
  | 'normal'
  /** CM <= 0 (AVC สูงกว่า R) → ใช้สูตร 7 ค่าที่ได้เป็น "เป้าหมายขั้นต่ำ" ไม่ใช่จุดคุ้มทุนจริง */
  | 'full_cost_recovery'
  /** ไม่มีนิสิต (Q = 0) หรือไม่มีรายได้ → คำนวณต่อหัวไม่ได้ */
  | 'not_computable';

export interface BreakEvenInput {
  /** จำนวนนิสิตจริง */
  q: number;
  /** งบประมาณเงินแผ่นดิน (หมวด 10) — หน่วยบาท */
  governmentBudget: number;
  /** งบประมาณเงินรายได้ (หมวด 20, ค่าธรรมเนียม) — หน่วยบาท */
  incomeBudget: number;
  /** ต้นทุนคงที่รวม — หน่วยบาท */
  tfc: number;
  /** ต้นทุนผันแปรรวม — หน่วยบาท */
  tvc: number;
  revenueMode: RevenueMode;
}

export interface BreakEvenResult {
  q: number;
  revenueMode: RevenueMode;
  /** รายได้รวม */
  tr: number;
  /** ต้นทุนรวม = tfc + tvc */
  tc: number;
  tfc: number;
  tvc: number;
  /** รายได้ต่อหัว = tr / q — `null` เมื่อ q <= 0 */
  r: number | null;
  /** ต้นทุนผันแปรต่อหัว = tvc / q — `null` เมื่อ q <= 0 */
  avc: number | null;
  /** ต้นทุนรวมต่อหัว = tc / q — `null` เมื่อ q <= 0 */
  atc: number | null;
  /** Contribution Margin ต่อหัว = r - avc — `null` เมื่อคำนวณต่อหัวไม่ได้ */
  cm: number | null;
  /** จำนวนนิสิต ณ จุดคุ้มทุน — `null` เมื่อคำนวณไม่ได้ */
  qStar: number | null;
  qStarStatus: QStarStatus;
  /** รายได้ ณ จุดคุ้มทุน = qStar * r — สูตร 4 */
  breakEvenRevenue: number | null;
  /** Margin of Safety = tr - breakEvenRevenue */
  marginOfSafety: number | null;
  /** กำไร/ขาดทุน = tr - tc — สูตร 3 */
  profit: number;
}
