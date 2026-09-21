/**
 * ตัวช่วยเชื่อม RAW (mockup dataset) เข้ากับ @beps/calc-engine
 *
 * ทุกหน้าจอ (W1 ภาพรวม / W2 เจาะลึกจุดคุ้มทุน / W3 กราฟ) ต้องแสดงตัวเลขชุดเดียวกัน
 * จึงคำนวณผ่านฟังก์ชันเหล่านี้ที่เดียว แทนที่จะคัดลอกสูตรจาก mockup/assets/core.js
 * (ซึ่งอ่านฟิลด์ Rin/Rex/Qin/Qex ที่ RAW เตรียมมาให้ตรงๆ) — ที่นี่คำนวณใหม่จาก
 * ต้นทุน/งบประมาณดิบด้วย calcBreakEven ของแพ็กเกจจริง เพื่อให้สูตรมาจากที่เดียว
 */
import { aggregateBreakEven, calcBreakEven, DEFAULT_POLICY } from '@beps/calc-engine';
import type { BreakEvenInput, BreakEvenResult, RevenueMode } from '@beps/calc-engine';

/** ฟิลด์ขั้นต่ำที่ทุกระดับ (UNI/FAC/DEPT/PROG) มีเหมือนกันพอจะคำนวณจุดคุ้มทุนได้ */
export interface FinancialRow {
  Q: number;
  st: number;
  own: number;
  TFC: number;
  TVC: number;
}

export function toBreakEvenInput(row: FinancialRow, revenueMode: RevenueMode): BreakEvenInput {
  return {
    q: row.Q,
    governmentBudget: row.st,
    incomeBudget: row.own,
    tfc: row.TFC,
    tvc: row.TVC,
    revenueMode,
  };
}

export function computeBreakEven(row: FinancialRow, revenueMode: RevenueMode): BreakEvenResult {
  return calcBreakEven(toBreakEvenInput(row, revenueMode), DEFAULT_POLICY);
}

/** รวมผลของหลายหน่วยย่อยขึ้นเป็นหน่วยที่สูงกว่า (เช่น หลักสูตร → คณะ×ระดับ) ผ่านสูตร 6a/6b จริง */
export function aggregateRows(
  rows: readonly FinancialRow[],
  revenueMode: RevenueMode,
  scope: Parameters<typeof aggregateBreakEven>[1],
) {
  const results = rows.map((r) => computeBreakEven(r, revenueMode));

  return aggregateBreakEven(results, scope, DEFAULT_POLICY);
}

/** สถานะจุดคุ้มทุนสำหรับแสดงผล — มาจาก qStarStatus ของ calc-engine ล้วนๆ ไม่ใช่ตรรกะแยกต่างหาก */
export type BEStatus = 'ok' | 'loss' | 'fcr' | 'none';

export function statusOf(res: BreakEvenResult): BEStatus {
  if (res.qStarStatus === 'not_computable') return 'none';
  if (res.qStarStatus === 'full_cost_recovery') return 'fcr';

  return res.qStar !== null && res.q >= res.qStar ? 'ok' : 'loss';
}

export const STATUS_LABEL: Record<BEStatus, string> = {
  ok: 'คุ้มทุนแล้ว',
  loss: 'ยังไม่คุ้มทุน',
  fcr: 'R ≤ AVC',
  none: 'ไม่มีข้อมูล',
};

export const STATUS_COLOR: Record<BEStatus, 'success' | 'error' | 'warning' | 'default'> = {
  ok: 'success',
  loss: 'error',
  fcr: 'warning',
  none: 'default',
};

/* ---------------- ตัวช่วยจัดรูปแบบตัวเลข (บาทไทย) ---------------- */

export const fmtInt = (v: number | null | undefined): string =>
  v === null || v === undefined || !Number.isFinite(v)
    ? '—'
    : Math.round(v).toLocaleString('th-TH');

export const fmtMillion = (v: number | null | undefined): string =>
  v === null || v === undefined || !Number.isFinite(v)
    ? '—'
    : (v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** ตัดคำนำหน้าชื่อคณะให้สั้นลง สำหรับแสดงบนแกนกราฟ/ป้ายพื้นที่จำกัด */
export const shortFacName = (name: string): string =>
  name.replace('คณะ', '').replace('วิทยาลัย', 'วล.').replace('สถาบันวิจัย', 'สถ.');

export const REVENUE_MODE_LABEL: Record<RevenueMode, string> = {
  with_government: 'รวมเงินแผ่นดิน',
  without_government: 'ไม่รวมเงินแผ่นดิน',
};

/** คำอธิบายฐานรายได้ตามโหมด — ตรงกับ noteTxt() ของ mockup */
export const REVENUE_MODE_NOTE: Record<RevenueMode, string> = {
  with_government: 'ฐานรายได้ = เงินแผ่นดิน + เงินรายได้ (สะท้อนต้นทุนจริงทั้งหมด)',
  without_government:
    'ฐานรายได้ = เงินรายได้/ค่าธรรมเนียมเท่านั้น (สะท้อนการเลี้ยงตัวเองของหลักสูตร)',
};
