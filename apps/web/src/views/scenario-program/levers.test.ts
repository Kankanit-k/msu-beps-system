import { describe, expect, it } from 'vitest';

import type { RevenueMode } from '@beps/calc-engine';

import { RAW } from '@/data/mockup';

import {
  applyLevers,
  blockFromProgram,
  blockResult,
  leversOf,
  leverTargets,
  type CostBlock,
  type Levers,
} from './newProgramCalc';

const MODES: RevenueMode[] = ['with_government', 'without_government'];
const profitOf = (base: CostBlock, l: Levers, m: RevenueMode) => {
  const r = blockResult(applyLevers(base, l), m);

  return r.tr - r.tc;
};

describe('applyLevers', () => {
  it('ค่าตั้งต้นได้ผลเท่าชีตทุกหลักสูตร', () => {
    for (const p of RAW.PROGS.filter((p) => p.Q > 0)) {
      const b = blockFromProgram(p);

      for (const m of MODES) {
        const a = blockResult(applyLevers(b, leversOf(b)), m);
        const s = blockResult(b, m);

        expect(a.tr).toBeCloseTo(s.tr, 4);
        expect(a.tc).toBeCloseTo(s.tc, 4);
        expect(a.qStar).toBe(s.qStar);
      }
    }
  });
});

describe('leverTargets', () => {
  it('ใช้ค่าที่แนะนำทางเดียวแล้วคุ้มทุน (กำไร ≥ 0) ทุกหลักสูตรที่ขาดทุน', () => {
    let checked = 0;

    for (const p of RAW.PROGS.filter((p) => p.Q > 0)) {
      const b = blockFromProgram(p);
      const l = leversOf(b);

      for (const m of MODES) {
        if (profitOf(b, l, m) >= 0) continue;
        const t = leverTargets(b, l, applyLevers(b, l), blockResult(applyLevers(b, l), m), m);

        if (t.fee !== null) expect(profitOf(b, { ...l, fee: t.fee }, m)).toBeGreaterThanOrEqual(-1e-6);
        if (t.q !== null) expect(profitOf(b, { ...l, q: t.q }, m)).toBeGreaterThanOrEqual(-1e-6);
        if (t.cut !== null) {
          expect(profitOf(b, { ...l, cut: t.cut }, m)).toBeGreaterThanOrEqual(-1e-6);
          // ขั้นต่ำจริง — ลดน้อยกว่านี้ 1% ยังขาดทุน
          if (t.cut > 0) expect(profitOf(b, { ...l, cut: t.cut - 1 }, m)).toBeLessThan(0);
        }
        checked++;
      }
    }

    expect(checked).toBeGreaterThan(0);
  });
});
