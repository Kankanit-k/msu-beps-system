'use client';

// Next Imports
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import type { ApexOptions } from 'apexcharts';
import type { ReactNode } from 'react';
import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { BarTitle, BEPS, KPI_BAR_TRACK, kpiBarLabels, LegendItem } from '@components/ChartBits';
import InfoTip from '@components/InfoTip';
import type { ProgRow } from '@/data/mockup';
import { fmtInt, fmtMillion, REVENUE_MODE_LABEL } from '@views/breakeven/calc';
import { composeCost, PART_COLORS, PART_SHORT } from '@views/cost/costParts';

import type { ProgStat } from './FacultyContext';
import { programSubtitle } from '@/utils/programName';

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
  tooltipTitle,
  fill,
  action,
}: {
  title: string;
  /** คำอธิบายสั้นใต้ชื่อกราฟ เช่น "ทั้งแท่ง = รวมเงินแผ่นดิน · ส่วนม่วงเข้ม = ไม่รวม" */
  sub?: string;
  info: string;
  progs: ProgStat[];
  /** group ต่างกัน = แท่งคู่ต่อหลักสูตร (เช่น รายได้ บน · ต้นทุน ล่าง) — ไม่ส่ง = แท่งเดียวซ้อนทุก series */
  series: {
    name: string;
    color: string;
    labelColor?: string;
    group?: string;
    pick: (p: ProgRow) => number;
  }[];
  onPick: (key: string) => void;
  /** ความสูงคงที่ (หน้าภาพรวม) — ไม่ส่ง = สูงตามจำนวนหลักสูตร */
  height?: number;
  /** หารด้วยจำนวนนิสิต แสดงเป็นบาท/คน แทนล้านบาท */
  perHead?: boolean;
  /** หัว tooltip ของหลักสูตร (ไม่ส่ง = ชื่อหลักสูตร) */
  tooltipTitle?: (x: ProgStat) => string;
  /** ยืดกราฟเต็มความสูงที่เหลือของการ์ด (การ์ดข้างเคียงสูงกว่า) — height = ความสูงขั้นต่ำ */
  fill?: boolean;
  /** ปุ่ม/ตัวเลือกชิดขวาของหัวกราฟ */
  action?: ReactNode;
}) => {
  const natural = height ?? Math.max(240, progs.length * 24 + 60);
  // fill: วัดกล่องที่ยืดตามการ์ด — กราฟวางแบบ absolute จึงไม่ดันกล่องให้สูงตามตัวเอง (ไม่วนลูป)
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxH, setBoxH] = useState(0);

  useEffect(() => {
    const el = boxRef.current;

    if (!fill || !el) return;
    const ro = new ResizeObserver(([e]) => setBoxH(Math.floor(e!.contentRect.height)));

    ro.observe(el);

    return () => ro.disconnect();
  }, [fill]);
  // ยืดตามการ์ดได้ไม่เกิน 72px/หลักสูตร — หลักสูตรน้อยแล้วแถวไม่ห่างจนโหรง
  const chartH = fill ? Math.max(natural, Math.min(boxH, progs.length * 72 + 80)) : natural;
  // แท่งคู่หนาไม่เกิน ~36px ต่อหลักสูตร — กราฟยืดสูงแล้วแท่งไม่อ้วนเกิน แค่ห่างกันขึ้น
  const rowPx = progs.length ? (chartH - 60) / progs.length : 1;
  const unit = perHead ? 'บาท/คน' : 'ลบ.';
  const fmt = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: perHead ? 0 : 1 });
  const value = (v: number, p: ProgRow) =>
    perHead ? (p.Q ? Math.round(v / p.Q) : 0) : Number((v / 1e6).toFixed(2));
  // แท่งสั้นเกินกว่าตัวเลขจะพอดี (ล้านบาท < 6% · บาท/คน ซึ่งเลขยาวกว่า < 15% ของแท่งยาวสุด) — ซ่อนไว้ ชี้ดูใน tooltip แทน
  // แท่งคู่: วัดจากแท่งที่ยาวสุดของแต่ละกลุ่ม (ไม่ใช่ผลรวมทุก series)
  const groups = [...new Set(series.map((s) => s.group ?? ''))];
  const barPct = Math.min(groups.length > 1 ? 84 : 74, Math.round((36 / rowPx) * 100));
  const maxTotal = Math.max(
    0,
    ...progs.flatMap((x) =>
      groups.map((g) =>
        series
          .filter((s) => (s.group ?? '') === g)
          .reduce((a, s) => a + value(s.pick(x.p), x.p), 0),
      ),
    ),
  );
  const minLabel = maxTotal * (perHead ? 0.15 : 0.06);

  // แท่งคู่ปัดมุมทุกช่วง ('all') แล้วเปลี่ยนช่วงด้านในกลับเป็นสี่เหลี่ยม → โค้งเฉพาะปลายขวาสุดของแต่ละแท่ง
  // ช่วงด้านใน = ไม่ใช่ series สุดท้ายที่มีค่า > 0 ในกลุ่มเดียวกันของหลักสูตรนั้น
  const squareInnerEnds = (ctx: { el?: HTMLElement }) => {
    if (groups.length < 2 || !ctx.el) return;
    ctx.el.querySelectorAll<SVGPathElement>('path.apexcharts-bar-area').forEach((el) => {
      const i = Number(el.getAttribute('index'));
      const j = Number(el.getAttribute('j'));
      const x = progs[j];

      if (!x || !series[i]) return;
      const g = series[i].group ?? '';
      const lastInGroup = series.reduce(
        (last, sr, k) => ((sr.group ?? '') === g && value(sr.pick(x.p), x.p) > 0 ? k : last),
        -1,
      );

      if (i === lastInGroup) return;
      const b = el.getBBox();

      if (b.width > 0) el.setAttribute('d', `M${b.x} ${b.y}h${b.width}v${b.height}h${-b.width}Z`);
    });
  };

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      stacked: true,
      toolbar: { show: false },
      parentHeightOffset: 0,
      // แท่งคู่: ปิดแอนิเมชัน — Apex ทยอยวาดทีละแท่ง ทำให้ squareInnerEnds ทำงานก่อนแท่งท้ายๆ วาดเสร็จ
      ...(groups.length > 1 && { animations: { enabled: false } }),
      events: {
        dataPointSelection: (_e, _c, cfg: { dataPointIndex: number }) => {
          const hit = progs[cfg.dataPointIndex];

          if (hit) onPick(hit.key);
        },
        mounted: squareInnerEnds,
        updated: squareInnerEnds,
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: `${barPct}%`,
        borderRadius: 4,
        borderRadiusApplication: 'end',
        // แท่งคู่ (รายได้ | ต้นทุน): Apex ปัดมุมเฉพาะ series สุดท้ายของทั้งกราฟ → ใช้ 'all' + squareInnerEnds
        borderRadiusWhenStacked: groups.length > 1 ? 'all' : 'last',
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
      // ชื่อปริญญาย่อบอกระดับในตัว (บ./ม./ด.) — ไม่ต้องเติมระดับหน้าชื่อ
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
      x: {
        formatter: (_: number, o?: { dataPointIndex: number }) => {
          const x = progs[o?.dataPointIndex ?? -1];

          return x ? (tooltipTitle?.(x) ?? x.label) : '';
        },
      },
      y: {
        formatter: (v: number) =>
          `${v.toLocaleString('th-TH', perHead ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unit}`,
      },
    },
  };

  return (
    <Box sx={fill ? { display: 'flex', flexDirection: 'column', blockSize: '100%' } : undefined}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ChartTitle title={title} info={info} />
        </Box>
        {action}
      </Box>
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
      <Box
        ref={boxRef}
        sx={fill ? { flex: 1, position: 'relative', minBlockSize: natural } : undefined}
      >
        <Box sx={fill ? { position: 'absolute', inset: 0 } : undefined}>
          <AppReactApexCharts
            type="bar"
            height={chartH}
            width="100%"
            options={options}
            // key: จำนวน series เปลี่ยน (สลับฐานรายได้) → วาดใหม่ ApexCharts ค้างสีเดิมถ้าไม่ remount
            key={series.map((s) => s.name).join()}
            series={series.map((s) => ({
              name: s.name,
              ...(s.group && { group: s.group }),
              data: progs.map((x) => value(s.pick(x.p), x.p)),
            }))}
          />
        </Box>
      </Box>
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

/** สถานะนิสิตจริงเทียบจุดคุ้มทุน — ข้อความทางการ ใช้ทั้งแถวและป้ายสรุป */
export const targetStatus = (q: number, target: number) =>
  target <= 0
    ? { text: 'ไม่มีจุดคุ้มทุน', tone: 'none' as const }
    : q > target
      ? { text: `สูงกว่าจุดคุ้มทุน ${fmtInt(q - target)} คน`, tone: 'ok' as const }
      : q === target
        ? { text: 'เท่ากับจุดคุ้มทุน', tone: 'ok' as const }
        : { text: `ต่ำกว่าจุดคุ้มทุน ${fmtInt(target - q)} คน`, tone: 'short' as const };

const TONE_COLOR = {
  ok: BEPS.breakEven,
  short: BEPS.cost.dark,
  none: 'var(--mui-palette-text-disabled)',
};

/** แกนแถบ 0–150% ของจุดคุ้มทุน · เส้นประ = 100% (จุดคุ้มทุน) · เกิน 150% แสดงเต็มแถบ */
const BAR_SCALE = 1.5;
const MARK_POS = `${100 / BAR_SCALE}%`;

/** ลำดับสถานะในกราฟ: ยังไม่ถึง → ถึงแล้ว → ไม่มีจุดคุ้มทุน */
const TONE_ORDER = { short: 0, ok: 1, none: 2 } as const;

type TargetRow = {
  x: ProgStat;
  target: number;
  ratio: number;
  st: ReturnType<typeof targetStatus>;
};

/** สีจางผสมพื้นการ์ด — ใช้ได้ทั้งโหมดสว่าง/มืด */
const tint = (c: string, pct: number) =>
  `color-mix(in srgb, ${c} ${pct}%, var(--mui-palette-background-paper))`;

/** ช่องตัวเลขย่อย — ป้ายเล็กด้านบน · ตัวเลขใหญ่ + หน่วยเล็ก · คั่นช่องด้วยเส้นแนวตั้ง */
const StatCell = ({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) => (
  <Box
    sx={{
      flex: '1 1 0',
      minInlineSize: 0,
      px: 1.25,
      '& + &': { borderInlineStart: '1px solid', borderColor: 'divider' },
    }}
  >
    <Typography variant="caption" color="text.secondary" component="div" noWrap>
      {label}
    </Typography>
    <Typography
      className="num"
      fontWeight={700}
      noWrap
      sx={{ color, fontSize: unit ? '1.05rem' : '0.8125rem' }}
    >
      {value}
      {unit && (
        <Typography
          component="span"
          variant="caption"
          fontWeight={600}
          sx={{ ml: 0.5, color: 'inherit' }}
        >
          {unit}
        </Typography>
      )}
    </Typography>
  </Box>
);

/** กล่องหลักสูตร 1 กล่อง — ไอคอน + ชื่อ/ปริญญา · 3 ช่องตัวเลข · แถบร้อยละของจุดคุ้มทุน · ถึงแล้ว = กรอบ/พื้นเขียวจาง */
const ProgramTargetCard = ({ r, onPick }: { r: TargetRow; onPick: (key: string) => void }) => {
  const { x, target, ratio, st } = r;
  const color = TONE_COLOR[st.tone];
  const gap = x.p.Q - target;
  const ok = st.tone === 'ok';

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onPick(x.key)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick(x.key);
        }
      }}
      title={`${x.label} — ${STATUS_LABEL[st.tone]} · กดเพื่อดูรายละเอียดหลักสูตร`}
      sx={{
        p: 1.5,
        border: '1px solid',
        borderColor: ok ? color : 'divider',
        borderRadius: 2,
        bgcolor: ok ? tint(color, 6) : 'background.paper',
        boxShadow: ok ? 'none' : '0 2px 8px rgba(15, 23, 42, 0.06)',
        cursor: 'pointer',
        transition: 'box-shadow .15s, transform .15s',
        '&:hover': {
          boxShadow: '0 6px 16px rgba(15, 23, 42, 0.12)',
          transform: 'translateY(-1px)',
        },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
      }}
    >
      {/* หัวกล่อง: ไอคอน · ชื่อหลักสูตร + ปริญญา */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box
          sx={{
            flexShrink: 0,
            inlineSize: 28,
            blockSize: 28,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: ok ? tint(color, 18) : 'var(--mui-palette-primary-lightOpacity)',
            color: ok ? color : 'primary.main',
          }}
        >
          <i className="ri-graduation-cap-fill" style={{ fontSize: 16 }} />
        </Box>
        <Box sx={{ flex: 1, minInlineSize: 0 }}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {x.label}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {programSubtitle(x.p) || x.p.lvl}
          </Typography>
        </Box>
      </Box>
      {/* 3 ช่องตัวเลข */}
      <Box sx={{ display: 'flex', mt: 1.25, mx: -1.25 }}>
        <StatCell label="นิสิตจริง" value={fmtInt(x.p.Q)} unit="คน" />
        <StatCell
          label="จุดคุ้มทุน"
          value={target > 0 ? fmtInt(target) : '—'}
          unit={target > 0 ? 'คน' : undefined}
        />
        <StatCell
          label="ส่วนต่าง"
          color={color}
          value={
            st.tone === 'none'
              ? '—'
              : gap === 0
                ? 'เท่ากับจุดคุ้มทุน'
                : `${gap > 0 ? 'สูงกว่า' : 'ต่ำกว่า'} ${fmtInt(Math.abs(gap))} คน`
          }
        />
      </Box>
      {/* แถบร้อยละของจุดคุ้มทุน (ขีดตั้ง = 100%) + ป้ายร้อยละ หรือคำอธิบายเมื่อไม่มีจุดคุ้มทุน */}
      {st.tone === 'none' ? (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.25 }}>
          รายได้ต่อคนไม่พอชำระต้นทุนผันแปรต่อคน จึงคำนวณจุดคุ้มทุนไม่ได้
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mt: 1.25 }}>
          <Box
            sx={{
              position: 'relative',
              flex: 1,
              blockSize: 8,
              borderRadius: 4,
              bgcolor: BEPS.track,
            }}
          >
            <Box
              sx={{
                inlineSize: `${Math.min(100, (ratio / BAR_SCALE) * 100)}%`,
                blockSize: '100%',
                borderRadius: 4,
                bgcolor: color,
              }}
            />
            <Box
              title="จุดคุ้มทุน (100%)"
              sx={{
                position: 'absolute',
                insetBlock: -3,
                insetInlineStart: MARK_POS,
                inlineSize: 2,
                borderRadius: 1,
                bgcolor: 'text.secondary',
              }}
            />
          </Box>
          <Typography
            variant="caption"
            className="num"
            fontWeight={700}
            sx={{
              color,
              bgcolor: tint(color, 14),
              borderRadius: 3,
              px: 1,
              minInlineSize: 48,
              textAlign: 'center',
            }}
          >
            {Math.round(ratio * 100)}%
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const STATUS_LABEL = {
  short: 'ยังไม่ถึงจุดคุ้มทุน',
  ok: 'ถึงจุดคุ้มทุนแล้ว',
  none: 'ไม่มีจุดคุ้มทุน',
} as const;
const ALL = 'all';

/**
 * จำนวนนิสิตจริงเทียบกับจุดคุ้มทุน — กล่องละ 1 หลักสูตร เรียง ยังไม่ถึง (ห่างมากสุดก่อน) → ถึงแล้ว → ไม่มีจุดคุ้มทุน
 * แถบ = นิสิตจริงคิดเป็นกี่ % ของจุดคุ้มทุน (ขีดตั้ง = 100%) · ใช้จุดคุ้มทุนของฐานรายได้ที่เลือกด้านบน
 * ปุ่มระดับมุมขวากรองเฉพาะในการ์ด (แสดงเมื่อมีมากกว่า 1 ระดับ)
 * ส่ง height = 1 คอลัมน์เลื่อนดู · ไม่ส่ง = หลายคอลัมน์แสดงครบ · limit = n หลักสูตรที่ควรติดตามที่สุด (ตัวเลขสรุปนับทุกหลักสูตร)
 */
export const TargetVsActualChart = ({
  progs,
  mode,
  onPick,
  height,
  limit,
  num,
}: {
  progs: ProgStat[];
  mode: RevenueMode;
  onPick: (key: string) => void;
  height?: number;
  limit?: number;
  /** ลำดับกราฟในหน้า เช่น "④" */
  num?: string;
}) => {
  const levels = useMemo(() => [...new Set(progs.map((x) => x.p.lvl))], [progs]);
  const [lvlPick, setLvlPick] = useState<string>(ALL);
  const lvl = levels.includes(lvlPick) ? lvlPick : ALL;

  const rows = useMemo<TargetRow[]>(
    () =>
      progs
        .filter((x) => lvl === ALL || x.p.lvl === lvl)
        .map((x) => {
          const target = mode === 'with_government' ? x.qStarGov : x.qStarOwn;

          return {
            x,
            target,
            ratio: target > 0 ? x.p.Q / target : Infinity,
            st: targetStatus(x.p.Q, target),
          };
        }),
    [progs, mode, lvl],
  );

  // ลำดับความสำคัญสำหรับผู้บริหาร (ใช้เมื่อ limit): ยังไม่ถึง ขาดมากสุด (คน) ก่อน → ไม่มีจุดคุ้มทุน (ปัญหาเชิงโครงสร้าง)
  // → ถึงแล้วแต่ใกล้จุดคุ้มทุนที่สุด (เสี่ยงหลุดถ้านิสิตลด) · ไม่จำกัด = เรียงยังไม่ถึง → ถึงแล้ว ตาม % ของจุดคุ้มทุน
  const shown = useMemo(() => {
    const sorted = [...rows].sort(
      limit
        ? (a, b) =>
            TONE_ORDER[a.st.tone] - TONE_ORDER[b.st.tone] ||
            (a.st.tone === 'short' ? b.target - b.x.p.Q - (a.target - a.x.p.Q) : a.ratio - b.ratio)
        : (a, b) => TONE_ORDER[a.st.tone] - TONE_ORDER[b.st.tone] || a.ratio - b.ratio,
    );

    return limit ? sorted.slice(0, limit) : sorted;
  }, [rows, limit]);

  const count = (tone: TargetRow['st']['tone']) => rows.filter((r) => r.st.tone === tone).length;
  const levelText = lvl !== ALL ? lvl : levels.length > 1 ? 'ทุกระดับ' : (levels[0] ?? '');

  return (
    <Box>
      {/* หัวการ์ด: ขีดฟ้า + ลำดับ + ชื่อ (แบบเดียวกับกราฟอื่น) · ปุ่มเลือกระดับ */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ flex: 1, minInlineSize: 220 }}>
          <ChartTitle
            title={`${num ? `${num} ` : ''}จำนวนนิสิตจริงเทียบกับจุดคุ้มทุน${levelText ? ` — ${levelText}` : ''}`}
            info={`จุดคุ้มทุน คือ จำนวนนิสิตขั้นต่ำที่ทำให้รายได้เท่ากับต้นทุนรวมของหลักสูตร · แถบแสดงจำนวนนิสิตจริงคิดเป็นร้อยละของจุดคุ้มทุน ขีดตั้ง = 100% · คำนวณจากฐานรายได้${REVENUE_MODE_LABEL[mode]} (เปลี่ยนได้ที่ฐานรายได้ด้านบน) · กดกล่องเพื่อดูรายละเอียดหลักสูตร`}
          />
        </Box>
        {levels.length > 1 && (
          <ToggleButtonGroup
            size="small"
            exclusive
            color="primary"
            value={lvl}
            onChange={(_, v: string | null) => v && setLvlPick(v)}
            sx={{
              flexWrap: 'wrap',
              '& .MuiToggleButton-root': { px: 1.5, py: 0.25, fontSize: '0.75rem' },
            }}
          >
            <ToggleButton value={ALL}>ทั้งหมด</ToggleButton>
            {levels.map((l) => (
              <ToggleButton key={l} value={l}>
                {l}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Box>
      {/* สรุปจำนวนหลักสูตร + ฐานรายได้ */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          columnGap: 3,
          rowGap: 0.5,
          mb: 2,
        }}
      >
        <LegendItem
          color={TONE_COLOR.short}
          label={`ยังไม่ถึงจุดคุ้มทุน ${count('short')} หลักสูตร`}
        />
        <LegendItem color={TONE_COLOR.ok} label={`ถึงจุดคุ้มทุนแล้ว ${count('ok')} หลักสูตร`} />
        {count('none') > 0 && (
          <LegendItem color={TONE_COLOR.none} label={`ไม่มีจุดคุ้มทุน ${count('none')} หลักสูตร`} />
        )}
      </Box>
      <Box sx={height ? { maxBlockSize: height, overflowY: 'auto', p: 0.5, m: -0.5 } : undefined}>
        {shown.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            ไม่มีหลักสูตรในระดับนี้
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              // limit (หน้าภาพรวม) ไม่เกิน 3 คอลัมน์ → 9 กล่องเป็นตาราง 3×3 พอดี
              gridTemplateColumns: height
                ? '1fr'
                : limit
                  ? 'repeat(auto-fill, minmax(min(100%, max(290px, calc((100% - 24px) / 3))), 1fr))'
                  : 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))',
            }}
          >
            {shown.map((r) => (
              <ProgramTargetCard key={r.x.key} r={r} onPick={onPick} />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};
