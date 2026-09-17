'use client';

import dynamic from 'next/dynamic';

import type { ApexOptions } from 'apexcharts';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false });

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtM = (v: number) => (v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

interface Props {
  q: number;
  tfc: number;
  avc: number;
  rPerHead: number;
  qStar: number | null;
}

/** กราฟเส้น TR/TC/TFC ตามจำนวนนิสิตสมมติ พร้อมจุด Q* และ Q จริง — พอร์ตจาก pgLine() ใน page-scenario-program.js */
const BreakEvenChart = ({ q, tfc, avc, rPerHead, qStar }: Props) => {
  let maxQ = Math.max(q * 1.5, 30);

  if (qStar && qStar > 0 && Number.isFinite(qStar)) maxQ = Math.max(maxQ, qStar * 1.4);
  maxQ = Math.min(maxQ, 2e5);

  const step = Math.max(1, Math.ceil(maxQ / 40));
  const points: number[] = [];

  for (let n = 0; n <= maxQ; n += step) points.push(n);

  const trSeries = points.map((n) => Number((n * rPerHead) / 1e6));
  const tcSeries = points.map((n) => Number((tfc + avc * n) / 1e6));
  const tfcSeries = points.map(() => Number(tfc / 1e6));

  const options: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false }, parentHeightOffset: 0 },
    stroke: { width: [2.5, 2.5, 1.5], dashArray: [0, 0, 6], curve: 'straight' },
    colors: ['#6d4cff', '#ff4c51', '#ffb400'],
    xaxis: {
      categories: points,
      title: { text: 'จำนวนนิสิต (คน)' },
      labels: { formatter: (v) => fmtN(Number(v)), rotate: 0 },
      tickAmount: 8,
    },
    yaxis: { title: { text: 'ล้านบาท' }, labels: { formatter: (v) => `${fmtM(v * 1e6)}ล.` } },
    annotations: {
      points: [
        {
          x: q,
          y: Number(((q * rPerHead) / 1e6).toFixed(3)),
          marker: { size: 6, fillColor: '#ffb400', strokeColor: '#fff' },
          label: { text: `นิสิตจริง ${fmtN(q)}`, style: { background: '#ffb400', color: '#fff' } },
        },
        ...(qStar && qStar > 0 && qStar <= maxQ
          ? [
              {
                x: qStar,
                y: Number(((qStar * rPerHead) / 1e6).toFixed(3)),
                marker: { size: 6, fillColor: '#5938e0', strokeColor: '#fff' },
                label: { text: `Q*=${fmtN(qStar)}`, style: { background: '#5938e0', color: '#fff' } },
              },
            ]
          : []),
      ],
    },
    tooltip: {
      x: { formatter: (v) => `นิสิต ${fmtN(Number(v))} คน` },
      y: { formatter: (v) => `${fmtM(v * 1e6)} ล.` },
    },
    legend: { position: 'top' },
    dataLabels: { enabled: false },
  };

  const series = [
    { name: 'TR', data: trSeries },
    { name: 'TC', data: tcSeries },
    { name: 'TFC', data: tfcSeries },
  ];

  return <AppReactApexCharts type="line" height={280} series={series} options={options} />;
};

export default BreakEvenChart;
