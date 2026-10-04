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

export const EDUCATION_LEVELS = ['ปริญญาตรี', 'ป.บัณฑิต', 'ปริญญาโท', 'ปริญญาเอก'];

/** ชื่อหลักสูตรซ้ำกันได้ในคณะเดียวกัน (คนละปริญญา) — ต่อท้ายชื่อปริญญาให้แยกแยะได้ในดรอปดาวน์ */
export const progOptionLabel = (p: ProgRow) => `${p.prog} — ${p.deg}`;
