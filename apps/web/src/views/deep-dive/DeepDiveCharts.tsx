'use client';

// Next Imports
import dynamic from 'next/dynamic';

// React Imports
import type { ReactNode } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { ApexOptions } from 'apexcharts';

// Component Imports
import { BarTitle, BEPS, LegendItem } from '@components/ChartBits';
import InfoTip from '@components/InfoTip';

import { DD_YEARS } from './deepDiveData';
import type { Series } from './deepDiveData';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

const H = 260;

/** การ์ดกราฟของหมวด — หัวแถบสี + คำอธิบาย + ป้ายสี */
export const ChartCard = ({
  title,
  info,
  legend,
  note,
  children,
}: {
  title: string;
  info?: string;
  legend?: { color: string; label: string }[];
  note?: ReactNode;
  children: ReactNode;
}) => (
  <Card sx={{ blockSize: '100%', overflow: 'visible' }}>
    <CardContent>
      <Typography variant="h6" component="div" sx={{ mb: 1 }}>
        <BarTitle>
          {title}
          {info && <InfoTip text={info} />}
        </BarTitle>
      </Typography>
      {legend && (
        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          {legend.map((l) => (
            <LegendItem key={l.label} {...l} />
          ))}
        </Stack>
      )}
      {children}
      {note && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          {note}
        </Typography>
      )}
    </CardContent>
  </Card>
);

// apex ส่ง null เข้า formatter ของแกนเมื่อเปิด dataLabels บนแท่งที่มีปีว่าง
const nullSafe = (fmt: (v: number) => string) => (v: number | null | undefined) =>
  v === null || v === undefined ? '' : fmt(v);

const baseOptions = (fmt: (v: number) => string): ApexOptions => ({
  chart: { toolbar: { show: false }, zoom: { enabled: false }, parentHeightOffset: 0 },
  legend: { show: false },
  dataLabels: { enabled: false },
  grid: { borderColor: 'var(--mui-palette-divider)' },
  xaxis: { categories: DD_YEARS.map(String) },
  yaxis: { labels: { formatter: nullSafe(fmt) } },
  tooltip: {
    shared: true,
    intersect: false,
    y: { formatter: (v: number | null) => (v === null ? 'รอข้อมูล' : fmt(v)) },
  },
  noData: { text: 'ยังไม่มีข้อมูล' },
});

/**
 * แนวโน้มรายปี — line หรือ bar (stacked ได้) · ปีที่ไม่มีข้อมูลเป็นช่องว่าง (ไม่ลากเส้นข้าม)
 */
export const YearTrend = ({
  type,
  series,
  fmt,
  stacked,
  signedColors,
  dualAxis,
  labels,
}: {
  type: 'line' | 'bar';
  series: { name: string; color: string; data: Series }[];
  fmt: (v: number) => string;
  stacked?: boolean;
  /** แท่งบวกเขียว/ลบแดง (ชุดเดียว) */
  signedColors?: boolean;
  /** สองชุดคนละหน่วย — ชุดที่ 2 ใช้แกนขวา */
  dualAxis?: boolean;
  /** ตัวเลขบนหัวแท่ง (bar ไม่ stacked) */
  labels?: boolean;
}) => {
  const options: ApexOptions = {
    ...baseOptions(fmt),
    chart: { ...baseOptions(fmt).chart, stacked },
    colors: signedColors
      ? [
          ({ value }: { value: number }) =>
            value < 0 ? 'var(--mui-palette-error-main)' : BEPS.breakEven,
        ]
      : series.map((s) => s.color),
    stroke: type === 'line' ? { width: 3, curve: 'straight' } : { width: 0 },
    markers: { size: type === 'line' ? 5 : 0 },
    plotOptions: { bar: { columnWidth: '45%', borderRadius: 4 } },
    ...(labels &&
      !stacked &&
      type === 'bar' && {
        dataLabels: {
          enabled: true,
          formatter: (v: number) => (v === null ? '' : fmt(v)),
          offsetY: -20,
          style: { fontSize: '12px', fontWeight: 700, colors: ['var(--mui-palette-text-primary)'] },
        },
        plotOptions: {
          bar: { columnWidth: '45%', borderRadius: 4, dataLabels: { position: 'top' } },
        },
      }),
    ...(stacked &&
      type === 'bar' && {
        // ตัวเลขในแท่งแต่ละส่วน + ยอดรวมบนหัวแท่ง · tooltip บอกรวม / แต่ละส่วน / สัดส่วน
        dataLabels: {
          enabled: true,
          formatter: (v: number) => (v ? fmt(v) : ''),
          style: { fontSize: '11px', fontWeight: 600, colors: ['#fff'] },
        },
        plotOptions: {
          bar: {
            columnWidth: '45%',
            borderRadius: 4,
            borderRadiusApplication: 'end',
            borderRadiusWhenStacked: 'last',
            dataLabels: {
              // แท่งแคบ — ตัวเลขแนวนอนล้นแท่งจน apex ตัดทิ้ง
              orientation: 'vertical',
              total: {
                enabled: true,
                formatter: (v?: string) => (v ? fmt(Number(v)) : ''),
                style: { fontSize: '12px', fontWeight: 700, color: 'var(--mui-palette-text-primary)' },
              },
            },
          },
        },
        tooltip: {
          custom: ({ dataPointIndex: i }: { dataPointIndex: number }) => {
            const vals = series.map((sr) => sr.data[i] ?? null);

            if (vals.every((v) => v === null))
              return `<div style="padding:8px 12px">${DD_YEARS[i]} · รอข้อมูล</div>`;
            const total = vals.reduce<number>((a, v) => a + (v ?? 0), 0);
            const row = (color: string, name: string, v: number | null) =>
              `<div style="display:flex;gap:8px;align-items:center;justify-content:space-between">` +
              `<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color};margin-inline-end:6px"></span>${name}</span>` +
              `<b>${v === null ? '—' : fmt(v)}${v !== null && total ? ` <span style="font-weight:400;opacity:.7">(${((v / total) * 100).toFixed(0)}%)</span>` : ''}</b></div>`;

            return (
              `<div style="padding:8px 12px;min-width:180px;display:grid;gap:4px">` +
              `<div style="font-weight:600">ปีงบ ${DD_YEARS[i]}</div>` +
              `<div style="display:flex;justify-content:space-between;gap:8px"><span>รวม</span><b>${fmt(total)}</b></div>` +
              series.map((sr, k) => row(sr.color, sr.name, vals[k]!)).join('') +
              `</div>`
            );
          },
        },
      }),
    ...(signedColors && {
      // แกนบวก/ลบ: เส้นศูนย์ชัด ๆ + ขีดแกนน้อยลง (ช่วงค่าแคบแล้วขีดถี่จนเลขซ้ำ)
      yaxis: { tickAmount: 4, forceNiceScale: true, labels: { formatter: nullSafe(fmt) } },
      annotations: {
        yaxis: [{ y: 0, borderColor: 'var(--mui-palette-text-secondary)', strokeDashArray: 0 }],
      },
    }),
    ...(dualAxis && {
      yaxis: series.map((sr, i) => ({
        opposite: i === 1,
        title: { text: sr.name, style: { color: sr.color, fontWeight: 500 } },
        labels: { formatter: nullSafe(fmt) },
      })),
    }),
  };

  return (
    <AppReactApexCharts
      type={type}
      height={H}
      width="100%"
      options={options}
      series={series.map((s) => ({ name: s.name, data: s.data }))}
    />
  );
};

/**
 * อันดับแท่งนอน Top N — วาดเป็น HTML (ชื่อ · แท่ง · ตัวเลขท้ายแท่ง) ไม่มีแกนตัวเลข
 * อ่านค่าได้ตรงจากตัวเลขท้ายแท่ง · กดแถวเพื่อเจาะดูหลักสูตร
 */
export const TopBars = ({
  items,
  fmt,
  color,
  onPick,
  refLine,
  onBack,
}: {
  items: { key: string; label: string; value: number; color?: string }[];
  fmt: (v: number) => string;
  color: string;
  onPick?: (key: string) => void;
  /** เส้นประอ้างอิง (เช่น ค่ากลาง) พาดทุกแถว */
  refLine?: { value: number; label: string };
  /** มี = กำลังเจาะหลักสูตรอยู่ → แสดงปุ่มย้อนกลับท้ายการ์ด */
  onBack?: () => void;
}) => {
  const back = onBack && (
    <Button
      variant="outlined"
      size="small"
      startIcon={<i className="ri-arrow-go-back-line" />}
      onClick={onBack}
      sx={{ mt: 'auto', alignSelf: 'center' }}
    >
      ย้อนกลับ ดูทุกหลักสูตร
    </Button>
  );

  if (items.length === 0)
    return (
      <Box sx={{ minBlockSize: H, display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1 }}>
        <Typography color="text.secondary" sx={{ my: 'auto' }}>
          ไม่มีหลักสูตรที่เข้าเงื่อนไข
        </Typography>
        {back}
      </Box>
    );

  const max = Math.max(...items.map((i) => i.value), refLine?.value ?? 0) || 1;
  const refPct = refLine ? (refLine.value / max) * 100 : null;
  // คอลัมน์ตัวเลขกว้างเท่ากันทุกแถว — แท่งและเส้นค่ากลางจึงตรงกัน และตัวเลขไม่ถูกตัด
  const valW = `${Math.max(...items.map((i) => fmt(i.value).length)) + 1}ch`;

  return (
    <Box sx={{ minBlockSize: H, display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
      {(onPick || refLine) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, px: 1 }}>
          {onPick ? (
            <Typography
              variant="caption"
              color="primary.main"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}
            >
              <i className="ri-cursor-line" />
              กดแถวเพื่อดูในตาราง
            </Typography>
          ) : (
            <span />
          )}
          {refLine && (
            <Typography variant="caption" color="text.secondary" noWrap>
              ┆ {refLine.label}
            </Typography>
          )}
        </Box>
      )}
      {items.map((it, idx) => (
        <Box
          key={it.key}
          role={onPick ? 'button' : undefined}
          tabIndex={onPick ? 0 : undefined}
          onClick={onPick ? () => onPick(it.key) : undefined}
          onKeyDown={onPick ? (e) => e.key === 'Enter' && onPick(it.key) : undefined}
          title={onPick ? `กดเพื่อดู ${it.label} ในตาราง` : it.label}
          sx={{
            display: 'grid',
            gridTemplateColumns: `18px minmax(0, 38%) minmax(0, 1fr) ${valW}${onPick ? ' 16px' : ''}`,
            alignItems: 'center',
            gap: 1.5,
            px: 1,
            py: 0.5,
            borderRadius: 1,
            cursor: onPick ? 'pointer' : undefined,
            '&:hover, &:focus-visible': onPick
              ? { bgcolor: 'action.hover', '& .tb-label': { color: 'primary.main' }, '& .tb-go': { color: 'primary.main' } }
              : undefined,
          }}
        >
          <Typography variant="caption" color="text.disabled" className="num">
            {idx + 1}
          </Typography>
          <Typography variant="body2" noWrap className="tb-label">
            {it.label}
          </Typography>
          <Box sx={{ position: 'relative', minInlineSize: 0 }}>
            {refPct !== null && (
              <Box
                sx={{
                  position: 'absolute',
                  insetInlineStart: `${refPct}%`,
                  insetBlock: -6,
                  borderInlineStart: '2px dashed',
                  borderColor: 'text.secondary',
                  pointerEvents: 'none',
                }}
              />
            )}
            <Box
              sx={{
                inlineSize: `${Math.max((it.value / max) * 100, 1)}%`,
                blockSize: 12,
                borderRadius: 1,
                bgcolor: it.color ?? color,
              }}
            />
          </Box>
          <Typography variant="caption" fontWeight={600} className="num" noWrap sx={{ textAlign: 'end' }}>
            {fmt(it.value)}
          </Typography>
          {onPick && (
            <Box component="i" className="ri-arrow-right-s-line tb-go" sx={{ color: 'text.disabled', fontSize: 16 }} />
          )}
        </Box>
      ))}
      {back}
    </Box>
  );
};

/** โดนัทสัดส่วน */
export const Donut = ({
  items,
  fmt,
}: {
  items: { label: string; value: number; color: string }[];
  fmt: (v: number) => string;
}) => {
  const options: ApexOptions = {
    labels: items.map((i) => i.label),
    colors: items.map((i) => i.color),
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: true, formatter: (v: number) => (v >= 5 ? `${v.toFixed(0)}%` : '') },
    tooltip: { y: { formatter: fmt } },
    stroke: { width: 1 },
  };

  return (
    <AppReactApexCharts
      type="donut"
      height={H + 40}
      width="100%"
      options={options}
      series={items.map((i) => i.value)}
    />
  );
};
