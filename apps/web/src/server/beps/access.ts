/**
 * บทบาทและตารางสิทธิ์ — ชั้นเดียวที่หน้าจอเรื่องสิทธิ์เรียก (W0 และ W18)
 *
 * วันนี้อ่านจาก fixture · Phase 4 จะเปลี่ยนเป็น fetch จาก apps/api ที่อ่านตาราง
 * `app_role` / `user_role_scope` จริง โดยหน้าจอไม่ต้องแก้
 *
 * ⚠️ ช่องว่างที่ยังไม่ฟันธง — `db/01_schema.sql` มี 4 บทบาทและ **ไม่มีบทบาท
 * "ผู้อนุมัติ" แยกต่างหาก** ตารางนี้จึงให้ `admin` เป็นผู้อนุมัติทุกเรื่อง
 * (W0 ของ mockup เตือนเรื่องนี้ไว้เอง) แผน Phase 1 ตัดสินใจยกมาตามเดิม
 */
import { bepsRoleIsScoped, bepsRoleToAccessLevel } from '@/configs/accessControl'
import type { AppRole, BepsRole } from '@/configs/accessControl'
import { RBAC, ROLES, USER_LOG, USERS } from '@/data/fixtures/master-data'

export type BepsRoleInfo = {
  /** รหัสบทบาทตาม CHECK constraint ของตาราง app_role */
  key: BepsRole
  label: string
  /** ใครถือบทบาทนี้และทำอะไรได้ */
  description: string
  /** true = เห็นเฉพาะหน่วยงานที่ผูกไว้ใน org_unit_id */
  scoped: boolean
  /** จำนวนบัญชีที่ถือบทบาทนี้อยู่ */
  userCount: number
  /** ชั้นสิทธิ์ของเทมเพลตที่บทบาทนี้แปลงไปเป็น */
  accessLevel: AppRole
}

/** ✓ ทำได้ · ◑ ได้เฉพาะหน่วยงานที่ผูกไว้ · − ไม่เห็นเมนูเลย */
export type RbacMark = 'y' | 'p' | 'n'

export type RbacRow = {
  /** รหัสหน้าจอ เช่น W8 หรือช่วง W1–W5 */
  screen: string
  /** การกระทำที่แยกสิทธิ์ออกจากกัน เช่น 'แก้/เสนอ' กับ 'อนุมัติ' */
  action?: string
  label: string
  /** เรียงตรงกับลำดับของ getRoles() */
  marks: RbacMark[]
}

export const getRoles = (): BepsRoleInfo[] =>
  ROLES.map(r => {
    const key = r.k as BepsRole

    return {
      key,
      label: r.l,
      description: r.d,
      scoped: bepsRoleIsScoped[key],
      userCount: r.n,
      accessLevel: bepsRoleToAccessLevel[key]
    }
  })

export const getRbacMatrix = (): RbacRow[] =>
  RBAC.map(row => ({
    screen: row.w,
    action: 'a' in row ? (row.a as string) : undefined,
    label: row.t,
    marks: row.v as RbacMark[]
  }))

export type AppUser = {
  name: string
  email: string
  role: BepsRole
  roleLabel: string
  /** หน่วยงานที่ผูกไว้ — null = เห็นทุกหน่วยงาน (org_unit_id IS NULL) */
  org: string | null
  lastSignIn: string
  isActive: boolean
}

export const getUsers = (): AppUser[] =>
  USERS.map(u => {
    const role = u.role as BepsRole

    return {
      name: u.name,
      email: u.email,
      role,
      roleLabel: ROLES.find(r => r.k === role)?.l ?? role,
      org: u.org,
      lastSignIn: u.last,
      isActive: u.active
    }
  })

export type UserLogEntry = { at: string; icon: string; tone: 'ok' | 'info' | 'warn' | 'error'; text: string }

const stripTags = (html: string): string => html.replace(/<[^>]+>/g, '')

const USER_LOG_ICON: Record<string, { icon: string; tone: UserLogEntry['tone'] }> = {
  '🔑': { icon: 'ri-key-2-line', tone: 'info' },
  '🔄': { icon: 'ri-refresh-line', tone: 'warn' },
  '⏸': { icon: 'ri-pause-line', tone: 'warn' },
  '✅': { icon: 'ri-check-line', tone: 'ok' }
}

export const getUserLog = (): UserLogEntry[] =>
  USER_LOG.map(entry => ({
    at: entry.t,
    icon: USER_LOG_ICON[entry.ic]?.icon ?? 'ri-circle-line',
    tone: USER_LOG_ICON[entry.ic]?.tone ?? 'info',
    text: stripTags(entry.h)
  }))
