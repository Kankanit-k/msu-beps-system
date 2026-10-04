// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes';
import { SHOW_ABOUT_PAGE, accessLevelRank, requiredLevelFor } from '@/configs/accessControl';
import type { AppRole } from '@/configs/accessControl';

// Show/hide the "สาธารณะ" chip in the sidebar. The tagging logic below stays intact —
// flip this to true to bring the chip back.
const SHOW_PUBLIC_CHIP: boolean = false;

// Hide the "แผนการรับนิสิต" link from the sidebar for now. The page itself
// (/scenario/admission-plan) still works by URL — flip to true to bring the link back.
const SHOW_ADMISSION_PLAN: boolean = false;

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
      defaultOpen: true,
      children: [
        { label: 'ภาพรวมมหาวิทยาลัย', href: '/overview', icon: '📊' },
        { label: 'รายได้รายคณะ', href: '/revenue', icon: '💰' },
        { label: 'โครงสร้างต้นทุน', href: '/cost', icon: '🏗️' },
        { label: 'รายได้ vs ต้นทุนต่อหัว', href: '/perhead', icon: '🧑‍🎓' },
      ],
    },

    // ── เจาะลึกจุดคุ้มทุน — W2, W3 ────────────────────────────────────
    {
      label: 'เจาะลึกจุดคุ้มทุน',
      isSection: true,
      children: [
        { label: 'คณะ · ระดับ · หลักสูตร', href: '/breakeven', icon: '🧭' },
        { label: 'กราฟจุดคุ้มทุน', href: '/breakeven/chart', icon: '📈' },
      ],
    },

    // ── การวิเคราะห์ — W5, W10 ───────────────────────────────────────
    {
      label: 'การวิเคราะห์',
      isSection: true,
      children: [
        {
          label: 'วิเคราะห์เชิงเปรียบเทียบ (Cross Analysis)',
          href: '/cross',
          icon: '🔍',
        },
        { label: 'สูตร & หลักวิชาการ', href: '/method', icon: '📐' },
      ],
    },

    // ── คำนวณด้วยตนเอง — W6, W7 ──────────────────────────────────────
    {
      label: 'คำนวณด้วยตนเอง',
      isSection: true,
      children: [
        { label: 'จุดคุ้มทุนรายคณะ', href: '/scenario/faculty', icon: '🧮' },
        { label: 'จุดคุ้มทุนรายหลักสูตร', href: '/scenario/program', icon: '🎓' },
        ...(SHOW_ADMISSION_PLAN
          ? [{ label: 'แผนการรับนิสิต', href: '/scenario/admission-plan', icon: '👥' }]
          : []),
      ],
    },

    // ── ปันส่วนต้นทุน (deptAdmin) — W11-W13 ───────────────────────────
    {
      label: 'ปันส่วนต้นทุน',
      isSection: true,
      children: [
        {
          label: 'นโยบายต้นทุนคงที่',
          href: '/admin/fixed-cost-policy',
          icon: '📌',
        },
        { label: 'คอนโซลรอบคำนวณ', href: '/admin/allocation-run', icon: '🚀' },
        { label: 'ผลตรวจยอด', href: '/admin/reconciliation', icon: '✅' },
        { label: 'รายการค้างตรวจ', href: '/admin/exceptions', icon: '⚠️' },
      ],
    },

    // ── ทะเบียนข้อมูลหลัก (mixed tiers — filterByRank hides what each viewer can't reach)
    // — W8, W9, W16, W18 + deptAdmin/universityAdmin registries ─────────
    {
      label: 'ทะเบียนข้อมูลหลัก',
      isSection: true,
      children: [
        { label: 'ค่าธรรมเนียม', href: '/tuition', icon: '🧾' },
        { label: 'ข้อมูลต้นทุน', href: '/cost-data', icon: '🗃️' },
        { label: 'ทะเบียนหลักสูตร', href: '/programs', icon: '📚' },
        { label: 'ผู้ใช้งาน', href: '/users', icon: '👤' },
        { label: 'จัดการผู้ใช้', href: '/admin/users', icon: '🛡️' },
        {
          label: 'ทะเบียนกลาง',
          href: '/admin/university/master-data',
          icon: '🗄️',
        },
        { label: 'ผังบัญชี ERP', href: '/admin/university/erp-accounts', icon: '🔗' },
      ],
    },

    // ── ตั้งค่าระบบ (universityAdmin) — W14, W15, W17 ─────────────────
    {
      label: 'ตั้งค่าระบบ',
      isSection: true,
      children: [
        { label: 'จัดการหน่วยงาน', href: '/admin/university/units', icon: '🏛️' },
        {
          label: 'กติกาผังบัญชี',
          href: '/admin/university/account-rules',
          icon: '📋',
        },
        {
          label: 'นโยบายการคำนวณ',
          href: '/admin/university/settings',
          icon: '⚙️',
        },
      ],
    },

    // ── อื่น ๆ / More (login) ───────────────────────────────────────────
    {
      label: 'อื่น ๆ',
      isSection: true,
      children: SHOW_ABOUT_PAGE ? [{ label: 'เกี่ยวกับเรา', href: '/about', icon: '💡' }] : [],
    },
  ];

  const visible = filterByRank(menu, rank);

  return SHOW_PUBLIC_CHIP ? tagPublic(visible) : visible;
};

export default verticalMenuData;
