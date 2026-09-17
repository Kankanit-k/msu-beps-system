/**
 * ชนิดข้อมูลของ `RAW` ใน rawData.ts — โครงเดียวกับ mockup/assets/data.sample.js
 * (ดู mockup/README.md หัวข้อ "รายการหน้าจอ" และ SA.md หัวข้อ 5 สำหรับที่มาของแต่ละฟิลด์)
 *
 * ตัวย่อ: Q = จำนวนนิสิตจริง, st = งบแผ่นดิน (หมวด 10), own = งบรายได้ (หมวด 20),
 * tfcProg/tfcOffice = ต้นทุนคงที่ทางตรง/ทางอ้อม, dep = ค่าเสื่อม, n = จำนวนหลักสูตร,
 * TR/TFC/TVC/TC = รายได้รวม/ต้นทุนคงที่รวม/ต้นทุนผันแปรรวม/ต้นทุนรวม,
 * Rin/Rex = รายได้ต่อหัว (ในแผน/นอกแผน), AVC = ต้นทุนผันแปรต่อหัว, Qin/Qex = จำนวนที่นั่งรับได้ (ในแผน/นอกแผน)
 */
export interface UniRow {
  Q: number;
  st: number;
  own: number;
  tfcProg: number;
  tfcOffice: number;
  dep: number;
  n: number;
  TR: number;
  TFC: number;
  TVC: number;
  TC: number;
  Rin: number;
  Rex: number;
  AVC: number;
  Qin: number;
  Qex: number;
}

export interface FacRow extends UniRow {
  name: string;
}

export interface DeptRow extends UniRow {
  /** ชื่อคณะที่สังกัด — จับคู่กับ FacRow.name */
  fac: string;
  /** ระดับการศึกษา เช่น ปริญญาตรี/ปริญญาโท */
  grp: string;
}

export interface ProgRow {
  fac: string;
  lvl: string;
  grp: string;
  prog: string;
  deg: string;
  /** จำนวนที่รับได้ตามแผน / นอกแผน */
  qT: number;
  qF: number;
  Q: number;
  st: number;
  own: number;
  TR: number;
  Rin: number;
  Rex: number;
  tfcProg: number;
  tfcOffice: number;
  dep: number;
  tvcProg: number;
  tvcOffice: number;
  /** สัดส่วนวิชาศึกษาทั่วไปที่ปันมาให้หลักสูตรนี้ */
  genEd: number;
  matchMain: number;
  matchUni: number;
  TFC: number;
  TVC: number;
  TC: number;
  AVC: number;
  Qin: number;
  Qex: number;
  /** margin ต่อหัว ในแผน/นอกแผน — ตัวเลข หรือรหัสสถานะ เช่น `"cm"` เมื่อคำนวณต่อหัวไม่ได้ (ดู QStarStatus) */
  mIn: number | string;
  mEx: number | string;
}

export interface RawData {
  UNI: UniRow;
  FACS: FacRow[];
  DEPTS: DeptRow[];
  PROGS: ProgRow[];
  /** true เสมอในไฟล์นี้ — ยืนยันว่าเป็นชุดข้อมูลตัวอย่าง (สุ่มรบกวนแล้ว) ไม่ใช่ของจริง */
  __sample: true;
}
