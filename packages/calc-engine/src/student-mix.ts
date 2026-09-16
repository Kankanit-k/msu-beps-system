/**
 * สูตรที่ 8 — จุดคุ้มทุนแยกตามแผนการรับนิสิต (sales-mix break-even)
 *
 * ความต้องการจากผู้ใช้ (บันทึกการประชุม): *"พอเราได้จุดคุ้มทุนรวมมาแล้ว ถ้ามาแยก
 * ตามแผนการรับด้วยค่ะ"* — นิสิตไทย/ต่างชาติ × ภาคปกติ/ภาคพิเศษ และหลักสูตรต่อเนื่อง
 *
 * **ทำไมไม่ปันต้นทุนคงที่ตามสัดส่วนนิสิตแบบในไฟล์ Excel**
 * ชีต `4.จุดคุ้มทุนหลักสูตร(ใหม่)` บล็อก X–AD ปัน TFC ตาม % นิสิตแล้วหารด้วย CM ของกลุ่ม
 * ซึ่งต้องตั้งเกณฑ์ปันส่วนขึ้นมาเองและตีความผลยาก (ต้นทุนคงที่ไม่ได้โตตามกลุ่มนิสิต)
 * ที่นี่ใช้วิธีมาตรฐานทางบัญชีบริหารแทน — หา CM เฉลี่ยถ่วงน้ำหนักจากสัดส่วนแผนรับ
 * แล้วค่อยกระจาย Q* รวมกลับเป็นโควตารายกลุ่มตามสัดส่วนเดิม:
 *
 * ```
 * w_g   = q_g ÷ Σq                        สัดส่วนของกลุ่ม g ในแผนรับ
 * R̄     = Σ(w_g × R_g) = Σ(q_g × R_g) ÷ Σq    รายได้ต่อหัวเฉลี่ยถ่วงน้ำหนัก
 * CM̄    = R̄ − AVC = Σ(w_g × CM_g)             (เท่ากันพอดีเพราะ AVC ใช้ค่าเดียวทุกกลุ่ม)
 * Q*    = TFC ÷ CM̄                            ← สูตร 1 เดิม ไม่ต้องปันต้นทุน
 * Q*_g  = Q* × w_g                             โควตาจุดคุ้มทุนของกลุ่ม
 * ```
 *
 * ผลลัพธ์จึงตอบได้ทั้งสองคำถามในคราวเดียว: **แผนรับชุดนี้ถึงจุดคุ้มทุนไหม** และ
 * **แต่ละกลุ่มต้องรับกี่คนถึงจะครบจุดคุ้มทุน** โดยไม่ต้องรอเกณฑ์ปันส่วนจากกองแผนงาน
 *
 * ข้อสมมติที่ยัง **ไม่** ครอบคลุม (ต้องรอคำตอบก่อนถึงจะทำได้): AVC ต่างกันรายกลุ่ม
 * — ที่นี่ใช้ AVC ค่าเดียวทั้งหลักสูตร เหมือนที่ไฟล์ Excel ใช้
 */

import { perHead } from './per-head';
import type { CalcPolicy } from './policy';
import { DEFAULT_POLICY } from './policy';
import { calcQStar } from './qstar';
import type { QStarStatus } from './types';

export interface StudentMixGroupInput {
  /** รหัสกลุ่ม เช่น `normal-thai` — ใช้เป็น key ของแถวเท่านั้น */
  key: string;
  /** ชื่อกลุ่มที่แสดงผล เช่น "ภาคปกติ (นิสิตไทย)" */
  label: string;
  /** จำนวนนิสิตคงอยู่ของกลุ่มนี้ (ทุกชั้นปีรวมกัน) — ฐานเดียวกับ Q ของหลักสูตร */
  q: number;
  /** รายได้ต่อหัวต่อปีของกลุ่มนี้ — ฝั่งเรียกเป็นคนคูณค่าธรรมเนียม × จำนวนภาคเรียน */
  revenuePerHead: number;
}

export interface StudentMixInput {
  groups: StudentMixGroupInput[];
  /** ต้นทุนคงที่รวมของทั้งหลักสูตร — ไม่ถูกปันรายกลุ่ม */
  tfc: number;
  /** ต้นทุนผันแปรต่อหัว ใช้ค่าเดียวกันทุกกลุ่ม */
  avc: number;
}

export interface StudentMixGroupResult extends StudentMixGroupInput {
  /** สัดส่วนในแผนรับ 0–1 — `0` เมื่อแผนยังไม่มีนิสิตเลย */
  share: number;
  /** รายได้ต่อปีของกลุ่ม = q × revenuePerHead */
  revenue: number;
  /** Contribution Margin ต่อหัว = revenuePerHead − avc */
  cmPerHead: number;
  /** โควตาจุดคุ้มทุนของกลุ่ม = Q* × share — `null` เมื่อหา Q* รวมไม่ได้ */
  qStar: number | null;
  /** q − qStar — บวกคือรับเกินโควตา ลบคือยังขาด */
  diff: number | null;
}

export interface StudentMixResult {
  groups: StudentMixGroupResult[];
  /** จำนวนนิสิตรวมตามแผนรับ */
  qPlan: number;
  /** รายได้รวมต่อปีตามแผนรับ */
  tr: number;
  tfc: number;
  /** ต้นทุนผันแปรรวมที่แผนนี้จะเกิด = avc × qPlan */
  tvc: number;
  tc: number;
  /** รายได้ต่อหัวเฉลี่ยถ่วงน้ำหนัก — `null` เมื่อแผนยังไม่มีนิสิต */
  r: number | null;
  avc: number;
  /** CM เฉลี่ยถ่วงน้ำหนัก = r − avc */
  cm: number | null;
  /** จุดคุ้มทุนรวมภายใต้แผนรับชุดนี้ */
  qStar: number | null;
  qStarStatus: QStarStatus;
  /** รายได้ ณ จุดคุ้มทุน = qStar × r */
  breakEvenRevenue: number | null;
  /** qPlan − qStar — บวกคือแผนนี้ผ่านจุดคุ้มทุน */
  diff: number | null;
  /** กำไร/ขาดทุนต่อปีถ้ารับได้ตามแผน = tr − tc */
  profit: number;
}

/**
 * กระจายจำนวนเต็มตามสัดส่วนด้วยวิธีเศษมากได้ก่อน (largest remainder)
 *
 * ต้องกระจายแบบนี้ ไม่ใช่ปัดทีละกลุ่ม เพราะผลรวมโควตารายกลุ่ม **ต้องเท่ากับ Q* รวม**
 * ถ้าปัดขึ้นทุกกลุ่มจะได้ผลรวมเกินจริงหลายคน แล้วผู้ใช้จะเจอสองตัวเลขที่ไม่ตรงกัน
 * ในหน้าจอเดียว (วิธีเดียวกับที่ fixture ประเภทนิสิตใน apps/web ใช้กระจายเศษ)
 */
function allocateByShare(total: number, shares: number[]): number[] {
  const exact = shares.map((share) => total * share);
  const allocated = exact.map(Math.floor);

  let left = total - allocated.reduce((acc, n) => acc + n, 0);

  // เรียงตามเศษที่เหลือมากไปน้อย แล้วแจกทีละ 1 จนครบ
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (const { index } of order) {
    if (left <= 0) break;
    allocated[index] = (allocated[index] ?? 0) + 1;
    left -= 1;
  }

  return allocated;
}

const safe = (value: number): number => (Number.isFinite(value) ? value : 0);

/**
 * คำนวณจุดคุ้มทุนของแผนการรับนิสิต
 *
 * @param input  กลุ่มนิสิตตามแผนรับ + TFC และ AVC ของทั้งหลักสูตร
 * @param policy ค่าตั้งของงวดนั้น — ต้องเป็นชุดเดียวกับที่ส่งให้ `calcBreakEven()`
 *               ของหลักสูตรเดียวกัน ไม่งั้น Q* สองตัวบนหน้าจอจะปัดเศษคนละแบบ
 */
export function calcStudentMixBreakEven(
  input: StudentMixInput,
  policy: CalcPolicy = DEFAULT_POLICY,
): StudentMixResult {
  const tfc = safe(input.tfc);
  const avc = safe(input.avc);

  // กลุ่มที่กรอกจำนวนติดลบถือว่าเป็นศูนย์ — ไม่ปล่อยให้ดึงสัดส่วนของกลุ่มอื่นเพี้ยน
  const groups = input.groups.map((group) => ({
    ...group,
    q: Math.max(0, safe(group.q)),
    revenuePerHead: safe(group.revenuePerHead),
  }));

  const qPlan = groups.reduce((acc, group) => acc + group.q, 0);
  const tr = groups.reduce((acc, group) => acc + group.q * group.revenuePerHead, 0);
  const tvc = avc * qPlan;
  const tc = tfc + tvc;

  const r = perHead(tr, qPlan);
  const cm = r === null ? null : r - avc;

  const { qStar, qStarStatus } = calcQStar(tfc, tc, r, avc, policy);

  const prepared = groups.map((group) => ({
    ...group,
    share: qPlan > 0 ? group.q / qPlan : 0,
    revenue: group.q * group.revenuePerHead,
    cmPerHead: group.revenuePerHead - avc,
  }));

  const quotas =
    qStar === null
      ? null
      : allocateByShare(
          qStar,
          prepared.map((group) => group.share),
        );

  return {
    groups: prepared.map((group, index) => {
      const groupQStar = quotas?.[index] ?? null;

      return {
        ...group,
        qStar: groupQStar,
        diff: groupQStar === null ? null : group.q - groupQStar,
      };
    }),
    qPlan,
    tr,
    tfc,
    tvc,
    tc,
    r,
    avc,
    cm,
    qStar,
    qStarStatus,
    breakEvenRevenue: qStar !== null && r !== null ? qStar * r : null,
    diff: qStar === null ? null : qPlan - qStar,
    profit: tr - tc,
  };
}
