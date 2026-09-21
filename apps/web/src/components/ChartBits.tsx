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

/** ป้ายสีของชุดข้อมูลในกราฟ — วางเองเหนือกราฟแทน legend ของ ApexCharts (.leg ของ mockup) */
export const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <Box sx={{ width: 11, height: 11, borderRadius: '3px', bgcolor: color }} />
    <Typography variant="caption" color="text.secondary" fontWeight={500}>
      {label}
    </Typography>
  </Box>
);
