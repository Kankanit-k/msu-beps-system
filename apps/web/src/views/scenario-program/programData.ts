// จัดกลุ่ม RAW.PROGS ตามคณะ สำหรับ dropdown "เลือกคณะ → เลือกหลักสูตร" — พอร์ตจาก PG_DATA ใน page-scenario-program.js
import { RAW } from '@/data/mockup';
import type { ProgRow } from '@/data/mockup';

export interface FacultyProgramGroup {
  faculty: string;
  programs: ProgRow[];
}

export const PG_DATA: FacultyProgramGroup[] = (() => {
  const map = new Map<string, ProgRow[]>();

  RAW.PROGS.forEach((p) => {
    const arr = map.get(p.fac) ?? [];

    arr.push(p);
    map.set(p.fac, arr);
  });

  return [...map.entries()].map(([faculty, programs]) => ({ faculty, programs }));
})();

export const EDUCATION_LEVELS = ['ปริญญาตรี', 'ป.บัณฑิต', 'ปริญญาโท', 'ปริญญาเอก', 'ประกาศนียบัตร'];

/** ชื่อหลักสูตรซ้ำกันได้ในคณะเดียวกัน (คนละปริญญา) — ต่อท้ายชื่อปริญญาให้แยกแยะได้ในดรอปดาวน์ */
export const progOptionLabel = (p: ProgRow) => `${p.prog} — ${p.deg}`;

/** ปริญญาของระดับนั้น — ใช้เลือกปริญญาหลักของหลักสูตร 2 ปริญญา */
const LEVEL_DEGREE: Record<string, RegExp> = {
  ปริญญาตรี: /\.บ\.|(?<!มหา)บัณฑ/,
  ปริญญาโท: /\.ม\.?\s|มหาบัณฑ/,
  ปริญญาเอก: /\.ด\./,
};

/**
 * ชื่อปริญญาสำหรับตาราง — หลักสูตร 2 ปริญญา ("ก และ ข (หลักสูตร 2 ปริญญา)")
 * แสดงปริญญาตามระดับการศึกษาของหลักสูตรก่อน แล้วต่อปริญญาที่ 2 ท้าย: "วท.บ. ฟิสิกส์ + วท.ม ฟิสิกส์"
 */
export function progDegreeLabel(p: ProgRow) {
  const deg = p.deg.trim();

  if (!/2\s*ปริญญา/.test(deg) || !deg.includes(' และ ')) return deg;
  const parts = deg
    .replace(/\(\s*หลักสูตร\s*2\s*ปริญญา\s*\)/, '')
    .split(' และ ')
    .map((s) => s.trim());
  const main = parts.findIndex((s) => LEVEL_DEGREE[p.lvl]?.test(s));

  if (main > 0) parts.unshift(...parts.splice(main, 1));

  return parts.join(' + ');
}
