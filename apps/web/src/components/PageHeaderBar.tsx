'use client';

// MUI Imports
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

// Type Imports
import type { RevenueMode } from '@beps/calc-engine';

// Calc Imports
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
  approver: { name: 'ผศ.ดร.ปิยภัทร บุษบาบดินทร์', role: 'ผู้อนุมัติ' },
};

type Props = {
  /** ชื่อหน้า เช่น "รายได้รายคณะ" */
  title: string;
  /** รหัสหน้าจอตาม SA.md เช่น "W4" — แสดงเป็นชิปข้างชื่อ (หน้าที่ไม่มีรหัสใน SA.md ไม่ต้องส่ง) */
  code?: string;
  mode: RevenueMode;
  onModeChange: (mode: RevenueMode) => void;
  /** จำนวนนิสิตของขอบเขตที่หน้านั้นแสดง (ปกติคือทั้งมหาวิทยาลัย) */
  q: number;
  /** ส่วนเกิน/ขาดทุนของขอบเขตเดียวกัน — บวกเป็นส่วนเกิน ลบเป็นขาดทุน */
  profit: number;
};

/**
 * แถบหัวหน้าจอ — ชื่อหน้า + บริบทรอบคำนวณ + สวิตช์ฐานรายได้ + ชิปสรุป + ผู้อนุมัติ
 * ใช้ร่วมกันทุกหน้าที่อ่านตัวเลขจากรอบคำนวณเดียวกัน เพื่อไม่ให้แต่ละหน้าประกอบหัวเอง
 */
const PageHeaderBar = ({ title, code, mode, onModeChange, q, profit }: Props) => (
  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 3, mb: 4 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography variant="h5" fontWeight={700}>
        {title}
      </Typography>
      {code && <Chip size="small" label={code} variant="tonal" color="primary" />}
    </Box>

    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 3,
        marginInlineStart: 'auto',
      }}
    >
      <FormControl size="small">
        <Select value={MOCK_RUN.budgetYear} sx={{ minWidth: 148 }}>
          {MOCK_RUN.budgetYears.map((y) => (
            <MenuItem key={y} value={y}>
              ปีงบประมาณ {y}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 3,
          py: 1.25,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="body2" fontWeight={700} color="primary.main">
          Run #{MOCK_RUN.id}
        </Typography>
        <Typography sx={{ fontSize: '0.6875rem' }} color="text.secondary">
          คำนวณ {MOCK_RUN.computedAt} · คิดค่า {MOCK_RUN.method}
        </Typography>
        <Chip
          size="small"
          variant="tonal"
          color={MOCK_RUN.approved ? 'success' : 'warning'}
          label={MOCK_RUN.approved ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }} color="text.secondary">
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

      <Chip size="small" color="primary" variant="tonal" label={`${fmtInt(q)} นิสิต`} />
      <Chip
        size="small"
        color={profit >= 0 ? 'success' : 'error'}
        variant="tonal"
        label={`${profit >= 0 ? 'ส่วนเกิน' : 'ขาดทุน'} ${fmtMillion(Math.abs(profit))} ลบ.`}
      />

      {/* ชิดขวาเสมอแม้แถวจะห่อลงบรรทัดใหม่เมื่อจอแคบ */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginInlineStart: 'auto' }}>
        <Avatar sx={{ width: 30, height: 30, fontSize: '0.8125rem' }}>
          {MOCK_RUN.approver.name.charAt(0)}
        </Avatar>
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.35 }}>
            {MOCK_RUN.approver.name}
          </Typography>
          <Typography sx={{ fontSize: '0.6875rem', lineHeight: 1.35 }} color="text.secondary">
            {MOCK_RUN.approver.role} ·{' '}
            <Link component="button" underline="hover" sx={{ fontSize: 'inherit' }}>
              เปลี่ยนผู้ใช้
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  </Box>
);

export default PageHeaderBar;
