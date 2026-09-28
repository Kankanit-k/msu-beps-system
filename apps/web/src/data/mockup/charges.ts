/**
 * เงินสมทบ + ค่าใช้จ่าย GE ที่หักตาม "อัตรา × จำนวนนิสิต" (SA.md FR-10, FR-11, FR-12)
 *
 * ข้อควรระวังเชิงวิธีการ — ยอดเหล่านี้ **ถูกนับเป็นต้นทุนผันแปรอยู่แล้ว** ใน `TVC`
 * (ยืนยันจาก db/01_schema.sql ตาราง `per_student_charge`: "คิดเป็นอัตรา × จำนวนนิสิต
 * จึงเป็น direct variable cost ไม่ต้องปันส่วน" และ MethodView ที่ระบุว่า TVC รวม
 * ค่าธรรมเนียมรายการหลัก + หักสมทบมหาวิทยาลัย) โมดูลนี้เพียง **ดึงออกมาแสดง**
 * เป็นข้อมูลประกอบเท่านั้น ไม่ได้หักซ้ำ และไม่กระทบ TR / TC / ส่วนเกิน / Q* ใดๆ
 *
 * ข้อมูลดิบมีเฉพาะระดับหลักสูตร (`ProgRow.matchUni` / `matchMain` / `genEd`)
 * ระดับคณะจึงต้องรวมขึ้นมาเองที่นี่ — ตรวจแล้วว่าผลรวม `own` ของ PROGS ตรงกับ
 * `RAW.UNI.own` พอดี จึงรวมขึ้นได้โดยไม่มีหลักสูตรตกหล่น
 */
import { RAW } from './rawData';

export interface PerStudentCharges {
  /** เงินสมทบมหาวิทยาลัย (FR-12) */
  uni: number;
  /** เงินสมทบค่าธรรมเนียมรายการหลัก (FR-11) */
  main: number;
  /** ค่าใช้จ่ายวิชาศึกษาทั่วไป (FR-10) — แยกไว้ ไม่นับรวมเป็นเงินสมทบ */
  genEd: number;
  /** เงินสมทบรวม = uni + main */
  total: number;
}

const EMPTY: PerStudentCharges = { uni: 0, main: 0, genEd: 0, total: 0 };

const byFaculty = new Map<string, PerStudentCharges>();

for (const p of RAW.PROGS) {
  const acc = byFaculty.get(p.fac) ?? { ...EMPTY };

  acc.uni += p.matchUni;
  acc.main += p.matchMain;
  acc.genEd += p.genEd;
  acc.total = acc.uni + acc.main;
  byFaculty.set(p.fac, acc);
}

/** เงินสมทบของคณะหนึ่ง — คืนศูนย์เมื่อคณะนั้นไม่มีหลักสูตรในชุดข้อมูล */
export const chargesOf = (facName: string): PerStudentCharges => byFaculty.get(facName) ?? EMPTY;

/** รวมเงินสมทบของหลายคณะ ใช้กับขอบเขตที่ถูกกรอง */
export const sumCharges = (facNames: readonly string[]): PerStudentCharges =>
  facNames.reduce<PerStudentCharges>((acc, name) => {
    const c = chargesOf(name);

    return {
      uni: acc.uni + c.uni,
      main: acc.main + c.main,
      genEd: acc.genEd + c.genEd,
      total: acc.total + c.total,
    };
  }, EMPTY);
