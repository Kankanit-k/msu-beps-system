import { describe, expect, it } from 'vitest';

import type { Segment } from './newProgramCalc';
import { fitSegs, segTotals } from './segments';

const seg = (n: number, fee: number, gov: number): Segment => ({
  label: '',
  n,
  fee,
  gov,
  semesters: 2,
  years: 4,
});

describe('ตาราง ③ ซิงก์กับการ์ด ②', () => {
  // ไทย 250 คน 15,000 · ต่างชาติ 2 คน 50,000 (ต่างชาติไม่ได้เงินแผ่นดิน)
  const segs = [
    seg(250, 15000, 7232),
    seg(0, 0, 0),
    seg(2, 50000, 7232),
    seg(0, 0, 0),
    seg(0, 0, 0),
  ];

  it('ผลรวมต่อปี — ไม่นับเงินแผ่นดินของต่างชาติ', () => {
    expect(segTotals(segs)).toEqual({ q: 252, income: 7_700_000, gov: 250 * 7232 * 2 });
  });

  it('แก้ค่าธรรมเนียมในการ์ด ② → ทุกกลุ่มปรับสัดส่วนเท่ากัน ผลรวมตรง', () => {
    const fit = fitSegs(segs, 7_700_000 * 1.1, 3_600_000);
    const t = segTotals(fit);

    expect(t.income).toBeCloseTo(8_470_000);
    expect(t.gov).toBeCloseTo(3_600_000);
    expect(fit[2]!.fee / fit[0]!.fee).toBeCloseTo(50000 / 15000);
    expect(fit[2]!.gov).toBe(0);
  });

  it('กลุ่มที่มีนิสิตยังไม่มีอัตรา → อัตราเฉลี่ยเท่ากัน', () => {
    const fit = fitSegs(
      [seg(100, 0, 0), seg(0, 0, 0), seg(20, 0, 0), seg(0, 0, 0), seg(0, 0, 0)],
      3_600_000,
      0,
    );

    expect(fit[0]!.fee).toBe(15000);
    expect(fit[2]!.fee).toBe(15000);
    expect(fit[1]!.fee).toBe(0);
  });

  it('ต่างชาติไม่มีอัตรา → ได้อัตราเฉลี่ยของกลุ่มที่มีอัตรา ไม่ใช่ 0', () => {
    const fit = fitSegs(
      [seg(0, 0, 0), seg(19, 37000, 0), seg(0, 0, 0), seg(2, 0, 0), seg(0, 0, 0)],
      1_670_000,
      0,
      true,
    );

    expect(fit[3]!.fee).toBeCloseTo(fit[1]!.fee);
    expect(segTotals(fit).income).toBeCloseTo(1_670_000);
  });
});
