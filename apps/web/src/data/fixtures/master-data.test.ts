/**
 * ตรวจว่าการแปลง master-data.js เป็น TypeScript ไม่ทำให้ค่าเพี้ยน
 *
 * ส่วนใหญ่แปลงตรงตัว ยกเว้น STUDENT_TYPES ที่เขียนใหม่เพื่อให้ผ่าน type check
 * (ของเดิมสร้างออบเจ็กต์แล้วค่อยยัดฟิลด์ n เข้าไปทีหลัง) จึงต้องยืนยันว่ากติกา
 * largest-remainder ยังทำงานเหมือนเดิม
 */
import { describe, expect, it } from 'vitest'

import { RAW } from './raw'
import {
  ACCOUNTS,
  ERP_ACCOUNTS,
  EXCEPTIONS,
  FEES,
  PROGRAM_REG,
  RBAC,
  ROLES,
  RUNS,
  SETTINGS,
  STUDENT_TYPES,
  USERS
} from './master-data'

describe('master-data ที่แปลงเป็น TypeScript แล้ว', () => {
  it('STUDENT_TYPES กระจายเศษแล้วยอดรวมตรงกับจำนวนนิสิตของงวดพอดี', () => {
    const sum = STUDENT_TYPES.reduce((a, d) => a + d.n, 0)

    expect(sum).toBe(RAW.UNI.Q)
  })

  it('STUDENT_TYPES ทุกแถวได้จำนวนเต็มที่ไม่ห่างจากส่วนแบ่งจริงเกิน 1 คน', () => {
    for (const d of STUDENT_TYPES) {
      expect(Number.isInteger(d.n)).toBe(true)
      expect(Math.abs(d.n - d.exact)).toBeLessThan(1)
    }
  })

  it('ตารางหลักมีข้อมูลครบและ RBAC เรียงคอลัมน์ตรงกับจำนวนบทบาท', () => {
    expect(ROLES).toHaveLength(4)
    expect(RBAC.length).toBeGreaterThan(0)

    for (const row of RBAC) {
      expect(row.v).toHaveLength(ROLES.length)
    }
  })

  it('ชุดข้อมูลของแต่ละหน้าจอไม่ว่าง', () => {
    for (const [name, rows] of [
      ['FEES (W8)', FEES],
      ['RUNS (W11)', RUNS],
      ['EXCEPTIONS (W13)', EXCEPTIONS],
      ['ACCOUNTS (W14)', ACCOUNTS],
      ['SETTINGS (W15)', SETTINGS],
      ['PROGRAM_REG (W16)', PROGRAM_REG],
      ['USERS (W18)', USERS],
      ['ERP_ACCOUNTS (W19)', ERP_ACCOUNTS]
    ] as const) {
      expect(rows.length, name).toBeGreaterThan(0)
    }
  })
})
