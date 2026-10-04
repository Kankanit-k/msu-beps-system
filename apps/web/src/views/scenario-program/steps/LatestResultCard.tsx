'use client';

// ผลที่บันทึกล่าสุด — ตัวเลขสรุป + จุดคุ้มทุนกรณีรวม/ไม่รวมเงินแผ่นดิน

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import type { RevenueMode } from '@beps/calc-engine';

import { DotTitle } from '@components/ChartBits';

import type { ProgramHistoryEntry } from '../types';

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtM = (v: number) =>
  `${(v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ล.`;

const LatestResultCard = ({ latest }: { latest: ProgramHistoryEntry }) => {
  const latestResult = latest.mode === 'with_government' ? latest.withGov : latest.withoutGov;

  return (
    <Card>
      <CardHeader
        title={<DotTitle color="primary.main">ผลที่บันทึกล่าสุด — {latest.name}</DotTitle>}
        subheader={`${latest.fac || '—'} · ${latest.level} · ${latest.isNew ? 'เปิดหลักสูตรใหม่' : 'ปรับปรุงหลักสูตรเดิม'}${latest.ref ? ` · อ้างอิง ${latest.ref}` : ''}`}
      />
      <CardContent>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {(
            [
              ['รายได้รวม (TR)', fmtM(latestResult.tr), 'primary.main'],
              ['ต้นทุนรวม (TC)', fmtM(latestResult.tc), 'text.primary'],
              ['ต้นทุนคงที่ (TFC)', fmtM(latest.tfc), 'warning.main'],
              ['ต้นทุนผันแปร (TVC)', fmtM(latest.tvc), 'text.primary'],
              ['ผันแปร/หัว (AVC)', `${fmtN(latest.avc)} บ./คน`, 'text.primary'],
              ['นิสิตจริง (Q)', `${fmtN(latest.q)} คน`, 'text.primary'],
            ] as const
          ).map(([label, val, color]) => (
            <Grid key={label} size={{ xs: 6, sm: 4 }}>
              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color }}>
                  {val}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {(['with_government', 'without_government'] as RevenueMode[]).map((m) => {
          const r = m === 'with_government' ? latest.withGov : latest.withoutGov;
          const isOk = r.qStar !== null && latest.q >= r.qStar;
          const full = r.qStarStatus === 'full_cost_recovery';

          return (
            <Box
              key={m}
              sx={{
                border: 1.5,
                borderColor: m === 'with_government' ? 'primary.main' : 'warning.main',
                borderRadius: 2,
                p: 2,
                mb: 2,
                bgcolor: isOk
                  ? 'var(--mui-palette-success-lightOpacity)'
                  : 'var(--mui-palette-error-lightOpacity)',
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  fontWeight: 800,
                  color: m === 'with_government' ? 'primary.main' : 'warning.main',
                }}
              >
                {m === 'with_government' ? 'กรณีรวมเงินแผ่นดิน' : 'กรณีไม่รวมเงินแผ่นดิน'}
              </Typography>
              <Grid container spacing={1}>
                <Grid size={6}>
                  <Typography variant="body2">
                    รายได้/หัว (R): <b>{fmtN(r.r ?? 0)}</b> บ.
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2">
                    ส่วนเกิน/หัว (CM):{' '}
                    <b
                      style={{
                        color:
                          (r.cm ?? 0) > 0
                            ? 'var(--mui-palette-success-main)'
                            : 'var(--mui-palette-error-main)',
                      }}
                    >
                      {fmtN(r.cm ?? 0)}
                    </b>{' '}
                    บ.
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" component="div">
                    จุดคุ้มทุน (Q*):{' '}
                    <b style={{ color: 'var(--mui-palette-error-main)' }}>
                      {r.qStar ? `${fmtN(r.qStar)} คน` : '—'}
                    </b>{' '}
                    {full && (
                      <Chip
                        size="small"
                        label="คืนทุนเต็ม (TC/R)"
                        color="warning"
                        sx={{ height: 16, fontSize: 10 }}
                      />
                    )}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2">
                    กำไร:{' '}
                    <b
                      style={{
                        color:
                          (r.profitPct ?? 0) >= 0
                            ? 'var(--mui-palette-success-main)'
                            : 'var(--mui-palette-error-main)',
                      }}
                    >
                      {(r.profitPct ?? 0) >= 0 ? '+' : ''}
                      {(r.profitPct ?? 0).toFixed(1)}%
                    </b>
                  </Typography>
                </Grid>
              </Grid>
              <Typography
                variant="body2"
                sx={{ mt: 1, fontWeight: 700, color: isOk ? 'success.main' : 'error.main' }}
              >
                {!r.qStar
                  ? '⚠ คำนวณไม่ได้'
                  : `${full ? '⚠ ไม่คุ้มทุน (CM ≤ 0) · ใช้เป้าคืนทุนเต็ม (TC/R) · ' : ''}${
                      isOk
                        ? `✓ เกินจุดคุ้มทุน +${fmtN(latest.q - r.qStar)} คน`
                        : `⚠ ต้องเพิ่มอีก ${fmtN(r.qStar - latest.q)} คน`
                    }`}
              </Typography>
            </Box>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default LatestResultCard;
