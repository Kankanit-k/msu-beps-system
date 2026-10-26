/**
 * ตารางสัดส่วนนิสิตรายกลุ่ม (แท็บ 4 คอลัมน์ X:AD) — ค่าตั้งต้นและการกระจายจำนวนนิสิต
 * ใช้ร่วมกันระหว่างหน้าคำนวณจุดคุ้มทุนรายหลักสูตรกับห้องจำลองแผนรับนิสิต
 */
import type { ProgRow } from '@/data/mockup';
import { feesForProgram } from '@views/tuition/feeData';

import { defaultYears, isForeignSeg, segmentLabels, type Segment } from './newProgramCalc';

/** เงินแผ่นดิน บาท/ภาค/คน ตั้งต้นตามแท็บ 4 (Y14) — ใส่ให้กลุ่มปกติไทย และเทียบเข้า */
export const DEFAULT_GOV_PER_SEM = 3550;

/**
 * ตั้งต้นตารางสัดส่วนนิสิต: จำนวนนิสิตไทย/ต่างชาติจากหลักสูตรอ้างอิง · ค่าธรรมเนียมจากแท็บค่าธรรมเนียม68
 * ค่าธรรมเนียมใส่เฉพาะกลุ่มที่มีอัตรา — ไม่มี (เช่น ปร.ด. วิศวกรรมเครื่องกล ไม่มีในเวลา, เทียบเข้า) เว้นว่าง (0)
 */
export function buildSegments(level: string, ref: ProgRow | null, semesters: number): Segment[] {
  const fees = ref ? feesForProgram(ref.fac, ref.deg) : [];
  const inTime = fees.find((f) => f.mode === 'ในเวลา');
  const offTime = fees.find((f) => f.mode === 'นอกเวลา');
  const fee = [inTime?.rate, offTime?.rate, inTime?.rateIntl, offTime?.rateIntl, null];
  // หลักสูตรที่มีอัตราเฉพาะนอกเวลา — นิสิตอยู่กลุ่มนอกเวลา
  const offOnly = !inTime && !!offTime;
  const qT = ref?.qT ?? 0;
  const qF = ref?.qF ?? 0;
  const n = offOnly ? [0, qT, 0, qF, 0] : [qT, 0, qF, 0, 0];
  const years = defaultYears(level);

  return segmentLabels(level).map((label, i) => ({
    label,
    n: n[i]!,
    fee: fee[i] ?? 0,
    // ปกติ/ในเวลาไทย และเทียบเข้า ได้เงินแผ่นดิน · พิเศษ/นอกเวลา และนิสิตต่างชาติไม่ได้
    gov: i % 2 === 0 && !isForeignSeg(i) ? DEFAULT_GOV_PER_SEM : 0,
    semesters,
    years: i === 4 ? 2 : years,
  }));
}

/**
 * กระจายจำนวนนิสิตรวมใหม่ลงแต่ละกลุ่มตามสัดส่วนเดิม (ปัดแบบเศษมากสุดได้ก่อน ให้รวมได้ q พอดี)
 * ยังไม่มีนิสิตในกลุ่มไหนเลย → ใส่ทั้งหมดที่กลุ่มแรก
 */
export function scaleSegs(segs: Segment[], q: number): Segment[] {
  const total = segs.reduce((a, x) => a + x.n, 0);

  if (total === q) return segs;
  if (total <= 0) return segs.map((x, i) => ({ ...x, n: i === 0 ? q : 0 }));

  const raw = segs.map((x) => (x.n * q) / total);
  const n = raw.map(Math.floor);
  let left = q - n.reduce((a, v) => a + v, 0);

  raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => {
      if (left > 0) {
        n[i]!++;
        left--;
      }
    });

  return segs.map((x, i) => ({ ...x, n: n[i]! }));
}

/** ผลรวมต่อปีของตารางสัดส่วน — จำนวนนิสิต เงินรายได้ (ค่าธรรมเนียม) เงินแผ่นดิน (นิสิตต่างชาติไม่ได้) */
export function segTotals(segs: Segment[]) {
  return segs.reduce(
    (t, s, i) => ({
      q: t.q + s.n,
      income: t.income + s.fee * s.n * s.semesters,
      gov: t.gov + (isForeignSeg(i) ? 0 : s.gov * s.n * s.semesters),
    }),
    { q: 0, income: 0, gov: 0 },
  );
}

/**
 * ปรับอัตรารายกลุ่มให้ผลรวมเท่า income/gov โดยคูณทุกกลุ่มด้วยตัวคูณเดียวกัน — ส่วนต่างอัตราระหว่างกลุ่ม
 * (เช่น ต่างชาติแพงกว่าไทย) คงเดิม · กลุ่มที่มีนิสิตยังไม่มีอัตราเลย → ใส่อัตราเฉลี่ยเท่ากันทุกกลุ่มที่มีนิสิต
 */
export function fitSegs(
  segs: Segment[],
  income: number,
  gov: number,
  fillMissing = false,
): Segment[] {
  // กลุ่มที่มีนิสิตแต่ไม่มีค่าธรรมเนียม (เช่น แท็บค่าธรรมเนียมไม่มีอัตราต่างชาติ) → ใช้อัตราเฉลี่ยของกลุ่มที่มีอัตรา
  // ไม่งั้นกลุ่มอื่นรับรายได้แทนทั้งหมด · ทำเฉพาะตอนตั้งต้น (fillMissing) — ผู้ใช้ตั้ง 0 เองภายหลังต้องคงไว้
  // เงินแผ่นดินไม่เติม — กลุ่มพิเศษ/นอกเวลาไม่ได้เงินแผ่นดินโดยนโยบาย
  const rated = segs.filter((s) => s.n > 0 && s.fee > 0);
  const units = rated.reduce((a, s) => a + s.n * s.semesters, 0);
  const avgFee = units > 0 ? rated.reduce((a, s) => a + s.fee * s.n * s.semesters, 0) / units : 0;

  if (fillMissing) segs = segs.map((s) => (s.n > 0 && s.fee <= 0 ? { ...s, fee: avgFee } : s));
  const fit = (key: 'fee' | 'gov', target: number, skip: (i: number) => boolean) => {
    const base = segs.reduce((a, s, i) => (skip(i) ? a : a + s[key] * s.n * s.semesters), 0);
    const units = segs.reduce((a, s, i) => (skip(i) ? a : a + s.n * s.semesters), 0);

    return (s: Segment, i: number) =>
      skip(i)
        ? 0
        : base > 0
          ? s[key] * (target / base)
          : s.n > 0 && units > 0
            ? target / units
            : s[key];
  };
  const fee = fit('fee', income, () => false);
  const gv = fit('gov', gov, isForeignSeg);

  return segs.map((s, i) => ({ ...s, fee: fee(s, i), gov: gv(s, i) }));
}
