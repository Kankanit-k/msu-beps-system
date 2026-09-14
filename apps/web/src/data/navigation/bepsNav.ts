// Type Imports
import type { AccessLevel } from '@/configs/accessControl'

/**
 * ผังเมนู BEPS — แหล่งเดียวที่ทั้ง verticalMenuData และ horizontalMenuData อ่าน
 *
 * ยกโครงมาจาก NAV ใน mockup/assets/core.js:64-124 ตรงตัว (7 กลุ่ม เรียงลำดับเดิม)
 * เพิ่มเข้ามาคือ `href` ที่แทนชื่อไฟล์ .html เดิม และ `level` ที่แปลง `role` ของ mockup
 * เป็นชั้นสิทธิ์ของเทมเพลต:
 *
 *   (ไม่มี role)      → user             หน้าวิเคราะห์ ใครล็อกอินก็ดูได้
 *   'นักวิเคราะห์'     → deptAdmin        /admin/**
 *   'ผู้ดูแลข้อมูล'    → deptAdmin        /admin/**
 *   'ผู้ดูแลระบบ'      → universityAdmin  /admin/university/**
 *
 * `w` เก็บรหัสหน้าจอไว้เพื่ออ้างกลับไปยัง mockup และ SA.md §9 ได้ และใช้แสดง
 * เป็นป้ายท้ายรายการเมนูเหมือนที่ mockup ทำ
 */
export type BepsNavItem = {
  w: string
  label: string
  href: string
  icon: string
}

export type BepsNavGroup = {
  label: string
  icon: string
  level: AccessLevel
  items: BepsNavItem[]
}

export const bepsNavGroups: BepsNavGroup[] = [
  {
    label: 'ข้อมูลภาพรวม',
    icon: 'ri-dashboard-line',
    level: 'user',
    items: [
      { w: 'W1', label: 'ภาพรวมมหาวิทยาลัย', href: '/overview', icon: 'ri-dashboard-line' },
      { w: 'W4', label: 'รายได้รายคณะ', href: '/revenue', icon: 'ri-money-dollar-circle-line' },
      { w: 'W4', label: 'โครงสร้างต้นทุน', href: '/cost-structure', icon: 'ri-stack-line' },
      { w: 'W4', label: 'รายได้ vs ต้นทุน/หัว', href: '/per-head', icon: 'ri-user-line' }
    ]
  },
  {
    label: 'เจาะลึกจุดคุ้มทุน',
    icon: 'ri-compass-3-line',
    level: 'user',
    items: [
      { w: 'W2', label: 'คณะ · ระดับ · หลักสูตร', href: '/breakeven', icon: 'ri-compass-3-line' },
      { w: 'W3', label: 'กราฟจุดคุ้มทุน', href: '/be-chart', icon: 'ri-line-chart-line' }
    ]
  },
  {
    label: 'การวิเคราะห์',
    icon: 'ri-fire-line',
    level: 'user',
    items: [
      { w: 'W5', label: 'Cross Analysis', href: '/cross', icon: 'ri-fire-line' },
      { w: 'W10', label: 'สูตร & หลักวิชาการ', href: '/formulas', icon: 'ri-ruler-2-line' }
    ]
  },
  {
    label: 'คำนวณด้วยตนเอง',
    icon: 'ri-edit-line',
    level: 'user',
    items: [
      { w: 'W6', label: 'จุดคุ้มทุนรายคณะ', href: '/scenario/faculty', icon: 'ri-edit-line' },
      { w: 'W7', label: 'จุดคุ้มทุนรายหลักสูตร', href: '/scenario/program', icon: 'ri-graduation-cap-line' }
    ]
  },
  {
    label: 'ปันส่วนต้นทุน',
    icon: 'ri-settings-3-line',
    level: 'deptAdmin',
    items: [
      { w: 'W11', label: 'รอบคำนวณ (Run)', href: '/admin/runs', icon: 'ri-settings-3-line' },
      { w: 'W12', label: 'ผลตรวจยอด', href: '/admin/reconciliation', icon: 'ri-file-list-3-line' },
      { w: 'W13', label: 'รายการค้างตรวจ', href: '/admin/exceptions', icon: 'ri-flag-line' }
    ]
  },
  {
    label: 'ทะเบียนข้อมูลหลัก',
    icon: 'ri-building-line',
    level: 'deptAdmin',
    items: [
      { w: 'W16', label: 'ทะเบียนหลักสูตร', href: '/admin/programs', icon: 'ri-book-open-line' },
      { w: 'W17', label: 'หน่วยงาน · งวด · นิสิต', href: '/admin/master-data', icon: 'ri-building-line' },
      { w: 'W19', label: 'ผังบัญชี 4 ระดับ', href: '/admin/erp-accounts', icon: 'ri-booklet-line' },
      { w: 'W8', label: 'ค่าธรรมเนียมการศึกษา', href: '/admin/tuition', icon: 'ri-bank-card-line' },
      { w: 'W9', label: 'ข้อมูลต้นทุน & นำเข้า', href: '/admin/cost-data', icon: 'ri-download-cloud-2-line' }
    ]
  },
  {
    label: 'ตั้งค่าระบบ',
    icon: 'ri-equalizer-line',
    level: 'universityAdmin',
    items: [
      {
        w: 'W14',
        label: 'กติกาผังบัญชี TFC/TVC',
        href: '/admin/university/account-rules',
        icon: 'ri-folders-line'
      },
      { w: 'W15', label: 'นโยบายการคำนวณ', href: '/admin/university/settings', icon: 'ri-equalizer-line' },
      { w: 'W18', label: 'ผู้ใช้และสิทธิ์', href: '/admin/university/users', icon: 'ri-key-2-line' }
    ]
  }
]

/** ทุกเส้นทางที่เมนูชี้ไป — ใช้ตรวจว่าสร้าง page.tsx ครบแล้วหรือยัง */
export const bepsNavHrefs = bepsNavGroups.flatMap(g => g.items.map(i => i.href))
