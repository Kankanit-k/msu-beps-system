'use client';

// React Imports
import { useState } from 'react';

// Next Imports
import dynamic from 'next/dynamic';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

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
import { computeBreakEven, fmtInt, fmtMillion, shortFacName } from '@views/breakeven/calc';

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

const pct = (part: number, whole: number) => (whole > 0 ? ((part / whole) * 100).toFixed(0) : '0');

type CostComponent = { label: string; value: number; color: string };

const CostView = () => {
  // ต้นทุนไม่ขึ้นกับโหมดฐานรายได้ — เก็บ state ไว้เพื่อให้ชิปสรุปบนหัวหน้าจอตรงกับหน้าอื่น
  const [mode, setMode] = useState<RevenueMode>('with_government');

  const U = RAW.UNI;
  const F = RAW.FACS;
  const uni = computeBreakEven(U, mode);

  // ===== โครงสร้างต้นทุนรายคณะ (stacked bar) =====
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
      categories: F.map((f) => shortFacName(f.name)),
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
    { name: 'ต้นทุนคงที่ (TFC)', data: F.map((f) => Number((f.TFC / 1e6).toFixed(2))) },
    { name: 'ต้นทุนผันแปร (TVC)', data: F.map((f) => Number((f.TVC / 1e6).toFixed(2))) },
  ];

  // ===== ต้นทุนคงที่ แยกองค์ประกอบ (donut) =====
  const components: CostComponent[] = [
    { label: 'ต้นทุนหลักสูตร (ตรง)', value: U.tfcProg, color: 'var(--mui-palette-primary-main)' },
    { label: 'ปันส่วนสำนักงานเลขาฯ', value: U.tfcOffice, color: 'var(--mui-palette-warning-main)' },
    { label: 'ค่าเสื่อมราคา', value: U.dep, color: 'var(--mui-palette-success-main)' },
  ];
  const donutOptions: ApexOptions = {
    chart: { type: 'donut', parentHeightOffset: 0 },
    labels: components.map((c) => c.label),
    colors: components.map((c) => c.color),
    stroke: { width: 3, colors: ['var(--mui-palette-background-paper)'] },
    legend: { show: false },
    dataLabels: { enabled: false },
    tooltip: {
      y: {
        formatter: (v: number) => `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ.`,
      },
    },
    plotOptions: { pie: { donut: { size: '60%' } } },
  };
  const donutSeries = components.map((c) => Number((c.value / 1e6).toFixed(2)));

  return (
    <Box>
      <PageHeaderBar
        title="โครงสร้างต้นทุน"
        code="W4"
        mode={mode}
        onModeChange={setMode}
        q={uni.q}
        profit={uni.profit}
      />

      <DataCaveatNotes profit={uni.profit} />

      <NoteBar severity="info">
        <b>ต้นทุนไม่เปลี่ยนตามฐานรายได้</b> — ต้นทุนคงที่ (TFC) ไม่เปลี่ยนตามจำนวนนิสิต ·
        ต้นทุนผันแปร (TVC) เปลี่ยนตามจำนวนนิสิต · AVC = TVC / Q
      </NoteBar>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="ต้นทุนรวม (TC)" value={fmtMillion(U.TC)} unit="ล้านบาท" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="ต้นทุนคงที่ (TFC)"
            value={fmtMillion(U.TFC)}
            unit={`ล้านบาท · ${pct(U.TFC, U.TC)}% ของ TC`}
            accent="primary"
            valueColor="var(--mui-palette-primary-main)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="ต้นทุนผันแปร (TVC)"
            value={fmtMillion(U.TVC)}
            unit={`ล้านบาท · ${pct(U.TVC, U.TC)}% ของ TC`}
            accent="warning"
            valueColor="var(--mui-palette-warning-main)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="ต้นทุนผันแปร/หัว (AVC)"
            value={fmtInt(U.AVC)}
            unit="บาท/คน"
            accent="success"
            valueColor="var(--mui-palette-success-main)"
          />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardHeader
              title={<DotTitle color="primary.main">โครงสร้างต้นทุนรายคณะ</DotTitle>}
              subheader="คงที่ (TFC) + ผันแปร (TVC) · ล้านบาท"
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 2 }}>
                <LegendItem color="primary.main" label="ต้นทุนคงที่ (TFC)" />
                <LegendItem color="warning.main" label="ต้นทุนผันแปร (TVC)" />
              </Box>
              <AppReactApexCharts
                type="bar"
                height={Math.max(420, F.length * 26)}
                width="100%"
                options={stackedOptions}
                series={stackedSeries}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardHeader
              title={<DotTitle color="success.main">ต้นทุนคงที่รวม แยกองค์ประกอบ</DotTitle>}
              subheader={`รวม ${fmtMillion(U.TFC)} ล้านบาท`}
            />
            <CardContent>
              <AppReactApexCharts
                type="donut"
                height={260}
                width="100%"
                options={donutOptions}
                series={donutSeries}
              />
              <Stack spacing={2} sx={{ mt: 4 }}>
                {components.map((c) => (
                  <Box
                    key={c.label}
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
                        sx={{ width: 11, height: 11, borderRadius: '3px', bgcolor: c.color }}
                      />
                      {c.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                      {fmtMillion(c.value)} ลบ.{' '}
                      <Typography component="span" variant="caption" color="text.secondary">
                        {pct(c.value, U.TFC)}%
                      </Typography>
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CostView;
