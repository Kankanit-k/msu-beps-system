'use client';

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
import type { FacultyCrossRow } from './crossData';
import { HEATMAP_METRICS, HEAT_SCALE_GRADIENT, heatCellColor } from './heatmapMetrics';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), {
  ssr: false,
});

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtM = (v: number) =>
  v.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// ---- ธีมกราฟ Scatter: จุดเขียว/ชมพูมีขอบเข้ม · เส้น grid ทั้งสองแกน · ช่วงแกนปัดเป็นเลขกลม ----
const SCATTER_COLORS = { ok: '#2bb389', okStroke: '#1d8f6c', loss: '#ef6b95', lossStroke: '#d94677' };
const AXIS_LABEL_STYLE = { colors: 'var(--mui-palette-text-secondary)', fontSize: '11px' };
const AXIS_TITLE_STYLE = { color: 'var(--mui-palette-text-secondary)', fontSize: '11px', fontWeight: 500 };

/**
 * ช่วงแกนปัดเป็นพหุคูณของ step (เผื่อขอบ ~2% ให้จุดชิดขอบยัง hover ได้) + จำนวนช่องให้ tick ตรงเลขกลม
 * ถ้าช่วงข้อมูลกว้างจน tick เกิน MAX_TICKS (เช่นโหมดไม่รวมเงินแผ่นดิน Q* พุ่งหลักหมื่น) ขยาย step แบบ 1-2-5 จนพอดี ป้องกันป้ายแกนทับกัน
 */
const MAX_TICKS = 10;

const niceRange = (vals: number[], baseStep: number, fromZero = false) => {
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

/** สี/ป้ายของ 4 กลุ่มใน Quadrant — สีฟองตรงกับสีป้ายมุมกราฟ */
const QUADRANT_STYLE = {
  stars: { label: 'ดาวเด่น', icon: '⭐', color: '#2bb389' },
  recover: { label: 'ต้องฟื้นฟู', icon: '🔄', color: '#f5a524' },
  growth: { label: 'กำลังเติบโต', icon: '📈', color: '#7c5cff' },
  risk: { label: 'เสี่ยง', icon: '⚠️', color: '#ef6b95' },
};

const SCATTER_BASE: ApexOptions = {
  chart: { type: 'scatter', toolbar: { show: false }, zoom: { enabled: false }, parentHeightOffset: 0 },
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

type QuadrantInfo = { label: string; icon: string; color: string; rows: unknown[] };

const QuadrantLabel = ({ q }: { q: QuadrantInfo }) => (
  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: q.color }}>
    {q.icon} {q.label} · {q.rows.length} คณะ
  </Typography>
);

/** แถวป้ายกลุ่มซ้าย/ขวา — ซ้าย = นิสิตไม่ถึงจุดคุ้มทุน (Util < 100%) · ขวา = ถึงจุดคุ้มทุน */
const QuadrantLabels = ({ left, right }: { left: QuadrantInfo; right: QuadrantInfo }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, px: 6 }}>
    <QuadrantLabel q={left} />
    <QuadrantLabel q={right} />
  </Box>
);

type SortKey = 'profitPct' | 'util' | 'CM' | 'profitM' | 'avcRRatio';

const SORT_OPTIONS: { key: SortKey; label: string; hint: string }[] = [
  { key: 'profitPct', label: 'อัตรากำไร', hint: 'อัตรากำไร % (Profit Margin)' },
  { key: 'util', label: 'นิสิตจริงเทียบจุดคุ้มทุน', hint: 'นิสิตจริงเทียบจุดคุ้มทุน % (Utilization = Q/Q*)' },
  { key: 'CM', label: 'ส่วนเกินต่อหัว', hint: 'ส่วนเกินต่อหัว (CM) = รายได้ต่อหัว − ต้นทุนผันแปรต่อหัว' },
  { key: 'profitM', label: 'กำไร/ขาดทุน', hint: 'กำไร/ขาดทุน (ล้านบาท)' },
  { key: 'avcRRatio', label: 'สัดส่วนต้นทุนผันแปรต่อรายได้', hint: 'สัดส่วนต้นทุนผันแปรต่อรายได้ % (AVC/R) — เรียงน้อยไปมาก' },
];

/** หัวคอลัมน์ตารางจัดอันดับ — sort = คีย์ที่คอลัมน์นี้ใช้เรียง (ไว้เน้นหัวคอลัมน์ที่กำลังเรียง) */
const RANK_COLUMNS: { label: string; hint?: string; align?: 'right'; sort?: SortKey }[] = [
  { label: '#' },
  { label: 'คณะ / วิทยาลัย' },
  { label: 'นิสิตจริง', hint: 'นิสิตจริง (Q) คน', align: 'right' },
  { label: 'จุดคุ้มทุน', hint: 'จุดคุ้มทุน (Q*) คน', align: 'right' },
  { label: 'นิสิตจริงเทียบจุดคุ้มทุน', hint: 'นิสิตจริงเทียบจุดคุ้มทุน % (Utilization = Q/Q*)', align: 'right', sort: 'util' },
  { label: 'หลักสูตรที่คุ้มทุน', hint: 'หลักสูตรที่ถึงจุดคุ้มทุน / ทั้งหมด', align: 'right' },
  { label: 'อัตรากำไร', hint: 'อัตรากำไร % (Profit Margin)', align: 'right', sort: 'profitPct' },
  { label: 'ส่วนเกินต่อหัว', hint: 'ส่วนเกินต่อหัว (CM) บาท', align: 'right', sort: 'CM' },
  { label: 'สัดส่วนต้นทุนผันแปรต่อรายได้', hint: 'สัดส่วนต้นทุนผันแปรต่อรายได้ % (AVC/R)', align: 'right', sort: 'avcRRatio' },
  { label: 'กำไร/ขาดทุน (ล้านบาท)', align: 'right', sort: 'profitM' },
  { label: 'สถานะ', align: 'right' },
];

/** สีตัวเลขในตารางจัดอันดับ — เขียวเข้ม/แดงเลือดหมู/ส้มอิฐ อ่านง่ายบนพื้นขาวกว่าสีเขียว-เหลืองสดของธีม */
const RANK_TONE = { good: '#1e7b4d', bad: '#be123c', mid: '#b45309', muted: 'var(--mui-palette-text-disabled)' };

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

/** ไอคอนนำหน้าแต่ละบรรทัดของ "ประเด็นสำคัญ" ตามระดับความรุนแรง */
const INSIGHT_ICON = {
  info: { icon: '▸', color: 'primary.main' },
  error: { icon: '⚠', color: 'error.main' },
  warning: { icon: '⚠', color: 'warning.main' },
  success: { icon: '✓', color: 'success.main' },
} as const;

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

  // ---- Scatter: แยก 2 ชุด (ถึง/ไม่ถึงจุดคุ้มทุน) ให้สีและขอบต่างกัน · เก็บคณะไว้ใน meta ให้ tooltip ไม่พึ่ง index ----
  const okRows = valid.filter((d) => d.isOk);
  const lossRows = valid.filter((d) => !d.isOk);

  const toScatterSeries = (pick: (d: FacultyCrossRow) => { x: number; y: number }) => [
    { name: 'ถึงจุดคุ้มทุน', data: okRows.map((d) => ({ ...pick(d), meta: d })) },
    { name: 'ไม่ถึงจุดคุ้มทุน', data: lossRows.map((d) => ({ ...pick(d), meta: d })) },
  ];

  const tooltipFor =
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

      return d ? `<div style="padding:8px 10px;font-size:12px"><b>${d.name}</b><br/>${body(d)}</div>` : '';
    };

  const pct = (v: number) => `${v >= 0 ? '+' : ''}${v}%`;

  // ---- Scatter 1: Q* เทียบ กำไร% ----
  const scatter1Series = toScatterSeries((d) => ({ x: d.qStar, y: d.profitPct }));
  const s1x = niceRange(valid.map((d) => d.qStar), 1000, true);
  const s1y = niceRange(valid.map((d) => d.profitPct), 20);

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
        (d) => `จุดคุ้มทุน ${fmtN(d.qStar)} คน · นิสิตจริง ${fmtN(d.Q)} คน<br/>อัตรากำไร ${pct(d.profitPct)}`,
      ),
    },
  };

  // ---- Scatter 2: AVC/R% เทียบ Utilization% ----
  const scatter2Series = toScatterSeries((d) => ({ x: d.avcRRatio, y: d.util }));
  const s2x = niceRange(valid.map((d) => d.avcRRatio), 5);
  const s2y = niceRange(valid.map((d) => d.util), 50, true);

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
        (d) => `สัดส่วนต้นทุนผันแปรต่อรายได้ ${d.avcRRatio}%<br/>นิสิตจริงเทียบจุดคุ้มทุน ${d.util}%`,
      ),
    },
  };

  // ---- Bubble Quadrant: Util(x) x กำไร%(y) ขนาด=รายได้รวม · เส้นแบ่งที่ Util 100% และกำไร 0% ----
  const stars = valid.filter((d) => d.util >= 100 && d.profitPct >= 0);
  const growth = valid.filter((d) => d.util >= 100 && d.profitPct < 0);
  const recover = valid.filter((d) => d.util < 100 && d.profitPct >= 0);
  const risk = valid.filter((d) => d.util < 100 && d.profitPct < 0);
  const qStars = { ...QUADRANT_STYLE.stars, rows: stars };
  const qRecover = { ...QUADRANT_STYLE.recover, rows: recover };
  const qGrowth = { ...QUADRANT_STYLE.growth, rows: growth };
  const qRisk = { ...QUADRANT_STYLE.risk, rows: risk };
  const quadrants = [qStars, qRecover, qGrowth, qRisk];

  // z = √รายได้รวม — ApexCharts ปรับรัศมีตาม z แบบเส้นตรง จึงใช้รากที่สองให้ "พื้นที่" ฟองแปรตามรายได้
  const bubbleSeries = quadrants.map((q) => ({
    name: q.label,
    data: q.rows.map((d) => ({ x: d.util, y: d.profitPct, z: Math.sqrt(Math.max(d.trM, 0)), meta: d })),
  }));

  // แกนต้องคร่อมเส้นแบ่ง (Util 100%, กำไร 0%) เสมอ — ป้ายกลุ่มเหนือ/ใต้กราฟจึงตรงกับฝั่งของเส้นแบ่ง
  const bx = niceRange([0, 100, ...valid.map((d) => d.util)], 50, true);
  const by = niceRange([0, ...valid.map((d) => d.profitPct)], 20);
  const bubbleOptions: ApexOptions = {
    chart: {
      type: 'bubble',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      parentHeightOffset: 0,
    },
    colors: quadrants.map((q) => q.color),
    fill: { opacity: 0.55 },
    // ขอบฟองของ bubble มาจาก markers (ไม่ใช่ stroke) — ใช้สีเดียวกับฟองแทนขอบขาวค่า default
    markers: { strokeWidth: 1.5, strokeColors: quadrants.map((q) => q.color) },
    dataLabels: { enabled: false },
    legend: { show: false },
    plotOptions: { bubble: { minBubbleRadius: 5, maxBubbleRadius: 34 } },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
      padding: { right: 16 },
    },
    annotations: {
      xaxis: [{ x: 100, borderColor: 'var(--mui-palette-text-disabled)', strokeDashArray: 4 }],
      yaxis: [{ y: 0, borderColor: 'var(--mui-palette-text-disabled)', strokeDashArray: 4 }],
    },
    xaxis: {
      ...SCATTER_BASE.xaxis,
      ...bx,
      title: { text: 'นิสิตจริงเทียบจุดคุ้มทุน %', style: AXIS_TITLE_STYLE },
      labels: { ...SCATTER_BASE.xaxis?.labels, formatter: (v) => `${Math.round(Number(v))}%` },
    },
    yaxis: {
      ...by,
      title: { text: 'อัตรากำไร %', style: AXIS_TITLE_STYLE },
      labels: { style: AXIS_LABEL_STYLE, formatter: (v) => pct(Math.round(v)) },
    },
    tooltip: {
      ...SCATTER_BASE.tooltip,
      custom: tooltipFor(
        (d) =>
          `นิสิตจริงเทียบจุดคุ้มทุน ${d.util}% · อัตรากำไร ${pct(d.profitPct)}<br/>รายได้รวม ${fmtM(d.trM)} ล้านบาท`,
      ),
    },
  };

  // ---- Insights ----
  const invalid = data.filter((d) => !d.valid);
  const hiAVC = valid.filter((d) => d.avcRRatio >= 50);
  const totalProg = data.reduce((s, d) => s + d.nProg, 0);
  const totalOkProg = data.reduce((s, d) => s + d.okProg, 0);

  type Insight = { severity: 'info' | 'error' | 'warning' | 'success'; html: string };
  const insights: Insight[] = [
    {
      severity: 'info',
      html: `จัดกลุ่ม 4 กลุ่ม: ⭐ ดาวเด่น <b>${stars.length}</b> · 📈 กำลังเติบโต <b>${growth.length}</b> · 🔄 ต้องฟื้นฟู <b>${recover.length}</b> · ⚠️ เสี่ยง <b>${risk.length}</b>${invalid.length ? ` · ไม่มีจุดคุ้มทุน <b>${invalid.length}</b>` : ''}`,
    },
  ];

  if (risk.length) {
    insights.push({
      severity: 'error',
      html: `กลุ่มเสี่ยง — ${risk.length} คณะ (นิสิตไม่ถึงจุดคุ้มทุนและขาดทุน): ${[
        ...risk,
      ]
        .sort((a, b) => a.profitPct - b.profitPct)
        .slice(0, 3)
        .map((d) => `${d.short} (นิสิตจริงเทียบจุดคุ้มทุน ${d.util}% · อัตรากำไร ${d.profitPct}%)`)
        .join(', ')}`,
    });
  }

  if (invalid.length) {
    insights.push({
      severity: 'error',
      html: `${invalid.length} คณะมีรายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร (ส่วนเกินต่อหัวติดลบหรือเป็นศูนย์): ${invalid.map((d) => `${d.short} (ส่วนเกินต่อหัว ${fmtB(d.CM)} บาท)`).join(', ')} → ใช้เป้าหมายคืนทุนเต็มจำนวน (ต้นทุนรวม ÷ รายได้ต่อหัว) แทนจุดคุ้มทุน · ควรขึ้นค่าธรรมเนียมหรือลดต้นทุนผันแปร`,
    });
  }

  if (stars.length) {
    insights.push({
      severity: 'success',
      html: `⭐ กลุ่มดาวเด่น — ${stars.length} คณะ (นิสิตเกินจุดคุ้มทุนและมีกำไร): ${[
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
      html: `${hiAVC.length} คณะมีสัดส่วนต้นทุนผันแปรต่อรายได้ตั้งแต่ 50% ขึ้นไป (ต้นทุนผันแปรกินรายได้เกินครึ่ง) — ขาดทุน <b>${hiAVC.filter((d) => d.profitPct < 0).length}/${hiAVC.length}</b> คณะ`,
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
          title="วิเคราะห์เชิงเปรียบเทียบ และตารางสีเปรียบเทียบ"
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
              {REVENUE_MODE_NOTE[mode]} · นิสิตจริงเทียบจุดคุ้มทุน
              โดยจุดคุ้มทุน = ผลรวมรายหลักสูตร · คณะที่รายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร จะไม่มีจุดคุ้มทุน
              (แสดง —)
            </NoteBar>
          </>
        )}
      </Box>

      {/* Heatmap */}
      <Card>
        <CardHeader
          title={
            <DotTitle color="primary.main">
              ตารางสีเปรียบเทียบ — ตัวชี้วัดสำคัญรายคณะ
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
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem', py: 1, width: '1%', whiteSpace: 'nowrap' }}>
                    คณะ / วิทยาลัย
                  </TableCell>
                  {HEATMAP_METRICS.map((m) => (
                    <TableCell
                      key={m.key}
                      align="center"
                      title={`${m.label} (${m.unit})`}
                      // ทุกคอลัมน์ตัวชี้วัดกว้างเท่ากัน — คอลัมน์ชื่อคณะหดตามเนื้อหา (width 1%)
                      sx={{ py: 1, px: 1, lineHeight: 1.25, width: `${100 / HEATMAP_METRICS.length}%` }}
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
          <Card sx={{ height: '100%' }}>
            <CardHeader
              titleTypographyProps={{ fontSize: '1rem' }}
              title={
                <DotTitle color="warning.main">
                  กราฟการกระจาย: จุดคุ้มทุน เทียบ อัตรากำไร
                </DotTitle>
              }
              subheader={
                excludedCount > 0
                  ? `กราฟไม่รวม ${excludedCount} คณะที่รายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร (ไม่มีจุดคุ้มทุน) — ดูในตาราง`
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
                <DotTitle color="error.main">
                  กราฟการกระจาย: สัดส่วนต้นทุนผันแปรต่อรายได้ เทียบ นิสิตจริงเทียบจุดคุ้มทุน
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
              จัดกลุ่มคณะตามประสิทธิภาพ 4 กลุ่ม
            </DotTitle>
          }
          subheader="แกนนอน = นิสิตจริงเทียบจุดคุ้มทุน % · แกนตั้ง = อัตรากำไร % · ขนาดวงกลม = รายได้รวม · เส้นประ = นิสิตเท่าจุดคุ้มทุนพอดี (100%) / กำไรเท่าศูนย์"
        />
        <CardContent>
          {/* กรอบพื้นอ่อนรอบกราฟ — ป้ายกลุ่มวางนอกพื้นที่พล็อต (บน: Recover/Stars · ล่าง: Risk/Growth) จะได้ไม่ทับฟองที่อยู่ชิดมุม */}
          <Box
            sx={{
              border: '1px solid var(--mui-palette-divider)',
              borderRadius: 2,
              bgcolor: 'var(--mui-palette-action-hover)',
              p: 2,
            }}
          >
            <QuadrantLabels left={qRecover} right={qStars} />
            <AppReactApexCharts
              type="bubble"
              height={400}
              series={bubbleSeries}
              options={bubbleOptions}
            />
            <QuadrantLabels left={qRisk} right={qGrowth} />
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
                <Button
                  key={o.key}
                  size="small"
                  title={o.hint}
                  variant={sortKey === o.key ? 'contained' : 'outlined'}
                  color="secondary"
                  onClick={() => setSortKey(o.key)}
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    px: 2,
                    minWidth: 0,
                    ...(sortKey === o.key && {
                      bgcolor: '#312e81',
                      color: '#fff',
                      '&:hover': { bgcolor: '#3730a3' },
                    }),
                  }}
                >
                  {o.label}
                </Button>
              ))}
            </Box>
          }
        />
        <CardContent sx={{ pt: 0 }}>
          {/* แสดงทุกคณะในครั้งเดียว (~20 แถว) — ไม่จำกัดความสูง ไม่ต้อง scroll */}
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
              }}
            >
              <TableHead>
                <TableRow>
                  {RANK_COLUMNS.map((c) => (
                    <TableCell
                      key={c.label}
                      align={c.align}
                      title={c.hint}
                    >
                      {c.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sorted.map((d, i) => {
                  const bad = !d.valid;

                  // เขียว = ดี · แดง = แย่ (ตามทิศทางของแต่ละตัวชี้วัด)
                  const tone = (good: boolean) => ({ color: good ? RANK_TONE.good : RANK_TONE.bad });
                  const avcTone =
                    d.avcRRatio >= 999
                      ? RANK_TONE.muted
                      : d.avcRRatio <= 25
                        ? RANK_TONE.good
                        : d.avcRRatio < 50
                          ? RANK_TONE.mid
                          : RANK_TONE.bad;
                  const chip = bad ? STATUS_CHIP.none : d.isOk ? STATUS_CHIP.ok : STATUS_CHIP.fail;

                  return (
                    <TableRow key={d.name} hover>
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
                        {d.name}
                      </TableCell>
                      <TableCell align="right">{fmtN(d.Q)}</TableCell>
                      <TableCell align="right" sx={{ color: RANK_TONE.bad }}>
                        {bad ? '—' : fmtN(d.qStar)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 600, ...(bad ? { color: RANK_TONE.muted } : tone(d.util >= 100)) }}
                      >
                        {bad ? '—' : `${d.util}%`}
                      </TableCell>
                      <TableCell align="right" sx={tone(d.progOkRatio >= 50)}>
                        {d.okProg}/{d.nProg}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, ...tone(d.profitPct >= 0) }}>
                        {pct(d.profitPct)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, ...tone(d.CM > 0) }}>
                        {d.CM > 0 ? '+' : '−'}
                        {fmtB(Math.abs(d.CM))}
                      </TableCell>
                      <TableCell align="right" sx={{ color: avcTone }}>
                        {d.avcRRatio >= 999 ? '—' : `${d.avcRRatio}%`}
                      </TableCell>
                      <TableCell align="right" sx={tone(d.profitM >= 0)}>
                        {d.profitM >= 0 ? '+' : '−'}
                        {fmtM(Math.abs(d.profitM))}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={bad ? '⚠ ไม่มีจุดคุ้มทุน' : d.isOk ? '✓ ผ่าน' : '⚠ ไม่ผ่าน'}
                          title={bad ? 'รายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร — ไม่มีจุดคุ้มทุน' : undefined}
                          sx={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            height: 22,
                            borderRadius: '6px',
                            bgcolor: chip.bg,
                            color: chip.fg,
                          }}
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

      {/* Insights — รายการบรรทัดเดียวพร้อมไอคอนนำหน้าตามความรุนแรง */}
      <Card sx={{ borderInlineStart: '4px solid var(--mui-palette-primary-main)' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
            ประเด็นสำคัญ — วิเคราะห์เชิงเปรียบเทียบ
          </Typography>
          {insights.map((ins, i) => {
            const ic = INSIGHT_ICON[ins.severity];

            return (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline' }}>
                <Typography component="span" sx={{ color: ic.color, fontWeight: 700, flexShrink: 0, fontSize: '0.8125rem' }}>
                  {ic.icon}
                </Typography>
                <Typography
                  component="span"
                  sx={{ fontSize: '0.8125rem', color: 'text.primary', '& b': { fontWeight: 700 } }}
                  dangerouslySetInnerHTML={{ __html: ins.html }}
                />
              </Box>
            );
          })}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CrossAnalysisView;
