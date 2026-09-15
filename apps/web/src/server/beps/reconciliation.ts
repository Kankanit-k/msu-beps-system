/**
 * ผลตรวจยอดและที่มาของตัวเลข (W12)
 *
 * หน้านี้ตอบคำถามเดียว — **ตัวเลขที่ผู้บริหารเห็น มาจากข้อมูลจริงกี่ % และปันส่วนมากี่ %**
 * ถ้าไม่มีชั้นนี้ ตัวเลขที่ปันส่วนมาจะดูเหมือนตัวเลขจริงทุกประการ
 *
 * ⚠️ ข้อจำกัดของ fixture — สัดส่วน "ปันส่วน" รายคณะใช้ `tfcOffice` (ต้นทุนสำนักงาน
 * เลขานุการที่ปันลงหลักสูตร) เป็นตัวแทน ระบบจริงต้องอ่านจาก `cost_allocation_line.method`
 * (mockup ระบุข้อจำกัดนี้ไว้เองในหมายเหตุสำหรับผู้พัฒนา)
 */
import { RECON_METHODS } from '@/data/fixtures/master-data'
import { RAW } from '@/data/fixtures/raw'
import { shortOrgName } from '@/utils/beps-format'

export type AllocationMethod = {
  label: string
  amount: number
  /** สีประจำวิธี — ค่าจาก fixture ใช้เป็น fallback เมื่อ palette ยังไม่พร้อม */
  color: string
  /** true = เป็นต้นทุนที่ต้องปันส่วน · false = ผูกหลักสูตรได้โดยตรง */
  isAllocated: boolean
  note: string
}

export const getAllocationMethods = (): AllocationMethod[] =>
  RECON_METHODS.map(m => ({ label: m.l, amount: m.v, color: m.c, isAllocated: m.alloc, note: m.note }))

export type FacultySourceMix = {
  name: string
  shortName: string
  /** ต้นทุนที่ผูกหลักสูตรได้โดยตรง */
  direct: number
  /** ต้นทุนที่ปันส่วนลงมา */
  allocated: number
  tc: number
  /** สัดส่วนที่ปันส่วน (ร้อยละ) — ยิ่งสูง ตัวเลขยิ่งอ่อนไหวต่อการเปลี่ยนกติกา */
  allocatedShare: number
}

export const getFacultySourceMix = (): FacultySourceMix[] =>
  RAW.FACS.map(f => {
    const allocated = f.tfcOffice
    const tc = f.TC

    return {
      name: f.name,
      shortName: shortOrgName(f.name),
      direct: tc - allocated,
      allocated,
      tc,
      allocatedShare: tc > 0 ? (allocated / tc) * 100 : 0
    }
  }).sort((a, b) => b.allocatedShare - a.allocatedShare)

/** ระดับความเชื่อมั่นของตัวเลขคณะหนึ่ง — ยิ่งพึ่งการปันส่วนมาก ยิ่งเชื่อได้น้อย */
export const confidenceOf = (allocatedShare: number): { label: string; color: 'success' | 'warning' | 'error' } =>
  allocatedShare < 25
    ? { label: 'สูง', color: 'success' }
    : allocatedShare < 45
      ? { label: 'ปานกลาง', color: 'warning' }
      : { label: 'ต่ำ', color: 'error' }
