/**
 * การวิเคราะห์สัดส่วนจำนวนนิสิตเพื่อหาจุดคุ้มทุน — แยกตามแผนการรับนิสิต
 *
 * ความต้องการจากที่ประชุม (คุณเอื้อง): เมื่อได้จุดคุ้มทุน**รวม**ของหลักสูตรแล้ว
 * ต้องแตกต่อได้ว่าถ้าแยกตามแผนการรับ — นิสิตไทย (ปกติ/พิเศษ) · นิสิตต่างชาติ
 * (ปกติ/พิเศษ) · หลักสูตรต่อเนื่อง — แต่ละกลุ่มอยู่ตรงไหนของจุดคุ้มทุน
 * ใช้ได้ทั้งตอนปรับปรุงหลักสูตรปัจจุบันและตอนเสนอเปิดหลักสูตรใหม่
 *
 * ต้นแบบคือแผง `X9:AD22` ของชีต `4.จุดคุ้มทุนหลักสูตร(ใหม่)` แต่ **ไม่ได้ลอกสูตรมาตรงๆ**
 * เพราะแผงนั้นมีข้อบกพร่องที่ต้องแก้ก่อน:
 *
 * 1. แถว 22 ตั้งชื่อว่า "จุดคุ้มทุนของหลักสูตร" แต่สูตรคือ `TR − TFC − TVC`
 *    ซึ่งเป็น**ส่วนเกิน/กำไร ไม่ใช่ Q\*** — ที่นี่แยกเป็นคนละฟิลด์ (`contribution` กับ `qStar`)
 * 2. แถว 11 (สัดส่วน) กับแถว 12 (จำนวนนิสิต) นิยามกันไปกลับ → circular reference แฝง
 *    ที่นี่ให้ **จำนวนนิสิตเป็นอินพุตทางเดียว** แล้วคำนวณสัดส่วนออกมา ไม่ย้อนกลับ
 * 3. แถว 17 บวกเงินแผ่นดินเฉพาะคอลัมน์แรก คอลัมน์อื่นไม่บวก — ที่นี่ใช้ `revenueMode`
 *    ชุดเดียวกับทั้งระบบ (สูตร 5a/5b) จึงไม่มีทางไม่ตรงกันข้ามคอลัมน์
 * 4. `จำนวนเทอมต่อปี` ในชีตไม่เคยถูกอ้างในสูตรใดเลย (ใช้ `*2` ฮาร์ดโค้ดแทน)
 *    ที่นี่บังคับให้ส่ง `termsPerYear` มาทุกแถว
 *
 * ⚠ **Q\* รายประเภทขึ้นกับส่วนผสมที่กรอกเข้ามา** — เพราะ TFC เป็นก้อนเดียวของทั้งหลักสูตร
 * การจะพูดว่า "ประเภทนี้คุ้มทุนที่กี่คน" ต้องปันส่วน TFC ให้ก่อน ซึ่งที่นี่ปันตามสัดส่วนหัวนิสิต
 * ตามที่ชีต Excel ทำ ผลที่ได้จึงเป็น "ถ้าส่วนผสมเป็นแบบนี้ กลุ่มนี้ต้องมีกี่คนจึงจะคุ้มส่วนของตัวเอง"
 * **ไม่ใช่ค่าคงที่ของกลุ่ม** เปลี่ยนส่วนผสมแล้วค่านี้เปลี่ยน — UI ต้องสื่อให้ชัด
 * ถ้าคำถามคือ "ตรึงไทยไว้เท่าเดิม ต้องรับต่างชาติกี่คนจึงคุ้ม" ให้ใช้ `solveAdmissionTarget()`
 * ซึ่งเป็น goal-seek และให้คำตอบที่ไม่ขึ้นกับการปันส่วน
 */

import type { CalcPolicy } from './policy.js';
import { DEFAULT_POLICY, roundQStar } from './policy.js';
import { calcQStar } from './qstar.js';
import { calcBreakEven } from './break-even.js';
import type { BreakEvenResult, QStarStatus, RevenueMode } from './types.js';

/**
 * แผนการรับนิสิตของหนึ่งประเภท — รับได้ 2 แบบ
 *
 * - `headcount` = รู้จำนวนนิสิตคงค้างทุกชั้นปีรวมกันอยู่แล้ว (กรณีหลักสูตรเดิม ดึงจาก
 *   `registration_snapshot`)
 * - `intake` = รู้แค่ "รับปีละกี่คน" (กรณีหลักสูตรใหม่ที่ยังไม่มีนิสิต) แปลงเป็นจำนวน
 *   คงค้างที่ steady state = รับต่อปี × จำนวนปีของหลักสูตร — หลักสูตรต่อเนื่อง 2 ปี
 *   ใส่ `durationYears: 2` ก็ได้ผลถูกต้องโดยไม่ต้องมีเคสพิเศษ
 */
export type AdmissionPlan =
  | { basis: 'headcount'; headcount: number }
  | { basis: 'intake'; intakePerYear: number; durationYears: number };

export interface AdmissionMixRow {
  /** อ้าง `student_type.student_type_code` — หรือรหัสที่ผู้ใช้ตั้งเองในโหมดหลักสูตรใหม่ */
  studentTypeCode: string;
  /** ชื่อที่แสดงบนหน้าจอ เช่น "ปกติ (นิสิตไทย)" — ไม่ใส่ก็ใช้ `studentTypeCode` แทน */
  label?: string;
  plan: AdmissionPlan;
  /** ค่าธรรมเนียม บาท/คน/ภาคเรียน — มาจาก `fee_schedule.fee_rate` ของประเภทนี้ */
  feePerTerm: number;
  /** เงินแผ่นดินต่อหัว บาท/คน/ภาคเรียน — นับเป็นรายได้เฉพาะโหมด `with_government` */
  governmentPerTerm?: number;
  /** จำนวนภาคเรียนต่อปีของหลักสูตร — ห้ามฮาร์ดโค้ด 2 แบบที่ชีต Excel ทำ */
  termsPerYear: number;
}

export interface AdmissionMixInput {
  rows: readonly AdmissionMixRow[];
  /** ต้นทุนคงที่รวมของทั้งหลักสูตร (บาท/ปี) — ก้อนเดียว ไม่ได้แยกตามประเภทนิสิต */
  tfc: number;
  /**
   * ต้นทุนผันแปรต่อหัว (บาท/คน/ปี)
   *
   * แยกเป็นพารามิเตอร์แทนที่จะรับ TVC ก้อนรวม เพราะ TVC ต้อง**ผันไปตามจำนวนนิสิตที่จำลอง**
   * ถ้ารับเป็นก้อนรวมมา การเปลี่ยนส่วนผสมจะไม่ทำให้ TVC ขยับ ซึ่งผิดนิยามต้นทุนผันแปร
   * หลักสูตรเดิมหาค่านี้ได้จาก `AVC` ของผลคำนวณจริง (`break_even_result.avc`)
   */
  variableCostPerHead: number;
  revenueMode: RevenueMode;
}

export interface AdmissionMixRowResult {
  studentTypeCode: string;
  label: string;
  headcount: number;
  /** สัดส่วนหัวนิสิตของประเภทนี้ (0–1) — `0` เมื่อทั้งหลักสูตรไม่มีนิสิตเลย */
  share: number;
  /** รายได้ต่อหัวต่อปี = (ค่าธรรมเนียม [+ เงินแผ่นดิน]) × ภาคเรียนต่อปี */
  revenuePerHead: number;
  revenue: number;
  /** ส่วนแบ่ง TFC ตามสัดส่วนหัวนิสิต — ดูคำเตือนหัวไฟล์ */
  allocatedTfc: number;
  tvc: number;
  avc: number;
  /** Contribution Margin ต่อหัว = รายได้ต่อหัว − AVC */
  cm: number;
  /** ส่วนเกินของประเภทนี้ = รายได้ − TFC ที่ปันมา − TVC (ชีต Excel เรียกผิดว่า "จุดคุ้มทุน") */
  contribution: number;
  /** จำนวนนิสิตประเภทนี้ ณ จุดคุ้มทุนของส่วนที่ปันมา */
  qStar: number | null;
  qStarStatus: QStarStatus;
}

export interface AdmissionMixResult {
  revenueMode: RevenueMode;
  rows: AdmissionMixRowResult[];
  /**
   * ผลรวมทั้งหลักสูตร — คำนวณด้วย `calcBreakEven()` ตัวเดียวกับทุกหน้าจอ
   * จึงรับประกันว่า "จุดคุ้มทุนรวม" ในขั้นที่ 1 กับผลแยกในขั้นที่ 2 มาจากสูตรชุดเดียวกัน
   */
  total: BreakEvenResult;
}

/** แปลงแผนการรับเป็นจำนวนนิสิตคงค้าง */
export function resolveHeadcount(plan: AdmissionPlan): number {
  return plan.basis === 'headcount' ? plan.headcount : plan.intakePerYear * plan.durationYears;
}

/** รายได้ต่อหัวต่อปีของหนึ่งประเภท ตามฐานรายได้ที่เลือก (สูตร 5a/5b) */
function revenuePerHead(row: AdmissionMixRow, mode: RevenueMode): number {
  const government = mode === 'with_government' ? (row.governmentPerTerm ?? 0) : 0;
  return (row.feePerTerm + government) * row.termsPerYear;
}

/**
 * กระจายจุดคุ้มทุนของหลักสูตรลงตามแผนการรับนิสิต
 *
 * ```
 * Q        = Σ จำนวนนิสิตทุกประเภท
 * share_i  = Q_i ÷ Q
 * R_i      = (ค่าธรรมเนียม_i [+ เงินแผ่นดิน_i]) × ภาคเรียนต่อปี
 * TFC_i    = TFC × share_i          ← ปันตามหัว ดูคำเตือนหัวไฟล์
 * TVC_i    = AVC × Q_i
 * CM_i     = R_i − AVC
 * Q*_i     = TFC_i ÷ CM_i           (ผ่าน calcQStar จึงเคารพนโยบาย cm_le_zero_policy)
 * ```
 */
export function calcAdmissionMix(
  input: AdmissionMixInput,
  policy: CalcPolicy = DEFAULT_POLICY,
): AdmissionMixResult {
  const { rows, tfc, variableCostPerHead: avc, revenueMode } = input;

  if (rows.length === 0) {
    throw new Error('calcAdmissionMix: ต้องมีแผนการรับนิสิตอย่างน้อย 1 ประเภท');
  }
  assertUniqueCodes(rows);

  const headcounts = rows.map((row) => resolveHeadcount(row.plan));
  const totalHeadcount = headcounts.reduce((acc, n) => acc + n, 0);

  const resultRows = rows.map((row, i) => {
    // rows กับ headcounts สร้างจาก map ตัวเดียวกัน ความยาวเท่ากันเสมอ
    const headcount = headcounts[i] ?? 0;
    const share = totalHeadcount > 0 ? headcount / totalHeadcount : 0;
    const perHeadRevenue = revenuePerHead(row, revenueMode);
    const allocatedTfc = tfc * share;
    const tvc = avc * headcount;

    const { qStar, qStarStatus } = calcQStar(
      allocatedTfc,
      allocatedTfc + tvc,
      perHeadRevenue,
      avc,
      policy,
    );

    return {
      studentTypeCode: row.studentTypeCode,
      label: row.label ?? row.studentTypeCode,
      headcount,
      share,
      revenuePerHead: perHeadRevenue,
      revenue: perHeadRevenue * headcount,
      allocatedTfc,
      tvc,
      avc,
      cm: perHeadRevenue - avc,
      contribution: perHeadRevenue * headcount - allocatedTfc - tvc,
      qStar,
      qStarStatus,
    } satisfies AdmissionMixRowResult;
  });

  // แยกงบ 2 ก้อนส่งให้ calcBreakEven เพื่อให้สลับฐานรายได้ที่ปลายทางได้เหมือนหน้าอื่น
  const governmentBudget = rows.reduce(
    (acc, row, i) => acc + (row.governmentPerTerm ?? 0) * row.termsPerYear * (headcounts[i] ?? 0),
    0,
  );
  const incomeBudget = rows.reduce(
    (acc, row, i) => acc + row.feePerTerm * row.termsPerYear * (headcounts[i] ?? 0),
    0,
  );

  const total = calcBreakEven(
    {
      q: totalHeadcount,
      governmentBudget,
      incomeBudget,
      tfc,
      tvc: avc * totalHeadcount,
      revenueMode,
    },
    policy,
  );

  return { revenueMode, rows: resultRows, total };
}

/** ผลของ goal-seek — แยกจาก `QStarStatus` เพราะเป็นคนละคำถามกัน */
export type AdmissionTargetStatus =
  /** แก้สมการได้ตามปกติ */
  | 'normal'
  /** ประเภทอื่นคุ้มทุนให้ทั้งหลักสูตรอยู่แล้ว ไม่ต้องรับประเภทนี้เพิ่ม */
  | 'already_break_even'
  /** รายได้ต่อหัวของประเภทนี้ไม่เกิน AVC — รับเท่าไหร่ก็ไม่มีวันคุ้ม */
  | 'unreachable';

export interface AdmissionTargetResult {
  targetStudentTypeCode: string;
  /** จำนวนที่ต้องรับจึงจะคุ้มทุนทั้งหลักสูตร — `null` เมื่อ `unreachable` */
  requiredHeadcount: number | null;
  status: AdmissionTargetStatus;
  /** จำนวนที่แผนปัจจุบันตั้งไว้สำหรับประเภทนี้ */
  plannedHeadcount: number;
  /** แผนปัจจุบัน − ที่ต้องการ · บวก = เกินพอ · ลบ = ยังขาด · `null` เมื่อแก้ไม่ได้ */
  gap: number | null;
}

/**
 * Goal-seek — "ถ้าตรึงประเภทอื่นไว้ตามแผน ต้องรับประเภทนี้กี่คนจึงจะคุ้มทุนทั้งหลักสูตร"
 *
 * เป็นคำถามที่ตอบตรงกว่า `qStar` รายแถว เพราะ **ไม่ต้องปันส่วน TFC** จึงไม่ขึ้นกับ
 * ส่วนผสมที่กรอกเข้ามา แก้สมการเชิงเส้นได้ตรงๆ:
 *
 * ```
 * รายได้อื่น + R_t · x = TFC + AVC · (Q_อื่น + x)
 * x = (TFC + AVC · Q_อื่น − รายได้อื่น) ÷ (R_t − AVC)
 * ```
 *
 * @param targetStudentTypeCode ประเภทที่ให้ปรับ — ต้องมีอยู่ใน `rows` (ใช้ค่าธรรมเนียมของแถวนั้น)
 */
export function solveAdmissionTarget(
  input: AdmissionMixInput,
  targetStudentTypeCode: string,
  policy: CalcPolicy = DEFAULT_POLICY,
): AdmissionTargetResult {
  const { rows, tfc, variableCostPerHead: avc, revenueMode } = input;
  assertUniqueCodes(rows);

  const target = rows.find((row) => row.studentTypeCode === targetStudentTypeCode);
  if (target === undefined) {
    throw new Error(
      `solveAdmissionTarget: ไม่พบประเภทนิสิต "${targetStudentTypeCode}" ในแผนการรับที่ส่งมา`,
    );
  }

  const plannedHeadcount = resolveHeadcount(target.plan);
  const others = rows.filter((row) => row !== target);
  const othersHeadcount = others.reduce((acc, row) => acc + resolveHeadcount(row.plan), 0);
  const othersRevenue = others.reduce(
    (acc, row) => acc + revenuePerHead(row, revenueMode) * resolveHeadcount(row.plan),
    0,
  );

  const cm = revenuePerHead(target, revenueMode) - avc;
  const shortfall = tfc + avc * othersHeadcount - othersRevenue;

  // ประเภทนี้ไม่ได้ช่วยปิดช่องว่าง — รับเพิ่มมีแต่ขาดทุนเพิ่ม
  if (cm <= 0) {
    return shortfall <= 0
      ? {
          targetStudentTypeCode,
          requiredHeadcount: 0,
          status: 'already_break_even',
          plannedHeadcount,
          gap: plannedHeadcount,
        }
      : {
          targetStudentTypeCode,
          requiredHeadcount: null,
          status: 'unreachable',
          plannedHeadcount,
          gap: null,
        };
  }

  if (shortfall <= 0) {
    return {
      targetStudentTypeCode,
      requiredHeadcount: 0,
      status: 'already_break_even',
      plannedHeadcount,
      gap: plannedHeadcount,
    };
  }

  // ใช้การปัดเศษชุดเดียวกับ Q* เพราะเป็น "จำนวนคน" เหมือนกัน — ห้ามปัดคนละแบบกับหน้าอื่น
  const requiredHeadcount = roundQStar(shortfall / cm, policy.qStarRounding);

  return {
    targetStudentTypeCode,
    requiredHeadcount,
    status: 'normal',
    plannedHeadcount,
    gap: plannedHeadcount - requiredHeadcount,
  };
}

function assertUniqueCodes(rows: readonly AdmissionMixRow[]): void {
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.studentTypeCode)) {
      throw new Error(
        `calcAdmissionMix: ประเภทนิสิต "${row.studentTypeCode}" ซ้ำกัน — ` +
          'แผนการรับต้องมีหนึ่งแถวต่อหนึ่งประเภท',
      );
    }
    seen.add(row.studentTypeCode);
  }
}
