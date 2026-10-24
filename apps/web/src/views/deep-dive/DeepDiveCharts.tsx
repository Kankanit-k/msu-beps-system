'use client';

// Next Imports
import dynamic from 'next/dynamic';

// React Imports
import type { ReactNode } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { ApexOptions } from 'apexcharts';

// Component Imports
import { BarTitle, LegendItem } from '@components/ChartBits';
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

const baseOptions = (fmt: (v: number) => string): ApexOptions => ({
  chart: { toolbar: { show: false }, zoom: { enabled: false }, parentHeightOffset: 0 },
  legend: { show: false },
  dataLabels: { enabled: false },
  grid: { borderColor: 'var(--mui-palette-divider)' },
  xaxis: { categories: DD_YEARS.map(String) },
  yaxis: { labels: { formatter: fmt } },
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
}: {
  type: 'line' | 'bar';
  series: { name: string; color: string; data: Series }[];
  fmt: (v: number) => string;
  stacked?: boolean;
  /** แท่งบวกเขียว/ลบแดง (ชุดเดียว) */
  signedColors?: boolean;
  /** สองชุดคนละหน่วย — ชุดที่ 2 ใช้แกนขวา */
  dualAxis?: boolean;
}) => {
  const options: ApexOptions = {
    ...baseOptions(fmt),
    chart: { ...baseOptions(fmt).chart, stacked },
    colors: signedColors
      ? [
          ({ value }: { value: number }) =>
            value < 0 ? 'var(--mui-palette-error-main)' : 'var(--mui-palette-success-main)',
        ]
      : series.map((s) => s.color),
    stroke: type === 'line' ? { width: 3, curve: 'straight' } : { width: 0 },
    markers: { size: type === 'line' ? 5 : 0 },
    plotOptions: { bar: { columnWidth: '45%', borderRadius: 4 } },
    ...(dualAxis && {
      yaxis: series.map((sr, i) => ({
        opposite: i === 1,
        title: { text: sr.name, style: { color: sr.color, fontWeight: 500 } },
        labels: { formatter: fmt },
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

/** อันดับแท่งนอน Top N — กดแท่งเพื่อเจาะดูหลักสูตร */
export const TopBars = ({
  items,
  fmt,
  color,
  onPick,
}: {
  items: { key: string; label: string; value: number; color?: string }[];
  fmt: (v: number) => string;
  color: string;
  onPick?: (key: string) => void;
}) => {
  if (items.length === 0)
    return (
      <Box sx={{ blockSize: H, display: 'grid', placeItems: 'center' }}>
        <Typography color="text.secondary">ไม่มีหลักสูตรที่เข้าเงื่อนไข</Typography>
      </Box>
    );

  const options: ApexOptions = {
    chart: {
      toolbar: { show: false },
      parentHeightOffset: 0,
      events: {
        dataPointSelection: (_e, _c, cfg: { dataPointIndex: number }) => {
          const it = items[cfg.dataPointIndex];

          if (it && onPick) onPick(it.key);
        },
      },
    },
    plotOptions: {
      bar: { horizontal: true, barHeight: '60%', borderRadius: 3, distributed: true },
    },
    colors: items.map((i) => i.color ?? color),
    legend: { show: false },
    dataLabels: { enabled: false },
    grid: { borderColor: 'var(--mui-palette-divider)' },
    xaxis: {
      tickAmount: 4,
      categories: items.map((i) => (i.label.length > 26 ? `${i.label.slice(0, 25)}…` : i.label)),
      labels: { formatter: (v: string) => fmt(Number(v)) },
    },
    tooltip: {
      y: { formatter: (v: number) => fmt(v) },
      x: {
        formatter: (_v: number, o?: { dataPointIndex: number }) =>
          items[o?.dataPointIndex ?? 0]?.label ?? '',
      },
    },
    states: { active: { filter: { type: 'none' } } },
  };

  return (
    <Box sx={{ cursor: onPick ? 'pointer' : undefined }}>
      <AppReactApexCharts
        type="bar"
        height={H}
        width="100%"
        options={options}
        series={[{ name: '', data: items.map((i) => i.value) }]}
      />
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
