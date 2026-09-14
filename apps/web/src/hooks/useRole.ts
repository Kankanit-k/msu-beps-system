'use client'

// React Imports
import { useCallback, useEffect, useState } from 'react'

// Auth Imports
import { useAuthUser } from '@/hooks/AuthHooks'

// Config Imports
import { accessLevelRank, resolveUserLevel } from '@/configs/accessControl'
import type { AppRole } from '@/configs/accessControl'

/**
 * สลับ "มุมมองสิทธิ์" ฝั่ง client
 *
 *  - `role`         บทบาทที่กำลัง **มอง** อยู่ เก็บใน localStorage
 *  - `setRole`      สลับมุมมอง (ใช้โดยปุ่มใน SidebarFooter)
 *  - `useAccountRole` บทบาท **จริง** ของบัญชีที่ล็อกอิน
 *  - `useIsAdmin`   บัญชีนี้สลับมุมมองได้ไหม — ใช้ซ่อน/แสดงปุ่ม
 *
 * ทั้งหมดนี้คุมแค่ว่า sidebar **แสดง** อะไร ตัวบังคับจริงอยู่ที่ src/middleware.ts
 * และ src/configs/accessControl.ts — มุมมองที่สูงกว่าสิทธิ์จริงจะเห็นเมนู แต่กดเข้าไม่ได้
 * จึงถูกจำกัดเพดานไว้ที่บทบาทจริงของบัญชี
 */
export type { AppRole }

const STORAGE_KEY = 'beps-view-role'
const ROLE_EVENT = 'beps-view-role-change'
const VALID_ROLES: AppRole[] = ['user', 'deptAdmin', 'universityAdmin']

/** บทบาทจริงของบัญชีที่ล็อกอิน — ตอน dev ที่ปิด auth ไว้ให้ถือว่าเป็นผู้ดูแลมหาวิทยาลัย */
export const useAccountRole = (): AppRole => {
  const { user, isAuthenticated } = useAuthUser()

  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true') {
    return 'universityAdmin'
  }

  if (!isAuthenticated || !user) {
    return 'user'
  }

  const level = resolveUserLevel(user as Record<string, any>)

  return level === 'public' ? 'user' : level
}

export const useRole = () => {
  const accountRole = useAccountRole()

  // ตั้งต้นที่ 'user' ทั้งบน server และ render แรกฝั่ง client เพื่อไม่ให้ hydration ไม่ตรงกัน
  const [role, setRoleState] = useState<AppRole>('user')

  useEffect(() => {
    const read = () => {
      const stored = localStorage.getItem(STORAGE_KEY) as AppRole | null

      if (stored && VALID_ROLES.includes(stored)) {
        // ห้ามมองสูงกว่าสิทธิ์จริง — ไม่งั้นเมนูโชว์หน้าที่กดเข้าไม่ได้
        setRoleState(accessLevelRank[stored] <= accessLevelRank[accountRole] ? stored : accountRole)
      } else {
        setRoleState(accountRole)
      }
    }

    read()
    window.addEventListener(ROLE_EVENT, read)
    window.addEventListener('storage', read)

    return () => {
      window.removeEventListener(ROLE_EVENT, read)
      window.removeEventListener('storage', read)
    }
  }, [accountRole])

  const setRole = useCallback(
    (next: AppRole) => {
      const capped = accessLevelRank[next] <= accessLevelRank[accountRole] ? next : accountRole

      localStorage.setItem(STORAGE_KEY, capped)
      setRoleState(capped)
      window.dispatchEvent(new Event(ROLE_EVENT))
    },
    [accountRole]
  )

  return { role, setRole, accountRole }
}

/** ปุ่มสลับมุมมองจะโผล่เฉพาะบัญชีที่มีสิทธิ์สูงกว่าผู้ใช้ทั่วไป (ไม่มีอะไรให้สลับก็ไม่ต้องโชว์) */
export const useIsAdmin = (): boolean => accessLevelRank[useAccountRole()] > accessLevelRank.user
