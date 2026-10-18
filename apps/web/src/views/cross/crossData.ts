// ตรรกะเตรียมข้อมูลสำหรับหน้า Cross Analysis & Heatmap (W5)
// พอร์ตจาก mockup/assets/page-cross.js โดยเปลี่ยนมาคำนวณจุดคุ้มทุนผ่าน @beps/calc-engine
// แทนสูตรคำนวณเองแบบ inline (ผลลัพธ์ตรงกันกับ mockup ทุกค่า)

import type { RevenueMode } from '@beps/calc-engine';

import { RAW } from '@/data/mockup';
import type { FacRow, ProgRow } from '@/data/mockup';
import { computeBreakEven, inLevel } from '@views/breakeven/calc';
import type { LevelScope } from '@views/breakeven/calc';

export const shortFacName = (name: string) =>
  name.replace('คณะ', '').replace('วิทยาลัย', 'วล.').replace('สถาบันวิจัย', 'สถ.');

export interface FacultyCrossRow {
  name: string;
  short: string;
  Q: number;
  qStar: number;
  valid: boolean;
  util: number;
  profitPct: number;
  R: number;
  AVC: number;
  ATC: number;
  CM: number;
  trM: number;
  profitM: number;
  avcRRatio: number; // 999 = ไม่มีค่า (R <= 0)
  tfcTcRatio: number;
  nProg: number;
  okProg: number;
  progOkRatio: number;
  isOk: boolean;
}

/** นับหลักสูตรที่ "ถึงจุดคุ้มทุน" ของคณะหนึ่ง — ok เฉพาะกรณี CM > 0 และ Q ถึง Q* (สอดคล้อง mockup: status()==='ok') */
function programOkCount(facName: string, mode: RevenueMode) {
  const progs = RAW.PROGS.filter((p) => p.fac === facName);
  const ok = progs.filter((p) => {
    const r = computeBreakEven(p, mode);

    // Q* ติดลบแบบชีต (รายได้/หัว ≤ ผันแปร/หัว) ไม่นับเป็นคุ้มทุน
    return r.qStar !== null && r.qStar > 0 && p.Q >= r.qStar;
  }).length;

  return { total: progs.length, ok };
}

/** แถวตัวชี้วัดของคณะหรือหลักสูตรหนึ่ง — Q* แบบชีต (คณะ = ผลบวก Q* รายหลักสูตร) ผ่าน computeBreakEven — nProg/okProg = จำนวนหลักสูตรทั้งหมด/ที่คุ้มทุน */
function toCrossRow(
  row: FacRow | ProgRow,
  name: string,
  mode: RevenueMode,
  prog: { total: number; ok: number },
) {
  const res = computeBreakEven(row, mode);
  const valid = res.qStarStatus === 'normal' && res.qStar !== null && res.qStar > 0;
  const qStar = valid ? (res.qStar as number) : 0;
  const util = valid ? Math.round((row.Q / qStar) * 100) : 0;
  const R = res.r ?? 0;
  const { total, ok } = prog;

  return {
    name,
    short: shortFacName(name),
    Q: row.Q,
    qStar,
    valid,
    util,
    profitPct: Math.round((res.profitPct ?? 0) * 10) / 10,
    R: Math.round(R),
    AVC: Math.round(res.avc ?? 0),
    ATC: Math.round(res.atc ?? 0),
    CM: Math.round(res.cm ?? 0),
    trM: res.tr / 1e6,
    profitM: res.profit / 1e6,
    avcRRatio: R > 0 ? Math.round(((res.avc ?? 0) / R) * 1000) / 10 : 999,
    tfcTcRatio: res.tc > 0 ? Math.round((res.tfc / res.tc) * 1000) / 10 : 0,
    nProg: total,
    okProg: ok,
    progOkRatio: total ? Math.round((ok / total) * 100) : 0,
    isOk: valid ? row.Q >= qStar : false,
  };
}

export function buildCrossData(mode: RevenueMode): FacultyCrossRow[] {
  return RAW.FACS.map((f) => toCrossRow(f, f.name, mode, programOkCount(f.name, mode)));
}

/** ชื่อหลักสูตร — ปริญญาตรีแสดงชื่ออย่างเดียว ระดับอื่นต่อท้ายด้วยระดับ */
const progName = (p: ProgRow) => (p.lvl === 'ปริญญาตรี' ? p.prog : `${p.prog} (${p.lvl})`);

/** รายหลักสูตรของคณะเดียว (ผู้ดูแลคณะ/อาจารย์) — ไม่นับหลักสูตรที่ไม่มีนิสิต · เรียงตามนิสิตจริงมากไปน้อย */
export function buildProgramCrossData(
  fac: string,
  level: LevelScope,
  mode: RevenueMode,
): FacultyCrossRow[] {
  return RAW.PROGS.filter((p) => p.fac === fac && p.Q > 0 && inLevel(p, level))
    .sort((a, b) => b.Q - a.Q)
    .map((p) => {
      const row = toCrossRow(p, progName(p), mode, { total: 1, ok: 0 });
      const ok = row.isOk ? 1 : 0;

      return { ...row, short: row.name, okProg: ok, progOkRatio: ok * 100 };
    });
}
