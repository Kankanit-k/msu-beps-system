import type { BreakEvenResult, RevenueMode } from '@beps/calc-engine';

import type { FeeRow } from '@views/tuition/feeData';

import type { CostGroup } from './CostBlockTable';
import type { Segment } from './newProgramCalc';
import type { ModeCosts } from './StudentMixTable';

/** ภาพรวมทุกขั้นตอน ณ ตอนบันทึก — ใช้พิมพ์รายงานเสนอสภาฯ ได้ครบโดยไม่ต้องคำนวณซ้ำ */
export interface ProgramReportDetail {
  refCol: string;
  customCol: string;
  /** ชื่อคอลัมน์ที่ประเมิน (คอลัมน์ที่แก้ได้เสมอ) */
  basisCol: string;
  semesters: number;
  fees: FeeRow[];
  alloc: {
    method: string;
    hint: string;
    source: string | null;
    pool: number;
    programs: number;
    targetLabel: string;
    /** ทุกหลักสูตรในคณะ — ส่วนแบ่งตามชีต (before) และตามวิธีที่เลือก (after) */
    shares: {
      label: string;
      lvl?: string;
      q?: number;
      before: number;
      after: number;
      target: boolean;
      /** Q* แบบชีตของหลักสูตรอื่น ก่อน/หลังปันส่วน รายกรณี (ไม่มี = หลักสูตรที่กำลังคำนวณ/หลักสูตรใหม่) */
      qStar?: Record<RevenueMode, { before: number; after: number }>;
    }[];
    /** วิธีกำหนดสัดส่วน % เอง — สัดส่วนที่กรอกรายกลุ่ม */
    pct?: {
      level: string;
      subMethod: string | null;
      lines: { label: string; programs: number; q: number; pct: string }[];
    };
    warnings: string[];
  } | null;
  groups: CostGroup[];
  showAllocAdj: boolean;
  segs: Segment[];
  mixCosts: ModeCosts;
}

export interface ProgramHistoryEntry {
  id: number;
  time: string;
  name: string;
  fac: string;
  level: string;
  isNew: boolean;
  /** หลักสูตรอ้างอิงที่ใช้เทียบเคียงต้นทุน (ไม่มี = คิดต้นทุนเอง หรือบันทึกก่อนมีฟิลด์นี้) */
  ref?: string;
  q: number;
  tr: number;
  tfc: number;
  tvc: number;
  avc: number;
  withGov: BreakEvenResult;
  withoutGov: BreakEvenResult;
  /** วิธีปันส่วนต้นทุนคงที่ส่วนกลางคณะที่ใช้ (ไม่มี = บันทึกก่อนมีฟิลด์นี้ = ตามชีต) */
  allocMethod?: string;
  /** โหมดที่เลือกบนแถบหัวหน้า ณ ตอนบันทึก (กราฟ/รายงานแสดงทั้งสองกรณีแล้ว) */
  mode: RevenueMode;
  /** รายละเอียดทุกขั้นตอน (ไม่มี = บันทึกก่อนมีฟิลด์นี้ → รายงานแบบสรุป) */
  detail?: ProgramReportDetail;
}
