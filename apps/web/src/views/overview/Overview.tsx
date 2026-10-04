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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';

import type { ApexOptions } from 'apexcharts';

// Component Imports
import { DotTitle, LegendItem } from '@components/ChartBits';
import DataCaveatNotes, { SHOW_OVERVIEW_NOTES } from '@components/DataCaveatNotes';
import FacultyFilter from '@components/FacultyFilter';
import KpiCard from '@components/KpiCard';
import NoteBar from '@components/NoteBar';
import PageHeaderBar from '@components/PageHeaderBar';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import type { RevenueMode } from '@beps/calc-engine';
import {
  computeBreakEven,
  fmtInt,
  fmtMillion,
  sheetQStar,
  shortFacName,
  sumRows,
  REVENUE_MODE_NOTE,
} from '@views/breakeven/calc';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

const TR_COLOR = '#3492ec';
const TC_COLOR = '#e64981';

const FAC_NAMES = RAW.FACS.map((f) => f.name);

const Overview = () => {
  const [mode, setMode] = useState<RevenueMode>('with_government');

  const [selectedFacs, setSelectedFacs] = useState<string[]>([]);

  // ไม่เลือกคณะใดเลย = ทั้งมหาวิทยาลัย (พฤติกรรมเดิมของหน้า)
  const isFiltered = selectedFacs.length > 0;
  const facs = useMemo(
    () => (isFiltered ? RAW.FACS.filter((f) => selectedFacs.includes(f.name)) : RAW.FACS),
    [isFiltered, selectedFacs],
  );
  const progs = useMemo(
    () => (isFiltered ? RAW.PROGS.filter((p) => selectedFacs.includes(p.fac)) : RAW.PROGS),
    [isFiltered, selectedFacs],
  );
  const scopeLabel = !isFiltered
    ? 'ทั้งมหาวิทยาลัย'
    : facs.length === 1 && facs[0]
      ? shortFacName(facs[0].name)
      : `${facs.length} คณะที่เลือก`;

  const uni = useMemo(
    () => computeBreakEven(isFiltered ? sumRows(facs) : RAW.UNI, mode),
    [isFiltered, facs, mode],
  );
  const dep = isFiltered ? facs.reduce((a, f) => a + f.dep, 0) : RAW.UNI.dep;

  // Q* ให้ตรงกับชีต: รายหลักสูตรแล้วบวกขึ้นเป็นคณะ/มหาวิทยาลัย (ไม่ใช่ Q* จากยอดรวม)
  const progQStars = useMemo(
    () => progs.map((p) => ({ p, qStar: sheetQStar(p, mode) })),
    [progs, mode],
  );
  const facQStar = useMemo(() => {
    const m = new Map<string, number>();

    progQStars.forEach(({ p, qStar }) => m.set(p.fac, (m.get(p.fac) ?? 0) + qStar));

    return m;
  }, [progQStars]);
  const uniQStar = progQStars.reduce((a, x) => a + x.qStar, 0);
  const progLoss = progQStars.filter(({ p, qStar }) => p.Q < qStar).length;

  const facResults = useMemo(
    () =>
      facs.map((f) => ({
        fac: f,
        res: computeBreakEven(f, mode),
        qStar: facQStar.get(f.name) ?? 0,
      })),
    [facs, mode, facQStar],
  );

  const sortedByProfit = useMemo(
    () => [...facResults].sort((a, b) => b.res.profit - a.res.profit),
    [facResults],
  );
  const top = sortedByProfit.filter((x) => x.res.profit > 0).slice(0, 6);
  const bottom = [...sortedByProfit]
    .filter((x) => x.res.profit < 0)
    .reverse()
    .slice(0, 6);

  const nLoss = facResults.filter((x) => x.res.profit < 0).length;

  const best = sortedByProfit[0];
  const worst = sortedByProfit[sortedByProfit.length - 1];

  // กราฟแท่งเรียงตามจำนวนนิสิตเหมือน mockup — คณะใหญ่สุดอยู่บนสุด
  const barRows = useMemo(() => [...facResults].sort((a, b) => b.fac.Q - a.fac.Q), [facResults]);

  const barOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, parentHeightOffset: 0 },
    // borderRadiusApplication 'end' = โค้งเฉพาะปลายแท่ง ฐานฝั่งซ้ายเป็นมุมตรง
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, borderRadiusApplication: 'end', barHeight: '82%' },
    },
    colors: [TR_COLOR, TC_COLOR],
    fill: { opacity: 1 }, // ค่าเริ่มต้น 0.85 ทำให้สีจางกว่าที่กำหนด
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    xaxis: {
      categories: barRows.map((f) => shortFacName(f.fac.name)),
      labels: { style: { fontSize: '11px' } },
    },
    yaxis: { labels: { style: { fontSize: '10px' }, maxWidth: 240 } },
    legend: { show: false },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    tooltip: {
      y: {
        formatter: (v: number) => `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ.`,
      },
    },
  };
  const barSeries = [
    { name: 'รายได้รวม (TR)', data: barRows.map((f) => Number((f.res.tr / 1e6).toFixed(2))) },
    { name: 'ต้นทุนรวม (TC)', data: barRows.map((f) => Number((f.res.tc / 1e6).toFixed(2))) },
  ];

  const donutOptions: ApexOptions = {
    chart: { type: 'donut' },
    labels: ['ต้นทุนคงที่ (TFC)', 'ต้นทุนผันแปร (TVC)'],
    colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-warning-main)'],
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 3, colors: ['var(--mui-palette-background-paper)'] },
    plotOptions: { pie: { donut: { size: '62%' } } },
    tooltip: {
      y: {
        formatter: (v: number) =>
          `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ. (${
            uni.tc !== 0 ? Math.round((v / (uni.tc / 1e6)) * 100) : 0
          }%)`,
      },
    },
  };
  const donutSeries = [Number((uni.tfc / 1e6).toFixed(2)), Number((uni.tvc / 1e6).toFixed(2))];

  const profitPctOfTr = uni.tr !== 0 ? (uni.profit / uni.tr) * 100 : 0;

  return (
    <Box>
      <PageHeaderBar
        title={isFiltered ? `ภาพรวม — ${scopeLabel}` : 'ภาพรวมมหาวิทยาลัย'}
        code="W1"
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
                ? `กำลังแสดง ${facs.length} จาก ${RAW.FACS.length} คณะ · ${fmtInt(progs.length)} หลักสูตร · ตัวเลขสรุปเป็นผลรวมของคณะที่เลือก`
                : `แสดงทุกคณะ (${RAW.FACS.length}) · ${fmtInt(progs.length)} หลักสูตร · ตัวเลขสรุปเป็นระดับมหาวิทยาลัย`}
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

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard
            label="นิสิตทั้งหมด"
            value={fmtInt(uni.q)}
            unit={`คน · ${facs.length} คณะ/วิทยาลัย · ${progs.length} หลักสูตร`}
            accent="primary"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard
            label={mode === 'with_government' ? 'รายได้รวม (TR)' : 'รายได้เงินรายได้'}
            value={fmtMillion(uni.tr)}
            unit="ล้านบาท"
            accent="info"
            valueColor="var(--mui-palette-info-main)"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard
            label="ต้นทุนรวม (TC)"
            value={fmtMillion(uni.tc)}
            unit="ล้านบาท"
            accent="secondary"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard
            label="ส่วนเกิน/ขาดทุน (π)"
            value={`${uni.profit >= 0 ? '+' : '−'}${fmtMillion(Math.abs(uni.profit))}`}
            unit={`ล้านบาท · ${profitPctOfTr.toFixed(1)}% ของรายได้`}
            accent="success"
            valueColor={
              uni.profit >= 0 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)'
            }
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard
            label="รายได้ต่อหัว (R)"
            value={uni.r !== null ? fmtInt(uni.r) : '—'}
            unit="บาท/คน"
            accent="warning"
            valueColor="var(--mui-palette-warning-main)"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard
            label="นิสิต ณ จุดคุ้มทุน (Q*)"
            value={fmtInt(uniQStar)}
            unit={`คน · จริง ${fmtInt(uni.q)} คน`}
            accent="primary"
            valueColor="var(--mui-palette-primary-main)"
          />
        </Grid>
      </Grid>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title={
                <DotTitle color="primary.main">รายได้รวม (TR) เทียบ ต้นทุนรวม (TC) รายคณะ</DotTitle>
              }
              subheader="เรียงตามจำนวนนิสิต · หน่วยล้านบาท"
            />
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 2 }}>
                <LegendItem
                  color={TR_COLOR}
                  label={mode === 'with_government' ? 'รายได้รวม (TR)' : 'เงินรายได้'}
                />
                <LegendItem color={TC_COLOR} label="ต้นทุนรวม (TC)" />
              </Box>
              {/* กราฟวางแบบ absolute เพื่อไม่ดันความสูงแถว — การ์ดนี้จึงสูงเท่าการ์ดโครงสร้างต้นทุน */}
              <Box sx={{ flex: 1, position: 'relative', minHeight: 360 }}>
                <Box sx={{ position: 'absolute', inset: 0 }}>
                  <AppReactApexCharts
                    type="bar"
                    height="100%"
                    width="100%"
                    options={barOptions}
                    series={barSeries}
                    boxProps={{ sx: { height: '100%' } }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title={<DotTitle color="success.main">โครงสร้างต้นทุนรวม</DotTitle>}
              subheader="ต้นทุนคงที่ (TFC) เทียบ ต้นทุนผันแปร (TVC)"
            />
            <CardContent>
              <AppReactApexCharts
                type="donut"
                height={260}
                width="100%"
                options={donutOptions}
                series={donutSeries}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 4 }}>
                <CostRow
                  label="ต้นทุนคงที่ (TFC)"
                  value={uni.tfc}
                  total={uni.tc}
                  color="primary.main"
                />
                <CostRow
                  label="ต้นทุนผันแปร (TVC)"
                  value={uni.tvc}
                  total={uni.tc}
                  color="warning.main"
                />
                <CostRow
                  label="ค่าเสื่อมราคา (รวมอยู่ในต้นทุนคงที่)"
                  value={dep}
                  total={uni.tc}
                  color="success.main"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FacultyTable
            title="คณะที่มีส่วนเกินสูงสุด"
            chipLabel="ส่วนเกินสูงสุด"
            chipColor="success"
            rows={top}
            sign="+"
            valueHeader="ส่วนเกิน (ลบ.)"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FacultyTable
            title="คณะที่ต้องเฝ้าระวัง (ขาดทุน)"
            chipLabel="เฝ้าระวัง"
            chipColor="error"
            rows={bottom}
            sign="−"
            valueHeader="ขาดทุน (ลบ.)"
          />
        </Grid>
      </Grid>

      <Card sx={{ borderLeft: 4, borderLeftColor: 'primary.main' }}>
        <CardHeader
          title={`ประเด็นสำคัญ — ${isFiltered ? scopeLabel : 'ภาพรวม'}`}
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
            '& > li': { position: 'relative', pl: 4 },
            '& > li::before': {
              content: '"▸"',
              position: 'absolute',
              left: 0,
              color: 'primary.main',
              fontWeight: 700,
            },
          }}
        >
          <li>
            <Typography variant="body2">
              {scopeLabel} มีนิสิต <b>{fmtInt(uni.q)}</b> คน{' '}
              {uni.profit >= 0 ? 'มีส่วนเกิน' : 'ขาดทุนสุทธิ'}{' '}
              <b>{fmtMillion(Math.abs(uni.profit))} ลบ.</b> ({profitPctOfTr.toFixed(1)}% ของรายได้)
              จุดคุ้มทุนรวมอยู่ที่ <b>{fmtInt(uniQStar)} คน</b>
            </Typography>
          </li>
          {best && worst && facs.length > 1 && (
            <li>
              <Typography variant="body2">
                คณะที่{best.res.profit >= 0 ? 'ทำส่วนเกินสูงสุด' : 'ขาดทุนน้อยที่สุด'}คือ{' '}
                <b>{shortFacName(best.fac.name)}</b> ({best.res.profit >= 0 ? '+' : ''}
                {fmtMillion(best.res.profit)} ลบ.) ขณะที่ <b>{shortFacName(worst.fac.name)}</b>{' '}
                {worst.res.profit < 0
                  ? `ขาดทุนมากสุด (${fmtMillion(worst.res.profit)} ลบ.)`
                  : `มีส่วนเกินต่ำสุด (+${fmtMillion(worst.res.profit)} ลบ.)`}
              </Typography>
            </li>
          )}
          <li>
            <Typography variant="body2">
              มี <b>{nLoss} คณะ</b> จาก {facs.length} ที่ยังไม่คุ้มทุนในโหมดนี้ และ{' '}
              <b>{progLoss} หลักสูตร</b> จาก {progs.length} ที่จำนวนนิสิตยังต่ำกว่าจุดคุ้มทุน
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              ต้นทุนคงที่คิดเป็น <b>{((uni.tfc / uni.tc) * 100).toFixed(0)}%</b> ของต้นทุนรวม
              สะท้อนภาระโครงสร้างที่ต้อง กระจายไปยังจำนวนนิสิตให้มากพอ
            </Typography>
          </li>
        </CardContent>
      </Card>
    </Box>
  );
};

const CostRow = ({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 2,
      p: 2,
      borderRadius: 1,
      border: 1,
      borderColor: 'divider',
      bgcolor: 'action.hover',
    }}
  >
    <Typography
      variant="body2"
      fontWeight={600}
      sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
    >
      <Box
        component="span"
        sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: color, flexShrink: 0 }}
      />
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={700} className="num">
      {fmtMillion(value)} ลบ.{' '}
      <Typography component="span" variant="caption" color="text.secondary">
        {total !== 0 ? ((value / total) * 100).toFixed(0) : 0}%
      </Typography>
    </Typography>
  </Box>
);

type FacultyRow = {
  fac: (typeof RAW.FACS)[number];
  res: ReturnType<typeof computeBreakEven>;
  qStar: number;
};

const FacultyTable = ({
  title,
  chipLabel,
  chipColor,
  rows,
  sign,
  valueHeader,
}: {
  title: string;
  chipLabel: string;
  chipColor: 'success' | 'error';
  rows: FacultyRow[];
  sign: '+' | '−';
  valueHeader: string;
}) => (
  <Card sx={{ height: '100%' }}>
    <CardHeader
      title={<DotTitle color={`${chipColor}.main`}>{title}</DotTitle>}
      action={<Chip size="small" color={chipColor} variant="tonal" label={chipLabel} />}
    />
    <CardContent sx={{ pt: 0 }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>คณะ</TableCell>
              <TableCell align="right">{valueHeader}</TableCell>
              <TableCell align="right">จุดคุ้มทุน / นิสิตจริง (Q*/Q)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    — ไม่มีข้อมูล —
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={r.fac.name}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{shortFacName(r.fac.name)}</TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    className="num"
                    color={sign === '+' ? 'success.main' : 'error.main'}
                  >
                    {sign}
                    {fmtMillion(Math.abs(r.res.profit))}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" color="text.secondary" className="num">
                    {fmtInt(r.qStar)} / {fmtInt(r.res.q)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent>
  </Card>
);

export default Overview;
