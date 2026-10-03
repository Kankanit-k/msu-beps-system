/**
 * ตัวช่วยเชื่อม RAW (mockup dataset) เข้ากับ @beps/calc-engine
 *
 * ทุกหน้าจอ (W1 ภาพรวม / W2 เจาะลึกจุดคุ้มทุน / W3 กราฟ) ต้องแสดงตัวเลขชุดเดียวกัน
 * จึงคำนวณผ่านฟังก์ชันเหล่านี้ที่เดียว แทนที่จะคัดลอกสูตรจาก mockup/assets/core.js
 * (ซึ่งอ่านฟิลด์ Rin/Rex/Qin/Qex ที่ RAW เตรียมมาให้ตรงๆ) — ที่นี่คำนวณใหม่จาก
 * ต้นทุน/งบประมาณดิบด้วย calcBreakEven ของแพ็กเกจจริง เพื่อให้สูตรมาจากที่เดียว
 */
import { aggregateBreakEven, calcBreakEven, DEFAULT_POLICY } from '@beps/calc-engine';

import { RAW } from '@/data/mockup';
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

/** จุดคุ้มทุนตามสูตร calc-engine ล้วน — ใช้กับตัวจำลองที่เปลี่ยน input (ต้องเทียบก่อน/หลังด้วยสูตรเดียวกัน) */
export function engineBreakEven(row: FinancialRow, revenueMode: RevenueMode): BreakEvenResult {
  return calcBreakEven(toBreakEvenInput(row, revenueMode), DEFAULT_POLICY);
}

/**
 * จุดคุ้มทุนของข้อมูลจริง (แถวใน RAW) — ยึดตัวเลขแบบชีต "3.จุดคุ้มทุนหลักสูตร(เดิม)"
 * รายหลักสูตร = sheetQStar · คณะ×ระดับ / คณะ / มหาวิทยาลัย = ผลบวก Q* ของหลักสูตรข้างใต้
 * แถวอื่นที่ไม่ใช่ข้อมูลจริง (ค่าที่ผู้ใช้จำลอง) ใช้สูตร calc-engine ตามปกติ
 */
export function computeBreakEven(row: FinancialRow, revenueMode: RevenueMode): BreakEvenResult {
  const res = engineBreakEven(row, revenueMode);
  const sheet = sheetQStarIndex().get(row);

  return sheet ? withQStar(res, sheet[revenueMode]) : res;
}

/** แทน Q* ของผล engine ด้วยค่าจากชีต แล้วคำนวณค่าที่ขึ้นกับ Q* ใหม่ */
function withQStar(res: BreakEvenResult, qStar: number): BreakEvenResult {
  const breakEvenRevenue = res.r === null ? null : qStar * res.r;

  return {
    ...res,
    qStar,
    qStarStatus: 'normal',
    breakEvenRevenue,
    marginOfSafety: breakEvenRevenue === null ? null : res.tr - breakEvenRevenue,
  };
}

type SheetQ = Record<RevenueMode, number>;

let SHEET_INDEX: Map<FinancialRow, SheetQ> | null = null;

/** Q* แบบชีตของทุกแถวใน RAW (คีย์ = object ของแถวนั้น) — สร้างครั้งเดียว */
function sheetQStarIndex(): Map<FinancialRow, SheetQ> {
  if (SHEET_INDEX) return SHEET_INDEX;

  const idx = new Map<FinancialRow, SheetQ>();
  const add = (key: FinancialRow | undefined, q: SheetQ) => {
    if (!key) return;
    const cur = idx.get(key) ?? { with_government: 0, without_government: 0 };

    cur.with_government += q.with_government;
    cur.without_government += q.without_government;
    idx.set(key, cur);
  };

  const facOf = new Map(RAW.FACS.map((f) => [f.name, f]));
  const deptOf = new Map(RAW.DEPTS.map((d) => [`${d.fac}|${d.grp}`, d]));

  RAW.PROGS.forEach((p) => {
    const q: SheetQ = {
      with_government: sheetQStar(p, 'with_government'),
      without_government: sheetQStar(p, 'without_government'),
    };

    add(p, q);
    add(deptOf.get(`${p.fac}|${p.grp}`), q);
    add(facOf.get(p.fac), q);
    add(RAW.UNI, q);
  });

  SHEET_INDEX = idx;

  return idx;
}

/** รวมหลายหน่วย (เช่น คณะที่เลือก) เป็นขอบเขตเดียว — ยอดรวมทุกคณะเท่ากับ RAW.UNI
 *  ถ้าทุกแถวเป็นข้อมูลจริง ผลรวมจะได้ Q* แบบชีต (ผลบวกของแถวย่อย) ติดไปด้วย */
export const sumRows = (rows: readonly FinancialRow[]): FinancialRow => {
  const sum = rows.reduce(
    (a, r) => ({
      Q: a.Q + r.Q,
      st: a.st + r.st,
      own: a.own + r.own,
      TFC: a.TFC + r.TFC,
      TVC: a.TVC + r.TVC,
    }),
    { Q: 0, st: 0, own: 0, TFC: 0, TVC: 0 },
  );
  const idx = sheetQStarIndex();
  const parts = rows.map((r) => idx.get(r));

  if (rows.length && parts.every(Boolean)) {
    idx.set(sum, {
      with_government: parts.reduce((a, q) => a + q!.with_government, 0),
      without_government: parts.reduce((a, q) => a + q!.without_government, 0),
    });
  }

  return sum;
};

/**
 * Q* แบบชีต "3.จุดคุ้มทุนหลักสูตร(เดิม)" — ROUNDUP(TFC / (R − AVC)) รายหลักสูตร
 * ไม่มีกรณี Full-Cost Recovery: เมื่อ R ≤ AVC ได้ค่าติดลบเหมือนในชีต (ROUNDUP ปัดออกจากศูนย์)
 * ระดับคณะ/มหาวิทยาลัยในชีตคือผลบวก Q* ของหลักสูตรข้างใต้
 */
export function sheetQStar(row: FinancialRow, revenueMode: RevenueMode): number {
  const r = (revenueMode === 'with_government' ? row.st + row.own : row.own) / row.Q;
  const x = row.TFC / (r - row.TVC / row.Q);

  return Math.sign(x) * Math.ceil(Math.abs(x) - 1e-9);
}

/** รวมผลของหลายหน่วยย่อยขึ้นเป็นหน่วยที่สูงกว่า (เช่น หลักสูตร → คณะ×ระดับ) ผ่านสูตร 6a/6b จริง */
export function aggregateRows(
  rows: readonly FinancialRow[],
  revenueMode: RevenueMode,
  scope: Parameters<typeof aggregateBreakEven>[1],
) {
  const results = rows.map((r) => engineBreakEven(r, revenueMode));
  const agg = aggregateBreakEven(results, scope, DEFAULT_POLICY);
  const idx = sheetQStarIndex();
  const parts = rows.map((r) => idx.get(r));

  // ข้อมูลจริง → Q* ของกลุ่ม = ผลบวก Q* แบบชีตของหลักสูตรข้างใต้ (เหมือนแถวผลรวมในชีต)
  return rows.length && parts.every(Boolean)
    ? withQStar(
        agg,
        parts.reduce((a, q) => a + q![revenueMode], 0),
      )
    : agg;
}

/** สถานะจุดคุ้มทุนสำหรับแสดงผล — มาจาก qStarStatus ของ calc-engine ล้วนๆ ไม่ใช่ตรรกะแยกต่างหาก */
export type BEStatus = 'ok' | 'loss' | 'fcr' | 'none';

export function statusOf(res: BreakEvenResult): BEStatus {
  if (res.qStarStatus === 'not_computable') return 'none';
  if (res.qStarStatus === 'full_cost_recovery') return 'fcr';
  // Q* ติดลบแบบชีต = รายได้/หัว ≤ ผันแปร/หัว (ยิ่งรับนิสิตยิ่งขาดทุน)
  if (res.qStar !== null && res.qStar < 0) return 'fcr';

  return res.qStar !== null && res.q >= res.qStar ? 'ok' : 'loss';
}

export const STATUS_LABEL: Record<BEStatus, string> = {
  ok: 'คุ้มทุนแล้ว',
  loss: 'ยังไม่คุ้มทุน',
  fcr: 'รายได้/หัว ≤ ผันแปร/หัว',
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
