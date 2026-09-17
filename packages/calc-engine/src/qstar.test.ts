import { describe, expect, it } from 'vitest';
import { calcQStar } from './qstar';
import { DEFAULT_POLICY, roundQStar } from './policy';
import type { CalcPolicy } from './policy';

const policy = (over: Partial<CalcPolicy> = {}): CalcPolicy => ({ ...DEFAULT_POLICY, ...over });

describe('calcQStar — สูตรที่ 1 (CM > 0)', () => {
  it('คำนวณ Q* = TFC ÷ (R − AVC) แล้วปัดตามนโยบาย', () => {
    // 1,000,000 ÷ (13,000 − 3,000) = 100 พอดี
    const out = calcQStar(1_000_000, 1_300_000, 13_000, 3_000, policy());
    expect(out.qStarStatus).toBe('normal');
    expect(out.qStar).toBe(100);
  });

  it('ปัดขึ้นเสมอเมื่อ qstar_rounding = ceil — รับนิสิต 238.4 คนไม่ได้', () => {
    // TFC 2,384,000 ÷ CM 10,000 = 238.4
    expect(calcQStar(2_384_000, 9_999_999, 15_000, 5_000, policy()).qStar).toBe(239);
  });

  it('ปัดปกติเมื่อ qstar_rounding = round — ตรงกับ prototype รุ่น มิ.ย.', () => {
    expect(
      calcQStar(2_384_000, 9_999_999, 15_000, 5_000, policy({ qStarRounding: 'round' })).qStar,
    ).toBe(238);
  });

  it('ค่าที่ลงตัวพอดีต้องไม่ถูกปัดขึ้นเกินเพราะ floating point', () => {
    // 0.1 + 0.2 = 0.30000000000000004 — ถ้าไม่ลบ epsilon จะได้ 25 แทน 24
    const cm = 0.1 + 0.2;
    expect(calcQStar(24 * cm, 0, cm + 1, 1, policy()).qStar).toBe(24);
  });
});

describe('calcQStar — สูตรที่ 7 (CM ≤ 0)', () => {
  const tfc = 1_508_086.44;
  const tc = 2_163_603.75;
  const r = 93_311.35;
  const avc = 655_517.31;

  it('full_cost_recovery → Q* = TC ÷ R พร้อมสถานะที่แยกออกมาชัดเจน', () => {
    // เคมี (ปริญญาโท คณะวิทยาศาสตร์) จาก v8 — 2,163,603.75 ÷ 93,311.35 = 23.187
    const out = calcQStar(tfc, tc, r, avc, policy());
    expect(out.qStar).toBe(24);
    expect(out.qStarStatus).toBe('full_cost_recovery');
  });

  it('round ให้ 23 — เป็นตัวเลขที่หน้าสูตรของ v8 แสดง', () => {
    expect(calcQStar(tfc, tc, r, avc, policy({ qStarRounding: 'round' })).qStar).toBe(23);
  });

  it('not_computable → null ไม่ใช่ตัวเลขที่ตีความผิดได้', () => {
    const out = calcQStar(tfc, tc, r, avc, policy({ cmLeZeroPolicy: 'not_computable' }));
    expect(out.qStar).toBeNull();
    expect(out.qStarStatus).toBe('not_computable');
  });

  it('สถานะต้องไม่ใช่ normal เด็ดขาด — กรณีนี้คือกรณีแย่ที่สุด', () => {
    // prototype รุ่น มิ.ย. เขียน isOk = !Qs || Q >= Qs ทำให้กรณีนี้ขึ้น "✓ ผ่านจุดคุ้มทุน"
    for (const p of [policy(), policy({ cmLeZeroPolicy: 'not_computable' })]) {
      expect(calcQStar(tfc, tc, r, avc, p).qStarStatus).not.toBe('normal');
    }
  });

  it('CM = 0 พอดี ก็ยังเข้าเส้นทางสูตร 7 (หารด้วยศูนย์ไม่ได้)', () => {
    const out = calcQStar(1_000, 5_000, 20_000, 20_000, policy());
    expect(out.qStarStatus).toBe('full_cost_recovery');
  });
});

describe('calcQStar — กรณีคำนวณไม่ได้', () => {
  it('ไม่มีนิสิต (R และ AVC เป็น null) → not_computable', () => {
    const out = calcQStar(1_000_000, 1_000_000, null, null, policy());
    expect(out.qStar).toBeNull();
    expect(out.qStarStatus).toBe('not_computable');
  });

  it('ไม่มีรายได้เลย (R = 0) → not_computable แม้นโยบายเป็น full_cost_recovery', () => {
    expect(calcQStar(1_000_000, 1_000_000, 0, 100, policy()).qStarStatus).toBe('not_computable');
  });
});

describe('roundQStar', () => {
  it.each([
    [238.4, 'ceil', 239],
    [238.4, 'round', 238],
    [238.5, 'round', 239],
    [239, 'ceil', 239],
    [23.187, 'ceil', 24],
    [23.187, 'round', 23],
  ] as const)('%s แบบ %s → %s', (value, mode, expected) => {
    expect(roundQStar(value, mode)).toBe(expected);
  });
});
