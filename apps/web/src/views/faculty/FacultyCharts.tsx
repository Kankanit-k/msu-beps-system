'use client';

// Next Imports
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import type { ApexOptions } from 'apexcharts';
import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { BarTitle, BEPS, KPI_BAR_TRACK, kpiBarLabels, LegendItem } from '@components/ChartBits';
import InfoTip from '@components/InfoTip';
import type { ProgRow } from '@/data/mockup';
import { fmtInt, fmtMillion, REVENUE_MODE_LABEL } from '@views/breakeven/calc';
import { composeCost, PART_COLORS, PART_SHORT } from '@views/cost/costParts';

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

/** ป้ายแกนสีจาง ขนาดเล็ก — แบบกราฟ ①②③ ภาพรวมมหาวิทยาลัย */
const AXIS_TITLE_STYLE = {
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--mui-palette-text-secondary)',
};

/**
 * กราฟแท่งซ้อนแนวนอนรายหลักสูตร (ล้านบาท หรือ บาท/คน) — กดแท่งเพื่อดูรายละเอียด
 * หน้าตาเดียวกับกราฟ ①②③ ภาพรวมมหาวิทยาลัย: แถวละ 24px · แท่ง 74% · ตัวเลขซ่อนเมื่อแท่งสั้นเกินอ่าน
 */
export const StackedProgramBar = ({
  title,
  sub,
  info,
  progs,
  series,
  onPick,
  height,
  perHead,
}: {
  title: string;
  /** คำอธิบายสั้นใต้ชื่อกราฟ เช่น "ทั้งแท่ง = รวมเงินแผ่นดิน · ส่วนม่วงเข้ม = ไม่รวม" */
  sub?: string;
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
  // แท่งสั้นเกินกว่าตัวเลขจะพอดี (ล้านบาท < 6% · บาท/คน ซึ่งเลขยาวกว่า < 15% ของแท่งยาวสุด) — ซ่อนไว้ ชี้ดูใน tooltip แทน
  const maxTotal = Math.max(
    0,
    ...progs.map((x) => series.reduce((a, s) => a + value(s.pick(x.p), x.p), 0)),
  );
  const minLabel = maxTotal * (perHead ? 0.15 : 0.06);

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
        barHeight: '74%',
        borderRadius: 4,
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'last',
        colors: KPI_BAR_TRACK,
      },
    },
    colors: series.map((s) => s.color),
    fill: { opacity: 1 },
    // ตัวเลขขาวบนสีเข้ม / สีเข้มบนสีอ่อน แบบภาพรวมมหาวิทยาลัย
    dataLabels: {
      ...kpiBarLabels(0),
      formatter: (v: number) => (v > 0 && v >= minLabel ? fmt(v) : ''),
      style: {
        fontSize: '10px',
        fontWeight: 700,
        colors: series.map((s) => s.labelColor ?? '#fff'),
      },
    },
    legend: { show: false },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      padding: { top: -10, bottom: -4 },
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: progs.map((x) => x.label),
      // บาท/คน ตัวเลขยาว — จำกัดจำนวนเส้นแกนไม่ให้ป้ายชนกัน
      ...(perHead && { tickAmount: 4 }),
      title: { text: perHead ? 'บาท ต่อนิสิต 1 คน' : 'ล้านบาท', style: AXIS_TITLE_STYLE },
      labels: { formatter: (v: string) => fmt(Number(v)), style: { fontSize: '11px' } },
    },
    yaxis: {
      labels: { maxWidth: 190, style: { fontSize: '11px' } },
      title: { text: 'หลักสูตร', style: AXIS_TITLE_STYLE },
    },
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
      {sub && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: -1, mb: 1 }}>
          {sub}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 1, mb: 1 }}>
        {series.map((s) => (
          <LegendItem key={s.name} color={s.color} label={s.name} />
        ))}
      </Box>
      <AppReactApexCharts
        type="bar"
        height={height ?? Math.max(240, progs.length * 24 + 60)}
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

/**
 * โดนัทโครงสร้างต้นทุน — แท็บ คงที่/ผันแปร | องค์ประกอบ (แบบการ์ด ④ ภาพรวมมหาวิทยาลัย)
 * ส่ง progs = เปิดแท็บองค์ประกอบ (รวบจากรายหลักสูตรด้วย composeCost) · ไม่ส่ง = คงที่/ผันแปรอย่างเดียว
 */
export const CostDonut = ({
  tfc,
  tvc,
  progs,
  title = 'โครงสร้างต้นทุนรวมของคณะ',
  height = 220,
}: {
  tfc: number;
  tvc: number;
  progs?: readonly ProgRow[];
  title?: string;
  height?: number;
}) => {
  const [view, setView] = useState<'fv' | 'parts'>('fv');
  const composition = useMemo(() => (progs ? composeCost(progs) : null), [progs]);
  const showParts = view === 'parts' && composition !== null;

  const items = showParts
    ? composition.parts
        .filter((p) => p.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .map((p, i) => ({
          key: p.key,
          label: PART_SHORT[p.key] ?? p.label,
          hint: `${p.label} · ที่มา: ${p.source}`,
          v: p.amount,
          c: PART_COLORS[i % PART_COLORS.length]!,
        }))
    : [
        { key: 'tfc', label: 'ต้นทุนคงที่', hint: undefined, v: tfc, c: C.fixed },
        { key: 'tvc', label: 'ต้นทุนผันแปร', hint: undefined, v: tvc, c: C.variable },
      ];
  const total = items.reduce((a, x) => a + x.v, 0);

  const options: ApexOptions = {
    chart: { type: 'donut' },
    labels: items.map((x) => x.label),
    colors: items.map((x) => x.c),
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
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ChartTitle title={title} />
        </Box>
        {composition && (
          <ToggleButtonGroup
            size="small"
            exclusive
            color="primary"
            value={view}
            onChange={(_, v: 'fv' | 'parts' | null) => v && setView(v)}
            sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.25, fontSize: '0.75rem' } }}
          >
            <ToggleButton value="fv">คงที่/ผันแปร</ToggleButton>
            <ToggleButton value="parts">องค์ประกอบ</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>
      {showParts && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: -1, mb: 1 }}>
          แยกองค์ประกอบ {items.length} หมวด · ล้านบาท
        </Typography>
      )}
      <AppReactApexCharts
        key={view}
        type="donut"
        height={height}
        width="100%"
        options={options}
        series={items.map((x) => Number((x.v / 1e6).toFixed(2)))}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: showParts ? 0.5 : 1, mt: 2 }}>
        {items.map((x) => (
          <Box
            key={x.key}
            title={x.hint}
            sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
          >
            <LegendItem color={x.c} label={x.label} />
            <Typography
              variant="body2"
              fontWeight={700}
              className="num"
              sx={{ whiteSpace: 'nowrap' }}
            >
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
 * เป้าหมาย vs นิสิตจริง — 1 แถวต่อหลักสูตร · แถบ = นิสิตจริงคิดเป็นกี่ % ของจุดคุ้มทุน (เต็มแถบ = ถึงเป้า)
 * วัดเป็น % เพื่อให้หลักสูตรเล็กกับใหญ่เทียบกันได้ · ใช้จุดคุ้มทุนของฐานรายได้ที่เลือกด้านบนอย่างเดียว
 * เรียงจากห่างเป้ามากสุด → ถึงเป้า · หลักสูตรที่ไม่มีจุดคุ้มทุนอยู่ท้าย
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
  const rows = useMemo(
    () =>
      progs
        .map((x) => {
          const target = mode === 'with_government' ? x.qStarGov : x.qStarOwn;

          return { x, target, ratio: target > 0 ? x.p.Q / target : Infinity };
        })
        .sort((a, b) => a.ratio - b.ratio),
    [progs, mode],
  );

  const level = progs[0]
    ? new Set(progs.map((x) => x.p.lvl)).size > 1
      ? 'ทุกระดับ'
      : progs[0].p.lvl
    : '';

  return (
    <Box>
      <ChartTitle
        title={`นิสิตจริงเทียบจุดคุ้มทุน${level ? ` — ${level}` : ''}`}
        info={`แถบเต็ม = นิสิตจริงถึงจำนวนที่ต้องมี ณ จุดคุ้มทุนแล้ว · ตัวเลขขวา = มีกี่คน / ต้องมีกี่คน · ${REVENUE_MODE_LABEL[mode]} (เปลี่ยนที่ฐานรายได้ด้านบน) · กดแถวเพื่อดูรายละเอียดหลักสูตร`}
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 0.5, mb: 1.5 }}>
        <LegendItem
          color={TONE_COLOR.ok}
          label={`ถึงจุดคุ้มทุนแล้ว ${rows.filter((r) => r.ratio !== Infinity && r.ratio >= 1).length}`}
        />
        <LegendItem
          color={TONE_COLOR.short}
          label={`ยังไม่ถึง ${rows.filter((r) => r.ratio < 1).length}`}
        />
        <Typography variant="caption" color="text.secondary">
          · {REVENUE_MODE_LABEL[mode]}
        </Typography>
      </Box>
      <Box sx={{ maxBlockSize: height, overflowY: 'auto', pr: 0.5 }}>
        {rows.map(({ x, target, ratio }) => {
          const st = targetStatus(x.p.Q, target);
          const color = TONE_COLOR[st.tone];
          const pctText = st.tone === 'none' ? '—' : `${Math.round(ratio * 100)}%`;

          return (
            <Box
              key={x.key}
              role="button"
              tabIndex={0}
              onClick={() => onPick(x.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPick(x.key);
                }
              }}
              title={x.p.prog}
              sx={{
                py: 0.75,
                px: 1,
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {/* บรรทัดบน: ชื่อหลักสูตร ·· มีกี่คน / ต้องมีกี่คน */}
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                <Typography variant="body2" noWrap sx={{ flex: 1, minInlineSize: 0 }}>
                  {x.label}
                </Typography>
                <Typography variant="caption" className="num" color="text.secondary" noWrap>
                  มี <b>{fmtInt(x.p.Q)}</b>
                  {target > 0 && <> / ต้องมี {fmtInt(target)}</>} คน
                </Typography>
              </Box>
              {/* บรรทัดล่าง: แถบ % ถึงเป้า ·· % + สถานะ */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                <Box
                  sx={{
                    flex: 1,
                    blockSize: 10,
                    borderRadius: 5,
                    bgcolor: BEPS.track,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      inlineSize: `${st.tone === 'none' ? 0 : Math.min(100, ratio * 100)}%`,
                      blockSize: '100%',
                      borderRadius: 5,
                      bgcolor: color,
                    }}
                  />
                </Box>
                <Typography
                  variant="caption"
                  className="num"
                  noWrap
                  sx={{ color, fontWeight: 700, minInlineSize: 128, textAlign: 'end' }}
                >
                  {pctText} · {st.text}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
