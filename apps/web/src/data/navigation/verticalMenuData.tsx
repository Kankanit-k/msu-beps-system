// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes';
import {
  DEFAULT_ROLE,
  SHOW_ABOUT_PAGE,
  SHOW_COST_PAGE,
  SHOW_FIXED_COST_POLICY,
  SHOW_SCENARIO_PROGRAM2,
  SHOW_SCENARIO_SANDBOX,
  canAccess,
  isPublicRoute,
} from '@/configs/accessControl';
import { LANDING_LINK_ICON } from '@/data/navigation/sectionLandings';
import type { AppRole } from '@/configs/accessControl';

// Show/hide the "สาธารณะ" chip in the sidebar. The tagging logic below stays intact —
// flip this to true to bring the chip back.
const SHOW_PUBLIC_CHIP: boolean = false;

// Hide the "แผนการรับนิสิต" link from the sidebar for now. The page itself
// (/scenario/admission-plan) still works by URL — flip to true to bring the link back.
const SHOW_ADMISSION_PLAN: boolean = false;

// Hide the ปันส่วนต้นทุน links (under ตั้งค่าการคำนวณ) for now. The pages themselves
// (/admin/allocation-run, /admin/reconciliation, /admin/exceptions) still work by URL —
// flip to true to bring the links back.
const SHOW_ALLOCATION_SECTION: boolean = false;

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
// ลิงก์หน้าแรกของหมวด — รายการแรกของทุกหมวด ใช้ชื่อเดียวกับหัวหมวด
// (ยกเว้นภาพรวม ที่หน้าภาพรวมมหาวิทยาลัยเป็นหน้าแรกอยู่แล้ว)
const landingLink = (label: string, href: string) => ({ label, href, icon: LANDING_LINK_ICON });

const filterByRole = (items: VerticalMenuDataType[], role: AppRole): VerticalMenuDataType[] =>
  items.reduce<VerticalMenuDataType[]>((acc, item) => {
    if ('children' in item && item.children) {
      const children = filterByRole(item.children, role);

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
 * Shapes:
 *   • Section : { label, isSection: true, children: [...] }   → group heading
 *   • SubMenu : { label, icon, children: [...] }              → expandable group
 *   • Item    : { label, href, icon }                         → link
 *
 * Conventions (see CLAUDE.md → Access control · มติประชุม 21 ต.ค. 2569 ข้อ 1.6/1.7/6.1):
 *   • หมวดเรียงตามหน้าที่: ภาพรวม → เจาะลึกจุดคุ้มทุน (ทุกบทบาท) → วิเคราะห์จุดคุ้มทุน (เจ้าหน้าที่ + อาจารย์)
 *     → ตั้งค่าการคำนวณ (เจ้าหน้าที่) → ทะเบียน & ระบบ (เจ้าหน้าที่ระดับมหาวิทยาลัย)
 *   • ใครเห็นลิงก์ไหนมาจาก routeAccessRules ใน accessControl.ts — filterByRole ซ่อนให้เอง ไม่ต้องเช็กบทบาทที่นี่
 *   • Keep routes shallow — aim for ≤ 3 path segments (e.g. /admin/users, /admin/university/units).
 *   • Visibility here is cosmetic; src/middleware.ts + accessControl.ts do the real enforcement.
 */
const verticalMenuData = (role: AppRole = DEFAULT_ROLE): VerticalMenuDataType[] => {
  const menu: VerticalMenuDataType[] = [
    // ── ภาพรวม — ทุกบทบาท (ระดับคณะ: ภาพรวมคณะล็อกที่คณะตน) ─────────────
    {
      label: 'ภาพรวม',
      isSection: true,
      defaultOpen: true,
      children: [
        { label: 'ภาพรวมมหาวิทยาลัย', href: '/overview', icon: '📊' },
        { label: 'ภาพรวมคณะ', href: '/faculty', icon: '🏫' },
      ],
    },

    // ── เจาะลึกจุดคุ้มทุน — ทุกบทบาท (ระดับคณะเห็นเฉพาะคณะตน) ───────────
    {
      label: 'เจาะลึกจุดคุ้มทุน',
      isSection: true,
      children: [
        landingLink('เจาะลึกจุดคุ้มทุน', '/deep-dive'),
        { label: 'คณะ · ระดับ · หลักสูตร', href: '/breakeven', icon: '🧭' },
        { label: 'กราฟจุดคุ้มทุน', href: '/breakeven/chart', icon: '📈' },
        { label: 'รายได้รายคณะ', href: '/revenue', icon: '💰' },
        ...(SHOW_COST_PAGE ? [{ label: 'โครงสร้างต้นทุน', href: '/cost', icon: '🏗️' }] : []),
        { label: 'รายได้ vs ต้นทุนต่อหัว', href: '/perhead', icon: '🧑‍🎓' },
        { label: 'วิเคราะห์เชิงเปรียบเทียบ', href: '/cross', icon: '🔍' },
      ],
    },

    // ── วิเคราะห์จุดคุ้มทุน — เจ้าหน้าที่ ม./คณะ + อาจารย์ (หลักสูตรตน) ─────
    {
      label: 'วิเคราะห์จุดคุ้มทุน',
      isSection: true,
      children: [
        landingLink('วิเคราะห์จุดคุ้มทุน', '/scenario'),
        { label: 'หลักสูตรเดิม', href: '/scenario/program/improve', icon: '🎓' },
        { label: 'หลักสูตรใหม่', href: '/scenario/program/new', icon: '✨' },
        ...(SHOW_SCENARIO_PROGRAM2
          ? [{ label: 'ปรับปรุงหลักสูตร (ปรับ 3 ทาง)', href: '/scenario/program2', icon: '🎯' }]
          : []),
        { label: 'รายคณะ', href: '/scenario/faculty', icon: '🧮' },
        ...(SHOW_SCENARIO_SANDBOX
          ? [{ label: 'ห้องจำลองแผนรับนิสิต', href: '/scenario/sandbox', icon: '🧪' }]
          : []),
        ...(SHOW_ADMISSION_PLAN
          ? [{ label: 'แผนการรับนิสิต', href: '/scenario/admission-plan', icon: '👥' }]
          : []),
      ],
    },

    // ── ตั้งค่าการคำนวณ — เจ้าหน้าที่ ม. + เจ้าหน้าที่คณะ (นโยบาย/ผังบัญชีเฉพาะ ม.) ──
    {
      label: 'ตั้งค่าการคำนวณ',
      isSection: true,
      children: [
        landingLink('ตั้งค่าการคำนวณ', '/admin'),
        { label: 'วิธีปันส่วน (คณะ)', href: '/admin/fixed-cost-lock', icon: '🔒' },
        { label: 'นโยบายการคำนวณ', href: '/admin/university/settings', icon: '⚙️' },
        { label: 'กติกาผังบัญชี', href: '/admin/university/account-rules', icon: '📋' },
        ...(SHOW_ALLOCATION_SECTION
          ? [
              ...(SHOW_FIXED_COST_POLICY
                ? [{ label: 'นโยบายต้นทุนคงที่', href: '/admin/fixed-cost-policy', icon: '📌' }]
                : []),
              { label: 'คอนโซลรอบคำนวณ', href: '/admin/allocation-run', icon: '🚀' },
              { label: 'ผลตรวจยอด', href: '/admin/reconciliation', icon: '✅' },
              { label: 'รายการค้างตรวจ', href: '/admin/exceptions', icon: '⚠️' },
            ]
          : []),
      ],
    },

    // ── ทะเบียน & ระบบ — เจ้าหน้าที่ระดับมหาวิทยาลัย ─────────────────────
    {
      label: 'ทะเบียน & ระบบ',
      isSection: true,
      children: [
        landingLink('ทะเบียน & ระบบ', '/admin/university'),
        { label: 'ค่าธรรมเนียม', href: '/tuition', icon: '🧾' },
        { label: 'ข้อมูลต้นทุน', href: '/cost-data', icon: '🗃️' },
        { label: 'ทะเบียนหลักสูตร', href: '/programs', icon: '📚' },
        { label: 'ทะเบียนกลาง', href: '/admin/university/master-data', icon: '🗄️' },
        { label: 'ผังบัญชี ERP', href: '/admin/university/erp-accounts', icon: '🔗' },
        { label: 'จัดการหน่วยงาน', href: '/admin/university/units', icon: '🏛️' },
        { label: 'ผู้ใช้งาน', href: '/users', icon: '👤' },
        { label: 'จัดการผู้ใช้', href: '/admin/users', icon: '🛡️' },
      ],
    },

    // ── อื่น ๆ — สูตรจะย้ายไปเป็นป็อปอัปในแต่ละหน้า (ข้อ 1.5) ──────────────
    {
      label: 'อื่น ๆ',
      isSection: true,
      children: [
        { label: 'สูตร & หลักวิชาการ', href: '/method', icon: '📐' },
        ...(SHOW_ABOUT_PAGE ? [{ label: 'เกี่ยวกับเรา', href: '/about', icon: '💡' }] : []),
      ],
    },
  ];

  const visible = filterByRole(menu, role);

  return SHOW_PUBLIC_CHIP ? tagPublic(visible) : visible;
};

export default verticalMenuData;
