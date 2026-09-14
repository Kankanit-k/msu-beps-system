/**
 * ชุดข้อมูลตัวอย่างของ BEPS — ย้ายมาจาก mockup/assets/data.sample.js ตรงตัว
 *
 * ตัวเลขถูกสุ่มรบกวนแล้วจาก make-data-sample.mjs ความสัมพันธ์ระหว่างสูตรยังถูกต้อง
 * แต่ **ห้ามนำไปอ้างอิง** เป็นตัวเลขจริงของมหาวิทยาลัย — ชุดจริงไม่ขึ้น git (ดู .gitignore)
 *
 * ทุกหน้าจอต้องอ่านผ่าน src/server/beps/* ไม่ใช่ import ไฟล์นี้ตรงๆ เพื่อให้สลับไปอ่าน
 * จาก apps/api ได้ในภายหลังโดยหน้าจอไม่ต้องแก้ (ดูแผน Phase 2/4)
 */
import data from './raw.data.json'

/** ตัวเลขร่วมของทุกระดับ (มหาวิทยาลัย · คณะ · คณะ×ระดับ) */
export type BepsAggregate = {
  /** จำนวนนิสิต */
  Q: number
  /** เงินแผ่นดิน (state) */
  st: number
  /** เงินรายได้ (own) */
  own: number
  /** ต้นทุนคงที่ที่ผูกหลักสูตรได้โดยตรง */
  tfcProg: number
  /** ต้นทุนคงที่จากสำนักงาน/ส่วนกลางที่ปันส่วนลงมา */
  tfcOffice: number
  /** ค่าเสื่อมราคา (รวมอยู่ใน TFC แล้ว) */
  dep: number
  /** จำนวนหลักสูตร */
  n: number
  /** รายได้รวม */
  TR: number
  /** ต้นทุนคงที่รวม */
  TFC: number
  /** ต้นทุนผันแปรรวม */
  TVC: number
  /** ต้นทุนรวม */
  TC: number
  /** รายได้ต่อหัว — ฐานรวมเงินแผ่นดิน */
  Rin: number
  /** รายได้ต่อหัว — ฐานไม่รวมเงินแผ่นดิน */
  Rex: number
  /** ต้นทุนผันแปรต่อหัว */
  AVC: number
  /** จุดคุ้มทุน (คน) — ฐานรวมเงินแผ่นดิน */
  Qin: number
  /** จุดคุ้มทุน (คน) — ฐานไม่รวมเงินแผ่นดิน */
  Qex: number
}

export type BepsFaculty = BepsAggregate & { name: string }

/** คณะ × ระดับการศึกษา */
export type BepsDept = BepsAggregate & { fac: string; grp: string }

export type BepsProgram = {
  fac: string
  lvl: string
  grp: string
  prog: string
  deg: string
  qT: number
  qF: number
  Q: number
  st: number
  own: number
  TR: number
  Rin: number
  Rex: number
  tfcProg: number
  tfcOffice: number
  dep: number
  tvcProg: number
  tvcOffice: number
  genEd: number
  matchMain: number
  matchUni: number
  TFC: number
  TVC: number
  TC: number
  AVC: number
  Qin: number
  Qex: number
  /** วิธีหา Q* ที่ใช้จริง — ฐานรวมเงินแผ่นดิน ('normal' | 'fcr' = full cost recovery) */
  mIn: string
  /** วิธีหา Q* ที่ใช้จริง — ฐานไม่รวมเงินแผ่นดิน */
  mEx: string
}

export type BepsRaw = {
  UNI: BepsAggregate
  FACS: BepsFaculty[]
  DEPTS: BepsDept[]
  PROGS: BepsProgram[]
}

export const RAW: BepsRaw = data as BepsRaw

/**
 * true = กำลังใช้ชุดตัวอย่าง ไม่ใช่ข้อมูลจริง
 *
 * mockup ใช้ธงนี้ขึ้นแบนเนอร์สีแดงเตือนผู้ใช้ (core.js:262) — ต้องคงไว้ เพราะถ้าวันหนึ่ง
 * สลับไปอ่านจาก apps/api แล้วลืมปิดธง จะได้เห็นทันทีว่าตัวเลขบนจอยังเป็นของปลอม
 */
export const IS_SAMPLE_DATA = true
