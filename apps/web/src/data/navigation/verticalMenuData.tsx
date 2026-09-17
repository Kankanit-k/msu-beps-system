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

/**
 * Sidebar menu — single source of truth.
 *
 * Shapes:
 *   • Section : { label, isSection: true, children: [...] }   → group heading
 *   • SubMenu : { label, icon, children: [...] }              → expandable group
 *   • Item    : { label, href, icon }                         → link
 *
 * Conventions (see CLAUDE.md → Access control):
 *   • Group items by purpose: "แดชบอร์ด" (dashboards), "ตาราง" (tables).
 *   • Keep routes shallow — aim for ≤ 3 path segments (e.g. /admin/users, /admin/university/units).
 *   • Admin pages live under /admin/** ; university-wide pages under /admin/university/**.
 *   • Sections are gated by the viewed `role` here AND enforced in middleware.
 */
const verticalMenuData = (role: AppRole = 'user'): VerticalMenuDataType[] => {
  const rank = accessLevelRank[role];

  const menu: VerticalMenuDataType[] = [
    // ── แดชบอร์ด / Dashboards (login) — W1-W7 ───────────────────────
    {
      label: 'แดชบอร์ด',
      isSection: true,
      children: [
        { label: 'ภาพรวมมหาวิทยาลัย', href: '/overview', icon: 'ri-home-smile-line' },
        { label: 'เจาะลึกจุดคุ้มทุน', href: '/breakeven', icon: 'ri-scales-3-line' },
        { label: 'กราฟจุดคุ้มทุน', href: '/breakeven/chart', icon: 'ri-line-chart-line' },
        { label: 'รายได้ vs ต้นทุนต่อหัว', href: '/perhead', icon: 'ri-user-star-line' },
        { label: 'โครงสร้างต้นทุน', href: '/cost', icon: 'ri-pie-chart-2-line' },
        { label: 'รายได้รายคณะ', href: '/revenue', icon: 'ri-money-dollar-circle-line' },
        { label: 'Cross Analysis', href: '/cross', icon: 'ri-grid-line' },
        {
          label: 'คำนวณจุดคุ้มทุน',
          icon: 'ri-calculator-line',
          children: [
            { label: 'รายคณะ', href: '/scenario/faculty' },
            { label: 'รายหลักสูตร', href: '/scenario/program' },
          ],
        },
      ],
    },

    // ── ข้อมูล / Data (login) — W8, W9, W16, W18 ─────────────────────
    {
      label: 'ข้อมูล',
      isSection: true,
      children: [
        { label: 'ค่าธรรมเนียม', href: '/tuition', icon: 'ri-bill-line' },
        { label: 'ข้อมูลต้นทุน', href: '/cost-data', icon: 'ri-database-2-line' },
        { label: 'ทะเบียนหลักสูตร', href: '/programs', icon: 'ri-book-2-line' },
        { label: 'ผู้ใช้งาน', href: '/users', icon: 'ri-table-line' },
      ],
    },

    // ── เอกสารวิธีการ / Methodology (login) — W10 ────────────────────
    {
      label: 'เอกสาร',
      isSection: true,
      children: [{ label: 'สูตร & หลักวิชาการ', href: '/method', icon: 'ri-book-read-line' }],
    },
  ];

  // ── ผู้ดูแลหน่วยงาน / Department admin (/admin/**) — W11-W13 ─────────
  if (rank >= accessLevelRank.deptAdmin) {
    menu.push({
      label: 'ผู้ดูแลหน่วยงาน',
      isSection: true,
      children: [
        { label: 'จัดการผู้ใช้', href: '/admin/users', icon: 'ri-shield-user-line' },
        { label: 'คอนโซลรอบคำนวณ', href: '/admin/allocation-run', icon: 'ri-play-circle-line' },
        { label: 'ผลตรวจยอด', href: '/admin/reconciliation', icon: 'ri-checkbox-circle-line' },
        { label: 'รายการค้างตรวจ', href: '/admin/exceptions', icon: 'ri-error-warning-line' },
      ],
    });
  }

  // ── ผู้ดูแลมหาวิทยาลัย / University admin (/admin/university/**) — W14,15,17,19 ──
  if (rank >= accessLevelRank.universityAdmin) {
    menu.push({
      label: 'ผู้ดูแลมหาวิทยาลัย',
      isSection: true,
      children: [
        { label: 'จัดการหน่วยงาน', href: '/admin/university/units', icon: 'ri-government-line' },
        {
          label: 'ทะเบียนกลาง',
          href: '/admin/university/master-data',
          icon: 'ri-archive-drawer-line',
        },
        {
          label: 'กติกาผังบัญชี',
          href: '/admin/university/account-rules',
          icon: 'ri-file-list-3-line',
        },
        { label: 'ผังบัญชี ERP', href: '/admin/university/erp-accounts', icon: 'ri-links-line' },
        {
          label: 'นโยบายการคำนวณ',
          href: '/admin/university/settings',
          icon: 'ri-settings-3-line',
        },
      ],
    });
  }

  // ── อื่น ๆ / More (login) ───────────────────────────────────────────
  menu.push({
    label: 'อื่น ๆ',
    isSection: true,
    children: [{ label: 'เกี่ยวกับเรา', href: '/about', icon: 'ri-information-line' }],
  });

  return tagPublic(menu);
};

export default verticalMenuData;
