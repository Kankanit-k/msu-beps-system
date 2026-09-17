// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes';
import { accessLevelRank, requiredLevelFor } from '@/configs/accessControl';
import type { AppRole } from '@/configs/accessControl';

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

    if ('href' in item && item.href && requiredLevelFor(item.href) === 'public') {
      return { ...item, suffix: publicChip };
    }

    return item;
  });

// Drop any leaf link the viewer's rank can't reach, then drop sections/sub-menus left with
// no children. The menu only hides links this way — middleware still enforces access for real.
const filterByRank = (items: VerticalMenuDataType[], rank: number): VerticalMenuDataType[] =>
  items.reduce<VerticalMenuDataType[]>((acc, item) => {
    if ('children' in item && item.children) {
      const children = filterByRank(item.children, rank);

      if (children.length === 0) {
        return acc;
      }

      acc.push({ ...item, children });

      return acc;
    }

    if ('href' in item && item.href && accessLevelRank[requiredLevelFor(item.href)] > rank) {
      return acc;
    }

    acc.push(item);

    return acc;
  }, []);

/**
 * Sidebar menu — single source of truth.
 *
 * Shapes:
 *   • Section : { label, isSection: true, children: [...] }   → group heading
 *   • SubMenu : { label, icon, children: [...] }              → expandable group
 *   • Item    : { label, href, icon }                         → link
 *
 * Conventions (see CLAUDE.md → Access control):
 *   • Group items by purpose: ข้อมูลภาพรวม, เจาะลึกจุดคุ้มทุน, การวิเคราะห์, คำนวณด้วยตนเอง
 *     (open to any signed-in user) then ปันส่วนต้นทุน, ทะเบียนข้อมูลหลัก, ตั้งค่าระบบ (admin-only
 *     pages — kept together even where a section mixes access tiers; filterByRank hides what
 *     the viewer can't reach item-by-item).
 *   • Keep routes shallow — aim for ≤ 3 path segments (e.g. /admin/users, /admin/university/units).
 *   • Admin pages live under /admin/** ; university-wide pages under /admin/university/**.
 *   • Visibility here is cosmetic; src/middleware.ts + accessControl.ts do the real enforcement.
 */
const verticalMenuData = (role: AppRole = 'user'): VerticalMenuDataType[] => {
  const rank = accessLevelRank[role];

  const menu: VerticalMenuDataType[] = [
    // ── ข้อมูลภาพรวม — W1, W4 ─────────────────────────────────────────
    {
      label: 'ข้อมูลภาพรวม',
      isSection: true,
      children: [
        { label: 'ภาพรวมมหาวิทยาลัย', href: '/overview', icon: 'ri-home-smile-line' },
        { label: 'รายได้รายคณะ', href: '/revenue', icon: 'ri-money-dollar-circle-line' },
        { label: 'โครงสร้างต้นทุน', href: '/cost', icon: 'ri-pie-chart-2-line' },
        { label: 'รายได้ vs ต้นทุนต่อหัว', href: '/perhead', icon: 'ri-user-star-line' },
      ],
    },

    // ── เจาะลึกจุดคุ้มทุน — W2, W3 ────────────────────────────────────
    {
      label: 'เจาะลึกจุดคุ้มทุน',
      isSection: true,
      children: [
        { label: 'คณะ · ระดับ · หลักสูตร', href: '/breakeven', icon: 'ri-scales-3-line' },
        { label: 'กราฟจุดคุ้มทุน', href: '/breakeven/chart', icon: 'ri-line-chart-line' },
      ],
    },

    // ── การวิเคราะห์ — W5, W10 ───────────────────────────────────────
    {
      label: 'การวิเคราะห์',
      isSection: true,
      children: [
        { label: 'Cross Analysis', href: '/cross', icon: 'ri-grid-line' },
        { label: 'สูตร & หลักวิชาการ', href: '/method', icon: 'ri-book-read-line' },
      ],
    },

    // ── คำนวณด้วยตนเอง — W6, W7 ──────────────────────────────────────
    {
      label: 'คำนวณด้วยตนเอง',
      isSection: true,
      children: [
        { label: 'จุดคุ้มทุนรายคณะ', href: '/scenario/faculty', icon: 'ri-calculator-line' },
        { label: 'จุดคุ้มทุนรายหลักสูตร', href: '/scenario/program', icon: 'ri-calculator-line' },
      ],
    },

    // ── ปันส่วนต้นทุน (deptAdmin) — W11-W13 ───────────────────────────
    {
      label: 'ปันส่วนต้นทุน',
      isSection: true,
      children: [
        { label: 'คอนโซลรอบคำนวณ', href: '/admin/allocation-run', icon: 'ri-play-circle-line' },
        { label: 'ผลตรวจยอด', href: '/admin/reconciliation', icon: 'ri-checkbox-circle-line' },
        { label: 'รายการค้างตรวจ', href: '/admin/exceptions', icon: 'ri-error-warning-line' },
      ],
    },

    // ── ทะเบียนข้อมูลหลัก (mixed tiers — filterByRank hides what each viewer can't reach)
    // — W8, W9, W16, W18 + deptAdmin/universityAdmin registries ─────────
    {
      label: 'ทะเบียนข้อมูลหลัก',
      isSection: true,
      children: [
        { label: 'ค่าธรรมเนียม', href: '/tuition', icon: 'ri-bill-line' },
        { label: 'ข้อมูลต้นทุน', href: '/cost-data', icon: 'ri-database-2-line' },
        { label: 'ทะเบียนหลักสูตร', href: '/programs', icon: 'ri-book-2-line' },
        { label: 'ผู้ใช้งาน', href: '/users', icon: 'ri-table-line' },
        { label: 'จัดการผู้ใช้', href: '/admin/users', icon: 'ri-shield-user-line' },
        {
          label: 'ทะเบียนกลาง',
          href: '/admin/university/master-data',
          icon: 'ri-archive-drawer-line',
        },
        { label: 'ผังบัญชี ERP', href: '/admin/university/erp-accounts', icon: 'ri-links-line' },
      ],
    },

    // ── ตั้งค่าระบบ (universityAdmin) — W14, W15, W17 ─────────────────
    {
      label: 'ตั้งค่าระบบ',
      isSection: true,
      children: [
        { label: 'จัดการหน่วยงาน', href: '/admin/university/units', icon: 'ri-government-line' },
        {
          label: 'กติกาผังบัญชี',
          href: '/admin/university/account-rules',
          icon: 'ri-file-list-3-line',
        },
        {
          label: 'นโยบายการคำนวณ',
          href: '/admin/university/settings',
          icon: 'ri-settings-3-line',
        },
      ],
    },

    // ── อื่น ๆ / More (login) ───────────────────────────────────────────
    {
      label: 'อื่น ๆ',
      isSection: true,
      children: [{ label: 'เกี่ยวกับเรา', href: '/about', icon: 'ri-information-line' }],
    },
  ];

  return tagPublic(filterByRank(menu, rank));
};

export default verticalMenuData;
