import { describe, expect, it } from 'vitest';

import {
  allocateFaculty,
  allocBuckets,
  DEFAULT_ALLOC_CHOICE,
  NEW_PROGRAM_ID,
  policyOf,
  shareOf,
} from './facultyAllocation';
import type { FacultyScenario } from './facultyAllocation';

// คณะสมมุติ: ก้อนส่วนกลาง 1,000,000 · ชีตปันตามหัวไว้ 800k / 150k / 50k
const base: FacultyScenario = {
  pool: 1_000_000,
  programs: [
    { id: 'a', label: 'ตรี A', educationLevel: 'ปริญญาตรี', q: 400, sheetShare: 800_000 },
    { id: 'b', label: 'โท B', educationLevel: 'ปริญญาโท', q: 75, sheetShare: 150_000 },
    { id: 'c', label: 'เอก C', educationLevel: 'ปริญญาเอก', q: 25, sheetShare: 50_000 },
  ],
};

const total = (xs: { after: number }[]) => Math.round(xs.reduce((s, x) => s + x.after, 0) * 100);

describe('allocateFaculty', () => {
  it('ตามชีต = ไม่ปันใหม่ ส่วนแบ่งเท่าเดิมทุกหลักสูตร', () => {
    const o = allocateFaculty(base, null);

    expect(o.applied).toBe(false);
    expect(o.shares.every((s) => s.after === s.before)).toBe(true);
  });

  it('หารเท่ากัน: ก้อนเดิมแบ่ง 3 ส่วน ผลรวมเท่าก้อนพอดีทุกสตางค์', () => {
    const o = allocateFaculty(base, { method: 'EQUAL_PROGRAM' });

    expect(o.applied).toBe(true);
    expect(o.shares.map((s) => s.after)).toEqual([333_333.34, 333_333.33, 333_333.33]);
    expect(total(o.shares)).toBe(100_000_000);
    expect(shareOf(o, 'c')?.adj).toBeCloseTo(283_333.33, 2);
  });

  it('เปิดหลักสูตรใหม่: เข้าไปแบ่งก้อนเดิม หลักสูตรเดิมได้น้อยลง ก้อนรวมไม่เพิ่ม', () => {
    const sc: FacultyScenario = {
      ...base,
      newProgram: { label: 'ตรี ใหม่', educationLevel: 'ปริญญาตรี', q: 100, sheetShare: 0 },
    };
    const o = allocateFaculty(sc, { method: 'PER_HEAD_FTES' });

    // 600 หัว → ใหม่ 100/600, A 400/600
    expect(shareOf(o, NEW_PROGRAM_ID)?.after).toBeCloseTo(166_666.67, 2);
    expect(shareOf(o, 'a')?.after).toBeCloseTo(666_666.67, 2);
    expect(shareOf(o, 'a')!.adj).toBeLessThan(0);
    expect(total(o.shares)).toBe(100_000_000);
  });

  it('หลักสูตรใหม่ตั้งต้นจากหลักสูตรอ้างอิง: ถอดส่วนแบ่งที่ติดมาออกก่อน', () => {
    const sc: FacultyScenario = {
      ...base,
      newProgram: { label: 'ใหม่', educationLevel: 'ปริญญาโท', q: 75, sheetShare: 150_000 },
    };
    const o = allocateFaculty(sc, { method: 'EQUAL_PROGRAM' });

    expect(shareOf(o, NEW_PROGRAM_ID)?.adj).toBeCloseTo(250_000 - 150_000, 2);
  });

  it('ปรับจำนวนนิสิตของหลักสูตรเดิม: ตามรายหัวแล้วส่วนแบ่งทุกหลักสูตรขยับ', () => {
    const o = allocateFaculty(
      { ...base, qOverride: { id: 'c', q: 125 } },
      { method: 'PER_HEAD_FTES' },
    );

    // 400 + 75 + 125 = 600
    expect(shareOf(o, 'c')?.after).toBeCloseTo(208_333.33, 2);
    expect(shareOf(o, 'b')?.after).toBe(125_000);
    expect(total(o.shares)).toBe(100_000_000);
  });

  it('กำหนด % ไม่ครบ 100 → ไม่ใช้ตัวเลข คงตามชีต พร้อมบอกเหตุผล', () => {
    const choice = {
      ...DEFAULT_ALLOC_CHOICE,
      method: 'CUSTOM_PCT' as const,
      pct: { ปริญญาตรี: '80', ปริญญาโท: '10' },
    };
    const o = allocateFaculty(base, policyOf(choice, allocBuckets(base, 'EDUCATION_LEVEL')));

    expect(o.applied).toBe(false);
    expect(o.shares.every((s) => s.after === s.before)).toBe(true);
    expect(o.issues.map((i) => i.code)).toContain('PCT_SUM_NOT_100');
  });

  it('กำหนด % รายหลักสูตร: หลักสูตรใหม่ที่ยังไม่ได้ % ทำให้สัดส่วนไม่ครบ', () => {
    const sc: FacultyScenario = {
      ...base,
      newProgram: { label: 'ใหม่', educationLevel: 'ปริญญาตรี', q: 50, sheetShare: 0 },
    };
    const buckets = allocBuckets(sc, 'PROGRAM');
    const choice = {
      ...DEFAULT_ALLOC_CHOICE,
      method: 'CUSTOM_PCT' as const,
      bucketLevel: 'PROGRAM' as const,
      pct: { a: '70', b: '20', c: '10' },
    };

    expect(buckets.map((b) => b.key)).toContain(NEW_PROGRAM_ID);
    expect(allocateFaculty(sc, policyOf(choice, buckets)).applied).toBe(false);

    const ok = allocateFaculty(
      sc,
      policyOf({ ...choice, pct: { ...choice.pct, a: '60', [NEW_PROGRAM_ID]: '10' } }, buckets),
    );

    expect(ok.applied).toBe(true);
    expect(shareOf(ok, NEW_PROGRAM_ID)?.after).toBe(100_000);
    expect(shareOf(ok, 'a')?.after).toBe(600_000);
  });

  it('กำหนด % ระดับการศึกษา + แบ่งต่อตามหัว: ป.ตรี 90 / บัณฑิต 10', () => {
    const choice = {
      ...DEFAULT_ALLOC_CHOICE,
      method: 'CUSTOM_PCT' as const,
      pct: { ปริญญาตรี: '90', ปริญญาโท: '7', ปริญญาเอก: '3' },
    };
    const o = allocateFaculty(base, policyOf(choice, allocBuckets(base, 'EDUCATION_LEVEL')));

    expect(o.applied).toBe(true);
    expect(o.shares.map((s) => s.after)).toEqual([900_000, 70_000, 30_000]);
  });

  it('กำหนด % ระดับการศึกษา: หลักสูตรใหม่เปิดระดับที่คณะยังไม่มี ต้องกรอก % ของระดับนั้นเอง', () => {
    const sc: FacultyScenario = {
      ...base,
      newProgram: { label: 'ใหม่', educationLevel: 'ป.บัณฑิต', q: 20, sheetShare: 0 },
    };
    const buckets = allocBuckets(sc, 'EDUCATION_LEVEL');
    const choice = {
      ...DEFAULT_ALLOC_CHOICE,
      method: 'CUSTOM_PCT' as const,
      pct: { ปริญญาตรี: '90', ปริญญาโท: '7', ปริญญาเอก: '3' },
    };
    const missing = allocateFaculty(sc, policyOf(choice, buckets));

    expect(missing.applied).toBe(false);
    expect(missing.issues.map((i) => i.code)).toContain('PROGRAM_NOT_COVERED');

    const ok = allocateFaculty(
      sc,
      policyOf({ ...choice, pct: { ...choice.pct, ปริญญาตรี: '85', 'ป.บัณฑิต': '5' } }, buckets),
    );

    expect(ok.applied).toBe(true);
    expect(shareOf(ok, NEW_PROGRAM_ID)?.after).toBe(50_000);
  });

  it('ส่วนแบ่งที่ฝังในตัวเลขแท็บ 4 ต่างจากแท็บ 3: ถอดตามที่ฝังจริง ไม่ทำให้ TFC ติดลบ', () => {
    // แท็บ 4 ของ C ฝังส่วนแบ่งไว้แค่ 20k (แท็บ 3 = 50k) — ถอด 50k จะเหลือ TFC ติดลบ
    const o = allocateFaculty(
      { ...base, embedded: { id: 'c', amount: 20_000 } },
      {
        method: 'EQUAL_PROGRAM',
      },
    );

    expect(shareOf(o, 'c')?.before).toBe(20_000);
    expect(shareOf(o, 'c')?.adj).toBeCloseTo(333_333.33 - 20_000, 2);
    // หลักสูตรอื่นยังเทียบกับแท็บ 3 ตามรายงาน
    expect(shareOf(o, 'b')?.before).toBe(150_000);
  });
});
