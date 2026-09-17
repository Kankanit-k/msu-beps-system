'use client';

// React Imports
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// Next Imports
import dynamic from 'next/dynamic';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
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

// Data & Calc Imports
import { calcBreakEven } from '@beps/calc-engine';
import { RAW } from '@/data/mockup';
import type { FacRow } from '@/data/mockup';

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

// หน่วยวิจัยขนาดเล็กมาก (นิสิต < 30 คน) ทำให้ ATC/หัว สูงผิดปกติจนกราฟอ่านยาก — กันออกจากกราฟ แต่ยังอยู่ในตาราง
const OUTLIER_MIN_Q = 30;

const short = (s: string) => s.replace('คณะ', '').replace('วิทยาลัย', 'วล.').replace('สถาบันวิจัย', 'สถ.');
const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');
const fmtN = (v: number) => Math.round(v).toLocaleString('th-TH');
const median = (arr: number[]) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const h = Math.floor(s.length / 2);

  return s.length % 2 ? s[h]! : (s[h - 1]! + s[h]!) / 2;
};

type FacCalc = FacRow & { r: number; atc: number; avc: number; cm: number; diff: number };

const calcFor = (row: FacRow, mode: RevenueMode): FacCalc => {
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

const PerheadView = () => {
  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'loss'>('all');

  const uni = useMemo(() => calcFor({ ...RAW.UNI, name: 'มหาวิทยาลัย' }, mode), [mode]);

  const allRows = useMemo(() => RAW.FACS.map((f) => calcFor(f, mode)), [mode]);
  const chartRows = useMemo(() => allRows.filter((d) => d.Q >= OUTLIER_MIN_Q), [allRows]);
  const outlierRows = useMemo(() => allRows.filter((d) => d.Q < OUTLIER_MIN_Q), [allRows]);
  const sortedRows = useMemo(() => [...allRows].sort((a, b) => b.diff - a.diff), [allRows]);

  const nOk = allRows.filter((d) => d.diff >= 0).length;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sortedRows.filter((d) => {
      const statWord = d.diff >= 0 ? 'คุ้ม' : 'ขาด';
      const matchesText = !q || d.name.toLowerCase().includes(q) || statWord.includes(q);
      const matchesFilter = statusFilter === 'all' || (statusFilter === 'ok' ? d.diff >= 0 : d.diff < 0);

      return matchesText && matchesFilter;
    });
  }, [sortedRows, search, statusFilter]);

  // ===== กราฟหลัก: R / ATC / AVC รายคณะ =====
  const barCategories = chartRows.map((d) => short(d.name));
  const barOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, parentHeightOffset: 0 },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '68%' } },
    colors: [
      'var(--mui-palette-success-main)',
      'var(--mui-palette-warning-main)',
      'var(--mui-palette-primary-main)',
    ],
    dataLabels: { enabled: false },
    grid: { borderColor: 'var(--mui-palette-divider)', xaxis: { lines: { show: true } } },
    legend: { position: 'top', horizontalAlign: 'left' },
    xaxis: {
      categories: barCategories,
      labels: { formatter: (v) => `${(Number(v) / 1000).toFixed(0)}k` },
      title: { text: 'บาท/คน' },
    },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    tooltip: { y: { formatter: (v) => `${fmtB(v)} บาท/คน` } },
  };
  const barSeries = [
    { name: 'รายได้/หัว (R)', data: chartRows.map((d) => Math.round(d.r)) },
    { name: 'ต้นทุนรวม/หัว (ATC)', data: chartRows.map((d) => Math.round(d.atc)) },
    { name: 'ต้นทุนผันแปร/หัว (AVC)', data: chartRows.map((d) => Math.round(d.avc)) },
  ];
  const barHeight = Math.max(360, chartRows.length * 30);

  // ===== กราฟประสิทธิภาพ: R เทียบ ATC (scatter) =====
  const okPts = chartRows.filter((d) => d.diff >= 0);
  const lossPts = chartRows.filter((d) => d.diff < 0);
  const scatterSeries = [
    { name: 'คุ้มทุนต่อหัว', data: okPts.map((d) => [Math.round(d.atc), Math.round(d.r)]) },
    { name: 'ขาดทุนต่อหัว', data: lossPts.map((d) => [Math.round(d.atc), Math.round(d.r)]) },
  ];
  const scatterOptions: ApexOptions = {
    chart: { type: 'scatter', toolbar: { show: false }, parentHeightOffset: 0 },
    colors: ['var(--mui-palette-success-main)', 'var(--mui-palette-error-main)'],
    xaxis: {
      title: { text: 'ต้นทุน/หัว ATC (บาท) →' },
      labels: { formatter: (v) => `${(Number(v) / 1000).toFixed(0)}k` },
    },
    yaxis: {
      title: { text: 'รายได้/หัว R (บาท) →' },
      labels: { formatter: (v) => `${(Number(v) / 1000).toFixed(0)}k` },
    },
    markers: { size: 7 },
    legend: { position: 'top', horizontalAlign: 'left' },
    tooltip: {
      custom: ({ seriesIndex, dataPointIndex }: { seriesIndex: number; dataPointIndex: number }) => {
        const pts = seriesIndex === 0 ? okPts : lossPts;
        const d = pts[dataPointIndex];

        if (!d) return '';

        return `<div style="padding:8px 10px"><b>${d.name}</b><br/>R ${fmtB(d.r)} · ATC ${fmtB(d.atc)} บาท/คน<br/>นิสิต ${fmtN(d.Q)} คน</div>`;
      },
    },
  };

  // ===== Top 8 ต้นทุน/หัว สูงสุด =====
  const topAtc = [...chartRows].sort((a, b) => b.atc - a.atc).slice(0, 8);
  const maxAtc = topAtc[0]?.atc || 1;

  // ===== ประเด็นสำคัญ =====
  type Insight = { sev: 'success' | 'warning' | 'error' | 'info'; text: ReactNode };
  const insights: Insight[] = [];

  insights.push(
    uni.diff >= 0
      ? {
          sev: 'success',
          text: (
            <>
              เฉลี่ยทั้งมหาวิทยาลัย รายได้/หัว <b>{fmtB(uni.r)} บาท</b> สูงกว่าต้นทุน/หัว{' '}
              <b>{fmtB(uni.atc)} บาท</b> อยู่ <b>+{fmtB(uni.diff)} บาท/คน</b>
            </>
          ),
        }
      : {
          sev: 'error',
          text: (
            <>
              เฉลี่ยทั้งมหาวิทยาลัย <b>ขาดทุน {fmtB(Math.abs(uni.diff))} บาท/คน</b> — รายได้/หัว {fmtB(uni.r)}{' '}
              ต่ำกว่าต้นทุน/หัว {fmtB(uni.atc)} บาท
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
            {bad.length}/{allRows.length} คณะ
          </b>{' '}
          มีต้นทุน/หัว สูงกว่ารายได้/หัว — ขาดทุนต่อหัวมากสุด:{' '}
          {bad
            .slice(0, 3)
            .map((d) => `${short(d.name)} (−${fmtB(Math.abs(d.diff))})`)
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
          คุ้มค่าที่สุดต่อหัว: <b>{short(good[0]!.name)}</b> +{fmtB(good[0]!.diff)} บาท/คน (R {fmtB(good[0]!.r)} ·
          ATC {fmtB(good[0]!.atc)})
        </>
      ),
    });
  }

  const big = allRows.filter((d) => d.Q >= 3000);
  const small = allRows.filter((d) => d.Q < 1000 && d.Q >= OUTLIER_MIN_Q);

  if (big.length && small.length) {
    const ab = median(big.map((d) => d.atc));
    const as = median(small.map((d) => d.atc));

    if (as > ab) {
      insights.push({
        sev: 'info',
        text: (
          <>
            <b>Economies of Scale</b>: คณะใหญ่ (≥3,000 คน) ต้นทุน/หัวมัธยฐาน <b>{fmtB(ab)}</b> บาท · คณะเล็ก
            (&lt;1,000 คน) <b>{fmtB(as)}</b> บาท — สูงกว่า <b>{(as / ab).toFixed(1)}×</b> เพราะต้นทุนคงที่กระจายบน
            นิสิตจำนวนน้อย
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
          <b>{f.name}</b> มีนิสิตเพียง <b>{fmtN(f.Q)} คน</b> แต่ต้นทุนรวม {(f.TC / 1e6).toFixed(1)} ล้านบาท → ต้นทุน
          /หัว {fmtB(f.atc)} บาท ({(f.atc / uni.atc).toFixed(0)}× ค่าเฉลี่ย) — เป็นหน่วยวิจัย จึงกันออกจากกราฟ
        </>
      ),
    });
  });

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Alert severity="info">
          ATC (ต้นทุนรวม/หัว) และ AVC ไม่เปลี่ยนตามฐานรายได้ — เปลี่ยนเฉพาะ R ·{' '}
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
              รายได้ต่อหัว (R)
            </Typography>
            <Typography variant="h4" color="success.main">
              {fmtB(uni.r)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              บาท/คน · เฉลี่ยทั้งมหาวิทยาลัย
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ต้นทุนรวมต่อหัว (ATC)
            </Typography>
            <Typography variant="h4" color="warning.main">
              {fmtB(uni.atc)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              บาท/คน · TC ÷ Q
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              ส่วนต่าง R − ATC
            </Typography>
            <Typography variant="h4" color={uni.diff >= 0 ? 'success.main' : 'error.main'}>
              {uni.diff >= 0 ? '+' : '−'}
              {fmtB(Math.abs(uni.diff))}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              บาท/คน · {uni.diff >= 0 ? 'กำไรต่อหัว' : 'ขาดทุนต่อหัว'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              คณะที่ R ≥ ATC
            </Typography>
            <Typography variant="h4" color="success.main">
              {nOk}/{allRows.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              คณะ · รายได้/หัว คุ้มต้นทุน/หัว
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* กราฟหลัก */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title="รายได้/หัว เทียบ ต้นทุน/หัว รายคณะ"
            subheader={
              outlierRows.length
                ? `ไม่รวม ${outlierRows.length} หน่วยที่นิสิต < ${OUTLIER_MIN_Q} คน (ATC สูงผิดปกติ) — ดูในตารางด้านล่าง`
                : 'บาท/คน ต่อคณะ'
            }
          />
          <CardContent>
            <AppReactApexCharts
              type="bar"
              height={barHeight}
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
            title="แผนภาพประสิทธิภาพ — R เทียบ ATC"
            subheader="แต่ละจุด = 1 คณะ · สีเขียว = คุ้มทุนต่อหัว (R ≥ ATC) · สีแดง = ขาดทุนต่อหัว"
          />
          <CardContent>
            <AppReactApexCharts type="scatter" height={340} width="100%" options={scatterOptions} series={scatterSeries} />
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="ต้นทุน/หัว สูงสุด (Top 8)" subheader="เทียบกับค่าเฉลี่ยมหาวิทยาลัย" />
          <CardContent>
            <Stack spacing={3}>
              {topAtc.map((d) => (
                <Box key={d.name}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="body2" noWrap title={d.name} sx={{ maxWidth: '60%' }}>
                      {short(d.name)}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {fmtB(d.atc)}{' '}
                      <Typography component="span" variant="caption" color="text.secondary">
                        ({(d.atc / uni.atc).toFixed(1)}×)
                      </Typography>
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={(d.atc / maxAtc) * 100}
                    color={d.atc > uni.atc ? 'error' : 'warning'}
                  />
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
            title="ตารางเปรียบเทียบต่อหัว รายคณะ"
            subheader="เรียงตามส่วนต่าง R − ATC · หน่วย: บาท/คน"
            action={
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <TextField
                  size="small"
                  placeholder="ค้นหาคณะ / สถานะ (คุ้ม, ขาด)..."
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
          <TableContainer sx={{ maxHeight: 460 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>คณะ / วิทยาลัย</TableCell>
                  <TableCell align="right">นิสิต</TableCell>
                  <TableCell align="right">R/หัว</TableCell>
                  <TableCell align="right">ATC/หัว</TableCell>
                  <TableCell align="right">AVC/หัว</TableCell>
                  <TableCell align="right">CM/หัว</TableCell>
                  <TableCell align="right">R−ATC</TableCell>
                  <TableCell align="right">สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      ไม่พบคณะที่ตรงกับเงื่อนไขที่เลือก
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
                      <TableCell align="right" sx={{ color: d.cm > 0 ? 'success.main' : 'error.main' }}>
                        {d.cm > 0 ? '+' : '−'}
                        {fmtB(Math.abs(d.cm))}
                      </TableCell>
                      <TableCell align="right" sx={{ color: ok ? 'success.main' : 'error.main', fontWeight: 700 }}>
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

      {/* ประเด็นสำคัญ */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title="ประเด็นสำคัญ — ต่อหัวนิสิต" />
          <CardContent>
            <Stack spacing={2}>
              {insights.map((ins, i) => (
                <Alert key={i} severity={ins.sev} variant="outlined">
                  {ins.text}
                </Alert>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default PerheadView;
