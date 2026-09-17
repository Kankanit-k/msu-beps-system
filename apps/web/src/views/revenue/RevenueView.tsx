'use client';

// React Imports
import { useMemo, useState } from 'react';

// Next Imports
import dynamic from 'next/dynamic';

// MUI Imports
import Alert from '@mui/material/Alert';
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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

// Third-party Imports
import type { ApexOptions } from 'apexcharts';

// Type Imports
import type { RevenueMode } from '@beps/calc-engine';

// Data & Calc Imports
import { calcBreakEven } from '@beps/calc-engine';
import { RAW } from '@/data/mockup';

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

const short = (s: string) => s.replace('คณะ', '').replace('วิทยาลัย', 'วล.').replace('สถาบันวิจัย', 'สถ.');
const fmtM = (v: number) => (v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');

const RevenueView = () => {
  const [mode, setMode] = useState<RevenueMode>('with_government');

  const U = RAW.UNI;
  const F = RAW.FACS;

  const uniRes = calcBreakEven({
    q: U.Q,
    governmentBudget: U.st,
    incomeBudget: U.own,
    tfc: U.TFC,
    tvc: U.TVC,
    revenueMode: mode,
  });

  const rows = useMemo(
    () =>
      F.map((f) => {
        const res = calcBreakEven({
          q: f.Q,
          governmentBudget: f.st,
          incomeBudget: f.own,
          tfc: f.TFC,
          tvc: f.TVC,
          revenueMode: mode,
        });

        return { ...f, tr: res.tr, r: res.r ?? 0, profit: res.profit, qStar: res.qStar, qStarStatus: res.qStarStatus };
      }),
    [F, mode],
  );

  // ===== องค์ประกอบรายได้รายคณะ (stacked bar) =====
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
    { name: 'เงินรายได้ (ค่าธรรมเนียม)', data: F.map((f) => Number((f.own / 1e6).toFixed(2))) },
    { name: 'เงินแผ่นดิน', data: F.map((f) => Number((f.st / 1e6).toFixed(2))) },
  ];
  const stackedHeight = Math.max(420, F.length * 24);

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Alert severity="info">
          {mode === 'with_government'
            ? 'ฐานรายได้ = เงินแผ่นดิน + เงินรายได้ (สะท้อนต้นทุนจริงทั้งหมด)'
            : 'ฐานรายได้ = เงินรายได้/ค่าธรรมเนียมเท่านั้น (สะท้อนการเลี้ยงตัวเองของหลักสูตร)'}{' '}
          <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            onChange={(_, v) => v && setMode(v)}
            sx={{ ml: 2, verticalAlign: 'middle' }}
          >
            <ToggleButton value="with_government">รวมเงินแผ่นดิน</ToggleButton>
            <ToggleButton value="without_government">ไม่รวมเงินแผ่นดิน</ToggleButton>
          </ToggleButtonGroup>
        </Alert>
      </Grid>

      {/* KPIs */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {mode === 'with_government' ? 'รายได้รวม (TR)' : 'เงินรายได้ (ค่าธรรมเนียม)'}
            </Typography>
            <Typography variant="h4" color="primary.main">
              {fmtM(uniRes.tr)}
            </Typography>
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
              งบประมาณเงินแผ่นดิน
            </Typography>
            <Typography variant="h4">{fmtM(U.st)}</Typography>
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
              งบประมาณเงินรายได้
            </Typography>
            <Typography variant="h4" color="warning.main">
              {fmtM(U.own)}
            </Typography>
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
              รายได้เฉลี่ยต่อหัว (R)
            </Typography>
            <Typography variant="h4" color="success.main">
              {fmtB(uniRes.r ?? 0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              บาท/คน
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title="องค์ประกอบรายได้รายคณะ" subheader="เงินแผ่นดิน + เงินรายได้ (ล้านบาท)" />
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

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title="ตารางรายได้ · ต้นทุน · ส่วนเกิน รายคณะ" />
          <TableContainer sx={{ maxHeight: 460 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>คณะ</TableCell>
                  <TableCell align="right">นิสิต</TableCell>
                  <TableCell align="right">{mode === 'with_government' ? 'TR' : 'เงินรายได้'}</TableCell>
                  <TableCell align="right">TC</TableCell>
                  <TableCell align="right">ส่วนเกิน</TableCell>
                  <TableCell align="right">R/หัว</TableCell>
                  <TableCell align="right">Q*</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((f, i) => (
                  <TableRow key={f.name} hover>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{f.name}</TableCell>
                    <TableCell align="right">{fmtN(f.Q)}</TableCell>
                    <TableCell align="right">{fmtM(f.tr)}</TableCell>
                    <TableCell align="right">{fmtM(f.TC)}</TableCell>
                    <TableCell align="right" sx={{ color: f.profit >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}>
                      {f.profit >= 0 ? '+' : '−'}
                      {fmtM(Math.abs(f.profit))}
                    </TableCell>
                    <TableCell align="right">{fmtB(f.r)}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      {f.qStar !== null ? fmtN(f.qStar) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>
    </Grid>
  );
};

export default RevenueView;
