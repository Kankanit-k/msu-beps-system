/**
 * ตัวเลขรวมระดับมหาวิทยาลัย
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็น fetch จาก apps/api โดยหน้าจอไม่ต้องแก้
 *
 * **ตัวเลขทุกตัวที่คืนออกไปต้องผ่าน @beps/calc-engine** ไม่ใช่หยิบค่า TR/TC/Rin/Qin ที่
 * ฝังมากับ fixture มาใช้ตรงๆ — ค่าที่ฝังมาจาก prototype v8-1 ซึ่งปัดเศษผิดลำดับในบางแถว
 * (ดู src/data/fixtures/raw.parity.test.ts) calc-engine เป็นฝ่ายถูกเสมอ
 */
import { calcBreakEvenBothModes, DEFAULT_POLICY } from '@beps/calc-engine'
import type { BreakEvenResult, RevenueMode } from '@beps/calc-engine'

import { IS_SAMPLE_DATA, RAW } from '@/data/fixtures/raw'

export type UniversityTotals = {
  /** จำนวนนิสิตจริงทั้งมหาวิทยาลัย */
  q: number
  /** จำนวนคณะ/หน่วยงานที่นำมารวม */
  facultyCount: number
  /** จำนวนหลักสูตรที่นำมารวม */
  programCount: number
  /** ผลคำนวณทั้ง 2 ฐานรายได้ — หน้าจอสลับปุ่มบน navbar ได้โดยไม่ต้องคำนวณใหม่ */
  byMode: Record<RevenueMode, BreakEvenResult>
  /** สัดส่วนต้นทุนคงที่ต่อต้นทุนรวม (ร้อยละ) */
  fixedCostShare: number
  /** สัดส่วนต้นทุนผันแปรต่อต้นทุนรวม (ร้อยละ) */
  variableCostShare: number
  /** ค่าเสื่อมราคาที่รวมอยู่ใน TFC แล้ว — ใช้ระบุขนาดของช่องว่างในแถบเตือนข้อจำกัดข้อมูล */
  depreciation: number
  /** ต้นทุนคงที่ที่ผูกหลักสูตรได้โดยตรง (ส่วนหนึ่งของ TFC) */
  fixedCostProgram: number
  /** ต้นทุนคงที่จากสำนักงาน/ส่วนกลางที่ปันส่วนลงมา (ส่วนหนึ่งของ TFC) */
  fixedCostOffice: number
  /** เงินแผ่นดินทั้งมหาวิทยาลัย */
  governmentBudget: number
  /** เงินรายได้ทั้งมหาวิทยาลัย */
  incomeBudget: number
  /** true = ตัวเลขที่เห็นเป็นชุดตัวอย่าง ไม่ใช่ข้อมูลจริง */
  isSample: boolean
}

export const getUniversityTotals = (): UniversityTotals => {
  const u = RAW.UNI

  const byMode = calcBreakEvenBothModes(
    { q: u.Q, governmentBudget: u.st, incomeBudget: u.own, tfc: u.TFC, tvc: u.TVC },
    DEFAULT_POLICY
  )

  /* ต้นทุนเท่ากันทั้ง 2 ฐานรายได้เสมอ (สูตร 5 เปลี่ยนเฉพาะฝั่งรายได้)
     จึงหยิบสัดส่วน TFC:TVC จากฐานไหนก็ได้ */
  const { tc, tfc, tvc } = byMode.with_government

  return {
    q: u.Q,
    facultyCount: RAW.FACS.length,
    programCount: u.n,
    byMode,
    fixedCostShare: tc > 0 ? (tfc / tc) * 100 : 0,
    variableCostShare: tc > 0 ? (tvc / tc) * 100 : 0,
    depreciation: u.dep,
    fixedCostProgram: u.tfcProg,
    fixedCostOffice: u.tfcOffice,
    governmentBudget: u.st,
    incomeBudget: u.own,
    isSample: IS_SAMPLE_DATA
  }
}
