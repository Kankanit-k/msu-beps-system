'use client';

import dynamic from 'next/dynamic';

import type { ApexOptions } from 'apexcharts';

import type { RevenueMode } from '@beps/calc-engine';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), {
  ssr: false,
});

const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtM = (v: number) =>
  (v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export interface ChartCase {
  mode: RevenueMode;
  q: number;
  tfc: number;
  avc: number;
  rPerHead: number;
  qStar: number | null;
}

/** สีตามกรอบกรณีในการ์ดเทียบจุดคุ้มทุน (primary / warning) */
const CASE = {
  with_government: { color: '#6d4cff', dark: '#5938e0', short: 'รวมเงินแผ่นดิน' },
  without_government: { color: '#ffb400', dark: '#b07a00', short: 'ไม่รวมเงินแผ่นดิน' },
} as const;

/**
 * กราฟเส้น TR/TC/TFC ตามจำนวนนิสิตสมมติ — กรณีรวม/ไม่รวมเงินแผ่นดินบนกราฟเดียว
 * รายได้รวมแยกเส้นตามกรณี · ต้นทุนรวม/คงที่ใช้เส้นเดียวเมื่อสองกรณีเท่ากัน
 */
const BreakEvenChart = ({ cases }: { cases: ChartCase[] }) => {
  let maxQ = 30;

  for (const c of cases) {
    maxQ = Math.max(maxQ, c.q * 1.5);
    if (c.qStar && c.qStar > 0 && Number.isFinite(c.qStar)) maxQ = Math.max(maxQ, c.qStar * 1.4);
  }

  maxQ = Math.min(maxQ, 2e5);

  const step = Math.max(1, Math.ceil(maxQ / 40));
  const points: number[] = [];

  for (let n = 0; n <= maxQ; n += step) points.push(n);

  const sameCost = cases.every((c) => c.tfc === cases[0]?.tfc && c.avc === cases[0]?.avc);
  const costCases = sameCost ? cases.slice(0, 1) : cases;
  const suffix = (c: ChartCase) => (sameCost ? '' : ` (${CASE[c.mode].short})`);

  // แกน x เป็นตัวเลขจริง (ไม่ใช่ categories) — จุดนิสิตจริง/จุดคุ้มทุนจึงวางตรงตำแหน่ง แม้ไม่ตรงช่วงจุดข้อมูล
  const lines = [
    ...cases.map((c) => ({
      name: `รายได้รวม (${CASE[c.mode].short})`,
      data: points.map((n) => [n, (n * c.rPerHead) / 1e6]),
      color: CASE[c.mode].color,
      width: 2.5,
      dash: 0,
    })),
    ...costCases.map((c) => ({
      name: `ต้นทุนรวม${suffix(c)}`,
      data: points.map((n) => [n, (c.tfc + c.avc * n) / 1e6]),
      color: '#ff4c51',
      width: 2.5,
      dash: sameCost || c.mode === 'with_government' ? 0 : 4,
    })),
    ...costCases.map((c) => ({
      name: `ต้นทุนคงที่${suffix(c)}`,
      data: points.map((n) => [n, c.tfc / 1e6]),
      color: '#8592a3',
      width: 1.5,
      dash: 6,
    })),
  ];

  const options: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false }, parentHeightOffset: 0 },
    stroke: {
      width: lines.map((l) => l.width),
      dashArray: lines.map((l) => l.dash),
      curve: 'straight',
    },
    colors: lines.map((l) => l.color),
    xaxis: {
      type: 'numeric',
      min: 0,
      max: points.at(-1),
      title: { text: 'จำนวนนิสิต (คน)' },
      labels: { formatter: (v) => fmtN(Number(v)), rotate: 0 },
      tickAmount: 8,
    },
    yaxis: {
      title: { text: 'ล้านบาท' },
      labels: { formatter: (v) => v.toLocaleString('th-TH', { maximumFractionDigits: 1 }) },
    },
    // ป้ายไม่มีกรอบ/พื้นหลัง — ApexCharts วางกล่องพื้นหลังเพี้ยนจากตัวอักษรเมื่อ legend อยู่ด้านบน
    annotations: {
      // นิสิตจริงเป็นเส้นตั้ง — สองกรณีมักใช้จำนวนเดียวกัน จึงไม่ซ้อนป้าย
      xaxis: [...new Set(cases.map((c) => c.q))].map((q) => ({
        x: q,
        borderColor: '#8592a3',
        strokeDashArray: 4,
        label: {
          text: `นิสิตจริง ${fmtN(q)} คน`,
          orientation: 'horizontal',
          textAnchor: 'start',
          offsetX: 4,
          borderWidth: 0,
          style: { background: 'transparent', color: '#4b5563', fontWeight: 700 },
        },
      })),
      points: cases.flatMap((c) =>
        c.qStar && c.qStar > 0 && c.qStar <= maxQ
          ? [
              {
                x: c.qStar,
                y: Number(((c.qStar * c.rPerHead) / 1e6).toFixed(3)),
                marker: { size: 6, fillColor: CASE[c.mode].dark, strokeColor: '#fff' },
                label: {
                  text: `คุ้มทุน (${CASE[c.mode].short}) ${fmtN(c.qStar)} คน`,
                  borderWidth: 0,
                  style: {
                    background: 'transparent',
                    color: CASE[c.mode].dark,
                    fontWeight: 700,
                  },
                },
              },
            ]
          : [],
      ),
    },
    tooltip: {
      x: { formatter: (v) => `นิสิต ${fmtN(Number(v))} คน` },
      y: { formatter: (v) => `${fmtM(v * 1e6)} ล้านบาท` },
    },
    legend: { position: 'top' },
    dataLabels: { enabled: false },
  };

  const series = lines.map(({ name, data }) => ({ name, data }));

  return <AppReactApexCharts type="line" height={300} series={series} options={options} />;
};

export default BreakEvenChart;
