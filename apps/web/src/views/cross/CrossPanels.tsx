'use client';

/**
 * การ์ดของหน้าวิเคราะห์เชิงเปรียบเทียบที่หน้าอื่นนำไปใช้ซ้ำ (หน้าภาพรวมคณะ)
 * ตารางสี · กราฟการกระจาย 2 ตัว · ตารางจัดอันดับ — ป้อนแถว FacultyCrossRow แล้ววาดได้เลย
 */

import { useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Grid from '@mui/material/Grid';

// Third-party Imports
import type { ApexOptions } from 'apexcharts';

// Component Imports
import { BarTitle, KPI_COLORS } from '@components/ChartBits';

import type { FacultyCrossRow } from './crossData';
import { HEATMAP_METRICS, HEAT_SCALE_GRADIENT, heatCellColor } from './heatmapMetrics';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), {
  ssr: false,
});

export const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');
export const fmtM = (v: number) =>
  v.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const pct = (v: number) => `${v >= 0 ? '+' : ''}${v}%`;

// ---- ธีมกราฟ Scatter (สีแบบ MSU-KPI): จุดเขียว/แดงมีขอบเข้ม · เส้น grid ทั้งสองแกน · ช่วงแกนปัดเป็นเลขกลม ----
const SCATTER_COLORS = {
  ok: KPI_COLORS.green,
  okStroke: '#1f9d57',
  loss: KPI_COLORS.red,
  lossStroke: '#d63a3f',
};
export const AXIS_LABEL_STYLE = { colors: 'var(--mui-palette-text-secondary)', fontSize: '11px' };
export const AXIS_TITLE_STYLE = {
  color: 'var(--mui-palette-text-secondary)',
  fontSize: '11px',
  fontWeight: 500,
};

/**
 * ช่วงแกนปัดเป็นพหุคูณของ step (เผื่อขอบ ~2% ให้จุดชิดขอบยัง hover ได้) + จำนวนช่องให้ tick ตรงเลขกลม
 * ถ้าช่วงข้อมูลกว้างจน tick เกิน MAX_TICKS (เช่นโหมดไม่รวมเงินแผ่นดิน Q* พุ่งหลักหมื่น) ขยาย step แบบ 1-2-5 จนพอดี ป้องกันป้ายแกนทับกัน
 */
const MAX_TICKS = 10;

export const niceRange = (vals: number[], baseStep: number, fromZero = false) => {
  if (!vals.length) return {};
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.02;
  const span = (step: number) => {
    const min = fromZero ? 0 : Math.floor((lo - pad) / step) * step;
    const max = Math.ceil((hi + pad) / step) * step;

    return { min, max, tickAmount: Math.max(1, Math.round((max - min) / step)) };
  };

  const factors = [2, 2.5, 2]; // 1 → 2 → 5 → 10 → 20 …
  let step = baseStep;
  let r = span(step);

  for (let i = 0; r.tickAmount > MAX_TICKS; i++) {
    step *= factors[i % factors.length] ?? 2;
    r = span(step);
  }

  return r;
};

export const SCATTER_BASE: ApexOptions = {
  chart: {
    type: 'scatter',
    toolbar: { show: false },
    zoom: { enabled: false },
    parentHeightOffset: 0,
  },
  colors: [SCATTER_COLORS.ok, SCATTER_COLORS.loss],
  fill: { opacity: 0.9 },
  markers: {
    size: 8,
    strokeWidth: 1.5,
    strokeColors: [SCATTER_COLORS.okStroke, SCATTER_COLORS.lossStroke],
    hover: { sizeOffset: 2 },
  },
  // ต้องมีเส้น grid ทั้งสองแกน — ApexCharts ใช้กรอบ grid เป็นพื้นที่ hover ของ tooltip
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 0,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: true } },
    padding: { right: 16 },
  },
  legend: { show: false },
  dataLabels: { enabled: false },
  xaxis: {
    type: 'numeric',
    axisBorder: { show: true, color: 'var(--mui-palette-divider)' },
    axisTicks: { show: false },
    tooltip: { enabled: false },
    labels: { rotate: 0, hideOverlappingLabels: true, style: AXIS_LABEL_STYLE },
  },
  // intersect: แสดง tooltip ของจุดที่เมาส์ชี้จริง (ค่า default ของ scatter เดาจุดใกล้สุดข้าม series)
  tooltip: { intersect: true, shared: false },
};

/** tooltip ของจุดในกราฟ — อ่านแถวจาก meta ของจุด ไม่พึ่ง index */
export const tooltipFor =
  (body: (d: FacultyCrossRow) => string) =>
  ({
    seriesIndex,
    dataPointIndex,
    w,
  }: {
    seriesIndex: number;
    dataPointIndex: number;
    w: { config: { series: { data: { meta?: FacultyCrossRow }[] }[] } };
  }) => {
    const d = w.config.series[seriesIndex]?.data[dataPointIndex]?.meta;

    return d
      ? `<div style="padding:8px 10px;font-size:12px"><b>${d.name}</b><br/>${body(d)}</div>`
      : '';
  };

/* ======================= ตารางสีเปรียบเทียบ ======================= */

export const HeatmapCard = ({
  rows,
  unitWord,
  title,
}: {
  rows: FacultyCrossRow[];
  /** 'คณะ' หรือ 'หลักสูตร' — ใช้ในหัวตาราง และตัดคอลัมน์ "หลักสูตรที่คุ้มทุน" เมื่อเป็นรายหลักสูตร */
  unitWord: string;
  title?: string;
}) => {
  const byProgram = unitWord === 'หลักสูตร';

  // ดูรายหลักสูตร → ไม่มีคอลัมน์ "หลักสูตรที่คุ้มทุน" (หลักสูตรเดียวต่อแถว)
  const metrics = useMemo(
    () => (byProgram ? HEATMAP_METRICS.filter((m) => m.key !== 'progOkRatio') : HEATMAP_METRICS),
    [byProgram],
  );

  // ตารางสี ไล่เฉดต่อคอลัมน์ (min-max ของแต่ละตัวชี้วัด)
  const columnValues = useMemo(
    () => metrics.map((m) => rows.map((d) => d[m.key] as number)),
    [rows, metrics],
  );

  return (
    <Card>
      <CardHeader
        title={<BarTitle>{title ?? `ตารางสีเปรียบเทียบ — ตัวชี้วัดสำคัญราย${unitWord}`}</BarTitle>}
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
        {/* ทุกแถวในจอเดียว (ไม่จำกัดความสูง) — เซลล์เป็นแผ่นสีมุมโค้งเว้นช่องไฟ แถวกระชับ */}
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
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.6875rem',
                    py: 1,
                    width: '1%',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {byProgram ? 'หลักสูตร' : 'คณะ / วิทยาลัย'}
                </TableCell>
                {metrics.map((m) => (
                  <TableCell
                    key={m.key}
                    align="center"
                    title={`${m.label} (${m.unit})`}
                    // ทุกคอลัมน์ตัวชี้วัดกว้างเท่ากัน — คอลัมน์ชื่อหดตามเนื้อหา (width 1%)
                    sx={{ py: 1, px: 1, lineHeight: 1.25, width: `${100 / metrics.length}%` }}
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
              {rows.map((d, rowIdx) => (
                <TableRow key={`${rowIdx}-${d.name}`}>
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
                  {metrics.map((m, colIdx) => {
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
  );
};

/* ======================= กราฟการกระจาย 2 ตัว ======================= */

export const ScatterPair = ({ rows, unitWord }: { rows: FacultyCrossRow[]; unitWord: string }) => {
  const valid = rows.filter((d) => d.valid);
  const excludedCount = rows.length - valid.length;

  // แยก 2 ชุด (ถึง/ไม่ถึงจุดคุ้มทุน) ให้สีและขอบต่างกัน · เก็บแถวไว้ใน meta ให้ tooltip ไม่พึ่ง index
  const okRows = valid.filter((d) => d.isOk);
  const lossRows = valid.filter((d) => !d.isOk);

  const toScatterSeries = (pick: (d: FacultyCrossRow) => { x: number; y: number }) => [
    { name: 'ถึงจุดคุ้มทุน', data: okRows.map((d) => ({ ...pick(d), meta: d })) },
    { name: 'ไม่ถึงจุดคุ้มทุน', data: lossRows.map((d) => ({ ...pick(d), meta: d })) },
  ];

  // ---- Scatter 1: Q* เทียบ กำไร% ----
  const scatter1Series = toScatterSeries((d) => ({ x: d.qStar, y: d.profitPct }));
  const s1x = niceRange(
    valid.map((d) => d.qStar),
    unitWord === 'หลักสูตร' ? 100 : 1000,
    true,
  );
  const s1y = niceRange(
    valid.map((d) => d.profitPct),
    20,
  );

  const scatter1Options: ApexOptions = {
    ...SCATTER_BASE,
    xaxis: {
      ...SCATTER_BASE.xaxis,
      ...s1x,
      title: { text: 'จุดคุ้มทุน (คน)', style: AXIS_TITLE_STYLE },
      labels: { ...SCATTER_BASE.xaxis?.labels, formatter: (v) => fmtN(Number(v)) },
    },
    yaxis: {
      ...s1y,
      title: { text: 'อัตรากำไร %', style: AXIS_TITLE_STYLE },
      labels: { style: AXIS_LABEL_STYLE, formatter: (v) => pct(Math.round(v)) },
    },
    tooltip: {
      ...SCATTER_BASE.tooltip,
      custom: tooltipFor(
        (d) =>
          `จุดคุ้มทุน ${fmtN(d.qStar)} คน · นิสิตจริง ${fmtN(d.Q)} คน<br/>อัตรากำไร ${pct(d.profitPct)}`,
      ),
    },
  };

  // ---- Scatter 2: AVC/R% เทียบ Utilization% ----
  const scatter2Series = toScatterSeries((d) => ({ x: d.avcRRatio, y: d.util }));
  const s2x = niceRange(
    valid.map((d) => d.avcRRatio),
    5,
  );
  const s2y = niceRange(
    valid.map((d) => d.util),
    50,
    true,
  );

  const scatter2Options: ApexOptions = {
    ...SCATTER_BASE,
    annotations: {
      // เส้นอ้างอิง 100% = นิสิตจริงเท่ากับจุดคุ้มทุนพอดี
      yaxis: [{ y: 100, borderColor: SCATTER_COLORS.loss, strokeDashArray: 4, opacity: 0.6 }],
    },
    xaxis: {
      ...SCATTER_BASE.xaxis,
      ...s2x,
      title: { text: 'สัดส่วนต้นทุนผันแปรต่อรายได้ % — ยิ่งต่ำยิ่งดี', style: AXIS_TITLE_STYLE },
      labels: { ...SCATTER_BASE.xaxis?.labels, formatter: (v) => `${Math.round(Number(v))}%` },
    },
    yaxis: {
      ...s2y,
      title: { text: 'นิสิตจริงเทียบจุดคุ้มทุน %', style: AXIS_TITLE_STYLE },
      labels: { style: AXIS_LABEL_STYLE, formatter: (v) => `${Math.round(v)}%` },
    },
    tooltip: {
      ...SCATTER_BASE.tooltip,
      custom: tooltipFor(
        (d) =>
          `สัดส่วนต้นทุนผันแปรต่อรายได้ ${d.avcRRatio}%<br/>นิสิตจริงเทียบจุดคุ้มทุน ${d.util}%`,
      ),
    },
  };

  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader
            titleTypographyProps={{ fontSize: '1rem' }}
            title={<BarTitle>กราฟการกระจาย: จุดคุ้มทุน เทียบ อัตรากำไร</BarTitle>}
            subheader={
              excludedCount > 0
                ? `กราฟไม่รวม ${excludedCount} ${unitWord}ที่รายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร (ไม่มีจุดคุ้มทุน) — ดูในตาราง`
                : undefined
            }
            subheaderTypographyProps={{ color: 'error', fontSize: '0.75rem', fontWeight: 500 }}
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
        <Card sx={{ height: '100%' }}>
          <CardHeader
            titleTypographyProps={{ fontSize: '1rem' }}
            title={
              <BarTitle>
                กราฟการกระจาย: สัดส่วนต้นทุนผันแปรต่อรายได้ เทียบ นิสิตจริงเทียบจุดคุ้มทุน
              </BarTitle>
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
  );
};

/* ======================= ตารางจัดอันดับ ======================= */

type SortKey = 'profitPct' | 'util' | 'CM' | 'profitM' | 'avcRRatio';

const SORT_OPTIONS: { key: SortKey; label: string; hint: string }[] = [
  { key: 'profitPct', label: 'อัตรากำไร', hint: 'อัตรากำไร % (Profit Margin)' },
  {
    key: 'util',
    label: 'นิสิตจริงเทียบจุดคุ้มทุน',
    hint: 'นิสิตจริงเทียบจุดคุ้มทุน % (Utilization = Q/Q*)',
  },
  {
    key: 'CM',
    label: 'ส่วนเกินต่อหัว',
    hint: 'ส่วนเกินต่อหัว (CM) = รายได้ต่อหัว − ต้นทุนผันแปรต่อหัว',
  },
  { key: 'profitM', label: 'กำไร/ขาดทุน', hint: 'กำไร/ขาดทุน (ล้านบาท)' },
  {
    key: 'avcRRatio',
    label: 'สัดส่วนต้นทุนผันแปรต่อรายได้',
    hint: 'สัดส่วนต้นทุนผันแปรต่อรายได้ % (AVC/R) — เรียงน้อยไปมาก',
  },
];

/** สีตัวเลขในตารางจัดอันดับ — เขียวเข้ม/แดงเลือดหมู/ส้มอิฐ อ่านง่ายบนพื้นขาวกว่าสีเขียว-เหลืองสดของธีม */
const RANK_TONE = {
  good: '#1e7b4d',
  bad: '#be123c',
  mid: '#b45309',
  muted: 'var(--mui-palette-text-disabled)',
};

/** ป้ายสถานะ: ผ่าน = เขียวอ่อน · ไม่ผ่าน / ไม่มีจุดคุ้มทุน = ชมพู */
const STATUS_CHIP = {
  ok: { bg: '#d1fae5', fg: '#047857' },
  fail: { bg: '#fce7f3', fg: '#be185d' },
  none: { bg: '#fce7f3', fg: '#be185d' },
};

/** สีป้ายอันดับ 1–3 (ทอง/เงิน/ทองแดง) — อันดับอื่นใช้สีเทา */
const RANK_BADGE = [
  { bg: '#fff3c4', fg: '#9a6b00' },
  { bg: 'var(--mui-palette-action-selected)', fg: 'var(--mui-palette-text-primary)' },
  { bg: '#ffe0cc', fg: '#b4541a' },
];

const RankBadge = ({ rank }: { rank: number }) => {
  const c = RANK_BADGE[rank - 1] ?? {
    bg: 'var(--mui-palette-action-hover)',
    fg: 'var(--mui-palette-text-secondary)',
  };

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minInlineSize: 22,
        blockSize: 22,
        px: 0.5,
        borderRadius: '6px',
        fontSize: '0.6875rem',
        fontWeight: 700,
        bgcolor: c.bg,
        color: c.fg,
      }}
    >
      {rank}
    </Box>
  );
};

const StatusChip = ({ valid, ok }: { valid: boolean; ok: boolean }) => {
  const chip = !valid ? STATUS_CHIP.none : ok ? STATUS_CHIP.ok : STATUS_CHIP.fail;

  return (
    <Chip
      size="small"
      label={!valid ? '⚠ ไม่มีจุดคุ้มทุน' : ok ? '✓ ผ่าน' : '⚠ ไม่ผ่าน'}
      title={!valid ? 'รายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร — ไม่มีจุดคุ้มทุน' : undefined}
      sx={{
        fontSize: '0.6875rem',
        fontWeight: 700,
        height: 22,
        borderRadius: '6px',
        bgcolor: chip.bg,
        color: chip.fg,
      }}
    />
  );
};

/** ผลหลังปรับปรุงของหลักสูตรหนึ่ง (จากหน้าปรับปรุงหลักสูตร) — ใช้เทียบในตารางจัดอันดับ */
export interface AfterResult {
  /** จำนวนนิสิตตามแผนที่บันทึก */
  q: number;
  qStar: number | null;
  profit: number;
  ok: boolean;
  valid: boolean;
  savedAt: string;
}

type RankColumn = { label: string; hint?: string; align?: 'right'; sort?: SortKey };

export const RankingCard = ({
  rows,
  unitWord,
  after,
  onRowClick,
  basis,
  summaryLabel,
}: {
  rows: FacultyCrossRow[];
  unitWord: string;
  /** ฐานรายได้ที่ตารางใช้ — แสดงที่หัวตาราง */
  basis?: string;
  /** ส่งมา = เพิ่มแถวรวมท้ายตาราง (ชื่อแถว) */
  summaryLabel?: string;
  /** ผลหลังปรับ (key = FacultyCrossRow.key) — มีแล้วตารางจะตัดคอลัมน์รองออก แล้วเติมคอลัมน์ "หลังปรับ" คู่กัน */
  after?: Map<string, AfterResult>;
  onRowClick?: (row: FacultyCrossRow) => void;
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('profitPct');
  const byProgram = unitWord === 'หลักสูตร';
  const compare = Boolean(after);

  const sorted = useMemo(() => {
    const asc = sortKey === 'avcRRatio';

    return [...rows].sort((a, b) => (asc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));
  }, [rows, sortKey]);

  // โหมดเทียบก่อน/หลังปรับ: แสดงเท่าที่ตรงประเด็น (จุดคุ้มทุน · กำไร/ขาดทุน · สถานะ)
  const columns: RankColumn[] = [
    { label: '#' },
    { label: byProgram ? 'หลักสูตร' : 'คณะ / วิทยาลัย' },
    { label: 'นิสิตจริง', hint: 'นิสิตจริง (Q) คน', align: 'right' },
    { label: 'จุดคุ้มทุน', hint: 'จุดคุ้มทุน (Q*) คน', align: 'right' },
    ...(compare
      ? []
      : ([
          {
            label: 'นิสิตจริงเทียบจุดคุ้มทุน',
            hint: 'นิสิตจริงเทียบจุดคุ้มทุน % (Utilization = Q/Q*)',
            align: 'right',
            sort: 'util',
          },
          ...(byProgram
            ? []
            : [
                {
                  label: 'หลักสูตรที่คุ้มทุน',
                  hint: 'หลักสูตรที่ถึงจุดคุ้มทุน / ทั้งหมด',
                  align: 'right',
                },
              ]),
          {
            label: 'อัตรากำไร',
            hint: 'อัตรากำไร % (Profit Margin)',
            align: 'right',
            sort: 'profitPct',
          },
          { label: 'ส่วนเกินต่อหัว', hint: 'ส่วนเกินต่อหัว (CM) บาท', align: 'right', sort: 'CM' },
          {
            label: 'สัดส่วนต้นทุนผันแปรต่อรายได้',
            hint: 'สัดส่วนต้นทุนผันแปรต่อรายได้ % (AVC/R)',
            align: 'right',
            sort: 'avcRRatio',
          },
        ] as RankColumn[])),
    { label: 'กำไร/ขาดทุน (ล้านบาท)', align: 'right', sort: 'profitM' },
    { label: 'สถานะ', align: 'right' },
  ];

  const afterColumns = ['นิสิต', 'จุดคุ้มทุน', 'กำไร/ขาดทุน (ล้านบาท)', 'สถานะ'];

  // แถวรวม: หลักสูตรที่ยังไม่ได้ปรับใช้ค่าเดิมฝั่งหลังปรับ
  const total = useMemo(() => {
    const t = { q: 0, profit: 0, ok: 0, qAfter: 0, profitAfter: 0, okAfter: 0 };

    rows.forEach((d) => {
      const a = d.key ? after?.get(d.key) : undefined;

      t.q += d.Q;
      t.profit += d.profitM;
      t.ok += d.isOk ? 1 : 0;
      t.qAfter += a ? a.q : d.Q;
      t.profitAfter += a ? a.profit / 1e6 : d.profitM;
      t.okAfter += (a ? a.ok : d.isOk) ? 1 : 0;
    });

    return t;
  }, [rows, after]);

  const signedM = (v: number) => `${v >= 0 ? '+' : '−'}${fmtM(Math.abs(v))}`;

  return (
    <Card>
      <CardHeader
        // จอแคบ: ปุ่มเรียงลงไปบรรทัดใหม่ ไม่บีบหัวตาราง
        sx={{
          flexWrap: 'wrap',
          rowGap: 2,
          '& .MuiCardHeader-content': { minInlineSize: 260 },
          '& .MuiCardHeader-action': { m: 0 },
        }}
        title={<BarTitle>ตารางจัดอันดับ{basis ? ` · ฐาน: ${basis}` : ''} — เรียงตาม</BarTitle>}
        subheader={
          compare
            ? `ก่อนปรับ = ข้อมูลจริงตามชีต · หลังปรับ = ผลล่าสุดที่บันทึกจากหน้าปรับปรุงหลักสูตร · มี ${after?.size ?? 0} หลักสูตรที่บันทึกไว้ · ⚠ ยังเก็บในเบราว์เซอร์เครื่องนี้เท่านั้น เครื่องอื่นจะไม่เห็น`
            : undefined
        }
        action={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', pr: 2 }}>
            {SORT_OPTIONS.filter(
              (o) => !compare || o.key === 'profitPct' || o.key === 'profitM' || o.key === 'util',
            ).map((o) => (
              <Button
                key={o.key}
                size="small"
                title={o.hint}
                variant={sortKey === o.key ? 'contained' : 'outlined'}
                color={sortKey === o.key ? 'primary' : 'secondary'}
                onClick={() => setSortKey(o.key)}
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  px: 2,
                  minWidth: 0,
                }}
              >
                {o.label}
              </Button>
            ))}
          </Box>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <TableContainer>
          <Table
            size="small"
            stickyHeader
            sx={{
              '& .MuiTableCell-root': { py: 1.5, fontSize: '0.8125rem', whiteSpace: 'nowrap' },
              '& .MuiTableCell-head': {
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'text.secondary',
                bgcolor: 'background.paper',
                borderBottomWidth: 2,
              },
              '& .after': { bgcolor: 'var(--mui-palette-primary-lightOpacity)' },
            }}
          >
            <TableHead>
              {compare && (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    ก่อนปรับ (ปัจจุบัน)
                  </TableCell>
                  <TableCell colSpan={afterColumns.length} align="center" className="after">
                    หลังปรับ
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                {columns.map((c) => (
                  <TableCell key={c.label} align={c.align} title={c.hint}>
                    {c.label}
                  </TableCell>
                ))}
                {compare &&
                  afterColumns.map((l) => (
                    <TableCell key={`after-${l}`} align="right" className="after">
                      {l}
                    </TableCell>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((d, i) => {
                const bad = !d.valid;

                // เขียว = ดี · แดง = แย่ (ตามทิศทางของแต่ละตัวชี้วัด)
                const tone = (good: boolean) => ({
                  color: good ? RANK_TONE.good : RANK_TONE.bad,
                });
                const avcTone =
                  d.avcRRatio >= 999
                    ? RANK_TONE.muted
                    : d.avcRRatio <= 25
                      ? RANK_TONE.good
                      : d.avcRRatio < 50
                        ? RANK_TONE.mid
                        : RANK_TONE.bad;
                const a = d.key ? after?.get(d.key) : undefined;

                return (
                  <TableRow key={`${i}-${d.name}`} hover>
                    <TableCell>
                      <RankBadge rank={i + 1} />
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        maxWidth: 280,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={d.name}
                    >
                      {onRowClick ? (
                        <Box
                          component="button"
                          type="button"
                          onClick={() => onRowClick(d)}
                          sx={{
                            all: 'unset',
                            cursor: 'pointer',
                            color: 'primary.main',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          {d.name}
                        </Box>
                      ) : (
                        d.name
                      )}
                    </TableCell>
                    <TableCell align="right">{fmtN(d.Q)}</TableCell>
                    <TableCell align="right" sx={{ color: RANK_TONE.bad }}>
                      {bad ? '—' : fmtN(d.qStar)}
                    </TableCell>
                    {!compare && (
                      <>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 600,
                            ...(bad ? { color: RANK_TONE.muted } : tone(d.util >= 100)),
                          }}
                        >
                          {bad ? '—' : `${d.util}%`}
                        </TableCell>
                        {!byProgram && (
                          <TableCell align="right" sx={tone(d.progOkRatio >= 50)}>
                            {d.okProg}/{d.nProg}
                          </TableCell>
                        )}
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 600, ...tone(d.profitPct >= 0) }}
                        >
                          {pct(d.profitPct)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, ...tone(d.CM > 0) }}>
                          {d.CM > 0 ? '+' : '−'}
                          {fmtB(Math.abs(d.CM))}
                        </TableCell>
                        <TableCell align="right" sx={{ color: avcTone }}>
                          {d.avcRRatio >= 999 ? '—' : `${d.avcRRatio}%`}
                        </TableCell>
                      </>
                    )}
                    <TableCell align="right" sx={tone(d.profitM >= 0)}>
                      {d.profitM >= 0 ? '+' : '−'}
                      {fmtM(Math.abs(d.profitM))}
                    </TableCell>
                    <TableCell align="right">
                      <StatusChip valid={!bad} ok={d.isOk} />
                    </TableCell>
                    {compare &&
                      (a ? (
                        <>
                          <TableCell align="right" className="after">
                            {fmtN(a.q)}
                          </TableCell>
                          <TableCell
                            align="right"
                            className="after"
                            sx={{ color: RANK_TONE.bad }}
                            title={`บันทึกเมื่อ ${a.savedAt}`}
                          >
                            {a.valid && a.qStar !== null ? fmtN(a.qStar) : '—'}
                          </TableCell>
                          <TableCell align="right" className="after" sx={tone(a.profit >= 0)}>
                            {a.profit >= 0 ? '+' : '−'}
                            {fmtM(Math.abs(a.profit) / 1e6)}
                          </TableCell>
                          <TableCell align="right" className="after">
                            <StatusChip valid={a.valid} ok={a.ok} />
                          </TableCell>
                        </>
                      ) : (
                        <TableCell
                          colSpan={afterColumns.length}
                          align="center"
                          className="after"
                          sx={{ color: 'text.disabled' }}
                        >
                          ยังไม่ได้ปรับปรุง
                        </TableCell>
                      ))}
                  </TableRow>
                );
              })}
              {summaryLabel && rows.length > 0 && (
                <TableRow
                  sx={{
                    position: 'sticky',
                    insetBlockEnd: 0,
                    '& .MuiTableCell-root': {
                      fontWeight: 700,
                      bgcolor: 'var(--mui-palette-action-hover)',
                      borderTop: 2,
                      borderBottom: 0,
                      borderColor: 'divider',
                    },
                  }}
                >
                  <TableCell />
                  <TableCell>{summaryLabel}</TableCell>
                  <TableCell align="right">{fmtN(total.q)}</TableCell>
                  <TableCell colSpan={columns.length - 5} />
                  <TableCell
                    align="right"
                    sx={{ color: total.profit >= 0 ? RANK_TONE.good : RANK_TONE.bad }}
                  >
                    {signedM(total.profit)}
                  </TableCell>
                  <TableCell align="right">
                    ผ่าน {total.ok}/{rows.length}
                  </TableCell>
                  {compare && (
                    <>
                      <TableCell align="right" className="after">
                        {fmtN(total.qAfter)}
                        {total.qAfter !== total.q && (
                          <Box
                            component="span"
                            sx={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600 }}
                          >
                            {total.qAfter > total.q ? '+' : '−'}
                            {fmtN(Math.abs(total.qAfter - total.q))}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell className="after" />
                      <TableCell
                        align="right"
                        className="after"
                        sx={{ color: total.profitAfter >= 0 ? RANK_TONE.good : RANK_TONE.bad }}
                      >
                        {signedM(total.profitAfter)}
                        {Math.abs(total.profitAfter - total.profit) >= 0.05 && (
                          <Box
                            component="span"
                            sx={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600 }}
                          >
                            {total.profitAfter > total.profit ? 'ดีขึ้น ' : 'แย่ลง '}
                            {fmtM(Math.abs(total.profitAfter - total.profit))} ลบ.
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right" className="after">
                        ผ่าน {total.okAfter}/{rows.length}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
