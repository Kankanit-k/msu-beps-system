/** ยอดหนึ่งปีการศึกษา (รวมภาค 1 · 2 · ฤดูร้อน) */
export interface TuitionYear {
  /** ปีการศึกษา พ.ศ. */
  y: number;
  /** จำนวนนิสิตภาค 1 */
  n: number;
  /** วิธี 1: อัตราตามหลักสูตร × นิสิต (บาท) */
  m1: number;
  /** วิธี 2: อัตราตามกลุ่มค่าธรรมเนียมของนิสิต × นิสิต (บาท) */
  m2: number;
  /** วิธี 3: ยอดเรียกเก็บจริง ENROLLFEE (บาท · ยอดตั้งบิล ไม่ใช่เงินรับ) */
  billed: number;
  /** จำนวนนิสิตภาค 1 ที่มีบิล */
  billedN: number;
}

export type TuitionMatchHow = 'exact' | 'prefix' | 'reverse' | 'alias';

export interface TuitionProgramHistory {
  /** `${fac}|${lvl}|${prog}` ของ RAW.PROGS */
  key: string;
  /** อัตราตามหลักสูตร นิสิตไทย ปีล่าสุด (บาท/ภาค) — ค่าที่พบมากที่สุด */
  rate: number | null;
  /** ภาคการศึกษาตลอดหลักสูตร (ปีที่เรียน × ภาค/ปี) ตามทะเบียน */
  sems: number | null;
  /** ชื่อหลักสูตรในทะเบียนที่รวมเข้ามา และวิธีที่จับคู่ */
  regs: { name: string; how: TuitionMatchHow }[];
  years: TuitionYear[];
}

export interface TuitionHistoryData {
  years: number[];
  /** ทั้งมหาวิทยาลัย รวมแถวที่จับคู่หลักสูตรไม่ได้ */
  uni: TuitionYear[];
  programs: TuitionProgramHistory[];
  unmatched: { fac: string; lvl: string; name: string; years: TuitionYear[] }[];
}
