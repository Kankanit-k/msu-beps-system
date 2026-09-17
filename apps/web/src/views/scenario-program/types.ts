import type { BreakEvenResult, RevenueMode } from '@beps/calc-engine';

export interface ProgramHistoryEntry {
  id: number;
  time: string;
  name: string;
  fac: string;
  level: string;
  isNew: boolean;
  q: number;
  tr: number;
  tfc: number;
  tvc: number;
  avc: number;
  withGov: BreakEvenResult;
  withoutGov: BreakEvenResult;
  /** โหมดที่ใช้แสดงกราฟ/รายงาน ณ ตอนคำนวณ */
  mode: RevenueMode;
}
