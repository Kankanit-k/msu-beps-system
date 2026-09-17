/**
 * Golden test — ตัวเลขอ้างอิงจาก prototype **v8** (`msu-beps.vercel.app`)
 * ซึ่งสร้างจากไฟล์ `20260711_จุดคุ้มทุน update.xlsx`
 *
 * ห้ามใช้ตัวเลขจาก `MSU-BEPS_03June26-1.html` เป็นค่าอ้างอิง — TC ต่างกัน 762.8 ลบ.
 * เพราะรุ่นนั้นยังไม่นับค่าธรรมเนียมรายหัวและการปันส่วนต้นทุนสำนักงานฝั่งผันแปร
 * (TVC 263.6 ลบ. เทียบกับ 927.2 ลบ. ใน v8)
 *
 * ค่าที่ยืนยันแล้วว่า v8 ใช้ `ceil`: ตรวจ 268 แถวทุกชั้น พบว่าตรงกับ `ceil` ทั้งหมด
 * และมี 144 แถวที่ตรงกับ `ceil` เท่านั้น ไม่มีแถวใดตรงกับ `round` อย่างเดียว
 *
 * ยังไม่มีเทสต์ระดับหลักสูตรแบบครบชุด เพราะรอ **ข้อตัดสินใจ A** (ข้อมูลระดับหลักสูตร
 * เป็นข้อมูลจริงหรือปันส่วนตามหัวนิสิต) — ดู TODO.md
 */

import { describe, expect, it } from 'vitest';
import { calcBreakEven, calcBreakEvenBothModes } from './break-even';
import { aggregateBreakEven } from './aggregate';
import { DEFAULT_POLICY } from './policy';
import type { CalcPolicy } from './policy';
import type { BreakEvenInput } from './types';

/** ระดับมหาวิทยาลัย — RAW.UNI ของ v8 */
const UNI = {
  q: 48_695,
  governmentBudget: 690_037_981.06,
  incomeBudget: 1_758_648_800.0,
  tfc: 1_488_630_486.24,
  tvc: 927_207_033.2,
} as const;

/** คณะการบัญชีและการจัดการ — RAW.FACS[0] */
const ACC = {
  q: 10_212,
  governmentBudget: 39_089_629.92,
  incomeBudget: 379_234_000.0,
  tfc: 134_517_277.0,
  tvc: 198_696_684.98,
} as const;

/** คณะแพทยศาสตร์ — คณะที่ขาดทุนหนักที่สุด */
const MED = {
  q: 787,
  governmentBudget: 47_549_178.64,
  incomeBudget: 48_996_000.0,
  tfc: 204_455_940.16,
  tvc: 37_355_920.99,
} as const;

const withGov = (base: Omit<BreakEvenInput, 'revenueMode'>): BreakEvenInput => ({
  ...base,
  revenueMode: 'with_government',
});

describe('golden — ระดับมหาวิทยาลัย (v8)', () => {
  const both = calcBreakEvenBothModes(UNI);

  it('ฐานรวมเงินแผ่นดิน: TR · TC · R · Q* ตรงกับ v8', () => {
    const g = both.with_government;
    expect(g.tr).toBeCloseTo(2_448_686_781.06, 2);
    expect(g.tc).toBeCloseTo(2_415_837_519.44, 2);
    expect(g.r as number).toBeCloseTo(50_286.21, 2);
    expect(g.avc as number).toBeCloseTo(19_041.11, 2);
    expect(g.qStar).toBe(47_644);
    expect(g.qStarStatus).toBe('normal');
  });

  it('ฐานไม่รวมเงินแผ่นดิน: R และ Q* ตรงกับ v8', () => {
    const e = both.without_government;
    expect(e.tr).toBeCloseTo(1_758_648_800.0, 2);
    expect(e.r as number).toBeCloseTo(36_115.59, 2);
    expect(e.qStar).toBe(87_185);
  });

  it('ต้นทุนเท่ากันทั้ง 2 ฐาน — เปลี่ยนเฉพาะฝั่งรายได้ (สูตร 5a/5b)', () => {
    expect(both.with_government.tc).toBe(both.without_government.tc);
    expect(both.with_government.avc).toBe(both.without_government.avc);
    expect(both.with_government.tfc).toBe(both.without_government.tfc);
  });

  it('ส่วนเกิน +32.8 ลบ. และสัดส่วน TFC 61.6%', () => {
    const g = both.with_government;
    expect(g.profit / 1e6).toBeCloseTo(32.8, 1);
    expect((g.tfc / g.tc) * 100).toBeCloseTo(61.6, 1);
  });

  it('BE Revenue และ MoS — สูตรที่ 4', () => {
    const g = both.with_government;
    expect(g.breakEvenRevenue as number).toBeCloseTo(47_644 * (g.r as number), 2);
    expect(g.marginOfSafety as number).toBeCloseTo(g.tr - (g.breakEvenRevenue as number), 2);
    expect(g.marginOfSafety as number).toBeGreaterThan(0);
  });
});

describe('golden — ระดับคณะ (v8)', () => {
  it('คณะการบัญชีฯ ทั้ง 2 ฐาน', () => {
    const both = calcBreakEvenBothModes(ACC);
    expect(both.with_government.r as number).toBeCloseTo(40_963.93, 2);
    expect(both.with_government.qStar).toBe(6_255);
    expect(both.without_government.r as number).toBeCloseTo(37_136.11, 2);
    expect(both.without_government.qStar).toBe(7_609);
  });

  it('คณะแพทยศาสตร์ — ขาดทุน แต่ CM ยังเป็นบวก จึงมีจุดคุ้มทุน', () => {
    const g = calcBreakEven(withGov(MED));
    expect(g.r as number).toBeCloseTo(122_674.94, 2);
    expect(g.avc as number).toBeCloseTo(47_466.23, 2);
    expect(g.qStar).toBe(2_719);
    expect(g.qStarStatus).toBe('normal');
    expect(g.profit / 1e6).toBeCloseTo(-145.3, 1);
    // นิสิตจริง 787 คน ต่ำกว่าจุดคุ้มทุน 2,719 คน → MoS ต้องติดลบ
    expect(g.marginOfSafety as number).toBeLessThan(0);
  });
});

describe('golden — หลักสูตรที่ CM ≤ 0 (สูตรที่ 7)', () => {
  /** เคมี ปริญญาโท คณะวิทยาศาสตร์ — นิสิต 1 คน AVC 655,517 บ./คน */
  const CHEM: Omit<BreakEvenInput, 'revenueMode'> = {
    q: 1,
    governmentBudget: 43_311.35,
    incomeBudget: 50_000.0,
    tfc: 1_508_086.44,
    tvc: 655_517.31,
  };

  it('ค่าตั้งต่างกัน → ผลต่างกัน และทั้งคู่ไม่ใช่ normal', () => {
    const cases: ReadonlyArray<[Partial<CalcPolicy>, number | null, string]> = [
      [{}, 24, 'full_cost_recovery'],
      [{ qStarRounding: 'round' }, 23, 'full_cost_recovery'],
      [{ cmLeZeroPolicy: 'not_computable' }, null, 'not_computable'],
    ];
    for (const [over, qStar, status] of cases) {
      const out = calcBreakEven(withGov(CHEM), { ...DEFAULT_POLICY, ...over });
      expect(out.qStar).toBe(qStar);
      expect(out.qStarStatus).toBe(status);
    }
  });

  it('TC และ CM ตรงกับ v8', () => {
    const out = calcBreakEven(withGov(CHEM));
    expect(out.tc).toBeCloseTo(2_163_603.75, 2);
    expect(out.r as number).toBeCloseTo(93_311.35, 2);
    expect(out.cm as number).toBeLessThan(0);
  });
});

describe('golden — สูตร 6a/6b (คณะสัตวแพทยศาสตร์ · ข้อมูลจริงครบทั้ง 5 หลักสูตร)', () => {
  /** RAW.PROGS ที่ `fac === 'คณะสัตวแพทยศาสตร์'` — Q* รายหลักสูตรของ v8 กำกับไว้ท้ายบรรทัด */
  const VET_PROGRAMS = [
    {
      q: 289,
      governmentBudget: 15_464_231.0,
      incomeBudget: 21_964_000.0,
      tfc: 28_809_260.32,
      tvc: 5_597_389.32,
    }, // 262
    {
      q: 106,
      governmentBudget: 5_672_001.68,
      incomeBudget: 5_300_000.0,
      tfc: 9_547_089.77,
      tvc: 2_087_499.2,
    }, // 114
    {
      q: 99,
      governmentBudget: 5_297_435.53,
      incomeBudget: 4_950_000.0,
      tfc: 8_916_621.58,
      tvc: 1_949_645.48,
    }, // 107
    { q: 4, governmentBudget: 214_037.8, incomeBudget: 400_000.0, tfc: 168_493.54, tvc: 65_080.0 }, // 2
    { q: 1, governmentBudget: 53_509.45, incomeBudget: 64_000.0, tfc: 24_727.78, tvc: 15_670.0 }, // 1
  ] as const;

  const children = VET_PROGRAMS.map((c) => calcBreakEven(withGov({ ...c })));

  it('Q* รายหลักสูตรตรงกับ v8 ทั้ง 5 หลักสูตร', () => {
    expect(children.map((c) => c.qStar)).toEqual([262, 114, 107, 2, 1]);
  });

  it('ยอดรวมของหน่วยย่อยตรงกับยอดของคณะใน RAW.FACS พอดี', () => {
    const agg = aggregateBreakEven(children, 'faculty');
    expect(agg.q).toBe(499);
    expect(agg.tfc).toBeCloseTo(47_466_192.99, 2);
    expect(agg.tvc).toBeCloseTo(9_715_284.0, 2);
    expect(agg.tc).toBeCloseTo(57_181_476.99, 2);
    expect(agg.r as number).toBeCloseTo(118_996.42, 2);
    expect(agg.avc as number).toBeCloseTo(19_469.51, 2);
  });

  it('6a = 486 (Σ รายหลักสูตร) · 6b = 477 (pooled) — ต่างกัน 9 คน', () => {
    const agg = aggregateBreakEven(children, 'faculty');
    expect(agg.qStarByMethod.sum_of_programs.qStar).toBe(486);
    expect(agg.qStarByMethod.pooled.qStar).toBe(477);
    // 477 คือค่าที่ v8 เก็บไว้ใน RAW.FACS — ยืนยันว่า v8 ใช้วิธี pooled ทุกชั้น
  });

  it('qStar หลักเปลี่ยนตามค่าตั้ง qstar_primary_method แต่ยอดรวมไม่เปลี่ยน', () => {
    const a = aggregateBreakEven(children, 'faculty', DEFAULT_POLICY);
    const b = aggregateBreakEven(children, 'faculty', {
      ...DEFAULT_POLICY,
      qStarPrimaryMethod: 'pooled',
    });
    expect(a.qStar).toBe(486);
    expect(b.qStar).toBe(477);
    expect(a.tc).toBe(b.tc);
    expect(a.tr).toBe(b.tr);
  });
});
