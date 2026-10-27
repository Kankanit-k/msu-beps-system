'use client';

// MUI Imports
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';

// React Imports
import { useState } from 'react';

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

/** ความสูงกล่องควบคุมบนแถบหัว (เท่ากับช่องกรอกขนาด small) */
const CONTROL_H = 40;

type Props = {
  /** ชื่อหน้า เช่น "รายได้รายคณะ" */
  title: string;
  /** ข้อความต่อท้ายชื่อหน้า (สีจาง) เช่น "› คณะวิทยาการสารสนเทศ" */
  crumb?: string;
  mode: RevenueMode;
  onModeChange: (mode: RevenueMode) => void;
  /** จำนวนนิสิตของขอบเขตที่หน้านั้นแสดง (ปกติคือทั้งมหาวิทยาลัย) */
  q: number;
  /** ส่วนเกิน/ขาดทุนของขอบเขตเดียวกัน — บวกเป็นส่วนเกิน ลบเป็นขาดทุน */
  profit: number;
  /** ส่ง = ชิปท้ายแสดงรายได้รวมแทนส่วนเกิน/ขาดทุน (หน้าที่เน้นขารายได้) */
  revenue?: number;
  /** ส่ง = ชิปท้ายแสดงต้นทุนรวมแทนส่วนเกิน/ขาดทุน (หน้าที่เน้นขาต้นทุน) */
  cost?: number;
  /** ตัวกรอง/ชิปเพิ่มเติมของหน้านั้น — วางในแถวตัวกรองต่อจากสวิตช์ฐานรายได้ */
  extra?: ReactNode;
  /** จำนวนตัวกรองที่ใช้อยู่ — แสดงบนปุ่ม "ตัวกรอง" ในจอแคบ */
  filterCount?: number;
  /** แถวเต็มความกว้างใต้หัวหน้า ติดหัวจอไปด้วย (เช่น แถบขั้นตอน) */
  below?: ReactNode;
};

/**
 * แถบหัวหน้าจอ 2 แถว (มติ 26 ต.ค. 2569)
 *   แถว 1 = ชื่อหน้า + วันที่ข้อมูล + ชิปสรุปผล (ชิดขวา)
 *   แถว 2 = ตัวกรอง เรียง ฐานรายได้ → ระดับ → คณะ → ปี → ล้างตัวกรอง (แต่ละหน้าส่งเฉพาะช่องที่ใช้ผ่าน extra)
 * จอแคบ: แถว 2 ยุบเป็นปุ่ม "ตัวกรอง" เปิดแผงจากด้านล่าง
 * ใช้ร่วมกันทุกหน้าที่อ่านตัวเลขจากรอบคำนวณเดียวกัน เพื่อไม่ให้แต่ละหน้าประกอบหัวเอง
 */
const PageHeaderBar = ({
  title,
  crumb,
  mode,
  onModeChange,
  q,
  profit,
  revenue,
  cost,
  extra,
  filterCount,
  below,
}: Props) => {
  const narrow = useMediaQuery((t: Theme) => t.breakpoints.down('md'));
  const [open, setOpen] = useState(false);

  const filters = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 3,
        // ปุ่มฐานรายได้ + ช่องเลือก (ระดับ/คณะ/ปี) สูงเท่ากันทุกกล่อง
        '& .MuiToggleButtonGroup-root .MuiToggleButton-root, & .MuiOutlinedInput-root': {
          blockSize: CONTROL_H,
        },
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
    </Box>
  );

  return (
    // ติดหัวจอเมื่อเลื่อน (แทนแถบโปรไฟล์ที่ตั้งเป็น static ใน themeConfig)
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        mb: 4,
        position: 'sticky',
        top: 0,
        zIndex: 'appBar',
        p: '15px',
        bgcolor: 'background.paper', // ขาวในโหมดสว่าง · ตามธีมในโหมดมืด
      }}
    >
      {/* แถว 1 — กำลังดูอะไร + ผลลัพธ์ */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 3, rowGap: 1 }}>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: '1.375rem' }}>
          {title}
          {crumb && (
            <Typography
              component="span"
              color="text.secondary"
              sx={{ fontSize: '1rem', fontWeight: 500, ml: 2 }}
            >
              {crumb}
            </Typography>
          )}
        </Typography>
        {DATA_LABEL && (
          <Typography
            variant="caption"
            color={RAW.__sample ? 'warning.main' : 'text.secondary'}
            sx={{ fontWeight: RAW.__sample ? 600 : 400 }}
          >
            {DATA_LABEL}
          </Typography>
        )}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            marginInlineStart: 'auto',
          }}
        >
          <Chip size="small" color="primary" variant="tonal" label={`${fmtInt(q)} นิสิต`} />
          {revenue !== undefined ? (
            <Chip
              size="small"
              variant="tonal"
              sx={{ bgcolor: 'rgb(130 106 249 / 0.14)', color: BEPS.revenue.dark }}
              label={`รายได้รวม ${fmtMillion(revenue)} ลบ.`}
            />
          ) : cost !== undefined ? (
            <Chip
              size="small"
              variant="tonal"
              sx={{ bgcolor: 'rgb(240 67 107 / 0.14)', color: BEPS.cost.dark }}
              label={`ต้นทุนรวม ${fmtMillion(cost)} ลบ.`}
            />
          ) : (
            <Chip
              size="small"
              color={profit >= 0 ? undefined : 'error'}
              variant="tonal"
              // ส่วนเกิน = เขียวอมฟ้า (teal) เดียวกับการ์ดจุดคุ้มทุน · ขาดทุน = แดงตามธีม
              sx={
                profit >= 0 ? { bgcolor: 'rgb(13 143 135 / 0.16)', color: BEPS.breakEven } : undefined
              }
              label={`${profit >= 0 ? 'ส่วนเกิน' : 'ขาดทุน'} ${fmtMillion(Math.abs(profit))} ลบ.`}
            />
          )}
          {narrow && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<i className="ri-filter-3-line" />}
              onClick={() => setOpen(true)}
            >
              ตัวกรอง{filterCount ? ` (${filterCount})` : ''}
            </Button>
          )}
        </Box>
      </Box>

      {/* แถว 2 — ตัวกรอง (จอแคบย้ายไปอยู่ในแผงด้านล่าง) */}
      {narrow ? (
        <Drawer anchor="bottom" open={open} onClose={() => setOpen(false)}>
          <Box sx={{ p: 4, display: 'grid', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ flex: 1 }}>
                ตัวกรอง
              </Typography>
              <IconButton aria-label="ปิด" onClick={() => setOpen(false)}>
                <i className="ri-close-line" />
              </IconButton>
            </Box>
            {filters}
          </Box>
        </Drawer>
      ) : (
        filters
      )}
      {below && <Box sx={{ minWidth: 0 }}>{below}</Box>}
    </Box>
  );
};

export default PageHeaderBar;
