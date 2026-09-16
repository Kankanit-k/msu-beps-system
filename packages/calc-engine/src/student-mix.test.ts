import { describe, expect, it } from 'vitest';
import { calcBreakEven } from './break-even';
import { DEFAULT_POLICY } from './policy';
import { calcStudentMixBreakEven } from './student-mix';
import type { StudentMixGroupInput } from './student-mix';

/** ตัวเลขชุดนี้อิงชีต `4.จุดคุ้มทุนหลักสูตร(ใหม่)` — ป.ตรี คณะมนุษยศาสตร์ฯ */
const TFC = 13_615_398.24;
const AVC = 16_745.81013;

const thaiNormal = (q: number): StudentMixGroupInput => ({
  key: 'normal-thai',
  label: 'ภาคปกติ (นิสิตไทย)',
  q,
  // 18,000 บ./ภาคเรียน × 2 ภาคเรียน
  revenuePerHead: 36_000,
});

const intlNormal = (q: number): StudentMixGroupInput => ({
  key: 'normal-intl',
  label: 'ภาคปกติ (นิสิตต่างชาติ)',
  q,
  // 25,000 บ./ภาคเรียน × 2 ภาคเรียน
  revenuePerHead: 50_000,
});

const mix = calcStudentMixBreakEven({
  groups: [thaiNormal(450), intlNormal(92)],
  tfc: TFC,
  avc: AVC,
});

describe('calcStudentMixBreakEven — แผนรับนิสิตปกติ', () => {
  it('รวมจำนวนนิสิตและรายได้จากทุกกลุ่ม', () => {
    expect(mix.qPlan).toBe(542);
    expect(mix.tr).toBeCloseTo(450 * 36_000 + 92 * 50_000, 6);
    expect(mix.tvc).toBeCloseTo(AVC * 542, 6);
    expect(mix.tc).toBeCloseTo(TFC + AVC * 542, 6);
  });

  it('สัดส่วนรวมได้ 1 และ R คือค่าเฉลี่ยถ่วงน้ำหนัก ไม่ใช่ค่าเฉลี่ยเลขคณิต', () => {
    expect(mix.groups.reduce((acc, group) => acc + group.share, 0)).toBeCloseTo(1, 12);
    expect(mix.groups.at(0)?.share).toBeCloseTo(450 / 542, 12);

    expect(mix.r as number).toBeCloseTo(mix.tr / 542, 6);
    // ค่าเฉลี่ยเลขคณิตของ 36,000 กับ 50,000 คือ 43,000 — ต้องไม่ใช่ค่านั้น
    expect(mix.r as number).toBeLessThan(43_000);
  });

  it('CM เฉลี่ยเท่ากับผลรวมของ CM รายกลุ่มถ่วงน้ำหนัก', () => {
    const weighted = mix.groups.reduce((acc, group) => acc + group.share * group.cmPerHead, 0);

    expect(mix.cm as number).toBeCloseTo(weighted, 6);
  });

  it('Q* ตรงกับสูตร 1 ที่คำนวณจากยอดรวมของแผนโดยตรง', () => {
    const direct = calcBreakEven(
      {
        q: mix.qPlan,
        governmentBudget: 0,
        incomeBudget: mix.tr,
        tfc: TFC,
        tvc: mix.tvc,
        revenueMode: 'without_government',
      },
      DEFAULT_POLICY,
    );

    expect(mix.qStar).toBe(direct.qStar);
    expect(mix.qStarStatus).toBe('normal');
  });

  it('โควตารายกลุ่มรวมกันได้เท่ากับ Q* รวมพอดี — ห้ามปัดขึ้นทีละกลุ่ม', () => {
    const sum = mix.groups.reduce((acc, group) => acc + (group.qStar ?? 0), 0);

    expect(sum).toBe(mix.qStar);
  });

  it('ส่วนต่างรายกลุ่มคือแผนรับลบโควตา และผลรวมเท่ากับส่วนต่างรวม', () => {
    const sum = mix.groups.reduce((acc, group) => acc + (group.diff ?? 0), 0);

    expect(sum).toBe(mix.diff);
    expect(mix.diff).toBe(mix.qPlan - (mix.qStar as number));
  });

  it('เพิ่มสัดส่วนกลุ่มค่าธรรมเนียมสูง แล้ว Q* ต้องลดลง', () => {
    const more = calcStudentMixBreakEven({
      groups: [thaiNormal(400), intlNormal(142)],
      tfc: TFC,
      avc: AVC,
    });

    expect(more.qPlan).toBe(mix.qPlan);
    expect(more.qStar as number).toBeLessThan(mix.qStar as number);
  });
});

describe('calcStudentMixBreakEven — กรณีขอบ', () => {
  it('แผนยังไม่มีนิสิต → ไม่มีสัดส่วน ไม่มี Q* และบอกสาเหตุ', () => {
    const empty = calcStudentMixBreakEven({
      groups: [thaiNormal(0), intlNormal(0)],
      tfc: TFC,
      avc: AVC,
    });

    expect(empty.r).toBeNull();
    expect(empty.cm).toBeNull();
    expect(empty.qStar).toBeNull();
    expect(empty.qStarStatus).toBe('not_computable');
    expect(empty.groups.every((group) => group.share === 0 && group.qStar === null)).toBe(true);
  });

  it('CM ≤ 0 → เดินเส้นทางสูตร 7 ตามนโยบาย และแยกสถานะให้ชัด', () => {
    const input = { groups: [thaiNormal(100)], tfc: TFC, avc: 40_000 };

    const recovery = calcStudentMixBreakEven(input, DEFAULT_POLICY);

    expect(recovery.cm as number).toBeLessThan(0);
    expect(recovery.qStarStatus).toBe('full_cost_recovery');
    expect(recovery.qStar).toBe(Math.ceil(recovery.tc / (recovery.r as number) - 1e-9));

    const strict = calcStudentMixBreakEven(input, {
      ...DEFAULT_POLICY,
      cmLeZeroPolicy: 'not_computable',
    });

    expect(strict.qStar).toBeNull();
    expect(strict.qStarStatus).toBe('not_computable');
  });

  it('จำนวนนิสิตติดลบถือเป็นศูนย์ — ไม่ให้ดึงสัดส่วนของกลุ่มอื่นเพี้ยน', () => {
    const dirty = calcStudentMixBreakEven({
      groups: [thaiNormal(-50), intlNormal(100)],
      tfc: TFC,
      avc: AVC,
    });

    expect(dirty.qPlan).toBe(100);
    expect(dirty.groups.at(0)?.q).toBe(0);
    expect(dirty.groups.at(1)?.share).toBe(1);
  });

  it('กระจายเศษแบบเศษมากได้ก่อน — ผลรวมโควตาคงที่แม้สัดส่วนหารไม่ลงตัว', () => {
    const three = calcStudentMixBreakEven({
      groups: [
        { key: 'a', label: 'a', q: 100, revenuePerHead: 36_000 },
        { key: 'b', label: 'b', q: 100, revenuePerHead: 36_000 },
        { key: 'c', label: 'c', q: 100, revenuePerHead: 36_000 },
      ],
      tfc: 1_000_000,
      avc: 10_000,
    });

    const quotas = three.groups.map((group) => group.qStar as number);

    expect(quotas.reduce((acc, n) => acc + n, 0)).toBe(three.qStar);
    // ต่างกันได้ไม่เกิน 1 คนเมื่อสัดส่วนเท่ากัน
    expect(Math.max(...quotas) - Math.min(...quotas)).toBeLessThanOrEqual(1);
  });
});
