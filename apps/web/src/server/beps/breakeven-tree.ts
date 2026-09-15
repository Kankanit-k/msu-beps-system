/**
 * ต้นไม้จุดคุ้มทุน 3 ระดับ (คณะ → ระดับการศึกษา → หลักสูตร) สำหรับ W2
 *
 * คืน **ค่าตั้งต้น** ของทุกโหนดเหมือน entities.ts ไม่ใช่ผลคำนวณ เพราะหน้าจอต้องรู้สถานะ
 * ของทั้ง 230 หลักสูตรเพื่อกรอง/ค้นหา และผู้ใช้สลับฐานรายได้ได้ตลอดเวลา — ส่งผลคำนวณ
 * ครบทั้ง 2 ฐานของทุกโหนดจะกลายเป็นก้อนใหญ่โดยไม่จำเป็น ฝั่งจอเรียก calcBreakEven
 * จาก @beps/calc-engine (เครื่องคำนวณตัวเดียวกับฝั่ง server) กับฐานที่กำลังดูอยู่ฐานเดียว
 *
 * การจัดกลุ่มระดับกลางใช้ `grp` (ปริญญาตรี / บัณฑิตศึกษา) ตรงกับ RAW.DEPTS ที่ prototype
 * ใช้ — ไม่ใช่ `lvl` 5 ระดับที่ W3 ใช้ เพราะ W2 ต้องการ 3 ชั้นพอดีตามที่ SA.md §9 กำหนด
 */
import { RAW } from '@/data/fixtures/raw'
import type { EntityInput } from './entities'

export type TreeProgram = {
  key: string
  name: string
  /** ชื่อปริญญา เช่น วท.บ. เคมี */
  degree: string
  /** ระดับการศึกษา 5 ระดับ */
  level: string
  input: EntityInput
}

export type TreeLevelGroup = {
  key: string
  /** ปริญญาตรี | บัณฑิตศึกษา */
  name: string
  programCount: number
  input: EntityInput
  programs: TreeProgram[]
}

export type TreeFaculty = {
  key: string
  name: string
  input: EntityInput
  groups: TreeLevelGroup[]
}

const inputOf = (o: { Q: number; st: number; own: number; TFC: number; TVC: number }): EntityInput => ({
  q: o.Q,
  governmentBudget: o.st,
  incomeBudget: o.own,
  tfc: o.TFC,
  tvc: o.TVC
})

export const getBreakEvenTree = (): TreeFaculty[] =>
  RAW.FACS.map(faculty => ({
    key: faculty.name,
    name: faculty.name,
    input: inputOf(faculty),
    groups: RAW.DEPTS.filter(dept => dept.fac === faculty.name).map(dept => {
      const programs = RAW.PROGS.filter(p => p.fac === faculty.name && p.grp === dept.grp)

      return {
        key: `${faculty.name}||${dept.grp}`,
        name: dept.grp,
        programCount: dept.n,
        input: inputOf(dept),
        programs: programs.map((p, index) => ({
          key: `${faculty.name}||${dept.grp}||${index}`,
          name: p.prog,
          degree: p.deg,
          level: p.lvl,
          input: inputOf(p)
        }))
      }
    })
  }))
