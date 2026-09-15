// Calc Imports
import { calcBreakEven, DEFAULT_POLICY } from '@beps/calc-engine'
import type { BreakEvenResult, RevenueMode } from '@beps/calc-engine'

// Type Imports
import type { TreeFaculty } from '@/server/beps/breakeven-tree'
import type { BreakEvenStatus } from '@/server/beps/status'

// Data Imports
import { breakEvenStatus } from '@/server/beps/status'

/**
 * คำนวณผลของทุกโหนดในต้นไม้ตามฐานรายได้ที่เลือกอยู่
 *
 * เรียก calcBreakEven ของ @beps/calc-engine โหนดละครั้ง (≈ 290 ครั้ง) ซึ่งเป็นการคำนวณ
 * เลขล้วนๆ ไม่กี่มิลลิวินาที — คุ้มกว่าการส่งผลคำนวณของทุกโหนดทั้ง 2 ฐานลงมาจาก server
 */

export type ComputedNode<T> = T & {
  result: BreakEvenResult
  status: BreakEvenStatus
}

export type ComputedProgram = ComputedNode<{
  key: string
  name: string
  degree: string
  level: string
}>

export type ComputedGroup = ComputedNode<{
  key: string
  name: string
  programCount: number
  programs: ComputedProgram[]
}>

export type ComputedFaculty = ComputedNode<{
  key: string
  name: string
  groups: ComputedGroup[]
}>

const compute = (input: Parameters<typeof calcBreakEven>[0]): BreakEvenResult => calcBreakEven(input, DEFAULT_POLICY)

export const computeTree = (faculties: TreeFaculty[], revenueMode: RevenueMode): ComputedFaculty[] =>
  faculties.map(faculty => {
    const facultyResult = compute({ ...faculty.input, revenueMode })

    return {
      key: faculty.key,
      name: faculty.name,
      result: facultyResult,
      status: breakEvenStatus(facultyResult),
      groups: faculty.groups.map(group => {
        const groupResult = compute({ ...group.input, revenueMode })

        return {
          key: group.key,
          name: group.name,
          programCount: group.programCount,
          result: groupResult,
          status: breakEvenStatus(groupResult),
          programs: group.programs.map(program => {
            const programResult = compute({ ...program.input, revenueMode })

            return {
              key: program.key,
              name: program.name,
              degree: program.degree,
              level: program.level,
              result: programResult,
              status: breakEvenStatus(programResult)
            }
          })
        }
      })
    }
  })

/** ทุกหลักสูตรในต้นไม้แบบแบน — ใช้ทำ KPI และข้อสังเกต */
export const flattenPrograms = (tree: ComputedFaculty[]): (ComputedProgram & { faculty: string })[] =>
  tree.flatMap(faculty =>
    faculty.groups.flatMap(group => group.programs.map(program => ({ ...program, faculty: faculty.name })))
  )
