/**
 * ตัวเลขระดับคณะ — ชั้นเดียวที่หน้าจอระดับคณะเรียก
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็น fetch จาก apps/api
 * สูตรทั้งหมดมาจาก @beps/calc-engine เท่านั้น (ดูเหตุผลใน university.ts)
 *
 * คืนผล **ทั้ง 2 ฐานรายได้** เสมอ เพราะปุ่มสลับฐานอยู่บน navbar ซึ่งเป็น state ฝั่ง client
 * ถ้าคืนมาฐานเดียวจะต้องยิงขอข้อมูลใหม่ทุกครั้งที่กดปุ่ม
 */
import { calcBreakEvenBothModes, DEFAULT_POLICY } from '@beps/calc-engine'
import type { BreakEvenResult, RevenueMode } from '@beps/calc-engine'

import { RAW } from '@/data/fixtures/raw'
import { shortOrgName } from '@/utils/beps-format'

export type FacultyBreakEven = {
  name: string
  /** ชื่อที่ตัดคำนำหน้าออกแล้ว — ใช้บนแกนกราฟและในตารางแคบๆ */
  shortName: string
  q: number
  /** จำนวนหลักสูตร */
  programCount: number
  /** เงินแผ่นดิน */
  governmentBudget: number
  /** เงินรายได้ */
  incomeBudget: number
  /** ต้นทุนคงที่ที่ผูกหลักสูตรได้โดยตรง */
  fixedCostProgram: number
  /** ต้นทุนคงที่จากสำนักงาน/ส่วนกลางที่ปันส่วนลงมา */
  fixedCostOffice: number
  /** ค่าเสื่อมราคา (รวมอยู่ใน TFC แล้ว) */
  depreciation: number
  byMode: Record<RevenueMode, BreakEvenResult>
}

export const getFaculties = (): FacultyBreakEven[] =>
  RAW.FACS.map(f => ({
    name: f.name,
    shortName: shortOrgName(f.name),
    q: f.Q,
    programCount: f.n,
    governmentBudget: f.st,
    incomeBudget: f.own,
    fixedCostProgram: f.tfcProg,
    fixedCostOffice: f.tfcOffice,
    depreciation: f.dep,
    byMode: calcBreakEvenBothModes(
      { q: f.Q, governmentBudget: f.st, incomeBudget: f.own, tfc: f.TFC, tvc: f.TVC },
      DEFAULT_POLICY
    )
  }))

/**
 * จำนวนนิสิตขั้นต่ำที่ถือว่าหน่วยนั้น "เทียบต่อหัว" ได้อย่างมีความหมาย
 *
 * ยกค่ามาจาก OUTLIER_MIN_Q ใน mockup/assets/core.js:37 — หน่วยที่มีนิสิตน้อยกว่านี้
 * (เช่น สถาบันวิจัยที่มีนิสิต 4 คน) จะได้ ATC สูงจนกราฟอ่านไม่ได้ทั้งใบ จึงกันออกจาก
 * **กราฟ** แต่ยังต้องอยู่ใน **ตาราง** และในข้อสังเกตเสมอ — ไม่ใช่การซ่อนข้อมูล
 */
export const OUTLIER_MIN_Q = 30
