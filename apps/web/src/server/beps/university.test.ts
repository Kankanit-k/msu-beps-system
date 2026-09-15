/**
 * ล็อกตัวเลขหลักระดับมหาวิทยาลัยที่แผนกำหนดให้ตรวจ (Verification ข้อ 5)
 *
 * แผนเขียนไว้ว่า "ตรวจด้วยตา" — เขียนเป็นเทสต์แทน เพราะตัวเลขชุดนี้คือสิ่งที่บอกได้ว่า
 * ชั้น fixture → calc-engine → หน้าจอ ยังต่อกันถูก ถ้าวันหนึ่งเปลี่ยนไปอ่านจาก apps/api
 * แล้วค่าเพี้ยน เทสต์นี้จะดักให้ก่อนที่จะไปเห็นเอาบนจอ
 */
import { describe, expect, it } from 'vitest'

import { getFullCostRecoveryExample } from './programs'
import { getUniversityTotals } from './university'

describe('ตัวเลขรวมระดับมหาวิทยาลัย', () => {
  const totals = getUniversityTotals()
  const withGov = totals.byMode.with_government

  it('ขนาดชุดข้อมูลตรงกับที่ mockup แสดง', () => {
    expect(totals.q).toBe(54949)
    expect(totals.facultyCount).toBe(20)
    expect(totals.programCount).toBe(230)
  })

  it('รายได้ ต้นทุน และผลประกอบการ (ฐานรวมเงินแผ่นดิน) ตรงกับ mockup', () => {
    expect(withGov.tr / 1e6).toBeCloseTo(1669.2, 1)
    expect(withGov.tc / 1e6).toBeCloseTo(1695.3, 1)
    expect(withGov.profit / 1e6).toBeCloseTo(-26.1, 1)
  })

  it('จุดคุ้มทุนทั้ง 2 ฐานตรงกับ mockup', () => {
    expect(withGov.qStar).toBe(56371)
    expect(totals.byMode.without_government.qStar).toBe(111309)
  })

  it('สัดส่วน TFC : TVC = 61 : 39 และรวมกันได้ 100', () => {
    expect(totals.fixedCostShare).toBeCloseTo(61.0, 1)
    expect(totals.variableCostShare).toBeCloseTo(39.0, 1)
    expect(totals.fixedCostShare + totals.variableCostShare).toBeCloseTo(100, 6)
  })

  it('ต้นทุนเท่ากันทั้ง 2 ฐานรายได้ — สูตร 5 เปลี่ยนเฉพาะฝั่งรายได้', () => {
    const withoutGov = totals.byMode.without_government

    expect(withoutGov.tfc).toBe(withGov.tfc)
    expect(withoutGov.tvc).toBe(withGov.tvc)
    expect(withoutGov.avc).toBe(withGov.avc)
    expect(withoutGov.tr).toBeLessThan(withGov.tr)
  })
})

describe('ตัวอย่างหลักสูตรที่ต้องใช้สูตร 7 (Full-Cost Recovery)', () => {
  const example = getFullCostRecoveryExample()

  it('ชุดข้อมูลตัวอย่างมีหลักสูตรที่เข้าเงื่อนไข', () => {
    expect(example).not.toBeNull()
  })

  it('Q* ที่ได้ = TC ÷ R ปัดขึ้น และมากกว่านิสิตที่ลงทะเบียนจริง', () => {
    const e = example as NonNullable<typeof example>

    expect(e.qStar).toBe(Math.ceil(e.tc / e.r))
    expect(e.qStar).toBeGreaterThan(e.q)
  })
})
