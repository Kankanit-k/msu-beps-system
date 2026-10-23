// Type Imports
import type { ReactNode } from 'react';

// Component Imports
import { FacultyProvider } from '@views/faculty/FacultyContext';

// ภาพรวมคณะ + หน้าย่อย ใช้คณะ · ปี · ฐานรายได้ · ระดับ ชุดเดียวกัน (ไม่หายเมื่อสลับหน้า)
const FacultyLayout = ({ children }: { children: ReactNode }) => (
  <FacultyProvider>{children}</FacultyProvider>
);

export default FacultyLayout;
