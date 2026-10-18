'use client';

// React Imports
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// Next Imports
import dynamic from 'next/dynamic';

// MUI Imports
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

// Third-party Imports
import type { ApexOptions } from 'apexcharts';

// Type Imports
import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { DotTitle, LegendItem } from '@components/ChartBits';
import DataCaveatNotes, { SHOW_OVERVIEW_NOTES } from '@components/DataCaveatNotes';
import FacultyFilter from '@components/FacultyFilter';
import KpiCard from '@components/KpiCard';
import NoteBar from '@components/NoteBar';
import PageHeaderBar from '@components/PageHeaderBar';
import { useRole } from '@/hooks/useRole';

// Data & Calc Imports
import { calcBreakEven } from '@beps/calc-engine';
import { RAW } from '@/data/mockup';
import type { ProgRow } from '@/data/mockup';
import {
  computeBreakEven,
  fmtInt,
  inLevel,
  LEVEL_SCOPE_LABEL,
  REVENUE_MODE_LABEL,
  shortFacName,
  sumRows,
} from '@views/breakeven/calc';
import type { FinancialRow, LevelScope } from '@views/breakeven/calc';
import { downloadCsv } from '@/utils/csv';

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

// หน่วยที่ ATC/หัว สูงเกินค่าเฉลี่ยหลายเท่า (เช่น หน่วยวิจัยนิสิตไม่กี่คน) ทำให้แท่งอื่นแบนจนอ่านไม่ออก —
// กันออกจากกราฟแต่ยังอยู่ในตาราง · หน่วยเล็กที่ ATC ปกติยังแสดงในกราฟ ผู้บริหารจะได้ไม่ถามว่าข้อมูลหายไปไหน
const OUTLIER_ATC_X = 10;

const FAC_NAMES = RAW.FACS.map((f) => f.name);

// จัดรูปแบบ/ย่อชื่อใช้ตัวเดียวกับหน้าอื่น (ดู @views/breakeven/calc)
const short = shortFacName;
const fmtB = fmtInt;
const fmtN = fmtInt;
const median = (arr: number[]) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const h = Math.floor(s.length / 2);

  return s.length % 2 ? s[h]! : (s[h - 1]! + s[h]!) / 2;
};

/** แถวที่หน้านี้แสดง — คณะ (ดูหลายคณะ) หรือหลักสูตร (ดูคณะเดียว) */
type UnitRow = FinancialRow & { name: string; TC: number };
type UnitCalc = UnitRow & { r: number; atc: number; avc: number; cm: number; diff: number };

/** ชื่อหลักสูตร + ระดับต่อท้ายเสมอ — ชื่อซ้ำกันได้ข้ามระดับ */
const progLabel = (p: ProgRow) => `${p.prog} (${p.lvl})`;

const calcFor = (row: UnitRow, mode: RevenueMode): UnitCalc => {
  const res = calcBreakEven({
    q: row.Q,
    governmentBudget: row.st,
    incomeBudget: row.own,
    tfc: row.TFC,
    tvc: row.TVC,
    revenueMode: mode,
  });

  const r = res.r ?? 0;
  const atc = res.atc ?? 0;
  const avc = res.avc ?? 0;

  return { ...row, r, atc, avc, cm: r - avc, diff: r - atc };
};

/** สัญลักษณ์หน้ารายการประเด็นสำคัญ — ตาม mockup (✓ ผ่าน · ▸ เฝ้าระวัง/ข้อมูล · ⚠ วิกฤต) */
const INSIGHT_MARK = {
  success: { mark: '✓', color: 'success.main' },
  warning: { mark: '▸', color: 'warning.main' },
  info: { mark: '▸', color: 'primary.main' },
  error: { mark: '⚠', color: 'error.main' },
} as const;

/** หัวคอลัมน์ตัวเลข — ชื่อ + หน่วยนับบรรทัดล่าง */
const HeadCell = ({ label, unit }: { label: string; unit: string }) => (
  <TableCell align="right">
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <span>{label}</span>
      <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'none' }}>
        ({unit})
      </Typography>
    </Box>
  </TableCell>
);

const PerheadView = () => {
  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'loss'>('all');
  const [pickedFacs, setSelectedFacs] = useState<string[]>([]);
  const [level, setLevel] = useState<LevelScope>('all');

  // ผู้ดูแลคณะ/อาจารย์ เห็นได้เฉพาะคณะของตน — ล็อกตัวกรองไว้ที่คณะนั้น
  const { role, scope: roleScope } = useRole();
  const lockedFac = role === 'deptAdmin' || role === 'lecturer' ? roleScope.faculty : null;
  const selectedFacs = useMemo(
    () => (lockedFac ? [lockedFac] : pickedFacs),
    [lockedFac, pickedFacs],
  );
  const isFiltered = selectedFacs.length > 0;

  // ดูคณะเดียว → แตกเป็นรายหลักสูตร และกรองระดับการศึกษาได้
  const byProgram = selectedFacs.length === 1;
  const levelScope: LevelScope = byProgram ? level : 'all';
  const unitWord = byProgram ? 'หลักสูตร' : 'คณะ';
  const shortName = (name: string) => (byProgram ? name : short(name));

  const uni = useMemo(() => calcFor({ ...RAW.UNI, name: 'มหาวิทยาลัย' }, mode), [mode]);

  const facs = useMemo(
    () => RAW.FACS.filter((f) => !isFiltered || selectedFacs.includes(f.name)),
    [isFiltered, selectedFacs],
  );
  // หลักสูตรที่ไม่มีนิสิตคำนวณต่อหัวไม่ได้ — ไม่นับ
  const progs = useMemo(
    () =>
      byProgram
        ? RAW.PROGS.filter((p) => p.fac === selectedFacs[0] && p.Q > 0 && inLevel(p, levelScope))
        : [],
    [byProgram, selectedFacs, levelScope],
  );

  // ทุกกราฟ/ตาราง/ประเด็นสำคัญใช้ allRows ชุดนี้ — รายคณะ หรือรายหลักสูตรเมื่อดูคณะเดียว
  const allRows = useMemo(
    () =>
      byProgram
        ? progs.map((p) => calcFor({ ...p, name: progLabel(p) }, mode))
        : facs.map((f) => calcFor(f, mode)),
    [byProgram, progs, facs, mode],
  );

  // ขอบเขตที่กำลังแสดง — ไม่เลือก = มหาวิทยาลัย · กรองระดับ = รวมจากหลักสูตร
  const scope: FinancialRow = useMemo(
    () => (levelScope !== 'all' ? sumRows(progs) : isFiltered ? sumRows(facs) : RAW.UNI),
    [levelScope, progs, isFiltered, facs],
  );
  const scopeLabel = !isFiltered
    ? 'ทั้งมหาวิทยาลัย'
    : `${byProgram ? selectedFacs[0] : `${facs.length} คณะที่เลือก`}${
        levelScope === 'all' ? '' : ` · ${LEVEL_SCOPE_LABEL[levelScope]}`
      }`;

  // ส่วนเกิน/ขาดทุนบนหัวหน้าจอ — ผู้ดูแลคณะเห็นของคณะตน ที่เหลือเห็นระดับมหาวิทยาลัย
  const uniRes = useMemo(() => computeBreakEven(RAW.UNI, mode), [mode]);
  const scopeRes = useMemo(() => computeBreakEven(scope, mode), [scope, mode]);
  const headRes = lockedFac ? scopeRes : uniRes;

  // ค่าเฉลี่ยต่อหัวของขอบเขต (รวมยอดแล้วหารด้วยนิสิตรวม)
  const sel = useMemo(
    () =>
      isFiltered ? calcFor({ ...scope, name: scopeLabel, TC: scope.TFC + scope.TVC }, mode) : uni,
    [isFiltered, scope, scopeLabel, mode, uni],
  );
  // ค่าอ้างอิงในประเด็นสำคัญ/Top 8 — คณะเดียวเทียบกับค่าเฉลี่ยคณะ
  const ref = byProgram ? sel : uni;
  const refWord = byProgram ? 'คณะ' : 'มหาวิทยาลัย';

  const exportExcel = () =>
    downloadCsv(`ต่อหัวนิสิต-${scopeLabel}`, [
      [
        byProgram ? 'หลักสูตร' : 'คณะ',
        'นิสิต',
        'รายได้/หัว (บาท)',
        'ต้นทุนรวม/หัว (บาท)',
        'ต้นทุนผันแปร/หัว (บาท)',
        'ส่วนเกิน/หัว (บาท)',
        'ส่วนต่าง/หัว (บาท)',
        'สถานะ',
      ],
      ...sortedRows.map((d) => [
        d.name,
        d.Q,
        Math.round(d.r),
        Math.round(d.atc),
        Math.round(d.avc),
        Math.round(d.cm),
        Math.round(d.diff),
        d.diff >= 0 ? 'คุ้ม' : 'ขาด',
      ]),
    ]);
  const isOutlier = (d: UnitCalc) => d.atc > ref.atc * OUTLIER_ATC_X;
  const chartRows = allRows.filter((d) => !isOutlier(d));
  const outlierRows = allRows.filter(isOutlier);
  const sortedRows = useMemo(() => [...allRows].sort((a, b) => b.diff - a.diff), [allRows]);

  const nOk = allRows.filter((d) => d.diff >= 0).length;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sortedRows.filter((d) => {
      const statWord = d.diff >= 0 ? 'คุ้ม' : 'ขาด';
      const matchesText = !q || d.name.toLowerCase().includes(q) || statWord.includes(q);
      const matchesFilter =
        statusFilter === 'all' || (statusFilter === 'ok' ? d.diff >= 0 : d.diff < 0);

      return matchesText && matchesFilter;
    });
  }, [sortedRows, search, statusFilter]);

  // ===== กราฟหลัก: R / ATC / AVC รายคณะ =====
  // แท่งแนวตั้งจัดกลุ่ม — เขียว = รายได้/หัว · ส้ม = ต้นทุนรวม/หัว · ม่วง = ผันแปร/หัว (ตาม mockup)
  const BAR_COLORS = [
    'var(--mui-palette-success-main)',
    'var(--mui-palette-warning-main)',
    'var(--mui-palette-primary-main)',
  ] as const;
  const barCategories = chartRows.map((d) => shortName(d.name));
  const barOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, parentHeightOffset: 0 },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 3,
        borderRadiusApplication: 'end',
        columnWidth: '72%',
      },
    },
    colors: [...BAR_COLORS],
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
    },
    legend: { show: false },
    xaxis: {
      categories: barCategories,
      // ชื่อคณะยาว — เอียง 45° ทุกชื่อ ไม่ตัดทิ้งเมื่อซ้อนกัน
      labels: {
        rotate: -45,
        rotateAlways: true,
        hideOverlappingLabels: false,
        trim: false,
        maxHeight: 180,
        style: { fontSize: '11px' },
      },
    },
    yaxis: {
      title: { text: 'บาท/คน' },
      labels: { formatter: (v) => `${(Number(v) / 1000).toFixed(0)}k` },
    },
    tooltip: { shared: true, intersect: false, y: { formatter: (v) => `${fmtB(v)} บาท/คน` } },
  };
  const barSeries = [
    { name: 'รายได้/หัว', data: chartRows.map((d) => Math.round(d.r)) },
    { name: 'ต้นทุนรวม/หัว', data: chartRows.map((d) => Math.round(d.atc)) },
    { name: 'ต้นทุนผันแปร/หัว', data: chartRows.map((d) => Math.round(d.avc)) },
  ];

  // ===== กราฟประสิทธิภาพ: R เทียบ ATC (scatter) =====
  const okPts = chartRows.filter((d) => d.diff >= 0);
  const lossPts = chartRows.filter((d) => d.diff < 0);
  // เก็บข้อมูลคณะไว้ในจุดเอง (meta) — tooltip จะได้ไม่พึ่ง index ที่อาจคลาดเคลื่อน
  const toPoint = (d: (typeof chartRows)[number]) => ({
    x: Math.round(d.atc),
    y: Math.round(d.r),
    meta: d,
  });
  const scatterSeries = [
    { name: 'คุ้มทุนต่อหัว', data: okPts.map(toPoint) },
    { name: 'ขาดทุนต่อหัว', data: lossPts.map(toPoint) },
  ];
  // เผื่อขอบแกน ~8% — จุดที่อยู่ชิดขอบพื้นที่กราฟพอดี ApexCharts จะไม่แสดง tooltip (เมาส์ถูกมองว่าอยู่นอกกราฟ)
  const padRange = (vals: number[]) => {
    if (!vals.length) return {};
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = (hi - lo || hi || 1) * 0.08;

    return { min: Math.max(0, lo - pad), max: hi + pad };
  };
  const xRange = padRange(chartRows.map((d) => d.atc));
  const yRange = padRange(chartRows.map((d) => d.r));
  const scatterOptions: ApexOptions = {
    chart: { type: 'scatter', toolbar: { show: false }, parentHeightOffset: 0 },
    colors: ['var(--mui-palette-success-main)', 'var(--mui-palette-error-main)'],
    // ApexCharts ใช้ขอบเขตของเส้น grid เป็น "พื้นที่ hover" — ต้องมีเส้นทั้งสองแกนให้คลุมทั้งกราฟ
    // ไม่งั้นจุดที่อยู่นอกกรอบเส้น grid (บน/ล่าง/ขวาสุด) จะไม่แสดง tooltip
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      title: { text: 'ต้นทุน/หัว (ATC) บาท →' },
      ...xRange,
      tickAmount: 6,
      labels: { formatter: (v) => `${(Number(v) / 1000).toFixed(0)}k` },
    },
    yaxis: {
      title: { text: 'รายได้/หัว (R) บาท →' },
      ...yRange,
      labels: { formatter: (v) => `${(Number(v) / 1000).toFixed(0)}k` },
    },
    markers: { size: 7, hover: { sizeOffset: 3 } },
    legend: { show: false },
    tooltip: {
      // intersect: แสดง tooltip ของจุดที่เมาส์ชี้อยู่จริง (ค่า default ของ scatter จะเดาจุดที่ "ใกล้สุด" ข้ามทุก series ทำให้บางจุดไม่แสดง)
      intersect: true,
      shared: false,
      custom: ({
        seriesIndex,
        dataPointIndex,
        w,
      }: {
        seriesIndex: number;
        dataPointIndex: number;
        w: { config: { series: { data: { meta?: (typeof chartRows)[number] }[] }[] } };
      }) => {
        const d = w.config.series[seriesIndex]?.data[dataPointIndex]?.meta;

        if (!d) return '';

        return `<div style="padding:8px 10px"><b>${d.name}</b><br/>รายได้/หัว ${fmtB(d.r)} · ต้นทุน/หัว ${fmtB(d.atc)} บาท/คน<br/>นิสิต ${fmtN(d.Q)} คน</div>`;
      },
    },
  };

  // ===== Top 8 ต้นทุน/หัว สูงสุด =====
  const topAtc = [...chartRows].sort((a, b) => b.atc - a.atc).slice(0, 8);
  const maxAtc = topAtc[0]?.atc || 1;
  // สีไล่ตามอันดับ — ตาม mockup (ชมพู → แดง → ส้ม → เหลือง → ม่วง → ม่วงอ่อน → เขียว → น้ำเงินเข้ม)
  const TOP_COLORS = [
    '#e64275',
    '#f1393d',
    '#f59628',
    '#fbbe34',
    '#6b3ff9',
    '#784ef9',
    '#009c6e',
    '#362895',
  ] as const;

  // ===== ประเด็นสำคัญ =====
  type Insight = { sev: 'success' | 'warning' | 'error' | 'info'; text: ReactNode };
  const insights: Insight[] = [];

  insights.push(
    ref.diff >= 0
      ? {
          sev: 'success',
          text: (
            <>
              เฉลี่ยทั้ง{refWord} รายได้/หัว <b>{fmtB(ref.r)} บาท</b> สูงกว่าต้นทุน/หัว{' '}
              <b>{fmtB(ref.atc)} บาท</b> อยู่ <b>+{fmtB(ref.diff)} บาท/คน</b>
            </>
          ),
        }
      : {
          sev: 'error',
          text: (
            <>
              เฉลี่ยทั้ง{refWord} <b>ขาดทุน {fmtB(Math.abs(ref.diff))} บาท/คน</b> — รายได้/หัว{' '}
              {fmtB(ref.r)} ต่ำกว่าต้นทุน/หัว {fmtB(ref.atc)} บาท
            </>
          ),
        },
  );

  const bad = allRows.filter((d) => d.diff < 0).sort((a, b) => a.diff - b.diff);
  const good = allRows.filter((d) => d.diff >= 0).sort((a, b) => b.diff - a.diff);

  if (bad.length) {
    insights.push({
      sev: bad.length >= 10 ? 'error' : 'warning',
      text: (
        <>
          <b>
            {bad.length}/{allRows.length} {unitWord}
          </b>{' '}
          มีต้นทุน/หัว สูงกว่ารายได้/หัว — ขาดทุนต่อหัวมากสุด:{' '}
          {bad
            .slice(0, 3)
            .map((d) => `${shortName(d.name)} (−${fmtB(Math.abs(d.diff))})`)
            .join(', ')}
        </>
      ),
    });
  }

  if (good.length) {
    insights.push({
      sev: 'success',
      text: (
        <>
          คุ้มค่าที่สุดต่อหัว: <b>{shortName(good[0]!.name)}</b> +{fmtB(good[0]!.diff)} บาท/คน
          (รายได้/หัว {fmtB(good[0]!.r)} · ต้นทุน/หัว {fmtB(good[0]!.atc)})
        </>
      ),
    });
  }

  const big = allRows.filter((d) => d.Q >= 3000);
  const small = allRows.filter((d) => d.Q < 1000 && !isOutlier(d));

  if (!byProgram && big.length && small.length) {
    const ab = median(big.map((d) => d.atc));
    const as = median(small.map((d) => d.atc));

    if (as > ab) {
      insights.push({
        sev: 'info',
        text: (
          <>
            <b>การประหยัดจากขนาด (Economies of Scale)</b>: คณะใหญ่ (≥3,000 คน) ต้นทุน/หัวมัธยฐาน{' '}
            <b>{fmtB(ab)}</b> บาท · คณะเล็ก (&lt;1,000 คน) <b>{fmtB(as)}</b> บาท — สูงกว่า{' '}
            <b>{(as / ab).toFixed(1)}×</b> เพราะต้นทุนคงที่กระจายบนนิสิตจำนวนน้อย
          </>
        ),
      });
    }
  }

  outlierRows.forEach((f) => {
    insights.push({
      sev: 'error',
      text: (
        <>
          <b>{f.name}</b> มีนิสิต <b>{fmtN(f.Q)} คน</b> แต่ต้นทุนรวม {(f.TC / 1e6).toFixed(1)}{' '}
          ล้านบาท → ต้นทุน/หัว {fmtB(f.atc)} บาท ({(f.atc / ref.atc).toFixed(0)}× ค่าเฉลี่ย) —
          จึงกันออกจากกราฟเพื่อให้อ่านหน่วยอื่นได้
        </>
      ),
    });
  });

  return (
    <Box>
      <PageHeaderBar
        title="รายได้ vs ต้นทุนต่อหัวนิสิต"
        mode={mode}
        onModeChange={setMode}
        q={headRes.q}
        profit={headRes.profit}
      />

      {SHOW_OVERVIEW_NOTES && (
        <>
          <DataCaveatNotes profit={uniRes.profit} />

          <NoteBar severity="info">
            <b>ต้นทุนรวมต่อหัว (ATC) และต้นทุนผันแปรต่อหัว (AVC) ไม่เปลี่ยนตามฐานรายได้</b> —
            เปลี่ยนเฉพาะ <b>รายได้ต่อหัว (R)</b> · โหมด: <b>{REVENUE_MODE_LABEL[mode]}</b> →
            รายได้ต่อหัวเฉลี่ย {fmtB(uni.r)} เทียบต้นทุนรวมต่อหัว {fmtB(uni.atc)} บาท/คน
          </NoteBar>
        </>
      )}

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" useFlexGap>
            {lockedFac ? (
              <Chip variant="outlined" icon={<i className="ri-lock-line" />} label={lockedFac} />
            ) : (
              <FacultyFilter options={FAC_NAMES} value={pickedFacs} onChange={setSelectedFacs} />
            )}
            {byProgram && (
              <ToggleButtonGroup
                size="small"
                color="primary"
                exclusive
                value={level}
                onChange={(_, v: LevelScope | null) => v && setLevel(v)}
              >
                {(Object.keys(LEVEL_SCOPE_LABEL) as LevelScope[]).map((l) => (
                  <ToggleButton key={l} value={l}>
                    {LEVEL_SCOPE_LABEL[l]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            )}
            {!lockedFac && (
              <Typography variant="body2" color="text.secondary">
                {byProgram
                  ? `แสดงรายหลักสูตร (${allRows.length}) · ค่าต่อหัวในการ์ดสรุปเป็นค่าเฉลี่ยของคณะ`
                  : isFiltered
                    ? `กำลังแสดง ${allRows.length} จาก ${RAW.FACS.length} คณะ · ค่าต่อหัวในการ์ดสรุปเป็นค่าเฉลี่ยของคณะที่เลือก`
                    : `แสดงทุกคณะ (${RAW.FACS.length}) · ค่าต่อหัวในการ์ดสรุปเป็นระดับมหาวิทยาลัย`}
              </Typography>
            )}
            <Button
              variant="outlined"
              startIcon={<i className="ri-download-2-line" />}
              onClick={exportExcel}
              disabled={allRows.length === 0}
              sx={{ marginInlineStart: 'auto' }}
            >
              ส่งออก Excel
            </Button>
            {isFiltered && !lockedFac && (
              <Button
                size="small"
                variant="text"
                color="secondary"
                startIcon={<i className="ri-close-line" />}
                onClick={() => setSelectedFacs([])}
              >
                ล้างตัวกรอง
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="รายได้ต่อหัว"
            value={fmtB(sel.r)}
            unit={`บาท/คน · ${byProgram ? 'เฉลี่ยทั้งคณะ' : isFiltered ? 'เฉลี่ยคณะที่เลือก' : 'เฉลี่ยทั้งมหาวิทยาลัย'}`}
            accent="success"
            valueColor="var(--mui-palette-success-main)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="ต้นทุนรวมต่อหัว"
            value={fmtB(sel.atc)}
            unit="บาท/คน · ต้นทุนรวม ÷ จำนวนนิสิต"
            accent="warning"
            valueColor="var(--mui-palette-warning-main)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="ส่วนต่างต่อหัว"
            value={`${sel.diff >= 0 ? '+' : '−'}${fmtB(Math.abs(sel.diff))}`}
            unit={`บาท/คน · ${sel.diff >= 0 ? 'กำไรต่อหัว' : 'ขาดทุนต่อหัว'}`}
            accent={sel.diff >= 0 ? 'success' : 'error'}
            valueColor={
              sel.diff >= 0 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)'
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label={`${unitWord}ที่รายได้ครอบคลุมต้นทุนต่อหัว`}
            value={`${nOk}/${allRows.length}`}
            unit={`${unitWord} · รายได้ต่อหัวคุ้มต้นทุนรวมต่อหัว`}
            accent="primary"
            valueColor="var(--mui-palette-primary-main)"
          />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* กราฟหลัก */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader
              sx={{ pb: 0 }}
              title={
                <DotTitle color="success.main">รายได้/หัว เทียบ ต้นทุน/หัว ราย{unitWord}</DotTitle>
              }
              subheader={
                <>
                  <Typography variant="caption" color="text.secondary" display="block">
                    แกน X = {unitWord} · แกน Y = บาท/คน · แท่งส้มสูงกว่าเขียว = ขาดทุนต่อหัว
                  </Typography>
                  {outlierRows.length > 0 && (
                    <Typography variant="caption" color="error.main" display="block">
                      กราฟไม่รวม {outlierRows.map((d) => d.name).join(', ')} —
                      ต้นทุน/หัวสูงกว่าค่าเฉลี่ย
                      {refWord}เกิน {OUTLIER_ATC_X} เท่า ดูตัวเลขในตารางด้านล่าง
                    </Typography>
                  )}
                </>
              }
              action={<Chip size="small" variant="tonal" color="success" label="บาท/คน" />}
            />
            <CardContent sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 1 }}>
                <LegendItem color={BAR_COLORS[0]} label="รายได้/หัว" />
                <LegendItem color={BAR_COLORS[1]} label="ต้นทุนรวม/หัว" />
                <LegendItem color={BAR_COLORS[2]} label="ต้นทุนผันแปร/หัว" />
              </Box>
              <AppReactApexCharts
                type="bar"
                height={500}
                width="100%"
                options={barOptions}
                series={barSeries}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Scatter + Top ATC */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title={
                <DotTitle color="primary.main">
                  กราฟการกระจาย (Scatter) — รายได้/หัว เทียบ ต้นทุน/หัว
                </DotTitle>
              }
              subheader={`แต่ละจุด = 1 ${unitWord} · สีเขียว = รายได้ต่อหัวครอบคลุมต้นทุนรวมต่อหัว (R ≥ ATC) · สีแดง = ขาดทุนต่อหัว`}
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 2 }}>
                <LegendItem color="success.main" label="คุ้มทุนต่อหัว (R ≥ ATC)" />
                <LegendItem color="error.main" label="ขาดทุนต่อหัว" />
              </Box>
              <AppReactApexCharts
                type="scatter"
                height={340}
                width="100%"
                options={scatterOptions}
                series={scatterSeries}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title={<DotTitle color={TOP_COLORS[0]}>ต้นทุน/หัว สูงสุด (Top 8)</DotTitle>}
              subheader={`เทียบกับค่าเฉลี่ย${refWord}`}
              subheaderTypographyProps={{ variant: 'caption' }}
            />
            <CardContent>
              <Stack spacing={3}>
                {topAtc.map((d, i) => (
                  <Box key={d.name}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="baseline"
                      sx={{ mb: 1 }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="text.primary"
                        noWrap
                        title={d.name}
                        sx={{ maxWidth: '60%' }}
                      >
                        {shortName(d.name)}
                      </Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ color: TOP_COLORS[i] }}>
                        {fmtB(d.atc)}{' '}
                        <Typography component="span" variant="caption" color="text.disabled">
                          {(d.atc / ref.atc).toFixed(1)}×
                        </Typography>
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        height: 7,
                        borderRadius: 4,
                        bgcolor: 'action.hover',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          borderRadius: 4,
                          bgcolor: TOP_COLORS[i],
                          width: `${(d.atc / maxAtc) * 100}%`,
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* ตาราง */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader
              title={<DotTitle color="warning.main">ตารางเปรียบเทียบต่อหัว ราย{unitWord}</DotTitle>}
              subheader="เรียงตามส่วนต่างต่อหัว"
              action={
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                  <TextField
                    size="small"
                    placeholder={`ค้นหา${unitWord} / สถานะ (คุ้ม, ขาด)...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <i className="ri-search-line" />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={statusFilter}
                    onChange={(_, v) => v && setStatusFilter(v)}
                  >
                    <ToggleButton value="all">ทั้งหมด</ToggleButton>
                    <ToggleButton value="ok">✓ คุ้ม</ToggleButton>
                    <ToggleButton value="loss">⚠ ขาด</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              }
            />
            <TableContainer>
              <Table
                size="small"
                sx={{
                  '& .MuiTableCell-body': { fontSize: '0.9375rem' },
                  '& .MuiTableCell-head': { fontSize: '0.875rem' },
                  '& .MuiTableCell-head .MuiTypography-caption': { fontSize: '0.8125rem' },
                  '& .MuiChip-label': { fontSize: '0.875rem' },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>{byProgram ? 'หลักสูตร' : 'คณะ / วิทยาลัย'}</TableCell>
                    <HeadCell label="นิสิต" unit="คน" />
                    <HeadCell label="รายได้/หัว" unit="บาท/คน" />
                    <HeadCell label="ต้นทุน/หัว" unit="บาท/คน" />
                    <HeadCell label="ผันแปร/หัว" unit="บาท/คน" />
                    <HeadCell label="ส่วนเกิน/หัว" unit="บาท/คน" />
                    <HeadCell label="ส่วนต่าง/หัว" unit="บาท/คน" />
                    <TableCell align="right">สถานะ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                        ไม่พบ{unitWord}ที่ตรงกับเงื่อนไขที่เลือก
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredRows.map((d, i) => {
                    const ok = d.diff >= 0;

                    return (
                      <TableRow key={d.name} hover>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell sx={{ maxWidth: 220, fontWeight: 600 }} title={d.name}>
                          {d.name}
                        </TableCell>
                        <TableCell align="right">{fmtN(d.Q)}</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main' }}>
                          {fmtB(d.r)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'warning.main' }}>
                          {fmtB(d.atc)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'primary.main' }}>
                          {fmtB(d.avc)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: d.cm > 0 ? 'success.main' : 'error.main' }}
                        >
                          {d.cm > 0 ? '+' : '−'}
                          {fmtB(Math.abs(d.cm))}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: ok ? 'success.main' : 'error.main', fontWeight: 700 }}
                        >
                          {ok ? '+' : '−'}
                          {fmtB(Math.abs(d.diff))}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            size="small"
                            label={ok ? '✓ คุ้ม' : '⚠ ขาด'}
                            color={ok ? 'success' : 'error'}
                            variant="tonal"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* ประเด็นสำคัญ — แบบเดียวกับ mockup: แถบซ้าย + รายการกระชับ สัญลักษณ์ตามความรุนแรง */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ borderLeft: 4, borderLeftColor: 'primary.main' }}>
            <CardHeader
              title="ประเด็นสำคัญ — ต่อหัวนิสิต"
              titleTypographyProps={{ variant: 'h6', color: 'primary.dark' }}
            />
            <CardContent
              component="ul"
              sx={{
                m: 0,
                pl: 4,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {insights.map((ins, i) => (
                <Box
                  key={i}
                  component="li"
                  sx={{
                    position: 'relative',
                    pl: 4,
                    '&::before': {
                      content: `"${INSIGHT_MARK[ins.sev].mark}"`,
                      position: 'absolute',
                      left: 0,
                      color: INSIGHT_MARK[ins.sev].color,
                      fontWeight: 700,
                    },
                  }}
                >
                  <Typography variant="body2">{ins.text}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PerheadView;
