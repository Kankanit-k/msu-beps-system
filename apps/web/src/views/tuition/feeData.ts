// อัตราค่าธรรมเนียมรายหลักสูตร — ใช้ร่วมกันระหว่างหน้าค่าธรรมเนียม (W8) และหน้าคำนวณจุดคุ้มทุนรายหลักสูตร (W7)
import type { ApprovalStatus } from '@beps/shared-types';

import { FEE_RATES } from './feeRates';

export interface FeeRow {
  fac: string;
  lvl: string;
  /** วุฒิ/ชื่อสาขาวิชา ตามที่เขียนในแท็บค่าธรรมเนียม (สะกดไม่ตรงกับทะเบียนหลักสูตรเสมอไป) */
  prog: string;
  /** แผน/แขนง เช่น "แบบ 2.1" */
  plan: string | null;
  mode: 'ในเวลา' | 'นอกเวลา';
  /** ภาคการศึกษาตลอดหลักสูตร (ไฟล์ต้นทางยังว่างทุกแถว) */
  sems: number | null;
  /** บาท/ภาคการศึกษา นิสิตไทย · null เมื่อเป็นอัตราขั้นบันไดตามชั้นปี (ดู rateText) */
  rate: number | null;
  rateText: string | null;
  /** บาท/ภาคการศึกษา นิสิตต่างชาติ */
  rateIntl: number | null;
  note: string | null;
}

/** ข้อมูลจริงจากแท็บ "ค่าธรรมเนียม68" — ทุกอัตราในไฟล์เป็นอัตราที่ใช้อยู่แล้ว จึงถือว่าอนุมัติ */
export const FEES = FEE_RATES;

export const FEE_STATUS: ApprovalStatus = 'approved';

export const STATUS_META: Record<
  ApprovalStatus,
  { label: string; color: 'success' | 'warning' | 'default' | 'error' }
> = {
  approved: { label: 'อนุมัติแล้ว', color: 'success' },
  pending: { label: 'รออนุมัติ', color: 'warning' },
  draft: { label: 'ร่าง', color: 'default' },
  rejected: { label: 'ไม่อนุมัติ', color: 'error' },
};

export const fmtFee = (f: FeeRow) =>
  f.rate === null ? (f.rateText ?? '—') : f.rate.toLocaleString('th-TH');

/** "ในเวลา · แบบ 2.1" */
export const feeVariant = (f: FeeRow) => [f.mode, f.plan].filter(Boolean).join(' · ');

const norm = (s: string) => s.replace(/\s+/g, '');

/**
 * อัตราของหลักสูตรหนึ่ง — จับคู่ด้วย คณะ + ชื่อปริญญา (ไม่สนช่องว่าง)
 * แท็บค่าธรรมเนียมกับแท็บจุดคุ้มทุนสะกดชื่อหลักสูตรต่างกันในบางแถว จึงอาจจับคู่ไม่ได้
 */
export const feesForProgram = (fac: string, deg: string) =>
  FEES.filter((f) => norm(f.fac) === norm(fac) && norm(f.prog) === norm(deg));
