// Type Imports
import type { RevenueMode } from '@beps/calc-engine'

import type { FacultyBreakEven } from '@/server/beps/faculties'

/**
 * แถวข้อมูลต่อหัวของคณะหนึ่ง — ประกอบจากผลที่ calc-engine คำนวณมาแล้ว
 *
 * ทำฝั่ง client เพราะผู้ใช้สลับฐานรายได้ได้ตลอดเวลา และเป็นแค่การหยิบค่าจาก
 * BreakEvenResult มาเรียง ไม่ได้คำนวณสูตรใหม่ (r · atc · avc · cm มาจาก calc-engine ครบแล้ว)
 */
export type PerHeadRow = {
  faculty: FacultyBreakEven
  /** รายได้ต่อหัว */
  r: number
  /** ต้นทุนรวมต่อหัว */
  atc: number
  /** ต้นทุนผันแปรต่อหัว */
  avc: number
  /** Contribution Margin ต่อหัว */
  cm: number
  /** ส่วนต่าง R − ATC — บวก = คุ้มต้นทุนต่อหัว */
  diff: number
}

export const toPerHeadRows = (faculties: FacultyBreakEven[], revenueMode: RevenueMode): PerHeadRow[] =>
  faculties.map(faculty => {
    const result = faculty.byMode[revenueMode]
    const r = result.r ?? 0
    const atc = result.atc ?? 0
    const avc = result.avc ?? 0

    return { faculty, r, atc, avc, cm: result.cm ?? 0, diff: r - atc }
  })
