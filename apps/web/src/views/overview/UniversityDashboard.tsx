'use client';

// React Imports
import { useMemo, useState } from 'react';

// Next Imports
import dynamic from 'next/dynamic';

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
import { DotTitle, LegendItem } from '@components/ChartBits';
import FacultyFilter from '@components/FacultyFilter';
import PageHeaderBar, { MOCK_RUN } from '@components/PageHeaderBar';
import { isUniversityLevel } from '@/configs/accessControl';
import { useRole } from '@/hooks/useRole';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import type { RevenueMode } from '@beps/calc-engine';
import { fmtMillion, shortFacName } from '@views/breakeven/calc';

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
  { key: 'bm', label: 'ตรี เทียบ โท', groups: ['b', 'm'] },
  { key: 'bd', label: 'ตรี เทียบ เอก', groups: ['b', 'd'] },
  { key: 'md', label: 'โท เทียบ เอก', groups: ['m', 'd'] },
];

/** สีของแต่ละระดับเมื่อเทียบ — เข้ม = ส่วนแรกของแท่ง (เงินรายได้/ต้นทุนคงที่) · อ่อน = ส่วนที่สอง */
const PAL = [
  { dark: '#3492ec', light: '#9fcdf6' },
  { dark: '#ff9f43', light: '#ffd2a6' },
];

const C = {
  own: '#3492ec', // เงินรายได้ (= รายได้ไม่รวมเงินแผ่นดิน)
  st: '#8fc4f5', // เงินแผ่นดิน
  fixed: 'var(--mui-palette-primary-main)',
  variable: 'var(--mui-palette-warning-main)',
};

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

      return `${first.label} — ${grid
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
  plotOptions: { bar: { horizontal: true, borderRadius: 2, barHeight: '78%' } },
  colors,
  fill: { opacity: 1 },
  dataLabels: { enabled: false },
  stroke: { width: 0 },
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
    labels: { style: { fontSize: '11px' }, maxWidth: 120 },
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
  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [level, setLevel] = useState('all');
  const [pickedFacs, setPickedFacs] = useState<string[]>([]);
  const [year, setYear] = useState(MOCK_RUN.budgetYear);

  // ทุกบทบาทเห็นทั้งมหาวิทยาลัย — ตัวกรองคณะมีเฉพาะระดับมหาวิทยาลัย
  const { role } = useRole();
  const canFilterFac = isUniversityLevel(role);

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

  const cats = rows.map((f) => f.label);
  const chartH = Math.max(240, rows.length * (compare ? 24 : 15) + 60);
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
  const stackSeries = (parts: [string, (f: FacSum) => number][]) =>
    grid.flatMap((g, gi) =>
      parts.map(([name, val]) => ({
        name: compare ? `${groupNames[gi]} ${name}` : name,
        ...(compare && { group: groupNames[gi] }),
        data: g.map(val),
      })),
    );

  const donutOptions = (tc: number, centerLabel = 'ต้นทุนรวม (ลบ.)'): ApexOptions => ({
    chart: { type: 'donut' },
    labels: ['ต้นทุนคงที่', 'ต้นทุนผันแปร'],
    colors: [C.fixed, C.variable],
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
          `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ. (${
            tc ? Math.round(((v * 1e6) / tc) * 100) : 0
          }%)`,
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
      />

      {/* ตัวกรอง — ระดับการศึกษา + คณะ (เฉพาะระดับมหาวิทยาลัย) */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: '10px !important' }}>
          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" fontWeight={600} color="text.secondary">
              ระดับ:
            </Typography>
            <ToggleButtonGroup
              size="small"
              color="primary"
              exclusive
              value={level}
              onChange={(_, v: string | null) => v && setLevel(v)}
              // ยืดให้สูงเท่ากล่อง "กรองคณะ" ในแถวเดียวกัน
              sx={{ alignSelf: 'stretch', minHeight: 38 }}
            >
              {LEVELS.map((l) => (
                <ToggleButton key={l.key} value={l.key} sx={{ px: 2.5, py: 0 }}>
                  {l.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {canFilterFac && (
              <FacultyFilter
                options={FAC_NAMES}
                value={pickedFacs}
                onChange={setPickedFacs}
                minWidth={260}
              />
            )}
            {/* ชุดข้อมูลมีเฉพาะปีงบล่าสุด — ปีอื่นแสดงไว้แต่เลือกไม่ได้จนกว่าจะนำเข้าข้อมูล */}
            <Autocomplete
              size="small"
              disableClearable
              options={[...MOCK_RUN.budgetYears].reverse()}
              getOptionDisabled={(y) => y !== MOCK_RUN.budgetYear}
              getOptionLabel={(y) => (y === MOCK_RUN.budgetYear ? y : `${y} (ยังไม่มีข้อมูล)`)}
              value={year}
              onChange={(_, v) => setYear(v)}
              sx={{ width: 150 }}
              renderInput={(params) => <TextField {...params} label="ปีงบประมาณ" />}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ marginInlineStart: 'auto', whiteSpace: 'nowrap' }}
            >
              {rows.length} คณะ · หน่วยเงิน: ล้านบาท (ลบ.)
            </Typography>
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
          </Stack>
        </CardContent>
      </Card>

      {/* แถวบน: ① รายได้ ② ต้นทุน ③ รายได้เทียบต้นทุน — ลำดับคณะเหมือนกันทั้ง 3 กราฟ */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <ChartCard
            n={1}
            color="info.main"
            title="รายได้รวม รายคณะ"
            sub="ทั้งแท่ง = รวมเงินแผ่นดิน · ส่วนเข้ม = ไม่รวม"
            legend={legendOf([C.own, C.st], ['เงินรายได้', 'เงินแผ่นดิน'])}
            empty={empty}
          >
            <AppReactApexCharts
              type="bar"
              height={chartH}
              width="100%"
              options={barOptions(cats, twoTone([C.own, C.st]), {
                chart: { stacked: true },
                tooltip: groupTitle(
                  grid,
                  groupNames,
                  (f) => `รายได้รวม ${fmtMillion(f.own + f.st)} ลบ.`,
                ),
              })}
              series={stackSeries([
                ['เงินรายได้', (f) => toM(f.own)],
                ['เงินแผ่นดิน', (f) => toM(f.st)],
              ])}
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <ChartCard
            n={2}
            color="secondary.main"
            title="ต้นทุนรวม รายคณะ"
            sub="เท่ากันทั้งสองฐาน — เงินแผ่นดินมีผลเฉพาะรายได้"
            legend={legendOf([C.fixed, C.variable], ['ต้นทุนคงที่', 'ต้นทุนผันแปร'])}
            empty={empty}
          >
            <AppReactApexCharts
              type="bar"
              height={chartH}
              width="100%"
              options={barOptions(cats, twoTone([C.fixed, C.variable]), {
                chart: { stacked: true },
                tooltip: groupTitle(grid, groupNames, (f) => `ต้นทุนรวม ${fmtMillion(f.tc)} ลบ.`),
              })}
              series={stackSeries([
                ['ต้นทุนคงที่', (f) => toM(f.tfc)],
                ['ต้นทุนผันแปร', (f) => toM(f.tvc)],
              ])}
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <ChartCard
            n={3}
            color="success.main"
            title="รายได้เทียบต้นทุนรวม รายคณะ"
            sub="รายได้ ÷ ต้นทุนรวม × 100 · เส้นประ 100% = คุ้มทุน"
            legend={legendOf([C.own, C.st], ['เงินรายได้ (ไม่รวม)', '+ เงินแผ่นดิน (รวม)'])}
            empty={empty}
          >
            <AppReactApexCharts
              type="bar"
              height={chartH}
              width="100%"
              options={barOptions(
                cats,
                twoTone([C.own, C.st]),
                {
                  chart: { stacked: true },
                  annotations: {
                    xaxis: [
                      {
                        x: 100,
                        borderColor: 'var(--mui-palette-error-main)',
                        strokeDashArray: 4,
                      },
                    ],
                  },
                  // หัว tooltip = ชื่อคณะ + % คุ้มทุน และกำไร/ขาดทุน (ลบ.) ทั้งสองฐาน
                  tooltip: groupTitle(
                    grid,
                    groupNames,
                    (f) =>
                      `รวม ${pct(f.st + f.own, f.tc)}% (${fmtSigned(f.profitWith)} ลบ.) / ไม่รวม ${pct(f.own, f.tc)}% (${fmtSigned(f.profitWithout)} ลบ.)`,
                  ),
                },
                '%',
              )}
              series={stackSeries([
                ['เงินรายได้', (f) => pct(f.own, f.tc)],
                ['เงินแผ่นดิน', (f) => pct(f.st, f.tc)],
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
              title={<DotTitle color="primary.main">④ โครงสร้างต้นทุนรวม</DotTitle>}
              subheader="ต้นทุนคงที่ เทียบ ต้นทุนผันแปร · ล้านบาท"
            />
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {empty ? (
                <EmptyNote />
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
                    <CostLine label="ต้นทุนคงที่" color={C.fixed} value={tot.tfc} total={totTc} />
                    <CostLine
                      label="ต้นทุนผันแปร"
                      color={C.variable}
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
            color="success"
            chip={`ฐาน${modeLabel}`}
            rows={top}
            mode={mode}
            emptyText="ไม่มีคณะที่มีส่วนเกินในฐานนี้"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <RankCard
            title="⑥ คณะที่ต้องเฝ้าระวัง (ขาดทุน)"
            color="error"
            chip={`ขาดทุน ${nLoss} ${compare ? 'รายการ' : 'คณะ'}`}
            rows={loss}
            mode={mode}
            emptyText="ไม่มีคณะที่ขาดทุนในฐานนี้"
          />
        </Grid>
      </Grid>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        ระดับ: {levelOpt.label} · การ์ด ⑤⑥ จัดอันดับตามฐานรายได้ที่เลือกบนหัวหน้า ({modeLabel}) ·
        คอลัมน์ขวาแสดงอีกฐานเพื่อเทียบ
      </Typography>
    </Box>
  );
};

const ChartCard = ({
  n,
  color,
  title,
  sub,
  legend,
  empty,
  children,
}: {
  n: number;
  color: string;
  title: string;
  sub: string;
  legend: [string, string][];
  empty: boolean;
  children: ReactNode;
}) => (
  <Card sx={{ height: '100%' }}>
    <CardHeader
      sx={{ pb: 0 }}
      title={<DotTitle color={color}>{`${'①②③'[n - 1]} ${title}`}</DotTitle>}
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
}: {
  title: string;
  color: 'success' | 'error';
  chip: string;
  rows: FacSum[];
  mode: RevenueMode;
  emptyText: string;
}) => {
  const other: RevenueMode = mode === 'with_government' ? 'without_government' : 'with_government';

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        sx={{ pb: 1 }}
        title={<DotTitle color={`${color}.main`}>{title}</DotTitle>}
        action={<Chip size="small" color={color} variant="tonal" label={chip} />}
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
                <TableCell
                  align="right"
                  className="num"
                  sx={{ fontWeight: 700, color: `${color}.main` }}
                >
                  {fmtSigned(profitOf(f, mode))}
                </TableCell>
                <TableCell
                  align="right"
                  className="num"
                  sx={{ color: profitOf(f, other) >= 0 ? 'success.main' : 'error.main' }}
                >
                  {fmtSigned(profitOf(f, other))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default UniversityDashboard;
