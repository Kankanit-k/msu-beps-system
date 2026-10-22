'use client';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

import type { ReactNode } from 'react';

import InfoTip from './InfoTip';
import type { KpiAccent } from './KpiCard';

type Props = {
  label: string;
  value: string;
  /** หน่วยตัวเล็กต่อท้ายตัวเลข เช่น "คน" */
  suffix?: string;
  /** บรรทัดล่างใต้แถบ — บริบทของตัวเลข */
  footer: ReactNode;
  accent: KpiAccent;
  /** สีกำหนดเอง (hex เช่น "#7367f0") แทนสีธีมของ accent — ใช้เมื่อสีธีมซ้ำกับการ์ดอื่น */
  color?: string;
  /** คลาสไอคอน Remix เช่น "ri-group-line" */
  icon: string;
  /** แถบความคืบหน้า 0–100 — ไม่ส่ง = ไม่แสดงแถบ */
  progress?: number;
  info?: ReactNode;
};

/** "#rrggbb" → "r g b" สำหรับ rgb(... / alpha) */
const hexChannel = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);

  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/**
 * การ์ดตัวเลขแบบ MSU-KPI — พื้นไล่สีอ่อนตามสีการ์ด วงกลมตกแต่งมุมขวาบน
 * ไอคอนในกล่องสีทึบ ตัวเลขสีเดียวกับการ์ด และแถบความคืบหน้าข้างใต้
 */
const KpiTile = ({ label, value, suffix, footer, accent, color, icon, progress, info }: Props) => {
  const channel = color ? hexChannel(color) : `var(--mui-palette-${accent}-mainChannel)`;
  const main = color ?? `var(--mui-palette-${accent}-main)`;
  const tint = (a: number) => `rgb(${channel} / ${a})`;

  return (
    <Card
      sx={{
        blockSize: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${tint(0.1)} 0%, ${tint(0.03)} 100%), var(--mui-palette-background-paper)`,
      }}
    >
      {/* วงกลมตกแต่งมุมขวาบน */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          insetBlockStart: -44,
          insetInlineEnd: -44,
          inlineSize: 150,
          blockSize: 150,
          borderRadius: '50%',
          bgcolor: tint(0.08),
        }}
      />
      <CardContent sx={{ position: 'relative', px: 3.5, py: 3, '&:last-child': { pb: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minInlineSize: 0 }}>
            <Typography
              sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.4 }}
              color="text.secondary"
            >
              {label} {info && <InfoTip text={info} />}
            </Typography>
            <Typography
              className="num"
              sx={{
                fontSize: '1.625rem',
                fontWeight: 700,
                letterSpacing: '-0.5px',
                lineHeight: 1.25,
                color: main,
                whiteSpace: 'nowrap',
              }}
            >
              {value}
              {suffix && (
                <Typography
                  component="span"
                  sx={{ fontSize: '0.8125rem', fontWeight: 600, ml: 1, letterSpacing: 0 }}
                  color="text.secondary"
                >
                  {suffix}
                </Typography>
              )}
            </Typography>
          </Box>
          <Box
            sx={{
              flexShrink: 0,
              inlineSize: 40,
              blockSize: 40,
              borderRadius: '10px',
              display: 'grid',
              placeItems: 'center',
              bgcolor: main,
              color: 'common.white',
              boxShadow: `0 4px 12px ${tint(0.35)}`,
            }}
          >
            <i className={icon} style={{ fontSize: '1.25rem' }} />
          </Box>
        </Box>
        {progress !== undefined && (
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, progress))}
            sx={{
              mt: 2,
              height: 6,
              borderRadius: 3,
              bgcolor: tint(0.15),
              '& .MuiLinearProgress-bar': { bgcolor: main },
            }}
          />
        )}
        <Typography
          sx={{ fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.4, mt: 1.5 }}
          color="text.secondary"
        >
          {footer}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default KpiTile;
