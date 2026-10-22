'use client';

// Next Imports
import dynamic from 'next/dynamic';

// MUI Imports
import Box from '@mui/material/Box';

import type { ApexOptions } from 'apexcharts';
import type { BreakEvenResult } from '@beps/calc-engine';

// Component Imports
import { LegendItem } from '@components/ChartBits';

import { fmtInt } from './calc';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

/** แผนภาพจุดคุ้มทุน — เส้นรายได้รวม/ต้นทุนรวม/ต้นทุนคงที่ ตามจำนวนนิสิต + จุดคุ้มทุนและจุดปัจจุบัน */
const BreakEvenLineChart = ({
  res,
  q,
  height = 380,
}: {
  res: BreakEvenResult;
  q: number;
  height?: number;
}) => {
  const r = res.r ?? 0;
  const avc = res.avc ?? 0;
  const tfc = res.tfc;
  const qStar = res.qStar;
  const xmax = Math.max(q, qStar ?? 0) * 1.35 || 100;

  const options: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false }, parentHeightOffset: 0 },
    colors: [
      'var(--mui-palette-primary-main)',
      'var(--mui-palette-error-main)',
      'var(--mui-palette-warning-main)',
      'var(--mui-palette-success-main)',
      'var(--mui-palette-text-primary)',
    ],
    stroke: { width: [2.5, 2.5, 1.5, 0, 0], dashArray: [0, 0, 6, 0, 0], curve: 'straight' },
    markers: { size: [0, 0, 0, 7, 7], strokeWidth: 2 },
    legend: { show: false },
    grid: { borderColor: 'var(--mui-palette-divider)' },
    xaxis: { type: 'numeric', min: 0, max: xmax, title: { text: 'จำนวนนิสิต (คน)' } },
    yaxis: {
      title: { text: 'มูลค่า (ล้านบาท)' },
      labels: {
        formatter: (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 1 }),
      },
    },
    tooltip: {
      x: { formatter: (v: number) => `นิสิต ${fmtInt(v)} คน` },
      y: {
        formatter: (v: number) => `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ.`,
      },
    },
  };

  const series = [
    {
      name: 'รายได้รวม',
      type: 'line',
      data: [
        [0, 0],
        [xmax, (r * xmax) / 1e6],
      ],
    },
    {
      name: 'ต้นทุนรวม',
      type: 'line',
      data: [
        [0, tfc / 1e6],
        [xmax, (tfc + avc * xmax) / 1e6],
      ],
    },
    {
      name: 'ต้นทุนคงที่',
      type: 'line',
      data: [
        [0, tfc / 1e6],
        [xmax, tfc / 1e6],
      ],
    },
    {
      name: 'จุดคุ้มทุน',
      type: 'scatter',
      data: qStar !== null ? [[qStar, (r * qStar) / 1e6]] : [],
    },
    { name: 'ปัจจุบัน', type: 'scatter', data: [[q, (r * q) / 1e6]] },
  ];

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 2 }}>
        <LegendItem color="primary.main" label="รายได้รวม" />
        <LegendItem color="error.main" label="ต้นทุนรวม" />
        <LegendItem color="warning.main" label="ต้นทุนคงที่" />
        <LegendItem color="success.main" label="จุดคุ้มทุน" />
        <LegendItem color="text.primary" label="จุดปัจจุบัน" />
      </Box>
      <AppReactApexCharts
        type="line"
        height={height}
        width="100%"
        options={options}
        series={series}
      />
    </>
  );
};

export default BreakEvenLineChart;
