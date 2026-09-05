/**
 * สูตร 1–5 และ 7 ระดับหน่วยเดียว (หลักสูตร / คณะ / มหาวิทยาลัย)
 *
 * พอร์ตจาก `compute_break_even()` ใน db/02_functions.sql ส่วนระดับหลักสูตร
 * สูตร 6a/6b (รวมขึ้นไประดับที่สูงกว่า) อยู่ใน `aggregate.ts`
 */

import { perHead } from './per-head.js';
import type { CalcPolicy } from './policy.js';
import { DEFAULT_POLICY } from './policy.js';
import { calcQStar } from './qstar.js';
import type { BreakEvenInput, BreakEvenResult, RevenueMode } from './types.js';

/**
 * สูตรที่ 5a / 5b — ฐานรายได้ 2 กรณี
 *
 * ต้นทุนเท่ากันทั้งสองกรณีเสมอ เปลี่ยนเฉพาะฝั่งรายได้ จึงไม่ต้องเก็บต้นทุนซ้ำ 2 ชุด
 * - `with_government`    = งบแผ่นดิน + งบเงินรายได้ (สถานะการเงินตามจริง)
 * - `without_government` = งบเงินรายได้อย่างเดียว (ความสามารถพึ่งพาตนเอง)
 */
export function totalRevenue(
  governmentBudget: number,
  incomeBudget: number,
  mode: RevenueMode,
): number {
  return mode === 'with_government' ? governmentBudget + incomeBudget : incomeBudget;
}

/** กำไร % — ตัวหารตามนโยบาย ไม่ใช่ค่าที่เลือกเองในแต่ละหน้าจอ */
function profitPercent(profit: number, tr: number, tc: number, policy: CalcPolicy): number | null {
  const base = policy.profitPctBasis === 'TR' ? tr : tc;
  if (base === 0 || !Number.isFinite(base)) return null;
  return (profit / base) * 100;
}

/**
 * คำนวณจุดคุ้มทุนของหน่วยเดียว
 *
 * ```
 * TC  = TFC + TVC                                       (สูตร 2)
 * R   = TR ÷ Q      · AVC = TVC ÷ Q   · ATC = TC ÷ Q    → null เมื่อ Q ≤ 0
 * CM  = R − AVC
 * Q*  = TFC ÷ CM  (CM > 0)  หรือ  TC ÷ R  (CM ≤ 0)      (สูตร 1, 7)
 * BE Revenue = Q* × R                                    (สูตร 4)
 * MoS = TR − BE Revenue
 * π   = TR − TC                                          (สูตร 3)
 * ```
 *
 * @param policy ค่าตั้งของงวดนั้น — ต้องเป็นชุดเดียวกับที่ส่งให้ `aggregateBreakEven()`
 */
export function calcBreakEven(
  input: BreakEvenInput,
  policy: CalcPolicy = DEFAULT_POLICY,
): BreakEvenResult {
  const { q, tfc, tvc, revenueMode } = input;

  const tr = totalRevenue(input.governmentBudget, input.incomeBudget, revenueMode);
  const tc = tfc + tvc;

  const r = perHead(tr, q);
  const avc = perHead(tvc, q);
  const atc = perHead(tc, q);
  const cm = r !== null && avc !== null ? r - avc : null;

  const { qStar, qStarStatus } = calcQStar(tfc, tc, r, avc, policy);

  // BE Revenue และ MoS มีความหมายก็ต่อเมื่อหา Q* ได้
  const breakEvenRevenue = qStar !== null && r !== null ? qStar * r : null;
  const marginOfSafety = breakEvenRevenue !== null ? tr - breakEvenRevenue : null;

  const profit = tr - tc;

  return {
    q,
    revenueMode,
    tr,
    tc,
    tfc,
    tvc,
    r,
    avc,
    atc,
    cm,
    qStar,
    qStarStatus,
    breakEvenRevenue,
    marginOfSafety,
    profit,
    profitPct: profitPercent(profit, tr, tc, policy),
  };
}

/** คำนวณทั้ง 2 ฐานรายได้พร้อมกัน — หน้าจอทุกหน้าสลับโหมดได้โดยไม่ต้องคำนวณใหม่ */
export function calcBreakEvenBothModes(
  input: Omit<BreakEvenInput, 'revenueMode'>,
  policy: CalcPolicy = DEFAULT_POLICY,
): Record<RevenueMode, BreakEvenResult> {
  return {
    with_government: calcBreakEven({ ...input, revenueMode: 'with_government' }, policy),
    without_government: calcBreakEven({ ...input, revenueMode: 'without_government' }, policy),
  };
}
