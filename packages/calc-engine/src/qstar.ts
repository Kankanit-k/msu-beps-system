/**
 * สูตรที่ 1 และสูตรที่ 7 — จุดคุ้มทุน
 *
 * พอร์ตมาจาก `calc_qstar()` ใน db/02_functions.sql ซึ่งทดสอบผ่านบน PostgreSQL 17 แล้ว
 * ต้องให้ผลตรงกันทุกกรณี เพราะ batch recalculate ใช้ฝั่ง SQL ส่วน preview สดในฟอร์ม
 * W6/W7 ใช้ฝั่งนี้ — ถ้าไม่ตรงกันผู้ใช้จะเห็นตัวเลขบนหน้าจอไม่ตรงกับที่บันทึกลง DB
 */

import type { CalcPolicy, QStarRounding } from './policy.js';
import { roundQStar } from './policy.js';
import type { QStarStatus } from './types.js';

export interface QStarOutcome {
  qStar: number | null;
  qStarStatus: QStarStatus;
}

/**
 * คำนวณจำนวนนิสิต ณ จุดคุ้มทุน
 *
 * ```
 * CM = R − AVC
 * CM > 0  → Q* = TFC ÷ CM                              (สูตร 1)
 * CM ≤ 0  → ขึ้นกับนโยบาย cm_le_zero_policy:
 *             full_cost_recovery → Q* = TC ÷ R          (สูตร 7)
 *             not_computable     → Q* = null
 * ```
 *
 * @param tfc ต้นทุนคงที่รวม (บาท)
 * @param tc  ต้นทุนรวม (บาท) — ใช้เฉพาะเส้นทางสูตร 7
 * @param r   รายได้ต่อหัว — `null` เมื่อไม่มีนิสิต
 * @param avc ต้นทุนผันแปรต่อหัว — `null` เมื่อไม่มีนิสิต
 */
export function calcQStar(
  tfc: number,
  tc: number,
  r: number | null,
  avc: number | null,
  policy: Pick<CalcPolicy, 'cmLeZeroPolicy' | 'qStarRounding'>,
): QStarOutcome {
  // ไม่มีนิสิต → คำนวณต่อหัวไม่ได้ จึงหาจุดคุ้มทุนไม่ได้
  if (r === null || avc === null || !Number.isFinite(r) || !Number.isFinite(avc)) {
    return { qStar: null, qStarStatus: 'not_computable' };
  }

  const cm = r - avc;

  if (cm > 0) {
    return {
      qStar: roundQStar(tfc / cm, policy.qStarRounding),
      qStarStatus: 'normal',
    };
  }

  // AVC ≥ R — ไม่มีจุดคุ้มทุนจริง ต่อให้รับนิสิตเท่าไหร่ก็ขาดทุนเพิ่ม
  if (r > 0 && policy.cmLeZeroPolicy === 'full_cost_recovery') {
    return {
      qStar: roundQStar(tc / r, policy.qStarRounding),
      // ต้องแยกสถานะให้ชัด — ค่านี้เป็น "เป้าหมายขั้นต่ำ" ไม่ใช่จุดคุ้มทุน
      // prototype รุ่น มิ.ย. รวมกรณีนี้เข้ากับกรณีปกติแล้วขึ้นว่า "ผ่านจุดคุ้มทุน"
      qStarStatus: 'full_cost_recovery',
    };
  }

  return { qStar: null, qStarStatus: 'not_computable' };
}

/** ใช้ในเทสต์และเครื่องมือเทียบรุ่น — เปิดให้เรียกการปัดเศษตรงๆ ได้ */
export function applyQStarRounding(value: number, rounding: QStarRounding): number {
  return roundQStar(value, rounding);
}
