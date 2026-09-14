/**
 * Access control — จุดเดียวที่ตอบว่า "ใครเห็นอะไรได้"
 *
 * สี่ชั้น (ต่ำ → สูง) ชั้นสูงเห็นทุกอย่างของชั้นที่ต่ำกว่า:
 *
 *   public           ทุกคน (ไม่ต้องล็อกอิน)      — /login, /screens, auth API, static
 *   user             ผู้ใช้ที่ล็อกอินแล้ว          — หน้าวิเคราะห์ทั้งหมด W1–W7, W10
 *   deptAdmin        ผู้ดูแลระดับหน่วยงาน/คณะ      — /admin/**        W8, W9, W11–W13, W16, W17, W19
 *   universityAdmin  ผู้ดูแลระดับมหาวิทยาลัย       — /admin/university/**  W14, W15, W18
 *
 * เส้นทางถูกจับโดย **ไม่มี** basePath (Next.js ตัดออกให้ก่อนถึง middleware แล้ว)
 *
 * ใช้โดย: src/middleware.ts (บังคับจริง) และเมนู/ปุ่มสลับบทบาทใน sidebar (แค่ซ่อน/แสดง)
 */

export type AccessLevel = 'public' | 'user' | 'deptAdmin' | 'universityAdmin'

// บทบาทที่บัญชีหนึ่งถือได้ / มองในมุมของใครได้ (ทุกค่ายกเว้น 'public')
export type AppRole = Exclude<AccessLevel, 'public'>

export const accessLevelRank: Record<AccessLevel, number> = {
  public: 0,
  user: 1,
  deptAdmin: 2,
  universityAdmin: 3
}

/**
 * บทบาทตามตาราง app_role ใน db/01_schema.sql (ดู W0 และ W18)
 *
 * schema ฝั่ง DB มี 4 บทบาท แต่ชั้นสิทธิ์ของเทมเพลตมี 3 — `viewer` กับ `faculty_officer`
 * จึงตกมาที่ `user` เหมือนกัน ต่างกันตรง **ขอบเขตข้อมูล (scope)** ไม่ใช่ระดับสิทธิ์:
 * `faculty_officer` เห็นเฉพาะคณะที่ตัวเองสังกัด (org_unit_id) — เรื่อง scope ต้องบังคับ
 * แยกต่างหากที่ชั้น service ไม่ใช่ที่ระดับเส้นทาง (SA.md §11.3)
 *
 * ⚠️ ช่องว่างที่ยังไม่ฟันธง — schema ไม่มีบทบาท "ผู้อนุมัติ" แยกออกมา ทำให้ admin
 * เป็นผู้อนุมัติทุกเรื่องโดยปริยาย (W0 เตือนเรื่องนี้ไว้เอง) รอการตัดสินใจ
 */
export type BepsRole = 'viewer' | 'faculty_officer' | 'budget_office' | 'admin'

export const bepsRoleToAccessLevel: Record<BepsRole, AppRole> = {
  viewer: 'user',
  faculty_officer: 'user',
  budget_office: 'deptAdmin',
  admin: 'universityAdmin'
}

/** true = บทบาทนี้เห็นได้เฉพาะหน่วยงานที่สังกัด (ตรงกับคอลัมน์ scoped ของ ROLES ใน W0) */
export const bepsRoleIsScoped: Record<BepsRole, boolean> = {
  viewer: false,
  faculty_officer: true,
  budget_office: false,
  admin: false
}

/**
 * เส้นทางที่เปิดให้ดูได้โดยไม่ต้องล็อกอิน (นอกเหนือจาก auth API + static assets)
 *
 * /screens เป็นสารบัญหน้าจอไว้ให้ผู้เกี่ยวข้องเปิดดูโครงระบบ — ไม่มีตัวเลขการเงิน
 */
export const publicRoutes: string[] = [
  '/login',
  '/screens',
  '/api/log' // ปลายทางรับ error ฝั่ง client — ต้องใช้ได้แม้บนหน้า login
]

// เส้นทาง → ระดับขั้นต่ำ · เรียง **เจาะจงที่สุดก่อน** กฎแรกที่ตรงชนะ
export const routeAccessRules: { prefix: string; level: AccessLevel }[] = [
  ...publicRoutes.map(prefix => ({ prefix, level: 'public' as AccessLevel })),
  { prefix: '/admin/university', level: 'universityAdmin' },
  { prefix: '/admin', level: 'deptAdmin' }
]

// อย่างอื่นทั้งหมด (หน้าวิเคราะห์ใน (private)) ต้องล็อกอินอย่างน้อย
export const defaultAccessLevel: AccessLevel = 'user'

/** ระดับสิทธิ์ขั้นต่ำที่ต้องมีเพื่อเปิดเส้นทางนี้ (เส้นทางไม่มี basePath) */
export const requiredLevelFor = (pathname: string): AccessLevel => {
  const rule = routeAccessRules.find(r => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`))

  return rule ? rule.level : defaultAccessLevel
}

/** เปิดดูได้โดยไม่ต้องล็อกอินหรือไม่ */
export const isPublicRoute = (pathname: string): boolean => requiredLevelFor(pathname) === 'public'

/**
 * แปลง token ของผู้ใช้ที่ล็อกอินแล้วเป็นระดับสิทธิ์
 *
 * รับได้ทั้งค่าที่เป็น AccessLevel ตรงๆ และชื่อบทบาทตาม schema (BepsRole) เพื่อให้
 * ตอน jwt callback ใน src/libs/ErpAuth.ts ใส่ claim มาแบบไหนก็ทำงานได้
 *
 * ⚠️ ยังไม่มีใครใส่ claim `role` — ต้องเพิ่มใน jwt callback โดยอ่านจากตาราง app_user
 * ก่อนถึงจะบังคับสิทธิ์ได้จริง ตอนนี้ทุกคนที่ล็อกอินได้จะเป็น 'user'
 */
export const resolveUserLevel = (token: Record<string, any> | null): AccessLevel => {
  if (!token) {
    return 'public'
  }

  const claim: unknown = token.role ?? token.user?.role

  if (claim === 'universityAdmin' || claim === 'deptAdmin' || claim === 'user') {
    return claim
  }

  if (typeof claim === 'string' && claim in bepsRoleToAccessLevel) {
    return bepsRoleToAccessLevel[claim as BepsRole]
  }

  // ล็อกอินแล้วแต่ไม่มี claim บทบาท → ผู้ใช้ทั่วไป
  return 'user'
}
