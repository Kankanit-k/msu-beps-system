/**
 * ผังบัญชี ERP 4 ระดับ (W19) — เก็บ **ตัวบัญชี** (`erp_account`)
 *
 * แยกจาก W14 ที่เก็บ **กติกา** ว่าบัญชีนั้นเป็น TFC หรือ TVC เพราะบัญชีหนึ่งใบมีกติกาได้
 * หลายช่วงปี และกติกาต้องผ่านการอนุมัติ ส่วนตัวบัญชีมาจาก ERP ตรงๆ
 *
 * คีย์ต้องเป็น 4 ระดับ (แผนงาน · หมวดงบ · หมวดรายจ่าย · หมวดย่อย) เพราะรหัสหมวดรายจ่าย
 * เดียวกันเป็นคนละบัญชีได้เมื่ออยู่คนละแผนงาน — พิสูจน์ได้จาก `800:80001 เงินอุดหนุน`
 * ที่แผนงาน 2 เป็นเงินอุดหนุนทั่วไป ส่วนแผนงาน 3 เป็นเงินอุดหนุนโครงการวิจัย
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็น fetch จาก apps/api
 */
import { ERP_ACCOUNTS } from '@/data/fixtures/master-data'

export type ErpAccount = {
  /** คีย์ผสม 4 ระดับในรูปแบบที่แสดงผล */
  key: string
  planCode: string
  budgetCode: string
  expenditureCode: string
  subCode: string
  name: string
  /** ปีงบประมาณที่เริ่มมีผล */
  from: string
  /** ปีงบประมาณสุดท้ายที่มีผล — null = ยังใช้อยู่ */
  to: string | null
  amount: number
  /** คีย์ของกติกาใน W14 — null = ยังไม่ผูกกติกา เงินจะถูกพักไว้ที่หน่วยงาน */
  ruleKey: string | null
}

export const getErpAccounts = (): ErpAccount[] =>
  ERP_ACCOUNTS.map(a => ({
    key: `${a.plan} · ${a.bud} · ${a.exp} · ${a.sub}`,
    planCode: a.plan,
    budgetCode: a.bud,
    expenditureCode: a.exp,
    subCode: a.sub,
    name: a.name,
    from: a.from,
    to: a.to,
    amount: a.amount,
    ruleKey: a.ruleKey
  }))

/** บัญชีที่มีผลในปีงบประมาณที่ระบุ */
export const isActiveInYear = (account: ErpAccount, year: number): boolean =>
  year >= Number(account.from) && (account.to === null || year <= Number(account.to))

/** ปีงบประมาณที่เลือกดูได้ในหน้า W19 */
export const getErpAccountYears = (): number[] => [2568, 2569, 2570]
