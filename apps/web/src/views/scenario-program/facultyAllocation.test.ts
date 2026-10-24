import { describe, expect, it } from 'vitest';

import {
  allocateFaculty,
  allocBuckets,
  DEFAULT_ALLOC_CHOICE,
  levelCapIssue,
  NEW_PROGRAM_ID,
  newProgramChoice,
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

    // แบ่งเฉพาะก้อน ป.ตรี 800k (แบบชีต) — 500 หัว → ใหม่ 100/500, A 400/500 · โท/เอกไม่ขยับ
    expect(shareOf(o, NEW_PROGRAM_ID)?.after).toBeCloseTo(160_000, 2);
    expect(shareOf(o, 'a')?.after).toBeCloseTo(640_000, 2);
    expect(shareOf(o, 'b')?.after).toBe(150_000);
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

  it('หารรายหัว = ตามชีต: ชีตแยกก้อนตามระดับก่อน อัตราต่อหัวต่างระดับจึงไม่เท่ากัน', () => {
    const sc: FacultyScenario = {
      pool: 1_000_000,
      programs: [
        { id: 'a', label: 'ตรี A', educationLevel: 'ปริญญาตรี', q: 300, sheetShare: 600_000 },
        { id: 'a2', label: 'ตรี A2', educationLevel: 'ปริญญาตรี', q: 100, sheetShare: 200_000 },
        { id: 'b', label: 'โท B', educationLevel: 'ปริญญาโท', q: 100, sheetShare: 150_000 },
        { id: 'c', label: 'เอก C', educationLevel: 'ปริญญาเอก', q: 25, sheetShare: 50_000 },
      ],
    };
    const o = allocateFaculty(sc, { method: 'PER_HEAD_FTES' });

    expect(o.shares.map((s) => s.after)).toEqual([600_000, 200_000, 150_000, 50_000]);
  });

  it('ปรับจำนวนนิสิตของหลักสูตรเดิม: ส่วนแบ่งขยับภายในระดับเดียวกัน', () => {
    const sc: FacultyScenario = {
      ...base,
      programs: [
        ...base.programs.slice(0, 1),
        { id: 'a2', label: 'ตรี A2', educationLevel: 'ปริญญาตรี', q: 0, sheetShare: 0 },
        ...base.programs.slice(1),
      ],
    };
    const o = allocateFaculty(
      { ...sc, qOverride: { id: 'a2', q: 100 } },
      { method: 'PER_HEAD_FTES' },
    );

    // ก้อน ป.ตรี 800k แบ่ง 400 + 100 หัว
    expect(shareOf(o, 'a2')?.after).toBeCloseTo(160_000, 2);
    expect(shareOf(o, 'a')?.after).toBeCloseTo(640_000, 2);
    expect(shareOf(o, 'b')?.after).toBe(150_000);
    expect(total(o.shares)).toBe(100_000_000);
  });

  it('หลักสูตรใหม่เปิดระดับที่คณะยังไม่มี: หารรายหัวทั้งคณะแทน', () => {
    const o = allocateFaculty(
      {
        ...base,
        newProgram: { label: 'ใหม่', educationLevel: 'ป.บัณฑิต', q: 100, sheetShare: 0 },
      },
      { method: 'PER_HEAD_FTES' },
    );

    // 600 หัว
    expect(shareOf(o, NEW_PROGRAM_ID)?.after).toBeCloseTo(166_666.67, 2);
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

describe('levelCapIssue (กำหนด % รายหลักสูตร คุมด้วย % รายระดับ)', () => {
  const sc: FacultyScenario = {
    ...base,
    programs: [
      ...base.programs,
      { id: 'a2', label: 'ตรี A2', educationLevel: 'ปริญญาตรี', q: 100, sheetShare: 0 },
    ],
  };
  const buckets = allocBuckets(sc, 'PROGRAM');
  const choice = (pct: Record<string, string>) => ({
    ...DEFAULT_ALLOC_CHOICE,
    method: 'CUSTOM_PCT' as const,
    bucketLevel: 'PROGRAM' as const,
    levelPct: { ปริญญาตรี: '90', ปริญญาโท: '5', ปริญญาเอก: '5' },
    pct,
  });

  it('หลักสูตรในระดับรวมเท่า % ของระดับ = ผ่าน', () => {
    expect(levelCapIssue(choice({ a: '60', a2: '30', b: '5', c: '5' }), buckets)).toBeNull();
  });

  it('ป.ตรี เกิน 90 แม้รวมทั้งคณะได้ 100 = ไม่ผ่าน', () => {
    expect(levelCapIssue(choice({ a: '70', a2: '25', b: '5', c: '0' }), buckets)).toMatch(/ปริญญาตรี/);
  });

  it('% รายระดับรวมไม่ครบ 100 = ไม่ผ่าน', () => {
    const c = { ...choice({ a: '60', a2: '30', b: '5', c: '5' }), levelPct: { ปริญญาตรี: '90' } };

    expect(levelCapIssue(c, buckets)).toMatch(/รายระดับ/);
  });

  it('วิธีอื่นไม่คุม', () => {
    expect(levelCapIssue(DEFAULT_ALLOC_CHOICE, buckets)).toBeNull();
  });
});

describe('newProgramChoice (เปิดหลักสูตรใหม่ตามวิธีที่คณะล็อก)', () => {
  // ตรี 2 หลักสูตร (a 60 · d 30 = ระดับ 90) · โท b 6 · เอก c 4
  const sc: FacultyScenario = {
    ...base,
    programs: [
      ...base.programs,
      { id: 'd', label: 'ตรี D', educationLevel: 'ปริญญาตรี', q: 200, sheetShare: 0 },
    ],
    newProgram: { label: 'ตรี ใหม่', educationLevel: 'ปริญญาตรี', q: 100, sheetShare: 0 },
  };
  const locked = {
    method: 'CUSTOM_PCT' as const,
    bucketLevel: 'PROGRAM' as const,
    subMethod: 'PER_HEAD_FTES' as const,
    pct: { a: '60', d: '30', b: '6', c: '4' },
    levelPct: { ปริญญาตรี: '90', ปริญญาโท: '6', ปริญญาเอก: '4' },
  };
  const buckets = allocBuckets(sc, 'PROGRAM');
  const num = (c: { pct: Record<string, string> }, k: string) => Number(c.pct[k]);

  it('วิธีอื่นไม่ปรับ', () => {
    const r = newProgramChoice(DEFAULT_ALLOC_CHOICE, buckets, 'a', 'ปริญญาตรี');

    expect(r.choice).toBe(DEFAULT_ALLOC_CHOICE);
    expect(r.note).toBeNull();
  });

  it('รายหลักสูตร: ได้ % เท่าหลักสูตรอ้างอิง แล้วย่อทั้งระดับให้รวมเท่า % ระดับที่ล็อก', () => {
    const { choice, note } = newProgramChoice(locked, buckets, 'd', 'ปริญญาตรี');
    const k = 90 / (90 + 30);

    expect(num(choice, 'a')).toBeCloseTo(60 * k, 3);
    expect(num(choice, 'd')).toBeCloseTo(30 * k, 3);
    expect(num(choice, NEW_PROGRAM_ID)).toBeCloseTo(30 * k, 3);
    expect(num(choice, 'a') + num(choice, 'd') + num(choice, NEW_PROGRAM_ID)).toBeCloseTo(90, 9);
    // ระดับอื่นไม่เปลี่ยน
    expect(choice.pct.b).toBe('6');
    expect(levelCapIssue(choice, buckets)).toBeNull();
    expect(note).toContain('หลักสูตรอ้างอิง');
    expect(allocateFaculty(sc, policyOf(choice, buckets)).applied).toBe(true);
  });

  it('ไม่มีหลักสูตรอ้างอิง: ได้ % ตามสัดส่วนนิสิตในระดับ', () => {
    const { choice } = newProgramChoice(locked, buckets, null, 'ปริญญาตรี');

    // ใหม่ 100 คน จากทั้งระดับ 700 คน → 90 × 100/700
    expect(num(choice, NEW_PROGRAM_ID)).toBeCloseTo((90 * 100) / 700, 3);
  });

  it('ระดับใหม่ที่คณะยังไม่มี % → ไม่ปรับ ปล่อยให้ engine แจ้ง', () => {
    const lone = allocBuckets({ ...sc, newProgram: { ...sc.newProgram!, educationLevel: 'ป.บัณฑิต' } }, 'PROGRAM');

    expect(newProgramChoice(locked, lone, 'a', 'ป.บัณฑิต').note).toBeNull();
  });
});
