import { describe, expect, it } from 'vitest';

import { DEFAULT_ALLOC_CHOICE, type AllocChoice } from '@views/scenario-program/facultyAllocation';

import { resolveFacultyPolicy, type FacultyLock } from './lockStore';

const EQUAL: AllocChoice = { ...DEFAULT_ALLOC_CHOICE, method: 'EQUAL_PROGRAM' };
const PCT: AllocChoice = { ...DEFAULT_ALLOC_CHOICE, method: 'CUSTOM_PCT', pct: { x: '100' } };
const rec = (year: string, choice: AllocChoice): FacultyLock => ({
  year,
  faculty: 'คณะ ก',
  choice,
  lockedAt: '2026-01-01T00:00:00.000Z',
  lockedBy: 'ทดสอบ',
});
const always = () => true;

describe('resolveFacultyPolicy (มติ 25 ต.ค. — ปีนี้ → ปีก่อน → ตาม Excel)', () => {
  it('ใช้ค่าที่คณะตั้งของปีนี้', () => {
    const l = resolveFacultyPolicy({ '2568|คณะ ก': rec('2568', EQUAL) }, '2568', 'คณะ ก', always);

    expect(l.source).toBe('config');
    expect(l.choice.method).toBe('EQUAL_PROGRAM');
  });

  it('ยังไม่ตั้งปีนี้ → ใช้ปีก่อนที่ใกล้ที่สุด', () => {
    const store = { '2566|คณะ ก': rec('2566', PCT), '2567|คณะ ก': rec('2567', EQUAL) };
    const l = resolveFacultyPolicy(store, '2568', 'คณะ ก', always);

    expect(l.source).toBe('prev-year');
    expect(l.fromYear).toBe('2567');
    expect(l.year).toBe('2568');
    expect(l.submitLock).toBeUndefined();
  });

  it('ไม่ดูปีหลังจากปีที่คำนวณ และไม่ปนคณะอื่น', () => {
    const store = {
      '2569|คณะ ก': rec('2569', EQUAL),
      '2567|คณะ ข': { ...rec('2567', EQUAL), faculty: 'คณะ ข' },
    };

    expect(resolveFacultyPolicy(store, '2568', 'คณะ ก', always).source).toBe('default');
  });

  it('ไม่เคยตั้ง → หารรายหัวตามระดับ (= Excel)', () => {
    const l = resolveFacultyPolicy({}, '2568', 'คณะ ก', always);

    expect(l.source).toBe('default');
    expect(l.choice).toEqual(DEFAULT_ALLOC_CHOICE);
    expect(l.prevInvalidYear).toBeUndefined();
  });

  it('ค่าปีก่อนใช้กับปีนี้ไม่ได้ → ตาม Excel + บอกปีที่ใช้ไม่ได้', () => {
    const l = resolveFacultyPolicy(
      { '2567|คณะ ก': rec('2567', PCT) },
      '2568',
      'คณะ ก',
      () => false,
    );

    expect(l.source).toBe('default');
    expect(l.prevInvalidYear).toBe('2567');
  });
});
