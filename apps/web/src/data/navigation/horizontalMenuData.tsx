// Type Imports
import type { HorizontalMenuDataType } from '@/types/menuTypes'
import { accessLevelRank } from '@/configs/accessControl'
import type { AppRole } from '@/configs/accessControl'

// Data Imports
import { bepsNavGroups } from './bepsNav'

// สะท้อน verticalMenuData — เลย์เอาต์แนวนอนใช้ sub-menu แทน section
const horizontalMenuData = (role: AppRole = 'user'): HorizontalMenuDataType[] => {
  const rank = accessLevelRank[role]

  return bepsNavGroups
    .filter(group => rank >= accessLevelRank[group.level])
    .map(group => ({
      label: group.label,
      icon: group.icon,
      children: group.items.map(item => ({
        label: item.label,
        href: item.href,
        icon: item.icon
      }))
    }))
}

export default horizontalMenuData
