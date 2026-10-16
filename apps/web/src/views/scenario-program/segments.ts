/**
 * ตารางสัดส่วนนิสิตรายกลุ่ม (แท็บ 4 คอลัมน์ X:AD) — ค่าตั้งต้นและการกระจายจำนวนนิสิต
 * ใช้ร่วมกันระหว่างหน้าคำนวณจุดคุ้มทุนรายหลักสูตรกับห้องจำลองแผนรับนิสิต
 */
import type { ProgRow } from '@/data/mockup';
import { feesForProgram } from '@views/tuition/feeData';

import { defaultYears, segmentLabels, type Segment } from './newProgramCalc';

/** เงินแผ่นดิน บาท/ภาค/คน ตั้งต้นตามแท็บ 4 (Y14) — ใส่ให้กลุ่มปกติไทย ปกติต่างชาติ และต่อเนื่อง */
export const DEFAULT_GOV_PER_SEM = 3550;

/** ตั้งต้นตารางสัดส่วนนิสิต: จำนวนนิสิตไทย/ต่างชาติจากหลักสูตรอ้างอิง · ค่าธรรมเนียมจากแท็บค่าธรรมเนียม68 */
export function buildSegments(level: string, ref: ProgRow | null, semesters: number): Segment[] {
  const fees = ref ? feesForProgram(ref.fac, ref.deg) : [];
  const inTime = fees.find((f) => f.mode === 'ในเวลา');
  const offTime = fees.find((f) => f.mode === 'นอกเวลา');
  const thaiReg = inTime?.rate ?? 18000;
  const fee = [
    thaiReg,
    offTime?.rate ?? 0,
    inTime?.rateIntl ?? 25000,
    offTime?.rateIntl ?? 0,
    thaiReg,
  ];
  const n = [ref?.qT ?? 0, 0, ref?.qF ?? 0, 0, 0];
  const years = defaultYears(level);

  return segmentLabels(level).map((label, i) => ({
    label,
    n: n[i]!,
    fee: fee[i]!,
    gov: i % 2 === 0 ? DEFAULT_GOV_PER_SEM : 0,
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
