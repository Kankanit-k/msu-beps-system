/**
 * องค์ประกอบต้นทุนรวม (TC) ที่ชุดข้อมูลปัจจุบัน "แยกออกจากกันได้จริง"
 *
 * `RAW.FACS` เก็บต้นทุนผันแปรไว้เป็นยอดรวม (`TVC`) เท่านั้น การแตกองค์ประกอบจึงต้อง
 * รวบขึ้นมาจาก `RAW.PROGS` — ตรวจแล้วว่าผลรวมรายหลักสูตรตรงกับยอดคณะและยอด
 * มหาวิทยาลัยพอดีทั้ง TC / TFC / TVC / Q จึงรวมขึ้นได้โดยไม่มีหลักสูตรตกหล่น
 *
 * ความสัมพันธ์ที่ยืนยันกับชุดข้อมูลแล้ว (ไม่มีรายการใดถูกนับซ้ำ):
 *   TFC = tfcProg + tfcOffice + dep
 *   TVC = tvcProg + tvcOffice + genEd + matchMain + matchUni
 *
 * ฝั่งต้นทุนคงที่ใช้นิยามเดียวกับ W20 (`views/fixed-cost-policy/data.ts`) — ทางตรงคือรายการ
 * ที่ผูกรหัสหลักสูตรใน ERP แล้ว ส่วน `tfcOffice`/`dep` เป็นก้อนที่นโยบายรับไปปันส่วน
 * W20 ไม่มีฝั่งต้นทุนผันแปร การแบ่ง `tvcProg`/`tvcOffice` ตามหลักเดียวกันจึงเพิ่มขึ้นที่นี่
 */
import type { ProgRow } from '@/data/mockup';

/** ที่มาของต้นทุน — ตอบคำถามว่า "ก้อนนี้ผูกถึงหลักสูตรได้แค่ไหน จึงต้องปันส่วนแค่ไหน" */
export type CostOrigin = 'direct' | 'allocated' | 'charge';

export const ORIGIN_META: Record<
  CostOrigin,
  { label: string; hint: string; color: string; accent: 'primary' | 'warning' | 'info' }
> = {
  direct: {
    label: 'ผูกถึงหลักสูตรแล้ว',
    hint: 'ผูกรหัสหลักสูตรใน ERP แล้ว — ระบุได้ว่าเงินก้อนนี้เป็นของหลักสูตรใด ไม่ต้องปันส่วน',
    color: 'var(--mui-palette-primary-main)',
    accent: 'primary',
  },
  allocated: {
    label: 'ต้องปันส่วนลงหลักสูตร',
    hint: 'งบส่วนกลางคณะและค่าเสื่อมครุภัณฑ์ ผูกถึงแค่ระดับคณะ — ยอดที่ลงแต่ละหลักสูตรขึ้นกับเกณฑ์ปันส่วนที่เลือก',
    color: 'var(--mui-palette-warning-main)',
    accent: 'warning',
  },
  charge: {
    label: 'หักตามอัตราต่อหัว',
    hint: 'อัตรา × จำนวนนิสิต ตามประกาศมหาวิทยาลัย — คณะกำหนดอัตราเองไม่ได้ ขยับตามจำนวนนิสิตอย่างเดียว',
    color: 'var(--mui-palette-info-main)',
    accent: 'info',
  },
};

export const ORIGIN_ORDER: CostOrigin[] = ['direct', 'allocated', 'charge'];

export interface CostPart {
  key: string;
  label: string;
  /** คงที่/ผันแปร — ใช้คู่กับ origin เพื่อบอกว่าก้อนนี้ขยับตามจำนวนนิสิตไหม */
  behaviour: 'TFC' | 'TVC';
  origin: CostOrigin;
  /** ที่มาของตัวเลข — ใช้ตอบที่ประชุมว่าเลขก้อนนี้ดึงมาจากไหน */
  source: string;
  color: string;
  of: (p: ProgRow) => number;
}

export const COST_PARTS: CostPart[] = [
  {
    key: 'tfcProg',
    label: 'ต้นทุนคงที่ทางตรงของหลักสูตร',
    behaviour: 'TFC',
    origin: 'direct',
    source: 'ERP — รายการที่ผูกรหัสหลักสูตรไว้แล้ว',
    color: 'var(--mui-palette-primary-dark)',
    of: (p) => p.tfcProg,
  },
  {
    key: 'tvcProg',
    label: 'ต้นทุนผันแปรทางตรงของหลักสูตร',
    behaviour: 'TVC',
    origin: 'direct',
    source: 'ERP — รายการที่ผูกรหัสหลักสูตรไว้แล้ว',
    color: 'var(--mui-palette-primary-main)',
    of: (p) => p.tvcProg,
  },
  {
    key: 'tfcOffice',
    label: 'งบสำนักงาน/ส่วนกลางคณะ (คงที่)',
    behaviour: 'TFC',
    origin: 'allocated',
    source: 'ERP — ผูกถึงระดับคณะ ยังไม่ถึงหลักสูตร',
    color: 'var(--mui-palette-warning-dark)',
    of: (p) => p.tfcOffice,
  },
  {
    key: 'tvcOffice',
    label: 'งบสำนักงาน/ส่วนกลางคณะ (ผันแปร)',
    behaviour: 'TVC',
    origin: 'allocated',
    source: 'ERP — ผูกถึงระดับคณะ ยังไม่ถึงหลักสูตร',
    color: 'var(--mui-palette-warning-main)',
    of: (p) => p.tvcOffice,
  },
  {
    key: 'dep',
    label: 'ค่าเสื่อมราคา — เฉพาะครุภัณฑ์',
    behaviour: 'TFC',
    origin: 'allocated',
    source: 'กองคลัง — ทะเบียนครุภัณฑ์',
    color: 'var(--mui-palette-warning-light)',
    of: (p) => p.dep,
  },
  {
    key: 'genEd',
    label: 'ค่าใช้จ่ายวิชาศึกษาทั่วไป (GE)',
    behaviour: 'TVC',
    origin: 'charge',
    source: 'ประกาศอัตรา × จำนวนนิสิต (FR-10)',
    color: 'var(--mui-palette-info-dark)',
    of: (p) => p.genEd,
  },
  {
    key: 'matchMain',
    label: 'เงินสมทบค่าธรรมเนียมรายการหลัก',
    behaviour: 'TVC',
    origin: 'charge',
    source: 'ประกาศอัตรา × จำนวนนิสิต (FR-11)',
    color: 'var(--mui-palette-info-main)',
    of: (p) => p.matchMain,
  },
  {
    key: 'matchUni',
    label: 'เงินสมทบมหาวิทยาลัย',
    behaviour: 'TVC',
    origin: 'charge',
    source: 'ประกาศอัตรา × จำนวนนิสิต (FR-12)',
    color: 'var(--mui-palette-info-light)',
    of: (p) => p.matchUni,
  },
];

export interface PartAmount extends CostPart {
  amount: number;
}

export interface CostComposition {
  parts: PartAmount[];
  /** ยอดรวมแต่ละกลุ่มที่มา — ผลรวมทั้งสามกลุ่มเท่ากับ total เสมอ */
  byOrigin: Record<CostOrigin, number>;
  total: number;
}

/** แตกองค์ประกอบต้นทุนของหลักสูตรกลุ่มหนึ่ง — ใช้ได้ทั้งระดับคณะและระดับมหาวิทยาลัย */
export const composeCost = (progs: readonly ProgRow[]): CostComposition => {
  const parts = COST_PARTS.map((part) => ({
    ...part,
    amount: progs.reduce((sum, p) => sum + part.of(p), 0),
  }));

  const byOrigin = ORIGIN_ORDER.reduce(
    (acc, origin) => ({
      ...acc,
      [origin]: parts.filter((p) => p.origin === origin).reduce((s, p) => s + p.amount, 0),
    }),
    {} as Record<CostOrigin, number>,
  );

  return { parts, byOrigin, total: parts.reduce((s, p) => s + p.amount, 0) };
};
