import { describe, expect, it } from 'vitest';

import { fixedCostPolicySchema, fixedCostSimulateRequestSchema } from './fixed-cost';

const program = {
  programVersionId: 'P1',
  educationLevel: 'ปริญญาตรี',
  ftes: 100,
  q: 100,
  governmentBudget: 1_000_000,
  incomeBudget: 2_000_000,
  tvc: 500_000,
};

describe('fixedCostPolicySchema', () => {
  it('รับวิธีที่ 1 และ 2 แบบไม่มีสัดส่วน', () => {
    expect(fixedCostPolicySchema.safeParse({ method: 'PER_HEAD_FTES' }).success).toBe(true);
    expect(fixedCostPolicySchema.safeParse({ method: 'EQUAL_PROGRAM' }).success).toBe(true);
  });

  it('ปฏิเสธการกรอกสัดส่วนมากับวิธีที่ไม่ได้ใช้สัดส่วน — กันผู้ใช้เข้าใจผิดว่ามีผล', () => {
    const parsed = fixedCostPolicySchema.safeParse({
      method: 'EQUAL_PROGRAM',
      lines: [{ bucketKey: 'ปริญญาตรี', pct: 100 }],
    });

    expect(parsed.success).toBe(false);
  });

  it('ปฏิเสธ subMethod ที่ส่งมากับวิธีที่ไม่ได้แบ่ง 2 ชั้น', () => {
    expect(
      fixedCostPolicySchema.safeParse({ method: 'EQUAL_PROGRAM', subMethod: 'PER_HEAD_FTES' })
        .success,
    ).toBe(false);
  });

  it('วิธีกำหนดสัดส่วนเองต้องระบุ bucketLevel — ตรงกับ CHECK ของฐานข้อมูล', () => {
    expect(
      fixedCostPolicySchema.safeParse({
        method: 'CUSTOM_PCT',
        lines: [{ bucketKey: 'ปริญญาตรี', pct: 100 }],
      }).success,
    ).toBe(false);
  });

  it('ปฏิเสธกลุ่มซ้ำตั้งแต่ชั้น schema — ตรงกับ UNIQUE (policy_id, bucket_key)', () => {
    expect(
      fixedCostPolicySchema.safeParse({
        method: 'CUSTOM_PCT',
        bucketLevel: 'EDUCATION_LEVEL',
        lines: [
          { bucketKey: 'ปริญญาตรี', pct: 50 },
          { bucketKey: 'ปริญญาตรี', pct: 50 },
        ],
      }).success,
    ).toBe(false);
  });

  it('วิธีกำหนดสัดส่วนเองต้องมีอย่างน้อยหนึ่งกลุ่ม', () => {
    expect(fixedCostPolicySchema.safeParse({ method: 'CUSTOM_PCT', lines: [] }).success).toBe(
      false,
    );
    expect(
      fixedCostPolicySchema.safeParse({
        method: 'CUSTOM_PCT',
        bucketLevel: 'EDUCATION_LEVEL',
        lines: [{ bucketKey: 'ปริญญาตรี', pct: 90 }],
      }).success,
    ).toBe(true);
  });

  it('เปอร์เซ็นต์นอกช่วง 0–100 ถูกปฏิเสธตั้งแต่ชั้น schema', () => {
    const parsed = fixedCostPolicySchema.safeParse({
      method: 'CUSTOM_PCT',
      bucketLevel: 'EDUCATION_LEVEL',
      lines: [{ bucketKey: 'ปริญญาตรี', pct: 120 }],
    });

    expect(parsed.success).toBe(false);
  });
});

describe('fixedCostSimulateRequestSchema', () => {
  it('ฐานรายได้ไม่ส่งมา = รวมเงินแผ่นดินตามค่าตั้งเริ่มต้นของระบบ', () => {
    const parsed = fixedCostSimulateRequestSchema.parse({ pool: 1_000_000, programs: [program] });

    expect(parsed.revenueMode).toBe('with_government');
  });

  it('ต้องมีหลักสูตรอย่างน้อยหนึ่งรายการ', () => {
    expect(
      fixedCostSimulateRequestSchema.safeParse({ pool: 1_000_000, programs: [] }).success,
    ).toBe(false);
  });

  it('จำนวนหลักสูตรเกินเพดานถูกปฏิเสธ — กันคำขอที่ใหญ่เกินจริง', () => {
    const many = Array.from({ length: 1001 }, (_, i) => ({
      ...program,
      programVersionId: `P${i}`,
    }));

    expect(
      fixedCostSimulateRequestSchema.safeParse({ pool: 1_000_000, programs: many }).success,
    ).toBe(false);
  });

  it('ยอดต้นทุนติดลบส่งมาได้ (รายการปรับปรุงของ ERP)', () => {
    expect(
      fixedCostSimulateRequestSchema.safeParse({ pool: -50_000, programs: [program] }).success,
    ).toBe(true);
  });
});
