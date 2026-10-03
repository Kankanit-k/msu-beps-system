'use client';

// React Imports
import { useMemo, useState } from 'react';

// Next Imports
import dynamic from 'next/dynamic';

// MUI Imports
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
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
import { RAW } from '@/data/mockup';
import type { FacRow, ProgRow } from '@/data/mockup';
import { computeBreakEven, fmtInt, fmtMillion, shortFacName, sumRows } from '@views/breakeven/calc';
import type { FinancialRow } from '@views/breakeven/calc';

// View Imports
import CostSimulator from './CostSimulator';
import { composeCost, ORIGIN_META, ORIGIN_ORDER } from './costParts';
import ProgramCostTable from './ProgramCostTable';

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

/** การ์ด "ต้นทุนแยกตามที่มา" — ซ่อนไว้ก่อน เปลี่ยนเป็น true เพื่อแสดงอีกครั้ง */
const SHOW_ORIGIN_BREAKDOWN = false;

/** สัดส่วนพร้อมเครื่องหมาย % — คืน '—' ทั้งก้อนเมื่อตัวหารเป็นศูนย์ จึงไม่มีทางได้ '—%' */
const pctLabel = (part: number, whole: number) =>
  whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—';

const FAC_NAMES = RAW.FACS.map((f) => f.name);

const decimal1: Intl.NumberFormatOptions = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
};

const moneyTooltip = {
  y: {
    formatter: (v: number) => `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ.`,
  },
};

// t = 0 → อ่อนสุด (ผสมขาว 75%), 0.5 → สีหลัก, 1 → เข้มสุด (ผสมดำ 55%)
const BASE_RGB = [0x1c, 0x83, 0xd4];
const shadeOfBase = (t: number) => {
  const [target, amt] = t < 0.5 ? [255, (0.5 - t) * 2 * 0.75] : [0, (t - 0.5) * 2 * 0.55];
  const hex = BASE_RGB.map((c) =>
    Math.round(c + (target - c) * amt)
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${hex.join('')}`;
};

const CostView = () => {
  // ต้นทุนไม่ขึ้นกับโหมดฐานรายได้ แต่ส่วนต่าง/จุดคุ้มทุนขึ้น — จึงยังต้องมีสวิตช์โหมด
  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [selectedFacs, setSelectedFacs] = useState<string[]>([]);

  const uni = useMemo(() => computeBreakEven(RAW.UNI, mode), [mode]);

  // ไม่เลือกคณะใดเลย = ดูทุกคณะ (พฤติกรรมเดิมของหน้า)
  const facs: FacRow[] = useMemo(
    () => (selectedFacs.length ? RAW.FACS.filter((f) => selectedFacs.includes(f.name)) : RAW.FACS),
    [selectedFacs],
  );

  const isFiltered = selectedFacs.length > 0;
  const isSingleFac = facs.length === 1;

  const progs: ProgRow[] = useMemo(
    () => (isFiltered ? RAW.PROGS.filter((p) => selectedFacs.includes(p.fac)) : RAW.PROGS),
    [isFiltered, selectedFacs],
  );

  const scope: FinancialRow = useMemo(
    () => (isFiltered ? sumRows(facs) : RAW.UNI),
    [isFiltered, facs],
  );

  const scopeLabel = !isFiltered
    ? 'ทั้งมหาวิทยาลัย'
    : ((isSingleFac ? facs[0]?.name : undefined) ?? `${facs.length} คณะที่เลือก`);

  const res = useMemo(() => computeBreakEven(scope, mode), [scope, mode]);
  const TC = scope.TFC + scope.TVC;

  // ===== องค์ประกอบต้นทุน (donut) — รวบขึ้นจากหลักสูตรในขอบเขต =====
  const composition = useMemo(() => composeCost(progs), [progs]);
  // เรียงน้อย→มาก แล้วไล่เฉดจากอ่อน→เข้มรอบสีหลัก #1c83d4
  const visibleParts = useMemo(() => {
    const parts = composition.parts.filter((p) => p.amount > 0).sort((a, b) => a.amount - b.amount);
    return parts.map((p, i) => ({
      ...p,
      color: shadeOfBase(parts.length < 2 ? 0.5 : i / (parts.length - 1)),
    }));
  }, [composition]);

  const donutOptions: ApexOptions = useMemo(
    () => ({
      chart: { type: 'donut', parentHeightOffset: 0 },
      labels: visibleParts.map((c) => c.label),
      colors: visibleParts.map((c) => c.color),
      stroke: { width: 3, colors: ['var(--mui-palette-background-paper)'] },
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: moneyTooltip,
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              value: {
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--mui-palette-text-primary)',
                // series เป็นหน่วยล้านบาทอยู่แล้ว จึงจัดรูปแบบตรง ๆ ไม่ต้องหารซ้ำ
                formatter: (v: string) => Number(v).toLocaleString('th-TH', decimal1),
              },
              total: {
                show: true,
                label: 'ต้นทุนรวม (ลบ.)',
                fontSize: '0.75rem',
                color: 'var(--mui-palette-text-secondary)',
                // อ่านผลรวมจาก series ที่กราฟถืออยู่จริง — ไม่งั้นค่ากลางวงค้างยอดของขอบเขตก่อนหน้า
                formatter: (w) =>
                  (w.globals.seriesTotals as number[])
                    .reduce((a, b) => a + b, 0)
                    .toLocaleString('th-TH', decimal1),
              },
            },
          },
        },
      },
    }),
    [visibleParts],
  );

  const donutSeries = useMemo(
    () => visibleParts.map((c) => Number((c.amount / 1e6).toFixed(2))),
    [visibleParts],
  );

  // ===== กราฟแท่ง — รายคณะตามปกติ / เจาะรายหลักสูตรเมื่อเลือกคณะเดียว =====
  const barRows = useMemo(
    () =>
      isSingleFac
        ? [...progs]
            .sort((a, b) => b.TC - a.TC)
            .map((p) => ({ label: `${p.prog} (${p.lvl})`, TFC: p.TFC, TVC: p.TVC }))
        : facs.map((f) => ({ label: shortFacName(f.name), TFC: f.TFC, TVC: f.TVC })),
    [isSingleFac, progs, facs],
  );

  const stackedOptions: ApexOptions = useMemo(
    () => ({
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
        categories: barRows.map((r) => r.label),
        labels: { style: { fontSize: '11px' } },
      },
      yaxis: { labels: { style: { fontSize: '10px' }, maxWidth: 240 } },
      tooltip: moneyTooltip,
    }),
    [barRows],
  );

  const stackedSeries = useMemo(
    () => [
      { name: 'ต้นทุนคงที่ (TFC)', data: barRows.map((r) => Number((r.TFC / 1e6).toFixed(2))) },
      { name: 'ต้นทุนผันแปร (TVC)', data: barRows.map((r) => Number((r.TVC / 1e6).toFixed(2))) },
    ],
    [barRows],
  );

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

      {SHOW_OVERVIEW_NOTES && (
        <>
          <DataCaveatNotes profit={uni.profit} />

          <NoteBar severity="info">
            <b>ต้นทุนไม่เปลี่ยนตามฐานรายได้</b> — ต้นทุนคงที่ (TFC) ไม่เปลี่ยนตามจำนวนนิสิต ·
            ต้นทุนผันแปร (TVC) เปลี่ยนตามจำนวนนิสิต · ต้นทุนผันแปรต่อหัว (AVC) = ต้นทุนผันแปร ÷
            จำนวนนิสิต · ต้นทุนรวมต่อหัว (ATC) = ต้นทุนรวม ÷ จำนวนนิสิต
          </NoteBar>
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
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KpiCard
            label="ต้นทุนรวม (TC)"
            value={fmtMillion(TC)}
            unit="ล้านบาท"
            accent="secondary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KpiCard
            label="ต้นทุน/นิสิต (ATC)"
            value={fmtInt(res.atc)}
            unit="บาท/คน"
            accent="info"
            valueColor="var(--mui-palette-info-main)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KpiCard
            label="ต้นทุนคงที่ (TFC)"
            value={fmtMillion(scope.TFC)}
            unit={`ล้านบาท · ${pctLabel(scope.TFC, TC)} ของต้นทุนรวม`}
            accent="primary"
            valueColor="var(--mui-palette-primary-main)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KpiCard
            label="ต้นทุนผันแปร (TVC)"
            value={fmtMillion(scope.TVC)}
            unit={`ล้านบาท · ${pctLabel(scope.TVC, TC)} ของต้นทุนรวม`}
            accent="warning"
            valueColor="var(--mui-palette-warning-main)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KpiCard
            label="จำนวนนิสิต"
            value={fmtInt(scope.Q)}
            unit={`คน · ${fmtInt(progs.length)} หลักสูตร`}
            accent="success"
          />
        </Grid>
      </Grid>

      {/* ที่มาของต้นทุน — ตอบว่าคณะปรับก้อนไหนเองได้บ้าง */}
      {SHOW_ORIGIN_BREAKDOWN && (
        <Card sx={{ mb: 4 }}>
          <CardHeader
            title={<DotTitle color="primary.main">ต้นทุนแยกตามที่มา</DotTitle>}
            subheader={`ผูกถึงหลักสูตรได้แค่ไหน · ${scopeLabel} · รวม ${fmtMillion(composition.total)} ล้านบาท`}
          />
          <CardContent>
            <Grid container spacing={4}>
              {ORIGIN_ORDER.map((origin) => {
                const meta = ORIGIN_META[origin];
                const amount = composition.byOrigin[origin];
                const share = composition.total > 0 ? (amount / composition.total) * 100 : 0;

                return (
                  <Grid key={origin} size={{ xs: 12, md: 4 }}>
                    <Box
                      sx={{
                        p: 3,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        borderTop: 3,
                        borderTopColor: `${meta.accent}.main`,
                        blockSize: '100%',
                      }}
                    >
                      <Typography variant="body2" fontWeight={700}>
                        {meta.label}
                      </Typography>
                      <Typography
                        sx={{ fontSize: '1.5rem', fontWeight: 700, color: meta.color, mt: 1 }}
                      >
                        {fmtMillion(amount)}{' '}
                        <Typography component="span" variant="body2" color="text.secondary">
                          ลบ. ({share.toFixed(1)}%)
                        </Typography>
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, share)}
                        color={meta.accent}
                        sx={{ my: 2, blockSize: 6, borderRadius: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {meta.hint}
                      </Typography>
                      <Stack spacing={1} sx={{ mt: 3 }}>
                        {amount <= 0 && (
                          <Typography variant="caption" color="text.disabled">
                            ไม่มีต้นทุนกลุ่มนี้ในขอบเขตที่เลือก
                          </Typography>
                        )}
                        {composition.parts
                          .filter((p) => p.origin === origin && p.amount > 0)
                          .map((p) => (
                            <Tooltip key={p.key} title={`ที่มา: ${p.source}`} arrow>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                gap={2}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                                >
                                  <Box
                                    component="span"
                                    sx={{
                                      inlineSize: 9,
                                      blockSize: 9,
                                      borderRadius: '2px',
                                      bgcolor: p.color,
                                      flexShrink: 0,
                                    }}
                                  />
                                  {p.label}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  fontWeight={700}
                                  sx={{ whiteSpace: 'nowrap' }}
                                >
                                  {fmtMillion(p.amount)}
                                </Typography>
                              </Stack>
                            </Tooltip>
                          ))}
                      </Stack>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardHeader
              title={
                <DotTitle color="primary.main">
                  {isSingleFac ? 'โครงสร้างต้นทุนรายหลักสูตร' : 'โครงสร้างต้นทุนรายคณะ'}
                </DotTitle>
              }
              subheader={`คงที่ (TFC) + ผันแปร (TVC) · ล้านบาท · ${scopeLabel}`}
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 1 }}>
                <LegendItem color="primary.main" label="ต้นทุนคงที่ (TFC)" />
                <LegendItem color="warning.main" label="ต้นทุนผันแปร (TVC)" />
              </Box>
              {barRows.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 10 }} align="center">
                  ไม่มีข้อมูลในขอบเขตนี้
                </Typography>
              ) : (
                <AppReactApexCharts
                  type="bar"
                  height={Math.max(160, barRows.length * 22)}
                  width="100%"
                  options={stackedOptions}
                  series={stackedSeries}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardHeader
              title={<DotTitle color="success.main">โครงสร้างต้นทุน แยกองค์ประกอบ</DotTitle>}
              subheader={`${visibleParts.length} องค์ประกอบที่ชุดข้อมูลแยกออกจากกันได้ · ${scopeLabel}`}
            />
            <CardContent sx={{ pt: 0 }}>
              {visibleParts.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 10 }} align="center">
                  ไม่มีข้อมูลในขอบเขตนี้
                </Typography>
              ) : (
                <>
                  <AppReactApexCharts
                    type="donut"
                    height={200}
                    width="100%"
                    options={donutOptions}
                    series={donutSeries}
                  />
                  <Stack spacing={1} sx={{ mt: 2 }}>
                    {visibleParts.map((c) => (
                      <Tooltip key={c.key} title={`ที่มา: ${c.source}`} arrow>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 2,
                            px: 2,
                            py: 1,
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
                              sx={{
                                inlineSize: 11,
                                blockSize: 11,
                                borderRadius: '3px',
                                bgcolor: c.color,
                                flexShrink: 0,
                              }}
                            />
                            {c.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ whiteSpace: 'nowrap' }}
                          >
                            {fmtMillion(c.amount)} ลบ.{' '}
                            <Typography component="span" variant="caption" color="text.secondary">
                              {pctLabel(c.amount, composition.total)}
                            </Typography>
                          </Typography>
                        </Box>
                      </Tooltip>
                    ))}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ProgramCostTable
        progs={progs}
        mode={mode}
        showFaculty={!isSingleFac}
        scopeLabel={scopeLabel}
      />

      <CostSimulator key={scopeLabel} base={scope} mode={mode} scopeLabel={scopeLabel} />
    </Box>
  );
};

export default CostView;
