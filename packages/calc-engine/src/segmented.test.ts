import { describe, expect, it } from 'vitest';

import { calcBreakEven } from './break-even';
import { DEFAULT_POLICY } from './policy';
import { calcSegmentedBreakEven, distributeHeads, segmentRevenuePerHead } from './segmented';
import type { StudentSegmentInput } from './segmented';

const seg = (o: Partial<StudentSegmentInput> & { key: string }): StudentSegmentInput => ({
  label: o.key,
  share: 0,
  feePerHead: 0,
  governmentPerHead: 0,
  avc: 0,
  ...o,
});

describe('distributeHeads', () => {
  it('รวมได้เท่ากับยอดรวมเสมอ แม้สัดส่วนหารไม่ลงตัว', () => {
    const heads = distributeHeads(100, [1 / 3, 1 / 3, 1 / 3]);

    expect(heads.reduce((a, b) => a + b, 0)).toBe(100);
    expect(heads).toEqual([34, 33, 33]);
  });

  it('ใช้สัดส่วนที่ไม่ได้รวมเป็น 100 ได้ (normalize ให้เอง)', () => {
    expect(distributeHeads(120, [60, 30, 10])).toEqual([72, 36, 12]);
  });

  it('ยอดรวม 0 หรือสัดส่วนว่าง → ศูนย์ทั้งแถว ไม่ใช่ NaN', () => {
    expect(distributeHeads(0, [50, 50])).toEqual([0, 0]);
    expect(distributeHeads(100, [0, 0])).toEqual([0, 0]);
  });
});

describe('segmentRevenuePerHead', () => {
  const s = seg({ key: 'x', feePerHead: 20000, governmentPerHead: 8000 });

  it('รวมเงินแผ่นดิน = ค่าธรรมเนียม + เงินอุดหนุน', () => {
    expect(segmentRevenuePerHead(s, 'with_government')).toBe(28000);
  });

  it('ไม่รวมเงินแผ่นดิน = ค่าธรรมเนียมอย่างเดียว', () => {
    expect(segmentRevenuePerHead(s, 'without_government')).toBe(20000);
  });
});

describe('calcSegmentedBreakEven', () => {
  it('กลุ่มเดียว ให้ผลตรงกับสูตร 1 เดิม (Q* = TFC / CM)', () => {
    const r = calcSegmentedBreakEven({
      segments: [seg({ key: 'thaiRegular', share: 100, feePerHead: 30000, avc: 12000 })],
      tfc: 1_800_000,
      revenueMode: 'without_government',
    });

    // CM = 30000 − 12000 = 18000 → Q* = 1,800,000 / 18,000 = 100
    expect(r.weightedCm).toBe(18000);
    expect(r.qStar).toBe(100);
    expect(r.qStarStatus).toBe('normal');
    expect(r.segments[0]?.heads).toBe(100);
  });

  it('สองกลุ่มอัตราต่างกัน ใช้ CM ถัวเฉลี่ยถ่วงน้ำหนัก ไม่ใช่ค่าเฉลี่ยธรรมดา', () => {
    const r = calcSegmentedBreakEven({
      segments: [
        seg({ key: 'thaiRegular', share: 70, feePerHead: 20000, avc: 10000 }),
        seg({ key: 'thaiSpecial', share: 30, feePerHead: 50000, avc: 12000 }),
      ],
      tfc: 2_000_000,
      revenueMode: 'without_government',
    });

    // CM̄ = 0.7×10,000 + 0.3×38,000 = 18,400 → Q* = ceil(2,000,000 / 18,400) = 109
    expect(r.weightedCm).toBeCloseTo(18400, 6);
    expect(r.qStar).toBe(109);
    expect(r.segments.map((s) => s.heads)).toEqual([76, 33]);
    expect(r.segments.reduce((a, s) => a + (s.heads ?? 0), 0)).toBe(109);
  });

  it('ต่างจากการใช้รายได้เฉลี่ยรวม — พิสูจน์ว่าการแยกกลุ่มมีผลจริง', () => {
    const segments = [
      seg({ key: 'thaiRegular', share: 50, feePerHead: 15000, avc: 10000 }),
      seg({ key: 'foreignSpecial', share: 50, feePerHead: 90000, avc: 10000 }),
    ];
    const tfc = 1_000_000;

    const segmented = calcSegmentedBreakEven({ segments, tfc, revenueMode: 'without_government' });

    // แบบเดิม: เอา Q สมมติ 100 คนมาหาค่าเฉลี่ยรวมแล้วค่อยแตกยอด
    const pooled = calcBreakEven({
      q: 100,
      governmentBudget: 0,
      incomeBudget: (15000 + 90000) * 50,
      tfc,
      tvc: 10000 * 100,
      revenueMode: 'without_government',
    });

    // สัดส่วน 50/50 พอดี ค่าเฉลี่ยจึงเท่ากัน — ผลต้องตรงกัน ใช้เป็นหมุดยืนยันสูตร
    expect(segmented.qStar).toBe(pooled.qStar);

    // แต่พอเปลี่ยนสัดส่วน Q* ต้องขยับ ทั้งที่อัตราทุกกลุ่มเท่าเดิม
    const skewed = calcSegmentedBreakEven({
      segments: [
        { ...segments[0]!, share: 90 },
        { ...segments[1]!, share: 10 },
      ],
      tfc,
      revenueMode: 'without_government',
    });

    expect(skewed.qStar).toBeGreaterThan(segmented.qStar!);
  });

  it('เงินอุดหนุนรายกลุ่มนับเฉพาะโหมดรวมเงินแผ่นดิน', () => {
    const segments = [
      seg({
        key: 'thaiRegular',
        share: 100,
        feePerHead: 20000,
        governmentPerHead: 10000,
        avc: 12000,
      }),
    ];

    const withGov = calcSegmentedBreakEven({
      segments,
      tfc: 900_000,
      revenueMode: 'with_government',
    });
    const withoutGov = calcSegmentedBreakEven({
      segments,
      tfc: 900_000,
      revenueMode: 'without_government',
    });

    expect(withGov.qStar).toBe(50); // CM = 30,000 − 12,000 = 18,000
    expect(withoutGov.qStar).toBe(113); // CM = 20,000 − 12,000 = 8,000 → ceil(112.5)
  });

  it('CM ≤ 0 โดยไม่ส่ง qPlanned → not_computable (ไม่เดา TC เอง)', () => {
    const r = calcSegmentedBreakEven({
      segments: [seg({ key: 'x', share: 100, feePerHead: 10000, avc: 15000 })],
      tfc: 500_000,
      revenueMode: 'without_government',
    });

    expect(r.qStar).toBeNull();
    expect(r.qStarStatus).toBe('not_computable');
  });

  it('CM ≤ 0 พร้อม qPlanned → เดินสูตร 7 ตามนโยบายเดียวกับเครื่องคำนวณเดิม', () => {
    const r = calcSegmentedBreakEven(
      {
        segments: [seg({ key: 'x', share: 100, feePerHead: 10000, avc: 15000 })],
        tfc: 500_000,
        revenueMode: 'without_government',
        qPlanned: 100,
      },
      DEFAULT_POLICY,
    );

    // TC = 500,000 + 100×15,000 = 2,000,000 → Q* = ceil(2,000,000 / 10,000) = 200
    expect(r.qStarStatus).toBe('full_cost_recovery');
    expect(r.qStar).toBe(200);
  });

  it('ไม่มีกลุ่มที่มีสัดส่วน → คืนผลว่างแทนที่จะหารด้วยศูนย์', () => {
    const r = calcSegmentedBreakEven({
      segments: [],
      tfc: 100_000,
      revenueMode: 'with_government',
    });

    expect(r.segments).toEqual([]);
    expect(r.qStar).toBeNull();
    expect(r.weightedCm).toBeNull();
  });

  it('รายได้ ณ จุดคุ้มทุน = Σ หัว × อัตรารายกลุ่ม', () => {
    const r = calcSegmentedBreakEven({
      segments: [
        seg({ key: 'a', share: 50, feePerHead: 40000, avc: 10000 }),
        seg({ key: 'b', share: 50, feePerHead: 60000, avc: 10000 }),
      ],
      tfc: 4_000_000,
      revenueMode: 'without_government',
    });

    const expected = r.segments.reduce((a, s) => a + (s.heads ?? 0) * s.r, 0);

    expect(r.breakEvenRevenue).toBeCloseTo(expected, 6);
  });
});
