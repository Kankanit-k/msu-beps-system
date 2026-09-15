// Type Imports
import type { AccessLevel } from '@/configs/accessControl'

/**
 * ผังเมนู BEPS — แหล่งเดียวที่ทั้ง verticalMenuData, horizontalMenuData และสารบัญหน้าจอ
 * (/screens) อ่าน
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
 *
 * `desc` / `isNew` ย้ายมาจากสารบัญ mockup/screens.html — เก็บไว้ที่เดียวกับเมนูเพื่อไม่ให้
 * มีรายชื่อหน้าจอสองชุดที่ค่อยๆ แยกจากกัน
 */
export type BepsNavItem = {
  w: string
  label: string
  href: string
  icon: string
  /** คำอธิบายหนึ่งบรรทัดว่าหน้านี้ตอบคำถามอะไร — ใช้ในสารบัญหน้าจอ */
  desc: string
  /** true = หน้าจอที่ออกแบบใหม่ในรอบ ER v2 (prototype v8-1 ไม่มี) */
  isNew?: boolean
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
      {
        w: 'W1',
        label: 'ภาพรวมมหาวิทยาลัย',
        href: '/overview',
        icon: 'ri-dashboard-line',
        desc: 'KPI 6 ตัว · TR เทียบ TC รายคณะ · โครงสร้างต้นทุน · คณะที่ทำส่วนเกินสูงสุดและที่ต้องเฝ้าระวัง'
      },
      {
        w: 'W4',
        label: 'รายได้รายคณะ',
        href: '/revenue',
        icon: 'ri-money-dollar-circle-line',
        desc: 'องค์ประกอบรายได้ เงินแผ่นดิน + เงินรายได้ · ตารางรายได้ · ต้นทุน · ส่วนเกิน รายคณะ'
      },
      {
        w: 'W4',
        label: 'โครงสร้างต้นทุน',
        href: '/cost-structure',
        icon: 'ri-stack-line',
        desc: 'TFC เทียบ TVC รายคณะ · ต้นทุนคงที่แยกองค์ประกอบ (หลักสูตร · สำนักงาน · ค่าเสื่อม)'
      },
      {
        w: 'W4',
        label: 'รายได้ vs ต้นทุน/หัว',
        href: '/per-head',
        icon: 'ri-user-line',
        desc: 'R เทียบ ATC เทียบ AVC รายคณะ · แผนภาพประสิทธิภาพ · ตารางเปรียบเทียบต่อหัวพร้อมค้นหา'
      }
    ]
  },
  {
    label: 'เจาะลึกจุดคุ้มทุน',
    icon: 'ri-compass-3-line',
    level: 'user',
    items: [
      {
        w: 'W2',
        label: 'คณะ · ระดับ · หลักสูตร',
        href: '/breakeven',
        icon: 'ri-compass-3-line',
        desc: 'ต้นไม้ คณะ → ระดับการศึกษา → หลักสูตร · ค้นหาและกรองตามสถานะได้ · ครบทุกหลักสูตร'
      },
      {
        w: 'W3',
        label: 'กราฟจุดคุ้มทุน',
        href: '/be-chart',
        icon: 'ri-line-chart-line',
        desc: 'เส้น TR เทียบ TC จุดตัดคือ Q* · เลือกหน่วยวิเคราะห์ได้ 4 ระดับ · มีข้อเสนอแนะแยกตามผู้ใช้'
      }
    ]
  },
  {
    label: 'การวิเคราะห์',
    icon: 'ri-fire-line',
    level: 'user',
    items: [
      {
        w: 'W5',
        label: 'Cross Analysis',
        href: '/cross',
        icon: 'ri-fire-line',
        desc: 'Heatmap ตัวชี้วัด 9 ตัว · scatter 2 ชุด · quadrant analysis · ตารางจัดอันดับสลับเกณฑ์ได้'
      },
      {
        w: 'W10',
        label: 'สูตร & หลักวิชาการ',
        href: '/formulas',
        icon: 'ri-ruler-2-line',
        desc: 'สูตรที่ 1–7 พร้อมคำอธิบาย · นิยามตัวแปร · การจำแนกประเภทต้นทุน · เอกสารอ้างอิง APA'
      }
    ]
  },
  {
    label: 'คำนวณด้วยตนเอง',
    icon: 'ri-edit-line',
    level: 'user',
    items: [
      {
        w: 'W6',
        label: 'จุดคุ้มทุนรายคณะ',
        href: '/scenario/faculty',
        icon: 'ri-edit-line',
        desc: 'เลือกคณะเพื่อดึงข้อมูลอัตโนมัติ แล้วปรับรายการ TFC/TVC เอง · เทียบผลทั้ง 2 ฐานรายได้'
      },
      {
        w: 'W7',
        label: 'จุดคุ้มทุนรายหลักสูตร',
        href: '/scenario/program',
        icon: 'ri-graduation-cap-line',
        desc: 'หลักสูตรเดิมดึงจากระบบ · หลักสูตรใหม่กรอกเอง · มีกราฟ ประวัติการคำนวณ และออกรายงาน PDF'
      }
    ]
  },
  {
    label: 'ปันส่วนต้นทุน',
    icon: 'ri-settings-3-line',
    level: 'deptAdmin',
    items: [
      {
        w: 'W11',
        label: 'รอบคำนวณ (Run)',
        href: '/admin/runs',
        icon: 'ri-settings-3-line',
        isNew: true,
        desc: 'สร้าง run ที่ล็อกงวด ขอบเขต ฐานต้นทุน และเวอร์ชันกติกา · ไทม์ไลน์สถานะ 5 ขั้น · ผู้สร้างอนุมัติเองไม่ได้'
      },
      {
        w: 'W12',
        label: 'ผลตรวจยอด',
        href: '/admin/reconciliation',
        icon: 'ri-file-list-3-line',
        isNew: true,
        desc: 'ยอดต้นทางเทียบยอดปันส่วน · สัดส่วน direct เทียบ allocated รายคณะ · ต้นทุนที่ปันส่วนแยกตามวิธี'
      },
      {
        w: 'W13',
        label: 'รายการค้างตรวจ',
        href: '/admin/exceptions',
        icon: 'ri-flag-line',
        isNew: true,
        desc: 'ธง UNCLASSIFIED · MISSING_DRIVER · NO_FEE · Q_ZERO พร้อมผู้รับผิดชอบและมูลค่าที่กระทบ'
      }
    ]
  },
  {
    label: 'ทะเบียนข้อมูลหลัก',
    icon: 'ri-building-line',
    level: 'deptAdmin',
    items: [
      {
        w: 'W16',
        label: 'ทะเบียนหลักสูตร',
        href: '/admin/programs',
        icon: 'ri-book-open-line',
        isNew: true,
        desc: 'เปิดหลักสูตรใหม่ · ปรับปรุงรอบ มคอ. (สร้างรุ่นใหม่ ไม่ทับของเดิม) · งดรับ · ปิดหลักสูตร + ตรวจความพร้อมก่อนเปิดสอน'
      },
      {
        w: 'W17',
        label: 'หน่วยงาน · งวด · นิสิต',
        href: '/admin/master-data',
        icon: 'ri-building-line',
        isNew: true,
        desc: 'โครงสร้างหน่วยงาน 3 ระดับ + จับคู่รหัส ERP · งวดปีงบประมาณและวันตัดยอดนิสิต · ประเภทนิสิต 4 แบบ'
      },
      {
        w: 'W19',
        label: 'ผังบัญชี 4 ระดับ',
        href: '/admin/erp-accounts',
        icon: 'ri-booklet-line',
        isNew: true,
        desc: 'เพิ่ม/แก้บัญชี ERP ด้วยคีย์ผสม 4 ระดับ + ช่วงปีที่มีผล · บอกได้ว่าบัญชีไหนยังไม่ผูกกติกา TFC/TVC'
      },
      {
        w: 'W8',
        label: 'ค่าธรรมเนียมการศึกษา',
        href: '/admin/tuition',
        icon: 'ri-bank-card-line',
        isNew: true,
        desc: 'ตารางอัตรา + workflow ร่าง → เสนอ → อนุมัติ · ช่วงปีที่มีผล · ประวัติการอนุมัติรายรายการ'
      },
      {
        w: 'W9',
        label: 'ข้อมูลต้นทุน & นำเข้า',
        href: '/admin/cost-data',
        icon: 'ri-download-cloud-2-line',
        isNew: true,
        desc: 'สถานะ sync ของแหล่งข้อมูล 6 แหล่ง · นำเข้า Excel · บล็อกตรวจความพร้อมก่อนสั่งคำนวณ'
      }
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
        icon: 'ri-folders-line',
        isNew: true,
        desc: 'คีย์ผสม 4 ระดับ · สัดส่วน MIXED · ช่วงปีที่มีผล พร้อมไทม์ไลน์รายปีของบัญชีเดียวกัน'
      },
      {
        w: 'W15',
        label: 'นโยบายการคำนวณ',
        href: '/admin/university/settings',
        icon: 'ri-equalizer-line',
        isNew: true,
        desc: 'ค่าตั้ง 10 รายการ 3 กลุ่ม · แสดงผลกระทบของแต่ละตัวเลือกเป็นตัวเลขจริง · ประวัติรายปี'
      },
      {
        w: 'W18',
        label: 'ผู้ใช้และสิทธิ์',
        href: '/admin/university/users',
        icon: 'ri-key-2-line',
        isNew: true,
        desc: 'จัดการบทบาทและขอบเขตรายคน (4 role ตาม schema) · ตารางสิทธิ์เต็ม 16 แถว · บันทึกการเปลี่ยนสิทธิ์'
      }
    ]
  }
]

/**
 * หน้าจอที่อยู่ **นอก** shell จึงไม่มีในเมนู แต่ต้องมีในสารบัญ
 *
 * W0 เป็นหน้าเข้าสู่ระบบ ส่วน /screens คือสารบัญตัวมันเอง — ไม่ใส่ตัวเองซ้ำ
 */
export const bepsOutsideShell: BepsNavItem[] = [
  {
    w: 'W0',
    label: 'เข้าสู่ระบบ + สิทธิ์',
    href: '/login',
    icon: 'ri-shield-keyhole-line',
    isNew: true,
    desc: 'SSO ของมหาวิทยาลัย และตารางว่าแต่ละบทบาทเห็นหน้าจอไหนบ้าง — prototype เดิมไม่มีชั้นนี้เลย'
  }
]

/** ทุกเส้นทางที่เมนูชี้ไป — ใช้ตรวจว่าสร้าง page.tsx ครบแล้วหรือยัง */
export const bepsNavHrefs = bepsNavGroups.flatMap(g => g.items.map(i => i.href))
