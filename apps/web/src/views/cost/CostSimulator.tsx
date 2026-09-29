'use client';

// React Imports
import { useMemo, useState } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// Type Imports
import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { DotTitle } from '@components/ChartBits';
import NoteBar from '@components/NoteBar';

// Data / calc Imports
import {
  computeBreakEven,
  fmtInt,
  fmtMillion,
  statusOf,
  STATUS_LABEL,
} from '@views/breakeven/calc';
import type { FinancialRow } from '@views/breakeven/calc';

type Props = {
  /** ฐานตั้งต้นของขอบเขตที่กำลังดู (คณะที่เลือก หรือทั้งมหาวิทยาลัย) */
  base: FinancialRow;
  mode: RevenueMode;
  scopeLabel: string;
};

const Tile = ({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color?: string;
}) => (
  <Box sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 1, blockSize: '100%' }}>
    <Typography variant="caption" color="text.secondary" fontWeight={600}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.4, color }}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.disabled">
      {unit}
    </Typography>
  </Box>
);

/**
 * จำลอง "ถ้าจำนวนนิสิตหรือต้นทุนคงที่เปลี่ยน แล้วจุดคุ้มทุนขยับไปไหน"
 *
 * สมมติฐานที่ใช้ (บอกไว้บนหน้าจอด้วย): ต้นทุนผันแปรต่อหัวและรายได้ต่อหัวคงเดิม
 * ต้นทุนผันแปรรวมกับรายได้รวมจึงขยับตามจำนวนนิสิตแบบเส้นตรง ส่วนต้นทุนคงที่
 * ไม่ขยับตามจำนวนนิสิต แต่ปรับด้วยสไลเดอร์แยกได้ เพราะเป็นก้อนที่ถูกปันส่วนมา
 */
const CostSimulator = ({ base, mode, scopeLabel }: Props) => {
  const [q, setQ] = useState(base.Q);
  const [tfcPct, setTfcPct] = useState(0);

  const perHead = useMemo(
    () =>
      base.Q > 0
        ? { st: base.st / base.Q, own: base.own / base.Q, avc: base.TVC / base.Q }
        : { st: 0, own: 0, avc: 0 },
    [base],
  );

  const baseRes = useMemo(() => computeBreakEven(base, mode), [base, mode]);

  const simRow: FinancialRow = useMemo(
    () => ({
      Q: q,
      st: perHead.st * q,
      own: perHead.own * q,
      TFC: base.TFC * (1 + tfcPct / 100),
      TVC: perHead.avc * q,
    }),
    [q, tfcPct, perHead, base.TFC],
  );

  const sim = useMemo(() => computeBreakEven(simRow, mode), [simRow, mode]);
  const status = statusOf(sim);
  const isFcr = sim.qStarStatus === 'full_cost_recovery';
  const gap = sim.qStar !== null ? sim.qStar - q : null;

  if (base.Q <= 0) {
    return (
      <Card sx={{ mb: 4 }}>
        <CardHeader title={<DotTitle color="info.main">จำลองสถานการณ์</DotTitle>} />
        <CardContent>
          <NoteBar severity="warning">
            ขอบเขตนี้ไม่มีจำนวนนิสิต จึงคำนวณต่อหัวและจำลองสถานการณ์ไม่ได้
          </NoteBar>
        </CardContent>
      </Card>
    );
  }

  const qMin = Math.max(1, Math.round(base.Q * 0.5));
  const qMax = Math.max(
    Math.round(base.Q * 1.5),
    baseRes.qStar !== null ? Math.ceil(baseRes.qStar * 1.1) : 0,
  );

  return (
    <Card sx={{ mb: 4 }}>
      <CardHeader
        title={<DotTitle color="info.main">จำลองสถานการณ์</DotTitle>}
        subheader={`${scopeLabel} · ฐานปัจจุบัน ${fmtInt(base.Q)} คน · ต้นทุนคงที่ ${fmtMillion(base.TFC)} ลบ.`}
        action={
          <Chip
            size="small"
            variant="tonal"
            color={status === 'ok' ? 'success' : status === 'loss' ? 'error' : 'warning'}
            label={STATUS_LABEL[status]}
          />
        }
      />
      <CardContent>
        <NoteBar severity="info">
          <b>สมมติฐาน</b> — ต้นทุนผันแปรต่อหัว ({fmtInt(perHead.avc)} บาท) และรายได้ต่อหัว (
          {fmtInt(baseRes.r)} บาท) คงเดิม · ต้นทุนผันแปรและรายได้รวมขยับตามจำนวนนิสิต ·
          ต้นทุนคงที่ไม่ขยับตามจำนวนนิสิต ปรับแยกด้วยสไลเดอร์ที่สอง ·
          <b> จุดคุ้มทุนจึงขยับตามสไลเดอร์ต้นทุนคงที่เท่านั้น</b> —
          สไลเดอร์จำนวนนิสิตใช้ดูว่าเข้าใกล้ จุดคุ้มทุนแค่ไหน
        </NoteBar>

        <Grid container spacing={4} sx={{ mt: 0, mb: 2 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography variant="body2" fontWeight={600}>
                จำนวนนิสิต
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {fmtInt(q)} คน{' '}
                <Typography component="span" variant="caption" color="text.secondary">
                  ({q >= base.Q ? '+' : '−'}
                  {fmtInt(Math.abs(q - base.Q))} จากปัจจุบัน)
                </Typography>
              </Typography>
            </Stack>
            <Box sx={{ px: 5 }}>
              <Slider
                value={q}
                min={qMin}
                max={qMax}
                step={1}
                onChange={(_, v) => setQ(v)}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => fmtInt(v)}
                marks={[
                  { value: qMin, label: fmtInt(qMin) },
                  { value: base.Q, label: 'ปัจจุบัน' },
                  { value: qMax, label: fmtInt(qMax) },
                ]}
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography variant="body2" fontWeight={600}>
                ต้นทุนคงที่ (TFC)
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {fmtMillion(simRow.TFC)} ลบ.{' '}
                <Typography component="span" variant="caption" color="text.secondary">
                  ({tfcPct >= 0 ? '+' : '−'}
                  {Math.abs(tfcPct)}%)
                </Typography>
              </Typography>
            </Stack>
            <Box sx={{ px: 5 }}>
              <Slider
                value={tfcPct}
                min={-20}
                max={30}
                step={1}
                onChange={(_, v) => setTfcPct(v)}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v > 0 ? '+' : ''}${v}%`}
                marks={[
                  { value: -20, label: '−20%' },
                  { value: 0, label: 'เท่าเดิม' },
                  { value: 30, label: '+30%' },
                ]}
              />
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <Tile label="ต้นทุนรวม (TC)" value={fmtMillion(sim.tc)} unit="ล้านบาท" />
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <Tile label="ต้นทุน/หัว (ATC)" value={fmtInt(sim.atc)} unit="บาท/คน" />
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <Tile label="รายได้รวม (TR)" value={fmtMillion(sim.tr)} unit="ล้านบาท" />
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <Tile
              label={isFcr ? 'เป้าหมายคืนทุนเต็มจำนวน' : 'จุดคุ้มทุน (Q*)'}
              value={fmtInt(sim.qStar)}
              unit={
                isFcr
                  ? 'คน · รายได้ต่อหัวต่ำกว่าต้นทุนผันแปรต่อหัว (R ≤ AVC) จึงไม่มีจุดคุ้มทุน'
                  : baseRes.qStar !== null
                    ? `คน · เดิม ${fmtInt(baseRes.qStar)} คน`
                    : 'คน'
              }
              color="var(--mui-palette-error-main)"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2.4 }}>
            <Tile
              label={
                gap === null
                  ? 'ส่วนต่างจากเป้าหมาย'
                  : gap > 0
                    ? 'ต้องเพิ่มนิสิตอีก'
                    : 'เกินเป้าหมายอยู่'
              }
              value={gap === null ? '—' : fmtInt(Math.abs(gap))}
              unit={gap === null ? 'คำนวณจุดคุ้มทุนไม่ได้' : 'คน'}
              color={
                gap === null
                  ? 'var(--mui-palette-text-disabled)'
                  : gap > 0
                    ? 'var(--mui-palette-error-main)'
                    : 'var(--mui-palette-success-main)'
              }
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default CostSimulator;
