/**
 * Access control — single source of truth for "who can see what".
 *
 * Five roles (มติประชุม 21 ต.ค. 2569 · เอกสาร "สิทธิ์การเข้าถึง 5 ระดับ"). NOT a ladder —
 * ผู้บริหารเห็นน้อยกว่าเจ้าหน้าที่ระดับเดียวกัน จึงกำหนดสิทธิ์เป็นรายความสามารถ:
 *
 *   role             ภาพรวม ม.  ภาพรวมคณะ/เจาะลึก  วิเคราะห์จุดคุ้มทุน  ตั้งค่า     เลือกคณะอื่น
 *   universityExec   ✓          ทุกคณะ             ✗                  ✗          ✓
 *   universityAdmin  ✓          ทุกคณะ             ✓                  ✓          ✓
 *   facultyExec      ✓          คณะตน              ✗                  ✗          ✗
 *   deptAdmin        ✓          คณะตน              ✓ (คณะตน)          ✓ (คณะตน)  ✗
 *   lecturer         ✓          คณะตน              หลักสูตรตน          ✗          ✗
 *
 * Routes are matched WITHOUT the basePath (Next.js strips it inside middleware).
 * Paths follow the project convention: keep them shallow (≤ 3 segments) and put all
 * admin pages under /admin (university-wide pages under /admin/university).
 *
 * Used by: src/middleware.ts (enforcement) and the sidebar menu/role toggle (visibility).
 */

export type AppRole =
  'universityExec' | 'universityAdmin' | 'facultyExec' | 'deptAdmin' | 'lecturer';

/** Order the viewable roles appear in both role switchers (sidebar footer + navbar dropdown). */
export const roleOrder: AppRole[] = [
  'universityExec',
  'universityAdmin',
  'facultyExec',
  'deptAdmin',
  'lecturer',
];

/** บทบาทเริ่มต้นเมื่อยังไม่รู้สิทธิ์ (ก่อนอ่าน localStorage / บัญชีที่ไม่มี claim) — สิทธิ์น้อยสุดแบบดูอย่างเดียว */
export const DEFAULT_ROLE: AppRole = 'facultyExec';

// ── กลุ่มสิทธิ์ ───────────────────────────────────────────────────────────
const ANALYZE_ROLES: AppRole[] = ['universityAdmin', 'deptAdmin', 'lecturer'];
const CONFIGURE_ROLES: AppRole[] = ['universityAdmin', 'deptAdmin'];
const UNIVERSITY_STAFF: AppRole[] = ['universityAdmin'];

/** ระดับมหาวิทยาลัย — เห็นทุกคณะและใช้ตัวกรองเลือกคณะได้ */
export const isUniversityLevel = (r: AppRole): boolean =>
  r === 'universityExec' || r === 'universityAdmin';

/**
 * Routes anyone can view WITHOUT logging in (besides the auth API + static assets).
 * Keep them shallow (≤ 3 segments). (These pages still render the dashboard layout.)
 */
export const publicRoutes: string[] = [
  '/login',
  '/api/log', // client-side error reporting endpoint (must work on the login page too)
];

// Hide the "เกี่ยวกับเรา" (/about) page across the app for now — menus drop the link and the
// route 404s. Flip to true to bring it back.
export const SHOW_ABOUT_PAGE: boolean = false;

// Hide the "นโยบายต้นทุนคงที่" (/admin/fixed-cost-policy, W20) page for now — the menu drops the
// link and the route 404s. Flip to true to bring it back.
export const SHOW_FIXED_COST_POLICY: boolean = false;

// Hide the "ปรับปรุงหลักสูตร (ปรับ 3 ทาง)" (/scenario/program2) page for now — the menu drops the
// link and the route 404s. Flip to true to bring it back.
export const SHOW_SCENARIO_PROGRAM2: boolean = false;

// Hide the "โครงสร้างต้นทุน" (/cost) page for now — its charts duplicate ภาพรวมมหาวิทยาลัย and the
// cost-component breakdown moved into card ④ there. The menu drops the link and the route 404s.
// Flip to true to bring it back.
export const SHOW_COST_PAGE: boolean = false;

// Hide the "ห้องจำลองแผนรับนิสิต" (/scenario/sandbox) page for every role for now — the menu drops
// the link and the route 404s. Flip to true to bring it back.
export const SHOW_SCENARIO_SANDBOX: boolean = false;

// Route → who may open it. Ordered MOST-SPECIFIC FIRST; the first matching prefix wins.
// Paths not listed are open to every signed-in role (ภาพรวม · เจาะลึก · สูตร).
// `exact: true` = only that path itself (e.g. a section landing page), not its sub-pages.
export const routeAccessRules: { prefix: string; roles: 'public' | AppRole[]; exact?: boolean }[] =
  [
    ...publicRoutes.map((prefix) => ({ prefix, roles: 'public' as const })),
    // วิเคราะห์จุดคุ้มทุน — หน้าแรกหมวด + รายหลักสูตรรวมอาจารย์ (จำกัดหลักสูตรตนในหน้า) · ที่เหลือเฉพาะเจ้าหน้าที่
    { prefix: '/scenario', roles: ANALYZE_ROLES, exact: true },
    { prefix: '/scenario/program', roles: ANALYZE_ROLES },
    { prefix: '/scenario', roles: CONFIGURE_ROLES },
    // ทะเบียน & ระบบ — เจ้าหน้าที่ระดับมหาวิทยาลัยเท่านั้น
    { prefix: '/users', roles: UNIVERSITY_STAFF },
    { prefix: '/admin/users', roles: UNIVERSITY_STAFF },
    { prefix: '/admin/university', roles: UNIVERSITY_STAFF },
    { prefix: '/tuition', roles: UNIVERSITY_STAFF },
    { prefix: '/cost-data', roles: UNIVERSITY_STAFF },
    { prefix: '/programs', roles: UNIVERSITY_STAFF },
    { prefix: '/about', roles: UNIVERSITY_STAFF },
    // ตั้งค่าการคำนวณ (วิธีปันส่วน · ปันส่วนต้นทุน) — เจ้าหน้าที่ ม. + เจ้าหน้าที่คณะ
    { prefix: '/admin', roles: CONFIGURE_ROLES },
  ];

/** The rule governing a path (without basePath), or undefined = any signed-in role. */
const ruleFor = (pathname: string) => {
  // trailingSlash: true → '/scenario/' and '/scenario' are the same page
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;

  return routeAccessRules.find(
    (r) => path === r.prefix || (!r.exact && path.startsWith(`${r.prefix}/`)),
  );
};

/** True if a path is viewable without logging in. */
export const isPublicRoute = (pathname: string): boolean => ruleFor(pathname)?.roles === 'public';

/** May this role open the path? (public paths → always) */
export const canAccess = (role: AppRole, pathname: string): boolean => {
  const roles = ruleFor(pathname)?.roles;

  return !roles || roles === 'public' || roles.includes(role);
};

/**
 * Resolve a signed-in user's role from their auth token.
 *
 * ⚠️ Placeholder — wire this to your real ERP permissions. Recommended approach:
 *    add a `role` claim in the NextAuth `jwt` callback (src/libs/ErpAuth.ts), e.g. derived
 *    from `user.SCOPES.groupid` / a server-side allowlist, then read it here.
 */
export const resolveUserRole = (token: Record<string, any>): AppRole => {
  const role = token.role ?? token.user?.role;

  // No (or unknown/legacy 'user') claim → least privilege.
  return roleOrder.includes(role) ? role : DEFAULT_ROLE;
};

/**
 * Display label + icon for each viewable role.
 * Shared by the sidebar role toggle (SidebarFooter) and the navbar profile (UserDropdown)
 * so both always show the same wording for the currently viewed role.
 */
export const roleDisplay: Record<AppRole, { label: string; icon: string }> = {
  universityExec: { label: 'ผู้บริหารมหาวิทยาลัย', icon: 'ri-vip-crown-line' },
  universityAdmin: { label: 'เจ้าหน้าที่ระดับมหาวิทยาลัย', icon: 'ri-government-line' },
  facultyExec: { label: 'ผู้บริหารคณะ', icon: 'ri-user-star-line' },
  deptAdmin: { label: 'เจ้าหน้าที่ระดับคณะ', icon: 'ri-shield-user-line' },
  lecturer: { label: 'อาจารย์ประจำหลักสูตร', icon: 'ri-graduation-cap-line' },
};

/**
 * ขอบเขตของบัญชี — ผู้บริหาร/เจ้าหน้าที่คณะผูกกับคณะ · อาจารย์ประจำหลักสูตรผูกกับคณะ + หลักสูตร
 * (คีย์หลักสูตร = `fac|lvl|prog|deg` เหมือน refKey ของหน้าคำนวณ)
 * ⚠️ ตอนนี้เลือกเองจากเมนูโปรไฟล์ (มุมมองสิทธิ์) — ต่อกับ ERP เมื่อมี claim คณะ/หลักสูตร
 */
export interface RoleScope {
  faculty: string | null;
  program: string | null;
}

/** บทบาทที่ต้องระบุขอบเขต — เลือกบทบาทนี้แล้วต้องเลือกคณะ (และหลักสูตร) ด้วย */
export const roleNeedsScope = (r: AppRole): 'faculty' | 'program' | null =>
  r === 'lecturer' ? 'program' : isUniversityLevel(r) ? null : 'faculty';

/** คณะที่บทบาทนี้ถูกล็อกไว้ในหน้าภาพรวมคณะ/เจาะลึก/วิเคราะห์ — null = ระดับมหาวิทยาลัย เลือกได้ทุกคณะ */
export const lockedFacultyFor = (r: AppRole, scope: RoleScope): string | null =>
  isUniversityLevel(r) ? null : scope.faculty;

/**
 * ออกรายงาน PDF จุดคุ้มทุน (ใช้แนบขอปรับปรุง/เปิดหลักสูตร) ได้เฉพาะกองแผนและอาจารย์ประจำหลักสูตร —
 * เจ้าหน้าที่คณะจำลองและบันทึกผลได้ แต่ออกรายงานไม่ได้ (ตัดสินใจ 2026-10-14)
 * ⚠️ ตอนนี้ซ่อนแค่ฝั่ง UI — เมื่อมี API ออกรายงานต้องเช็กซ้ำฝั่งเซิร์ฟเวอร์
 */
export const canExportReport = (r: AppRole): boolean => r === 'universityAdmin' || r === 'lecturer';
