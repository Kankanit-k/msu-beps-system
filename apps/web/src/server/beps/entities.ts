/**
 * รายการ "หน่วยวิเคราะห์" ที่เลือกได้ใน W3 — มหาวิทยาลัย · คณะ · คณะ×ระดับ · หลักสูตร
 *
 * ชั้นนี้คืน **ค่าตั้งต้น** (Q · เงินแผ่นดิน · เงินรายได้ · TFC · TVC) ไม่ใช่ผลคำนวณ
 * เพราะหน้าจอ W3 ให้ผู้ใช้สลับหน่วยได้ทันทีจาก 300 กว่าหน่วย ถ้าส่งผลคำนวณของทุกหน่วย
 * ทั้ง 2 ฐานรายได้ลงไปจะกลายเป็นก้อนใหญ่โดยไม่จำเป็น — ฝั่งจอเรียก `calcBreakEven`
 * จาก @beps/calc-engine กับหน่วยที่เลือกอยู่หน่วยเดียว (เครื่องคำนวณตัวเดียวกับฝั่ง server)
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็น fetch จาก apps/api
 */
import { RAW } from '@/data/fixtures/raw'
import type { BepsProgram } from '@/data/fixtures/raw'

/** ลำดับระดับการศึกษาที่ใช้เรียง dropdown — ยกจาก LVL_ORDER ใน mockup/assets/page-chart.js:7 */
export const LEVEL_ORDER = ['ปริญญาตรี', 'ประกาศนียบัตร', 'ป.บัณฑิต', 'ปริญญาโท', 'ปริญญาเอก']

const levelRank = (level: string): number => {
  const index = LEVEL_ORDER.indexOf(level)

  return index < 0 ? 99 : index
}

/** ค่าตั้งต้นที่ calc-engine ต้องการ (ไม่รวม revenueMode ซึ่งฝั่งจอเป็นคนเลือก) */
export type EntityInput = {
  q: number
  governmentBudget: number
  incomeBudget: number
  tfc: number
  tvc: number
}

export type EntityKind = 'university' | 'faculty' | 'faculty_level' | 'program'

export type BreakEvenEntity = {
  kind: EntityKind
  /** คีย์ที่ไม่ซ้ำกันทั้งระบบ ใช้เป็นค่าใน dropdown */
  id: string
  /** ชื่อเต็มที่แสดงบนหัวสรุป */
  name: string
  /** ชื่อสั้นที่ใช้ใน dropdown */
  shortName: string
  faculty?: string
  level?: string
  /** จำนวนหลักสูตรที่รวมอยู่ในหน่วยนี้ */
  programCount?: number
  input: EntityInput
}

const sum = (rows: BepsProgram[], pick: (p: BepsProgram) => number): number =>
  rows.reduce((acc, row) => acc + (Number(pick(row)) || 0), 0)

export type EntityCatalog = {
  university: BreakEvenEntity
  faculties: BreakEvenEntity[]
  /** คณะ × ระดับการศึกษา — รวมจากหลักสูตรจริง (RAW.DEPTS จัดกลุ่มแค่ ตรี/บัณฑิตศึกษา จึงหยาบไป) */
  facultyLevels: BreakEvenEntity[]
  programs: BreakEvenEntity[]
}

export const getBreakEvenEntities = (): EntityCatalog => {
  const u = RAW.UNI

  const university: BreakEvenEntity = {
    kind: 'university',
    id: 'uni',
    name: 'มหาวิทยาลัยมหาสารคาม (รวมทุกคณะ)',
    shortName: 'มหาวิทยาลัย (รวม)',
    programCount: u.n,
    input: { q: u.Q, governmentBudget: u.st, incomeBudget: u.own, tfc: u.TFC, tvc: u.TVC }
  }

  const faculties: BreakEvenEntity[] = RAW.FACS.map(f => ({
    kind: 'faculty',
    id: `fac:${f.name}`,
    name: f.name,
    shortName: f.name,
    faculty: f.name,
    programCount: f.n,
    input: { q: f.Q, governmentBudget: f.st, incomeBudget: f.own, tfc: f.TFC, tvc: f.TVC }
  }))

  const facultyLevels: BreakEvenEntity[] = []

  for (const faculty of RAW.FACS) {
    const levels = [...new Set(RAW.PROGS.filter(p => p.fac === faculty.name).map(p => p.lvl))].sort(
      (a, b) => levelRank(a) - levelRank(b)
    )

    for (const level of levels) {
      const rows = RAW.PROGS.filter(p => p.fac === faculty.name && p.lvl === level)

      facultyLevels.push({
        kind: 'faculty_level',
        id: `dep:${faculty.name}|${level}`,
        name: `${faculty.name} — ${level} (รวม ${rows.length} หลักสูตร)`,
        shortName: level,
        faculty: faculty.name,
        level,
        programCount: rows.length,
        input: {
          q: sum(rows, p => p.Q),
          governmentBudget: sum(rows, p => p.st),
          incomeBudget: sum(rows, p => p.own),
          tfc: sum(rows, p => p.TFC),
          tvc: sum(rows, p => p.TVC)
        }
      })
    }
  }

  const programs: BreakEvenEntity[] = RAW.PROGS.map((p, index) => ({
    kind: 'program',
    id: `prog:${index}`,
    name: `${p.fac} — ${p.prog} (${p.lvl})`,
    shortName: p.prog,
    faculty: p.fac,
    level: p.lvl,
    programCount: 1,
    input: { q: p.Q, governmentBudget: p.st, incomeBudget: p.own, tfc: p.TFC, tvc: p.TVC }
  }))

  return { university, faculties, facultyLevels, programs }
}
