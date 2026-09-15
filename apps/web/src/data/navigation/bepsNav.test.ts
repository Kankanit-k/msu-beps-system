/**
 * ทุกเส้นทางในเมนูต้องมี page.tsx อยู่จริง
 *
 * เทมเพลตเตือนเรื่องนี้ไว้เอง (apps/web/CLAUDE.md — "Don't reference a route in menu data
 * before its page.tsx exists") และเป็นข้อผิดพลาดที่มองไม่เห็นตอน build: เมนูยังขึ้นปกติ
 * แต่ผู้ใช้กดแล้วเจอ 404 · เทสต์นี้จึงตรวจจากไฟล์บนดิสก์จริง ไม่ใช่รายการที่เขียนซ้ำ
 */
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { bepsNavGroups, bepsNavHrefs, bepsOutsideShell } from './bepsNav'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'app')

/** เส้นทางนอก shell อยู่ใต้ (blank-layout-pages) ส่วนที่เหลืออยู่ใต้ (private) */
const pageFileFor = (href: string): string => {
  const group = bepsOutsideShell.some(item => item.href === href) ? '(blank-layout-pages)' : '(private)'

  return join(appDir, group, ...href.split('/').filter(Boolean), 'page.tsx')
}

describe('ผังเมนู BEPS', () => {
  it('ทุกเส้นทางในเมนูมีไฟล์ page.tsx', () => {
    const missing = [...bepsNavHrefs, ...bepsOutsideShell.map(item => item.href)].filter(
      href => !existsSync(pageFileFor(href))
    )

    expect(missing).toEqual([])
  })

  it('เส้นทางไม่ซ้ำกัน', () => {
    expect(new Set(bepsNavHrefs).size).toBe(bepsNavHrefs.length)
  })

  it('ทุกรายการมีรหัสหน้าจอและคำอธิบาย', () => {
    const items = [...bepsNavGroups.flatMap(group => group.items), ...bepsOutsideShell]

    for (const item of items) {
      expect(item.w, `${item.href} ไม่มีรหัสหน้าจอ`).toMatch(/^W\d+$/)
      expect(item.desc.length, `${item.href} ไม่มีคำอธิบาย`).toBeGreaterThan(10)
    }
  })
})
