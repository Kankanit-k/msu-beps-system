// Type Imports
import type { HorizontalMenuDataType } from '@/types/menuTypes';
import { DEFAULT_ROLE, SHOW_ABOUT_PAGE, canAccess } from '@/configs/accessControl';
import type { AppRole } from '@/configs/accessControl';

// Mirrors src/data/navigation/verticalMenuData.tsx (horizontal layout uses sub-menus, no sections).
const horizontalMenuData = (role: AppRole = DEFAULT_ROLE): HorizontalMenuDataType[] => {
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
  ];

  if (canAccess(role, '/admin/users')) {
    menu.push({
      label: 'ผู้ดูแลระบบ',
      icon: 'ri-government-line',
      children: [
        { label: 'ผู้ใช้งาน', href: '/users', icon: 'ri-table-line' },
        { label: 'จัดการผู้ใช้', href: '/admin/users', icon: 'ri-shield-user-line' },
        { label: 'จัดการหน่วยงาน', href: '/admin/university/units', icon: 'ri-government-line' },
      ],
    });
  }

  if (SHOW_ABOUT_PAGE && canAccess(role, '/about')) {
    menu.push({ label: 'เกี่ยวกับเรา', href: '/about', icon: 'ri-information-line' });
  }

  return menu;
};

export default horizontalMenuData;
