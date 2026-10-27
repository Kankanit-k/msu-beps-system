import { describe, expect, it } from 'vitest';

import { resolveClassification, type FacultyClassification } from './classStore';

const rec = (year: string, faculty = 'คณะ ก'): FacultyClassification => ({
  year,
  faculty,
  rows: { [`k${year}`]: { beh: 'TVC', f: 0 } },
  savedAt: '2026-01-01T00:00:00.000Z',
  savedBy: 'ทดสอบ',
});

describe('resolveClassification (มติ ตั้งค่าต้นทุน — ปีนี้ → ปีก่อน → ค่าตั้งต้น)', () => {
  it('ใช้ค่าที่คณะตั้งของปีนี้', () => {
    const r = resolveClassification(
      { '2568|คณะ ก': rec('2568'), '2567|คณะ ก': rec('2567') },
      '2568',
      'คณะ ก',
    );

    expect(r.source).toBe('config');
    expect(r.rows).toHaveProperty('k2568');
  });

  it('ยังไม่ตั้งปีนี้ → ยกค่าปีก่อนที่ใกล้ที่สุด', () => {
    const r = resolveClassification(
      { '2565|คณะ ก': rec('2565'), '2567|คณะ ก': rec('2567') },
      '2568',
      'คณะ ก',
    );

    expect(r.source).toBe('prev-year');
    expect(r.fromYear).toBe('2567');
  });

  it('ไม่ยกค่าปีถัดไปหรือคณะอื่น → ค่าตั้งต้น', () => {
    const r = resolveClassification(
      { '2569|คณะ ก': rec('2569'), '2567|คณะ ข': rec('2567', 'คณะ ข') },
      '2568',
      'คณะ ก',
    );

    expect(r).toEqual({ rows: {}, source: 'default' });
  });
});
