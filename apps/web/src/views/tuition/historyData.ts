// ค่าเทอมย้อนหลัง 6 ปีการศึกษา (ระบบทะเบียน) ผูกกับหลักสูตรใน RAW.PROGS
import type { ProgRow } from '@/data/mockup';
import { RAW } from '@/data/mockup';

import { TUITION_HISTORY } from './tuitionHistory';
import type { TuitionProgramHistory, TuitionYear } from './tuitionHistory.types';

export type { TuitionProgramHistory, TuitionYear };

export const HISTORY = TUITION_HISTORY;
export const HISTORY_YEARS = HISTORY.years;
export const LAST_YEAR = HISTORY_YEARS[HISTORY_YEARS.length - 1]!;

export const progKey = (p: Pick<ProgRow, 'fac' | 'lvl' | 'prog'>) => `${p.fac}|${p.lvl}|${p.prog}`;

const BY_KEY = new Map(HISTORY.programs.map((h) => [h.key, h]));

/** ประวัติค่าเทอมของหลักสูตร — undefined เมื่อทะเบียนไม่มีหลักสูตรที่จับคู่ได้ */
export const historyFor = (p: Pick<ProgRow, 'fac' | 'lvl' | 'prog'>) => BY_KEY.get(progKey(p));

export interface HistoryRow {
  prog: ProgRow;
  h: TuitionProgramHistory;
  last: TuitionYear;
}

/** หลักสูตรที่มีข้อมูลย้อนหลัง เรียงตามลำดับ RAW.PROGS */
export const HISTORY_ROWS: HistoryRow[] = RAW.PROGS.flatMap((prog) => {
  const h = historyFor(prog);

  return h ? [{ prog, h, last: h.years[h.years.length - 1]! }] : [];
});

/** หลักสูตรในระบบที่ทะเบียนไม่มีข้อมูล */
export const PROGS_WITHOUT_HISTORY = RAW.PROGS.filter((p) => !historyFor(p));

/** ส่วนต่าง % ของวิธี (1 หรือ 2) เทียบยอดเรียกเก็บจริง · null เมื่อไม่มีบิล */
export const gapPct = (v: number, billed: number) =>
  billed ? ((v - billed) / billed) * 100 : null;

export const METHOD_META = {
  m1: { label: 'วิธี 1 · อัตราตามหลักสูตร', short: 'อัตราหลักสูตร' },
  m2: { label: 'วิธี 2 · อัตราตามกลุ่มนิสิต', short: 'อัตรากลุ่มนิสิต' },
  billed: { label: 'วิธี 3 · เรียกเก็บจริง', short: 'เรียกเก็บจริง' },
} as const;

export const MATCH_LABEL: Record<TuitionProgramHistory['regs'][number]['how'], string> = {
  exact: 'ชื่อตรงกัน',
  prefix: 'ชื่อทะเบียนมีแผน/แบบต่อท้าย',
  reverse: 'ชื่อทะเบียนสั้นกว่า',
  alias: 'กำหนดคู่เอง',
};
