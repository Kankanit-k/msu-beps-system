'use client';

/**
 * แถบแจ้งที่มาของวิธีปันส่วนที่ใช้คำนวณ — ไม่บล็อกการคำนวณ (มติ 25 ต.ค. 2569: ไม่บังคับคณะเลือก)
 * ค่าปีนี้ / ยกจากปีก่อน / ค่าตาม Excel · เจ้าหน้าที่คณะและกองแผนมีปุ่มไปตั้งค่า
 * ชื่อไฟล์คงเดิม (NoLockAlert) เพื่อไม่ต้องแก้ import ของหน้าที่เรียกใช้
 */
import Link from 'next/link';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import type { AppRole } from '@/configs/accessControl';
import { ALLOC_METHOD_LABEL } from '@views/scenario-program/facultyAllocation';

import { type FacultyLock, policySourceLabel } from './lockStore';

export const LOCK_SETTINGS_HREF = '/admin/fixed-cost-lock';

/** ป้ายสั้นของที่มา — ใช้ในชิป/การ์ด KPI ที่ที่น้อย */
export const policySourceShort = (l: FacultyLock): string =>
  l.source === 'prev-year'
    ? `ใช้ค่าปี ${l.fromYear}`
    : l.source === 'default'
      ? 'ค่าตาม Excel'
      : l.submitLock
        ? 'ล็อกแล้ว'
        : 'คณะตั้งค่าแล้ว';

const PolicySourceAlert = ({ lock, role }: { lock: FacultyLock; role: AppRole }) => {
  const canSet = role === 'deptAdmin' || role === 'universityAdmin';
  const invalidPrev = !!lock.prevInvalidYear;

  return (
    <Alert
      severity={invalidPrev ? 'warning' : 'info'}
      variant="outlined"
      icon={<i className={lock.submitLock ? 'ri-lock-line' : 'ri-scales-3-line'} />}
      action={
        canSet ? (
          <Button component={Link} href={LOCK_SETTINGS_HREF} color="inherit" size="small">
            ไปตั้งค่าวิธีปันส่วน
          </Button>
        ) : undefined
      }
    >
      วิธีปันส่วนต้นทุนคงที่: <b>{ALLOC_METHOD_LABEL[lock.choice.method]}</b> ·{' '}
      {policySourceLabel(lock)}
      {invalidPrev &&
        ` — ค่าปี ${lock.prevInvalidYear} ใช้กับหลักสูตรปีนี้ไม่ได้ จึงใช้ค่าตาม Excel แทน${
          canSet ? ' กรุณาตั้งค่าปีนี้' : ' (แจ้งผู้ดูแลคณะให้ตั้งค่า)'
        }`}
    </Alert>
  );
};

export default PolicySourceAlert;
