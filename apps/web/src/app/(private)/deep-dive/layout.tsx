// Type Imports
import type { ReactNode } from 'react';

// Component Imports
import { DeepDiveProvider } from '@views/deep-dive/DeepDiveContext';

// หมวดเจาะลึก (ย้อนหลัง 5 ปี) ใช้ตัวกรองชุดเดียวกันทุกหน้า — ไม่หายเมื่อสลับหน้า
const DeepDiveLayout = ({ children }: { children: ReactNode }) => (
  <DeepDiveProvider>{children}</DeepDiveProvider>
);

export default DeepDiveLayout;
