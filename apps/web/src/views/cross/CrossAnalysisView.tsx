'use client';

import { useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';

// Third-party Imports
import type { ApexOptions } from 'apexcharts';
import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { DotTitle } from '@components/ChartBits';
import DataCaveatNotes, { SHOW_CROSS_NOTES } from '@components/DataCaveatNotes';
import NoteBar from '@components/NoteBar';
import PageHeaderBar from '@components/PageHeaderBar';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import { computeBreakEven, REVENUE_MODE_NOTE } from '@views/breakeven/calc';

import { buildCrossData } from './crossData';
import { HEATMAP_METRICS, HEAT_SCALE_GRADIENT, heatCellColor } from './heatmapMetrics';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), {
  ssr: false,
});

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtM = (v: number) =>
  v.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type SortKey = 'profitPct' | 'util' | 'CM' | 'profitM' | 'avcRRatio';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'profitPct', label: 'กำไร %' },
  { key: 'util', label: 'นิสิตจริง/จุดคุ้มทุน (Utilization)' },
  { key: 'CM', label: 'ส่วนเกิน/หัว (CM)' },
  { key: 'profitM', label: 'กำไร/ขาดทุน' },
  { key: 'avcRRatio', label: 'ผันแปร/รายได้ % (AVC/R)' },
];

const CrossAnalysisView = () => {
  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [sortKey, setSortKey] = useState<SortKey>('profitPct');

  // ตัวเลขระดับมหาวิทยาลัยสำหรับชิปบนหัวหน้าจอและแถบข้อจำกัดข้อมูล (เหมือนหน้าอื่น)
  const uniRes = useMemo(() => computeBreakEven(RAW.UNI, mode), [mode]);

  const data = useMemo(() => buildCrossData(mode), [mode]);
  const valid = useMemo(() => data.filter((d) => d.valid), [data]);
  const excludedCount = data.length - valid.length;

  const sorted = useMemo(() => {
    const asc = sortKey === 'avcRRatio';

    return [...data].sort((a, b) => (asc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));
  }, [data, sortKey]);

  // ---- Heatmap: ตารางสี ไล่เฉดต่อคอลัมน์ (min-max ของแต่ละตัวชี้วัด) — พอร์ตจากตาราง HTML ต้นฉบับ ----
  const columnValues = useMemo(
    () => HEATMAP_METRICS.map((m) => data.map((d) => d[m.key] as number)),
    [data],
  );

  // ---- Scatter 1: Q* เทียบ กำไร% ----
  const scatter1Series = [
    {
      name: 'คณะ',
      data: valid.map((d) => ({
        x: d.qStar,
        y: d.profitPct,
        fillColor: d.isOk ? '#56ca00' : '#ff4c51',
      })),
    },
  ];

  const scatter1Options: ApexOptions = {
    chart: { type: 'scatter', toolbar: { show: false }, parentHeightOffset: 0 },
    xaxis: {
      title: { text: 'จุดคุ้มทุน (Q*) — คน' },
      labels: { formatter: (v) => fmtN(Number(v)) },
    },
    yaxis: {
      title: { text: 'กำไร %' },
      labels: { formatter: (v) => `${v >= 0 ? '+' : ''}${Math.round(v)}%` },
    },
    markers: { size: 7 },
    tooltip: {
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        const p = w.config.series[seriesIndex].data[dataPointIndex];
        const d = valid[dataPointIndex];

        return `<div style="padding:6px 10px;font-size:12px">${d?.short}: จุดคุ้มทุน (Q*) ${fmtN(p.x)} คน, กำไร ${p.y >= 0 ? '+' : ''}${p.y}%</div>`;
      },
    },
  };

  // ---- Scatter 2: AVC/R% เทียบ Utilization% ----
  const scatter2Series = [
    {
      name: 'คณะ',
      data: valid.map((d) => ({
        x: d.avcRRatio,
        y: d.util,
        fillColor: d.isOk ? '#56ca00' : '#ff4c51',
      })),
    },
  ];

  const scatter2Options: ApexOptions = {
    chart: { type: 'scatter', toolbar: { show: false }, parentHeightOffset: 0 },
    xaxis: {
      title: { text: 'ผันแปร/รายได้ % (AVC/R) — ต่ำ = ดี' },
      labels: { formatter: (v) => `${Math.round(Number(v))}%` },
    },
    yaxis: {
      title: { text: 'นิสิตจริง/จุดคุ้มทุน % (Q/Q*)' },
      labels: { formatter: (v) => `${Math.round(v)}%` },
    },
    markers: { size: 7 },
    tooltip: {
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        const p = w.config.series[seriesIndex].data[dataPointIndex];
        const d = valid[dataPointIndex];

        return `<div style="padding:6px 10px;font-size:12px">${d?.short}: ผันแปร/รายได้ (AVC/R) ${p.x}%, นิสิตจริง/จุดคุ้มทุน (Utilization) ${p.y}%</div>`;
      },
    },
  };

  // ---- Bubble Quadrant: Util(x) x กำไร%(y) ขนาด=รายได้รวม ----
  const maxTR = Math.max(...valid.map((d) => d.trM), 1);
  const bubbleSeries = valid.map((d) => ({
    name: d.short,
    data: [{ x: d.util, y: d.profitPct, z: Math.max(5, (d.trM / maxTR) * 35) }],
  }));

  const bubbleOptions: ApexOptions = {
    chart: { type: 'bubble', toolbar: { show: false }, parentHeightOffset: 0 },
    xaxis: {
      title: { text: 'นิสิตจริง/จุดคุ้มทุน % (Q/Q*)' },
      labels: { formatter: (v) => `${Math.round(Number(v))}%` },
    },
    yaxis: {
      title: { text: 'อัตรากำไร % (Profit Margin)' },
      labels: { formatter: (v) => `${v >= 0 ? '+' : ''}${Math.round(v)}%` },
    },
    legend: { show: false },
    fill: { opacity: 0.65 },
    colors: valid.map((d) => (d.isOk ? '#6d4cff' : '#ff4c51')),
    tooltip: {
      custom: ({ seriesIndex }) => {
        const d = valid[seriesIndex];

        if (!d) return '';

        return `<div style="padding:6px 10px;font-size:12px">${d.short}: นิสิตจริง/จุดคุ้มทุน (Utilization) ${d.util}%, กำไร ${d.profitPct >= 0 ? '+' : ''}${d.profitPct}%, รายได้รวม (TR) ${fmtM(d.trM)} ลบ.</div>`;
      },
    },
  };

  // ---- Insights ----
  const invalid = data.filter((d) => !d.valid);
  const stars = valid.filter((d) => d.util >= 100 && d.profitPct >= 0);
  const growth = valid.filter((d) => d.util >= 100 && d.profitPct < 0);
  const recover = valid.filter((d) => d.util < 100 && d.profitPct >= 0);
  const risk = valid.filter((d) => d.util < 100 && d.profitPct < 0);
  const hiAVC = valid.filter((d) => d.avcRRatio >= 50);
  const totalProg = data.reduce((s, d) => s + d.nProg, 0);
  const totalOkProg = data.reduce((s, d) => s + d.okProg, 0);

  type Insight = { severity: 'info' | 'error' | 'warning' | 'success'; html: string };
  const insights: Insight[] = [
    {
      severity: 'info',
      html: `จัดกลุ่ม 4 กลุ่ม: ⭐ ดาวเด่น (Stars) <b>${stars.length}</b> · 📈 กำลังเติบโต (Growth) <b>${growth.length}</b> · 🔄 ต้องฟื้นฟู (Recover) <b>${recover.length}</b> · ⚠️ เสี่ยง (Risk) <b>${risk.length}</b>${invalid.length ? ` · ไม่มีจุดคุ้มทุน (Q*) <b>${invalid.length}</b>` : ''}`,
    },
  ];

  if (risk.length) {
    insights.push({
      severity: 'error',
      html: `⚠ กลุ่มเสี่ยง (Risk) — ${risk.length} คณะ (นิสิตไม่ถึงจุดคุ้มทุน (Q*) และขาดทุน): ${[
        ...risk,
      ]
        .sort((a, b) => a.profitPct - b.profitPct)
        .slice(0, 3)
        .map((d) => `${d.short} (นิสิตจริง/จุดคุ้มทุน ${d.util}% · กำไร ${d.profitPct}%)`)
        .join(', ')}`,
    });
  }

  if (invalid.length) {
    insights.push({
      severity: 'error',
      html: `${invalid.length} คณะมีรายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร (CM ≤ 0): ${invalid.map((d) => `${d.short} (ส่วนเกิน/หัว ${fmtB(d.CM)})`).join(', ')} → ใช้เป้าหมายคืนทุนเต็มจำนวน (TC/R) แทนจุดคุ้มทุน · ควรขึ้นค่าธรรมเนียมหรือลดต้นทุนผันแปร`,
    });
  }

  if (stars.length) {
    insights.push({
      severity: 'success',
      html: `⭐ กลุ่มดาวเด่น (Stars) — ${stars.length} คณะ (นิสิตเกินจุดคุ้มทุน (Q*) และมีกำไร): ${[
        ...stars,
      ]
        .sort((a, b) => b.profitPct - a.profitPct)
        .slice(0, 3)
        .map((d) => `${d.short} (+${d.profitPct}%)`)
        .join(', ')}`,
    });
  }

  if (hiAVC.length) {
    insights.push({
      severity: 'warning',
      html: `${hiAVC.length} คณะมีสัดส่วนต้นทุนผันแปรต่อรายได้ (AVC/R) ≥ 50% (ต้นทุนผันแปรกินรายได้เกินครึ่ง) — ขาดทุน <b>${hiAVC.filter((d) => d.profitPct < 0).length}/${hiAVC.length}</b> คณะ`,
    });
  }

  if (totalProg) {
    insights.push({
      severity: totalOkProg / totalProg >= 0.5 ? 'success' : 'error',
      html: `ภาพรวม: <b>${totalOkProg}/${totalProg} หลักสูตรถึงจุดคุ้มทุน (${((totalOkProg / totalProg) * 100).toFixed(0)}%)</b> ในโหมดนี้`,
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* หัวหน้าจอชุดเดียวกับหน้าอื่น — ตัด mb ของแถบสุดท้ายออก เพราะคอนเทนเนอร์นี้เว้นระยะด้วย gap แล้ว */}
      <Box sx={{ '& > :last-child': { mb: 0 } }}>
        <PageHeaderBar
          title="วิเคราะห์เชิงเปรียบเทียบ (Cross Analysis) & ตารางสีเปรียบเทียบ (Heatmap)"
          code="W5"
          mode={mode}
          onModeChange={setMode}
          q={uniRes.q}
          profit={uniRes.profit}
        />

        {SHOW_CROSS_NOTES && (
          <>
            <DataCaveatNotes profit={uniRes.profit} />

            <NoteBar severity="info">
              {REVENUE_MODE_NOTE[mode]} · นิสิตจริงเทียบจุดคุ้มทุน (Utilization = Q/Q*)
              โดยจุดคุ้มทุน (Q*) = ผลรวมรายหลักสูตร · คณะที่รายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร (CM ≤
              0) จะไม่มีจุดคุ้มทุน (แสดง —)
            </NoteBar>
          </>
        )}
      </Box>

      {/* Heatmap */}
      <Card>
        <CardHeader
          title={
            <DotTitle color="primary.main">
              ตารางสีเปรียบเทียบ (Heatmap) — ตัวชี้วัดสำคัญรายคณะ
            </DotTitle>
          }
          subheader="เขียว = ดี · แดง = ต้องปรับปรุง (ปรับตามทิศทางของแต่ละตัวชี้วัด)"
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pr: 2 }}>
              <Typography sx={{ fontSize: '0.625rem' }} color="text.secondary">
                ต่ำ
              </Typography>
              <Box
                sx={{
                  inlineSize: 60,
                  blockSize: 10,
                  borderRadius: '3px',
                  background: HEAT_SCALE_GRADIENT,
                }}
              />
              <Typography sx={{ fontSize: '0.625rem' }} color="text.secondary">
                สูง
              </Typography>
            </Box>
          }
        />
        <CardContent>
          {/* ทุกคณะในจอเดียว (ไม่จำกัดความสูง) — เซลล์เป็นแผ่นสีมุมโค้งเว้นช่องไฟ แถวกระชับ */}
          <TableContainer>
            <Table
              size="small"
              sx={{
                borderCollapse: 'separate',
                borderSpacing: '4px 3px',
                '& .MuiTableCell-root': { borderBottom: 'none' },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', py: 1 }}>
                    คณะ / วิทยาลัย
                  </TableCell>
                  {HEATMAP_METRICS.map((m) => (
                    <TableCell
                      key={m.key}
                      align="center"
                      title={`${m.label} (${m.unit})`}
                      sx={{ py: 1, px: 1, lineHeight: 1.25 }}
                    >
                      <Typography
                        sx={{ fontSize: '0.6875rem', fontWeight: 700, display: 'block' }}
                        color="text.secondary"
                      >
                        {m.label}
                      </Typography>
                      <Typography sx={{ fontSize: '0.625rem' }} color="text.disabled">
                        {m.unit}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.name}>
                    <TableCell
                      sx={{
                        py: 0.75,
                        px: 1.5,
                        borderRadius: '6px',
                        bgcolor: 'var(--mui-palette-action-hover)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          component="span"
                          sx={{
                            inlineSize: 18,
                            blockSize: 18,
                            flexShrink: 0,
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            color: d.isOk ? 'success.main' : 'error.main',
                            bgcolor: d.isOk
                              ? 'var(--mui-palette-success-lightOpacity)'
                              : 'var(--mui-palette-error-lightOpacity)',
                          }}
                        >
                          {d.isOk ? '✓' : '⚠'}
                        </Box>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
                          {d.short}
                        </Typography>
                      </Box>
                    </TableCell>
                    {HEATMAP_METRICS.map((m, colIdx) => {
                      const val = d[m.key] as number;
                      const { bg, fg } = heatCellColor(val, m.good, columnValues[colIdx] ?? []);

                      return (
                        <TableCell
                          key={m.key}
                          align="center"
                          title={`${d.name}: ${m.label} = ${m.format(val)}`}
                          sx={{
                            py: 0.75,
                            px: 1,
                            borderRadius: '6px',
                            bgcolor: bg,
                            color: fg,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap',
                            transition: 'filter .15s',
                            '&:hover': { filter: 'brightness(0.95)' },
                          }}
                        >
                          {m.format(val)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Scatters */}
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title={
                <DotTitle color="warning.main">
                  กราฟการกระจาย (Scatter): จุดคุ้มทุน (Q*) เทียบ กำไร %
                </DotTitle>
              }
              subheader={
                excludedCount > 0
                  ? `กราฟไม่รวม ${excludedCount} คณะที่ไม่คุ้มทุน (CM ≤ 0) (ไม่มีจุดคุ้มทุน) — ดูในตาราง`
                  : undefined
              }
              subheaderTypographyProps={{ color: 'error' }}
            />
            <CardContent>
              <AppReactApexCharts
                type="scatter"
                height={290}
                series={scatter1Series}
                options={scatter1Options}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title={
                <DotTitle color="error.main">
                  กราฟการกระจาย (Scatter): ผันแปร/รายได้ % (AVC/R) เทียบ นิสิตจริง/จุดคุ้มทุน %
                </DotTitle>
              }
            />
            <CardContent>
              <AppReactApexCharts
                type="scatter"
                height={290}
                series={scatter2Series}
                options={scatter2Options}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quadrant bubble */}
      <Card>
        <CardHeader
          title={
            <DotTitle color="primary.main">
              จัดกลุ่ม 4 ส่วน (Quadrant) — จัดกลุ่มคณะตามประสิทธิภาพ
            </DotTitle>
          }
          subheader="แกน X = นิสิตจริงเทียบจุดคุ้มทุน % (Utilization = Q/Q*) · แกน Y = กำไร % · ขนาดฟอง = รายได้รวม"
        />
        <CardContent>
          <AppReactApexCharts
            type="bubble"
            height={400}
            series={bubbleSeries}
            options={bubbleOptions}
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>
              ⭐ ดาวเด่น (Stars) — นิสิตถึงจุดคุ้มทุน · มีกำไร
            </Typography>
            <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700 }}>
              🔄 ต้องฟื้นฟู (Recover) — นิสิตไม่ถึงจุดคุ้มทุน · มีกำไร
            </Typography>
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
              📈 กำลังเติบโต (Growth) — นิสิตถึงจุดคุ้มทุน · ขาดทุน
            </Typography>
            <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700 }}>
              ⚠️ เสี่ยง (Risk) — นิสิตไม่ถึงจุดคุ้มทุน · ขาดทุน
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Ranking table */}
      <Card>
        <CardHeader
          title={<DotTitle color="success.main">ตารางจัดอันดับ — เรียงตาม</DotTitle>}
          action={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', pr: 2 }}>
              {SORT_OPTIONS.map((o) => (
                <Chip
                  key={o.key}
                  label={o.label}
                  size="small"
                  color={sortKey === o.key ? 'primary' : 'default'}
                  variant={sortKey === o.key ? 'filled' : 'outlined'}
                  onClick={() => setSortKey(o.key)}
                  clickable
                />
              ))}
            </Box>
          }
        />
        <CardContent sx={{ p: 0 }}>
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>คณะ / วิทยาลัย</TableCell>
                  <TableCell align="right">นิสิตจริง (Q)</TableCell>
                  <TableCell align="right">จุดคุ้มทุน (Q*)</TableCell>
                  <TableCell align="right">นิสิตจริง/จุดคุ้มทุน %</TableCell>
                  <TableCell align="right">หลักสูตรคุ้ม</TableCell>
                  <TableCell align="right">กำไร %</TableCell>
                  <TableCell align="right">ส่วนเกิน/หัว (CM)</TableCell>
                  <TableCell align="right">ผันแปร/รายได้ % (AVC/R)</TableCell>
                  <TableCell align="right">กำไร/ขาดทุน (ลบ.)</TableCell>
                  <TableCell align="right">สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sorted.map((d, i) => {
                  const bad = !d.valid;

                  return (
                    <TableRow key={d.name} hover>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={d.name}
                      >
                        {d.name}
                      </TableCell>
                      <TableCell align="right">{fmtN(d.Q)}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>
                        {d.qStar ? fmtN(d.qStar) : '—'}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 700,
                          color: bad
                            ? 'text.disabled'
                            : d.util >= 100
                              ? 'success.main'
                              : 'error.main',
                        }}
                      >
                        {bad ? '—' : `${d.util}%`}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: d.progOkRatio >= 50 ? 'success.main' : 'error.main' }}
                      >
                        {d.okProg}/{d.nProg}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 700,
                          color: d.profitPct >= 0 ? 'success.main' : 'error.main',
                        }}
                      >
                        {d.profitPct >= 0 ? '+' : ''}
                        {d.profitPct}%
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: d.CM > 0 ? 'success.main' : 'error.main' }}
                      >
                        {d.CM > 0 ? '+' : '−'}
                        {fmtB(Math.abs(d.CM))}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color:
                            d.avcRRatio >= 999
                              ? 'text.disabled'
                              : d.avcRRatio <= 20
                                ? 'success.main'
                                : d.avcRRatio <= 40
                                  ? 'warning.main'
                                  : 'error.main',
                        }}
                      >
                        {d.avcRRatio >= 999 ? '—' : `${d.avcRRatio}%`}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: d.profitM >= 0 ? 'success.main' : 'error.main' }}
                      >
                        {d.profitM >= 0 ? '+' : '−'}
                        {fmtM(Math.abs(d.profitM))}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={bad ? '⚠ ไม่คุ้มทุน (CM ≤ 0)' : d.isOk ? '✓ ผ่าน' : '⚠ ไม่ผ่าน'}
                          color={bad ? 'error' : d.isOk ? 'success' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card sx={{ borderInlineStart: 3, borderInlineStartColor: 'primary.main' }}>
        <CardHeader title="ประเด็นสำคัญ — วิเคราะห์เชิงเปรียบเทียบ (Cross Analysis)" />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {insights.map((ins, i) => (
            <Alert key={i} severity={ins.severity} variant="outlined">
              <span dangerouslySetInnerHTML={{ __html: ins.html }} />
            </Alert>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CrossAnalysisView;
