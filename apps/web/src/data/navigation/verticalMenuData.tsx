// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes';
import {
  DEFAULT_ROLE,
  SHOW_ABOUT_PAGE,
  SHOW_COST_PAGE,
  SHOW_CURRENT_YEAR_PAGES,
  SHOW_FIXED_COST_POLICY,
  SHOW_SCENARIO_FACULTY,
  SHOW_SCENARIO_PROGRAM2,
  SHOW_SCENARIO_SANDBOX,
  canAccess,
  isPublicRoute,
} from '@/configs/accessControl';
import { LANDING_LINK_ICON } from '@/data/navigation/sectionLandings';
import { BEPS } from '@components/ChartBits';
import type { AppRole } from '@/configs/accessControl';

// Show/hide the "สาธารณะ" chip in the sidebar. The tagging logic below stays intact —
// flip this to true to bring the chip back.
const SHOW_PUBLIC_CHIP: boolean = false;

// Hide the "แผนการรับนิสิต" link from the sidebar for now. The page itself
// (/scenario/admission-plan) still works by URL — flip to true to bring the link back.
const SHOW_ADMISSION_PLAN: boolean = false;

// Grey out "ค่าธรรมเนียมรายการหลัก" (/admin/university/main-fee) in the sidebar — shown faded and
// not clickable until it's needed. The page itself still works by URL — flip to true to enable.
const ENABLE_MAIN_FEE_PAGE: boolean = false;

// Hide the ปันส่วนต้นทุน links (under ตั้งค่าการคำนวณ) for now. The pages themselves
// (/admin/allocation-run, /admin/reconciliation, /admin/exceptions) still work by URL —
// flip to true to bring the links back.
const SHOW_ALLOCATION_SECTION: boolean = false;

// สีกล่องไอคอนเมนู — ชุดเดียวกับการ์ด KPI (ฟ้า · teal · ม่วง · ชมพู · navy · ส้ม)
const T = {
  blue: 'var(--mui-palette-primary-main)',
  teal: BEPS.breakEven,
  purple: BEPS.revenue.dark,
  pink: BEPS.cost.dark,
  navy: BEPS.profit,
  orange: 'var(--mui-palette-warning-main)',
};

// Tag links that are viewable without login (driven by accessControl → publicRoutes).
const publicChip = {
  label: 'สาธารณะ',
  size: 'small',
  variant: 'outlined',
  color: 'success',
} as const;

const tagPublic = (items: VerticalMenuDataType[]): VerticalMenuDataType[] =>
  items.map((item) => {
    if ('children' in item && item.children) {
      return { ...item, children: tagPublic(item.children) };
    }

    if ('href' in item && item.href && isPublicRoute(item.href)) {
      return { ...item, suffix: publicChip };
    }

    return item;
  });

// Drop any leaf link the viewer's role can't open, then drop sections/sub-menus left with
// no children. The menu only hides links this way — middleware still enforces access for real.
const filterByRole = (items: VerticalMenuDataType[], role: AppRole): VerticalMenuDataType[] =>
  items.reduce<VerticalMenuDataType[]>((acc, item) => {
    if ('children' in item && item.children) {
      let children = filterByRole(item.children, role);
      const isLanding = (c: VerticalMenuDataType) => 'icon' in c && c.icon === LANDING_LINK_ICON;

      // เหลือเมนูจริงแค่ 1 รายการ — ไม่ต้องมี "หน้ารวม"
      if (children.length === 2 && children.some(isLanding)) {
        children = children.filter((c) => !isLanding(c));
      }

      if (children.length > 0) {
        acc.push({ ...item, children });
      }

      return acc;
    }

    if (!('href' in item && item.href) || canAccess(role, item.href)) {
      acc.push(item);
    }

    return acc;
  }, []);

/**
 * Sidebar menu — single source of truth.
 *
 * Shapes (แบบ Materio):
 *   • Section : { label, isSection: true, children: [...] }   → ชื่อกลุ่มสีเทา + เส้นคั่น
 *   • SubMenu : { label, icon, children: [...] }              → เมนูหลัก ไอคอน + ลูกศรหุบ/ขยาย
 *   • Item    : { label, href, icon }                         → ลิงก์ (ในเมนูย่อยแสดงเป็นจุดวงกลม;
 *                                                               icon ยังใช้บนการ์ดหน้าแรกหมวด)
 *
 * Conventions (see CLAUDE.md → Access control · มติประชุม 21 ต.ค. 2569 ข้อ 1.6/1.7/6.1):
 *   • หมวดเรียงตามหน้าที่: Dashboard → ผลการดำเนินงาน → เจาะลึกจุดคุ้มทุน (ทุกบทบาท) → วิเคราะห์จุดคุ้มทุน (เจ้าหน้าที่ + อาจารย์)
 *     → ตั้งค่าการคำนวณ (เจ้าหน้าที่) → ทะเบียน & ระบบ (เจ้าหน้าที่ระดับมหาวิทยาลัย)
 *   • รายการแรกของเมนูย่อย = หน้าแรกหมวด (SectionLanding ดึงการ์ดจากเมนูย่อยที่มีลิงก์นั้น)
 *   • ใครเห็นลิงก์ไหนมาจาก routeAccessRules ใน accessControl.ts — filterByRole ซ่อนให้เอง ไม่ต้องเช็กบทบาทที่นี่
 *   • Keep routes shallow — aim for ≤ 3 path segments (e.g. /admin/users, /admin/university/units).
 *   • Visibility here is cosmetic; src/middleware.ts + accessControl.ts do the real enforcement.
 */
const verticalMenuData = (role: AppRole = DEFAULT_ROLE): VerticalMenuDataType[] => {
  const menu: VerticalMenuDataType[] = [
    // ── Dashboard — ทุกบทบาท (ระดับคณะ: ภาพรวมคณะล็อกที่คณะตน) · ประชุม 26 ต.ค. 2569 ─────
    {
      label: 'Dashboard',
      isSection: true,
      children: [
        { label: 'ภาพรวมมหาวิทยาลัย', href: '/overview', icon: 'ri-bank-line', iconColor: T.blue },
        { label: 'ภาพรวมคณะ', href: '/faculty', icon: 'ri-building-2-line', iconColor: T.purple },
      ],
    },

    // ── ผลการดำเนินงาน — รายคณะ (ทุกบทบาท) · URL ยังอยู่ใต้ /faculty ──────────
    {
      label: 'ผลการดำเนินงาน',
      isSection: true,
      children: [
        {
          label: 'รายได้',
          href: '/faculty/revenue',
          icon: 'ri-hand-coin-line',
          iconColor: T.purple,
        },
        {
          label: 'ต้นทุน / ค่าใช้จ่าย',
          href: '/faculty/cost',
          icon: 'ri-stack-line',
          iconColor: T.pink,
        },
        {
          label: 'จุดคุ้มทุน',
          href: '/faculty/breakeven',
          icon: 'ri-focus-3-line',
          iconColor: T.teal,
        },
      ],
    },

    // ── จุดคุ้มทุน — เจาะลึก (ทุกบทบาท) + วิเคราะห์ (เจ้าหน้าที่ ม./คณะ + อาจารย์) ──
    {
      label: 'จุดคุ้มทุน',
      isSection: true,
      children: [
        {
          label: 'เจาะลึกจุดคุ้มทุน',
          icon: 'ri-compass-3-line',
          iconColor: T.teal,
          children: [
            {
              label: 'หลักสูตรวิกฤต',
              href: '/deep-dive',
              icon: LANDING_LINK_ICON,
              iconColor: T.navy,
            },
            {
              label: 'จุดคุ้มทุนย้อนหลัง',
              href: '/deep-dive/breakeven',
              icon: 'ri-focus-3-line',
              iconColor: T.teal,
            },
            {
              label: 'รายได้ย้อนหลัง',
              href: '/deep-dive/revenue',
              icon: 'ri-hand-coin-line',
              iconColor: T.orange,
            },
            {
              label: 'ต้นทุนย้อนหลังรายหมวด',
              href: '/deep-dive/cost',
              icon: 'ri-stack-line',
              iconColor: T.pink,
            },
            // หน้าปีปัจจุบันเดิม — ซ้ำกับภาพรวมคณะ ซ่อนไว้ (มติ 2026-10-25)
            ...(SHOW_CURRENT_YEAR_PAGES
              ? [
                  {
                    label: 'คณะ · ระดับ · หลักสูตร',
                    href: '/breakeven',
                    icon: 'ri-node-tree',
                    iconColor: T.teal,
                  },
                  {
                    label: 'กราฟจุดคุ้มทุน',
                    href: '/breakeven/chart',
                    icon: 'ri-line-chart-line',
                    iconColor: T.purple,
                  },
                  {
                    label: 'รายได้รายคณะ',
                    href: '/revenue',
                    icon: 'ri-hand-coin-line',
                    iconColor: T.orange,
                  },
                  ...(SHOW_COST_PAGE
                    ? [
                        {
                          label: 'โครงสร้างต้นทุน',
                          href: '/cost',
                          icon: 'ri-stack-line',
                          iconColor: T.pink,
                        },
                      ]
                    : []),
                  {
                    label: 'รายได้ vs ต้นทุนต่อหัว',
                    href: '/perhead',
                    icon: 'ri-scales-3-line',
                    iconColor: T.navy,
                  },
                  {
                    label: 'วิเคราะห์เชิงเปรียบเทียบ',
                    href: '/cross',
                    icon: 'ri-bar-chart-grouped-line',
                    iconColor: T.blue,
                  },
                ]
              : []),
          ],
        },
        {
          label: 'วิเคราะห์จุดคุ้มทุน',
          icon: 'ri-graduation-cap-line',
          iconColor: T.blue,
          children: [
            {
              label: 'หลักสูตรเดิม',
              href: '/scenario/program/improve',
              icon: 'ri-graduation-cap-line',
              iconColor: T.blue,
            },
            {
              label: 'หลักสูตรใหม่',
              href: '/scenario/program/new',
              icon: 'ri-sparkling-line',
              iconColor: T.purple,
            },
            ...(SHOW_SCENARIO_PROGRAM2
              ? [
                  {
                    label: 'ปรับปรุงหลักสูตร (ปรับ 3 ทาง)',
                    href: '/scenario/program2',
                    icon: 'ri-focus-3-line',
                    iconColor: T.teal,
                  },
                ]
              : []),
            ...(SHOW_SCENARIO_FACULTY
              ? [
                  {
                    label: 'รายคณะ',
                    href: '/scenario/faculty',
                    icon: 'ri-calculator-line',
                    iconColor: T.teal,
                  },
                ]
              : []),
            ...(SHOW_SCENARIO_SANDBOX
              ? [
                  {
                    label: 'ห้องจำลองแผนรับนิสิต',
                    href: '/scenario/sandbox',
                    icon: 'ri-flask-line',
                    iconColor: T.pink,
                  },
                ]
              : []),
            ...(SHOW_ADMISSION_PLAN
              ? [
                  {
                    label: 'แผนการรับนิสิต',
                    href: '/scenario/admission-plan',
                    icon: 'ri-team-line',
                    iconColor: T.orange,
                  },
                ]
              : []),
          ],
        },
      ],
    },

    // ── ตั้งค่า & ระบบ — เจ้าหน้าที่ ม. + เจ้าหน้าที่คณะ (ทะเบียน/ระบบเฉพาะ ม.) ──
    {
      label: 'ตั้งค่า & ระบบ',
      isSection: true,
      children: [
        {
          label: 'ตั้งค่าการคำนวณ',
          icon: 'ri-settings-3-line',
          iconColor: T.navy,
          children: [
            { label: 'หน้ารวม', href: '/admin', icon: LANDING_LINK_ICON, iconColor: T.navy },
            {
              label: 'ตั้งค่าต้นทุน (คณะ)',
              href: '/admin/fixed-cost-lock',
              icon: 'ri-lock-line',
              iconColor: T.pink,
            },
            {
              label: 'นโยบายการคำนวณ',
              href: '/admin/university/settings',
              icon: 'ri-settings-3-line',
              iconColor: T.blue,
            },
            {
              label: 'ค่าธรรมเนียมหักสมทบ',
              href: '/admin/university/uni-share',
              icon: 'ri-bank-line',
              iconColor: T.teal,
            },
            {
              label: 'ค่าธรรมเนียมรายการหลัก',
              href: '/admin/university/main-fee',
              icon: 'ri-receipt-line',
              iconColor: T.purple,
              disabled: !ENABLE_MAIN_FEE_PAGE,
            },
            {
              label: 'กติกาผังบัญชี',
              href: '/admin/university/account-rules',
              icon: 'ri-file-list-3-line',
              iconColor: T.orange,
            },
            ...(SHOW_ALLOCATION_SECTION
              ? [
                  ...(SHOW_FIXED_COST_POLICY
                    ? [
                        {
                          label: 'นโยบายต้นทุนคงที่',
                          href: '/admin/fixed-cost-policy',
                          icon: 'ri-pushpin-line',
                          iconColor: T.purple,
                        },
                      ]
                    : []),
                  {
                    label: 'คอนโซลรอบคำนวณ',
                    href: '/admin/allocation-run',
                    icon: 'ri-rocket-line',
                    iconColor: T.blue,
                  },
                  {
                    label: 'ผลตรวจยอด',
                    href: '/admin/reconciliation',
                    icon: 'ri-checkbox-circle-line',
                    iconColor: T.teal,
                  },
                  {
                    label: 'รายการค้างตรวจ',
                    href: '/admin/exceptions',
                    icon: 'ri-error-warning-line',
                    iconColor: T.orange,
                  },
                ]
              : []),
          ],
        },
        {
          label: 'ทะเบียน & ระบบ',
          icon: 'ri-database-2-line',
          iconColor: T.pink,
          children: [
            {
              label: 'หน้ารวม',
              href: '/admin/university',
              icon: LANDING_LINK_ICON,
              iconColor: T.navy,
            },
            { label: 'ค่าธรรมเนียม', href: '/tuition', icon: 'ri-bill-line', iconColor: T.orange },
            {
              label: 'ข้อมูลต้นทุน',
              href: '/cost-data',
              icon: 'ri-database-2-line',
              iconColor: T.pink,
            },
            {
              label: 'ทะเบียนหลักสูตร',
              href: '/programs',
              icon: 'ri-book-2-line',
              iconColor: T.purple,
            },
            {
              label: 'ทะเบียนกลาง',
              href: '/admin/university/master-data',
              icon: 'ri-archive-drawer-line',
              iconColor: T.teal,
            },
            {
              label: 'ผังบัญชี ERP',
              href: '/admin/university/erp-accounts',
              icon: 'ri-links-line',
              iconColor: T.blue,
            },
            {
              label: 'จัดการหน่วยงาน',
              href: '/admin/university/units',
              icon: 'ri-government-line',
              iconColor: T.navy,
            },
            { label: 'ผู้ใช้งาน', href: '/users', icon: 'ri-user-line', iconColor: T.blue },
            {
              label: 'จัดการผู้ใช้',
              href: '/admin/users',
              icon: 'ri-shield-user-line',
              iconColor: T.pink,
            },
          ],
        },
        // ── อื่น ๆ — สูตรจะย้ายไปเป็นป็อปอัปในแต่ละหน้า (ข้อ 1.5) ──
        {
          label: 'อื่น ๆ',
          icon: 'ri-more-2-line',
          iconColor: T.orange,
          children: [
            {
              label: 'สูตร & หลักวิชาการ',
              href: '/method',
              icon: 'ri-functions',
              iconColor: T.purple,
            },
            ...(SHOW_ABOUT_PAGE
              ? [
                  {
                    label: 'เกี่ยวกับเรา',
                    href: '/about',
                    icon: 'ri-lightbulb-line',
                    iconColor: T.orange,
                  },
                ]
              : []),
          ],
        },
      ],
    },
  ];

  const visible = filterByRole(menu, role);

  return SHOW_PUBLIC_CHIP ? tagPublic(visible) : visible;
};

export default verticalMenuData;
