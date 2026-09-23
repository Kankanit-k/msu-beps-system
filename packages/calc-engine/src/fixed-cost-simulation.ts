/**
 * จำลองเทียบวิธีจัดสรรต้นทุนคงที่ — ขั้นที่ 3 ของกระบวนการใน FIXED-COST-WORKFLOW.md
 *
 * มติให้คณะเลือกวิธีเอง แต่คณะจะเลือกอย่างมีเหตุผลไม่ได้ถ้ายังไม่เห็นว่าแต่ละวิธี
 * ทำให้ Q* ของหลักสูตรตัวเองเปลี่ยนไปเท่าไหร่ ฟังก์ชันนี้จึงรับข้อมูลจริงของงวดนั้น
 * แล้วคืนผลของทุกวิธีที่อยากเทียบพร้อมกัน โดย **ไม่แตะฐานข้อมูลและไม่สร้าง run**
 *
 * ข้อรับประกันที่เทสต์ไว้: ยอดรวมต้นทุนคงที่ของคณะเท่ากันทุกวิธี — เปลี่ยนวิธี
 * คือเปลี่ยน "การกระจายภายในคณะ" ไม่ใช่เปลี่ยนต้นทุน (หลักการข้อ 4 ในเอกสาร)
 */

import type { AggregateBreakEvenResult } from './aggregate';
import { aggregateBreakEven } from './aggregate';
import { calcBreakEven } from './break-even';
import type { FixedCostPolicy, PolicyIssue, ProgramWeightInput } from './fixed-cost-policy';
import { allocateFixedCost, buildFixedCostDrivers } from './fixed-cost-policy';
import { perHead } from './per-head';
import type { CalcPolicy } from './policy';
import { DEFAULT_POLICY } from './policy';
import type { BreakEvenResult, RevenueMode } from './types';

export interface FixedCostProgramInput extends ProgramWeightInput {
  /** จำนวนนิสิตจริงในงวด (Q) — อาจต่างจาก FTES เมื่อถ่วงน้ำหนักภาคพิเศษ */
  q: number;
  governmentBudget: number;
  incomeBudget: number;
  /** ต้นทุนผันแปรรวมของหลักสูตร — ไม่ถูกนโยบายนี้แตะ */
  tvc: number;
  /** ต้นทุนคงที่ที่ ERP ผูกหลักสูตรได้อยู่แล้ว (direct) — ไม่เข้าก้อนที่ปันส่วน */
  directFixedCost?: number;
}

export interface FixedCostSimulationInput {
  /** ต้นทุนคงที่ของคณะที่ต้องปันส่วน (ไม่รวม direct ของแต่ละหลักสูตร) */
  pool: number;
  programs: readonly FixedCostProgramInput[];
  revenueMode: RevenueMode;
  /** วิธีที่อยากเทียบ — ปกติคือ 3 วิธีตามมติ โดยวิธีแรกใช้เป็นฐานเปรียบเทียบ */
  candidates: readonly { key: string; label?: string | undefined; policy: FixedCostPolicy }[];
}

export interface SimulatedProgram {
  programVersionId: string;
  label?: string | undefined;
  bucketKey: string | null;
  /** ส่วนแบ่งจากก้อนที่ปันส่วน */
  allocatedFixedCost: number;
  directFixedCost: number;
  /** ต้นทุนคงที่รวมของหลักสูตร = direct + ที่ได้รับปันส่วน */
  tfc: number;
  /** ต้นทุนคงที่ต่อหัว — `null` เมื่อไม่มีนิสิต */
  fixedCostPerHead: number | null;
  breakEven: BreakEvenResult;
  /** ส่วนต่างจากวิธีฐาน — `null` เมื่อรายการนี้คือวิธีฐานเอง */
  deltaVsBaseline: {
    tfc: number;
    qStar: number | null;
    profit: number;
  } | null;
}

export interface SimulatedMethod {
  key: string;
  label?: string | undefined;
  policy: FixedCostPolicy;
  issues: PolicyIssue[];
  /** นโยบายนี้เสนอขออนุมัติได้หรือยัง (ไม่มี issue ระดับ error) */
  valid: boolean;
  programs: SimulatedProgram[];
  /** ผลระดับคณะ — ยอดรวมต้องเท่ากันทุกวิธี ต่างกันเฉพาะ Q* แบบ sum_of_programs */
  faculty: AggregateBreakEvenResult | null;
}

export interface FixedCostSimulationResult {
  pool: number;
  revenueMode: RevenueMode;
  baselineKey: string | null;
  methods: SimulatedMethod[];
}

/**
 * คำนวณผลของทุกวิธีที่ส่งมาบนข้อมูลชุดเดียวกัน
 *
 * @param calcPolicy ค่าตั้งการคำนวณของงวดนั้น (`qstar_rounding`, `cm_le_zero_policy`, …)
 *                   ต้องเป็นชุดเดียวกับที่ใช้ตอนคำนวณจริง ไม่งั้นตัวเลขจำลองจะไม่ตรงกับ run
 */
export function simulateFixedCostMethods(
  input: FixedCostSimulationInput,
  calcPolicy: CalcPolicy = DEFAULT_POLICY,
): FixedCostSimulationResult {
  const methods = input.candidates.map(({ key, label, policy }) => {
    const driverSet = buildFixedCostDrivers(policy, input.programs);
    const allocated = allocateFixedCost(input.pool, driverSet);
    const share = new Map(allocated.map((a) => [a.programVersionId, a]));

    // ไล่ตามลำดับหลักสูตรที่ส่งเข้ามาเสมอ เพื่อให้ทุกวิธีเทียบกันแถวต่อแถวได้
    const programs: SimulatedProgram[] = input.programs.map((p) => {
      const row = share.get(p.programVersionId);
      const allocatedFixedCost = row?.amount ?? 0;
      const directFixedCost = p.directFixedCost ?? 0;
      const tfc = directFixedCost + allocatedFixedCost;

      return {
        programVersionId: p.programVersionId,
        label: p.label,
        bucketKey: row?.bucketKey ?? null,
        allocatedFixedCost,
        directFixedCost,
        tfc,
        fixedCostPerHead: perHead(tfc, p.q),
        breakEven: calcBreakEven(
          {
            q: p.q,
            governmentBudget: p.governmentBudget,
            incomeBudget: p.incomeBudget,
            tfc,
            tvc: p.tvc,
            revenueMode: input.revenueMode,
          },
          calcPolicy,
        ),
        deltaVsBaseline: null,
      };
    });

    return {
      key,
      label,
      policy,
      issues: driverSet.issues,
      valid: driverSet.valid,
      programs,
      faculty:
        programs.length > 0
          ? aggregateBreakEven(
              programs.map((p) => p.breakEven),
              'faculty',
              calcPolicy,
            )
          : null,
    } satisfies SimulatedMethod;
  });

  const baseline = methods[0] ?? null;

  if (baseline) {
    for (const method of methods.slice(1)) {
      method.programs.forEach((row, i) => {
        const base = baseline.programs[i];
        if (!base) return;

        row.deltaVsBaseline = {
          tfc: row.tfc - base.tfc,
          qStar:
            row.breakEven.qStar !== null && base.breakEven.qStar !== null
              ? row.breakEven.qStar - base.breakEven.qStar
              : null,
          profit: row.breakEven.profit - base.breakEven.profit,
        };
      });
    }
  }

  return {
    pool: input.pool,
    revenueMode: input.revenueMode,
    baselineKey: baseline?.key ?? null,
    methods,
  };
}

/** ชุดวิธีตั้งต้นสำหรับหน้าจำลอง — วิธีที่ 1 เป็นฐานเพราะตรงกับพฤติกรรมของระบบเดิม */
export function defaultCandidates(
  custom?: FixedCostPolicy,
): { key: string; label: string; policy: FixedCostPolicy }[] {
  const base = [
    {
      key: 'PER_HEAD_FTES',
      label: 'คิดตามรายหัวนิสิต (FTES)',
      policy: { method: 'PER_HEAD_FTES' } satisfies FixedCostPolicy,
    },
    {
      key: 'EQUAL_PROGRAM',
      label: 'หารเท่ากันทุกหลักสูตรในคณะ',
      policy: { method: 'EQUAL_PROGRAM' } satisfies FixedCostPolicy,
    },
  ];

  return custom
    ? [...base, { key: 'CUSTOM_PCT', label: 'กำหนดสัดส่วนเปอร์เซ็นต์เอง', policy: custom }]
    : base;
}
