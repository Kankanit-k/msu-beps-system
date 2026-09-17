// Type Imports
import type { HorizontalMenuDataType } from '@/types/menuTypes';
import { accessLevelRank } from '@/configs/accessControl';
import type { AppRole } from '@/configs/accessControl';

// Mirrors src/data/navigation/verticalMenuData.tsx (horizontal layout uses sub-menus, no sections).
const horizontalMenuData = (role: AppRole = 'user'): HorizontalMenuDataType[] => {
  const rank = accessLevelRank[role];

  const menu: HorizontalMenuDataType[] = [
    {
      label: 'แดชบอร์ด',
      icon: 'ri-dashboard-line',
      children: [
        { label: 'หน้าหลัก', href: '/home', icon: 'ri-home-smile-line' },
        { label: 'CRM', href: '/dashboards/crm', icon: 'ri-line-chart-line' },
        { label: 'Analytics', href: '/dashboards/analytics', icon: 'ri-bar-chart-box-line' },
      ],
    },
    {
      label: 'ตาราง',
      icon: 'ri-table-line',
      children: [{ label: 'ผู้ใช้งาน', href: '/users', icon: 'ri-table-line' }],
    },
  ];

  if (rank >= accessLevelRank.deptAdmin) {
    menu.push({
      label: 'ผู้ดูแลหน่วยงาน',
      icon: 'ri-shield-user-line',
      children: [{ label: 'จัดการผู้ใช้', href: '/admin/users', icon: 'ri-shield-user-line' }],
    });
  }

  if (rank >= accessLevelRank.universityAdmin) {
    menu.push({
      label: 'ผู้ดูแลมหาวิทยาลัย',
      icon: 'ri-government-line',
      children: [
        { label: 'จัดการหน่วยงาน', href: '/admin/university/units', icon: 'ri-government-line' },
      ],
    });
  }

  menu.push({ label: 'เกี่ยวกับเรา', href: '/about', icon: 'ri-information-line' });

  return menu;
};

export default horizontalMenuData;
