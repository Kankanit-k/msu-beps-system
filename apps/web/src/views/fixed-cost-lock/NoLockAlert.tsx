'use client';

// คณะยังไม่ล็อกวิธีปันส่วน — อาจารย์ต้องรอ · ผู้ดูแลคณะมีปุ่มไปตั้งค่า

import Link from 'next/link';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';

import type { AppRole } from '@/configs/accessControl';

export const LOCK_SETTINGS_HREF = '/admin/fixed-cost-lock';

const NoLockAlert = ({ faculty, role }: { faculty: string; role: AppRole }) => {
  const canSet = role === 'deptAdmin' || role === 'universityAdmin';

  return (
    <Alert
      severity="warning"
      icon={<i className="ri-lock-unlock-line" />}
      action={
        canSet ? (
          <Button component={Link} href={LOCK_SETTINGS_HREF} color="inherit" size="small">
            ไปตั้งค่าวิธีปันส่วน
          </Button>
        ) : undefined
      }
    >
      <AlertTitle>{faculty}ยังไม่ได้ล็อกวิธีปันส่วนต้นทุนคงที่</AlertTitle>
      {canSet
        ? 'เลือกวิธีปันส่วน (หารรายหัว · หารเท่ากันทุกหลักสูตร · กำหนด %) ตามมติคณะแล้วกดล็อกก่อน จึงจะคำนวณรายหลักสูตรได้'
        : 'ต้องรอผู้ดูแลคณะเลือกวิธีปันส่วนตามมติคณะและกดล็อกก่อน จึงจะเริ่มปรับปรุงหรือเปิดหลักสูตรได้'}
    </Alert>
  );
};

export default NoLockAlert;
