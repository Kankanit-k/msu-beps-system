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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';

import type { ApexOptions } from 'apexcharts';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import type { RevenueMode } from '@beps/calc-engine';
import { computeBreakEven, fmtInt, fmtMillion, shortFacName, REVENUE_MODE_LABEL } from '@views/breakeven/calc';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

const KpiCard = ({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color?: string;
}) => (
  <Card>
    <CardContent>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={700} sx={{ color, my: 0.5 }} className="num">
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {unit}
      </Typography>
    </CardContent>
  </Card>
);

const Overview = () => {
  const [mode, setMode] = useState<RevenueMode>('with_government');

  const uni = useMemo(() => computeBreakEven(RAW.UNI, mode), [mode]);

  const facResults = useMemo(
    () => RAW.FACS.map((f) => ({ fac: f, res: computeBreakEven(f, mode) })),
    [mode],
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
  const progLoss = useMemo(
    () =>
      RAW.PROGS.filter((p) => {
        const r = computeBreakEven(p, mode);

        return !(r.qStarStatus === 'normal' && r.qStar !== null && r.q >= r.qStar);
      }).length,
    [mode],
  );
  const best = sortedByProfit[0];
  const worst = sortedByProfit[sortedByProfit.length - 1];

  const barOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, parentHeightOffset: 0 },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '70%' } },
    colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-error-main)'],
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    xaxis: {
      categories: facResults.map((f) => shortFacName(f.fac.name)),
      title: { text: 'ล้านบาท' },
    },
    legend: { position: 'top', horizontalAlign: 'left' },
    grid: { borderColor: 'var(--mui-palette-divider)' },
    tooltip: { y: { formatter: (v: number) => `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ.` } },
  };
  const barSeries = [
    { name: 'รายได้รวม (TR)', data: facResults.map((f) => Number((f.res.tr / 1e6).toFixed(2))) },
    { name: 'ต้นทุนรวม (TC)', data: facResults.map((f) => Number((f.res.tc / 1e6).toFixed(2))) },
  ];

  const donutOptions: ApexOptions = {
    chart: { type: 'donut' },
    labels: ['ต้นทุนคงที่ (TFC)', 'ต้นทุนผันแปร (TVC)'],
    colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-warning-main)'],
    legend: { position: 'bottom' },
    dataLabels: { enabled: true, formatter: (v: number) => `${v.toFixed(0)}%` },
    tooltip: { y: { formatter: (v: number) => `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ.` } },
  };
  const donutSeries = [Number((uni.tfc / 1e6).toFixed(2)), Number((uni.tvc / 1e6).toFixed(2))];

  const profitPctOfTr = uni.tr !== 0 ? (uni.profit / uni.tr) * 100 : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4">ภาพรวมมหาวิทยาลัย</Typography>
          <Typography variant="body2" color="text.secondary">
            สรุปรายได้ ต้นทุน และจุดคุ้มทุนทั้งมหาวิทยาลัย — {RAW.FACS.length} คณะ/วิทยาลัย · {RAW.PROGS.length} หลักสูตร
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          color="primary"
          exclusive
          value={mode}
          onChange={(_, v) => v && setMode(v)}
        >
          <ToggleButton value="with_government">{REVENUE_MODE_LABEL.with_government}</ToggleButton>
          <ToggleButton value="without_government">{REVENUE_MODE_LABEL.without_government}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {RAW.__sample && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          ตัวเลขในหน้านี้เป็นข้อมูลตัวอย่าง (สุ่มรบกวนแล้ว) ไม่ใช่ข้อมูลจริงของมหาวิทยาลัย
        </Alert>
      )}

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label="นิสิตทั้งหมด" value={fmtInt(uni.q)} unit="คน" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label="รายได้รวม (TR)" value={fmtMillion(uni.tr)} unit="ล้านบาท" color="var(--mui-palette-primary-main)" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label="ต้นทุนรวม (TC)" value={fmtMillion(uni.tc)} unit="ล้านบาท" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard
            label="ส่วนเกิน/ขาดทุน (π)"
            value={`${uni.profit >= 0 ? '+' : '−'}${fmtMillion(Math.abs(uni.profit))}`}
            unit={`ล้านบาท · ${profitPctOfTr.toFixed(1)}% ของรายได้`}
            color={uni.profit >= 0 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)'}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard
            label="รายได้ต่อหัว (R)"
            value={uni.r !== null ? fmtInt(uni.r) : '—'}
            unit="บาท/คน"
            color="var(--mui-palette-warning-main)"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard
            label="นิสิต ณ จุดคุ้มทุน (Q*)"
            value={uni.qStar !== null ? fmtInt(uni.qStar) : '—'}
            unit={uni.qStar !== null ? `คน · จริง ${fmtInt(uni.q)} คน` : 'R ≤ AVC'}
            color="var(--mui-palette-error-main)"
          />
        </Grid>
      </Grid>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardHeader
              title="รายได้ (TR) เทียบ ต้นทุน (TC) รายคณะ"
              subheader="หน่วยล้านบาท"
            />
            <CardContent>
              <AppReactApexCharts type="bar" height={520} width="100%" options={barOptions} series={barSeries} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardHeader title="โครงสร้างต้นทุนรวม" subheader="คงที่ (TFC) เทียบ ผันแปร (TVC)" />
            <CardContent>
              <AppReactApexCharts type="donut" height={260} width="100%" options={donutOptions} series={donutSeries} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 4 }}>
                <CostRow label="ต้นทุนคงที่ (TFC)" value={uni.tfc} total={uni.tc} />
                <CostRow label="ต้นทุนผันแปร (TVC)" value={uni.tvc} total={uni.tc} />
                <CostRow label="ค่าเสื่อมราคา (ในTFC)" value={RAW.UNI.dep} total={uni.tc} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FacultyTable title="คณะที่มีส่วนเกินสูงสุด" chipLabel="Top surplus" chipColor="success" rows={top} sign="+" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FacultyTable
            title="คณะที่ต้องเฝ้าระวัง (ขาดทุน)"
            chipLabel="Watchlist"
            chipColor="error"
            rows={bottom}
            sign="−"
          />
        </Grid>
      </Grid>

      <Card>
        <CardHeader title="ประเด็นสำคัญ — ภาพรวม" />
        <CardContent component="ul" sx={{ m: 0, pl: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <li>
            <Typography variant="body2">
              ทั้งมหาวิทยาลัยมีนิสิต <b>{fmtInt(uni.q)}</b> คน {uni.profit >= 0 ? 'มีส่วนเกิน' : 'ขาดทุนสุทธิ'}{' '}
              <b>{fmtMillion(Math.abs(uni.profit))} ลบ.</b> ({profitPctOfTr.toFixed(1)}% ของรายได้) จุดคุ้มทุนรวมอยู่ที่{' '}
              <b>{uni.qStar !== null ? `${fmtInt(uni.qStar)} คน` : '—'}</b>
            </Typography>
          </li>
          {best && worst && (
            <li>
              <Typography variant="body2">
                คณะที่ทำส่วนเกินสูงสุดคือ <b>{shortFacName(best.fac.name)}</b> (+{fmtMillion(best.res.profit)} ลบ.)
                ขณะที่ <b>{shortFacName(worst.fac.name)}</b> ขาดทุนมากสุด ({fmtMillion(worst.res.profit)} ลบ.)
              </Typography>
            </li>
          )}
          <li>
            <Typography variant="body2">
              มี <b>{nLoss} คณะ</b> จาก {RAW.FACS.length} ที่ยังไม่คุ้มทุนในโหมดนี้ และ <b>{progLoss} หลักสูตร</b> จาก{' '}
              {RAW.PROGS.length} ที่ยังไม่ถึงจุดคุ้มทุน
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              ต้นทุนคงที่คิดเป็น <b>{((uni.tfc / uni.tc) * 100).toFixed(0)}%</b> ของต้นทุนรวม สะท้อนภาระโครงสร้างที่ต้อง
              กระจายไปยังจำนวนนิสิตให้มากพอ
            </Typography>
          </li>
        </CardContent>
      </Card>
    </Box>
  );
};

const CostRow = ({ label, value, total }: { label: string; value: number; total: number }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      p: 2,
      borderRadius: 1,
      bgcolor: 'action.hover',
    }}
  >
    <Typography variant="body2" fontWeight={600}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={700} className="num">
      {fmtMillion(value)} ลบ. <Typography component="span" variant="caption" color="text.secondary">{total !== 0 ? ((value / total) * 100).toFixed(0) : 0}%</Typography>
    </Typography>
  </Box>
);

type FacultyRow = { fac: (typeof RAW.FACS)[number]; res: ReturnType<typeof computeBreakEven> };

const FacultyTable = ({
  title,
  chipLabel,
  chipColor,
  rows,
  sign,
}: {
  title: string;
  chipLabel: string;
  chipColor: 'success' | 'error';
  rows: FacultyRow[];
  sign: '+' | '−';
}) => (
  <Card>
    <CardHeader title={title} action={<Chip size="small" color={chipColor} label={chipLabel} />} />
    <CardContent sx={{ pt: 0 }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>คณะ</TableCell>
              <TableCell align="right">ส่วนเกิน (ลบ.)</TableCell>
              <TableCell align="right">Q* / Q</TableCell>
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
                    {r.res.qStar !== null ? fmtInt(r.res.qStar) : '—'} / {fmtInt(r.res.q)}
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
