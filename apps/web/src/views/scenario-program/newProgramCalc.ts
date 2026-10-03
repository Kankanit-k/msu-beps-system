/**
 * สูตรแท็บ "4.จุดคุ้มทุนหลักสูตร(ใหม่)" ของไฟล์ Excel จุดคุ้มทุน
 *
 * - ก้อนต้นทุน (CostBlock) = คอลัมน์ E/M (อ้างอิงหลักสูตรเดิม) หรือ T (คิดต้นทุนด้วยตัวเอง)
 *   ต้นทุนเหมือนกันทั้งกรณีรวม/ไม่รวมเงินแผ่นดิน — โหมดเปลี่ยนแค่ฐานรายได้ (มีงบเงินแผ่นดินใน TR หรือไม่)
 * - Q* = ROUNDUP(TFC / (R − AVC)) แบบชีต — ติดลบได้เมื่อ R ≤ AVC (ไม่ใช้ Full-Cost Recovery)
 * - ตารางสัดส่วนนิสิต = คอลัมน์ X:AD (ปันต้นทุนคงที่ตามสัดส่วนนิสิต · ผันแปร = AVC × จำนวน)
 */
import type { RevenueMode } from '@beps/calc-engine';

import { COST_CATS, FIXED_CATS, VARIABLE_CATS } from '@/data/mockup/programCostCats';
import type { ProgRow } from '@/data/mockup';

export { FIXED_CATS, VARIABLE_CATS };

/** ค่าธรรมเนียมรายการหลัก / หักสมทบมหาวิทยาลัย — บาท/คน/ภาค (D38, D39) */
export const MAIN_FEE_RATE = 2000;
export const UNI_SHARE_RATE = 2235;

export interface CostBlock {
  q: number;
  gov: number;
  income: number;
  /** ต้นทุนคงที่ตามลำดับ FIXED_CATS */
  fix: number[];
  dep: number;
  /** ต้นทุนผันแปรตามลำดับ VARIABLE_CATS */
  var: number[];
  genEd: number;
  mainFee: number;
  uniShare: number;
}

export const emptyBlock = (): CostBlock => ({
  q: 0,
  gov: 0,
  income: 0,
  fix: FIXED_CATS.map(() => 0),
  dep: 0,
  var: VARIABLE_CATS.map(() => 0),
  genEd: 0,
  mainFee: 0,
  uniShare: 0,
});

const progKey = (p: ProgRow) => `${p.fac}|${p.lvl}|${p.prog}`;

/** ก้อนต้นทุนจากหลักสูตรอ้างอิง (คอลัมน์ E ของแท็บ 4) */
export function blockFromProgram(p: ProgRow): CostBlock {
  const cats = COST_CATS[progKey(p)];

  return {
    q: p.Q,
    gov: p.st,
    income: p.own,
    fix: cats ? [...cats.fix] : FIXED_CATS.map(() => 0),
    dep: p.dep,
    var: cats ? [...cats.var] : VARIABLE_CATS.map(() => 0),
    genEd: p.genEd,
    mainFee: p.matchMain,
    uniShare: p.matchUni,
  };
}

/** โหมดกรอกเอง: ค่าธรรมเนียมรายการหลัก/หักสมทบ คิดจากอัตรา × Q × ภาค (T38, T39) */
export const withPerHeadCharges = (b: CostBlock, semesters: number): CostBlock => ({
  ...b,
  mainFee: MAIN_FEE_RATE * b.q * semesters,
  uniShare: UNI_SHARE_RATE * b.q * semesters,
});

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** ROUNDUP ของ Excel — ปัดออกจากศูนย์ */
const roundUp = (x: number) => Math.sign(x) * Math.ceil(Math.abs(x) - 1e-9);

export interface BlockResult {
  tr: number;
  r: number | null;
  tfc: number;
  tvc: number;
  tc: number;
  avc: number | null;
  /** null เมื่อคำนวณไม่ได้ (Q = 0 หรือ R = AVC) */
  qStar: number | null;
  beRevenue: number | null;
  diff: number | null;
}

export function blockResult(b: CostBlock, mode: RevenueMode): BlockResult {
  const tr = (mode === 'with_government' ? b.gov : 0) + b.income;
  const tfc = sum(b.fix) + b.dep;
  const tvc = sum(b.var) + b.genEd + b.mainFee + b.uniShare;
  const r = b.q > 0 ? tr / b.q : null;
  const avc = b.q > 0 ? tvc / b.q : null;
  const x = r !== null && avc !== null ? tfc / (r - avc) : NaN;
  const qStar = Number.isFinite(x) ? roundUp(x) : null;

  return {
    tr,
    r,
    tfc,
    tvc,
    tc: tfc + tvc,
    avc,
    qStar,
    beRevenue: qStar !== null && r !== null ? qStar * r : null,
    diff: qStar !== null ? b.q - qStar : null,
  };
}

/* ---------------- ตารางสัดส่วนจำนวนนิสิต (X9:AD22) ---------------- */

export interface Segment {
  label: string;
  /** จำนวนนิสิต */
  n: number;
  /** ค่าธรรมเนียม บาท/ภาค */
  fee: number;
  /** เงินแผ่นดิน บาท/ภาค */
  gov: number;
  semesters: number;
  years: number;
}

/** ชื่อกลุ่มนิสิตตามระดับ (Masterโครงสร้าง J:M) + "ต่อเนื่อง 2 ปี" เฉพาะปริญญาตรี */
export function segmentLabels(level: string): string[] {
  const [reg, ext] =
    level === 'ปริญญาโท' || level === 'ปริญญาเอก' ? ['ในเวลา', 'นอกเวลา'] : ['ปกติ', 'พิเศษ'];
  const base = [
    `${reg} (นิสิตไทย)`,
    `${ext} (นิสิตไทย)`,
    `${reg} (นิสิตต่างชาติ)`,
    `${ext} (นิสิตต่างชาติ)`,
  ];

  return level === 'ปริญญาตรี' ? [...base, 'ต่อเนื่อง 2 ปี'] : base;
}

export const defaultYears = (level: string) =>
  level === 'ปริญญาตรี' ? 4 : level === 'ปริญญาเอก' ? 3 : level === 'ปริญญาโท' ? 2 : 1;

export interface SegmentResult {
  share: number;
  /** รายรับตลอดหลักสูตรต่อคน */
  perHeadProgram: number;
  /** รายรับต่อปี ของนิสิตกลุ่มนี้ */
  revenue: number;
  tfc: number;
  tvc: number;
  profit: number;
}

export interface MixResult {
  rows: SegmentResult[];
  total: SegmentResult & { n: number };
  /** จุดคุ้มทุนตามสัดส่วนนี้ = ROUNDUP(TFC / (รายรับเฉลี่ย/คน − AVC)) */
  qStar: number | null;
}

export function mixResult(segs: Segment[], tfc: number, avc: number, mode: RevenueMode): MixResult {
  const n = sum(segs.map((s) => s.n));
  const rows = segs.map((s) => {
    const perSem = s.fee + (mode === 'with_government' ? s.gov : 0);
    const share = n ? s.n / n : 0;
    const revenue = perSem * s.n * s.semesters;
    const segTfc = tfc * share;
    const segTvc = avc * s.n;

    return {
      share,
      perHeadProgram: perSem * s.semesters * s.years,
      revenue,
      tfc: segTfc,
      tvc: segTvc,
      profit: revenue - segTfc - segTvc,
    };
  });
  const revenue = sum(rows.map((r) => r.revenue));
  const x = n ? tfc / (revenue / n - avc) : NaN;

  return {
    rows,
    total: {
      n,
      share: n ? 1 : 0,
      perHeadProgram: n ? sum(rows.map((r) => r.perHeadProgram * r.share)) : 0,
      revenue,
      tfc: n ? tfc : 0,
      tvc: sum(rows.map((r) => r.tvc)),
      profit: sum(rows.map((r) => r.profit)),
    },
    qStar: Number.isFinite(x) ? roundUp(x) : null,
  };
}
