'use client';

// React Imports
import type { ReactNode } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/** หัวการ์ดแบบ mockup — จุดสีนำหน้าชื่อการ์ด (.card-title .dot) */
export const DotTitle = ({ color, children }: { color: string; children: ReactNode }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
    <span>{children}</span>
  </Box>
);

/** ชุดสีทึบแบบระบบ MSU-KPI — ตัดกันชัด ใช้ร่วมกันทุกหน้าภาพรวม */
export const KPI_COLORS = {
  blue: '#1e88e5',
  green: '#28c76f',
  red: '#ff4c51',
  orange: '#ff9f43',
  purple: '#7367f0',
  cyan: '#00bad1',
  amber: '#ffb400',
  grey: '#a8aaae',
};

/** ความหมายของสีที่ใช้เหมือนกันทุกหน้า: รายได้ = โทนเย็น · ต้นทุน = โทนร้อน */
export const FIN_COLORS = {
  own: KPI_COLORS.blue, // เงินรายได้
  st: KPI_COLORS.green, // เงินแผ่นดิน
  fixed: KPI_COLORS.red, // ต้นทุนคงที่
  variable: KPI_COLORS.orange, // ต้นทุนผันแปร
};

/**
 * ชุดสีหลักของระบบ (ยึดหน้าภาพรวมมหาวิทยาลัย 2026-10-23) — หน้าอื่น/element อื่นใช้ตามนี้
 * แต่ละความหมายมีคู่ เข้ม (ส่วนหลัก) / อ่อน (ส่วนรอง) + สีตัวเลขบนพื้นอ่อน (onLight)
 */
export const BEPS = {
  /** รายได้: เข้ม = เงินรายได้ · อ่อน = เงินแผ่นดิน (กราฟ ① · การ์ด TR) */
  revenue: { dark: '#826af9', light: '#d2b0ff', onLight: '#5b47c9' },
  /** ต้นทุน: เข้ม = คงที่ · อ่อน = ผันแปร (กราฟ ② · การ์ด TC) */
  cost: { dark: '#f0436b', light: '#f7a1b2', onLight: '#b8203f' },
  /** รายได้เทียบต้นทุน: เข้ม = รายได้ · อ่อน = ต้นทุน (กราฟ ③) */
  compare: { dark: '#2a86e7', light: '#93c3f4', onLight: '#1a5fb0' },
  /** จุดคุ้มทุน Q* (การ์ด Q*) */
  breakEven: '#0d8f87',
  /** ส่วนเกิน/ขาดทุน π (การ์ด π) */
  profit: '#15236b',
  /** navy ของเมนูซ้าย/โลโก้ */
  navy: '#022975',
  /** รางพื้นหลังแท่ง */
  track: 'var(--mui-palette-background-default)',
};

/** รางพื้นหลังแท่งแบบ MSU-KPI (ApexCharts plotOptions.bar.colors) */
export const KPI_BAR_TRACK = {
  backgroundBarColors: ['var(--mui-palette-background-default)'],
  backgroundBarRadius: 4,
};

/** ตัวเลขสีขาวในแท่งแบบ MSU-KPI — ซ่อนเมื่อค่าต่ำกว่า min (แท่งสั้นเกินจะอ่าน) */
export const kpiBarLabels = (min: number, suffix = '') => ({
  enabled: true,
  style: { fontSize: '10px', fontWeight: 700, colors: ['#fff'] },
  dropShadow: { enabled: false },
  formatter: (v: number) =>
    v >= min ? `${v.toLocaleString('th-TH', { maximumFractionDigits: 0 })}${suffix}` : '',
});

/** หัวการ์ดแบบ MSU-KPI — แถบแนวตั้งสีนำหน้าชื่อการ์ด */
export const BarTitle = ({
  color = 'primary.main',
  children,
}: {
  color?: string;
  children: ReactNode;
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <Box sx={{ width: 4, height: 20, borderRadius: 1, bgcolor: color, flexShrink: 0 }} />
    <span>{children}</span>
  </Box>
);

/** ป้ายสีของชุดข้อมูลในกราฟ — วางเองเหนือกราฟแทน legend ของ ApexCharts (.leg ของ mockup) */
export const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <Box sx={{ width: 11, height: 11, borderRadius: '3px', bgcolor: color }} />
    <Typography variant="body2" color="text.secondary" fontWeight={500}>
      {label}
    </Typography>
  </Box>
);
