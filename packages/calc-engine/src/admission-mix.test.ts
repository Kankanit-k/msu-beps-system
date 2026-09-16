import { describe, expect, it } from 'vitest';
import {
  calcAdmissionMix,
  resolveHeadcount,
  solveAdmissionTarget,
  type AdmissionMixInput,
  type AdmissionMixRow,
} from './admission-mix';
import { DEFAULT_POLICY } from './policy';

/**
 * ชุดอ้างอิงจากแผง `X9:AD22` ของชีต `4.จุดคุ้มทุนหลักสูตร(ใหม่)`
 * คณะมนุษยศาสตร์ฯ · ปริญญาตรี · อ้างอิง "การสร้างสรรค์คอนเทนต์และนวัตกรรมสื่อดิจิทัล"
 *
 * TFC = E17 · AVC = E40 = TVC(9,729,315.686) ÷ Q(581)
 */
const EXCEL_TFC = 13_615_398.24;
const EXCEL_AVC = 9_729_315.686 / 581;

const excelRows: AdmissionMixRow[] = [
  {
    studentTypeCode: 'TH_REG',
    label: 'ปกติ (นิสิตไทย)',
    plan: { basis: 'headcount', headcount: 450 },
    feePerTerm: 18_000,
    governmentPerTerm: 3_550,
    termsPerYear: 2,
  },
  {
    studentTypeCode: 'INT_REG',
    label: 'ปกติ (นิสิตต่างชาติ)',
    plan: { basis: 'headcount', headcount: 92 },
    feePerTerm: 25_000,
    governmentPerTerm: 3_550,
    termsPerYear: 2,
  },
];

const excelInput: AdmissionMixInput = {
  rows: excelRows,
  tfc: EXCEL_TFC,
  variableCostPerHead: EXCEL_AVC,
  revenueMode: 'with_government',
};

describe('resolveHeadcount — แผนการรับ 2 แบบ', () => {
  it('basis headcount ใช้ค่าที่ให้มาตรงๆ', () => {
    expect(resolveHeadcount({ basis: 'headcount', headcount: 450 })).toBe(450);
  });

  it('basis intake แปลงเป็นจำนวนคงค้าง = รับต่อปี × จำนวนปี', () => {
    expect(resolveHeadcount({ basis: 'intake', intakePerYear: 40, durationYears: 4 })).toBe(160);
  });

  it('หลักสูตรต่อเนื่อง 2 ปี ไม่ต้องมีเคสพิเศษ — ใส่ durationYears 2', () => {
    expect(resolveHeadcount({ basis: 'intake', intakePerYear: 40, durationYears: 2 })).toBe(80);
  });
});

describe('calcAdmissionMix — เทียบชีต 4 แผงวิเคราะห์สัดส่วน (golden)', () => {
  const out = calcAdmissionMix(excelInput);
  const [thai, inter] = out.rows;

  it('สัดส่วนหัวนิสิตตรงกับ Y11/AA11', () => {
    expect(thai?.share).toBeCloseTo(0.830_258_302_6, 10);
    expect(inter?.share).toBeCloseTo(0.169_741_697_4, 10);
    expect((thai?.share ?? 0) + (inter?.share ?? 0)).toBeCloseTo(1, 12);
  });

  it('รายได้รายประเภทตรงกับ Y18/AA18/AD18', () => {
    expect(thai?.revenue).toBe(19_395_000);
    expect(inter?.revenue).toBe(5_253_200);
    expect(out.total.tr).toBe(24_648_200);
  });

  it('TFC ที่ปันส่วนตรงกับ Y19/AA19 และรวมกลับได้ TFC เดิมพอดี', () => {
    expect(thai?.allocatedTfc).toBeCloseTo(11_304_297.43, 2);
    expect(inter?.allocatedTfc).toBeCloseTo(2_311_100.81, 2);
    expect((thai?.allocatedTfc ?? 0) + (inter?.allocatedTfc ?? 0)).toBeCloseTo(EXCEL_TFC, 6);
  });

  it('TVC รายประเภทตรงกับ Y20/AA20', () => {
    expect(thai?.tvc).toBeCloseTo(7_535_614.56, 2);
    expect(inter?.tvc).toBeCloseTo(1_540_614.53, 2);
  });

  it('ส่วนเกินรายประเภทตรงกับ Y22/AA22/AD22', () => {
    expect(thai?.contribution).toBeCloseTo(555_088.01, 2);
    expect(inter?.contribution).toBeCloseTo(1_401_484.66, 2);
    expect(out.total.profit).toBeCloseTo(1_956_572.67, 2);
  });

  it('AVC ทุกประเภทเท่ากัน ตรงกับ AD21 ของชีต', () => {
    expect(thai?.avc).toBeCloseTo(16_745.81, 2);
    expect(inter?.avc).toBeCloseTo(16_745.81, 2);
  });
});

describe('calcAdmissionMix — สิ่งที่ชีต Excel ทำผิดแล้วที่นี่แก้', () => {
  it('ส่วนเกิน (contribution) กับจุดคุ้มทุน (qStar) เป็นคนละฟิลด์', () => {
    const [thai] = calcAdmissionMix(excelInput).rows;
    // ชีตแถว 22 ตั้งชื่อว่า "จุดคุ้มทุนของหลักสูตร" แต่ค่าที่ได้คือส่วนเกิน
    expect(thai?.contribution).toBeCloseTo(555_088.01, 2);
    // จุดคุ้มทุนจริงของส่วนที่ปันมา = 11,304,297.43 ÷ (43,100 − 16,745.81)
    expect(thai?.qStar).toBe(429);
    expect(thai?.qStarStatus).toBe('normal');
  });

  it('ฐานรายได้ใช้ revenueMode ชุดเดียวกันทุกประเภท ไม่ใช่บวกเงินแผ่นดินเฉพาะคอลัมน์แรก', () => {
    const out = calcAdmissionMix({ ...excelInput, revenueMode: 'without_government' });
    const [thai, inter] = out.rows;
    expect(thai?.revenuePerHead).toBe(36_000); // 18,000 × 2 เทอม ไม่มีเงินแผ่นดิน
    expect(inter?.revenuePerHead).toBe(50_000); // 25,000 × 2 เทอม ไม่มีเงินแผ่นดิน
    expect(out.total.tr).toBe(20_800_000);
  });

  it('ตัดเงินแผ่นดินออกแล้วหลักสูตรนี้พลิกเป็นขาดทุน', () => {
    const withGov = calcAdmissionMix(excelInput);
    const withoutGov = calcAdmissionMix({ ...excelInput, revenueMode: 'without_government' });
    expect(withGov.total.profit).toBeGreaterThan(0);
    expect(withoutGov.total.profit).toBeLessThan(0);
  });

  it('จำนวนเทอมต่อปีมีผลจริง ไม่ใช่ค่าที่ไม่มีใครอ้างถึงแบบ C5 ในชีต', () => {
    const oneTerm = calcAdmissionMix({
      ...excelInput,
      rows: excelRows.map((row) => ({ ...row, termsPerYear: 1 })),
    });
    expect(oneTerm.total.tr).toBe(24_648_200 / 2);
  });
});

describe('calcAdmissionMix — ผลรวมต้องมาจากสูตรชุดเดียวกับหน้าอื่น', () => {
  it('Q* รวมคำนวณจากรายได้ต่อหัวแบบผสม', () => {
    const { total } = calcAdmissionMix(excelInput);
    expect(total.q).toBe(542);
    expect(total.r).toBeCloseTo(45_476.38, 2);
    expect(total.cm as number).toBeCloseTo(28_730.57, 2);
    expect(total.qStar).toBe(474);
    expect(total.qStarStatus).toBe('normal');
  });

  it('TVC รวมผันไปตามจำนวนนิสิตที่จำลอง ไม่ใช่ค่าคงที่ที่ยกมาจากหลักสูตรอ้างอิง', () => {
    const doubled = calcAdmissionMix({
      ...excelInput,
      rows: excelRows.map((row) => ({
        ...row,
        plan: { basis: 'headcount', headcount: resolveHeadcount(row.plan) * 2 } as const,
      })),
    });
    expect(doubled.total.q).toBe(1084);
    expect(doubled.total.tvc).toBeCloseTo(EXCEL_AVC * 1084, 6);
    // TFC ไม่ขยับตามจำนวนนิสิต — นั่นคือนิยามของต้นทุนคงที่
    expect(doubled.total.tfc).toBe(EXCEL_TFC);
  });

  it('ไม่มีนิสิตเลย → สัดส่วนเป็น 0 ทุกแถว และ Q* รวมคำนวณไม่ได้', () => {
    const empty = calcAdmissionMix({
      ...excelInput,
      rows: excelRows.map((row) => ({
        ...row,
        plan: { basis: 'headcount', headcount: 0 } as const,
      })),
    });
    expect(empty.rows.every((row) => row.share === 0)).toBe(true);
    expect(empty.total.qStar).toBeNull();
    expect(empty.total.qStarStatus).toBe('not_computable');
  });

  it('เคารพนโยบาย qstar_rounding เหมือนทุกฟังก์ชันในแพ็กเกจ', () => {
    const rounded = calcAdmissionMix(excelInput, { ...DEFAULT_POLICY, qStarRounding: 'round' });
    expect(rounded.total.qStar).toBe(474);
    expect(rounded.rows[0]?.qStar).toBe(429);
  });
});

describe('calcAdmissionMix — การตรวจอินพุต', () => {
  it('ไม่มีแถวเลย → โยน error ไม่ใช่คืน 0 เงียบๆ', () => {
    expect(() => calcAdmissionMix({ ...excelInput, rows: [] })).toThrow(/อย่างน้อย 1 ประเภท/);
  });

  it('ประเภทนิสิตซ้ำ → โยน error', () => {
    expect(() =>
      calcAdmissionMix({ ...excelInput, rows: [excelRows[0]!, { ...excelRows[0]! }] }),
    ).toThrow(/ซ้ำกัน/);
  });
});

describe('solveAdmissionTarget — goal seek', () => {
  it('ตรึงนิสิตไทย 450 คน ต้องรับต่างชาติ 44 คนจึงคุ้มทุน', () => {
    const out = solveAdmissionTarget(excelInput, 'INT_REG');
    expect(out.status).toBe('normal');
    expect(out.requiredHeadcount).toBe(44);
    expect(out.plannedHeadcount).toBe(92);
    expect(out.gap).toBe(48);
  });

  it('คำตอบไม่ขึ้นกับจำนวนของประเภทเป้าหมายที่กรอกไว้ในแผน', () => {
    const asPlanned = solveAdmissionTarget(excelInput, 'INT_REG');
    const withOtherPlan = solveAdmissionTarget(
      {
        ...excelInput,
        rows: [
          excelRows[0]!,
          { ...excelRows[1]!, plan: { basis: 'headcount', headcount: 5 } as const },
        ],
      },
      'INT_REG',
    );
    expect(withOtherPlan.requiredHeadcount).toBe(asPlanned.requiredHeadcount);
    expect(withOtherPlan.gap).toBe(5 - 44);
  });

  it('รับตามที่ goal seek บอกแล้วผลรวมต้องไม่ขาดทุน และน้อยกว่านั้นหนึ่งคนต้องขาดทุน', () => {
    const at = (headcount: number) =>
      calcAdmissionMix({
        ...excelInput,
        rows: [excelRows[0]!, { ...excelRows[1]!, plan: { basis: 'headcount', headcount } }],
      }).total.profit;
    expect(at(44)).toBeGreaterThanOrEqual(0);
    expect(at(43)).toBeLessThan(0);
  });

  it('ประเภทอื่นคุ้มทุนอยู่แล้ว → ไม่ต้องรับเพิ่ม', () => {
    const out = solveAdmissionTarget(
      {
        ...excelInput,
        rows: [{ ...excelRows[0]!, plan: { basis: 'headcount', headcount: 900 } }, excelRows[1]!],
      },
      'INT_REG',
    );
    expect(out.status).toBe('already_break_even');
    expect(out.requiredHeadcount).toBe(0);
  });

  it('รายได้ต่อหัวไม่เกิน AVC → รับเท่าไหร่ก็ไม่คุ้ม', () => {
    const out = solveAdmissionTarget(
      {
        ...excelInput,
        rows: [excelRows[0]!, { ...excelRows[1]!, feePerTerm: 1_000, governmentPerTerm: 0 }],
      },
      'INT_REG',
    );
    expect(out.status).toBe('unreachable');
    expect(out.requiredHeadcount).toBeNull();
    expect(out.gap).toBeNull();
  });

  it('ไม่มีประเภทที่ขอใน rows → โยน error', () => {
    expect(() => solveAdmissionTarget(excelInput, 'TH_SPECIAL')).toThrow(/ไม่พบประเภทนิสิต/);
  });
});
