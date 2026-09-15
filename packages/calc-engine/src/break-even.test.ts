import { describe, expect, it } from 'vitest';
import { calcBreakEven, calcBreakEvenBothModes, totalRevenue } from './break-even';
import { DEFAULT_POLICY } from './policy';
import type { BreakEvenInput } from './types';

const base: Omit<BreakEvenInput, 'revenueMode'> = {
  q: 100,
  governmentBudget: 500_000,
  incomeBudget: 800_000,
  tfc: 1_000_000,
  tvc: 10_316,
};

const withGov = (over: Partial<BreakEvenInput> = {}): BreakEvenInput => ({
  ...base,
  revenueMode: 'with_government',
  ...over,
});

describe('totalRevenue — สูตร 5a/5b', () => {
  it('รวมเงินแผ่นดิน = งบแผ่นดิน + งบเงินรายได้', () => {
    expect(totalRevenue(500_000, 800_000, 'with_government')).toBe(1_300_000);
  });

  it('ไม่รวมเงินแผ่นดิน = งบเงินรายได้อย่างเดียว', () => {
    expect(totalRevenue(500_000, 800_000, 'without_government')).toBe(800_000);
  });
});

describe('calcBreakEven — สูตร 2 และการคำนวณต่อหัว', () => {
  it('TC = TFC + TVC', () => {
    const out = calcBreakEven(withGov());
    expect(out.tc).toBe(1_010_316);
  });

  it('R · AVC · ATC · CM ต่อหัว', () => {
    const out = calcBreakEven(withGov());
    expect(out.r).toBe(13_000);
    expect(out.avc).toBeCloseTo(103.16, 2);
    expect(out.atc).toBeCloseTo(10_103.16, 2);
    expect(out.cm as number).toBeCloseTo(12_896.84, 2);
  });

  it('ไม่มีนิสิต → ค่าต่อหัวเป็น null ทั้งหมด ไม่ใช่ 0 แบบ prototype เดิม', () => {
    const out = calcBreakEven(withGov({ q: 0 }));
    expect(out.r).toBeNull();
    expect(out.avc).toBeNull();
    expect(out.atc).toBeNull();
    expect(out.cm).toBeNull();
    expect(out.qStar).toBeNull();
    expect(out.qStarStatus).toBe('not_computable');
    // แต่ยอดรวมยังคำนวณได้ตามปกติ
    expect(out.tc).toBe(1_010_316);
    expect(out.profit).toBe(289_684);
  });
});

describe('calcBreakEven — สูตร 3 และกำไร %', () => {
  it('π = TR − TC', () => {
    expect(calcBreakEven(withGov()).profit).toBe(289_684);
  });

  it('profit_pct_basis = TC (ค่าเริ่มต้น) → หารด้วยต้นทุนรวม', () => {
    const out = calcBreakEven(withGov());
    expect(out.profitPct as number).toBeCloseTo((289_684 / 1_010_316) * 100, 6);
  });

  it('profit_pct_basis = TR → หารด้วยรายได้รวม ได้คนละค่า', () => {
    const out = calcBreakEven(withGov(), { ...DEFAULT_POLICY, profitPctBasis: 'TR' });
    expect(out.profitPct as number).toBeCloseTo((289_684 / 1_300_000) * 100, 6);
    expect(out.profitPct).not.toBe(calcBreakEven(withGov()).profitPct);
  });

  it('ตัวหารเป็น 0 → null ไม่ใช่ Infinity', () => {
    const out = calcBreakEven(
      withGov({ tfc: 0, tvc: 0, governmentBudget: 0, incomeBudget: 0 }),
      DEFAULT_POLICY,
    );
    expect(out.profitPct).toBeNull();
  });
});

describe('calcBreakEven — สูตร 4 (BE Revenue และ MoS)', () => {
  it('BE Revenue = Q* × R และ MoS = TR − BE Revenue', () => {
    const out = calcBreakEven(withGov());
    const qStar = out.qStar as number;
    expect(out.breakEvenRevenue as number).toBeCloseTo(qStar * 13_000, 6);
    expect(out.marginOfSafety as number).toBeCloseTo(1_300_000 - qStar * 13_000, 6);
  });

  it('หา Q* ไม่ได้ → BE Revenue และ MoS เป็น null ไม่ใช่ 0', () => {
    // prototype เดิมใช้ MoS = TR − (beRev || 0) ทำให้ MoS = TR เมื่อไม่มี Q*
    const out = calcBreakEven(withGov({ q: 0 }));
    expect(out.breakEvenRevenue).toBeNull();
    expect(out.marginOfSafety).toBeNull();
  });
});

describe('calcBreakEvenBothModes', () => {
  const both = calcBreakEvenBothModes(base);

  it('คำนวณครบทั้ง 2 ฐานรายได้ในครั้งเดียว', () => {
    expect(both.with_government.tr).toBe(1_300_000);
    expect(both.without_government.tr).toBe(800_000);
  });

  it('ฝั่งต้นทุนเหมือนกันทุกประการ', () => {
    expect(both.with_government.tfc).toBe(both.without_government.tfc);
    expect(both.with_government.tvc).toBe(both.without_government.tvc);
    expect(both.with_government.avc).toBe(both.without_government.avc);
    expect(both.with_government.atc).toBe(both.without_government.atc);
  });

  it('ตัดงบแผ่นดินออกแล้ว Q* ต้องสูงขึ้นเสมอ (CM ลดลง)', () => {
    expect(both.without_government.qStar as number).toBeGreaterThan(
      both.with_government.qStar as number,
    );
  });
});
