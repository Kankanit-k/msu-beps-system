import { describe, expect, it } from 'vitest';

import { RAW } from '@/data/mockup/rawData';

import {
  changePct,
  COST_YEARS,
  cumulativeLoss,
  DD_PROGRAMS,
  DD_YEARS,
  decliningYears,
  lossStreak,
  statusOfDD,
} from './deepDiveData';

const i68 = DD_YEARS.indexOf(2568);

describe('ตัวชี้วัดย้อนหลัง', () => {
  it('นับขาดทุนติดต่อกันจากปีล่าสุดที่มีข้อมูล', () => {
    expect(lossStreak([1, -1, -2, -3, null])).toBe(3);
    expect(lossStreak([-1, -1, 5, -3, -1])).toBe(2);
    expect(lossStreak([null, null, null, null, -4])).toBe(1);
    expect(lossStreak([-1, null, -1, -1, 2])).toBe(0);
  });

  it('ขาดทุนสะสม · ลดลงต่อเนื่อง · % เปลี่ยน', () => {
    expect(cumulativeLoss([-2, 3, -1, null, 0])).toBe(3);
    expect(decliningYears([10, 9, 8, 7, null])).toBe(true);
    expect(decliningYears([10, 9, 9.5, 7, 6])).toBe(false);
    expect(changePct([null, 100, 80, null, 50])).toBe(-50);
  });
});

describe('ข้อมูลหมวดเจาะลึก', () => {
  it('ปีก่อนหลักสูตรเปิด (ทะเบียนเก็บเป็น 0) เป็น null — % เปลี่ยนนับจากปีแรกที่มีนิสิต', () => {
    const grown = DD_PROGRAMS.filter(
      (x) =>
        x.tuition[0] === null && x.tuition[i68] && x.tuition.filter((v) => v !== null).length >= 2,
    );

    expect(grown.length).toBeGreaterThan(0);
    grown.forEach((x) => expect(changePct(x.tuition)).not.toBeNull());
  });

  it('ปีที่ยังไม่มีต้นทุนเป็น null — ไม่มีตัวเลขประมาณ', () => {
    DD_PROGRAMS.forEach((x) =>
      DD_YEARS.forEach((y, i) => {
        if (COST_YEARS.includes(y)) return;
        expect(x.tc[i]).toBeNull();
        expect(x.gov[i]).toBeNull();
        expect(x.profit.with_government[i]).toBeNull();
      }),
    );
  });

  it('ปี 2568 ตรงกับชีต (RAW) และผลรวมทุกหลักสูตรเท่ากับยอดมหาวิทยาลัย', () => {
    const tc = DD_PROGRAMS.reduce((a, x) => a + (x.tc[i68] ?? 0), 0);
    const st = DD_PROGRAMS.reduce((a, x) => a + (x.gov[i68] ?? 0), 0);
    const tcAll = RAW.PROGS.reduce((a, p) => a + p.TC, 0);

    expect(tc).toBeCloseTo(tcAll, 0);
    expect(st).toBeCloseTo(
      RAW.PROGS.reduce((a, p) => a + p.st, 0),
      0,
    );
    DD_PROGRAMS.slice(0, 20).forEach((x) =>
      expect(x.profit.with_government[i68]).toBeCloseTo(x.p.st + x.p.own - x.p.TC, 0),
    );
  });

  it('ต้นทุนมีปีเดียว → ยังไม่มีหลักสูตรใดเป็น "วิกฤต"', () => {
    expect(DD_PROGRAMS.filter((x) => statusOfDD(x, 'with_government') === 'crisis')).toHaveLength(
      0,
    );
  });
});
