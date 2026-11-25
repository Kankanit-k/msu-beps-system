'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

// Next Imports
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// MUI Imports
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

import type { ApexOptions } from 'apexcharts';
import type { ReactNode } from 'react';

// Component Imports
import { BarTitle, BEPS, KPI_BAR_TRACK, kpiBarLabels, LegendItem } from '@components/ChartBits';
import FacultyFilter from '@components/FacultyFilter';
import KpiTile from '@components/KpiTile';
import PageHeaderBar, { MOCK_RUN } from '@components/PageHeaderBar';
import YearFilter from '@components/YearFilter';
import { loadDashFilter, saveDashFilter } from '@components/dashboardFilters';
import { isUniversityLevel } from '@/configs/accessControl';
import { useRole } from '@/hooks/useRole';
import FacultyRankDialog from './FacultyRankDialog';
import RankCard from './RankCard';
import type { RankKind } from './FacultyRankDialog';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import type { RevenueMode } from '@beps/calc-engine';
import { fmtInt, fmtMillion, sheetQStar, shortFacName } from '@views/breakeven/calc';
import { composeCost, PART_SHORT } from '@views/cost/costParts';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

const FAC_NAMES = RAW.FACS.map((f) => f.name);

/** ระดับการศึกษาเดี่ยว — "ทุกระดับ" (lvl = null) รวม ป.บัณฑิต/ประกาศนียบัตรด้วย */
const LV = {
  all: { label: 'ทุกระดับ', lvl: null },
  b: { label: 'ตรี', lvl: 'ปริญญาตรี' },
  m: { label: 'โท', lvl: 'ปริญญาโท' },
  d: { label: 'เอก', lvl: 'ปริญญาเอก' },
} as const;

type LvKey = keyof typeof LV;

/** ตัวเลือกบนแถบระดับ — คู่ "เทียบ" แสดงสองระดับแยกกันในกราฟเดียว (ไม่รวมเป็นก้อนเดียว) */
const LEVELS: { key: string; label: string; groups: LvKey[] }[] = [
  { key: 'all', label: 'ทุกระดับ', groups: ['all'] },
  { key: 'b', label: 'ตรี', groups: ['b'] },
  { key: 'm', label: 'โท', groups: ['m'] },
  { key: 'd', label: 'เอก', groups: ['d'] },
  // ตัวเลือกเทียบระดับ (ตรี เทียบ โท ฯลฯ) ถอดออก 2026-10-22 — ใส่ groups 2 ระดับกลับมาเพื่อเปิดใช้อีกครั้ง
];

/** สีการ์ดจัดอันดับ ④⑤ — ส่วนต่างบวก = เขียวหัวเป็ด · ขาดทุน = ชมพูแดง (ตามแบบที่ผู้ใช้ส่ง 2026-11-25) */
const GAIN = BEPS.breakEven;
const LOSS = BEPS.cost.dark;

/** สีกราฟ ① ตามกราฟ "Data Science" ของ Materio — ม่วงเข้ม/ม่วงอ่อน (รางเทาอ่อนเหมือนกราฟอื่น) */
const C1 = { own: BEPS.revenue.dark, st: BEPS.revenue.light };

/** สีกราฟ ② โทนชมพูแบบโดนัท "Weekly Sales" ของ Materio — ชมพูเข้ม/ชมพูอ่อน */
const C2 = { fixed: BEPS.cost.dark, variable: BEPS.cost.light };

const C4_PARTS = [
  BEPS.compare.dark, // ฟ้า
  '#f4ad33', // เหลืองส้ม
  BEPS.revenue.dark, // ม่วง
  '#ff8a3d', // ส้ม
  BEPS.breakEven, // เขียวหัวเป็ด
  '#f0436b', // ชมพู
  BEPS.profit, // กรมท่า
  '#ffd666', // เหลืองอ่อน
];
/** สีวงกลม ② คงที่/ผันแปร = ฟ้า/เหลือง (สองสีแรกของชุดองค์ประกอบ) */
const C4 = { fixed: C4_PARTS[0]!, variable: C4_PARTS[1]! };

/** ยอดรวมของคณะ (เฉพาะหลักสูตรในระดับที่เลือก) — ต้นทุนเท่ากันทั้งสองฐานรายได้ */
type FacSum = {
  key: string;
  name: string;
  label: string;
  Q: number;
  st: number;
  own: number;
  tfc: number;
  tvc: number;
  tc: number;
  profitWith: number;
  profitWithout: number;
};

const profitOf = (f: FacSum, mode: RevenueMode) =>
  mode === 'with_government' ? f.profitWith : f.profitWithout;

const toM = (v: number) => Number((v / 1e6).toFixed(2));

const fmtSigned = (v: number) => `${v >= 0 ? '+' : '−'}${fmtMillion(Math.abs(v))}`;

const emptySum = (name: string): FacSum => ({
  key: name,
  name,
  label: shortFacName(name),
  Q: 0,
  st: 0,
  own: 0,
  tfc: 0,
  tvc: 0,
  tc: 0,
  profitWith: 0,
  profitWithout: 0,
});

/** รวมรายหลักสูตรขึ้นเป็นคณะ เฉพาะระดับ lvl (null = ทุกระดับ) — ทุกระดับ = เท่ากับแถวคณะในชีต */
const sumByFaculty = (lvl: string | null, facs: string[]) => {
  const m = new Map<string, FacSum>();

  RAW.PROGS.forEach((p) => {
    if (lvl && p.lvl !== lvl) return;
    if (facs.length && !facs.includes(p.fac)) return;
    const cur = m.get(p.fac) ?? emptySum(p.fac);

    cur.Q += p.Q;
    cur.st += p.st;
    cur.own += p.own;
    cur.tfc += p.TFC;
    cur.tvc += p.TVC;
    cur.tc = cur.tfc + cur.tvc;
    cur.profitWith = cur.st + cur.own - cur.tc;
    cur.profitWithout = cur.own - cur.tc;
    m.set(p.fac, cur);
  });

  return m;
};

const pct = (v: number, tc: number) => (tc ? Number(((v / tc) * 100).toFixed(1)) : 0);

/**
 * ApexCharts 3.49 ปัดมุม (borderRadiusWhenStacked: 'last') ได้แค่ series สุดท้ายตัวเดียว
 * แท่งซ้อนหลายกลุ่ม (series.group) จึงไม่โค้งที่ปลาย — วาดปลายขวาสุดของแต่ละกลุ่มใหม่หลังเรนเดอร์
 * groups[i] = กลุ่มของ series i · values[i][j] = ค่าของ series i ที่คณะ j
 */
const roundStackGroupEnds = (
  el: HTMLElement | undefined,
  groups: string[],
  values: number[][],
  r = 4,
) => {
  if (!el) return;
  const last = groups.length - 1; // Apex ปัดมุมตัวนี้ให้อยู่แล้ว

  values[0]?.forEach((_, j) => {
    new Set(groups).forEach((g) => {
      let tip = -1;

      groups.forEach((gi, i) => {
        if (gi === g && (values[i]?.[j] ?? 0) > 0) tip = i;
      });
      if (tip < 0 || tip === last) return;
      const path = el.querySelector<SVGPathElement>(
        `.apexcharts-series[data\\:realIndex="${tip}"] path[j="${j}"]`,
      );

      if (!path) return;
      const { x, y, width: w, height: h } = path.getBBox();
      const rr = Math.min(r, h / 2, w);

      if (w <= 0 || h <= 0) return;
      path.setAttribute(
        'd',
        `M${x},${y}h${w - rr}q${rr},0 ${rr},${rr}v${h - 2 * rr}q0,${rr} ${-rr},${rr}h${rr - w}z`,
      );
    });
  });
};

/** กราฟแท่งแนวนอนรายคณะ — แกนซ้าย = คณะ · แกนล่าง = ล้านบาท (หรือ % เมื่อ unit = '%') */
const barOptions = (
  categories: string[],
  colors: string[],
  extra: Partial<ApexOptions> = {},
  unit: 'ล้านบาท' | '%' = 'ล้านบาท',
): ApexOptions => ({
  chart: { type: 'bar', toolbar: { show: false }, parentHeightOffset: 0, ...extra.chart },
  // แบบ MSU-KPI: แท่งทึบมุมมน บนรางสีพื้น + ตัวเลขสีขาวในแท่ง (ซ่อนเมื่อแท่งสั้นเกินจะอ่าน)
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 4,
      borderRadiusApplication: 'end',
      borderRadiusWhenStacked: 'last',
      barHeight: '74%',
      colors: KPI_BAR_TRACK,
    },
  },
  colors,
  fill: { opacity: 1 },
  stroke: { width: 0 },
  dataLabels: unit === '%' ? kpiBarLabels(15, '%') : kpiBarLabels(20),
  legend: { show: false },
  xaxis: {
    categories,
    tickAmount: 5,
    labels: {
      style: { fontSize: '11px' },
      formatter: (v: string) =>
        `${Math.round(Number(v)).toLocaleString('th-TH')}${unit === '%' ? '%' : ''}`,
    },
    title: {
      text: unit === '%' ? '% ของต้นทุนรวม' : 'ล้านบาท',
      style: { fontSize: '11px', fontWeight: 500, color: 'var(--mui-palette-text-secondary)' },
    },
  },
  yaxis: {
    labels: { style: { fontSize: '11px' }, maxWidth: 210 },
    title: {
      text: 'คณะ',
      style: { fontSize: '11px', fontWeight: 500, color: 'var(--mui-palette-text-secondary)' },
    },
  },
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    padding: { top: -10, bottom: -4 },
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: false } },
  },
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter: (v: number) =>
        `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })}${unit === '%' ? '%' : ' ลบ.'}`,
    },
    ...extra.tooltip,
  },
  ...(extra.annotations && { annotations: extra.annotations }),
});

const UniversityDashboard = () => {
  const [mode, setModeState] = useState<RevenueMode>('with_government');
  // ป็อปอัป "ดูทั้งหมด" — gain = การ์ด ⑤ · loss = การ์ด ⑥ · null = ปิด
  const [rankTab, setRankTab] = useState<RankKind | null>(null);
  const { role } = useRole();
  const [level, setLevelState] = useState('all');
  const [pickedFacs, setPickedFacsState] = useState<string[]>([]);
  const [year, setYearState] = useState(MOCK_RUN.budgetYear);
  const router = useRouter();

  // ตัวกรองค้างข้ามหน้า Dashboard — อ่านค่าที่เลือกไว้จากหน้าอื่นตอนเข้าหน้า · เลือกใหม่แล้วบันทึกกลับ
  useEffect(() => {
    const saved = loadDashFilter();
    const lv = Object.entries(LV).find(([, v]) => v.lvl === saved.lvl)?.[0];

    if (saved.mode) setModeState(saved.mode);
    if (lv) setLevelState(lv);
    if (saved.facs) setPickedFacsState(saved.facs.filter((f) => FAC_NAMES.includes(f)));
    if (saved.year) setYearState(saved.year);
  }, []);

  const setMode = (m: RevenueMode) => {
    setModeState(m);
    saveDashFilter({ mode: m });
  };
  const setLevel = (key: string) => {
    setLevelState(key);
    saveDashFilter({ lvl: LV[key as LvKey]?.lvl ?? '' });
  };
  const setPickedFacs = (facs: string[]) => {
    setPickedFacsState(facs);
    saveDashFilter({ facs });
  };
  const setYear = (y: string) => {
    setYearState(y);
    saveDashFilter({ year: y });
  };

  const levelOpt = LEVELS.find((l) => l.key === level) ?? LEVELS[0]!;
  const lvl = LV[levelOpt.groups[0]!].lvl;

  // คณะเรียงตามลำดับในข้อมูลตั้งต้น (RAW.FACS) — ไม่เรียงตามรายได้ (D2 · 2026-11-19)
  const rows = useMemo<FacSum[]>(() => {
    const m = sumByFaculty(lvl, pickedFacs);
    const order = [
      ...FAC_NAMES.filter((n) => m.has(n)),
      ...[...m.keys()].filter((n) => !FAC_NAMES.includes(n)),
    ];

    return order.map((n) => m.get(n)!);
  }, [lvl, pickedFacs]);

  // หลักสูตรในขอบเขตที่แสดง (ระดับเดียว + คณะที่กรอง)
  const scopeProgs = useMemo(
    () =>
      RAW.PROGS.filter(
        (p) => (!lvl || p.lvl === lvl) && (!pickedFacs.length || pickedFacs.includes(p.fac)),
      ),
    [lvl, pickedFacs],
  );

  // องค์ประกอบต้นทุนของขอบเขตที่แสดง — รวบจากรายหลักสูตร
  const composition = useMemo(() => composeCost(scopeProgs), [scopeProgs]);
  const parts = composition.parts.filter((p) => p.amount > 0).sort((a, b) => b.amount - a.amount);

  const tot = rows.reduce(
    (a, f) => ({
      Q: a.Q + f.Q,
      st: a.st + f.st,
      own: a.own + f.own,
      tfc: a.tfc + f.tfc,
      tvc: a.tvc + f.tvc,
    }),
    { Q: 0, st: 0, own: 0, tfc: 0, tvc: 0 },
  );
  const totTc = tot.tfc + tot.tvc;
  const totTr = mode === 'with_government' ? tot.st + tot.own : tot.own;

  // การ์ดตัวเลขด้านบน — Q* แบบชีต = ผลบวก Q* รายหลักสูตร (ค่าติดลบนับรวมเหมือนชีต)
  const withStudents = scopeProgs.filter((p) => p.Q > 0);
  const qStar = withStudents.reduce((a, p) => a + sheetQStar(p, mode), 0);
  const profit = totTr - totTc;
  const rHead = tot.Q ? totTr / tot.Q : 0;
  const costHead = tot.Q ? totTc / tot.Q : 0;
  const reached = qStar > 0 ? Math.min(100, (tot.Q / qStar) * 100) : 0;
  const pctOf = (a: number, b: number) => (b ? Math.min(100, (a / b) * 100) : 0);

  // จัดอันดับคณะตามส่วนต่างของฐานที่เลือก
  const ranked = [...rows].sort((a, b) => profitOf(b, mode) - profitOf(a, mode));
  const top = ranked.filter((f) => profitOf(f, mode) > 0).slice(0, 5);
  const loss = ranked
    .filter((f) => profitOf(f, mode) < 0)
    .reverse()
    .slice(0, 5);

  // แท่งคู่ต่อคณะ — 30px/คณะ ให้ 20 คณะ (~660px) อยู่ในจอเดียว
  const chartH = Math.max(240, rows.length * 30 + 60);
  const empty = rows.length === 0;
  const withGov = mode === 'with_government';
  const modeLabel = withGov ? 'รวมเงินแผ่นดิน' : 'ไม่รวมเงินแผ่นดิน';
  const revOf = (f: FacSum) => f.own + (withGov ? f.st : 0);

  // ระดับมหาวิทยาลัย: กดแท่งคณะ → ภาพรวมคณะของคณะนั้น (เงื่อนไขเดียวกับป็อปอัปจัดอันดับ)
  const canOpenFaculty = isUniversityLevel(role);

  // กราฟ ① รายได้เทียบต้นทุน: series.group แยกเป็นแท่งรายได้ (บน) / แท่งต้นทุน (ล่าง)
  // ภายในแท่งซ้อน เงินรายได้+เงินแผ่นดิน / คงที่+ผันแปร · ฐานไม่รวมเงินแผ่นดิน → ไม่มีส่วนเงินแผ่นดิน
  const pairParts: {
    name: string;
    group: string;
    color: string;
    label: string;
    val: (f: FacSum) => number;
  }[] = [
    { name: 'เงินรายได้', group: 'รายได้', color: C1.own, label: '#fff', val: (f) => f.own },
    ...(withGov
      ? [
          {
            name: 'เงินแผ่นดิน',
            group: 'รายได้',
            color: C1.st,
            label: BEPS.revenue.onLight,
            val: (f: FacSum) => f.st,
          },
        ]
      : []),
    { name: 'ต้นทุนคงที่', group: 'ต้นทุน', color: C2.fixed, label: '#fff', val: (f) => f.tfc },
    {
      name: 'ต้นทุนผันแปร',
      group: 'ต้นทุน',
      color: C2.variable,
      label: BEPS.cost.onLight,
      val: (f) => f.tvc,
    },
  ];
  const pairSeries = pairParts.map((p) => ({
    name: p.name,
    group: p.group,
    data: rows.map((f) => toM(p.val(f))),
  }));
  const roundPairEnds = (ctx: { el?: HTMLElement }) =>
    roundStackGroupEnds(
      ctx.el,
      pairParts.map((p) => p.group),
      pairSeries.map((s) => s.data),
    );
  const pairBase = barOptions(
    rows.map((f) => f.name),
    pairParts.map((p) => p.color),
    {
      chart: {
        stacked: true,
        events: {
          mounted: roundPairEnds,
          updated: roundPairEnds,
          animationEnd: roundPairEnds,
          ...(canOpenFaculty && {
            dataPointSelection: (_e, _c, { dataPointIndex }: { dataPointIndex: number }) => {
              const name = rows[dataPointIndex]?.name;

              if (name) router.push(`/faculty?fac=${encodeURIComponent(name)}`);
            },
            dataPointMouseEnter: (e: MouseEvent) => {
              (e.target as HTMLElement).style.cursor = 'pointer';
            },
          }),
        },
      },
      tooltip: {
        x: {
          formatter: (_: number, o?: { dataPointIndex: number }) => {
            const f = rows[o?.dataPointIndex ?? -1];

            return f
              ? `${f.name} — รายได้ ${fmtMillion(revOf(f))} · ต้นทุน ${fmtMillion(f.tc)} · ส่วนต่าง ${fmtSigned(profitOf(f, mode))} ลบ.`
              : '';
          },
        },
      },
    },
  );
  const pairOptions: ApexOptions = {
    ...pairBase,
    plotOptions: { bar: { ...pairBase.plotOptions?.bar, barHeight: '84%' } },
    dataLabels: {
      ...pairBase.dataLabels,
      style: { fontSize: '10px', fontWeight: 700, colors: pairParts.map((p) => p.label) },
    },
    responsive: [
      {
        breakpoint: 600,
        options: { yaxis: { labels: { style: { fontSize: '10px' }, maxWidth: 110 } } },
      },
    ],
  };

  /** วงกลม ②③ — ป้าย % บนชิ้น (ชิ้นเล็กกว่า ~5% ไม่แสดงป้าย) · ชี้/กดชิ้นเพื่อดูยอดเงิน */
  const pieOptions = (
    tc: number,
    labels = ['ต้นทุนคงที่', 'ต้นทุนผันแปร'],
    colors = [C4.fixed, C4.variable],
  ): ApexOptions => ({
    chart: { type: 'pie' },
    labels,
    colors,
    legend: { show: false },
    dataLabels: {
      enabled: true,
      formatter: (v: number) => `${Math.round(v)}%`,
      style: { fontSize: '11px', fontWeight: 700, colors: ['#262b43'] },
      dropShadow: { enabled: false },
    },
    stroke: { width: 2, colors: ['var(--mui-palette-background-paper)'] },
    plotOptions: {
      pie: { expandOnClick: true, dataLabels: { offset: -6, minAngleToShowLabel: 18 } },
    },
    tooltip: {
      y: {
        formatter: (v: number) =>
          `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ล้านบาท (${pct(v * 1e6, tc).toFixed(0)}%)`,
      },
    },
  });

  return (
    <Box>
      <PageHeaderBar
        title="ภาพรวมมหาวิทยาลัย"
        mode={mode}
        onModeChange={setMode}
        q={tot.Q}
        profit={totTr - totTc}
        filterCount={(level !== 'all' ? 1 : 0) + (pickedFacs.length > 0 ? 1 : 0)}
        // ตัวกรอง — ระดับการศึกษา + คณะ + ปีงบ อยู่ในแถบหัวที่ติดจอ (แบบภาพรวมคณะ)
        extra={
          <>
            <Autocomplete
              size="small"
              disableClearable
              options={LEVELS}
              getOptionLabel={(l) => l.label}
              isOptionEqualToValue={(a, b) => a.key === b.key}
              value={levelOpt}
              onChange={(_, v) => setLevel(v.key)}
              sx={{ width: 150 }}
              renderInput={(params) => <TextField {...params} label="ระดับการศึกษา" />}
            />
            {/* ทุกบทบาทกรองคณะได้ — หน้านี้แสดงข้อมูลทั้งมหาวิทยาลัยให้ทุกบทบาทอยู่แล้ว */}
            <FacultyFilter
              options={FAC_NAMES}
              value={pickedFacs}
              onChange={setPickedFacs}
              minWidth={200}
            />
            <YearFilter value={year} onChange={setYear} />
            {(level !== 'all' || pickedFacs.length > 0) && (
              <Button
                size="small"
                color="secondary"
                startIcon={<i className="ri-close-line" />}
                onClick={() => {
                  setLevel('all');
                  setPickedFacs([]);
                }}
              >
                ล้างตัวกรอง
              </Button>
            )}
          </>
        }
      />
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: -2, mb: 2 }}>
        {rows.length} คณะ · หน่วยเงิน: ล้านบาท (ลบ.)
      </Typography>

      {/* การ์ดตัวเลข 6 ใบ (แบบ MSU-KPI) — ตามตัวกรองและฐานรายได้ที่เลือก */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2 }}>
          <KpiTile
            label="นิสิตทั้งหมด"
            value={fmtInt(tot.Q)}
            suffix="คน"
            accent="primary"
            icon="ri-group-line" // คนหลายคน = จำนวนนิสิต
            progress={reached}
            footer={`${rows.length} คณะ · ${withStudents.length} หลักสูตร`}
            info="จำนวนนิสิตจริงทุกชั้นปี · แถบ = นิสิตจริงคิดเป็นกี่ % ของจุดคุ้มทุน"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2 }}>
          <KpiTile
            label="นิสิต ณ จุดคุ้มทุน"
            value={fmtInt(qStar)}
            suffix="คน"
            accent="primary"
            // เขียวอมฟ้า (teal) แบบโดนัท Materio — ไม่ซ้ำการ์ดอื่น · ถึงเป้าหรือยังดูจากบรรทัดล่าง
            color={BEPS.breakEven}
            icon="ri-focus-3-line" // เป้า = จำนวนที่ต้องถึงเพื่อคุ้มทุน
            progress={reached}
            footer={
              qStar > tot.Q
                ? `จริง ${fmtInt(tot.Q)} · ขาดอีก ${fmtInt(qStar - tot.Q)} คน`
                : `จริง ${fmtInt(tot.Q)} · เกินมา ${fmtInt(tot.Q - qStar)} คน`
            }
            info="ผลบวกจุดคุ้มทุนรายหลักสูตรแบบชีต = ROUNDUP(ต้นทุนคงที่ ÷ (รายได้ต่อหัว − ต้นทุนผันแปรต่อหัว))"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2 }}>
          <KpiTile
            label="รายได้รวม"
            value={fmtMillion(totTr)}
            suffix="ลบ."
            accent="info"
            color={C1.own} // ม่วงเข้มเดียวกับกราฟ ① รายได้รวม
            icon="ri-funds-line" // เงินเข้า/กราฟขึ้น = รายได้
            progress={pctOf(totTr, totTc)}
            footer={`${modeLabel} · ${pct(totTr, totTc)}% ของต้นทุน`}
            info="รวมเงินแผ่นดิน = เงินแผ่นดิน + เงินรายได้ · ไม่รวม = เงินรายได้อย่างเดียว"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2 }}>
          <KpiTile
            label="ต้นทุนรวม"
            value={fmtMillion(totTc)}
            suffix="ลบ."
            accent="secondary"
            color={C2.fixed} // ชมพูเข้มเดียวกับกราฟ ② ต้นทุนรวม
            icon="ri-price-tag-3-line" // ป้ายราคา = ต้นทุน
            progress={pctOf(tot.tfc, totTc)}
            footer={`คงที่ ${pct(tot.tfc, totTc)}% · ผันแปร ${pct(tot.tvc, totTc)}%`}
            info="ต้นทุนคงที่ + ต้นทุนผันแปร · แถบ = สัดส่วนต้นทุนคงที่"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2 }}>
          <KpiTile
            label="ส่วนต่าง"
            value={fmtSigned(profit)}
            suffix="ลบ."
            accent={profit >= 0 ? 'success' : 'error'}
            // น้ำเงินเข้ม (navy) แบบโดนัท Materio — สีคงที่ ส่วนเกินหรือขาดทุนดูจากเครื่องหมาย +/− ของตัวเลข
            color={BEPS.profit}
            // ลูกศรขึ้น/ลง ตามเครื่องหมายส่วนต่าง (เดียวกับ badge บนหัวหน้า)
            icon={profit >= 0 ? 'ri-arrow-right-up-line' : 'ri-arrow-right-down-line'}
            progress={pctOf(Math.abs(profit), totTr)}
            footer={`${totTr ? ((profit / totTr) * 100).toFixed(1) : '0'}% ของรายได้`}
            info="รายได้รวม − ต้นทุนรวม"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2 }}>
          <KpiTile
            label="รายได้ต่อหัว"
            value={fmtInt(rHead)}
            suffix="บาท/ปี"
            accent="warning"
            color={BEPS.perHead}
            icon="ri-hand-coin-line" // เงินในมือ 1 คน = รายได้ต่อหัว
            progress={pctOf(rHead, costHead)}
            footer={`ต้นทุนต่อหัว ${fmtInt(costHead)} บาท/ปี`}
            info="รายได้รวม ÷ นิสิตจริง · แถบ = รายได้ต่อหัวคิดเป็นกี่ % ของต้นทุนต่อหัว"
          />
        </Grid>
      </Grid>

      {/* ① รายได้เทียบต้นทุน เต็มแถว · ② คงที่/ผันแปร ③ องค์ประกอบต้นทุน ④ ส่วนต่างสูงสุด ⑤ ค่าใช้จ่ายสูงกว่ารายได้ การ์ดละครึ่งแถว
          (จอ < 900px เรียงลงทีละการ์ด) */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <ChartCard
            n={1}
            title="รายได้เทียบต้นทุน รายคณะ"
            sub={`${modeLabel} · แท่งม่วง (บน) = รายได้ · แท่งชมพู (ล่าง) = ต้นทุน · ม่วงยาวกว่าชมพู = มีส่วนต่างเป็นบวก${
              canOpenFaculty ? ' · กดแท่งเพื่อเปิดภาพรวมคณะ' : ''
            }`}
            legend={pairParts.map((p) => [p.color, p.name] as [string, string])}
            empty={empty}
          >
            <AppReactApexCharts
              // key: วาดใหม่เมื่อจำนวน series เปลี่ยน (ฐานรายได้) — ApexCharts ค้างสีเดิมถ้าไม่ remount
              key={`pair|${mode}`}
              type="bar"
              height={chartH}
              width="100%"
              options={pairOptions}
              series={pairSeries}
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardHeader
                  sx={{ pb: 0 }}
                  title={<BarTitle>② โครงสร้างต้นทุนคงที่/ผันแปร</BarTitle>}
                />
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, pt: 2 }}>
                  {empty ? (
                    <EmptyNote />
                  ) : (
                    <>
                      <Box sx={{ flex: '0 0 52%' }}>
                        {/* key: ให้วาดใหม่เมื่อเปลี่ยนตัวกรอง — ตัวเลขกลางวงอ่านจาก options เดิมถ้าไม่ remount */}
                        <AppReactApexCharts
                          key={`${level}|${pickedFacs.join()}`}
                          type="pie"
                          height={200}
                          width="100%"
                          options={pieOptions(totTc)}
                          series={[toM(tot.tfc), toM(tot.tvc)]}
                        />
                      </Box>
                      <Stack spacing={2} sx={{ flex: 1 }}>
                        <CostLine
                          label="ต้นทุนคงที่"
                          color={C4.fixed}
                          value={tot.tfc}
                          total={totTc}
                        />
                        <CostLine
                          label="ต้นทุนผันแปร"
                          color={C4.variable}
                          value={tot.tvc}
                          total={totTc}
                        />
                      </Stack>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardHeader
                  sx={{ pb: 0 }}
                  title={<BarTitle>③ โครงสร้างต้นทุนแยกองค์ประกอบ</BarTitle>}
                />
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, pt: 2 }}>
                  {empty ? (
                    <EmptyNote />
                  ) : (
                    <>
                      <Box sx={{ flex: '0 0 40%' }}>
                        <AppReactApexCharts
                          key={`parts|${level}|${pickedFacs.join()}`}
                          type="pie"
                          height={200}
                          width="100%"
                          options={pieOptions(
                            composition.total,
                            parts.map((c) => PART_SHORT[c.key] ?? c.label),
                            parts.map((_, i) => C4_PARTS[i % C4_PARTS.length]!),
                          )}
                          series={parts.map((c) => toM(c.amount))}
                        />
                      </Box>
                      <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                        {parts.map((c, i) => (
                          <Box
                            key={c.key}
                            title={`${c.label} · ที่มา: ${c.source}`}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}
                          >
                            <Box
                              component="span"
                              sx={{
                                width: 9,
                                height: 9,
                                borderRadius: '2px',
                                bgcolor: C4_PARTS[i % C4_PARTS.length],
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              variant="caption"
                              color="text.primary"
                              sx={{
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {PART_SHORT[c.key] ?? c.label}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.primary"
                              fontWeight={700}
                              className="num"
                              sx={{ whiteSpace: 'nowrap' }}
                            >
                              {fmtMillion(c.amount)}{' '}
                              <Box component="span" sx={{ fontWeight: 400 }}>
                                {pct(c.amount, composition.total).toFixed(0)}%
                              </Box>
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <RankCard
                title="④ คณะที่มีส่วนต่างสูงสุด"
                color={GAIN}
                chip={`ฐาน${modeLabel}`}
                rows={top}
                mode={mode}
                emptyText="ไม่มีคณะที่มีส่วนต่างเป็นบวกในฐานนี้"
                onViewAll={() => setRankTab('gain')}
                viewAllLabel={`ดูทุกคณะ (${rows.length})`}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <RankCard
                title="⑤ คณะที่มีค่าใช้จ่ายสูงกว่ารายได้"
                color={LOSS}
                chip="คณะที่มีค่าใช้จ่ายสูงกว่ารายได้"
                rows={loss}
                mode={mode}
                emptyText="ไม่มีคณะที่ขาดทุนในฐานนี้"
                onViewAll={() => setRankTab('loss')}
                viewAllLabel={`ดูทุกคณะ (${rows.length})`}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <FacultyRankDialog
        open={rankTab !== null}
        kind={rankTab ?? 'gain'}
        rows={rows}
        mode={mode}
        unitWord="คณะ"
        // เปิดหน้าภาพรวมคณะได้เฉพาะระดับมหาวิทยาลัย (ระดับคณะถูกล็อกที่คณะตนอยู่แล้ว)
        canOpenFaculty={canOpenFaculty}
        onClose={() => setRankTab(null)}
      />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        ระดับ: {levelOpt.label} · การ์ด ④⑤ จัดอันดับตามฐานรายได้ที่เลือกบนหัวหน้า ({modeLabel}) ·
        คอลัมน์ขวาแสดงอีกฐานเพื่อเทียบ
      </Typography>
    </Box>
  );
};

const ChartCard = ({
  n,
  title,
  sub,
  legend,
  empty,
  children,
}: {
  n: number;
  title: string;
  sub: string;
  legend: [string, string][];
  empty: boolean;
  children: ReactNode;
}) => (
  <Card sx={{ height: '100%' }}>
    <CardHeader
      sx={{ pb: 0 }}
      title={<BarTitle>{`${'①②③④'[n - 1]} ${title}`}</BarTitle>}
      subheader={sub}
      subheaderTypographyProps={{ variant: 'caption' }}
    />
    <CardContent sx={{ pt: 2, pb: '8px !important' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 1, mb: 1 }}>
        {/* สีว่าง = คำอธิบายสั้นต่อท้าย legend (เช่น ความหมายของสีเข้ม/อ่อนเมื่อเทียบระดับ) */}
        {legend.map(([c, l]) =>
          c ? (
            <LegendItem key={l} color={c} label={l} />
          ) : (
            <Typography key={l} variant="caption" color="text.secondary">
              {l}
            </Typography>
          ),
        )}
      </Box>
      {empty ? <EmptyNote /> : children}
    </CardContent>
  </Card>
);

const EmptyNote = () => (
  <Box sx={{ py: 8, width: '100%', textAlign: 'center' }}>
    <Typography variant="body2" color="text.secondary">
      ไม่มีหลักสูตรตรงกับตัวกรองนี้ — ลองเปลี่ยนระดับหรือล้างตัวกรอง
    </Typography>
  </Box>
);

const CostLine = ({
  label,
  color,
  value,
  total,
}: {
  label: string;
  color: string;
  value: number;
  total: number;
}) => (
  <Box sx={{ p: 2, borderRadius: 1, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
    <Typography
      variant="caption"
      color="text.primary"
      sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
    >
      <Box component="span" sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: color }} />
      {label}
    </Typography>
    <Typography variant="body2" color="text.primary" fontWeight={700} className="num">
      {fmtMillion(value)} ล้านบาท{' '}
      <Typography component="span" variant="caption" color="text.primary">
        ({total ? ((value / total) * 100).toFixed(0) : 0}%)
      </Typography>
    </Typography>
  </Box>
);

export default UniversityDashboard;
