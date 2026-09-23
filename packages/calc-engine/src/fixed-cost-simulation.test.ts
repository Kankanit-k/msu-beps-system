import { describe, expect, it } from 'vitest';

import type { FixedCostPolicy } from './fixed-cost-policy';
import { defaultCandidates, simulateFixedCostMethods } from './fixed-cost-simulation';
import type { FixedCostProgramInput } from './fixed-cost-simulation';

/**
 * คณะสมมติที่สะท้อนปัญหาในมติ — ป.ตรี 1,000 คน กับ ป.โท 20 คน
 * ป.โท เก็บค่าธรรมเนียมสูงกว่าและมีต้นทุนผันแปร/หัวสูงกว่า (R = 80,000 · AVC = 60,000)
 * จึงมี CM/หัว ต่างจาก ป.ตรี — เงื่อนไขที่ทำให้วิธีหารต้นทุนคงที่เปลี่ยน Q* จริง
 */
const PROGRAMS: FixedCostProgramInput[] = [
  {
    programVersionId: 'P1',
    label: 'ป.ตรี บัญชี',
    educationLevel: 'ป.ตรี',
    ftes: 1000,
    q: 1000,
    governmentBudget: 20_000_000,
    incomeBudget: 30_000_000,
    tvc: 20_000_000,
  },
  {
    programVersionId: 'P2',
    label: 'ป.โท บัญชี',
    educationLevel: 'ป.โท',
    ftes: 20,
    q: 20,
    governmentBudget: 400_000,
    incomeBudget: 1_200_000,
    tvc: 1_200_000,
  },
];

const POOL = 10_000_000;

const CUSTOM: FixedCostPolicy = {
  method: 'CUSTOM_PCT',
  bucketLevel: 'EDUCATION_LEVEL',
  lines: [
    { bucketKey: 'ป.ตรี', pct: 95 },
    { bucketKey: 'ป.โท', pct: 5 },
  ],
};

const run = () =>
  simulateFixedCostMethods({
    pool: POOL,
    programs: PROGRAMS,
    revenueMode: 'with_government',
    candidates: defaultCandidates(CUSTOM),
  });

describe('simulateFixedCostMethods', () => {
  it('คืนผลครบทุกวิธีที่ขอ โดยวิธีแรกเป็นฐานเปรียบเทียบ', () => {
    const result = run();

    expect(result.methods.map((m) => m.key)).toEqual([
      'PER_HEAD_FTES',
      'EQUAL_PROGRAM',
      'CUSTOM_PCT',
    ]);
    expect(result.baselineKey).toBe('PER_HEAD_FTES');
    expect(result.methods[0]?.programs[0]?.deltaVsBaseline).toBeNull();
  });

  it('ยอดต้นทุนคงที่รวมของคณะเท่ากันทุกวิธี — เปลี่ยนแค่การกระจาย', () => {
    for (const method of run().methods) {
      const sum = method.programs.reduce((a, p) => a + p.tfc, 0);

      expect(Math.round(sum * 100) / 100).toBe(POOL);
      expect(method.faculty?.tfc).toBeCloseTo(POOL, 6);
    }
  });

  it('วิธีหารเท่าย้ายภาระมาที่หลักสูตรเล็กอย่างชัดเจน', () => {
    const [perHeadMethod, equal] = run().methods;

    // ตามหัวนิสิต: ป.โท ได้ 20/1020 ของก้อน ≈ 196,078 บาท
    expect(perHeadMethod?.programs[1]?.allocatedFixedCost).toBeCloseTo(196_078.43, 2);
    // หารเท่า: ป.โท รับครึ่งหนึ่งของทั้งก้อน
    expect(equal?.programs[1]?.allocatedFixedCost).toBe(5_000_000);
    expect(equal?.programs[1]?.deltaVsBaseline?.tfc).toBeCloseTo(4_803_921.57, 2);
  });

  it('ต้นทุนคงที่ต่อหัวและ Q* ขยับตามวิธีที่เลือก', () => {
    const [perHeadMethod, , custom] = run().methods;

    expect(perHeadMethod?.programs[1]?.fixedCostPerHead).toBeCloseTo(9803.92, 2);
    expect(custom?.programs[1]?.fixedCostPerHead).toBe(25_000);

    // ป.โท: R = 80,000 · AVC = 60,000 · CM = 20,000
    // ตามหัวนิสิต Q* = 196,078.43 / 20,000 = 9.80 → ceil 10
    // กำหนดเอง 5%  Q* = 500,000 / 20,000 = 25.00 → 25
    expect(perHeadMethod?.programs[1]?.breakEven.qStar).toBe(10);
    expect(custom?.programs[1]?.breakEven.qStar).toBe(25);
    expect(custom?.programs[1]?.deltaVsBaseline?.qStar).toBe(15);
  });

  it('กำไร/ขาดทุนรวมของคณะไม่เปลี่ยนตามวิธีหาร', () => {
    const profits = run().methods.map((m) => Math.round(m.faculty?.profit ?? Number.NaN));

    expect(new Set(profits).size).toBe(1);
  });

  it('Q* ระดับคณะแบบ pooled ไม่เปลี่ยน แต่แบบ sum_of_programs เปลี่ยน', () => {
    const [perHeadMethod, equal] = run().methods;

    // pooled คำนวณจากยอดรวมครั้งเดียว วิธีหารภายในคณะจึงไม่มีผล
    expect(perHeadMethod?.faculty?.qStarByMethod.pooled.qStar).toBe(336);
    expect(equal?.faculty?.qStarByMethod.pooled.qStar).toBe(336);

    // sum_of_programs รวม Q* รายหลักสูตร จึงเปลี่ยนตามวิธีหาร — ข้อที่ต้องสื่อสารกับผู้บริหาร
    expect(perHeadMethod?.faculty?.qStarByMethod.sum_of_programs.qStar).toBe(337);
    expect(equal?.faculty?.qStarByMethod.sum_of_programs.qStar).toBe(417);
  });

  it('ส่งนโยบายที่ยังไม่ผ่านการตรวจมาก็ยังจำลองได้ แต่ valid = false', () => {
    const result = simulateFixedCostMethods({
      pool: POOL,
      programs: PROGRAMS,
      revenueMode: 'with_government',
      candidates: [
        {
          key: 'draft',
          policy: {
            method: 'CUSTOM_PCT',
            bucketLevel: 'EDUCATION_LEVEL',
            lines: [{ bucketKey: 'ป.ตรี', pct: 80 }],
          },
        },
      ],
    });

    const method = result.methods[0];

    expect(method?.valid).toBe(false);
    expect(method?.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['PCT_SUM_NOT_100', 'PROGRAM_NOT_COVERED']),
    );
    // ยอดยังเต็มก้อน — หลักสูตรที่ตกหล่นได้ 0 ไม่ใช่เงินหายไปเฉยๆ
    expect(method?.programs.reduce((a, p) => a + p.tfc, 0)).toBe(POOL);
    expect(method?.programs[1]?.tfc).toBe(0);
  });

  it('รวม direct fixed cost ของหลักสูตรเข้า TFC ด้วย', () => {
    const result = simulateFixedCostMethods({
      pool: POOL,
      programs: PROGRAMS.map((p, i) => (i === 1 ? { ...p, directFixedCost: 250_000 } : p)),
      revenueMode: 'with_government',
      candidates: [{ key: 'EQUAL_PROGRAM', policy: { method: 'EQUAL_PROGRAM' } }],
    });

    expect(result.methods[0]?.programs[1]?.tfc).toBe(5_250_000);
    expect(result.methods[0]?.faculty?.tfc).toBe(POOL + 250_000);
  });

  it('ฐานรายได้ไม่รวมเงินแผ่นดินใช้คู่กับนโยบายเดียวกันได้', () => {
    const result = simulateFixedCostMethods({
      pool: POOL,
      programs: PROGRAMS,
      revenueMode: 'without_government',
      candidates: defaultCandidates(),
    });

    expect(result.methods[0]?.faculty?.tr).toBe(31_200_000);
    expect(
      result.methods.every((m) =>
        m.programs.every((p) => p.breakEven.revenueMode === 'without_government'),
      ),
    ).toBe(true);
  });
});

describe('defaultCandidates', () => {
  it('ไม่ส่งนโยบายกำหนดเองมา → เทียบแค่ 2 วิธีแรก', () => {
    expect(defaultCandidates().map((c) => c.key)).toEqual(['PER_HEAD_FTES', 'EQUAL_PROGRAM']);
  });
});
