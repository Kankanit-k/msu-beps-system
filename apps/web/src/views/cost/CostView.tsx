'use client';

// Next Imports
import dynamic from 'next/dynamic';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// Third-party Imports
import type { ApexOptions } from 'apexcharts';

// Data Imports
import { RAW } from '@/data/mockup';

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

const short = (s: string) => s.replace('คณะ', '').replace('วิทยาลัย', 'วล.').replace('สถาบันวิจัย', 'สถ.');
const fmtM = (v: number) => (v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');
const pct = (part: number, whole: number) => (whole > 0 ? ((part / whole) * 100).toFixed(0) : '0');

type CostRow = { label: string; value: number; color: string };

const CostView = () => {
  const U = RAW.UNI;
  const F = RAW.FACS;

  // ===== โครงสร้างต้นทุนรายคณะ (stacked bar) =====
  const categories = F.map((f) => short(f.name));
  const stackedOptions: ApexOptions = {
    chart: { type: 'bar', stacked: true, toolbar: { show: false }, parentHeightOffset: 0 },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '68%' } },
    colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-warning-main)'],
    dataLabels: { enabled: false },
    grid: { borderColor: 'var(--mui-palette-divider)' },
    legend: { position: 'top', horizontalAlign: 'left' },
    xaxis: { categories, title: { text: 'ล้านบาท' } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    tooltip: { y: { formatter: (v) => `${fmtM(v * 1e6)} ล้านบาท` } },
  };
  const stackedSeries = [
    { name: 'ต้นทุนคงที่ (TFC)', data: F.map((f) => Number((f.TFC / 1e6).toFixed(2))) },
    { name: 'ต้นทุนผันแปร (TVC)', data: F.map((f) => Number((f.TVC / 1e6).toFixed(2))) },
  ];
  const stackedHeight = Math.max(420, F.length * 24);

  // ===== ต้นทุนคงที่ แยกองค์ประกอบ (donut) =====
  const components: CostRow[] = [
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
    tooltip: { y: { formatter: (v) => `${fmtM(v * 1e6)} ล้านบาท` } },
    plotOptions: { pie: { donut: { size: '60%' } } },
  };
  const donutSeries = components.map((c) => Number((c.value / 1e6).toFixed(2)));

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Alert severity="info">
          ต้นทุนคงที่ (TFC) ไม่เปลี่ยนตามจำนวนนิสิต · ต้นทุนผันแปร (TVC) เปลี่ยนตามจำนวนนิสิต · AVC = TVC ÷ Q
        </Alert>
      </Grid>

      {/* KPIs */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ต้นทุนรวม (TC)
            </Typography>
            <Typography variant="h4">{fmtM(U.TC)}</Typography>
            <Typography variant="caption" color="text.secondary">
              ล้านบาท
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ต้นทุนคงที่ (TFC)
            </Typography>
            <Typography variant="h4" color="primary.main">
              {fmtM(U.TFC)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ล้านบาท · {pct(U.TFC, U.TC)}% ของ TC
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ต้นทุนผันแปร (TVC)
            </Typography>
            <Typography variant="h4" color="warning.main">
              {fmtM(U.TVC)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ล้านบาท · {pct(U.TVC, U.TC)}% ของ TC
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ต้นทุนผันแปร/หัว (AVC)
            </Typography>
            <Typography variant="h4">{fmtB(U.AVC)}</Typography>
            <Typography variant="caption" color="text.secondary">
              บาท/คน
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardHeader title="โครงสร้างต้นทุนรายคณะ (TFC + TVC)" subheader="ล้านบาท" />
          <CardContent>
            <AppReactApexCharts
              type="bar"
              height={stackedHeight}
              width="100%"
              options={stackedOptions}
              series={stackedSeries}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="ต้นทุนคงที่รวม แยกองค์ประกอบ" />
          <CardContent>
            <AppReactApexCharts type="donut" height={230} width="100%" options={donutOptions} series={donutSeries} />
            <Stack spacing={2} sx={{ mt: 4 }}>
              {components.map((c) => (
                <Box
                  key={c.label}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box component="span" sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: c.color }} />
                    {c.label}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {fmtM(c.value)} ล้านบาท{' '}
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
  );
};

export default CostView;
