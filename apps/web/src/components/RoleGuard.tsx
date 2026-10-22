'use client';

// Next Imports
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

// MUI Imports
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';

// Type Imports
import type { ChildrenType } from '@core/types';

// Config Imports
import { canAccess, roleDisplay, roleNeedsScope } from '@/configs/accessControl';
import themeConfig from '@configs/themeConfig';

// Hook Imports
import { useRole } from '@/hooks/useRole';

/**
 * กันหน้าตามบทบาทที่กำลังดู (มุมมองสิทธิ์) — ให้ตรงกับเมนู แม้พิมพ์ URL ตรง ๆ
 * จำเป็นตอน demo ที่ปิด auth (middleware ข้ามการเช็ก) · การกันจริงยังอยู่ที่ middleware
 *
 * บทบาทระดับคณะที่ยังไม่ได้เลือกคณะ ห้ามเห็นหน้าที่ล็อกตามคณะ (หน้าเหล่านั้นถือว่า "ไม่มีคณะ" = ทุกคณะ)
 * — ยกเว้นภาพรวมมหาวิทยาลัยที่ทุกบทบาทเห็นทั้งมหาวิทยาลัยอยู่แล้ว
 */
const RoleGuard = ({ children }: ChildrenType) => {
  const pathname = usePathname();
  const { role, scope, ready } = useRole();

  // ยังไม่ได้อ่านบทบาทจาก localStorage — อย่าเพิ่งเรนเดอร์หน้า (กันหน้าที่ไม่มีสิทธิ์โผล่แวบหนึ่ง)
  if (!ready) {
    return null;
  }

  const homeButton = (
    <Button component={NextLink} href={themeConfig.homePageUrl} color="inherit" size="small">
      กลับหน้าภาพรวม
    </Button>
  );

  if (!canAccess(role, pathname)) {
    return (
      <Alert severity="warning" action={homeButton}>
        <AlertTitle>ไม่มีสิทธิ์เข้าหน้านี้</AlertTitle>
        บทบาท “{roleDisplay[role].label}” ไม่ได้รับสิทธิ์ใช้งานหน้านี้ — เปลี่ยนมุมมองสิทธิ์จากเมนูโปรไฟล์
        หรือเลือกเมนูด้านซ้าย
      </Alert>
    );
  }

  const isUniversityOverview = pathname.replace(/\/$/, '') === themeConfig.homePageUrl;

  if (roleNeedsScope(role) && !scope.faculty && !isUniversityOverview) {
    return (
      <Alert severity="info" action={homeButton}>
        <AlertTitle>ยังไม่ได้ระบุคณะ</AlertTitle>
        บทบาท “{roleDisplay[role].label}” เห็นข้อมูลเฉพาะคณะของตน — เลือกคณะจากเมนูโปรไฟล์
        (มุมมองสิทธิ์) ก่อน
      </Alert>
    );
  }

  return children;
};

export default RoleGuard;
