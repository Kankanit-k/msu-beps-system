// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'
import { accessLevelRank, requiredLevelFor } from '@/configs/accessControl'
import type { AppRole } from '@/configs/accessControl'

// Data Imports
import { bepsNavGroups } from './bepsNav'

// ติดป้ายให้ลิงก์ที่เปิดดูได้โดยไม่ต้องล็อกอิน (ขับด้วย accessControl → publicRoutes)
const publicChip = { label: 'สาธารณะ', size: 'small', variant: 'outlined', color: 'success' } as const

const tagPublic = (items: VerticalMenuDataType[]): VerticalMenuDataType[] =>
  items.map(item => {
    if ('children' in item && item.children) {
      return { ...item, children: tagPublic(item.children) }
    }

    if ('href' in item && item.href && requiredLevelFor(item.href) === 'public') {
      return { ...item, suffix: publicChip }
    }

    return item
  })

/**
 * เมนู sidebar — ประกอบจาก bepsNav.ts ซึ่งเป็นแหล่งเดียวร่วมกับเมนูแนวนอน
 *
 * กลุ่มที่สูงกว่าสิทธิ์ที่กำลังมองอยู่จะไม่ถูกใส่ลงมาเลย — แต่นั่นเป็นแค่การ **ซ่อน**
 * ตัวบังคับจริงคือ src/middleware.ts
 */
const verticalMenuData = (role: AppRole = 'user'): VerticalMenuDataType[] => {
  const rank = accessLevelRank[role]

  const menu: VerticalMenuDataType[] = bepsNavGroups
    .filter(group => rank >= accessLevelRank[group.level])
    .map(group => ({
      label: group.label,
      isSection: true,
      children: group.items.map(item => ({
        label: item.label,
        href: item.href,
        icon: item.icon
      }))
    }))

  return tagPublic(menu)
}

export default verticalMenuData
