'use client';

// React Imports
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// Next Imports
import dynamic from 'next/dynamic';

// Next Imports
import NextLink from 'next/link';

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
import Avatar from '@mui/material/Avatar';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Link from '@mui/material/Link';

import type { ApexOptions } from 'apexcharts';

// Data / calc Imports
import NoteBar from '@components/NoteBar';
import KpiCard from '@components/KpiCard';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import type { RevenueMode } from '@beps/calc-engine';
import {
  computeBreakEven,
  fmtInt,
  fmtMillion,
  shortFacName,
  REVENUE_MODE_LABEL,
} from '@views/breakeven/calc';

/** คำอธิบายฐานรายได้ตามโหมด — ตรงกับ noteTxt() ของ mockup */
const REVENUE_MODE_NOTE: Record<RevenueMode, string> = {
  with_government: 'ฐานรายได้ = เงินแผ่นดิน + เงินรายได้ (สะท้อนต้นทุนจริงทั้งหมด)',
  without_government:
    'ฐานรายได้ = เงินรายได้/ค่าธรรมเนียมเท่านั้น (สะท้อนการเลี้ยงตัวเองของหลักสูตร)',
};

// Mock run/approval context — no Run/approval backend yet, so this is display-only sample data.
const MOCK_RUN = {
  budgetYear: '2568',
  budgetYears: ['2566', '2567', '2568'],
  id: 1042,
  computedAt: '11 ก.ค. 2569 14:32',
  method: 'v3 - ฐาน ACTUAL',
  approved: true,
  approver: { name: 'ผศ.ดร.ปิยภัทร บุษบาบดินทร์', role: 'ผู้อนุมัติ' },
};

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

/** หัวการ์ดแบบ mockup — จุดสีนำหน้าชื่อการ์ด (.card-title .dot) */
const DotTitle = ({ color, children }: { color: string; children: ReactNode }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
    <span>{children}</span>
  </Box>
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

  // กราฟแท่งเรียงตามจำนวนนิสิตเหมือน mockup — คณะใหญ่สุดอยู่บนสุด
  const barRows = useMemo(() => [...facResults].sort((a, b) => b.fac.Q - a.fac.Q), [facResults]);

  const barOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, parentHeightOffset: 0 },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '82%' } },
    colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-error-main)'],
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
      {/* หัวหน้าจอ — แถวเดียวแบบ mockup: ชื่อหน้า + ตัวเลือกบริบท + ชิปสรุป + ผู้อนุมัติ */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 3,
          mb: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            ภาพรวมมหาวิทยาลัย
          </Typography>
          <Chip size="small" label="W1" variant="tonal" color="primary" />
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 3,
            marginInlineStart: 'auto',
          }}
        >
          <FormControl size="small">
            <Select value={MOCK_RUN.budgetYear} sx={{ minWidth: 148 }}>
              {MOCK_RUN.budgetYears.map((y) => (
                <MenuItem key={y} value={y}>
                  ปีงบประมาณ {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 3,
              py: 1.25,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="body2" fontWeight={700} color="primary.main">
              Run #{MOCK_RUN.id}
            </Typography>
            <Typography sx={{ fontSize: '0.6875rem' }} color="text.secondary">
              คำนวณ {MOCK_RUN.computedAt} · คิดค่า {MOCK_RUN.method}
            </Typography>
            <Chip
              size="small"
              variant="tonal"
              color={MOCK_RUN.approved ? 'success' : 'warning'}
              label={MOCK_RUN.approved ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }} color="text.secondary">
              ฐานรายได้:
            </Typography>
            <ToggleButtonGroup
              size="small"
              color="primary"
              exclusive
              value={mode}
              onChange={(_, v) => v && setMode(v)}
            >
              <ToggleButton value="with_government">
                {REVENUE_MODE_LABEL.with_government}
              </ToggleButton>
              <ToggleButton value="without_government">
                {REVENUE_MODE_LABEL.without_government}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Chip size="small" color="primary" variant="tonal" label={`${fmtInt(uni.q)} นิสิต`} />
          <Chip
            size="small"
            color={uni.profit >= 0 ? 'success' : 'error'}
            variant="tonal"
            label={`${uni.profit >= 0 ? 'ส่วนเกิน' : 'ขาดทุน'} ${fmtMillion(Math.abs(uni.profit))} ลบ.`}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 30, height: 30, fontSize: '0.8125rem' }}>
              {MOCK_RUN.approver.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.35 }}>
                {MOCK_RUN.approver.name}
              </Typography>
              <Typography sx={{ fontSize: '0.6875rem', lineHeight: 1.35 }} color="text.secondary">
                {MOCK_RUN.approver.role} ·{' '}
                <Link component="button" underline="hover" sx={{ fontSize: 'inherit' }}>
                  เปลี่ยนผู้ใช้
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ข้อจำกัดของข้อมูล — แถบเตี้ยบรรทัดเดียวแบบ mockup */}
      <NoteBar severity="warning">
        <b>ข้อจำกัดของข้อมูลชุดนี้</b> — ค่าเสื่อมราคาอาคารยังไม่ครบ (ฟิลด์ <code>dep</code> รวม{' '}
        {fmtMillion(RAW.UNI.dep)} ลบ. มีเฉพาะครุภัณฑ์) TFC และ TC จึงต่ำกว่าความจริง ตัวเลขขาดทุน{' '}
        {fmtMillion(Math.abs(uni.profit))} ลบ. ที่รายงานอยู่จึง<b>น้อยกว่าความจริง</b> และ Q*
        ทุกระดับต่ำกว่าที่ควรเป็น — ดูรายการค้างตรวจที่{' '}
        <Link component={NextLink} href="/admin/exceptions" underline="hover">
          รายการค้างตรวจ
        </Link>
      </NoteBar>

      {RAW.__sample && (
        <NoteBar severity="error">
          <b>ตัวเลขในหน้านี้เป็นข้อมูลตัวอย่าง ไม่ใช่ของจริง</b> — repo
          นี้ไม่เก็บข้อมูลการเงินจริงของมหาวิทยาลัย (ดูเหตุผลใน <code>.gitignore</code>) จึงโหลด{' '}
          <code>assets/data.sample.js</code> ที่ตัวเลขถูกสุ่มรบกวนแล้ว ความสัมพันธ์ทุกสูตรยังถูกต้อง
          แต่<b>ห้ามนำตัวเลขไปอ้างอิง</b> — ถ้ามี <code>assets/data.js</code> ในเครื่อง
          หน้าจะแสดงตัวเลขจริงเองโดยอัตโนมัติ
        </NoteBar>
      )}

      <NoteBar severity="info">{REVENUE_MODE_NOTE[mode]}</NoteBar>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard
            label="นิสิตทั้งหมด"
            value={fmtInt(uni.q)}
            unit={`คน · ${RAW.FACS.length} คณะ/วิทยาลัย · ${RAW.PROGS.length} หลักสูตร`}
            accent="primary"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard
            label={mode === 'with_government' ? 'รายได้รวม (TR)' : 'รายได้เงินรายได้'}
            value={fmtMillion(uni.tr)}
            unit="ล้านบาท"
            valueColor="var(--mui-palette-primary-main)"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label="ต้นทุนรวม (TC)" value={fmtMillion(uni.tc)} unit="ล้านบาท" />
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
            value={uni.qStar !== null ? fmtInt(uni.qStar) : '—'}
            unit={uni.qStar !== null ? `คน · จริง ${fmtInt(uni.q)} คน` : 'R ≤ AVC'}
            accent="error"
            valueColor="var(--mui-palette-error-main)"
          />
        </Grid>
      </Grid>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardHeader
              title={<DotTitle color="primary.main">รายได้ (TR) เทียบ ต้นทุน (TC) รายคณะ</DotTitle>}
              subheader="เรียงตามจำนวนนิสิต · หน่วยล้านบาท"
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 2 }}>
                <LegendItem
                  color="primary.main"
                  label={mode === 'with_government' ? 'รายได้รวม (TR)' : 'เงินรายได้'}
                />
                <LegendItem color="error.main" label="ต้นทุนรวม (TC)" />
              </Box>
              <AppReactApexCharts
                type="bar"
                height={520}
                width="100%"
                options={barOptions}
                series={barSeries}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardHeader
              title={<DotTitle color="success.main">โครงสร้างต้นทุนรวม</DotTitle>}
              subheader="คงที่ (TFC) เทียบ ผันแปร (TVC)"
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
                  label="ค่าเสื่อมราคา (ในTFC)"
                  value={RAW.UNI.dep}
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
            chipLabel="Top surplus"
            chipColor="success"
            rows={top}
            sign="+"
            valueHeader="ส่วนเกิน (ลบ.)"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FacultyTable
            title="คณะที่ต้องเฝ้าระวัง (ขาดทุน)"
            chipLabel="Watchlist"
            chipColor="error"
            rows={bottom}
            sign="−"
            valueHeader="ขาดทุน (ลบ.)"
          />
        </Grid>
      </Grid>

      <Card sx={{ borderLeft: 4, borderLeftColor: 'primary.main' }}>
        <CardHeader
          title="ประเด็นสำคัญ — ภาพรวม"
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
              ทั้งมหาวิทยาลัยมีนิสิต <b>{fmtInt(uni.q)}</b> คน{' '}
              {uni.profit >= 0 ? 'มีส่วนเกิน' : 'ขาดทุนสุทธิ'}{' '}
              <b>{fmtMillion(Math.abs(uni.profit))} ลบ.</b> ({profitPctOfTr.toFixed(1)}% ของรายได้)
              จุดคุ้มทุนรวมอยู่ที่ <b>{uni.qStar !== null ? `${fmtInt(uni.qStar)} คน` : '—'}</b>
            </Typography>
          </li>
          {best && worst && (
            <li>
              <Typography variant="body2">
                คณะที่ทำส่วนเกินสูงสุดคือ <b>{shortFacName(best.fac.name)}</b> (+
                {fmtMillion(best.res.profit)} ลบ.) ขณะที่ <b>{shortFacName(worst.fac.name)}</b>{' '}
                ขาดทุนมากสุด ({fmtMillion(worst.res.profit)} ลบ.)
              </Typography>
            </li>
          )}
          <li>
            <Typography variant="body2">
              มี <b>{nLoss} คณะ</b> จาก {RAW.FACS.length} ที่ยังไม่คุ้มทุนในโหมดนี้ และ{' '}
              <b>{progLoss} หลักสูตร</b> จาก {RAW.PROGS.length} ที่ Q ยังต่ำกว่าจุดคุ้มทุน
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

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <Box sx={{ width: 11, height: 11, borderRadius: '3px', bgcolor: color }} />
    <Typography variant="caption" color="text.secondary" fontWeight={500}>
      {label}
    </Typography>
  </Box>
);

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

type FacultyRow = { fac: (typeof RAW.FACS)[number]; res: ReturnType<typeof computeBreakEven> };

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
