/**
 * สูตรที่ 6a / 6b — จุดคุ้มทุนของหน่วยที่สูงกว่าหลักสูตร (ระดับการศึกษา / คณะ / มหาวิทยาลัย)
 *
 * พอร์ตจากส่วนท้ายของ `compute_break_even()` ใน db/02_functions.sql
 *
 * มี 2 วิธีที่ให้ผล **ต่างกันจริง** และระบบต้องเก็บทั้งคู่:
 *
 * - **6a `sum_of_programs`** — Σ Q* ของหลักสูตรย่อย
 *   แต่ละหลักสูตรต้องคุ้มต้นทุนคงที่ของตัวเอง ชดเชยข้ามหลักสูตรไม่ได้
 *   ตรงกับการบริหารหลักสูตรจริง
 *
 * - **6b `pooled`** — คำนวณจากยอดรวมของทั้งหน่วยครั้งเดียว
 *   ยอมให้หลักสูตรที่กำไรอุ้มหลักสูตรที่ขาดทุน
 *
 * ตัวอย่างจริงจาก v8 (คณะสัตวแพทยศาสตร์ ฐานรวมเงินแผ่นดิน):
 * `sum_of_programs` = 486 คน · `pooled` = 477 คน — v8 เก็บค่า 477 ไว้ จึงยืนยันว่า
 * v8 ใช้วิธี pooled ทุกชั้น ทั้งที่หน้าสูตรเขียนว่าใช้ "วิธีหลัก = รายหลักสูตร"
 *
 * ⚠ **ลำดับของสองวิธีไม่รับประกัน** — เอกสารเดิม (SA.md สูตร 6 · หน้าสูตรของ prototype)
 * เขียนว่าวิธีรายหลักสูตร "เข้มงวดกว่าเสมอ" ซึ่งไม่จริงในเชิงคณิตศาสตร์
 * ถ้าหลักสูตรที่มี TFC สูงบังเอิญมี CM/หัว สูงกว่าค่าเฉลี่ยของหน่วยมาก ผลจะกลับด้าน
 * (มีตัวอย่างค้านใน `aggregate.test.ts`: sum = 681 · pooled = 690)
 * ในข้อมูลจริงปี 2568 ทิศทางเป็นไปตามเอกสาร (10 คณะที่คำนวณได้ครบ Σ > pooled ทุกคณะ)
 * แต่เป็นลักษณะของข้อมูลชุดนี้เท่านั้น — โค้ดและ UI ต้องไม่ตั้งสมมติฐานเรื่องลำดับ
 */

import { perHead } from './per-head.js';
import type { CalcPolicy } from './policy.js';
import { DEFAULT_POLICY } from './policy.js';
import type { QStarOutcome } from './qstar.js';
import { calcQStar } from './qstar.js';
import type { BreakEvenResult, QStarMethod, RevenueMode, ScopeLevel } from './types.js';

export interface AggregateBreakEvenResult extends BreakEvenResult {
  scope: ScopeLevel;
  /** จำนวนหน่วยย่อยที่นำมารวม */
  childCount: number;
  /** ผลของทั้ง 2 วิธี — บันทึกลง `break_even_result` ทั้งคู่ */
  qStarByMethod: Record<QStarMethod, QStarOutcome>;
  /** วิธีที่ถูกใช้เป็นค่าหลักในฟิลด์ `qStar` — มาจาก `qstar_primary_method` */
  qStarMethod: QStarMethod;
}

/**
 * รวมผลของหน่วยย่อยขึ้นเป็นหน่วยที่สูงกว่า
 *
 * @param children ผลระดับล่างที่คำนวณแล้ว — ต้องเป็น `revenueMode` เดียวกันทั้งหมด
 * @param scope    ระดับของผลลัพธ์ที่ต้องการ
 */
export function aggregateBreakEven(
  children: readonly BreakEvenResult[],
  scope: ScopeLevel,
  policy: CalcPolicy = DEFAULT_POLICY,
): AggregateBreakEvenResult {
  if (children.length === 0) {
    throw new Error('aggregateBreakEven: ต้องมีหน่วยย่อยอย่างน้อย 1 รายการ');
  }

  const revenueMode = firstRevenueMode(children);

  const q = sum(children, (c) => c.q);
  const tr = sum(children, (c) => c.tr);
  const tfc = sum(children, (c) => c.tfc);
  const tvc = sum(children, (c) => c.tvc);
  const tc = tfc + tvc;

  const r = perHead(tr, q);
  const avc = perHead(tvc, q);
  const atc = perHead(tc, q);
  const cm = r !== null && avc !== null ? r - avc : null;

  // 6b — คำนวณจากยอดรวมครั้งเดียว
  const pooled = calcQStar(tfc, tc, r, avc, policy);

  // 6a — Σ Q* รายหลักสูตร
  //   ถ้ามีหน่วยย่อยแม้แต่ตัวเดียวที่หา Q* ไม่ได้ ผลรวมย่อมไม่มีความหมาย → null
  //   (ตรงกับ SQL: CASE WHEN count(*) FILTER (WHERE q_star IS NULL) > 0 THEN NULL ...)
  //   ห้ามข้ามตัวที่เป็น null แล้วบวกที่เหลือ เพราะจะได้ค่าที่ต่ำกว่าความจริงแบบเงียบๆ
  const hasIncomputableChild = children.some((c) => c.qStar === null);
  const sumOfPrograms: QStarOutcome = hasIncomputableChild
    ? { qStar: null, qStarStatus: 'not_computable' }
    : { qStar: sum(children, (c) => c.qStar ?? 0), qStarStatus: 'normal' };

  const qStarByMethod: Record<QStarMethod, QStarOutcome> = {
    sum_of_programs: sumOfPrograms,
    pooled,
  };

  const primary = qStarByMethod[policy.qStarPrimaryMethod];
  const breakEvenRevenue = primary.qStar !== null && r !== null ? primary.qStar * r : null;
  const marginOfSafety = breakEvenRevenue !== null ? tr - breakEvenRevenue : null;

  const profit = tr - tc;
  const base = policy.profitPctBasis === 'TR' ? tr : tc;

  return {
    scope,
    childCount: children.length,
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
    qStar: primary.qStar,
    qStarStatus: primary.qStarStatus,
    qStarByMethod,
    qStarMethod: policy.qStarPrimaryMethod,
    breakEvenRevenue,
    marginOfSafety,
    profit,
    profitPct: base === 0 || !Number.isFinite(base) ? null : (profit / base) * 100,
  };
}

function sum<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((acc, item) => acc + pick(item), 0);
}

function firstRevenueMode(children: readonly BreakEvenResult[]): RevenueMode {
  const [head, ...rest] = children;
  // children.length > 0 ตรวจแล้วที่ผู้เรียก แต่ TS ยังไม่รู้
  if (head === undefined) throw new Error('aggregateBreakEven: ไม่มีหน่วยย่อย');
  if (rest.some((c) => c.revenueMode !== head.revenueMode)) {
    throw new Error(
      'aggregateBreakEven: หน่วยย่อยต้องใช้ฐานรายได้เดียวกันทั้งหมด — ' +
        'การรวมข้ามฐานรายได้ทำให้ TR ไม่มีความหมาย',
    );
  }
  return head.revenueMode;
}
