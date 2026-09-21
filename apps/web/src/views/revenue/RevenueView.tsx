'use client';

// React Imports
import { useMemo, useState } from 'react';

// Next Imports
import dynamic from 'next/dynamic';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

// Third-party Imports
import type { ApexOptions } from 'apexcharts';

// Type Imports
import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { DotTitle, LegendItem } from '@components/ChartBits';
import DataCaveatNotes from '@components/DataCaveatNotes';
import KpiCard from '@components/KpiCard';
import NoteBar from '@components/NoteBar';
import PageHeaderBar from '@components/PageHeaderBar';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import {
  computeBreakEven,
  fmtInt,
  fmtMillion,
  REVENUE_MODE_NOTE,
  shortFacName,
} from '@views/breakeven/calc';

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

const RevenueView = () => {
  const [mode, setMode] = useState<RevenueMode>('with_government');

  const uni = useMemo(() => computeBreakEven(RAW.UNI, mode), [mode]);

  const rows = useMemo(
    () => RAW.FACS.map((fac) => ({ fac, res: computeBreakEven(fac, mode) })),
    [mode],
  );

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
      categories: RAW.FACS.map((f) => shortFacName(f.name)),
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
      data: RAW.FACS.map((f) => Number((f.own / 1e6).toFixed(2))),
    },
    { name: 'เงินแผ่นดิน', data: RAW.FACS.map((f) => Number((f.st / 1e6).toFixed(2))) },
  ];

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

      <DataCaveatNotes profit={uni.profit} />

      <NoteBar severity="info">{REVENUE_MODE_NOTE[mode]}</NoteBar>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label={mode === 'with_government' ? 'รายได้รวม (TR)' : 'เงินรายได้ (ค่าธรรมเนียม)'}
            value={fmtMillion(uni.tr)}
            unit="ล้านบาท"
            accent="primary"
            valueColor="var(--mui-palette-primary-main)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="งบประมาณเงินแผ่นดิน" value={fmtMillion(RAW.UNI.st)} unit="ล้านบาท" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="งบประมาณเงินรายได้"
            value={fmtMillion(RAW.UNI.own)}
            unit="ล้านบาท"
            accent="warning"
            valueColor="var(--mui-palette-warning-main)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="รายได้เฉลี่ยต่อหัว (R)"
            value={fmtInt(uni.r)}
            unit="บาท/คน"
            accent="success"
            valueColor="var(--mui-palette-success-main)"
          />
        </Grid>
      </Grid>

      <Card sx={{ mb: 4 }}>
        <CardHeader
          title={<DotTitle color="primary.main">องค์ประกอบรายได้รายคณะ</DotTitle>}
          subheader="เงินแผ่นดิน + เงินรายได้ (ล้านบาท)"
        />
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 2 }}>
            <LegendItem color="primary.main" label="เงินรายได้ (ค่าธรรมเนียม)" />
            <LegendItem color="warning.main" label="เงินแผ่นดิน" />
          </Box>
          <AppReactApexCharts
            type="bar"
            height={Math.max(420, RAW.FACS.length * 26)}
            width="100%"
            options={stackedOptions}
            series={stackedSeries}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={<DotTitle color="success.main">ตารางรายได้ · ต้นทุน · ส่วนเกิน รายคณะ</DotTitle>}
          subheader={`${RAW.FACS.length} คณะ/วิทยาลัย · หน่วยล้านบาท ยกเว้น R/หัว (บาท) และ Q* (คน)`}
        />
        <TableContainer sx={{ maxBlockSize: 460 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>คณะ</TableCell>
                <TableCell align="right">นิสิต</TableCell>
                <TableCell align="right">
                  {mode === 'with_government' ? 'TR' : 'เงินรายได้'}
                </TableCell>
                <TableCell align="right">TC</TableCell>
                <TableCell align="right">ส่วนเกิน</TableCell>
                <TableCell align="right">R/หัว</TableCell>
                <TableCell align="right">Q*</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ fac, res }, i) => (
                <TableRow key={fac.name} hover>
                  <TableCell sx={{ color: 'text.disabled', fontWeight: 700 }}>{i + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{fac.name}</TableCell>
                  <TableCell align="right">{fmtInt(fac.Q)}</TableCell>
                  <TableCell align="right">{fmtMillion(res.tr)}</TableCell>
                  <TableCell align="right">{fmtMillion(res.tc)}</TableCell>
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
    </Box>
  );
};

export default RevenueView;
