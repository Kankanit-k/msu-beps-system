import { describe, expect, it } from 'vitest';
import { aggregateBreakEven } from './aggregate.js';
import { calcBreakEven } from './break-even.js';
import { DEFAULT_POLICY } from './policy.js';
import type { BreakEvenInput } from './types.js';

const program = (
  q: number,
  gov: number,
  income: number,
  tfc: number,
  tvc: number,
  mode: BreakEvenInput['revenueMode'] = 'with_government',
) =>
  calcBreakEven({
    q,
    governmentBudget: gov,
    incomeBudget: income,
    tfc,
    tvc,
    revenueMode: mode,
  });

const big = program(1_000, 10_000_000, 30_000_000, 12_000_000, 8_000_000);
const mid = program(200, 3_000_000, 5_000_000, 6_000_000, 2_000_000);
const small = program(50, 1_000_000, 1_500_000, 4_000_000, 600_000);

describe('aggregateBreakEven — การรวมยอด', () => {
  const agg = aggregateBreakEven([big, mid, small], 'faculty');

  it('รวม Q · TR · TFC · TVC ตรงกับผลรวมของหน่วยย่อย', () => {
    expect(agg.q).toBe(1_250);
    expect(agg.tr).toBeCloseTo(big.tr + mid.tr + small.tr, 6);
    expect(agg.tfc).toBeCloseTo(big.tfc + mid.tfc + small.tfc, 6);
    expect(agg.tvc).toBeCloseTo(big.tvc + mid.tvc + small.tvc, 6);
    expect(agg.tc).toBeCloseTo(agg.tfc + agg.tvc, 6);
  });

  it('R และ AVC คำนวณจากยอดรวม ไม่ใช่ค่าเฉลี่ยของค่าต่อหัวรายหน่วย', () => {
    expect(agg.r as number).toBeCloseTo(agg.tr / agg.q, 6);
    expect(agg.avc as number).toBeCloseTo(agg.tvc / agg.q, 6);
  });

  it('บันทึก scope และจำนวนหน่วยย่อยไว้ตรวจสอบย้อนหลังได้', () => {
    expect(agg.scope).toBe('faculty');
    expect(agg.childCount).toBe(3);
  });
});

describe('aggregateBreakEven — สูตร 6a เทียบ 6b', () => {
  const agg = aggregateBreakEven([big, mid, small], 'faculty');

  it('คืนผลทั้ง 2 วิธีเสมอ', () => {
    expect(agg.qStarByMethod.sum_of_programs.qStar).not.toBeNull();
    expect(agg.qStarByMethod.pooled.qStar).not.toBeNull();
  });

  it('sum_of_programs = ผลบวก Q* ของหน่วยย่อยพอดี', () => {
    const expected = (big.qStar as number) + (mid.qStar as number) + (small.qStar as number);
    expect(agg.qStarByMethod.sum_of_programs.qStar).toBe(expected);
  });

  it('สองวิธีให้ผลต่างกัน จึงต้องบอกเสมอว่าตัวเลขที่แสดงมาจากวิธีไหน', () => {
    expect(agg.qStarByMethod.pooled.qStar).not.toBe(agg.qStarByMethod.sum_of_programs.qStar);
  });

  /**
   * ⚠ เอกสารเดิม (SA.md สูตร 6 และหน้าสูตรของ prototype) เขียนว่า
   * "วิธีรายหลักสูตรเข้มงวดกว่าเสมอ" / "pooled ได้ Q* ต่ำกว่าความเป็นจริง"
   *
   * **ไม่จริงเสมอไป** — ชุดข้อมูลด้านล่างเป็นตัวอย่างค้าน: sum = 681 · pooled = 690
   * กลไก: หลักสูตรเล็ก (small) มี CM/หัว = 38,000 ซึ่งสูงกว่าค่าเฉลี่ยของคณะ (31,920)
   * มาก จึงต้องการนิสิตน้อยกว่าที่วิธี pooled ประเมิน ทำให้ผลรวมต่ำลง
   *
   * ในข้อมูลจริงปี 2568 ทิศทางเป็นไปตามที่เอกสารเขียน (10 คณะที่คำนวณได้ครบ
   * Σ > pooled ทุกคณะ · นิติศาสตร์เสมอกันเพราะมีหลักสูตรเดียว) แต่เป็น
   * **ลักษณะของข้อมูลชุดนี้ ไม่ใช่ทฤษฎีบท** — โค้ดจึงต้องไม่ตั้งสมมติฐานเรื่องลำดับ
   */
  it('ลำดับของสองวิธีไม่รับประกัน — มีกรณีที่ pooled สูงกว่า', () => {
    expect(agg.qStarByMethod.sum_of_programs.qStar).toBe(681);
    expect(agg.qStarByMethod.pooled.qStar).toBe(690);
  });

  it('qstar_primary_method เลือกว่าค่าไหนไปอยู่ในฟิลด์ qStar', () => {
    const pooledFirst = aggregateBreakEven([big, mid, small], 'faculty', {
      ...DEFAULT_POLICY,
      qStarPrimaryMethod: 'pooled',
    });
    expect(agg.qStarMethod).toBe('sum_of_programs');
    expect(pooledFirst.qStarMethod).toBe('pooled');
    expect(pooledFirst.qStar).toBe(pooledFirst.qStarByMethod.pooled.qStar);
  });

  it('BE Revenue ใช้ Q* ของวิธีหลัก จึงเปลี่ยนตามค่าตั้ง', () => {
    const pooledFirst = aggregateBreakEven([big, mid, small], 'faculty', {
      ...DEFAULT_POLICY,
      qStarPrimaryMethod: 'pooled',
    });
    expect(agg.breakEvenRevenue).not.toBe(pooledFirst.breakEvenRevenue);
    expect(agg.breakEvenRevenue as number).toBeCloseTo(
      (agg.qStarByMethod.sum_of_programs.qStar as number) * (agg.r as number),
      6,
    );
  });
});

describe('aggregateBreakEven — หน่วยย่อยที่หา Q* ไม่ได้', () => {
  /** หลักสูตรที่ AVC สูงกว่า R — CM ≤ 0 */
  const broken = calcBreakEven(
    {
      q: 1,
      governmentBudget: 43_311.35,
      incomeBudget: 50_000,
      tfc: 1_508_086.44,
      tvc: 655_517.31,
      revenueMode: 'with_government',
    },
    { ...DEFAULT_POLICY, cmLeZeroPolicy: 'not_computable' },
  );

  it('ถ้ามีหน่วยย่อยที่ Q* เป็น null → sum_of_programs ต้องเป็น null ไม่ใช่บวกเฉพาะที่มี', () => {
    const agg = aggregateBreakEven([big, mid, broken], 'faculty', {
      ...DEFAULT_POLICY,
      cmLeZeroPolicy: 'not_computable',
    });
    expect(broken.qStar).toBeNull();
    expect(agg.qStarByMethod.sum_of_programs.qStar).toBeNull();
    expect(agg.qStarByMethod.sum_of_programs.qStarStatus).toBe('not_computable');
    // pooled ยังคำนวณได้ เพราะยอดรวมของคณะยังมี CM เป็นบวก
    expect(agg.qStarByMethod.pooled.qStar).not.toBeNull();
  });

  it('เมื่อวิธีหลักคำนวณไม่ได้ BE Revenue และ MoS ต้องเป็น null', () => {
    const agg = aggregateBreakEven([big, mid, broken], 'faculty', {
      ...DEFAULT_POLICY,
      cmLeZeroPolicy: 'not_computable',
    });
    expect(agg.qStar).toBeNull();
    expect(agg.breakEvenRevenue).toBeNull();
    expect(agg.marginOfSafety).toBeNull();
  });
});

describe('aggregateBreakEven — การป้องกันการรวมผิด', () => {
  it('รวมข้ามฐานรายได้ไม่ได้ — TR จะไม่มีความหมาย', () => {
    const ex = program(200, 3_000_000, 5_000_000, 6_000_000, 2_000_000, 'without_government');
    expect(() => aggregateBreakEven([big, ex], 'faculty')).toThrow(/ฐานรายได้เดียวกัน/);
  });

  it('ไม่มีหน่วยย่อยเลย → โยน error ไม่ใช่คืนศูนย์เงียบๆ', () => {
    expect(() => aggregateBreakEven([], 'faculty')).toThrow(/อย่างน้อย 1 รายการ/);
  });

  it('รวมซ้อนหลายชั้นได้ — ระดับการศึกษา → คณะ → มหาวิทยาลัย', () => {
    const ug = aggregateBreakEven([big, mid], 'education_level');
    const grad = aggregateBreakEven([small], 'education_level');
    const uni = aggregateBreakEven([ug, grad], 'university');
    expect(uni.q).toBe(1_250);
    expect(uni.tc).toBeCloseTo(32_600_000, 6);
    expect(uni.scope).toBe('university');
  });
});
