/**
 * จุดคุ้มทุนแบบแยกกลุ่มนิสิต (Segmented / Sales-mix Break-Even)
 *
 * ตามที่กองแผนงานขอ: นิสิตไทยภาคปกติ/ภาคพิเศษ, ต่างชาติ, หลักสูตรต่อเนื่อง มี
 * **อัตราค่าธรรมเนียมและโครงสร้างเงินอุดหนุนต่างกัน** การใช้รายได้ต่อหัวเฉลี่ยรวม
 * (สูตร 1 ใน break-even.ts) จึงให้ Q* ที่คลาดเคลื่อนทันทีที่สัดส่วนกลุ่มเปลี่ยน
 *
 * วิธีคิด — ถัวเฉลี่ยถ่วงน้ำหนักด้วยสัดส่วนแผนการรับ (weighted-average CM):
 * ```
 * w_i   = สัดส่วนกลุ่ม i (รวมกันได้ 1)
 * R_i   = ค่าธรรมเนียม/หัว (+ เงินอุดหนุนแผ่นดิน/หัว เมื่อ mode = with_government)
 * CM_i  = R_i − AVC_i
 * CM̄    = Σ (w_i × CM_i)
 * Q*    = TFC ÷ CM̄            (สูตร 1 ในรูปหลายกลุ่ม)
 * Q*_i  = Q* × w_i             ปัดเศษด้วย largest remainder ให้รวมเท่า Q* พอดี
 * ```
 *
 * กติกาที่ต้องตรงกับเครื่องคำนวณเดิม: การปัดเศษ Q* และกรณี CM ≤ 0 ใช้ `calcQStar()`
 * ตัวเดียวกัน ไม่เขียนซ้ำ — มิฉะนั้นจะเกิดปัญหาเดิมที่แต่ละหน้าจอได้ Q* คนละค่า
 *
 * ที่มาของอัตรารายกลุ่มใน DB (db/01_schema.sql): `fee_schedule.fee_rate` และ
 * `per_student_charge.rate_per_student` ผูกกับ `student_type` อยู่แล้ว
 */

import type { CalcPolicy } from './policy';
import { DEFAULT_POLICY, roundQStar } from './policy';
import { calcQStar } from './qstar';
import type { QStarStatus, RevenueMode } from './types';

export interface StudentSegmentInput {
  /** รหัสกลุ่ม เช่น `thaiRegular` — ตรงกับ student_type ใน DB เมื่อเชื่อมข้อมูลจริง */
  key: string;
  label: string;
  /** สัดส่วนของแผนการรับ — หน่วยใดก็ได้ (%, คน, น้ำหนัก) ระบบ normalize ให้เอง */
  share: number;
  /** ค่าธรรมเนียม/หัว (บาท) — เงินรายได้ */
  feePerHead: number;
  /** เงินอุดหนุนแผ่นดิน/หัว (บาท) — นับเฉพาะโหมด with_government */
  governmentPerHead: number;
  /** ต้นทุนผันแปร/หัว (บาท) */
  avc: number;
}

export interface SegmentBreakEven {
  key: string;
  label: string;
  /** สัดส่วนหลัง normalize (0–1) */
  weight: number;
  /** รายได้/หัว ตามโหมดที่เลือก */
  r: number;
  avc: number;
  /** Contribution margin/หัว ของกลุ่มนี้ */
  cm: number;
  /** จำนวนที่ต้องรับจากกลุ่มนี้ ณ จุดคุ้มทุน — `null` เมื่อหา Q* รวมไม่ได้ */
  heads: number | null;
  /** รายได้ที่กลุ่มนี้สร้าง ณ จุดคุ้มทุน */
  revenue: number | null;
  /** ต้นทุนผันแปรที่กลุ่มนี้ก่อ ณ จุดคุ้มทุน */
  variableCost: number | null;
}

export interface SegmentedBreakEvenInput {
  segments: StudentSegmentInput[];
  /** ต้นทุนคงที่รวมของหลักสูตร (บาท) */
  tfc: number;
  revenueMode: RevenueMode;
  /**
   * จำนวนนิสิตตามแผน/ตามจริง — ใช้เฉพาะเส้นทางสูตร 7 (CM ≤ 0) ที่ต้องรู้ TC จริง
   * ไม่ส่งมา = กรณี CM ≤ 0 จะคืน `not_computable` แทนที่จะเดา TC เอง
   */
  qPlanned?: number;
}

export interface SegmentedBreakEvenResult {
  segments: SegmentBreakEven[];
  tfc: number;
  revenueMode: RevenueMode;
  /** รายได้/หัว ถัวเฉลี่ยถ่วงน้ำหนัก */
  weightedR: number | null;
  weightedAvc: number | null;
  /** CM̄ — ตัวหารของสูตร 1 ในรูปหลายกลุ่ม */
  weightedCm: number | null;
  qStar: number | null;
  qStarStatus: QStarStatus;
  /** รายได้ ณ จุดคุ้มทุน = Σ heads_i × R_i */
  breakEvenRevenue: number | null;
}

/**
 * ปัดเศษจำนวนคนตามสัดส่วนให้ยอดรวมเท่ากับ `total` พอดี (largest remainder)
 *
 * แยกมาไว้ที่นี่เพราะทั้งหน้าจอ "แผนการรับนิสิต" และการคำนวณ Q*_i ต้องใช้กติกาเดียวกัน
 * ถ้าต่างกันแม้คนเดียว ตัวเลขบนตารางกับที่บันทึกลง DB จะไม่ตรงกัน
 */
export function distributeHeads(total: number, shares: number[]): number[] {
  const sum = shares.reduce((a, b) => a + b, 0);

  if (!Number.isFinite(total) || total <= 0 || sum <= 0) return shares.map(() => 0);

  const raw = shares.map((s) => (total * s) / sum);
  const floors = raw.map((v) => Math.floor(v));
  let remaining = Math.round(total) - floors.reduce((a, b) => a + b, 0);

  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);

  const result = [...floors];

  for (const { i } of order) {
    if (remaining <= 0) break;
    result[i] = (result[i] ?? 0) + 1;
    remaining -= 1;
  }

  return result;
}

/** รายได้/หัว ของกลุ่มหนึ่ง ตามฐานรายได้ที่เลือก — คู่ขนานกับสูตร 5a/5b */
export function segmentRevenuePerHead(seg: StudentSegmentInput, mode: RevenueMode): number {
  return mode === 'with_government' ? seg.feePerHead + seg.governmentPerHead : seg.feePerHead;
}

const EMPTY = (input: SegmentedBreakEvenInput): SegmentedBreakEvenResult => ({
  segments: [],
  tfc: input.tfc,
  revenueMode: input.revenueMode,
  weightedR: null,
  weightedAvc: null,
  weightedCm: null,
  qStar: null,
  qStarStatus: 'not_computable',
  breakEvenRevenue: null,
});

/**
 * คำนวณจุดคุ้มทุนจากอัตรารายกลุ่ม + สัดส่วนแผนการรับ
 *
 * ต่างจาก `calcBreakEven()` ตรงที่ **ไม่ต้องรู้ Q ล่วงหน้า** — รับอัตราต่อหัวรายกลุ่ม
 * แล้วหา Q* ออกมาเลย จึงใช้กับหลักสูตรใหม่ที่ยังไม่มีนิสิตได้
 */
export function calcSegmentedBreakEven(
  input: SegmentedBreakEvenInput,
  policy: CalcPolicy = DEFAULT_POLICY,
): SegmentedBreakEvenResult {
  const { segments, tfc, revenueMode } = input;

  const usable = segments.filter((s) => Number.isFinite(s.share) && s.share > 0);
  const shareSum = usable.reduce((a, s) => a + s.share, 0);

  // ไม่มีกลุ่มไหนมีสัดส่วน → ไม่มีแผนการรับให้คำนวณ
  if (usable.length === 0 || shareSum <= 0) return EMPTY(input);

  const weighted = usable.map((s) => {
    const weight = s.share / shareSum;
    const r = segmentRevenuePerHead(s, revenueMode);

    return { seg: s, weight, r, cm: r - s.avc };
  });

  const weightedR = weighted.reduce((a, w) => a + w.weight * w.r, 0);
  const weightedAvc = weighted.reduce((a, w) => a + w.weight * w.seg.avc, 0);
  const weightedCm = weightedR - weightedAvc;

  // CM ≤ 0 ต้องรู้ TC จริงจึงจะเดินสูตร 7 ได้ — ไม่มี qPlanned ก็ไม่เดา
  const tcForFallback =
    input.qPlanned !== undefined && input.qPlanned > 0
      ? tfc + input.qPlanned * weightedAvc
      : Number.NaN;

  const { qStar, qStarStatus } =
    weightedCm > 0
      ? {
          qStar: roundQStar(tfc / weightedCm, policy.qStarRounding),
          qStarStatus: 'normal' as const,
        }
      : Number.isFinite(tcForFallback)
        ? calcQStar(tfc, tcForFallback, weightedR, weightedAvc, policy)
        : { qStar: null, qStarStatus: 'not_computable' as const };

  const heads =
    qStar !== null
      ? distributeHeads(
          qStar,
          weighted.map((w) => w.weight),
        )
      : null;

  const result: SegmentBreakEven[] = weighted.map((w, i) => {
    const head = heads?.[i] ?? null;

    return {
      key: w.seg.key,
      label: w.seg.label,
      weight: w.weight,
      r: w.r,
      avc: w.seg.avc,
      cm: w.cm,
      heads: head,
      revenue: head === null ? null : head * w.r,
      variableCost: head === null ? null : head * w.seg.avc,
    };
  });

  const breakEvenRevenue = result.every((s) => s.revenue !== null)
    ? result.reduce((a, s) => a + (s.revenue ?? 0), 0)
    : null;

  return {
    segments: result,
    tfc,
    revenueMode,
    weightedR,
    weightedAvc,
    weightedCm,
    qStar,
    qStarStatus,
    breakEvenRevenue,
  };
}
