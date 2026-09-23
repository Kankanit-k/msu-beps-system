import { describe, expect, it } from 'vitest';

import { allocateAmount, allocateFixedCost, buildFixedCostDrivers } from './fixed-cost-policy';
import type { FixedCostPolicy, ProgramWeightInput } from './fixed-cost-policy';

/** คณะตัวอย่างตามกรณีในมติ — ป.ตรี นิสิตเยอะ · ป.โท/ป.เอก นิสิตน้อย */
const FACULTY: ProgramWeightInput[] = [
  { programVersionId: 'P1', label: 'บัญชีบัณฑิต', educationLevel: 'ป.ตรี', ftes: 800 },
  { programVersionId: 'P2', label: 'การจัดการ', educationLevel: 'ป.ตรี', ftes: 200 },
  { programVersionId: 'P3', label: 'บัญชีมหาบัณฑิต', educationLevel: 'ป.โท', ftes: 20 },
  { programVersionId: 'P4', label: 'บัญชีดุษฎีบัณฑิต', educationLevel: 'ป.เอก', ftes: 5 },
];

const shares = (policy: FixedCostPolicy, programs = FACULTY) =>
  buildFixedCostDrivers(policy, programs).drivers.map((d) => d.driverValue);

describe('allocateAmount', () => {
  it('ผลรวมตรงยอดตั้งต้นพอดีแม้สัดส่วนหารไม่ลงตัว', () => {
    const parts = allocateAmount(1000, [1, 1, 1]);

    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(parts).toEqual([333.34, 333.33, 333.33]);
  });

  it('แจกเศษให้แถวที่เศษมากที่สุดก่อน แล้วตัดสินเสมอด้วยลำดับแถว', () => {
    expect(allocateAmount(100, [0.5, 0.25, 0.25])).toEqual([50, 25, 25]);
    expect(allocateAmount(0.03, [1, 1])).toEqual([0.02, 0.01]);
  });

  it('รองรับยอดติดลบ (รายการคืนเงินของ ERP) โดยผลรวมยังตรง', () => {
    const parts = allocateAmount(-1000, [1, 1, 1]);

    expect(parts.reduce((a, b) => a + b, 0)).toBe(-1000);
    // ค่านี้ตรงกับที่ PostgreSQL ให้ (floor ลงทาง −∞ แล้วบวกสตางค์คืนให้แถวแรกๆ)
    // ถ้าคำนวณบนค่าสัมบูรณ์จะได้ [-333.34, -333.33, -333.33] ซึ่งเศษไปลงคนละหลักสูตรกับ run จริง
    expect(parts).toEqual([-333.33, -333.33, -333.34]);
  });

  it('ตัดสินเสมอด้วยคีย์หลักสูตรแบบเดียวกับ ORDER BY program_version_id ของ SQL', () => {
    // สัดส่วนเท่ากันทุกแถว เศษจึงเท่ากัน — ผู้รับสตางค์ที่เหลือต้องเป็น pvid น้อยสุด
    // ไม่ใช่แถวแรกใน array (ซึ่งเรียงตามบรรทัดนโยบาย)
    expect(allocateAmount(0.04, [1, 1, 1], ['2', '3', '1'])).toEqual([0.01, 0.01, 0.02]);
    expect(allocateAmount(0.01, [1, 1, 1], ['2', '3', '1'])).toEqual([0, 0, 0.01]);
  });

  it('สัดส่วนติดลบถูกปัดเป็น 0 ทั้งตัวเศษและตัวส่วน — ผลรวมไม่มีทางเกินยอด', () => {
    expect(allocateAmount(100, [2, -1])).toEqual([100, 0]);
    expect(allocateAmount(100, [1, 1, -3])).toEqual([50, 50, 0]);
  });

  it('สัดส่วนรวมเป็นศูนย์หรือไม่มีแถว → ศูนย์ทั้งแถว ไม่ใช่ NaN', () => {
    expect(allocateAmount(1000, [0, 0])).toEqual([0, 0]);
    expect(allocateAmount(1000, [])).toEqual([]);
  });
});

describe('วิธีที่ 1 — PER_HEAD_FTES', () => {
  it('แบ่งตาม FTES ของแต่ละหลักสูตร', () => {
    expect(shares({ method: 'PER_HEAD_FTES' })).toEqual([
      800 / 1025,
      200 / 1025,
      20 / 1025,
      5 / 1025,
    ]);
  });

  it('ทั้งคณะไม่มีนิสิต → หารเท่ากันแทน พร้อมเตือนและติดธง MISSING_DRIVER', () => {
    const zero = FACULTY.map((p) => ({ ...p, ftes: 0 }));
    const set = buildFixedCostDrivers({ method: 'PER_HEAD_FTES' }, zero);

    expect(set.drivers.map((d) => d.driverValue)).toEqual([0.25, 0.25, 0.25, 0.25]);
    expect(set.drivers.every((d) => d.flag === 'MISSING_DRIVER')).toBe(true);
    expect(set.issues.map((i) => i.code)).toEqual(['FTES_UNAVAILABLE']);
    expect(set.valid).toBe(true); // เป็นคำเตือน ไม่ใช่ข้อห้าม
  });

  it('หลักสูตรที่ไม่มีนิสิตได้ส่วนแบ่ง 0 ไม่ใช่ error', () => {
    const set = buildFixedCostDrivers({ method: 'PER_HEAD_FTES' }, [
      ...FACULTY,
      { programVersionId: 'P5', label: 'หลักสูตรใหม่', educationLevel: 'ป.ตรี', ftes: 0 },
    ]);

    expect(set.drivers.at(-1)?.driverValue).toBe(0);
    expect(set.valid).toBe(true);
  });
});

describe('วิธีที่ 2 — EQUAL_PROGRAM', () => {
  it('ทุกหลักสูตรได้เท่ากันไม่ว่ามีนิสิตกี่คน', () => {
    expect(shares({ method: 'EQUAL_PROGRAM' })).toEqual([0.25, 0.25, 0.25, 0.25]);
  });

  it('ไม่ติดธง MISSING_DRIVER เพราะวิธีนี้ไม่ได้พึ่ง FTES', () => {
    const set = buildFixedCostDrivers(
      { method: 'EQUAL_PROGRAM' },
      FACULTY.map((p) => ({ ...p, ftes: 0 })),
    );

    expect(set.drivers.every((d) => d.flag === 'PASS')).toBe(true);
    expect(set.issues).toEqual([]);
  });
});

describe('วิธีที่ 3 — CUSTOM_PCT (2 ชั้น)', () => {
  /** ตัวอย่างที่ประชุมยกมา: ป.ตรี 90% · ป.โท-เอก รวมกัน 10% */
  const MEETING_EXAMPLE: FixedCostPolicy = {
    method: 'CUSTOM_PCT',
    bucketLevel: 'EDUCATION_LEVEL',
    subMethod: 'PER_HEAD_FTES',
    lines: [
      { bucketKey: 'ป.ตรี', pct: 90 },
      { bucketKey: 'ป.โท', pct: 5 },
      { bucketKey: 'ป.เอก', pct: 5 },
    ],
  };

  it('แบ่งก้อนตาม % แล้วแบ่งต่อภายในกลุ่มตาม FTES', () => {
    const set = buildFixedCostDrivers(MEETING_EXAMPLE, FACULTY);

    expect(set.valid).toBe(true);
    expect(set.drivers.map((d) => d.driverValue)).toEqual([
      0.9 * (800 / 1000),
      0.9 * (200 / 1000),
      0.05,
      0.05,
    ]);
    expect(set.drivers.every((d) => d.flag === 'MANUAL_OVERRIDE')).toBe(true);
  });

  it('เปลี่ยนวิธีแบ่งภายในกลุ่มเป็นหารเท่าได้', () => {
    const set = buildFixedCostDrivers({ ...MEETING_EXAMPLE, subMethod: 'EQUAL_PROGRAM' }, FACULTY);

    expect(set.drivers.map((d) => d.driverValue)).toEqual([0.45, 0.45, 0.05, 0.05]);
  });

  it('กำหนดสัดส่วนถึงรายหลักสูตรได้ (ชั้นที่ 2 ไม่ทำงาน)', () => {
    const set = buildFixedCostDrivers(
      {
        method: 'CUSTOM_PCT',
        bucketLevel: 'PROGRAM',
        lines: [
          { bucketKey: 'P1', pct: 70 },
          { bucketKey: 'P2', pct: 20 },
          { bucketKey: 'P3', pct: 7 },
          { bucketKey: 'P4', pct: 3 },
        ],
      },
      FACULTY,
    );

    expect(set.valid).toBe(true);
    expect(set.drivers.map((d) => d.driverValue)).toEqual([0.7, 0.2, 0.07, 0.03]);
  });

  it('V1 — ผลรวมไม่ถึง 100% เสนออนุมัติไม่ได้', () => {
    const set = buildFixedCostDrivers(
      {
        ...MEETING_EXAMPLE,
        lines: [
          { bucketKey: 'ป.ตรี', pct: 90 },
          { bucketKey: 'ป.โท', pct: 5 },
        ],
      },
      FACULTY,
    );

    expect(set.valid).toBe(false);
    expect(set.issues.map((i) => i.code)).toContain('PCT_SUM_NOT_100');
  });

  it('V1 — กลุ่มซ้ำและเปอร์เซ็นต์นอกช่วงถูกปฏิเสธ', () => {
    const set = buildFixedCostDrivers(
      {
        method: 'CUSTOM_PCT',
        bucketLevel: 'EDUCATION_LEVEL',
        lines: [
          { bucketKey: 'ป.ตรี', pct: 120 },
          { bucketKey: 'ป.ตรี', pct: -20 },
        ],
      },
      FACULTY,
    );

    expect(set.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['BUCKET_DUPLICATED', 'PCT_INVALID']),
    );
    expect(set.valid).toBe(false);
  });

  it('กลุ่มซ้ำถูกรวมสัดส่วนเข้าด้วยกัน — ไม่สร้าง driver ซ้ำจนเงินหายครึ่งก้อน', () => {
    const set = buildFixedCostDrivers(
      {
        method: 'CUSTOM_PCT',
        bucketLevel: 'EDUCATION_LEVEL',
        subMethod: 'EQUAL_PROGRAM',
        lines: [
          { bucketKey: 'ป.ตรี', pct: 45 },
          { bucketKey: 'ป.ตรี', pct: 45 },
          { bucketKey: 'ป.โท', pct: 5 },
          { bucketKey: 'ป.เอก', pct: 5 },
        ],
      },
      FACULTY,
    );

    // หนึ่งหลักสูตร = หนึ่งแถวเสมอ แม้กลุ่มจะถูกกรอกซ้ำ (ฝั่ง SQL กันด้วย UNIQUE)
    expect(set.drivers).toHaveLength(FACULTY.length);
    expect(set.drivers.reduce((a, d) => a + d.driverValue, 0)).toBeCloseTo(1, 10);
    expect(allocateFixedCost(1_000_000, set).reduce((a, r) => a + r.amount, 0)).toBe(1_000_000);
  });

  it('V2 — มีหลักสูตรที่ไม่ได้อยู่ในกลุ่มใดเลย ต้องชี้ชื่อออกมา', () => {
    const set = buildFixedCostDrivers(
      {
        method: 'CUSTOM_PCT',
        bucketLevel: 'EDUCATION_LEVEL',
        lines: [
          { bucketKey: 'ป.ตรี', pct: 95 },
          { bucketKey: 'ป.โท', pct: 5 },
        ],
      },
      FACULTY,
    );

    const issue = set.issues.find((i) => i.code === 'PROGRAM_NOT_COVERED');

    expect(issue?.refs).toEqual(['บัญชีดุษฎีบัณฑิต']);
    expect(set.valid).toBe(false);
  });

  it('V3 — กลุ่มที่ได้สัดส่วนแต่ไม่มีหลักสูตรอยู่เลย ถูกปฏิเสธ และยอดไม่ค้าง', () => {
    const set = buildFixedCostDrivers(
      {
        method: 'CUSTOM_PCT',
        bucketLevel: 'EDUCATION_LEVEL',
        lines: [
          { bucketKey: 'ป.ตรี', pct: 60 },
          { bucketKey: 'ป.โท', pct: 20 },
          { bucketKey: 'ป.เอก', pct: 10 },
          { bucketKey: 'ป.บัณฑิต', pct: 10 },
        ],
      },
      FACULTY,
    );

    expect(set.issues.find((i) => i.code === 'BUCKET_EMPTY')?.refs).toEqual(['ป.บัณฑิต']);
    expect(set.valid).toBe(false);
    // 10% ของกลุ่มที่ว่างถูก normalize กลับเข้ากลุ่มที่มีหลักสูตร — ยอดรวมยังเต็ม 100%
    expect(set.drivers.reduce((a, d) => a + d.driverValue, 0)).toBeCloseTo(1, 10);
  });

  it('V8 — กลุ่มที่ไม่มี FTES หารเท่ากันภายในกลุ่ม และติดธงไว้', () => {
    const set = buildFixedCostDrivers(MEETING_EXAMPLE, [
      ...FACULTY.slice(0, 2),
      { programVersionId: 'P3', educationLevel: 'ป.โท', ftes: 0 },
      { programVersionId: 'P3b', educationLevel: 'ป.โท', ftes: 0 },
      { programVersionId: 'P4', educationLevel: 'ป.เอก', ftes: 5 },
    ]);

    const masters = set.drivers.filter((d) => d.bucketKey === 'ป.โท');

    expect(masters.map((d) => d.driverValue)).toEqual([0.025, 0.025]);
    expect(masters.every((d) => d.flag === 'MISSING_DRIVER')).toBe(true);
    expect(set.issues.map((i) => i.code)).toContain('FTES_UNAVAILABLE');
  });

  it('เลือกวิธีกำหนดเองแต่ไม่กรอกสัดส่วน → เสนอไม่ได้', () => {
    const set = buildFixedCostDrivers({ method: 'CUSTOM_PCT', lines: [] }, FACULTY);

    expect(set.issues.map((i) => i.code)).toEqual(['POLICY_INCOMPLETE']);
    expect(set.valid).toBe(false);
  });
});

describe('ไม่มีหลักสูตรเลย', () => {
  it('คืน error NO_PROGRAM ไม่ใช่หารด้วยศูนย์', () => {
    const set = buildFixedCostDrivers({ method: 'PER_HEAD_FTES' }, []);

    expect(set.drivers).toEqual([]);
    expect(set.issues.map((i) => i.code)).toEqual(['NO_PROGRAM']);
    expect(set.valid).toBe(false);
  });
});

describe('allocateFixedCost — ยอดรวมต้องตรงต้นทางเสมอ', () => {
  const POOL = 12_345_678.91;

  it.each<[string, FixedCostPolicy]>([
    ['PER_HEAD_FTES', { method: 'PER_HEAD_FTES' }],
    ['EQUAL_PROGRAM', { method: 'EQUAL_PROGRAM' }],
    [
      'CUSTOM_PCT',
      {
        method: 'CUSTOM_PCT',
        bucketLevel: 'EDUCATION_LEVEL',
        lines: [
          { bucketKey: 'ป.ตรี', pct: 90 },
          { bucketKey: 'ป.โท', pct: 7 },
          { bucketKey: 'ป.เอก', pct: 3 },
        ],
      },
    ],
  ])('วิธี %s ปันส่วนแล้วรวมได้ %s บาทพอดี', (_name, policy) => {
    const rows = allocateFixedCost(POOL, buildFixedCostDrivers(policy, FACULTY));
    const total = rows.reduce((a, r) => a + r.amount, 0);

    expect(Math.round(total * 100) / 100).toBe(POOL);
  });

  it('ยืนยันตัวเลขกรณีในมติด้วยการคำนวณมือ', () => {
    const rows = allocateFixedCost(
      10_000_000,
      buildFixedCostDrivers(
        {
          method: 'CUSTOM_PCT',
          bucketLevel: 'EDUCATION_LEVEL',
          subMethod: 'PER_HEAD_FTES',
          lines: [
            { bucketKey: 'ป.ตรี', pct: 90 },
            { bucketKey: 'ป.โท', pct: 5 },
            { bucketKey: 'ป.เอก', pct: 5 },
          ],
        },
        FACULTY,
      ),
    );

    // ป.ตรี 9 ลบ. แบ่ง 800:200 → 7.2 / 1.8 ลบ. · ป.โท และ ป.เอก กลุ่มละ 0.5 ลบ.
    expect(rows.map((r) => r.amount)).toEqual([7_200_000, 1_800_000, 500_000, 500_000]);
  });
});
