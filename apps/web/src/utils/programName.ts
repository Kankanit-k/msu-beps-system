// ชื่อหลักสูตรสำหรับแสดงผลทั้งระบบ — แบบ "ปริญญาย่อ ชื่อสาขา" เช่น "บธ.บ. เทคโนโลยีสารสนเทศธุรกิจ"
// ใช้เฉพาะการแสดงผล · ห้ามใช้เป็นคีย์/ค่าที่บันทึก (คีย์ยังใช้ p.prog / progOptionLabel ตามเดิม)
import { RAW } from '@/data/mockup';
import type { ProgRow } from '@/data/mockup';
import { progDegreeLabel } from '@views/scenario-program/programData';

/** ชื่อปริญญาที่ขึ้นต้นด้วยอักษรย่อ เช่น "บธ.บ. ..." "ปร.ด. ..." "ศศ.บ.ภาษาญี่ปุ่น" */
const ABBR = /^((?:[ก-๙A-Za-z]+\.)+)\s*(\S.*)$/;

const norm = (s: string) => s.trim().replace(/\s+/g, ' ');

/** ชื่อปริญญาที่ซ้ำกันภายในคณะ (ชีตกรอกซ้ำ/ผิด) — ใช้ชื่อปริญญาไม่ได้ ต้องถอยไปใช้ชื่อหลักสูตร */
const DEG_COUNT = RAW.PROGS.reduce((m, p) => {
  const k = `${p.fac}|${norm(p.deg)}`;

  return m.set(k, (m.get(k) ?? 0) + 1);
}, new Map<string, number>());

/** ชื่อปริญญาแบบย่อของหลักสูตร หรือ null เมื่อใช้ไม่ได้ (ไม่มีอักษรย่อ / ซ้ำกับหลักสูตรอื่นในคณะ) */
const degreeName = (p: ProgRow) => {
  if ((DEG_COUNT.get(`${p.fac}|${norm(p.deg)}`) ?? 0) > 1) return null;
  const m = ABBR.exec(norm(progDegreeLabel(p)));

  return m ? `${m[1]} ${m[2]}` : null;
};

/** ชื่อหลักสูตรแบบเดิม — ระดับอื่นที่ไม่ใช่ปริญญาตรีต่อท้ายระดับ */
const legacyName = (p: ProgRow) =>
  p.lvl === 'ปริญญาตรี' ? norm(p.prog) : `${norm(p.prog)} (${p.lvl})`;

/** ชื่อหลักสูตรที่แสดงผล: ชื่อปริญญาย่อ (บอกระดับในตัว) · ถ้าใช้ไม่ได้ → ชื่อหลักสูตร (+ ระดับ) */
export const programName = (p: ProgRow) => degreeName(p) ?? legacyName(p);

/** บรรทัดรองใต้ชื่อ: ชื่อปริญญาเต็มเมื่อชื่อหลักถอยไปใช้ชื่อหลักสูตร · ชื่อหลักเป็นชื่อปริญญาอยู่แล้ว → ว่าง */
export const programSubtitle = (p: ProgRow) => (degreeName(p) ? '' : norm(p.deg));
