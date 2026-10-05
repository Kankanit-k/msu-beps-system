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
  `${(v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ล้านบาท`;

const LatestResultCard = ({ latest }: { latest: ProgramHistoryEntry }) => {
  return (
    <Card>
      <CardHeader
        title={<DotTitle color="primary.main">ผลที่บันทึกล่าสุด — {latest.name}</DotTitle>}
        subheader={`${latest.fac || '—'} · ${latest.level} · ${latest.isNew ? 'เปิดหลักสูตรใหม่' : 'ปรับปรุงหลักสูตรเดิม'}${latest.ref ? ` · อ้างอิง ${latest.ref}` : ''}`}
      />
      <CardContent>
        {(['with_government', 'without_government'] as RevenueMode[]).map((m) => {
          const r = m === 'with_government' ? latest.withGov : latest.withoutGov;
          const isOk = r.qStar !== null && r.q >= r.qStar;
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
                    นิสิตจริง: <b>{fmtN(r.q)}</b> คน
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2">
                    รายได้รวม: <b>{fmtM(r.tr)}</b>
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="body2">
                    ต้นทุนรวม: <b>{fmtM(r.tc)}</b> (คงที่ {fmtM(r.tfc)} · ผันแปร {fmtN(r.avc ?? 0)}{' '}
                    บาท/คน)
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2">
                    รายได้ต่อหัว: <b>{fmtN(r.r ?? 0)}</b> บาท
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2">
                    ส่วนต่างต่อหัว (รายได้ − ต้นทุนผันแปร):{' '}
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
                    บาท
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" component="div">
                    {full ? 'เป้าหมายคืนทุนเต็ม' : 'จำนวนนิสิต ณ จุดคุ้มทุน'}:{' '}
                    <b style={{ color: 'var(--mui-palette-error-main)' }}>
                      {r.qStar ? `${fmtN(r.qStar)} คน` : '—'}
                    </b>{' '}
                    {full && (
                      <Chip
                        size="small"
                        label="ต้นทุนรวม ÷ รายได้ต่อหัว"
                        color="warning"
                        sx={{ height: 16, fontSize: 10 }}
                      />
                    )}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2">
                    กำไร (ร้อยละของต้นทุนรวม):{' '}
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
                  : `${full ? '⚠ รายได้ต่อหัวไม่สูงกว่าต้นทุนผันแปรต่อหัว จึงไม่มีจุดคุ้มทุน · ใช้เป้าหมายคืนทุนเต็มแทน · ' : ''}${
                      isOk
                        ? `✓ เกินจุดคุ้มทุน +${fmtN(r.q - r.qStar)} คน`
                        : `⚠ ต้องเพิ่มอีก ${fmtN(r.qStar - r.q)} คน`
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
