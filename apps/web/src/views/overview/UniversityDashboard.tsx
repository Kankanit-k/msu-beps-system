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
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
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

/** สีของแต่ละระดับเมื่อเทียบ — เข้ม = ส่วนแรกของแท่ง (เงินรายได้/ต้นทุนคงที่) · อ่อน = ส่วนที่สอง */
const PAL = [
  { dark: '#1565c0', light: '#64b5f6' },
  { dark: '#ef6c00', light: '#ffb74d' },
];

/** สีการ์ด ⑤⑥ — ส่วนเกิน = teal (การ์ดจุดคุ้มทุน) · ขาดทุน = ชมพู (ต้นทุน) */
const GAIN = BEPS.breakEven;
const LOSS = BEPS.cost.dark;

/** สีกราฟ ① ตามกราฟ "Data Science" ของ Materio — ม่วงเข้ม/ม่วงอ่อน (รางเทาอ่อนเหมือนกราฟอื่น) */
const C1 = { own: BEPS.revenue.dark, st: BEPS.revenue.light };

/** สีกราฟ ② โทนชมพูแบบโดนัท "Weekly Sales" ของ Materio — ชมพูเข้ม/ชมพูอ่อน */
const C2 = { fixed: BEPS.cost.dark, variable: BEPS.cost.light };

/** สีโดนัท ④ — คู่ตัดกันแต่เข้ากัน (ฟ้า/เหลือง) · องค์ประกอบ: สลับโทนเย็น/อุ่น */
const C4 = { fixed: BEPS.compare.dark, variable: '#f5b400' };
const C4_PARTS = [
  BEPS.compare.dark, // ฟ้า
  '#f5b400', // เหลือง
  BEPS.revenue.dark, // ม่วง
  '#ff8a3d', // ส้ม
  BEPS.breakEven, // เขียวหัวเป็ด
  '#f0436b', // ชมพู
  BEPS.profit, // กรมท่า
  '#ffd666', // เหลืองอ่อน
];

/** สีกราฟ ③ โทนฟ้าแบบโดนัท "Weekly Sales" ของ Materio — ฟ้าเข้ม = รายได้ · ฟ้าอ่อน = ต้นทุน */
const C3 = { rev: BEPS.compare.dark, cost: BEPS.compare.light };

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

/** หัว tooltip = ชื่อคณะ + ค่าสรุปของแต่ละระดับ (ระดับเดียวไม่ต้องมีชื่อระดับ) */
const groupTitle = (grid: FacSum[][], names: string[], fmt: (f: FacSum) => string) => ({
  x: {
    formatter: (_: number, o?: { dataPointIndex: number }) => {
      const i = o?.dataPointIndex ?? -1;
      const first = grid[0]?.[i];

      if (!first) return '';

      return `${first.name} — ${grid
        .map((g, gi) => (grid.length > 1 ? `${names[gi]} ` : '') + fmt(g[i]!))
        .join(' · ')}`;
    },
  },
});

const pct = (v: number, tc: number) => (tc ? Number(((v / tc) * 100).toFixed(1)) : 0);

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
    ...(unit === '%' && { tickAmount: 4 }),
    labels: {
      style: { fontSize: '11px' },
      ...(unit === '%' && { formatter: (v: string) => `${Math.round(Number(v))}%` }),
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
  // การ์ด ④: คงที่/ผันแปร หรือแตกองค์ประกอบต้นทุน (ย้ายมาจากหน้าโครงสร้างต้นทุนเดิม)
  const [costView, setCostView] = useState<'fv' | 'parts'>('fv');

  const levelOpt = LEVELS.find((l) => l.key === level) ?? LEVELS[0]!;
  const groupNames = levelOpt.groups.map((g) => LV[g].label);
  const compare = levelOpt.groups.length > 1;

  // grid[ระดับ][คณะ] — ทุกระดับใช้ลำดับคณะเดียวกัน (เรียงตามรายได้รวมของทุกระดับที่แสดง)
  const grid = useMemo<FacSum[][]>(() => {
    const maps = levelOpt.groups.map((g) => sumByFaculty(LV[g].lvl, pickedFacs));
    const rev = new Map<string, number>();

    maps.forEach((m) => m.forEach((f) => rev.set(f.name, (rev.get(f.name) ?? 0) + f.st + f.own)));
    const names = [...rev.keys()].sort((a, b) => rev.get(b)! - rev.get(a)!);

    return maps.map((m) => names.map((n) => m.get(n) ?? emptySum(n)));
  }, [levelOpt, pickedFacs]);
  const rows = grid[0] ?? [];

  // หลักสูตรในขอบเขตที่แสดง (ระดับเดียว + คณะที่กรอง)
  const scopeProgs = useMemo(() => {
    const lvl = LV[levelOpt.groups[0]!].lvl;

    return RAW.PROGS.filter(
      (p) => (!lvl || p.lvl === lvl) && (!pickedFacs.length || pickedFacs.includes(p.fac)),
    );
  }, [levelOpt, pickedFacs]);

  // องค์ประกอบต้นทุนของขอบเขตที่แสดง — รวบจากรายหลักสูตร
  const composition = useMemo(() => composeCost(scopeProgs), [scopeProgs]);
  const parts = composition.parts.filter((p) => p.amount > 0).sort((a, b) => b.amount - a.amount);

  // ยอดรวมของแต่ละระดับ (การ์ด ④) และรวมทุกระดับที่แสดง (หัวหน้า)
  const totals = grid.map((g) =>
    g.reduce(
      (a, f) => ({
        Q: a.Q + f.Q,
        st: a.st + f.st,
        own: a.own + f.own,
        tfc: a.tfc + f.tfc,
        tvc: a.tvc + f.tvc,
      }),
      { Q: 0, st: 0, own: 0, tfc: 0, tvc: 0 },
    ),
  );
  const tot = totals.reduce(
    (a, t) => ({
      Q: a.Q + t.Q,
      st: a.st + t.st,
      own: a.own + t.own,
      tfc: a.tfc + t.tfc,
      tvc: a.tvc + t.tvc,
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

  // จัดอันดับ: ระดับเดียว = รายคณะ · เทียบ = รายคณะ×ระดับ
  const units = compare
    ? grid.flatMap((g, gi) =>
        g
          .filter((f) => f.tc || f.st || f.own)
          .map((f) => ({ ...f, key: `${f.name}|${gi}`, label: `${f.label} (${groupNames[gi]})` })),
      )
    : rows;
  const ranked = [...units].sort((a, b) => profitOf(b, mode) - profitOf(a, mode));
  const top = ranked.filter((f) => profitOf(f, mode) > 0).slice(0, 5);
  const loss = ranked
    .filter((f) => profitOf(f, mode) < 0)
    .reverse()
    .slice(0, 5);
  const nLoss = units.filter((f) => profitOf(f, mode) < 0).length;

  const chartH = Math.max(240, rows.length * (compare ? 30 : 24) + 60);
  const empty = rows.length === 0;
  const modeLabel = mode === 'with_government' ? 'รวมเงินแผ่นดิน' : 'ไม่รวมเงินแผ่นดิน';

  // สีและ series ของแท่งซ้อน — เทียบระดับใช้ series.group แยกเป็นสองแท่งต่อคณะ
  const twoTone = (single: [string, string]) =>
    compare ? PAL.flatMap((c) => [c.dark, c.light]) : single;
  const legendOf = (single: [string, string], parts: [string, string]) =>
    compare
      ? ([
          ...grid.map((_, gi) => [PAL[gi]!.dark, groupNames[gi]!]),
          ['', `สีเข้ม = ${parts[0]} · สีอ่อน = ${parts[1]}`],
        ] as [string, string][])
      : ([
          [single[0], parts[0]],
          [single[1], parts[1]],
        ] as [string, string][]);
  // แต่ละกราฟเรียงคณะตามความยาวแท่งของตัวเอง (มาก → น้อย) — รวมทุกระดับที่แสดง
  const sortGrid = (len: (f: FacSum) => number) => {
    const total = (i: number) => grid.reduce((s, g) => s + len(g[i]!), 0);
    const idx = rows.map((_, i) => i).sort((a, b) => total(b) - total(a));

    return grid.map((g) => idx.map((i) => g[i]!));
  };
  const revOf = (f: FacSum) => f.own + (mode === 'with_government' ? f.st : 0);
  const grid1 = sortGrid((f) => f.own + f.st);
  const grid2 = sortGrid((f) => f.tc);
  const grid3 = sortGrid((f) => revOf(f) + f.tc);
  // ชื่อเต็มบนแกนกราฟ ①②③ (ชื่อย่อ label ใช้ในการ์ดจัดอันดับ)
  const catsOf = (g: FacSum[][]) => (g[0] ?? []).map((f) => f.name);
  // ระดับมหาวิทยาลัย: กดแท่งคณะ → ภาพรวมคณะของคณะนั้น (เงื่อนไขเดียวกับป็อปอัปจัดอันดับ)
  const canOpenFaculty = isUniversityLevel(role) && !compare;
  const openFac = (g: FacSum[][]): ApexOptions['chart'] =>
    canOpenFaculty
      ? {
          stacked: true,
          events: {
            dataPointSelection: (_e, _c, { dataPointIndex }: { dataPointIndex: number }) => {
              const name = g[0]?.[dataPointIndex]?.name;

              if (name) router.push(`/faculty?fac=${encodeURIComponent(name)}`);
            },
            dataPointMouseEnter: (e: MouseEvent) => {
              (e.target as HTMLElement).style.cursor = 'pointer';
            },
          },
        }
      : { stacked: true };

  const stackSeries = (g3: FacSum[][], parts: [string, (f: FacSum) => number][]) =>
    g3.flatMap((g, gi) =>
      parts.map(([name, val]) => ({
        name: compare ? `${groupNames[gi]} ${name}` : name,
        ...(compare && { group: groupNames[gi] }),
        data: g.map(val),
      })),
    );

  const donutOptions = (
    tc: number,
    centerLabel = 'ต้นทุนรวม (ลบ.)',
    labels = ['ต้นทุนคงที่', 'ต้นทุนผันแปร'],
    colors = [C4.fixed, C4.variable],
  ): ApexOptions => ({
    chart: { type: 'donut' },
    labels,
    colors,
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 3, colors: ['var(--mui-palette-background-paper)'] },
    plotOptions: {
      pie: {
        donut: {
          size: '66%',
          labels: {
            show: true,
            value: {
              fontSize: '18px',
              fontWeight: 700,
              formatter: (v) => `${fmtMillion(Number(v) * 1e6)}`,
            },
            total: {
              show: true,
              label: centerLabel,
              fontSize: '11px',
              formatter: () => fmtMillion(tc),
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (v: number) =>
          `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ. (${pct(v * 1e6, tc)}%)`,
      },
    },
  });

  // กราฟ ① สีแบบ Materio: ตัวเลขขาวบนม่วงเข้ม / ม่วงเข้มบนม่วงอ่อน
  const chart1Base = barOptions(catsOf(grid1), twoTone([C1.own, C1.st]), {
    chart: openFac(grid1),
    tooltip: groupTitle(grid1, groupNames, (f) => `รายได้รวม ${fmtMillion(f.own + f.st)} ลบ.`),
  });
  const chart1Options: ApexOptions = {
    ...chart1Base,
    dataLabels: {
      ...chart1Base.dataLabels,
      style: { fontSize: '10px', fontWeight: 700, colors: ['#fff', BEPS.revenue.onLight] },
    },
  };

  // กราฟ ② โทนชมพู: ตัวเลขขาวบนชมพูเข้ม / ชมพูเข้มบนชมพูอ่อน
  const chart2Base = barOptions(catsOf(grid2), twoTone([C2.fixed, C2.variable]), {
    chart: openFac(grid2),
    tooltip: groupTitle(grid2, groupNames, (f) => `ต้นทุนรวม ${fmtMillion(f.tc)} ลบ.`),
  });
  const chart2Options: ApexOptions = {
    ...chart2Base,
    dataLabels: {
      ...chart2Base.dataLabels,
      style: { fontSize: '10px', fontWeight: 700, colors: ['#fff', BEPS.cost.onLight] },
    },
  };

  // กราฟ ③ โทนฟ้า: ตัวเลขขาวบนฟ้าเข้ม / ฟ้าเข้มบนฟ้าอ่อน
  const chart3Base = barOptions(catsOf(grid3), twoTone([C3.rev, C3.cost]), {
    chart: openFac(grid3),
    tooltip: groupTitle(
      grid3,
      groupNames,
      (f) =>
        `${profitOf(f, mode) >= 0 ? 'ส่วนเกิน' : 'ขาดทุน'} ${fmtSigned(profitOf(f, mode))} ลบ.`,
    ),
  });
  const chart3Options: ApexOptions = {
    ...chart3Base,
    dataLabels: {
      ...chart3Base.dataLabels,
      style: { fontSize: '10px', fontWeight: 700, colors: ['#fff', BEPS.compare.onLight] },
    },
  };

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
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiTile
            label="นิสิตทั้งหมด"
            value={fmtInt(tot.Q)}
            suffix="คน"
            accent="primary"
            icon="ri-graduation-cap-line"
            progress={reached}
            footer={`${rows.length} คณะ · ${withStudents.length} หลักสูตร`}
            info="จำนวนนิสิตจริงทุกชั้นปี · แถบ = นิสิตจริงคิดเป็นกี่ % ของจุดคุ้มทุน"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiTile
            label="นิสิต ณ จุดคุ้มทุน"
            value={fmtInt(qStar)}
            suffix="คน"
            accent="primary"
            // เขียวอมฟ้า (teal) แบบโดนัท Materio — ไม่ซ้ำการ์ดอื่น · ถึงเป้าหรือยังดูจากบรรทัดล่าง
            color={BEPS.breakEven}
            icon="ri-flag-2-line"
            progress={reached}
            footer={
              qStar > tot.Q
                ? `จริง ${fmtInt(tot.Q)} · ขาดอีก ${fmtInt(qStar - tot.Q)} คน`
                : `จริง ${fmtInt(tot.Q)} · เกินมา ${fmtInt(tot.Q - qStar)} คน`
            }
            info="ผลบวกจุดคุ้มทุนรายหลักสูตรแบบชีต = ROUNDUP(ต้นทุนคงที่ ÷ (รายได้ต่อหัว − ต้นทุนผันแปรต่อหัว))"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiTile
            label="รายได้รวม"
            value={fmtMillion(totTr)}
            suffix="ลบ."
            accent="info"
            color={C1.own} // ม่วงเข้มเดียวกับกราฟ ① รายได้รวม
            icon="ri-hand-coin-line"
            progress={pctOf(totTr, totTc)}
            footer={`${modeLabel} · ${pct(totTr, totTc)}% ของต้นทุน`}
            info="รวมเงินแผ่นดิน = เงินแผ่นดิน + เงินรายได้ · ไม่รวม = เงินรายได้อย่างเดียว"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiTile
            label="ต้นทุนรวม"
            value={fmtMillion(totTc)}
            suffix="ลบ."
            accent="secondary"
            color={C2.fixed} // ชมพูเข้มเดียวกับกราฟ ② ต้นทุนรวม
            icon="ri-bill-line"
            progress={pctOf(tot.tfc, totTc)}
            footer={`คงที่ ${pct(tot.tfc, totTc)}% · ผันแปร ${pct(tot.tvc, totTc)}%`}
            info="ต้นทุนคงที่ + ต้นทุนผันแปร · แถบ = สัดส่วนต้นทุนคงที่"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiTile
            label="ส่วนเกิน/ขาดทุน"
            value={fmtSigned(profit)}
            suffix="ลบ."
            accent={profit >= 0 ? 'success' : 'error'}
            // น้ำเงินเข้ม (navy) แบบโดนัท Materio — สีคงที่ ส่วนเกินหรือขาดทุนดูจากเครื่องหมาย +/− ของตัวเลข
            color={BEPS.profit}
            icon="ri-scales-3-line"
            progress={pctOf(Math.abs(profit), totTr)}
            footer={`${totTr ? ((profit / totTr) * 100).toFixed(1) : '0'}% ของรายได้`}
            info="รายได้รวม − ต้นทุนรวม"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiTile
            label="รายได้ต่อหัว"
            value={fmtInt(rHead)}
            suffix="บาท"
            accent="warning"
            icon="ri-coins-line"
            progress={pctOf(rHead, costHead)}
            footer={`ต้นทุนต่อหัว ${fmtInt(costHead)} บาท`}
            info="รายได้รวม ÷ นิสิตจริง · แถบ = รายได้ต่อหัวคิดเป็นกี่ % ของต้นทุนต่อหัว"
          />
        </Grid>
      </Grid>

      {/* แถวบน: ① รายได้ ② ต้นทุน ③ รายได้เทียบต้นทุน (ล้านบาท) — แต่ละกราฟเรียงคณะตามความยาวแท่งของตัวเอง */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <ChartCard
            n={1}
            title="รายได้รวม รายคณะ"
            sub="ทั้งแท่ง = รวมเงินแผ่นดิน · ส่วนม่วงเข้ม = ไม่รวม"
            legend={legendOf([C1.own, C1.st], ['เงินรายได้', 'เงินแผ่นดิน'])}
            empty={empty}
          >
            <AppReactApexCharts
              type="bar"
              height={chartH}
              width="100%"
              options={chart1Options}
              series={stackSeries(grid1, [
                ['เงินรายได้', (f) => toM(f.own)],
                ['เงินแผ่นดิน', (f) => toM(f.st)],
              ])}
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <ChartCard
            n={2}
            title="ต้นทุนรวม รายคณะ"
            sub="เท่ากันทั้งสองฐาน — เงินแผ่นดินมีผลเฉพาะรายได้"
            legend={legendOf([C2.fixed, C2.variable], ['ต้นทุนคงที่', 'ต้นทุนผันแปร'])}
            empty={empty}
          >
            <AppReactApexCharts
              type="bar"
              height={chartH}
              width="100%"
              options={chart2Options}
              series={stackSeries(grid2, [
                ['ต้นทุนคงที่', (f) => toM(f.tfc)],
                ['ต้นทุนผันแปร', (f) => toM(f.tvc)],
              ])}
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <ChartCard
            n={3}
            title="รายได้เทียบต้นทุน รายคณะ"
            sub={`${modeLabel} · ส่วนฟ้าเข้มยาวกว่าฟ้าอ่อน = มีส่วนเกิน`}
            legend={legendOf([C3.rev, C3.cost], ['รายได้รวม', 'ต้นทุนรวม'])}
            empty={empty}
          >
            <AppReactApexCharts
              // key: remount เมื่อเปลี่ยนแบบกราฟ — ApexCharts ค้างค่า options เดิมถ้าใช้ตัวเดิม
              key="rev-vs-cost-stacked"
              type="bar"
              height={chartH}
              width="100%"
              // แท่งเดียวต่อคณะ: ส่วนฟ้าเข้ม = รายได้รวม · ส่วนฟ้าอ่อน = ต้นทุนรวม · ตัวเลขในแท่งแบบกราฟ ②
              options={chart3Options}
              series={stackSeries(grid3, [
                ['รายได้รวม', (f) => toM(revOf(f))],
                ['ต้นทุนรวม', (f) => toM(f.tc)],
              ])}
            />
          </ChartCard>
        </Grid>
      </Grid>

      {/* แถวล่าง: ④ โครงสร้างต้นทุน ⑤ ส่วนเกินสูงสุด ⑥ เฝ้าระวัง */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              sx={{ pb: 0 }}
              title={<BarTitle>④ โครงสร้างต้นทุนรวม</BarTitle>}
              subheader={
                !compare && costView === 'parts'
                  ? `แยกองค์ประกอบ ${parts.length} หมวด · ล้านบาท`
                  : 'ต้นทุนคงที่ เทียบ ต้นทุนผันแปร · ล้านบาท'
              }
              subheaderTypographyProps={{ variant: 'caption' }}
              action={
                !compare && (
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    color="primary"
                    value={costView}
                    onChange={(_, v: 'fv' | 'parts' | null) => v && setCostView(v)}
                    sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.25, fontSize: '0.75rem' } }}
                  >
                    <ToggleButton value="fv">คงที่/ผันแปร</ToggleButton>
                    <ToggleButton value="parts">องค์ประกอบ</ToggleButton>
                  </ToggleButtonGroup>
                )
              }
            />
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, pt: 2 }}>
              {empty ? (
                <EmptyNote />
              ) : !compare && costView === 'parts' ? (
                // องค์ประกอบต้นทุน: โดนัท + รายการหมวด (ชี้ที่รายการเพื่อดูที่มาของตัวเลข)
                <>
                  <Box sx={{ flex: '0 0 40%' }}>
                    <AppReactApexCharts
                      key={`parts|${level}|${pickedFacs.join()}`}
                      type="donut"
                      height={170}
                      width="100%"
                      options={donutOptions(
                        composition.total,
                        'ต้นทุนรวม (ลบ.)',
                        parts.map((c) => PART_SHORT[c.key] ?? c.label),
                        parts.map((_, i) => C4_PARTS[i % C4_PARTS.length]!),
                      )}
                      series={parts.map((c) => toM(c.amount))}
                    />
                  </Box>
                  <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                    {parts.map((c) => (
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
                            bgcolor: C4_PARTS[parts.indexOf(c) % C4_PARTS.length],
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          variant="caption"
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
                          fontWeight={700}
                          className="num"
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          {fmtMillion(c.amount)}{' '}
                          <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                            {pct(c.amount, composition.total).toFixed(0)}%
                          </Box>
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </>
              ) : compare ? (
                // เทียบระดับ: โดนัทของแต่ละระดับวางคู่กัน
                totals.map((t, gi) => (
                  <Box key={groupNames[gi]} sx={{ flex: 1, textAlign: 'center' }}>
                    <AppReactApexCharts
                      key={`${level}|${pickedFacs.join()}|${gi}`}
                      type="donut"
                      height={150}
                      width="100%"
                      options={donutOptions(t.tfc + t.tvc, 'ลบ.')}
                      series={[toM(t.tfc), toM(t.tvc)]}
                    />
                    <Typography variant="body2" fontWeight={700}>
                      {groupNames[gi]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" className="num">
                      คงที่ {pct(t.tfc, t.tfc + t.tvc).toFixed(0)}% · ผันแปร{' '}
                      {pct(t.tvc, t.tfc + t.tvc).toFixed(0)}%
                    </Typography>
                  </Box>
                ))
              ) : (
                <>
                  <Box sx={{ flex: '0 0 52%' }}>
                    {/* key: ให้วาดใหม่เมื่อเปลี่ยนตัวกรอง — ตัวเลขกลางวงอ่านจาก options เดิมถ้าไม่ remount */}
                    <AppReactApexCharts
                      key={`${level}|${pickedFacs.join()}`}
                      type="donut"
                      height={170}
                      width="100%"
                      options={donutOptions(totTc)}
                      series={[toM(tot.tfc), toM(tot.tvc)]}
                    />
                  </Box>
                  <Stack spacing={2} sx={{ flex: 1 }}>
                    <CostLine label="ต้นทุนคงที่" color={C4.fixed} value={tot.tfc} total={totTc} />
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
        <Grid size={{ xs: 12, md: 4 }}>
          <RankCard
            title="⑤ คณะที่มีส่วนเกินสูงสุด"
            color={GAIN}
            chip={`ฐาน${modeLabel}`}
            rows={top}
            mode={mode}
            emptyText="ไม่มีคณะที่มีส่วนเกินในฐานนี้"
            onViewAll={() => setRankTab('gain')}
            viewAllLabel={`ดูทุก${compare ? 'รายการ' : 'คณะ'} (${units.length})`}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <RankCard
            title="⑥ คณะที่ต้องเฝ้าระวัง (ขาดทุน)"
            color={LOSS}
            chip={`ขาดทุน ${nLoss} ${compare ? 'รายการ' : 'คณะ'}`}
            rows={loss}
            mode={mode}
            emptyText="ไม่มีคณะที่ขาดทุนในฐานนี้"
            onViewAll={() => setRankTab('loss')}
            viewAllLabel={`ดูทุก${compare ? 'รายการ' : 'คณะ'} (${units.length})`}
          />
        </Grid>
      </Grid>

      <FacultyRankDialog
        open={rankTab !== null}
        kind={rankTab ?? 'gain'}
        rows={units}
        mode={mode}
        unitWord={compare ? 'รายการ' : 'คณะ'}
        // เปิดหน้าภาพรวมคณะได้เฉพาะระดับมหาวิทยาลัย (ระดับคณะถูกล็อกที่คณะตนอยู่แล้ว)
        canOpenFaculty={canOpenFaculty}
        onClose={() => setRankTab(null)}
      />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        ระดับ: {levelOpt.label} · การ์ด ⑤⑥ จัดอันดับตามฐานรายได้ที่เลือกบนหัวหน้า ({modeLabel}) ·
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
    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box component="span" sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: color }} />
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={700} className="num">
      {fmtMillion(value)} ลบ.{' '}
      <Typography component="span" variant="caption" color="text.secondary">
        ({total ? ((value / total) * 100).toFixed(0) : 0}%)
      </Typography>
    </Typography>
  </Box>
);

const RankCard = ({
  title,
  color,
  chip,
  rows,
  mode,
  emptyText,
  onViewAll,
  viewAllLabel,
}: {
  title: string;
  color: string;
  chip: string;
  rows: FacSum[];
  mode: RevenueMode;
  emptyText: string;
  onViewAll: () => void;
  viewAllLabel: string;
}) => {
  const other: RevenueMode = mode === 'with_government' ? 'without_government' : 'with_government';

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        sx={{ pb: 1 }}
        title={<BarTitle>{title}</BarTitle>}
        action={
          <Chip
            size="small"
            label={chip}
            sx={{ color, bgcolor: `color-mix(in srgb, ${color} 16%, transparent)` }}
          />
        }
      />
      <CardContent sx={{ pt: 0, pb: '12px !important' }}>
        <Table
          size="small"
          sx={{
            '& th': { fontSize: '0.75rem', whiteSpace: 'nowrap', py: 1 },
            '& td': { fontSize: '0.8125rem', py: 1 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>คณะ</TableCell>
              <TableCell align="right">
                {mode === 'with_government' ? 'รวม ง.แผ่นดิน' : 'ไม่รวม ง.แผ่นดิน'} (ลบ.)
              </TableCell>
              <TableCell align="right">
                {other === 'with_government' ? 'รวม' : 'ไม่รวม'} (ลบ.)
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 6 }}>
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
            {rows.map((f, i) => (
              <TableRow key={f.key}>
                <TableCell>{i + 1}</TableCell>
                <TableCell
                  title={f.name}
                  sx={{
                    maxWidth: 170,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.label}
                </TableCell>
                <TableCell align="right" className="num" sx={{ fontWeight: 700, color }}>
                  {fmtSigned(profitOf(f, mode))}
                </TableCell>
                <TableCell
                  align="right"
                  className="num"
                  sx={{ color: profitOf(f, other) >= 0 ? GAIN : LOSS }}
                >
                  {fmtSigned(profitOf(f, other))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
            {/* ปุ่มทึบสีการ์ด ไอคอนนำหน้า แบบปุ่ม Dashboard-KPI */}
            <Button
              size="small"
              variant="contained"
              onClick={onViewAll}
              startIcon={<i className="ri-table-line" />}
              fullWidth
              sx={{
                height: 45,
                borderRadius: '6px',
                bgcolor: color,
                color: '#fff',
                fontWeight: 600,
                // เงาสีเดียวกับปุ่ม ~25%
                boxShadow: `0 4px 12px color-mix(in srgb, ${color} 25%, transparent)`,
                '&:hover': {
                  bgcolor: `color-mix(in srgb, ${color} 85%, black)`,
                  boxShadow: `0 6px 16px color-mix(in srgb, ${color} 25%, transparent)`,
                },
              }}
            >
              {viewAllLabel}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default UniversityDashboard;
