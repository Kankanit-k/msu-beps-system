/**
 * ข้อมูลหลัก 3 ชุดของ W17 — โครงสร้างหน่วยงาน · งวดปีงบประมาณ · ประเภทนิสิต
 *
 * ทั้งสามชุดถูกอ้างโดย **ทุกตารางที่เก็บตัวเลข** (`org_unit_id` · `period_id` ·
 * `program_version_id`) ถ้าตั้งผิดหรือแก้ย้อนหลัง ตัวเลขทั้งระบบจะเปลี่ยนตาม
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็น fetch จาก apps/api
 */
import { ORG_LEVEL_LABEL, ORG_UNITS, PERIODS, STUDENT_TYPES } from '@/data/fixtures/master-data'
import { RAW } from '@/data/fixtures/raw'

export type OrgLevel = keyof typeof ORG_LEVEL_LABEL

export type OrgUnit = {
  code: string
  name: string
  level: OrgLevel
  levelLabel: string
  /** ระยะเยื้องในตาราง — 0 มหาวิทยาลัย · 1 คณะ · 2 ระดับการศึกษา */
  depth: number
  parent: string | null
  /** true = หน่วยที่ผลิตบัณฑิต (is_academic) · false = หน่วยสนับสนุนที่ต้องปันต้นทุนออกให้หมด */
  isAcademic: boolean
  /** รหัสในระบบ ERP — null/ว่าง = ยังไม่ผูก จับคู่ต้นทุนจากต้นทางไม่ได้ */
  erpCode: string | null
  effectiveFrom: string
  status: string
}

const DEPTH: Record<OrgLevel, number> = { UNIVERSITY: 0, FACULTY: 1, EDUCATION_LEVEL: 2 }

export const getOrgUnits = (): OrgUnit[] =>
  ORG_UNITS.map(o => ({
    code: o.code,
    name: o.name,
    level: o.level as OrgLevel,
    levelLabel: ORG_LEVEL_LABEL[o.level as OrgLevel],
    depth: DEPTH[o.level as OrgLevel],
    parent: o.parent,
    isAcademic: o.academic,
    erpCode: o.erp || null,
    effectiveFrom: o.from,
    status: o.status
  }))

export type Period = {
  /** ปีงบประมาณ (ต.ค.–ก.ย.) — ต้นทุนมาเป็นปีนี้ */
  fiscalYear: number
  /** ปีการศึกษา — จำนวนนิสิตและค่าธรรมเนียมเป็นปีนี้ */
  academicYear: number
  start: string
  end: string
  /** วันตัดยอดนิสิต — null = ยังไม่กำหนด */
  snapshotDate: string | null
  /** กติกาว่านับนิสิตสถานะไหนเป็น Q */
  countingRule: string
  state: string
}

export const getPeriods = (): Period[] =>
  PERIODS.map(p => ({
    fiscalYear: p.fy,
    academicYear: p.ay,
    start: p.start,
    end: p.end,
    snapshotDate: p.snap,
    countingRule: p.rule,
    state: p.state
  }))

export type StudentTypeRow = {
  code: string
  /** ภาคปกติ / ภาคพิเศษ */
  group: string
  /** ไทย / ต่างชาติ */
  nationality: string
  count: number
  note: string
}

export const getStudentTypes = (): StudentTypeRow[] =>
  STUDENT_TYPES.map(s => ({ code: s.code, group: s.grp, nationality: s.nat, count: s.n, note: s.note }))

/**
 * ยอดรวมประเภทนิสิตต้องเท่ากับจำนวนนิสิตของงวดเสมอ
 *
 * fixture กระจายเศษด้วย largest-remainder ไว้แล้ว การตรวจนี้จึงเป็น **การยืนยัน**
 * ไม่ใช่การแก้ — ถ้าวันหนึ่งไม่ตรง แปลว่าข้อมูลต้นทางมีปัญหาจริง และตรวจยอดที่ W12 จะไม่ผ่าน
 */
export const getStudentTypeTotals = (): { sum: number; expected: number; matches: boolean } => {
  const sum = STUDENT_TYPES.reduce((acc, s) => acc + s.n, 0)
  const expected = RAW.UNI.Q

  return { sum, expected, matches: sum === expected }
}
