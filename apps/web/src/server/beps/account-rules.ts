/**
 * กติกาจำแนกต้นทุนคงที่ / ผันแปร ตามผังบัญชี (W14)
 *
 * กติกาผูกกับ **คีย์ผสม 4 ระดับ** (แผนงาน · หมวดงบ · หมวดรายจ่าย · หมวดย่อย)
 * ไม่ใช่รหัสหมวดรายจ่ายอย่างเดียว เพราะรหัสเดียวกันเป็นคนละประเภทได้เมื่ออยู่คนละแผนงาน
 * — `80001 เงินอุดหนุน` ในแผนงานจัดการศึกษาเป็นคนละประเภทกับในแผนงานวิจัย
 *
 * ทุกกติกามี **ช่วงปีที่มีผล** เปลี่ยนปีใหม่แล้วตัวเลขปีเก่าไม่เปลี่ยนตาม (run ที่คำนวณ
 * ไปแล้วล็อกเวอร์ชันกติกาไว้ — ดู W11)
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็น fetch จาก apps/api
 */
import { ACCOUNTS, BEH, METHOD } from '@/data/fixtures/master-data'

export type CostBehavior = keyof typeof BEH
export type AllocationMethodKey = keyof typeof METHOD

export type AccountRule = {
  /** ปีการศึกษาที่เริ่มมีผล */
  from: number
  /** ปีการศึกษาสุดท้ายที่มีผล — null = ยังมีผลอยู่ */
  to: number | null
  behavior: CostBehavior
  behaviorLabel: string
  /** สัดส่วนที่ตีเป็นต้นทุนคงที่ (0–1) — ใช้เมื่อ behavior = MIXED */
  fixedShare: number
  /** สัดส่วนที่ตีเป็นต้นทุนผันแปร (0–1) */
  variableShare: number
  method: AllocationMethodKey
  methodLabel: string
  note: string
}

export type AccountEntry = {
  /**
   * ตัวระบุแถวที่ไม่ซ้ำกัน = คีย์ผสม + หน่วยงานที่ตั้งเจาะจง
   *
   * คีย์ผสม 4 ระดับ **ไม่ยูนีค** เพราะบัญชีเดียวกันมีได้ทั้งกติกากลางและกติกาที่ตั้งเจาะจง
   * รายหน่วยงาน (เช่น ค่าวัสดุการศึกษาของคณะแพทยศาสตร์ที่ทับกติกากลาง)
   */
  id: string
  /** คีย์ผสม 4 ระดับ */
  key: string
  name: string
  /** หน่วยงานที่ตั้งกติกาเจาะจง — null = กติกากลางทั้งมหาวิทยาลัย */
  org: string | null
  amount: number
  /** ทุกช่วงปีของบัญชีนี้ เรียงตามที่ fixture เก็บไว้ */
  rules: AccountRule[]
}

const toRule = (r: (typeof ACCOUNTS)[number]['rules'][number]): AccountRule => ({
  from: r.from,
  to: r.to,
  behavior: r.beh as CostBehavior,
  behaviorLabel: BEH[r.beh as CostBehavior].l,
  fixedShare: r.f,
  variableShare: r.v,
  method: r.m as AllocationMethodKey,
  methodLabel: METHOD[r.m as AllocationMethodKey],
  note: r.note
})

export const getAccountRules = (): AccountEntry[] =>
  ACCOUNTS.map(a => ({
    id: `${a.key}|${a.org ?? ''}`,
    key: a.key,
    name: a.name,
    org: a.org,
    amount: a.amount,
    rules: a.rules.map(toRule)
  }))

/**
 * กติกาที่มีผลในปีการศึกษาที่ระบุ — null = ปีนั้นยังไม่มีกติกาสำหรับบัญชีนี้
 *
 * ใช้ตัวแรกที่ช่วงปีครอบคลุม (fixture เรียงจากเก่าไปใหม่และช่วงไม่คาบเกี่ยวกัน)
 */
export const ruleAtYear = (account: AccountEntry, year: number): AccountRule | null =>
  account.rules.find(r => year >= r.from && (r.to === null || year <= r.to)) ?? null

/** ปีการศึกษาที่เลือกดูได้ในหน้า W14 */
export const getRuleYears = (): number[] => [2568, 2569, 2570, 2571, 2572]

/** ตัวเลือกวิธีปันส่วนทั้งหมด */
export const getAllocationMethodOptions = (): { key: AllocationMethodKey; label: string }[] =>
  (Object.keys(METHOD) as AllocationMethodKey[]).map(key => ({ key, label: METHOD[key] }))
