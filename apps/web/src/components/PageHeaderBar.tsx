'use client';

// MUI Imports
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

// Type Imports
import type { ReactNode } from 'react';
import type { RevenueMode } from '@beps/calc-engine';

// Data / Calc Imports
import { BEPS } from '@components/ChartBits';
import { RAW } from '@/data/mockup';
import { fmtInt, fmtMillion, REVENUE_MODE_LABEL } from '@views/breakeven/calc';

/**
 * บริบทรอบคำนวณที่แสดงบนหัวทุกหน้า — ยังไม่มี backend ของ Run/การอนุมัติ
 * จึงเป็นข้อมูลตัวอย่างสำหรับแสดงผลอย่างเดียว (ตรงกับแถบหัวของ mockup)
 */
export const MOCK_RUN = {
  budgetYear: '2568',
  budgetYears: ['2566', '2567', '2568'],
  id: 1042,
  computedAt: '11 ก.ค. 2569 14:32',
  method: 'v3 - ฐาน ACTUAL',
  approved: true,
};

// "ข้อมูล ณ วันที่ 16/10/2569 เวลา 11:38" — ปี พ.ศ. ตามเวลาไทย
const asOf = RAW.__asOf ? new Date(RAW.__asOf) : null;
const DATA_LABEL = [
  RAW.__sample && 'ข้อมูลตัวอย่าง',
  asOf &&
    `ข้อมูล ณ วันที่ ${asOf.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })} เวลา ${asOf.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })}`,
]
  .filter(Boolean)
  .join(' · ');

type Props = {
  /** ชื่อหน้า เช่น "รายได้รายคณะ" */
  title: string;
  mode: RevenueMode;
  onModeChange: (mode: RevenueMode) => void;
  /** จำนวนนิสิตของขอบเขตที่หน้านั้นแสดง (ปกติคือทั้งมหาวิทยาลัย) */
  q: number;
  /** ส่วนเกิน/ขาดทุนของขอบเขตเดียวกัน — บวกเป็นส่วนเกิน ลบเป็นขาดทุน */
  profit: number;
  /** ส่ง = ชิปท้ายแสดงรายได้รวมแทนส่วนเกิน/ขาดทุน (หน้าที่เน้นขารายได้) */
  revenue?: number;
  /** ชิปเพิ่มเติมของหน้านั้น (เช่น ปีงบ/วิธีปันส่วน) — วางก่อนชิปวันที่ของข้อมูล */
  extra?: ReactNode;
};

/**
 * แถบหัวหน้าจอ — ชื่อหน้า + สวิตช์ฐานรายได้ + วันที่ของข้อมูล + ชิปสรุป
 * ใช้ร่วมกันทุกหน้าที่อ่านตัวเลขจากรอบคำนวณเดียวกัน เพื่อไม่ให้แต่ละหน้าประกอบหัวเอง
 */
const PageHeaderBar = ({ title, mode, onModeChange, q, profit, revenue, extra }: Props) => (
  // ติดหัวจอเมื่อเลื่อน (แทนแถบโปรไฟล์ที่ตั้งเป็น static ใน themeConfig)
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 3,
      mb: 4,
      position: 'sticky',
      top: 0,
      zIndex: 'appBar',
      p: '15px',
      bgcolor: 'background.paper', // ขาวในโหมดสว่าง · ตามธีมในโหมดมืด
    }}
  >
    <Typography variant="h5" fontWeight={700} sx={{ fontSize: '1.375rem' }}>
      {title}
    </Typography>

    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 3,
        marginInlineStart: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }} color="text.secondary">
          ฐานรายได้:
        </Typography>
        <ToggleButtonGroup
          size="small"
          color="primary"
          exclusive
          value={mode}
          onChange={(_, v: RevenueMode | null) => v && onModeChange(v)}
        >
          <ToggleButton value="with_government">{REVENUE_MODE_LABEL.with_government}</ToggleButton>
          <ToggleButton value="without_government">
            {REVENUE_MODE_LABEL.without_government}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {extra}
      <Chip
        size="small"
        color={RAW.__sample ? 'warning' : 'info'}
        variant="tonal"
        label={DATA_LABEL}
      />
      <Chip size="small" color="primary" variant="tonal" label={`${fmtInt(q)} นิสิต`} />
      {revenue !== undefined ? (
        <Chip
          size="small"
          variant="tonal"
          sx={{ bgcolor: 'rgb(130 106 249 / 0.14)', color: BEPS.revenue.dark }}
          label={`รายได้รวม ${fmtMillion(revenue)} ลบ.`}
        />
      ) : (
      <Chip
        size="small"
        color={profit >= 0 ? undefined : 'error'}
        variant="tonal"
        // ส่วนเกิน = เขียวอมฟ้า (teal) เดียวกับการ์ดจุดคุ้มทุน · ขาดทุน = แดงตามธีม
        sx={profit >= 0 ? { bgcolor: 'rgb(13 143 135 / 0.16)', color: BEPS.breakEven } : undefined}
        label={`${profit >= 0 ? 'ส่วนเกิน' : 'ขาดทุน'} ${fmtMillion(Math.abs(profit))} ลบ.`}
      />
      )}
    </Box>
  </Box>
);

export default PageHeaderBar;
