'use client';

// React Imports
import type { ReactNode } from 'react';

// MUI Imports
import Box from '@mui/material/Box';

export type NoteSeverity = 'info' | 'warning' | 'error' | 'success';

const ICON: Record<NoteSeverity, string> = {
  info: 'ri-information-line',
  warning: 'ri-alert-line',
  error: 'ri-error-warning-line',
  success: 'ri-checkbox-circle-line',
};

/**
 * แถบหมายเหตุเตี้ย ๆ — ตรงกับ .bm-note / .dcav ของ mockup
 * ใช้แทน <Alert> ของ MUI ที่สูงและเสียงดังเกินไปสำหรับข้อความกำกับข้อมูล
 */
const NoteBar = ({
  severity = 'info',
  children,
}: {
  severity?: NoteSeverity;
  children: ReactNode;
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 2,
      mb: 3,
      px: 3,
      py: 2,
      borderRadius: 1,
      border: 1,
      borderColor: `${severity}.lightOpacity`,
      bgcolor: `${severity}.lighterOpacity`,
      fontSize: '0.75rem',
      lineHeight: 1.6,
      color: 'text.secondary',
      '& b': { color: 'text.primary', fontWeight: 700 },
      '& code': {
        fontFamily: 'monospace',
        fontSize: '0.9em',
        paddingInline: '4px',
        borderRadius: '4px',
        bgcolor: 'action.hover',
      },
    }}
  >
    <Box
      component="i"
      className={ICON[severity]}
      sx={{ color: `${severity}.main`, fontSize: '1rem', lineHeight: 1.4, flexShrink: 0 }}
    />
    <Box sx={{ minInlineSize: 0 }}>{children}</Box>
  </Box>
);

export default NoteBar;
