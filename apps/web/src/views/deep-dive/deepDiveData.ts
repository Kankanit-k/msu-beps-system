/**
 * ข้อมูลย้อนหลัง 5 ปีรายหลักสูตร สำหรับหมวดเจาะลึกจุดคุ้มทุน (แผน PLAN-2026-10-25-deep-dive.html)
 *
 * ที่มีจริงตอนนี้:
 *   • ค่าเทอม (ยอดเรียกเก็บจริง) + นิสิต ปีการศึกษา 2564–2568 — ระบบทะเบียน (tuitionHistory.ts)
 *   • ต้นทุน · เงินแผ่นดิน · ส่วนเกิน/ขาดทุน — เฉพาะปีงบ 2568 (ชีตจุดคุ้มทุน = RAW)
 * ปีที่ยังไม่มีข้อมูลเป็น null เสมอ — ห้ามเติมตัวเลขประมาณ (มติแผน ข้อ 10-Q2)
 * ปีงบ N จับคู่กับปีการศึกษา N แบบเดียวกับชีต (ข้อ 10-Q3)
 */
import type { RevenueMode } from '@beps/calc-engine';

import { RAW } from '@/data/mockup';
import type { ProgRow } from '@/data/mockup';
import { FIXED_CATS, VARIABLE_CATS } from '@/data/mockup/programCostCats';
import { computeBreakEven, levelRank } from '@views/breakeven/calc';
import { blockFromProgram } from '@views/scenario-program/newProgramCalc';
import { historyFor } from '@views/tuition/historyData';

/** ปีที่แสดง — 5 ปีล่าสุด */
export const DD_YEARS = [2564, 2565, 2566, 2567, 2568] as const;
export const DD_LAST = DD_YEARS[DD_YEARS.length - 1]!;

/** ปีงบที่มีข้อมูลต้นทุน/จุดคุ้มทุนแล้ว — เพิ่มเมื่อนำเข้างบประมาณปีอื่น (DD-4) */
export const COST_YEARS: readonly number[] = [2568];

/** ขาดทุนติดต่อกันตั้งแต่กี่ปี = วิกฤต (ข้อ 10-Q5) */
export const CRISIS_STREAK = 3;

/** หมวดเกินสัดส่วนนี้ของต้นทุนหลักสูตร = ต้นทุนกองอยู่ที่หมวดนั้น */
export const DRIVER_SHARE = 0.5;

/** ต้นทุนต่อหัวเกินค่ากลางของคณะ×ระดับ กี่เท่า = สูงผิดปกติ */
export const PER_HEAD_ALERT = 1.5;

export type Series = (number | null)[];

/** หมวดค่าใช้จ่ายตามผังบัญชี (รวมขาคงที่ + ผันแปรของรหัสเดียวกัน) + รายการปันที่ไม่ใช่หมวดรายจ่าย */
export interface CostCat {
  code: string;
  name: string;
}

const codeOf = (c: string) => c.split(':')[0]!;
const nameOf = (c: string) => c.split(':')[1]!;

export const COST_CAT_LIST: CostCat[] = [
  ...[...new Set([...FIXED_CATS, ...VARIABLE_CATS])]
    .sort((a, b) => Number(codeOf(a)) - Number(codeOf(b)))
    .map((c) => ({ code: codeOf(c), name: nameOf(c) })),
  { code: 'dep', name: 'ค่าเสื่อมราคา' },
  { code: 'share', name: 'GE + เงินสมทบ' },
];

export const catLabel = (c: CostCat) => (/^\d+$/.test(c.code) ? `${c.name} (${c.code})` : c.name);

export interface YearCost {
  tfc: number;
  tvc: number;
  /** ยอดรายหมวด ตามลำดับ COST_CAT_LIST (แท็บ 4 ของชีต) */
  cats: number[];
  /** ผลรวมรายหมวด (อาจต่างจาก TC ของแท็บ 3 เล็กน้อย) */
  catTotal: number;
}

export interface DDProgram {
  key: string;
  p: ProgRow;
  /** ค่าเทอมเรียกเก็บจริง (บาท) ต่อปี */
  tuition: Series;
  /** นิสิตภาค 1 ต่อปี (ทะเบียน) */
  students: Series;
  /** เงินแผ่นดินต่อปี */
  gov: Series;
  /** ต้นทุนรวม (TC แท็บ 3) ต่อปี */
  tc: Series;
  cost: (YearCost | null)[];
  /** รายได้รวมแบบชีต (แท็บ 3) ตามฐานรายได้ */
  revenue: Record<RevenueMode, Series>;
  /** ส่วนเกิน/ขาดทุน ตามฐานรายได้ */
  profit: Record<RevenueMode, Series>;
}

export const ddKey = (p: Pick<ProgRow, 'fac' | 'lvl' | 'prog'>) => `${p.fac}|${p.lvl}|${p.prog}`;

const yearCost = (p: ProgRow): YearCost => {
  const b = blockFromProgram(p);
  const byCode = new Map<string, number>();

  FIXED_CATS.forEach((c, i) =>
    byCode.set(codeOf(c), (byCode.get(codeOf(c)) ?? 0) + (b.fix[i] ?? 0)),
  );
  VARIABLE_CATS.forEach((c, i) =>
    byCode.set(codeOf(c), (byCode.get(codeOf(c)) ?? 0) + (b.var[i] ?? 0)),
  );
  byCode.set('dep', b.dep);
  byCode.set('share', b.genEd + b.mainFee + b.uniShare);

  const cats = COST_CAT_LIST.map((c) => byCode.get(c.code) ?? 0);

  return { tfc: p.TFC, tvc: p.TVC, cats, catTotal: cats.reduce((a, v) => a + v, 0) };
};

/** ทะเบียนเก็บปีที่หลักสูตรยังไม่เปิดเป็น 0 — ศูนย์ก่อนปีแรกที่มีตัวเลข = ยังไม่มีหลักสูตร (null) */
const leadingZeroToNull = (s: Series): Series => {
  const first = s.findIndex((v) => v !== null && v !== 0);

  return first < 0 ? s.map(() => null) : s.map((v, i) => (i < first ? null : v));
};

const build = (p: ProgRow): DDProgram => {
  const h = historyFor(p);
  const hy = (y: number) => h?.years.find((t) => t.y === y);
  const has = (y: number) => COST_YEARS.includes(y);
  const res = {
    with_government: computeBreakEven(p, 'with_government'),
    without_government: computeBreakEven(p, 'without_government'),
  };

  return {
    key: ddKey(p),
    p,
    tuition: leadingZeroToNull(DD_YEARS.map((y) => hy(y)?.billed ?? null)),
    students: leadingZeroToNull(DD_YEARS.map((y) => hy(y)?.n ?? null)),
    gov: DD_YEARS.map((y) => (has(y) ? p.st : null)),
    tc: DD_YEARS.map((y) => (has(y) ? p.TC : null)),
    cost: DD_YEARS.map((y) => (has(y) ? yearCost(p) : null)),
    revenue: {
      with_government: DD_YEARS.map((y) => (has(y) ? res.with_government.tr : null)),
      without_government: DD_YEARS.map((y) => (has(y) ? res.without_government.tr : null)),
    },
    profit: {
      with_government: DD_YEARS.map((y) => (has(y) ? res.with_government.profit : null)),
      without_government: DD_YEARS.map((y) => (has(y) ? res.without_government.profit : null)),
    },
  };
};

/** ทุกหลักสูตรที่มีนิสิตในปีล่าสุด หรือมีประวัติค่าเทอม */
export const DD_PROGRAMS: DDProgram[] = RAW.PROGS.filter((p) => p.Q > 0 || historyFor(p))
  .sort((a, b) => levelRank(a.lvl) - levelRank(b.lvl) || b.Q - a.Q)
  .map(build);

/* ---------------- สถานะ / ตัวชี้วัด ---------------- */

/** จำนวนปีที่มีตัวเลข */
export const yearsWithData = (s: Series) => s.filter((v) => v !== null).length;

/** ค่าปีล่าสุดที่มีตัวเลข */
export const lastValue = (s: Series) => [...s].reverse().find((v) => v !== null) ?? null;

/** ขาดทุนติดต่อกันนับถอยจากปีล่าสุดที่มีข้อมูล — หยุดเมื่อเจอปีกำไรหรือปีไม่มีข้อมูล */
export const lossStreak = (s: Series) => {
  const xs = [...s];

  while (xs.length && xs[xs.length - 1] === null) xs.pop();
  let n = 0;

  for (let i = xs.length - 1; i >= 0; i--) {
    const v = xs[i];

    if (v === null || v === undefined || v >= 0) break;
    n++;
  }

  return n;
};

/** ขาดทุนสะสม (ผลบวกปีที่ติดลบ) — คืนค่าบวก */
export const cumulativeLoss = (s: Series) =>
  s.reduce<number>((a, v) => a + (v !== null && v < 0 ? -v : 0), 0);

/** ลดลงต่อเนื่อง n ปีล่าสุด (ต้องมีตัวเลขครบ n+1 ปี) */
export const decliningYears = (s: Series, n = 3) => {
  const xs = s.filter((v): v is number => v !== null);

  if (xs.length < n + 1) return false;
  const tail = xs.slice(-(n + 1));

  return tail.every((v, i) => i === 0 || v < tail[i - 1]!);
};

/** % เปลี่ยนจากปีแรกที่มีข้อมูล → ปีล่าสุด */
export const changePct = (s: Series): number | null => {
  const xs = s.filter((v): v is number => v !== null);

  if (xs.length < 2 || !xs[0]) return null;

  return ((xs[xs.length - 1]! - xs[0]) / Math.abs(xs[0])) * 100;
};

export type DDStatus = 'crisis' | 'watch' | 'ok' | 'nodata';

export const DD_STATUS_META: Record<
  DDStatus,
  { label: string; color: 'error' | 'warning' | 'success' | 'default' }
> = {
  crisis: { label: 'วิกฤต', color: 'error' },
  watch: { label: 'เฝ้าระวัง', color: 'warning' },
  ok: { label: 'คุ้มทุน', color: 'success' },
  nodata: { label: 'ไม่มีข้อมูล', color: 'default' },
};

/**
 * วิกฤต = ขาดทุนติดต่อกัน ≥ 3 ปี · เฝ้าระวัง = ขาดทุน 1–2 ปีล่าสุด หรือค่าเทอมลดลงต่อเนื่อง 3 ปี
 * คุ้มทุน = ปีล่าสุดไม่ขาดทุน · ข้อมูลต้นทุนยังมีปีเดียว → ยังไม่มีหลักสูตรใดถึงเกณฑ์วิกฤตได้
 */
export const statusOfDD = (x: DDProgram, mode: RevenueMode): DDStatus => {
  const s = x.profit[mode];
  const streak = lossStreak(s);

  if (streak >= CRISIS_STREAK) return 'crisis';
  if (streak > 0 || decliningYears(x.tuition)) return 'watch';
  if (lastValue(s) === null) return 'nodata';

  return 'ok';
};

/** รวมหลายหลักสูตรเป็นอนุกรมเดียว — ปีที่ทุกหลักสูตรไม่มีข้อมูล = null */
export const sumSeries = (rows: Series[]): Series =>
  DD_YEARS.map((_, i) => {
    const vs = rows.map((r) => r[i]).filter((v): v is number => v !== null && v !== undefined);

    return vs.length ? vs.reduce((a, v) => a + v, 0) : null;
  });

/** ค่ากลาง (median) */
export const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);

  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/** หมวดที่ใหญ่สุดของปีล่าสุดที่มีต้นทุน */
export const topCategory = (x: DDProgram) => {
  const c = [...x.cost].reverse().find((v) => v !== null);

  if (!c || !c.catTotal) return null;
  let best = 0;

  c.cats.forEach((v, i) => {
    if (v > c.cats[best]!) best = i;
  });

  return { cat: COST_CAT_LIST[best]!, value: c.cats[best]!, share: c.cats[best]! / c.catTotal };
};
