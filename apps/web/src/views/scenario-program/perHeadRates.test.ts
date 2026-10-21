import { describe, expect, it } from 'vitest';

import { RAW } from '@/data/mockup';

import {
  UNI_SHARE_RATE,
  blockFromProgram,
  blockResult,
  withPerHeadCharges,
  withUniShare,
} from './newProgramCalc';

describe('อัตราหักสมทบที่ตั้งค่าได้ (หน้าตั้งค่าระบบ)', () => {
  it('อัตราตามชีต × Q × 2 ภาค = ตัวเลขชีตทุกหลักสูตร — ยังไม่อนุมัติอัตราใหม่ ผลไม่เปลี่ยน', () => {
    for (const p of RAW.PROGS) {
      const b = blockFromProgram(p);

      expect(withUniShare(b, 2, UNI_SHARE_RATE).uniShare).toBeCloseTo(p.matchUni, 0);
    }
  });

  it('อนุมัติอัตราใหม่ → ต้นทุนผันแปรเพิ่มตามส่วนต่าง × Q × 2 และ Q* ไม่ลดลง', () => {
    const p = RAW.PROGS.find((x) => x.prog === 'วิศวกรรมเครื่องกล' && x.lvl === 'ปริญญาตรี')!;
    const b = blockFromProgram(p);
    const before = blockResult(withUniShare(b, 2, UNI_SHARE_RATE), 'with_government');
    const after = blockResult(withUniShare(b, 2, 2500), 'with_government');

    expect(before.qStar).toBe(268);
    expect(after.tvc - before.tvc).toBeCloseTo((2500 - UNI_SHARE_RATE) * p.Q * 2, 0);
    expect(after.qStar!).toBeGreaterThanOrEqual(before.qStar!);
  });

  it('กรอกต้นทุนเอง: ใช้อัตราที่ส่งมา', () => {
    const b = withPerHeadCharges({ ...blockFromProgram(RAW.PROGS[0]!), q: 10 }, 2, {
      mainFee: 3000,
      uniShare: 2500,
    });

    expect(b.mainFee).toBe(60000);
    expect(b.uniShare).toBe(50000);
  });
});
