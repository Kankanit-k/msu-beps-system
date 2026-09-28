'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

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
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
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

// Data / calc Imports
import { chargesOf, RAW, sumCharges } from '@/data/mockup';
import type { FacRow, ProgRow, UniRow } from '@/data/mockup';
import {
  computeBreakEven,
  fmtInt,
  fmtMillion,
  REVENUE_MODE_NOTE,
  shortFacName,
  statusOf,
} from '@views/breakeven/calc';
import type { BEStatus } from '@views/breakeven/calc';

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

/** ฟิลด์ที่หน้านี้ต้องใช้ — มีครบทั้งใน RAW.UNI และ RAW.FACS จึงรวมข้ามระดับได้ */
type ScopeRow = Pick<UniRow, 'Q' | 'st' | 'own' | 'tfcProg' | 'tfcOffice' | 'dep' | 'TFC' | 'TVC'>;

const EMPTY_SCOPE: ScopeRow = {
  Q: 0,
  st: 0,
  own: 0,
  tfcProg: 0,
  tfcOffice: 0,
  dep: 0,
  TFC: 0,
  TVC: 0,
};

/** รวมงบ/ต้นทุนของหลายคณะเป็นก้อนเดียว เพื่อคำนวณ KPI ของขอบเขตที่ถูกกรอง */
const sumRows = (rows: readonly ScopeRow[]): ScopeRow =>
  rows.reduce(
    (acc, r) => ({
      Q: acc.Q + r.Q,
      st: acc.st + r.st,
      own: acc.own + r.own,
      tfcProg: acc.tfcProg + r.tfcProg,
      tfcOffice: acc.tfcOffice + r.tfcOffice,
      dep: acc.dep + r.dep,
      TFC: acc.TFC + r.TFC,
      TVC: acc.TVC + r.TVC,
    }),
    EMPTY_SCOPE,
  );

const FAC_NAMES = RAW.FACS.map((f) => f.name);

const pct = (part: number, whole: number): string =>
  whole > 0 ? ((part / whole) * 100).toFixed(1) : '—';

type Coverage = 'above' | 'near' | 'below';

/**
 * สถานะความคุ้มทุนของขอบเขตที่กำลังแสดง — ใช้อัตรา TR/TC โดยมีแถบ ±5% รอบจุดคุ้มทุน
 * เพื่อไม่ให้การ์ดสลับเขียว/แดงจากส่วนต่างเพียงเล็กน้อย
 */
const coverageOf = (tr: number, tc: number): Coverage => {
  if (tc <= 0) return 'near';

  const ratio = tr / tc;

  if (ratio >= 1.05) return 'above';

  return ratio >= 0.95 ? 'near' : 'below';
};

const COVERAGE_ACCENT: Record<Coverage, 'success' | 'warning' | 'error'> = {
  above: 'success',
  near: 'warning',
  below: 'error',
};

const COVERAGE_LABEL: Record<Coverage, string> = {
  above: 'สูงกว่าจุดคุ้มทุน',
  near: 'ใกล้จุดคุ้มทุน',
  below: 'ต่ำกว่าจุดคุ้มทุน',
};

/** ป้ายสถานะรายหลักสูตร — คำสั้นสำหรับตาราง (ชุดเดียวกับ W2 เจาะลึกจุดคุ้มทุน) */
const PROG_STATUS_LABEL: Record<BEStatus, string> = {
  ok: 'คุ้มทุน',
  loss: 'ต่ำกว่าจุดคุ้มทุน',
  fcr: 'R ≤ AVC',
  none: 'ไม่มีข้อมูล',
};

const PROG_STATUS_COLOR: Record<BEStatus, 'success' | 'error' | 'warning' | 'default'> = {
  ok: 'success',
  loss: 'error',
  fcr: 'warning',
  none: 'default',
};

/** เน้นเฉพาะคณะที่ถูกหักสมทบสูงผิดจากกลุ่ม (ค่าเฉลี่ยทั้งมหาวิทยาลัยอยู่ราว 27%) */
const chargeShareColor = (share: number): 'warning' | 'default' =>
  share >= 0.35 ? 'warning' : 'default';

/** จัดกลุ่มระดับการศึกษาของหลักสูตรให้เหลือ 4 กลุ่มที่อ่านง่ายบนโดนัท */
const LEVEL_ORDER = ['ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก', 'อื่น ๆ'] as const;

const levelOf = (lvl: string): (typeof LEVEL_ORDER)[number] =>
  (LEVEL_ORDER as readonly string[]).includes(lvl)
    ? (lvl as (typeof LEVEL_ORDER)[number])
    : 'อื่น ๆ';

const LEVEL_COLOR: Record<(typeof LEVEL_ORDER)[number], string> = {
  ปริญญาตรี: 'var(--mui-palette-primary-main)',
  ปริญญาโท: 'var(--mui-palette-success-main)',
  ปริญญาเอก: 'var(--mui-palette-warning-main)',
  'อื่น ๆ': 'var(--mui-palette-secondary-main)',
};

type Alert = {
  severity: 'error' | 'warning' | 'success' | 'info';
  title: string;
  detail: string;
};

const ALERT_ICON: Record<Alert['severity'], string> = {
  error: 'ri-error-warning-fill',
  warning: 'ri-alert-fill',
  success: 'ri-checkbox-circle-fill',
  info: 'ri-information-fill',
};

const RevenueView = () => {
  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [selectedFacs, setSelectedFacs] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ไม่เลือกคณะใดเลย = ดูทุกคณะ (พฤติกรรมเดิมของหน้า)
  const facs: FacRow[] = useMemo(
    () => (selectedFacs.length ? RAW.FACS.filter((f) => selectedFacs.includes(f.name)) : RAW.FACS),
    [selectedFacs],
  );

  const isFiltered = selectedFacs.length > 0;
  const scopeLabel =
    !isFiltered || facs.length === 0
      ? 'ทั้งมหาวิทยาลัย'
      : ((facs.length === 1 ? facs[0]?.name : undefined) ?? `${facs.length} คณะที่เลือก`);

  // ขอบเขตที่กำลังแสดง — ทั้งมหาวิทยาลัยเมื่อไม่กรอง / ผลรวมของคณะที่เลือกเมื่อกรอง
  const scope = useMemo<ScopeRow>(() => (isFiltered ? sumRows(facs) : RAW.UNI), [isFiltered, facs]);

  const uni = useMemo(() => computeBreakEven(RAW.UNI, mode), [mode]);
  const scopeRes = useMemo(() => computeBreakEven(scope, mode), [scope, mode]);

  const rows = useMemo(
    () =>
      facs.map((fac) => ({ fac, res: computeBreakEven(fac, mode), charges: chargesOf(fac.name) })),
    [facs, mode],
  );

  // หลักสูตรในขอบเขตที่กำลังแสดง — เรียงส่วนต่างจากน้อยไปมาก เพื่อให้หลักสูตรที่มีปัญหาขึ้นก่อน
  const progRows = useMemo(() => {
    const inScope: ProgRow[] = isFiltered
      ? RAW.PROGS.filter((p) => selectedFacs.includes(p.fac))
      : RAW.PROGS;

    return inScope
      .map((p) => {
        const res = computeBreakEven(p, mode);

        return { p, res, status: statusOf(res) };
      })
      .sort((a, b) => a.res.profit - b.res.profit);
  }, [isFiltered, selectedFacs, mode]);

  // ตัวกรอง/โหมดเปลี่ยน = ชุดข้อมูลเปลี่ยน จึงกลับไปหน้าแรกของตารางเสมอ
  useEffect(() => setPage(0), [selectedFacs, mode]);

  // สถานะคุ้มทุนของขอบเขตที่กำลังแสดง — ใช้ระบายสีการ์ด KPI และเกจ
  const coverage = coverageOf(scopeRes.tr, scopeRes.tc);
  const coverageAccent = COVERAGE_ACCENT[coverage];
  const coverageColor = `var(--mui-palette-${coverageAccent}-main)`;
  const coverageRatio = scopeRes.tc > 0 ? (scopeRes.tr / scopeRes.tc) * 100 : null;

  // เกจจุดคุ้มทุน — Q เทียบ Q* (คนละตัวกับอัตรา TR/TC แต่ชี้เรื่องเดียวกัน)
  const qStar = scopeRes.qStar;
  const qRatio = qStar && qStar > 0 ? (scopeRes.q / qStar) * 100 : null;
  const qGap = qStar === null ? null : scopeRes.q - qStar;

  // สถานะของเกจอิงอัตรา Q/Q* ของตัวเอง ไม่ใช่ TR/TC ของการ์ด KPI — จะได้ไม่ขัดกันเองเมื่อสองอัตราคาบเส้นคนละฝั่ง
  const qCoverage = qRatio === null ? 'below' : coverageOf(qRatio, 100);

  // เงินสมทบของขอบเขตที่กำลังแสดง — ใช้กับชิปสรุปเหนือตาราง
  const scopeCharges = useMemo(() => sumCharges(facs.map((f) => f.name)), [facs]);

  // รายได้แยกตามระดับการศึกษา (แทนการแยก "ประเภทรายได้" ที่ชุดข้อมูลนี้ยังไม่มี)
  const byLevel = useMemo(() => {
    const acc = new Map<string, number>(LEVEL_ORDER.map((l) => [l, 0]));

    for (const { p, res } of progRows)
      acc.set(levelOf(p.lvl), (acc.get(levelOf(p.lvl)) ?? 0) + res.tr);

    return LEVEL_ORDER.map((label) => ({
      label,
      value: acc.get(label) ?? 0,
      color: LEVEL_COLOR[label],
    })).filter((s) => s.value > 0);
  }, [progRows]);

  const levelTotal = byLevel.reduce((a, s) => a + s.value, 0);

  // โครงสร้างต้นทุนของขอบเขต — คงที่ 3 ก้อน + ผันแปร (รวมแล้วเท่ากับ TC ที่ใช้ในการ์ด KPI)
  const costParts = [
    {
      label: 'ต้นทุนคงที่ — หลักสูตร (ทางตรง)',
      value: scope.tfcProg,
      color: 'var(--mui-palette-primary-main)',
    },
    {
      label: 'ต้นทุนคงที่ — ปันส่วนสำนักงาน',
      value: scope.tfcOffice,
      color: 'var(--mui-palette-info-main)',
    },
    { label: 'ค่าเสื่อมราคา', value: scope.dep, color: 'var(--mui-palette-success-main)' },
    {
      label: 'ต้นทุนผันแปร (TVC)',
      value: scope.TVC,
      color: 'var(--mui-palette-warning-main)',
    },
  ];

  // ประเด็นที่ควรติดตาม — สรุปจากข้อมูลจริงของขอบเขตที่กำลังแสดง ไม่ใช่ข้อความตายตัว
  const alerts = useMemo<Alert[]>(() => {
    const list: Alert[] = [];
    const loss = progRows.filter((r) => r.status === 'loss');
    const fcr = progRows.filter((r) => r.status === 'fcr');
    const lossFacs = rows.filter((r) => r.res.profit < 0);
    const heavyCharge = rows.filter((r) => r.fac.own > 0 && r.charges.total / r.fac.own >= 0.35);

    if (loss.length)
      list.push({
        severity: 'error',
        title: `${fmtInt(loss.length)} หลักสูตร ต่ำกว่าจุดคุ้มทุน`,
        detail: `ส่วนขาดรวม ${fmtMillion(loss.reduce((a, r) => a + r.res.profit, 0) * -1)} ลบ. · ต้องเพิ่มนิสิตรวม ${fmtInt(
          loss.reduce((a, r) => a + ((r.res.qStar ?? r.res.q) - r.res.q), 0),
        )} คน จึงคุ้มทุน`,
      });

    if (fcr.length)
      list.push({
        severity: 'error',
        title: `${fmtInt(fcr.length)} หลักสูตร ไม่มีจุดคุ้มทุน (R ≤ AVC)`,
        detail: 'รายได้ต่อหัวต่ำกว่าต้นทุนผันแปรต่อหัว — เพิ่มจำนวนนิสิตอย่างเดียวไม่ช่วย',
      });

    if (lossFacs.length) {
      // คณะที่ส่วนต่างติดลบมากที่สุด — ยกมาเป็นตัวอย่างในบรรทัดรายละเอียด
      const worst = lossFacs.reduce((a, b) => (b.res.profit < a.res.profit ? b : a));

      list.push({
        severity: 'warning',
        title: `${fmtInt(lossFacs.length)} คณะ มีส่วนต่างติดลบ`,
        detail: `ติดลบมากสุด ${shortFacName(worst.fac.name)} ${fmtMillion(-worst.res.profit)} ลบ.`,
      });
    }

    if (heavyCharge.length)
      list.push({
        severity: 'warning',
        title: `${fmtInt(heavyCharge.length)} คณะ ถูกหักสมทบเกิน 35% ของเงินรายได้`,
        detail: `ค่าเฉลี่ยของขอบเขตนี้อยู่ที่ ${pct(scopeCharges.total, scope.own)}% — ตรวจอัตราสมทบ/ค่าธรรมเนียมรายการหลัก`,
      });

    if (mode === 'with_government' && scope.st > 0)
      list.push({
        severity: 'info',
        title: `พึ่งพาเงินแผ่นดิน ${pct(scope.st, scopeRes.tr)}% ของรายได้`,
        detail: 'สลับโหมดเป็น "ไม่รวมเงินแผ่นดิน" เพื่อดูว่าเลี้ยงตัวเองได้แค่ไหน',
      });

    if (scopeRes.profit >= 0)
      list.push({
        severity: 'success',
        title: `${scopeLabel} มีส่วนเกิน +${fmtMillion(scopeRes.profit)} ลบ.`,
        detail: `อัตราความคุ้มทุน ${coverageRatio === null ? '—' : `${coverageRatio.toFixed(1)}%`} — พิจารณาอุ้มหลักสูตรเชิงยุทธศาสตร์แบบมีเพดาน`,
      });

    return list;
  }, [progRows, rows, mode, scope, scopeRes, scopeCharges, coverageRatio, scopeLabel]);

  // กราฟองค์ประกอบรายได้ — แสดงเงินแผ่นดินและเงินรายได้เสมอ ไม่ขึ้นกับโหมดฐานรายได้
  // เพราะจุดประสงค์คือเทียบสัดส่วนแหล่งเงินของแต่ละคณะ (ตรงกับ mockup)
  const stackedOptions: ApexOptions = {
    chart: { type: 'bar', stacked: true, toolbar: { show: false }, parentHeightOffset: 0 },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '70%' } },
    colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-warning-main)'],
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    legend: { show: false },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: facs.map((f) => shortFacName(f.name)),
      labels: { style: { fontSize: '11px' } },
    },
    yaxis: { labels: { style: { fontSize: '10px' }, maxWidth: 240 } },
    tooltip: {
      y: {
        formatter: (v: number) => `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ.`,
      },
    },
  };
  const stackedSeries = [
    {
      name: 'เงินรายได้ (ค่าธรรมเนียม)',
      data: facs.map((f) => Number((f.own / 1e6).toFixed(2))),
    },
    { name: 'เงินแผ่นดิน', data: facs.map((f) => Number((f.st / 1e6).toFixed(2))) },
  ];

  // เกจครึ่งวงกลม — ApexCharts radialBar รับได้แค่ 0–100 จึงตัดปลายไว้ที่ 100 แล้วแสดงค่าจริงบนป้าย
  const gaugeOptions: ApexOptions = {
    chart: { type: 'radialBar', sparkline: { enabled: true } },
    colors: [`var(--mui-palette-${COVERAGE_ACCENT[qCoverage]}-main)`],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '64%' },
        track: { background: 'var(--mui-palette-divider)', strokeWidth: '100%' },
        dataLabels: {
          name: { offsetY: 24, fontSize: '0.75rem', color: 'var(--mui-palette-text-secondary)' },
          value: {
            offsetY: -14,
            fontSize: '1.75rem',
            fontWeight: 700,
            color: `var(--mui-palette-${COVERAGE_ACCENT[qCoverage]}-main)`,
            formatter: () => (qRatio === null ? '—' : `${qRatio.toFixed(1)}%`),
          },
        },
      },
    },
    stroke: { lineCap: 'round' },
    labels: [qRatio === null ? 'ไม่มีจุดคุ้มทุน' : `Q/Q* · ${COVERAGE_LABEL[qCoverage]}`],
  };
  const gaugeSeries = [qRatio === null ? 0 : Math.min(qRatio, 100)];

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', parentHeightOffset: 0 },
    labels: byLevel.map((s) => s.label),
    colors: byLevel.map((s) => s.color),
    stroke: { width: 3, colors: ['var(--mui-palette-background-paper)'] },
    legend: { show: false },
    dataLabels: { enabled: false },
    tooltip: {
      y: {
        formatter: (v: number) => `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ.`,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            name: { fontSize: '0.75rem' },
            value: {
              fontSize: '1.25rem',
              fontWeight: 700,
              formatter: (v: string) => fmtMillion(Number(v) * 1e6),
            },
            total: {
              show: true,
              label: 'รวม',
              fontSize: '0.75rem',
              formatter: () => fmtMillion(levelTotal),
            },
          },
        },
      },
    },
  };
  const donutSeries = byLevel.map((s) => Number((s.value / 1e6).toFixed(2)));

  const pagedProgs = progRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <PageHeaderBar
        title="รายได้รายคณะ"
        code="W4"
        mode={mode}
        onModeChange={setMode}
        q={uni.q}
        profit={uni.profit}
      />

      {SHOW_OVERVIEW_NOTES && (
        <>
          <DataCaveatNotes profit={uni.profit} />

          <NoteBar severity="info">{REVENUE_MODE_NOTE[mode]}</NoteBar>
        </>
      )}

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" useFlexGap>
            <FacultyFilter options={FAC_NAMES} value={selectedFacs} onChange={setSelectedFacs} />
            <Typography variant="body2" color="text.secondary">
              {isFiltered
                ? `กำลังแสดง ${facs.length} จาก ${RAW.FACS.length} คณะ · ตัวเลขสรุปเป็นผลรวมของคณะที่เลือก`
                : `แสดงทุกคณะ (${RAW.FACS.length}) · ตัวเลขสรุปเป็นระดับมหาวิทยาลัย`}
            </Typography>
            {isFiltered && (
              <Button
                size="small"
                variant="text"
                color="secondary"
                startIcon={<i className="ri-close-line" />}
                onClick={() => setSelectedFacs([])}
                sx={{ marginInlineStart: 'auto' }}
              >
                ล้างตัวกรอง
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* แถบ KPI ผู้บริหาร — 5 ตัวเลขที่ตอบคำถาม "คณะนี้คุ้มทุนไหม" ได้ในบรรทัดเดียว */}
      <Grid container spacing={4} columns={{ xs: 2, sm: 4, md: 10 }} sx={{ mb: 2 }}>
        <Grid size={2}>
          <KpiCard
            label={mode === 'with_government' ? 'รายได้รวม (TR)' : 'เงินรายได้ (ค่าธรรมเนียม)'}
            value={fmtMillion(scopeRes.tr)}
            unit={
              mode === 'with_government'
                ? `ล้านบาท · แผ่นดิน ${fmtMillion(scope.st)} + รายได้ ${fmtMillion(scope.own)}`
                : 'ล้านบาท · ไม่รวมเงินแผ่นดิน'
            }
            accent="primary"
            valueColor="var(--mui-palette-primary-main)"
          />
        </Grid>
        <Grid size={2}>
          <KpiCard
            label="ต้นทุนรวม (TC)"
            value={fmtMillion(scopeRes.tc)}
            unit={`ล้านบาท · คงที่ ${fmtMillion(scopeRes.tfc)} + ผันแปร ${fmtMillion(scopeRes.tvc)}`}
            accent="secondary"
          />
        </Grid>
        <Grid size={2}>
          <KpiCard
            label="ส่วนต่าง (รายได้ − ต้นทุน)"
            value={`${scopeRes.profit >= 0 ? '+' : '−'}${fmtMillion(Math.abs(scopeRes.profit))}`}
            unit={`ล้านบาท · ${pct(Math.abs(scopeRes.profit), scopeRes.tr)}% ของรายได้`}
            accent={coverageAccent}
            valueColor={coverageColor}
          />
        </Grid>
        <Grid size={2}>
          <KpiCard
            label="อัตราความคุ้มทุน (TR/TC)"
            value={coverageRatio === null ? '—' : `${coverageRatio.toFixed(1)}%`}
            unit={COVERAGE_LABEL[coverage]}
            accent={coverageAccent}
            valueColor={coverageColor}
          />
        </Grid>
        <Grid size={2}>
          <KpiCard
            label="รายได้เฉลี่ย / นิสิต (R)"
            value={fmtInt(scopeRes.r)}
            unit={`บาท/คน · ต้นทุน/หัว ${fmtInt(scopeRes.atc)} บาท`}
            accent="success"
            valueColor="var(--mui-palette-success-main)"
          />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 4, paddingInline: 1 }}>
        <LegendItem color="success.main" label="สูงกว่าจุดคุ้มทุน (TR/TC ≥ 105%)" />
        <LegendItem color="warning.main" label="ใกล้จุดคุ้มทุน (95–105%)" />
        <LegendItem color="error.main" label="ต่ำกว่าจุดคุ้มทุน (< 95%)" />
      </Box>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardHeader
              title={<DotTitle color="primary.main">องค์ประกอบรายได้รายคณะ</DotTitle>}
              subheader="เงินแผ่นดิน + เงินรายได้ (ล้านบาท)"
              action={
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    variant="tonal"
                    color="primary"
                    label={`เงินรายได้ ${fmtMillion(scope.own)} ลบ.`}
                  />
                  <Chip
                    size="small"
                    variant="tonal"
                    color="warning"
                    label={`เงินแผ่นดิน ${fmtMillion(scope.st)} ลบ.`}
                  />
                </Stack>
              }
            />
            <CardContent>
              {facs.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 10 }}>
                  ไม่มีคณะที่ตรงกับตัวกรอง
                </Typography>
              ) : (
                <>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 2 }}>
                    <LegendItem color="primary.main" label="เงินรายได้ (ค่าธรรมเนียม)" />
                    <LegendItem color="warning.main" label="เงินแผ่นดิน" />
                  </Box>
                  <AppReactApexCharts
                    type="bar"
                    height={Math.max(420, facs.length * 26)}
                    width="100%"
                    options={stackedOptions}
                    series={stackedSeries}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* เกจจุดคุ้มทุน — Q เทียบ Q* ของขอบเขตที่กำลังแสดง */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardHeader
              title={<DotTitle color="success.main">จุดคุ้มทุนของ{scopeLabel}</DotTitle>}
              subheader="เทียบจำนวนนิสิตปัจจุบันกับจุดคุ้มทุน (Q*)"
            />
            <CardContent>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Box sx={{ textAlign: 'center', minInlineSize: 96 }}>
                  <Typography variant="caption" color="text.secondary">
                    จุดคุ้มทุน (Q*)
                  </Typography>
                  <Typography className="num" variant="h4" fontWeight={700}>
                    {fmtInt(qStar)}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    คน
                  </Typography>
                </Box>
                <Box sx={{ inlineSize: 220, maxInlineSize: '45%' }}>
                  <AppReactApexCharts
                    type="radialBar"
                    height={210}
                    width="100%"
                    options={gaugeOptions}
                    series={gaugeSeries}
                  />
                </Box>
                <Box sx={{ textAlign: 'center', minInlineSize: 96 }}>
                  <Typography variant="caption" color="text.secondary">
                    นิสิตปัจจุบัน
                  </Typography>
                  <Typography className="num" variant="h4" fontWeight={700}>
                    {fmtInt(scopeRes.q)}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    คน
                  </Typography>
                </Box>
              </Stack>

              {qStar === null ? (
                <NoteBar severity="warning">
                  รายได้ต่อหัว (R) ไม่สูงกว่าต้นทุนผันแปรต่อหัว (AVC) จึงไม่มีจุดคุ้มทุน ณ
                  ระดับราคาปัจจุบัน — ต้องปรับค่าธรรมเนียมหรือลดต้นทุนผันแปร ไม่ใช่เพิ่มจำนวนนิสิต
                </NoteBar>
              ) : (
                <>
                  <LinearProgress
                    variant="determinate"
                    color={COVERAGE_ACCENT[qCoverage]}
                    value={Math.min((scopeRes.q / Math.max(qStar, scopeRes.q)) * 100, 100)}
                    sx={{ blockSize: 10, borderRadius: 5, mb: 2 }}
                  />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      0
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      จุดคุ้มทุน {fmtInt(qStar)} คน
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ปัจจุบัน {fmtInt(scopeRes.q)} คน
                    </Typography>
                  </Stack>
                  <Typography
                    align="center"
                    fontWeight={700}
                    sx={{ mt: 4, color: `var(--mui-palette-${COVERAGE_ACCENT[qCoverage]}-main)` }}
                    className="num"
                  >
                    {(qGap ?? 0) >= 0 ? 'สูงกว่าจุดคุ้มทุน +' : 'ต่ำกว่าจุดคุ้มทุน −'}
                    {fmtInt(Math.abs(qGap ?? 0))} คน ({pct(Math.abs(qGap ?? 0), qStar)}%)
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 4 }}>
        <CardHeader
          title={<DotTitle color="success.main">ตารางรายได้ · ต้นทุน · ส่วนเกิน รายคณะ</DotTitle>}
          subheader={`${facs.length} คณะ/วิทยาลัย · หน่วยล้านบาท ยกเว้นรายได้ต่อนิสิต 1 คน (บาท) และจำนวนนิสิตจุดคุ้มทุน (คน) · เงินสมทบเป็นข้อมูลประกอบ นับรวมอยู่ในต้นทุนผันแปรของต้นทุนรวมแล้ว`}
          action={
            <Tooltip title="เงินสมทบมหาวิทยาลัย + ค่าธรรมเนียมรายการหลัก ที่หักตามรายหัวนิสิต ของคณะที่กำลังแสดง">
              <Chip
                size="small"
                variant="tonal"
                color="warning"
                label={`หักสมทบรวม ${fmtMillion(scopeCharges.total)} ลบ.${
                  scope.own > 0 ? ` · ${pct(scopeCharges.total, scope.own)}% ของเงินรายได้` : ''
                }`}
              />
            </Tooltip>
          }
        />
        <TableContainer sx={{ maxBlockSize: 460 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>คณะ</TableCell>
                <TableCell align="right">นิสิต</TableCell>
                <TableCell align="right">
                  <Tooltip
                    title={
                      mode === 'with_government'
                        ? 'รายได้รวมทั้งหมดของคณะ (เงินรายได้ + งบประมาณแผ่นดิน)'
                        : 'รายได้ของคณะเฉพาะส่วนเงินรายได้ ไม่รวมงบประมาณแผ่นดิน'
                    }
                  >
                    <span>{mode === 'with_government' ? 'รายได้รวม' : 'เงินรายได้'}</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="ต้นทุนรวมของคณะ = ต้นทุนคงที่ + ต้นทุนผันแปร">
                    <span>ต้นทุนรวม</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="เงินสมทบมหาวิทยาลัย + ค่าธรรมเนียมรายการหลัก ที่หักตามรายหัวนิสิต — นับรวมอยู่ในต้นทุนรวมแล้ว">
                    <span>เงินสมทบ</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="สัดส่วนเงินสมทบที่ถูกหัก เทียบกับเงินรายได้ของคณะ">
                    <span>% ของเงินรายได้</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="ส่วนเกิน = รายได้รวม − ต้นทุนรวม (ติดลบคือขาดทุน)">
                    <span>ส่วนเกิน (กำไร/ขาดทุน)</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="รายได้เฉลี่ยที่คณะได้รับต่อนิสิต 1 คน (บาท)">
                    <span>รายได้ต่อนิสิต 1 คน</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="จำนวนนิสิตที่ต้องมี เพื่อให้รายได้เท่ากับต้นทุนพอดี (จุดคุ้มทุน)">
                    <span>จำนวนนิสิตจุดคุ้มทุน</span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    ไม่มีคณะที่ตรงกับตัวกรอง — ลองล้างตัวกรองเพื่อดูทุกคณะ
                  </TableCell>
                </TableRow>
              )}
              {rows.map(({ fac, res, charges }, i) => (
                <TableRow key={fac.name} hover>
                  <TableCell sx={{ color: 'text.disabled', fontWeight: 700 }}>{i + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{fac.name}</TableCell>
                  <TableCell align="right">{fmtInt(fac.Q)}</TableCell>
                  <TableCell align="right">{fmtMillion(res.tr)}</TableCell>
                  <TableCell align="right">{fmtMillion(res.tc)}</TableCell>
                  <TableCell align="right">
                    <Tooltip
                      title={`สมทบมหาวิทยาลัย ${fmtMillion(charges.uni)} + รายการหลัก ${fmtMillion(charges.main)} ลบ. · วิชาศึกษาทั่วไป (GE) อีก ${fmtMillion(charges.genEd)} ลบ.`}
                    >
                      <span>{fmtMillion(charges.total)}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    {fac.own > 0 ? (
                      <Chip
                        size="small"
                        variant="tonal"
                        color={chargeShareColor(charges.total / fac.own)}
                        label={`${((charges.total / fac.own) * 100).toFixed(0)}%`}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: res.profit >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}
                  >
                    {res.profit >= 0 ? '+' : '−'}
                    {fmtMillion(Math.abs(res.profit))}
                  </TableCell>
                  <TableCell align="right">{fmtInt(res.r)}</TableCell>
                  <TableCell align="right" sx={{ color: 'error.main' }}>
                    {fmtInt(res.qStar)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* รายได้ − ต้นทุน รายหลักสูตร — เรียงส่วนต่างน้อยสุดขึ้นก่อน */}
      <Card sx={{ mb: 4 }}>
        <CardHeader
          title={<DotTitle color="primary.main">รายได้ − ต้นทุน แยกตามหลักสูตร</DotTitle>}
          subheader={`${fmtInt(progRows.length)} หลักสูตรใน${scopeLabel} · เรียงจากส่วนต่างน้อยสุด · หน่วยบาท`}
          action={
            <Chip
              size="small"
              variant="tonal"
              color="error"
              label={`ยังไม่คุ้มทุน ${fmtInt(progRows.filter((r) => r.status !== 'ok').length)} จาก ${fmtInt(progRows.length)} หลักสูตร`}
            />
          }
        />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>หลักสูตร</TableCell>
                {!isFiltered && <TableCell>คณะ</TableCell>}
                <TableCell>ระดับ</TableCell>
                <TableCell align="right">นิสิต</TableCell>
                <TableCell align="right">รายได้</TableCell>
                <TableCell align="right">ต้นทุน</TableCell>
                <TableCell align="right">ส่วนต่าง</TableCell>
                <TableCell align="right">อัตราคุ้มทุน</TableCell>
                <TableCell align="right">Q*</TableCell>
                <TableCell>สถานะ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedProgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isFiltered ? 10 : 11} align="center" sx={{ py: 6 }}>
                    ไม่มีหลักสูตรที่ตรงกับตัวกรอง — ลองล้างตัวกรองเพื่อดูทุกคณะ
                  </TableCell>
                </TableRow>
              )}
              {pagedProgs.map(({ p, res, status }, i) => (
                <TableRow key={`${p.fac}-${p.prog}-${p.lvl}`} hover>
                  <TableCell sx={{ color: 'text.disabled', fontWeight: 700 }}>
                    {page * rowsPerPage + i + 1}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{p.prog}</TableCell>
                  {!isFiltered && (
                    <TableCell sx={{ color: 'text.secondary' }}>{shortFacName(p.fac)}</TableCell>
                  )}
                  <TableCell sx={{ color: 'text.secondary' }}>{p.lvl}</TableCell>
                  <TableCell align="right">{fmtInt(p.Q)}</TableCell>
                  <TableCell align="right">{fmtInt(res.tr)}</TableCell>
                  <TableCell align="right">{fmtInt(res.tc)}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: res.profit >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}
                  >
                    {res.profit >= 0 ? '+' : '−'}
                    {fmtInt(Math.abs(res.profit))}
                  </TableCell>
                  <TableCell align="right">
                    {res.tc > 0 ? `${pct(res.tr, res.tc)}%` : '—'}
                  </TableCell>
                  <TableCell align="right">{fmtInt(res.qStar)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="tonal"
                      color={PROG_STATUS_COLOR[status]}
                      label={PROG_STATUS_LABEL[status]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={progRows.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="แถวต่อหน้า"
        />
      </Card>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardHeader
              title={<DotTitle color="primary.main">รายได้แยกตามระดับการศึกษา</DotTitle>}
              subheader="ชุดข้อมูลนี้ยังไม่แยก “ประเภทรายได้” (บริการวิชาการ/งานวิจัย) จึงแยกตามระดับหลักสูตรแทน"
            />
            <CardContent>
              {byLevel.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 10 }}>
                  ไม่มีหลักสูตรที่ตรงกับตัวกรอง
                </Typography>
              ) : (
                <>
                  <AppReactApexCharts
                    type="donut"
                    height={260}
                    width="100%"
                    options={donutOptions}
                    series={donutSeries}
                  />
                  <Stack spacing={2} sx={{ mt: 4 }}>
                    {byLevel.map((s) => (
                      <Box
                        key={s.label}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 2,
                          p: 2,
                          borderRadius: 1,
                          border: 1,
                          borderColor: 'divider',
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                        >
                          <Box
                            component="span"
                            sx={{ width: 11, height: 11, borderRadius: '3px', bgcolor: s.color }}
                          />
                          {s.label}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                          {fmtMillion(s.value)} ลบ.{' '}
                          <Typography component="span" variant="caption" color="text.secondary">
                            {pct(s.value, levelTotal)}%
                          </Typography>
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardHeader
              title={<DotTitle color="warning.main">ต้นทุนไปอยู่ที่ไหน</DotTitle>}
              subheader={`รวม ${fmtMillion(scopeRes.tc)} ล้านบาท · ชุดข้อมูลนี้ไม่มีตัวเลขย้อนหลัง จึงเทียบองค์ประกอบแทนการเทียบปีก่อน`}
            />
            <CardContent>
              <Stack spacing={3}>
                {costParts.map((c) => (
                  <Box key={c.label}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {c.label}
                      </Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                        {fmtMillion(c.value)} ลบ.{' '}
                        <Typography component="span" variant="caption" color="text.secondary">
                          {pct(c.value, scopeRes.tc)}%
                        </Typography>
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        blockSize: 8,
                        borderRadius: 4,
                        bgcolor: 'action.hover',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          blockSize: '100%',
                          inlineSize: `${scopeRes.tc > 0 ? Math.min((c.value / scopeRes.tc) * 100, 100) : 0}%`,
                          bgcolor: c.color,
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
              <NoteBar severity="info">
                ต้นทุนคงที่คิดเป็น {pct(scopeRes.tfc, scopeRes.tc)}% ของต้นทุนรวม —
                ยิ่งสัดส่วนคงที่สูง จุดคุ้มทุน (Q*) ยิ่งไวต่อจำนวนนิสิต
              </NoteBar>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardHeader
              title={<DotTitle color="error.main">ประเด็นที่ควรติดตาม</DotTitle>}
              subheader={`สรุปจากข้อมูลของ${scopeLabel} ตามโหมดฐานรายได้ที่เลือก`}
            />
            <CardContent>
              {alerts.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 10 }}>
                  ไม่พบประเด็นที่ต้องติดตามในขอบเขตนี้
                </Typography>
              ) : (
                <Stack spacing={3}>
                  {alerts.map((a) => (
                    <Box
                      key={a.title}
                      sx={{
                        display: 'flex',
                        gap: 3,
                        p: 3,
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderInlineStartWidth: 3,
                        borderInlineStartColor: `${a.severity}.main`,
                      }}
                    >
                      <Box
                        component="i"
                        className={ALERT_ICON[a.severity]}
                        sx={{ color: `${a.severity}.main`, fontSize: '1.25rem', lineHeight: 1.2 }}
                      />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {a.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {a.detail}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RevenueView;
