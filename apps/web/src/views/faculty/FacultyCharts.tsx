'use client';

// Next Imports
import dynamic from 'next/dynamic';

// MUI Imports
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import type { ApexOptions } from 'apexcharts';
import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { BarTitle, BEPS, KPI_BAR_TRACK, kpiBarLabels, LegendItem } from '@components/ChartBits';
import InfoTip from '@components/InfoTip';
import type { ProgRow } from '@/data/mockup';
import { fmtInt, fmtMillion } from '@views/breakeven/calc';

import type { ProgStat } from './FacultyContext';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

/** สีชุดเดียวกับภาพรวมมหาวิทยาลัย (BEPS): รายได้ = ม่วงเข้ม/อ่อน · ต้นทุน = ชมพูเข้ม/อ่อน */
export const C = {
  own: BEPS.revenue.dark,
  st: BEPS.revenue.light,
  fixed: BEPS.cost.dark,
  variable: BEPS.cost.light,
};

/** สีกราฟจุดคุ้มทุน — ตามสีการ์ด KPI */
export const BE_LINE = {
  revenue: BEPS.revenue.dark,
  cost: BEPS.cost.dark,
  fixed: 'var(--mui-palette-warning-main)',
  breakEven: BEPS.breakEven,
  current: 'var(--mui-palette-primary-main)',
};

/** ชุดข้อมูลรายได้ เงินรายได้ | เงินแผ่นดิน */
export const REVENUE_SERIES = [
  { name: 'เงินรายได้', color: C.own, pick: (p: ProgRow) => p.own },
  {
    name: 'เงินแผ่นดิน',
    color: C.st,
    labelColor: BEPS.revenue.onLight,
    pick: (p: ProgRow) => p.st,
  },
];

/** ต้นทุนคงที่เกินสัดส่วนนี้ของต้นทุนรวม → เตือน (มติ spec เมนูย่อย 3.2) — ใช้ค่าเดียวทั้งระบบ */
export const FIXED_COST_ALERT = 0.5;

/** สัดส่วนต้นทุนคงที่ต่อต้นทุนรวม */
export const fixedShare = (tfc: number, tc: number) => (tc ? tfc / tc : 0);

/** ชุดข้อมูลต้นทุน คงที่ | ผันแปร — กราฟต้นทุนรายหลักสูตรใช้โทนฟ้า (เข้ม = คงที่ · อ่อน = ผันแปร) */
export const COST_SERIES = [
  { name: 'ต้นทุนคงที่', color: BEPS.compare.dark, pick: (p: ProgRow) => p.TFC },
  {
    name: 'ต้นทุนผันแปร',
    color: BEPS.compare.light,
    labelColor: BEPS.compare.onLight,
    pick: (p: ProgRow) => p.TVC,
  },
];

/** หัวกราฟ + ⓘ */
export const ChartTitle = ({ title, info }: { title: string; info?: string }) => (
  <Typography component="div" fontWeight={600} sx={{ mb: 1 }}>
    <BarTitle>
      {title} {info && <InfoTip text={info} />}
    </BarTitle>
  </Typography>
);

/** กราฟแท่งซ้อนแนวนอนรายหลักสูตร (ล้านบาท หรือ บาท/คน) — กดแท่งเพื่อดูรายละเอียด */
export const StackedProgramBar = ({
  title,
  info,
  progs,
  series,
  onPick,
  height,
  perHead,
}: {
  title: string;
  info: string;
  progs: ProgStat[];
  series: { name: string; color: string; labelColor?: string; pick: (p: ProgRow) => number }[];
  onPick: (key: string) => void;
  /** ความสูงคงที่ (หน้าภาพรวม) — ไม่ส่ง = สูงตามจำนวนหลักสูตร */
  height?: number;
  /** หารด้วยจำนวนนิสิต แสดงเป็นบาท/คน แทนล้านบาท */
  perHead?: boolean;
}) => {
  const unit = perHead ? 'บาท/คน' : 'ลบ.';
  const fmt = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: perHead ? 0 : 1 });
  const value = (v: number, p: ProgRow) =>
    perHead ? (p.Q ? Math.round(v / p.Q) : 0) : Number((v / 1e6).toFixed(2));

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      stacked: true,
      toolbar: { show: false },
      parentHeightOffset: 0,
      events: {
        dataPointSelection: (_e, _c, cfg: { dataPointIndex: number }) => {
          const hit = progs[cfg.dataPointIndex];

          if (hit) onPick(hit.key);
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '70%',
        borderRadius: 4,
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'last',
        colors: KPI_BAR_TRACK,
        // แสดงตัวเลขครบทุกแท่ง แม้แท่งสั้น
        dataLabels: { hideOverflowingLabels: false },
      },
    },
    colors: series.map((s) => s.color),
    fill: { opacity: 1 },
    // ตัวเลขขาวบนสีเข้ม / สีเข้มบนสีอ่อน แบบภาพรวมมหาวิทยาลัย
    dataLabels: {
      ...kpiBarLabels(0),
      formatter: (v: number) => (v > 0 ? fmt(v) : ''),
      style: {
        fontSize: '10px',
        fontWeight: 700,
        colors: series.map((s) => s.labelColor ?? '#fff'),
      },
    },
    legend: { show: false },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: progs.map((x) => x.label),
      title: { text: perHead ? 'บาท ต่อนิสิต 1 คน' : 'ล้านบาท' },
      labels: { formatter: (v: string) => fmt(Number(v)) },
    },
    yaxis: { labels: { maxWidth: 260, style: { fontSize: '12px' } } },
    // จอแคบ: ป้ายชื่อหลักสูตรกินที่จนแท่งเหลือนิดเดียว — ตัดป้ายให้สั้นลง
    responsive: [
      {
        breakpoint: 600,
        options: { yaxis: { labels: { maxWidth: 110, style: { fontSize: '10px' } } } },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (v: number) =>
          `${v.toLocaleString('th-TH', perHead ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unit}`,
      },
    },
  };

  return (
    <Box>
      <ChartTitle title={title} info={info} />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 1 }}>
        {series.map((s) => (
          <LegendItem key={s.name} color={s.color} label={s.name} />
        ))}
      </Box>
      <AppReactApexCharts
        type="bar"
        height={height ?? Math.max(240, progs.length * 21 + 60)}
        width="100%"
        options={options}
        series={series.map((s) => ({
          name: s.name,
          data: progs.map((x) => value(s.pick(x.p), x.p)),
        }))}
      />
    </Box>
  );
};

/** โดนัทต้นทุนคงที่ | ผันแปร + ยอดและสัดส่วน */
export const CostDonut = ({
  tfc,
  tvc,
  title = 'โครงสร้างต้นทุนรวมของคณะ',
  height = 220,
}: {
  tfc: number;
  tvc: number;
  title?: string;
  height?: number;
}) => {
  const total = tfc + tvc;
  const options: ApexOptions = {
    chart: { type: 'donut' },
    labels: ['ต้นทุนคงที่', 'ต้นทุนผันแปร'],
    colors: [C.fixed, C.variable],
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 3, colors: ['var(--mui-palette-background-paper)'] },
    plotOptions: { pie: { donut: { size: '62%' } } },
    tooltip: {
      y: {
        formatter: (v: number) => `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ.`,
      },
    },
  };

  return (
    <Box>
      <ChartTitle title={title} />
      <AppReactApexCharts
        type="donut"
        height={height}
        width="100%"
        options={options}
        series={[Number((tfc / 1e6).toFixed(2)), Number((tvc / 1e6).toFixed(2))]}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
        {[
          { label: 'ต้นทุนคงที่', v: tfc, c: C.fixed },
          { label: 'ต้นทุนผันแปร', v: tvc, c: C.variable },
        ].map((x) => (
          <Box key={x.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <LegendItem color={x.c} label={x.label} />
            <Typography variant="body2" fontWeight={700} className="num">
              {fmtMillion(x.v)} ลบ.{' '}
              <Typography component="span" variant="caption" color="text.secondary">
                {total ? ((x.v / total) * 100).toFixed(0) : 0}%
              </Typography>
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/** สีเส้นจุดคุ้มทุน 2 กรณีในกราฟเป้าหมาย vs นิสิตจริง */
const GOAL = { gov: BEPS.profit, own: BEPS.revenue.dark };

/** ป้ายสถานะนิสิตจริงเทียบจุดคุ้มทุน */
export const targetStatus = (q: number, target: number) =>
  target <= 0
    ? { text: 'ไม่มีจุดคุ้มทุน', tone: 'none' as const }
    : q >= target
      ? { text: q === target ? 'ถึงแล้ว' : `เกิน ${fmtInt(q - target)} คน`, tone: 'ok' as const }
      : { text: `ขาดอีก ${fmtInt(target - q)} คน`, tone: 'short' as const };

const TONE_COLOR = {
  ok: BEPS.breakEven,
  short: BEPS.cost.dark,
  none: 'var(--mui-palette-text-disabled)',
};

/**
 * เป้าหมาย vs นิสิตจริง — แท่ง = นิสิตจริง · ขีดตั้ง 2 เส้น = จุดคุ้มทุน รวม / ไม่รวมเงินแผ่นดิน
 * สีแท่งตามโหมดที่เลือก: teal = ถึงจุดคุ้มทุนแล้ว · ชมพู = ยังขาด · เทา = ไม่มีจุดคุ้มทุน
 */
export const TargetVsActualChart = ({
  progs,
  mode,
  onPick,
  height,
}: {
  progs: ProgStat[];
  mode: RevenueMode;
  onPick: (key: string) => void;
  height?: number;
}) => {
  const targetOf = (x: ProgStat) => (mode === 'with_government' ? x.qStarGov : x.qStarOwn);

  // แกนพอดีกับนิสิตจริงและจุดคุ้มทุนของฐานที่เลือก — เส้นของอีกฐานที่ยาวเกินขอบแสดงเป็นป้าย ▸ แทน
  // (ถ้าครอบทุกเส้น จุดคุ้มทุนแบบไม่รวมแผ่นดินดันแกนยาวจนแท่งกองอยู่ซ้าย)
  const xmax = Math.max(1, ...progs.flatMap((x) => [x.p.Q, targetOf(x)])) * 1.1;

  const goal = (name: string, value: number, color: string, dashed: boolean) =>
    value > 0 && value <= xmax
      ? [
          {
            name,
            value,
            strokeColor: color,
            strokeWidth: 3,
            strokeHeight: 14,
            ...(dashed ? { strokeDashArray: 3 } : {}),
          },
        ]
      : [];

  /** ป้ายเส้นที่เกินขอบกราฟ เช่น "┊ 1,573 ▸" */
  const overflow = (x: ProgStat) =>
    [
      x.qStarGov > xmax ? `| ${fmtInt(x.qStarGov)} ▸` : '',
      x.qStarOwn > xmax ? `┊ ${fmtInt(x.qStarOwn)} ▸` : '',
    ]
      .filter(Boolean)
      .join('  ');

  const hasOverflow = progs.some((x) => overflow(x));

  const data = progs.map((x) => ({
    x: x.label,
    y: x.p.Q,
    fillColor: TONE_COLOR[targetStatus(x.p.Q, targetOf(x)).tone],
    goals: [
      ...goal('จุดคุ้มทุน · รวมเงินแผ่นดิน', x.qStarGov, GOAL.gov, false),
      ...goal('จุดคุ้มทุน · ไม่รวมเงินแผ่นดิน', x.qStarOwn, GOAL.own, true),
    ],
  }));

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      parentHeightOffset: 0,
      events: {
        dataPointSelection: (_e, _c, cfg: { dataPointIndex: number }) => {
          const hit = progs[cfg.dataPointIndex];

          if (hit) onPick(hit.key);
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '60%',
        borderRadius: 4,
        colors: KPI_BAR_TRACK,
        dataLabels: { position: 'top' },
      },
    },
    // ป้ายต่อท้ายแท่ง เฉพาะหลักสูตรที่เส้นจุดคุ้มทุนยาวเกินขอบกราฟ
    dataLabels: {
      enabled: hasOverflow,
      textAnchor: 'start',
      offsetX: 6,
      formatter: (_v: number, o: { dataPointIndex: number }) => {
        const x = progs[o.dataPointIndex];

        return x ? overflow(x) : '';
      },
      style: { fontSize: '11px', fontWeight: 600, colors: [GOAL.own] },
      background: { enabled: false },
    },
    legend: { show: false },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    xaxis: {
      min: 0,
      max: xmax,
      title: { text: 'คน' },
      labels: { formatter: (v: string) => fmtInt(Number(v)) },
    },
    yaxis: { labels: { maxWidth: 220, style: { fontSize: '12px' } } },
    responsive: [
      {
        breakpoint: 600,
        options: { yaxis: { labels: { maxWidth: 110, style: { fontSize: '10px' } } } },
      },
    ],
    tooltip: {
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        const x = progs[dataPointIndex];

        if (!x) return '';
        const st = targetStatus(x.p.Q, targetOf(x));
        const be = (v: number) => (v > 0 ? `${fmtInt(v)} คน` : 'ไม่มี');

        return `<div style="padding:8px 10px;font-size:12px;line-height:1.6">
          <b>${x.label}</b><br/>
          นิสิตจริง ${fmtInt(x.p.Q)} คน<br/>
          จุดคุ้มทุน รวมเงินแผ่นดิน ${be(x.qStarGov)}<br/>
          จุดคุ้มทุน ไม่รวมเงินแผ่นดิน ${be(x.qStarOwn)}<br/>
          <b style="color:${TONE_COLOR[st.tone]}">${st.text}</b>
        </div>`;
      },
    },
  };

  return (
    <Box>
      <ChartTitle
        title={`เป้าหมาย vs นิสิตจริง${progs[0] ? ` — ${progs[0].p.lvl}` : ''}`}
        info="แท่ง = นิสิตจริง · ขีดทึบ = จุดคุ้มทุนแบบรวมเงินแผ่นดิน · ขีดประ = แบบไม่รวมเงินแผ่นดิน · สีแท่งและความยาวแกนตามฐานรายได้ที่เลือกด้านบน · ▸ = เส้นยาวเกินขอบกราฟ ตัวเลขคือจำนวนคนที่ต้องมี · กดแท่งเพื่อดูรายละเอียดหลักสูตร"
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 0.5, mb: 1 }}>
        <LegendItem color={TONE_COLOR.ok} label="ถึงจุดคุ้มทุน" />
        <LegendItem color={TONE_COLOR.short} label="ยังขาด" />
        <LegendItem color={GOAL.gov} label="| รวมเงินแผ่นดิน" />
        <LegendItem color={GOAL.own} label="┊ ไม่รวมเงินแผ่นดิน" />
        {hasOverflow && <LegendItem color={GOAL.own} label="▸ เกินขอบกราฟ" />}
      </Box>
      <AppReactApexCharts
        type="bar"
        height={height ?? Math.max(240, progs.length * 24 + 60)}
        width="100%"
        options={options}
        series={[{ name: 'นิสิตจริง', data }]}
      />
    </Box>
  );
};
