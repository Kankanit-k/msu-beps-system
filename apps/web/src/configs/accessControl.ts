/**
 * Access control — single source of truth for "who can see what".
 *
 * Four tiers (low → high). Each tier includes everything below it:
 *
 *   public           ทุกคน (ไม่ต้องล็อกอิน)            — /login, auth API, static assets
 *   user             ผู้ใช้ที่ล็อกอินแล้ว                — the whole (private) dashboard
 *   deptAdmin        ผู้ดูแลระดับหน่วยงาน/คณะ            — /admin/**
 *   universityAdmin  ผู้ดูแลระดับมหาวิทยาลัย             — /admin/university/**
 *
 * Routes are matched WITHOUT the basePath (Next.js strips it inside middleware).
 * Paths follow the project convention: keep them shallow (≤ 3 segments) and put all
 * admin pages under /admin (university-wide pages under /admin/university).
 *
 * Used by: src/middleware.ts (enforcement) and the sidebar menu/role toggle (visibility).
 */

export type AccessLevel = 'public' | 'user' | 'deptAdmin' | 'universityAdmin';

// Roles a signed-in account can hold / view as (everything except 'public').
export type AppRole = Exclude<AccessLevel, 'public'>;

export const accessLevelRank: Record<AccessLevel, number> = {
  public: 0,
  user: 1,
  deptAdmin: 2,
  universityAdmin: 3,
};

/**
 * Routes anyone can view WITHOUT logging in (besides the auth API + static assets).
 * Add dashboard/table paths here to expose them publicly. Keep them shallow (≤ 3 segments).
 * (These pages still render the dashboard layout — only the auth check is skipped.)
 */
export const publicRoutes: string[] = [
  '/login',
  '/overview', // example: a public-facing dashboard
  '/api/log', // client-side error reporting endpoint (must work on the login page too)
];

// Hide the "เกี่ยวกับเรา" (/about) page across the app for now — menus drop the link and the
// route 404s. Flip to true to bring it back.
export const SHOW_ABOUT_PAGE: boolean = false;

// Hide the "นโยบายต้นทุนคงที่" (/admin/fixed-cost-policy, W20) page for now — the menu drops the
// link and the route 404s. Flip to true to bring it back.
export const SHOW_FIXED_COST_POLICY: boolean = false;

// Route → minimum level. Ordered MOST-SPECIFIC FIRST; the first matching prefix wins.
export const routeAccessRules: { prefix: string; level: AccessLevel }[] = [
  // tsc needs this assertion (the `.map` callback return isn't contextually typed against
  // routeAccessRules), but eslint's type info disagrees and calls it unnecessary — see the
  // real `tsc --noEmit` output, which is the source of truth here.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  ...publicRoutes.map((prefix) => ({ prefix, level: 'public' as AccessLevel })),
  { prefix: '/users', level: 'universityAdmin' }, // W18 ผู้ใช้และสิทธิ์ — admin เท่านั้น
  { prefix: '/admin/university', level: 'universityAdmin' },
  { prefix: '/admin', level: 'deptAdmin' },
  { prefix: '/about', level: 'deptAdmin' }, // เกี่ยวกับเรา — ซ่อนจากผู้ใช้ทั่วไป
  // ทะเบียนข้อมูลหลัก — มีปุ่มแก้ไข + ต้นทุนดิบทุกคณะ ผู้ใช้ทั่วไปดูผ่านหน้าวิเคราะห์แทน
  { prefix: '/tuition', level: 'deptAdmin' },
  { prefix: '/cost-data', level: 'deptAdmin' },
  { prefix: '/programs', level: 'deptAdmin' },
];

// Everything not listed above (the authenticated dashboard) needs at least login.
export const defaultAccessLevel: AccessLevel = 'user';

/** Minimum access level required to view a path (without basePath). */
export const requiredLevelFor = (pathname: string): AccessLevel => {
  const rule = routeAccessRules.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );

  return rule ? rule.level : defaultAccessLevel;
};

/** True if a path is viewable without logging in. */
export const isPublicRoute = (pathname: string): boolean => requiredLevelFor(pathname) === 'public';

/**
 * Resolve a signed-in user's level from their auth token.
 *
 * ⚠️ Placeholder — wire this to your real ERP permissions. Recommended approach:
 *    add a `role` claim in the NextAuth `jwt` callback (src/libs/ErpAuth.ts), e.g. derived
 *    from `user.SCOPES.groupid` / a server-side allowlist, then read it here.
 */
export const resolveUserLevel = (token: Record<string, any> | null): AccessLevel => {
  if (!token) {
    return 'public';
  }

  const role = token.role ?? token.user?.role;

  if (role === 'universityAdmin' || role === 'deptAdmin' || role === 'user') {
    return role;
  }

  // Authenticated but no admin claim → regular user.
  return 'user';
};

/**
 * Display label + icon for each viewable role.
 * Shared by the sidebar role toggle (SidebarFooter) and the navbar profile (UserDropdown)
 * so both always show the same wording for the currently viewed role.
 */
export const roleDisplay: Record<AppRole, { label: string; icon: string }> = {
  user: { label: 'ผู้ใช้งานทั่วไป', icon: 'ri-user-line' },
  deptAdmin: { label: 'ผู้ดูแลระดับหน่วยงาน', icon: 'ri-shield-user-line' },
  universityAdmin: { label: 'ผู้ดูแลระดับมหาวิทยาลัย', icon: 'ri-government-line' },
};

/** Order the viewable roles appear in both role switchers (sidebar footer + navbar dropdown). */
export const roleOrder: AppRole[] = ['user', 'deptAdmin', 'universityAdmin'];
