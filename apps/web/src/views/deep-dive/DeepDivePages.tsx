'use client';

// React Imports
import { useMemo } from 'react';

// Next Imports
import Link from 'next/link';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

import type { ReactNode } from 'react';

// Component Imports
import { BEPS, KPI_COLORS } from '@components/ChartBits';
import KpiTile from '@components/KpiTile';
import { fmtInt, fmtMillion } from '@views/breakeven/calc';

import { useDeepDive } from './DeepDiveContext';
import type { DDRow, StatusFilter } from './DeepDiveContext';
import { ChartCard, Donut, TopBars, YearTrend } from './DeepDiveCharts';
import {
  catLabel,
  changePct,
  COST_CAT_LIST,
  COST_YEARS,
  cumulativeLoss,
  DD_LAST,
  DD_STATUS_META,
  DD_YEARS,
  DRIVER_SHARE,
  lastValue,
  PER_HEAD_ALERT,
  sumSeries,
  topCategory,
  yearsWithData,
} from './deepDiveData';
import type { Series } from './deepDiveData';
import HistoryFilterBar from './HistoryFilterBar';
import { buildInsights, costPerHead, PER_HEAD_MIN_Q, perHeadRatio } from './insights';
import type { Insight } from './insights';
import MatrixTable from './MatrixTable';
import type { ExtraCol, MatrixRow } from './MatrixTable';

type Page = 'breakeven' | 'revenue' | 'cost';

const PENDING_YEARS = DD_YEARS.filter((y) => !COST_YEARS.includes(y));

const toM = (s: Series): Series => s.map((v) => (v === null ? null : Number((v / 1e6).toFixed(2))));
const fmtM = (v: number | null) => (v === null ? '—' : fmtMillion(v));
const fmtM2 = (v: number | null) =>
  v === null
    ? '—'
    : (v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (v: number | null) => (v === null ? '—' : fmtInt(v));
const fmtPct = (v: number | null) => (v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(0)}%`);
const toneSigned = (v: number | null) =>
  v === null ? undefined : v < 0 ? 'error.main' : 'success.main';
const axisM = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 1 });

const CAT_COLORS = [
  BEPS.cost.dark,
  KPI_COLORS.orange,
  KPI_COLORS.amber,
  BEPS.cost.light,
  KPI_COLORS.purple,
  BEPS.compare.dark,
  KPI_COLORS.cyan,
  BEPS.breakEven,
  BEPS.revenue.light,
  BEPS.compare.light,
  KPI_COLORS.grey,
  BEPS.navy,
  KPI_COLORS.green,
];

const StatusChip = ({ r }: { r: DDRow }) => {
  const m = DD_STATUS_META[r.status];

  return (
    <Chip
      size="small"
      color={m.color}
      variant="tonal"
      label={m.label}
      sx={{ height: 18, fontSize: '0.68rem' }}
    />
  );
};

/** ไปหน้าอื่นในหมวดพร้อมกรองที่หลักสูตรนั้น */
const useGo = () => {
  const dd = useDeepDive();

  return (page: Page, row?: DDRow, status?: StatusFilter) =>
    dd.go(`/deep-dive/${page}`, row, status);
};

/** โครงหน้า: แถบกรอง → (ข้อความ) → กราฟ 3 ช่อง → ตาราง Matrix */
const Shell = ({
  section,
  note,
  charts,
  table,
  tableTitle,
}: {
  section: string;
  note?: ReactNode;
  charts: ReactNode[];
  table: ReactNode;
  tableTitle: string;
}) => {
  const { scope } = useDeepDive();

  return (
    <Box>
      <HistoryFilterBar section={section} />
      {scope.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 8, textAlign: 'center' }}>
            <Typography color="text.secondary">
              ไม่มีหลักสูตรในคณะ/ระดับที่เลือก — เปลี่ยนตัวกรองด้านบน
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {note}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {charts.map((c, i) => (
              <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
                {c}
              </Grid>
            ))}
          </Grid>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {tableTitle}
              </Typography>
              {table}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

const PendingNote = () => (
  <Alert severity="info" sx={{ mb: 3 }}>
    ต้นทุน เงินแผ่นดิน และจุดคุ้มทุน มีเฉพาะปีงบ {COST_YEARS.join(', ')} — ปี {PENDING_YEARS[0]}–
    {PENDING_YEARS[PENDING_YEARS.length - 1]} รอข้อมูลงบประมาณย้อนหลังจากกองแผน (แสดง “—”
    ไม่ใช้ตัวเลขประมาณ)
  </Alert>
);

/* ============================== จุดคุ้มทุนย้อนหลัง ============================== */

export const DeepDiveBreakEvenPage = () => {
  const dd = useDeepDive();
  const { rows, mode } = dd;

  const profitSum = useMemo(() => sumSeries(rows.map((x) => x.profit[mode])), [rows, mode]);

  const counts = useMemo(
    () =>
      ['ok', 'loss'].map((k) =>
        DD_YEARS.map((_, i) => {
          const vs = rows
            .map((x) => x.profit[mode][i])
            .filter((v): v is number => v !== null && v !== undefined);

          return vs.length ? vs.filter((v) => (k === 'ok' ? v >= 0 : v < 0)).length : null;
        }),
      ),
    [rows, mode],
  );

  const topLoss = useMemo(
    () =>
      rows
        .map((x) => ({ key: x.key, label: x.p.prog, value: cumulativeLoss(x.profit[mode]) / 1e6 }))
        .filter((i) => i.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    [rows, mode],
  );

  // อันดับ: ขาดทุนติดต่อกัน → ขาดทุนสะสม
  const ranked = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          b.streak - a.streak || cumulativeLoss(b.profit[mode]) - cumulativeLoss(a.profit[mode]),
      ),
    [rows, mode],
  );

  const mrows: MatrixRow[] = ranked.map((x) => ({
    key: x.key,
    label: x.p.prog,
    sub: x.p.deg,
    badge: <StatusChip r={x} />,
    values: x.profit[mode],
    children: [
      { key: `${x.key}|tr`, label: 'รายได้รวม (ลบ.)', values: x.revenue[mode], fmt: fmtM2 },
      { key: `${x.key}|tc`, label: 'ต้นทุนรวม (ลบ.)', values: x.tc, fmt: fmtM2 },
      { key: `${x.key}|n`, label: 'นิสิต (คน · ทะเบียน)', values: x.students, fmt: fmtN },
    ],
  }));

  const byKey = new Map(rows.map((x) => [x.key, x]));

  const extra: ExtraCol[] = [
    {
      key: 'streak',
      label: 'ขาดทุนติดต่อกัน (ปี)',
      hint: 'นับถอยจากปีล่าสุดที่มีข้อมูล · ≥ 3 ปี = วิกฤต',
      get: (r) => byKey.get(r.key)?.streak ?? null,
      fmt: fmtN,
      tone: (v) => (v && v >= 3 ? 'error.main' : undefined),
    },
    {
      key: 'cum',
      label: 'ขาดทุนสะสม (ลบ.)',
      get: (r) => cumulativeLoss(r.values),
      fmt: fmtM2,
    },
    {
      key: 'years',
      label: 'ปีที่มีข้อมูล',
      get: (r) => yearsWithData(r.values),
      fmt: fmtN,
    },
  ];

  return (
    <Shell
      section="จุดคุ้มทุนย้อนหลัง"
      note={<PendingNote />}
      charts={[
        <ChartCard
          key="1"
          title="ส่วนเกิน/ขาดทุนรวม (ลบ.)"
          info="ผลรวม (รายได้ − ต้นทุนรวม) ของหลักสูตรที่กรองอยู่ · บวก = ส่วนเกิน · ลบ = ขาดทุน"
        >
          <YearTrend
            type="bar"
            signedColors
            fmt={axisM}
            series={[{ name: 'ส่วนเกิน/ขาดทุน', color: BEPS.profit, data: toM(profitSum) }]}
          />
        </ChartCard>,
        <ChartCard
          key="2"
          title="จำนวนหลักสูตร คุ้มทุน / ไม่คุ้มทุน"
          legend={[
            { color: KPI_COLORS.green, label: 'คุ้มทุน' },
            { color: KPI_COLORS.red, label: 'ไม่คุ้มทุน' },
          ]}
        >
          <YearTrend
            type="bar"
            stacked
            fmt={(v) => fmtInt(v)}
            series={[
              { name: 'คุ้มทุน', color: KPI_COLORS.green, data: counts[0]! },
              { name: 'ไม่คุ้มทุน', color: KPI_COLORS.red, data: counts[1]! },
            ]}
          />
        </ChartCard>,
        <ChartCard
          key="3"
          title="ขาดทุนสะสมสูงสุด 10 อันดับ (ลบ.)"
          info="กดแท่งเพื่อกรองตารางไปที่หลักสูตรนั้น"
        >
          <TopBars
            items={topLoss}
            fmt={axisM}
            color={KPI_COLORS.red}
            onPick={(k) => {
              const x = byKey.get(k);

              if (x) dd.focus(x);
            }}
          />
        </ChartCard>,
      ]}
      tableTitle={`ส่วนเกิน/ขาดทุนรายหลักสูตร × ปี (ลบ.) — ${dd.level}`}
      table={
        <MatrixTable
          rows={mrows}
          fmt={fmtM2}
          signed
          pendingYears={PENDING_YEARS}
          extra={extra}
          total={{ label: `รวม ${rows.length} หลักสูตร`, values: profitSum }}
          defaultSort={{ key: '' }}
          emptyText="ไม่มีหลักสูตรตามตัวกรอง — ลองเลือกสถานะ “ทุกสถานะ” หรือล้างคำค้นหา"
        />
      }
    />
  );
};

/* ============================== รายได้ย้อนหลัง ============================== */

export const DeepDiveRevenuePage = () => {
  const dd = useDeepDive();
  const { rows } = dd;

  const tuition = useMemo(() => sumSeries(rows.map((x) => x.tuition)), [rows]);
  const students = useMemo(() => sumSeries(rows.map((x) => x.students)), [rows]);
  const perHead = tuition.map((v, i) => (v !== null && students[i] ? v / students[i] : null));

  const movers = useMemo(
    () =>
      rows
        .map((x) => ({ key: x.key, label: x.p.prog, d: changePct(x.tuition) }))
        .filter((i): i is { key: string; label: string; d: number } => i.d !== null)
        .filter((i) => i.d < 0)
        .sort((a, b) => a.d - b.d)
        .slice(0, 10)
        // แสดงเป็นขนาดที่ลดลง (บวก) ให้แท่งยาวไปทางเดียวกัน
        .map((i) => ({ ...i, value: Number((-i.d).toFixed(1)) })),
    [rows],
  );

  const byKey = new Map(rows.map((x) => [x.key, x]));

  const mrows: MatrixRow[] = rows.map((x) => ({
    key: x.key,
    label: x.p.prog,
    sub: x.p.deg,
    values: x.tuition,
    children: [
      { key: `${x.key}|n`, label: 'นิสิต (คน)', values: x.students, fmt: fmtN },
      { key: `${x.key}|gov`, label: 'เงินแผ่นดิน (ลบ.)', values: x.gov, fmt: fmtM2 },
    ],
  }));

  const extra: ExtraCol[] = [
    {
      key: 'd',
      label: `Δ ค่าเทอม ${DD_YEARS[0]}→${DD_LAST}`,
      hint: 'เทียบปีแรกที่มีข้อมูลกับปีล่าสุด',
      get: (r) => changePct(r.values),
      fmt: fmtPct,
      tone: toneSigned,
    },
    {
      key: 'dn',
      label: 'Δ นิสิต',
      get: (r) => changePct(byKey.get(r.key)?.students ?? []),
      fmt: fmtPct,
      tone: toneSigned,
    },
  ];

  return (
    <Shell
      section="รายได้ย้อนหลัง"
      note={
        <Alert severity="info" sx={{ mb: 3 }}>
          ค่าเทอม = ยอดเรียกเก็บจริงจากระบบทะเบียน (ภาค 1 + 2 + ฤดูร้อน · ยอดตั้งบิล ไม่ใช่เงินรับ)
          ต่างจากเงินรายได้ในชีตจุดคุ้มทุนเล็กน้อย · เงินแผ่นดินมีเฉพาะปีงบ {COST_YEARS.join(', ')}
        </Alert>
      }
      charts={[
        <ChartCard key="1" title="ค่าเทอมเรียกเก็บรวม (ลบ.)">
          <YearTrend
            type="bar"
            fmt={axisM}
            series={[{ name: 'ค่าเทอม', color: BEPS.revenue.dark, data: toM(tuition) }]}
          />
        </ChartCard>,
        <ChartCard
          key="2"
          title="นิสิต vs ค่าเทอมต่อหัว"
          legend={[
            { color: BEPS.compare.dark, label: 'นิสิต (คน)' },
            { color: BEPS.revenue.light, label: 'ค่าเทอม/หัว (พันบาท)' },
          ]}
        >
          <YearTrend
            type="line"
            dualAxis
            fmt={(v) => fmtInt(v)}
            series={[
              { name: 'นิสิต (คน)', color: BEPS.compare.dark, data: students },
              {
                name: 'ค่าเทอม/หัว (พันบาท)',
                color: BEPS.revenue.light,
                data: perHead.map((v) => (v === null ? null : Math.round(v / 1000))),
              },
            ]}
          />
        </ChartCard>,
        <ChartCard
          key="3"
          title="ค่าเทอมลดลงมากสุด 10 อันดับ (%)"
          info="% เปลี่ยนของค่าเทอมเรียกเก็บ ปีแรก → ปีล่าสุด (−100% = ไม่มีค่าเทอมปีล่าสุด) · กดแท่งเพื่อกรองตาราง"
        >
          <TopBars
            items={movers}
            fmt={(v) => `−${v.toFixed(0)}%`}
            color={KPI_COLORS.red}
            onPick={(k) => {
              const x = byKey.get(k);

              if (x) dd.focus(x);
            }}
          />
        </ChartCard>,
      ]}
      tableTitle={`ค่าเทอมเรียกเก็บรายหลักสูตร × ปีการศึกษา (ลบ.) — ${dd.level}`}
      table={
        <MatrixTable
          rows={mrows}
          fmt={fmtM2}
          extra={extra}
          total={{ label: `รวม ${rows.length} หลักสูตร`, values: tuition }}
          emptyText="ไม่มีหลักสูตรตามตัวกรอง — ล้างคำค้นหาหรือเลือกสถานะอื่น"
        />
      }
    />
  );
};

/* ============================== ต้นทุนย้อนหลังรายหมวด ============================== */

export const DeepDiveCostPage = () => {
  const dd = useDeepDive();
  const { rows } = dd;
  // ค่ากลางจากทั้งคณะ/ระดับ ไม่ใช่แถวที่กรองแล้ว (เจาะหลักสูตรเดียวแล้วอัตราจะกลายเป็น 1.0)
  const ratioOf = useMemo(() => perHeadRatio(dd.scope), [dd.scope]);

  const tfc = useMemo(() => sumSeries(rows.map((x) => x.cost.map((c) => c?.tfc ?? null))), [rows]);
  const tvc = useMemo(() => sumSeries(rows.map((x) => x.cost.map((c) => c?.tvc ?? null))), [rows]);
  const tc = useMemo(() => sumSeries(rows.map((x) => x.tc)), [rows]);

  // สัดส่วนหมวด ปีล่าสุดที่มีต้นทุน
  const catItems = useMemo(() => {
    const idx = DD_YEARS.indexOf(COST_YEARS[COST_YEARS.length - 1] as (typeof DD_YEARS)[number]);

    return COST_CAT_LIST.map((c, i) => ({
      label: catLabel(c),
      value: rows.reduce((a, x) => a + (x.cost[idx]?.cats[i] ?? 0), 0),
      color: CAT_COLORS[i % CAT_COLORS.length]!,
    })).filter((c) => c.value > 0);
  }, [rows]);

  const topHead = useMemo(
    () =>
      rows
        .map((x) => ({ key: x.key, label: x.p.prog, r: ratioOf(x) }))
        .filter((i): i is { key: string; label: string; r: number } => i.r !== null)
        .sort((a, b) => b.r - a.r)
        .slice(0, 10)
        .map((i) => ({
          ...i,
          value: Number(i.r.toFixed(2)),
          color: i.r >= PER_HEAD_ALERT ? KPI_COLORS.red : BEPS.compare.dark,
        })),
    [rows, ratioOf],
  );

  const byKey = new Map(rows.map((x) => [x.key, x]));

  const mrows: MatrixRow[] = rows.map((x) => {
    const t = topCategory(x);

    return {
      key: x.key,
      label: x.p.prog,
      sub: x.p.deg,
      badge:
        t && t.share >= DRIVER_SHARE ? (
          <Chip
            size="small"
            color="warning"
            variant="tonal"
            label={`กองที่ ${t.cat.name} ${(t.share * 100).toFixed(0)}%`}
            sx={{ height: 18, fontSize: '0.68rem' }}
          />
        ) : undefined,
      values: x.tc,
      children: COST_CAT_LIST.map((c, i) => ({
        key: `${x.key}|${c.code}`,
        label: catLabel(c),
        values: x.cost.map((v) => (v ? v.cats[i]! : null)),
      })).filter((ch) => ch.values.some((v) => v)),
    };
  });

  const extra: ExtraCol[] = [
    {
      key: 'top',
      label: 'หมวดใหญ่สุด (%)',
      hint: `สัดส่วนของหมวดที่ใหญ่สุดในต้นทุนรายหมวด · ≥ ${DRIVER_SHARE * 100}% = ต้นทุนกองที่หมวดนั้น`,
      get: (r) => {
        const t = byKey.get(r.key) && topCategory(byKey.get(r.key)!);

        return t ? t.share * 100 : null;
      },
      fmt: (v) => (v === null ? '—' : `${v.toFixed(0)}%`),
      tone: (v) => (v !== null && v >= DRIVER_SHARE * 100 ? 'warning.main' : undefined),
    },
    {
      key: 'ph',
      label: 'ต้นทุน/หัว (บาท)',
      get: (r) => (byKey.get(r.key) ? costPerHead(byKey.get(r.key)!) : null),
      fmt: fmtN,
    },
    {
      key: 'ratio',
      label: '× ค่ากลาง',
      hint: `ต้นทุนต่อหัว ÷ ค่ากลางของทุกหลักสูตรในคณะ/ระดับที่เลือก · ≥ ${PER_HEAD_ALERT} เท่า = สูงผิดปกติ · ไม่เทียบหลักสูตรที่นิสิตน้อยกว่า ${PER_HEAD_MIN_Q} คน`,
      get: (r) => (byKey.get(r.key) ? ratioOf(byKey.get(r.key)!) : null),
      fmt: (v) => (v === null ? '—' : v.toFixed(1)),
      tone: (v) => (v !== null && v >= PER_HEAD_ALERT ? 'error.main' : undefined),
    },
  ];

  return (
    <Shell
      section="ต้นทุนย้อนหลังรายหมวด"
      note={<PendingNote />}
      charts={[
        <ChartCard
          key="1"
          title="ต้นทุนรวม คงที่ / ผันแปร (ลบ.)"
          legend={[
            { color: BEPS.cost.dark, label: 'คงที่' },
            { color: BEPS.cost.light, label: 'ผันแปร' },
          ]}
        >
          <YearTrend
            type="bar"
            stacked
            fmt={axisM}
            series={[
              { name: 'คงที่', color: BEPS.cost.dark, data: toM(tfc) },
              { name: 'ผันแปร', color: BEPS.cost.light, data: toM(tvc) },
            ]}
          />
        </ChartCard>,
        <ChartCard
          key="2"
          title={`ต้นทุนไปกองอยู่ที่ไหน (ปีงบ ${COST_YEARS[COST_YEARS.length - 1]})`}
          info="สัดส่วนหมวดค่าใช้จ่ายตามผังบัญชี รวมทุกหลักสูตรที่กรองอยู่ · ที่มา: แท็บ 4 ของชีต (รวมส่วนกลางคณะที่ปันมาแล้ว)"
        >
          <Donut items={catItems} fmt={(v) => `${fmtMillion(v)} ลบ.`} />
        </ChartCard>,
        <ChartCard
          key="3"
          title="ต้นทุนต่อหัวเทียบค่ากลาง (เท่า)"
          info={`แดง = สูงกว่าค่ากลาง ≥ ${PER_HEAD_ALERT} เท่า · กดแท่งเพื่อกรองตาราง`}
        >
          <TopBars
            items={topHead}
            fmt={(v) => `${v.toFixed(1)}×`}
            color={BEPS.compare.dark}
            onPick={(k) => {
              const x = byKey.get(k);

              if (x) dd.focus(x);
            }}
          />
        </ChartCard>,
      ]}
      tableTitle={`ต้นทุนรวมรายหลักสูตร × ปี (ลบ.) — กาง ▸ เพื่อดูรายหมวด (รายหมวดมาจากแท็บ 4 ของชีต ผลรวมอาจต่างจากยอดรวมแท็บ 3 เล็กน้อย) — ${dd.level}`}
      table={
        <MatrixTable
          rows={mrows}
          fmt={fmtM2}
          pendingYears={PENDING_YEARS}
          extra={extra}
          total={{ label: `รวม ${rows.length} หลักสูตร`, values: tc }}
          emptyText="ไม่มีหลักสูตรตามตัวกรอง — ล้างคำค้นหาหรือเลือกสถานะอื่น"
        />
      }
    />
  );
};

/* ============================== หน้ารวม ============================== */

const TONE_ICON: Record<Insight['tone'], string> = {
  error: 'ri-alarm-warning-line',
  warning: 'ri-error-warning-line',
  info: 'ri-information-line',
  success: 'ri-checkbox-circle-line',
};

const PAGES: { page: Page; title: string; desc: string; icon: string; color: string }[] = [
  {
    page: 'breakeven',
    title: 'จุดคุ้มทุนย้อนหลัง',
    desc: 'คุ้ม/ไม่คุ้มทุนรายปี · จัดอันดับขาดทุนต่อเนื่อง',
    icon: 'ri-focus-3-line',
    color: BEPS.breakEven,
  },
  {
    page: 'revenue',
    title: 'รายได้ย้อนหลัง',
    desc: 'ค่าเทอมและนิสิต 5 ปี · หลักสูตรที่โต/หด',
    icon: 'ri-hand-coin-line',
    color: BEPS.revenue.dark,
  },
  {
    page: 'cost',
    title: 'ต้นทุนย้อนหลังรายหมวด',
    desc: 'ต้นทุนกองอยู่หมวดไหน · ต้นทุนต่อหัวผิดปกติ',
    icon: 'ri-stack-line',
    color: BEPS.cost.dark,
  },
];

export const DeepDiveLanding = () => {
  const dd = useDeepDive();
  const go = useGo();
  const { scope, mode } = dd;

  const insights = useMemo(() => buildInsights(scope, mode), [scope, mode]);
  const n = (s: DDRow['status']) => scope.filter((x) => x.status === s).length;
  const losing = scope.filter((x) => (lastValue(x.profit[mode]) ?? 0) < 0);
  const lossSum = losing.reduce((a, x) => a + lastValue(x.profit[mode])!, 0);
  const tuitionD = changePct(sumSeries(scope.map((x) => x.tuition)));

  const risky = useMemo(
    () =>
      [...scope]
        .filter((x) => x.status === 'crisis' || x.status === 'watch')
        .sort(
          (a, b) =>
            b.streak - a.streak || cumulativeLoss(b.profit[mode]) - cumulativeLoss(a.profit[mode]),
        )
        .slice(0, 10),
    [scope, mode],
  );

  const tile = (status: StatusFilter, page: Page, el: ReactNode) => (
    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
      <CardActionArea
        sx={{ borderRadius: 1, blockSize: '100%' }}
        onClick={() => go(page, undefined, status)}
      >
        {el}
      </CardActionArea>
    </Grid>
  );

  return (
    <Box>
      <HistoryFilterBar section="หน้ารวม" hideStatus />
      <PendingNote />
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {tile(
          'crisis',
          'breakeven',
          <KpiTile
            label="หลักสูตรวิกฤต"
            value={fmtInt(n('crisis'))}
            suffix="หลักสูตร"
            accent="error"
            icon="ri-alarm-warning-line"
            footer={COST_YEARS.length < 3 ? 'ต้องมีข้อมูลต้นทุน ≥ 3 ปี' : 'ขาดทุนติดต่อกัน ≥ 3 ปี'}
          />,
        )}
        {tile(
          'watch',
          'breakeven',
          <KpiTile
            label="เฝ้าระวัง"
            value={fmtInt(n('watch'))}
            suffix="หลักสูตร"
            accent="warning"
            icon="ri-eye-line"
            footer="ขาดทุน 1–2 ปีล่าสุด หรือค่าเทอมลดลง 3 ปีติด"
          />,
        )}
        {tile(
          'loss',
          'breakeven',
          <KpiTile
            label={`ไม่คุ้มทุน ปีงบ ${DD_LAST}`}
            value={`${fmtInt(losing.length)} / ${fmtInt(scope.length)}`}
            suffix="หลักสูตร"
            accent="error"
            color={BEPS.cost.dark}
            icon="ri-arrow-down-circle-line"
            footer={`ขาดทุนรวม ${fmtM(-lossSum)} ลบ.`}
          />,
        )}
        {tile(
          'all',
          'revenue',
          <KpiTile
            label={`ค่าเทอม ${DD_YEARS[0]}→${DD_LAST}`}
            value={fmtPct(tuitionD)}
            accent="primary"
            color={BEPS.revenue.dark}
            icon="ri-line-chart-line"
            footer="ยอดเรียกเก็บรวมของหลักสูตรที่เลือก"
          />,
        )}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardContent>
              <Typography variant="h6">บทวิเคราะห์และจุดสังเกต — {dd.level}</Typography>
              <Typography variant="caption" color="text.secondary">
                สร้างจากตัวเลขในระบบด้วยเกณฑ์ตายตัว · กดเพื่อเปิดหน้าที่เกี่ยวข้อง
              </Typography>
              <List dense>
                {insights.map((it, i) => (
                  <ListItemButton
                    key={i}
                    onClick={() => go(it.page, it.row)}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemIcon sx={{ minInlineSize: 32, color: `${it.tone}.main` }}>
                      <i className={TONE_ICON[it.tone]} />
                    </ListItemIcon>
                    <ListItemText primary={it.text} />
                  </ListItemButton>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardContent>
              <Typography variant="h6">หลักสูตรเสี่ยงสูงสุด 10 อันดับ</Typography>
              <Typography variant="caption" color="text.secondary">
                เรียงตามขาดทุนติดต่อกัน → ขาดทุนสะสม
              </Typography>
              {risky.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                  ไม่มีหลักสูตรวิกฤต/เฝ้าระวังในขอบเขตนี้
                </Typography>
              ) : (
                <List dense>
                  {risky.map((x, i) => (
                    <ListItemButton
                      key={x.key}
                      onClick={() => go('breakeven', x)}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemIcon sx={{ minInlineSize: 28 }}>
                        <Typography variant="body2" color="text.secondary">
                          {i + 1}
                        </Typography>
                      </ListItemIcon>
                      <ListItemText
                        primary={x.p.prog}
                        secondary={`ขาดทุนติดต่อกัน ${x.streak} ปี · สะสม ${fmtM(cumulativeLoss(x.profit[mode]))} ลบ.`}
                        slotProps={{ primary: { noWrap: true } }}
                      />
                      <StatusChip r={x} />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {PAGES.map((p) => (
          <Grid key={p.page} size={{ xs: 12, md: 4 }}>
            <Card>
              <CardActionArea component={Link} href={`/deep-dive/${p.page}/`} sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Box
                    sx={{
                      inlineSize: 40,
                      blockSize: 40,
                      borderRadius: '10px',
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: p.color,
                      color: 'common.white',
                      flexShrink: 0,
                    }}
                  >
                    <i className={p.icon} />
                  </Box>
                  <Box>
                    <Typography fontWeight={600}>{p.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {p.desc}
                    </Typography>
                  </Box>
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
