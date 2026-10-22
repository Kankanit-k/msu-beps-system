'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

// Next Imports
import dynamic from 'next/dynamic';

// MUI Imports
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import type { ApexOptions } from 'apexcharts';
import type { BreakEvenResult, RevenueMode } from '@beps/calc-engine';

// Component Imports
import {
  BarTitle,
  BEPS,
  KPI_BAR_TRACK,
  kpiBarLabels,
  LegendItem,
} from '@components/ChartBits';
import InfoTip from '@components/InfoTip';
import KpiTile from '@components/KpiTile';
import PageHeaderBar, { MOCK_RUN } from '@components/PageHeaderBar';
import { isUniversityLevel, lockedFacultyFor } from '@/configs/accessControl';
import { useRole } from '@/hooks/useRole';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import type { ProgRow } from '@/data/mockup';
import BreakEvenLineChart from '@views/breakeven/BreakEvenLineChart';
import {
  computeBreakEven,
  fmtInt,
  fmtMillion,
  levelRank,
  REVENUE_MODE_LABEL,
  sheetQStar,
  shortFacName,
  sumRows,
} from '@views/breakeven/calc';
import { buildProgramCrossData, progKey, progName } from '@views/cross/crossData';
import { HeatmapCard, RankingCard, ScatterPair } from '@views/cross/CrossPanels';
import type { AfterResult } from '@views/cross/CrossPanels';
import { useFacultyLock } from '@views/fixed-cost-lock/lockStore';
import { ALLOC_METHOD_LABEL } from '@views/scenario-program/facultyAllocation';
import { loadHistory } from '@views/scenario-program/historyStore';
import { progOptionLabel } from '@views/scenario-program/programData';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

const FAC_NAMES = RAW.FACS.map((f) => f.name);

/** สีชุดเดียวกับภาพรวมมหาวิทยาลัย (BEPS): รายได้ = ม่วงเข้ม/อ่อน · ต้นทุน = ชมพูเข้ม/อ่อน */
/** ตัวกรองระดับการศึกษา — ชุดเดียวกับภาพรวมมหาวิทยาลัย ("ทุกระดับ" รวม ป.บัณฑิต/ประกาศนียบัตรด้วย) */
const LEVELS = [
  { key: 'all', label: 'ทุกระดับ', lvl: null },
  { key: 'b', label: 'ตรี', lvl: 'ปริญญาตรี' },
  { key: 'm', label: 'โท', lvl: 'ปริญญาโท' },
  { key: 'd', label: 'เอก', lvl: 'ปริญญาเอก' },
] as const;

const C = {
  own: BEPS.revenue.dark,
  st: BEPS.revenue.light,
  fixed: BEPS.cost.dark,
  variable: BEPS.cost.light,
};

const INFO = {
  q: 'จำนวนนิสิตจริงทุกชั้นปีของคณะ (ตามข้อมูลชีต)',
  qStar:
    'จำนวนนิสิตที่ทำให้รายได้เท่ากับต้นทุนพอดี = ต้นทุนคงที่ ÷ (รายได้ต่อหัว − ต้นทุนผันแปรต่อหัว) คิดรายหลักสูตรแล้วรวมเป็นคณะ — ใช้เป็น "เป้า" ของหน้านี้',
  r: 'รายได้รวม ÷ นิสิตจริง · รวมเงินแผ่นดิน = เงินแผ่นดิน + เงินรายได้ · ไม่รวม = เงินรายได้ (ค่าธรรมเนียม) อย่างเดียว',
  avc: 'ต้นทุนผันแปรรวม ÷ นิสิตจริง — ต้นทุนที่เพิ่มขึ้นตามจำนวนนิสิต',
  cm: 'รายได้ต่อหัว − ต้นทุนผันแปรต่อหัว = เงินที่นิสิตแต่ละคนเหลือไว้ช่วยจ่ายต้นทุนคงที่',
  profit: 'รายได้รวม − ต้นทุนรวม (ต้นทุนคงที่ + ต้นทุนผันแปร)',
};

type ProgStat = {
  p: ProgRow;
  key: string;
  label: string;
  /** จุดคุ้มทุนแบบชีต — ติดลบ = รายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร (ไม่มีจุดคุ้มทุน) */
  qStarGov: number;
  qStarOwn: number;
};

type LevelStat = {
  lvl: string;
  n: number;
  Q: number;
  st: number;
  own: number;
  TFC: number;
  TVC: number;
  qStarGov: number;
  qStarOwn: number;
};

const FacultyOverview = () => {
  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [tab, setTab] = useState<'rev' | 'cost' | 'be'>('rev');
  const [beView, setBeView] = useState<'rank' | 'heat'>('rank');
  const [detail, setDetail] = useState<ProgRow | null>(null);

  // ระดับมหาวิทยาลัยเลือกคณะได้ · ระดับคณะ/อาจารย์ถูกล็อกที่คณะของตน
  const { role, scope } = useRole();
  const canPick = isUniversityLevel(role);
  const lockedFac = lockedFacultyFor(role, scope);
  const [pickedFac, setPickedFac] = useState<string>(FAC_NAMES[0] ?? '');
  const facName = lockedFac ?? pickedFac;
  const fac = RAW.FACS.find((f) => f.name === facName) ?? RAW.FACS[0]!;

  const [level, setLevel] = useState<(typeof LEVELS)[number]['key']>('all');
  const levelOpt = LEVELS.find((l) => l.key === level) ?? LEVELS[0];

  // ชุดข้อมูลมีเฉพาะปีงบล่าสุด — ปีอื่นแสดงไว้แต่เลือกไม่ได้จนกว่าจะนำเข้าข้อมูล
  const [year, setYear] = useState(MOCK_RUN.budgetYear);
  const { lock } = useFacultyLock(year, fac.name);

  // หลักสูตรที่มีนิสิต (ตามระดับที่กรอง) — เรียงตามระดับ แล้วตามนิสิตมากไปน้อย
  const progs = useMemo<ProgStat[]>(
    () =>
      RAW.PROGS.filter(
        (p) => p.fac === fac.name && p.Q > 0 && (!levelOpt.lvl || p.lvl === levelOpt.lvl),
      )
        .sort((a, b) => levelRank(a.lvl) - levelRank(b.lvl) || b.Q - a.Q)
        .map((p) => ({
          p,
          key: progKey(p),
          label: progName(p),
          qStarGov: sheetQStar(p, 'with_government'),
          qStarOwn: sheetQStar(p, 'without_government'),
        })),
    [fac.name, levelOpt],
  );

  // ทุกระดับ = แถวคณะในชีต · กรองระดับ = รวมหลักสูตรในระดับนั้น (Q* = ผลบวก Q* แบบชีต)
  const scopeRow = useMemo(
    () => (levelOpt.lvl ? sumRows(progs.map((x) => x.p)) : fac),
    [levelOpt, progs, fac],
  );
  const res = useMemo(() => computeBreakEven(scopeRow, mode), [scopeRow, mode]);

  const levels = useMemo<LevelStat[]>(() => {
    const m = new Map<string, LevelStat>();

    progs.forEach(({ p, qStarGov, qStarOwn }) => {
      const l = m.get(p.lvl) ?? {
        lvl: p.lvl,
        n: 0,
        Q: 0,
        st: 0,
        own: 0,
        TFC: 0,
        TVC: 0,
        qStarGov: 0,
        qStarOwn: 0,
      };

      l.n += 1;
      l.Q += p.Q;
      l.st += p.st;
      l.own += p.own;
      l.TFC += p.TFC;
      l.TVC += p.TVC;
      l.qStarGov += qStarGov;
      l.qStarOwn += qStarOwn;
      m.set(p.lvl, l);
    });

    return [...m.values()];
  }, [progs]);

  const crossRows = useMemo(() => {
    const keys = new Set(progs.map((x) => x.key));

    return buildProgramCrossData(fac.name, 'all', mode).filter((x) => x.key && keys.has(x.key));
  }, [fac.name, mode, progs]);

  // ผลหลังปรับ = รายการล่าสุดที่บันทึกจากหน้าปรับปรุงหลักสูตรเดิม (เก็บในเบราว์เซอร์เครื่องนี้)
  const [history, setHistory] = useState<ReturnType<typeof loadHistory>>([]);

  useEffect(() => setHistory(loadHistory()), []);

  const after = useMemo(() => {
    const out = new Map<string, AfterResult>();

    progs.forEach(({ p, key }) => {
      const hit = history
        .filter(
          (h) =>
            !h.isNew &&
            h.fac === p.fac &&
            (h.ref ? h.ref === progOptionLabel(p) : h.name === p.prog && h.level === p.lvl),
        )
        .sort((a, b) => b.id - a.id)[0];

      if (!hit) return;
      const r = mode === 'with_government' ? hit.withGov : hit.withoutGov;
      const valid = r.qStarStatus === 'normal' && r.qStar !== null && r.qStar > 0;

      out.set(key, {
        qStar: r.qStar,
        profit: r.profit,
        valid,
        ok: valid && r.q >= (r.qStar ?? 0),
        savedAt: hit.time,
      });
    });

    return out;
  }, [progs, history, mode]);

  const r = res.r ?? 0;
  const avc = res.avc ?? 0;
  const qStar = res.qStar ?? 0;
  const gap = qStar - res.q;
  const tfcShare = res.tc > 0 ? res.tfc / res.tc : 0;
  /** นิสิตจริงคิดเป็นกี่ % ของจุดคุ้มทุน */
  const reached = qStar > 0 ? Math.min(100, (res.q / qStar) * 100) : 0;

  const openDetail = (key?: string) => {
    const hit = progs.find((x) => x.key === key);

    if (hit) setDetail(hit.p);
  };

  return (
    <Box>
      <PageHeaderBar
        title={`ภาพรวมคณะ — ${shortFacName(fac.name)}`}
        mode={mode}
        onModeChange={setMode}
        q={res.q}
        profit={res.profit}
        extra={
          <>
            <Tooltip
              arrow
              title={
                lock && lock.choice.method !== 'PER_HEAD_FTES'
                  ? `คณะล็อกวิธี "${ALLOC_METHOD_LABEL[lock.choice.method]}" ไว้สำหรับการวิเคราะห์หลักสูตร — ตัวเลขหน้านี้ยังเป็นข้อมูลจริงตามชีต (หารรายหัว)`
                  : 'ต้นทุนคงที่ส่วนกลางของคณะปันให้หลักสูตรตามจำนวนนิสิต (ตามชีตข้อมูลจริง)'
              }
            >
              <Chip
                size="small"
                color={lock && lock.choice.method !== 'PER_HEAD_FTES' ? 'warning' : 'secondary'}
                variant="tonal"
                label="ปันส่วนแบบหารรายหัว"
              />
            </Tooltip>
          </>
        }
      />

      {/* ตัวกรอง — ระดับการศึกษา + คณะ + ปีงบ (แบบเดียวกับภาพรวมมหาวิทยาลัย) */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: '10px !important' }}>
          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" useFlexGap>
            <Autocomplete
              size="small"
              disableClearable
              options={LEVELS}
              getOptionLabel={(l) => l.label}
              isOptionEqualToValue={(a, b) => a.key === b.key}
              value={levelOpt}
              onChange={(_, v) => setLevel(v.key)}
              sx={{ width: 180 }}
              renderInput={(params) => <TextField {...params} label="ระดับการศึกษา" />}
            />
            {/* ระดับคณะ/อาจารย์เห็นคณะตนเองเท่านั้น — แสดงไว้แต่เปลี่ยนไม่ได้ */}
            <Autocomplete
              size="small"
              disableClearable
              disabled={!canPick}
              options={FAC_NAMES}
              value={fac.name}
              onChange={(_, v) => setPickedFac(v)}
              sx={{ width: 300 }}
              noOptionsText="ไม่พบคณะที่ค้นหา"
              renderInput={(params) => <TextField {...params} label="คณะ" />}
            />
            <Autocomplete
              size="small"
              disableClearable
              options={[...MOCK_RUN.budgetYears].reverse()}
              getOptionDisabled={(y) => y !== MOCK_RUN.budgetYear}
              getOptionLabel={(y) => (y === MOCK_RUN.budgetYear ? y : `${y} (ยังไม่มีข้อมูล)`)}
              value={year}
              onChange={(_, v) => setYear(v)}
              sx={{ width: 150 }}
              renderInput={(params) => <TextField {...params} label="ปีงบประมาณ" />}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ marginInlineStart: 'auto', whiteSpace: 'nowrap' }}
            >
              {progs.length} หลักสูตร · หน่วยเงิน: ล้านบาท (ลบ.)
            </Typography>
            {level !== 'all' && (
              <Button
                size="small"
                color="secondary"
                startIcon={<i className="ri-close-line" />}
                onClick={() => setLevel('all')}
              >
                ล้างตัวกรอง
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* B · การ์ด 6 ใบ (แบบ MSU-KPI) */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiTile
            label="นิสิตปัจจุบัน"
            value={fmtInt(res.q)}
            suffix="คน"
            accent="primary"
            icon="ri-group-line"
            progress={reached}
            footer={`${reached.toFixed(0)}% ของจุดคุ้มทุน · ${progs.length} หลักสูตร`}
            info={INFO.q}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiTile
            label="นิสิต ณ จุดคุ้มทุน"
            value={fmtInt(qStar)}
            suffix="คน"
            accent={gap > 0 ? 'error' : 'success'}
            color={BEPS.breakEven}
            icon="ri-focus-3-line"
            progress={reached}
            footer={gap > 0 ? `ขาดอีก ${fmtInt(gap)} คน` : `เกินมา ${fmtInt(-gap)} คน`}
            info={INFO.qStar}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiTile
            label="ส่วนเกิน/หัว"
            value={fmtInt(r - avc)}
            suffix="บาท"
            accent={r - avc >= 0 ? 'success' : 'error'}
            color={C.own}
            icon="ri-add-circle-line"
            progress={r ? ((r - avc) / r) * 100 : 0}
            footer={`${r ? (((r - avc) / r) * 100).toFixed(0) : 0}% ของรายได้/หัว`}
            info={INFO.cm}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiTile
            label="ต้นทุนผันแปร/หัว"
            value={fmtInt(avc)}
            suffix="บาท"
            accent="warning"
            color={C.fixed}
            icon="ri-shopping-cart-2-line"
            progress={r ? (avc / r) * 100 : 0}
            footer={`ต้นทุนรวม ${fmtMillion(res.tc)} ลบ.`}
            info={INFO.avc}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiTile
            label="ส่วนเกิน/ขาดทุน"
            value={`${res.profit >= 0 ? '+' : '−'}${fmtMillion(Math.abs(res.profit))}`}
            suffix="ลบ."
            accent={res.profit >= 0 ? 'success' : 'error'}
            color={BEPS.profit}
            icon={res.profit >= 0 ? 'ri-arrow-up-circle-line' : 'ri-arrow-down-circle-line'}
            progress={res.tr ? (Math.abs(res.profit) / res.tr) * 100 : 0}
            footer={`${res.tr ? ((res.profit / res.tr) * 100).toFixed(1) : '0'}% ของรายได้`}
            info={INFO.profit}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiTile
            label="รายได้/หัว"
            value={fmtInt(r)}
            suffix="บาท"
            accent="warning"
            icon="ri-money-dollar-circle-line"
            progress={res.tc ? (res.tr / res.tc) * 100 : 0}
            footer={`รายได้รวม ${fmtMillion(res.tr)} ลบ.`}
            info={INFO.r}
          />
        </Grid>
      </Grid>

      {/* C · ตรี | โท | เอก วางคู่กัน */}
      {levels.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            mb: 3,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(260px, 1fr))' },
          }}
        >
          {levels.map((l) => (
            <LevelCard key={l.lvl} l={l} mode={mode} />
          ))}
        </Box>
      )}

      {/* D · แท็บ 2.1 / 2.2 / 2.3 */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab value="rev" label="2.1 รายได้คณะ" />
          <Tab value="cost" label="2.2 ต้นทุนคณะ" />
          <Tab value="be" label="2.3 จุดคุ้มทุน" />
        </Tabs>
        <CardContent>
          {progs.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 8 }}>
              {levelOpt.lvl
                ? `คณะนี้ไม่มีหลักสูตรระดับ${levelOpt.lvl}ที่มีนิสิตในปีงบ ${year} — เลือกระดับหรือคณะอื่นด้านบน`
                : `คณะนี้ยังไม่มีหลักสูตรที่มีนิสิตในปีงบ ${year} — เลือกคณะอื่นด้านบน`}
            </Typography>
          ) : tab === 'rev' ? (
            <StackedProgramBar
              title="รายได้รายหลักสูตร — แยกเงินแผ่นดิน / เงินรายได้"
              info="เงินแผ่นดิน = งบประมาณแผ่นดินที่ปันให้หลักสูตร · เงินรายได้ = ค่าธรรมเนียมการศึกษา · กดแท่งเพื่อดูรายละเอียดหลักสูตร"
              progs={progs}
              series={[
                { name: 'เงินรายได้', color: NAVY.dark, pick: (p) => p.own },
                {
                  name: 'เงินแผ่นดิน',
                  color: NAVY.light,
                  labelColor: NAVY.dark,
                  pick: (p) => p.st,
                },
              ]}
              onPick={(key) => openDetail(key)}
            />
          ) : tab === 'cost' ? (
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 8 }}>
                <StackedProgramBar
                  title="ต้นทุนรายหลักสูตร — แยกต้นทุนคงที่ / ต้นทุนผันแปร"
                  info="ต้นทุนคงที่ = ไม่เปลี่ยนตามจำนวนนิสิต (บุคลากร ค่าเสื่อม ส่วนกลางที่ปันมา) · ต้นทุนผันแปร = เพิ่มตามจำนวนนิสิต · กดแท่งเพื่อดูรายละเอียด"
                  progs={progs}
                  series={[
                    { name: 'ต้นทุนคงที่', color: C.fixed, pick: (p) => p.TFC },
                    {
                      name: 'ต้นทุนผันแปร',
                      color: C.variable,
                      labelColor: BEPS.cost.onLight,
                      pick: (p) => p.TVC,
                    },
                  ]}
                  onPick={(key) => openDetail(key)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <CostDonut tfc={res.tfc} tvc={res.tvc} />
                {tfcShare > 0.5 && (
                  <Alert severity="warning" sx={{ mt: 3 }}>
                    ต้นทุนคงที่ {(tfcShare * 100).toFixed(0)}% ของต้นทุนรวม (เกิน 50%) —
                    ต้องมีนิสิตมากพอจึงจะกระจายภาระต้นทุนคงที่ได้
                  </Alert>
                )}
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography component="div" fontWeight={600} sx={{ mb: 2 }}>
                  <BarTitle>
                    กราฟจุดคุ้มทุนของคณะ ({REVENUE_MODE_LABEL[mode]}){' '}
                    <InfoTip text="จุดตัดของเส้นรายได้รวมกับเส้นต้นทุนรวม = จุดคุ้มทุน · จุดสีเข้ม = จำนวนนิสิตปัจจุบัน" />
                  </BarTitle>
                </Typography>
                <BreakEvenLineChart res={res} q={res.q} height={340} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <ProgramTargetTable progs={progs} mode={mode} onPick={(p) => setDetail(p)} />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {tab === 'be' && progs.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ToggleButtonGroup
              size="small"
              color="primary"
              exclusive
              value={beView}
              onChange={(_, v) => v && setBeView(v)}
            >
              <ToggleButton value="rank">ตารางจัดอันดับ ก่อน | หลังปรับ</ToggleButton>
              <ToggleButton value="heat">ตารางสีเปรียบเทียบ</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {beView === 'rank' ? (
            <RankingCard
              rows={crossRows}
              unitWord="หลักสูตร"
              after={after}
              onRowClick={(row) => openDetail(row.key)}
            />
          ) : (
            <HeatmapCard rows={crossRows} unitWord="หลักสูตร" />
          )}
          <ScatterPair rows={crossRows} unitWord="หลักสูตร" />
        </Box>
      )}

      <ProgramDialog
        p={detail}
        after={detail ? after.get(progKey(detail)) : undefined}
        onClose={() => setDetail(null)}
      />
    </Box>
  );
};

/* ---------------- ส่วนประกอบย่อย ---------------- */

/** บรรทัดเดียว: ยอดรวม + ส่วนประกอบ 2 ส่วน (ล้านบาท) และแถบสัดส่วนข้างใต้ */
const SplitBar = ({
  title,
  parts,
}: {
  title: string;
  parts: { label: string; value: number; color: string }[];
}) => {
  const total = parts.reduce((s, x) => s + Math.max(x.value, 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="body2" fontWeight={600} className="num">
          {title} {fmtMillion(parts.reduce((s, x) => s + x.value, 0))} ลบ.
        </Typography>
        <Typography variant="caption" color="text.secondary" className="num">
          {parts.map((x) => `${x.label} ${fmtMillion(x.value)}`).join(' · ')}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          height: 10,
          borderRadius: '4px',
          overflow: 'hidden',
          bgcolor: 'action.hover',
        }}
      >
        {parts.map((x) => (
          <Box
            key={x.label}
            sx={{
              width: total ? `${(Math.max(x.value, 0) / total) * 100}%` : 0,
              bgcolor: x.color,
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

/** โทนน้ำเงินเข้ม (navy) ของกราฟรายได้รายหลักสูตร — แบบโดนัท "Weekly Sales" ของ Materio */
const NAVY = { dark: BEPS.profit, light: '#9a9fc4' };

/** โทนสีของการ์ดระดับการศึกษา (แบบโดนัท "Weekly Sales" ของ Materio) — เข้ม → อ่อน */
type LvTone = { dark: string; mid: string; light: string; pale: string };

const LV_PURPLE: LvTone = { dark: '#8c57ff', mid: '#a985ff', light: '#cbb3ff', pale: '#e2d6ff' };
const LV_PINK: LvTone = { dark: '#f0436b', mid: '#f47a94', light: '#f7a1b2', pale: '#fbd0d9' };
const LV_BLUE: LvTone = { dark: '#2a86e7', mid: '#64a8f0', light: '#93c3f4', pale: '#c9e1fa' };

/** ตรี = ม่วง · โท = ชมพู · เอก = ฟ้า · ระดับอื่นใช้ม่วงไปก่อน */
const LV_TONE: Record<string, LvTone> = {
  ปริญญาตรี: LV_PURPLE,
  ปริญญาโท: LV_PINK,
  ปริญญาเอก: LV_BLUE,
};

/** นิสิตจริงเทียบเป้า (= จุดคุ้มทุน) ของกรณีหนึ่ง — ป้าย | แถบ | ตัวเลข ในบรรทัดเดียว */
const TargetRow = ({
  label,
  q,
  target,
  color,
}: {
  label: string;
  q: number;
  target: number;
  color: string;
}) => {
  const none = target <= 0;
  const ok = !none && q >= target;
  const pctReached = none ? 0 : Math.min(100, (q / target) * 100);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '104px 1fr auto',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Typography variant="caption" color="text.secondary" noWrap>
        {label}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pctReached}
        sx={{
          height: 10,
          borderRadius: '4px',
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: color },
        }}
      />
      <Typography
        variant="caption"
        fontWeight={700}
        className="num"
        color={none ? 'text.disabled' : ok ? 'success.main' : 'error.main'}
      >
        {none
          ? 'ไม่มีจุดคุ้มทุน'
          : `เป้า ${fmtInt(target)} · ${ok ? 'ถึงแล้ว' : `ขาด ${fmtInt(target - q)}`}`}
      </Typography>
    </Box>
  );
};

const LevelCard = ({ l, mode }: { l: LevelStat; mode: RevenueMode }) => {
  const tr = mode === 'with_government' ? l.st + l.own : l.own;
  const profit = tr - l.TFC - l.TVC;
  const tone = LV_TONE[l.lvl] ?? LV_PURPLE;

  return (
    <Card>
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          py: 3,
          '&:last-child': { pb: 3 },
        }}
      >
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}
        >
          <Typography fontWeight={700}>
            {l.lvl}{' '}
            <Typography component="span" variant="caption" color="text.secondary">
              {l.n} หลักสูตร · นิสิต <b>{fmtInt(l.Q)}</b> คน
            </Typography>
          </Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            className="num"
            color={profit >= 0 ? 'success.main' : 'error.main'}
            title={`${profit >= 0 ? 'ส่วนเกิน' : 'ขาดทุน'} (${REVENUE_MODE_LABEL[mode]})`}
          >
            {profit >= 0 ? '+' : '−'}
            {fmtMillion(Math.abs(profit))} ลบ.
          </Typography>
        </Box>
        <SplitBar
          title="รายได้"
          parts={[
            { label: 'เงินรายได้', value: l.own, color: tone.dark },
            { label: 'แผ่นดิน', value: l.st, color: tone.light },
          ]}
        />
        <SplitBar
          title="ต้นทุน"
          parts={[
            { label: 'คงที่', value: l.TFC, color: tone.mid },
            { label: 'ผันแปร', value: l.TVC, color: tone.pale },
          ]}
        />
        <TargetRow label="รวมเงินแผ่นดิน" q={l.Q} target={l.qStarGov} color={tone.dark} />
        <TargetRow label="ไม่รวมเงินแผ่นดิน" q={l.Q} target={l.qStarOwn} color={tone.dark} />
      </CardContent>
    </Card>
  );
};

/** กราฟแท่งซ้อนแนวนอนรายหลักสูตร (ล้านบาท) — เรียงตามระดับการศึกษา กดแท่งเพื่อดูรายละเอียด */
const StackedProgramBar = ({
  title,
  info,
  progs,
  series,
  onPick,
}: {
  title: string;
  info: string;
  progs: ProgStat[];
  series: { name: string; color: string; labelColor?: string; pick: (p: ProgRow) => number }[];
  onPick: (key: string) => void;
}) => {
  const options: ApexOptions = {
    chart: {
      type: 'bar',
      stacked: true,
      toolbar: { show: false },
      parentHeightOffset: 0,
      events: {
        dataPointSelection: (_e, _c, cfg: { dataPointIndex: number }) => {
          const hit = progs[cfg.dataPointIndex];

          if (hit) onPick(hit.key);
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '70%',
        borderRadius: 4,
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'last',
        colors: KPI_BAR_TRACK,
      },
    },
    colors: series.map((s) => s.color),
    fill: { opacity: 1 },
    // ตัวเลขขาวบนสีเข้ม / สีเข้มบนสีอ่อน แบบภาพรวมมหาวิทยาลัย
    dataLabels: {
      ...kpiBarLabels(5),
      style: {
        fontSize: '10px',
        fontWeight: 700,
        colors: series.map((s) => s.labelColor ?? '#fff'),
      },
    },
    legend: { show: false },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: progs.map((x) => x.label),
      title: { text: 'ล้านบาท' },
      labels: {
        formatter: (v: string) => Number(v).toLocaleString('th-TH', { maximumFractionDigits: 1 }),
      },
    },
    yaxis: { labels: { maxWidth: 260, style: { fontSize: '12px' } } },
    // จอแคบ: ป้ายชื่อหลักสูตรกินที่จนแท่งเหลือนิดเดียว — ตัดป้ายให้สั้นลง
    responsive: [
      {
        breakpoint: 600,
        options: { yaxis: { labels: { maxWidth: 110, style: { fontSize: '10px' } } } },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (v: number) =>
          `${v.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ลบ.`,
      },
    },
  };

  return (
    <Box>
      <Typography component="div" fontWeight={600} sx={{ mb: 1 }}>
        <BarTitle>
          {title} <InfoTip text={info} />
        </BarTitle>
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 1 }}>
        {series.map((s) => (
          <LegendItem key={s.name} color={s.color} label={s.name} />
        ))}
        <Typography variant="caption" color="text.secondary">
          แกนนอน = ล้านบาท · แกนตั้ง = หลักสูตร (เรียงตามระดับการศึกษา)
        </Typography>
      </Box>
      <AppReactApexCharts
        type="bar"
        height={Math.max(240, progs.length * 21 + 60)}
        width="100%"
        options={options}
        series={series.map((s) => ({
          name: s.name,
          data: progs.map((x) => Number((s.pick(x.p) / 1e6).toFixed(2))),
        }))}
      />
    </Box>
  );
};

const CostDonut = ({ tfc, tvc }: { tfc: number; tvc: number }) => {
  const total = tfc + tvc;
  const options: ApexOptions = {
    chart: { type: 'donut' },
    labels: ['ต้นทุนคงที่', 'ต้นทุนผันแปร'],
    colors: [C.fixed, C.variable],
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 3, colors: ['var(--mui-palette-background-paper)'] },
    plotOptions: { pie: { donut: { size: '62%' } } },
    tooltip: {
      y: {
        formatter: (v: number) => `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ.`,
      },
    },
  };

  return (
    <Box>
      <Typography component="div" fontWeight={600} sx={{ mb: 2 }}>
        <BarTitle>โครงสร้างต้นทุนรวมของคณะ</BarTitle>
      </Typography>
      <AppReactApexCharts
        type="donut"
        height={220}
        width="100%"
        options={options}
        series={[Number((tfc / 1e6).toFixed(2)), Number((tvc / 1e6).toFixed(2))]}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
        {[
          { label: 'ต้นทุนคงที่', v: tfc, c: C.fixed },
          { label: 'ต้นทุนผันแปร', v: tvc, c: C.variable },
        ].map((x) => (
          <Box key={x.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <LegendItem color={x.c} label={x.label} />
            <Typography variant="body2" fontWeight={700} className="num">
              {fmtMillion(x.v)} ลบ.{' '}
              <Typography component="span" variant="caption" color="text.secondary">
                {total ? ((x.v / total) * 100).toFixed(0) : 0}%
              </Typography>
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/** ช่องจุดคุ้มทุนในตาราง — เขียว = นิสิตถึงแล้ว · แดง = ยังไม่ถึง · — = ไม่มีจุดคุ้มทุน */
const TargetCell = ({ q, target, active }: { q: number; target: number; active: boolean }) => {
  if (target <= 0)
    return (
      <TableCell
        align="right"
        title="รายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร — ไม่มีจุดคุ้มทุน"
        sx={{ color: 'text.disabled' }}
      >
        —
      </TableCell>
    );

  return (
    <TableCell
      align="right"
      className="num"
      sx={{ color: q >= target ? 'success.main' : 'error.main', fontWeight: active ? 700 : 400 }}
    >
      {fmtInt(target)}
    </TableCell>
  );
};

/** ตารางนิสิตจริงเทียบเป้า (จุดคุ้มทุน) ทั้ง 2 กรณี — จัดกลุ่มตามระดับ เรียงจุดคุ้มทุนมากไปน้อย */
const ProgramTargetTable = ({
  progs,
  mode,
  onPick,
}: {
  progs: ProgStat[];
  mode: RevenueMode;
  onPick: (p: ProgRow) => void;
}) => {
  const groups = useMemo(() => {
    const m = new Map<string, ProgStat[]>();

    progs.forEach((x) => m.set(x.p.lvl, [...(m.get(x.p.lvl) ?? []), x]));

    const qOf = (x: ProgStat) => (mode === 'with_government' ? x.qStarGov : x.qStarOwn);

    return [...m.entries()].map(([lvl, rows]) => ({
      lvl,
      rows: [...rows].sort((a, b) => qOf(b) - qOf(a)),
    }));
  }, [progs, mode]);

  return (
    <Box>
      <Typography component="div" fontWeight={600} sx={{ mb: 2 }}>
        <BarTitle>
          นิสิตจริง เทียบ เป้า (จุดคุ้มทุน) รายหลักสูตร{' '}
          <InfoTip text="เป้า = จำนวนนิสิตที่ต้องมีเพื่อให้คุ้มทุน · ตัวเลขเขียว = นิสิตจริงถึงเป้าแล้ว · แดง = ยังไม่ถึง · — = รายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร (รับเพิ่มยิ่งขาดทุน)" />
        </BarTitle>
      </Typography>
      <TableContainer sx={{ maxHeight: 380 }}>
        <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { fontSize: '0.8125rem' } }}>
          <TableHead>
            <TableRow>
              <TableCell>หลักสูตร</TableCell>
              <TableCell align="right">นิสิตจริง</TableCell>
              <TableCell align="right">เป้า · รวมเงินแผ่นดิน</TableCell>
              <TableCell align="right">เป้า · ไม่รวมเงินแผ่นดิน</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((g) => [
              <TableRow key={`h-${g.lvl}`}>
                <TableCell colSpan={4} sx={{ bgcolor: 'action.hover', fontWeight: 700, py: 0.75 }}>
                  {g.lvl} · {g.rows.length} หลักสูตร
                </TableCell>
              </TableRow>,
              ...g.rows.map((x) => (
                <TableRow key={x.key} hover>
                  <TableCell>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => onPick(x.p)}
                      sx={{
                        all: 'unset',
                        cursor: 'pointer',
                        color: 'primary.main',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {x.p.prog}
                    </Box>
                  </TableCell>
                  <TableCell align="right" className="num">
                    {fmtInt(x.p.Q)}
                  </TableCell>
                  <TargetCell q={x.p.Q} target={x.qStarGov} active={mode === 'with_government'} />
                  <TargetCell
                    q={x.p.Q}
                    target={x.qStarOwn}
                    active={mode === 'without_government'}
                  />
                </TableRow>
              )),
            ])}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

/** หน้าต่างรายละเอียดหลักสูตร — ตัวเลขทั้งสองกรณีวางคู่กัน */
const ProgramDialog = ({
  p,
  after,
  onClose,
}: {
  p: ProgRow | null;
  after?: AfterResult;
  onClose: () => void;
}) => {
  const both = useMemo(
    () =>
      p
        ? ([
            computeBreakEven(p, 'with_government'),
            computeBreakEven(p, 'without_government'),
          ] as const)
        : null,
    [p],
  );

  const rows: { label: string; v: (r: BreakEvenResult) => string }[] = [
    { label: 'รายได้รวม (ลบ.)', v: (r) => fmtMillion(r.tr) },
    { label: 'ต้นทุนรวม (ลบ.)', v: (r) => fmtMillion(r.tc) },
    { label: 'รายได้ต่อหัว (บาท)', v: (r) => fmtInt(r.r) },
    { label: 'ต้นทุนผันแปรต่อหัว (บาท)', v: (r) => fmtInt(r.avc) },
    {
      label: 'เป้า / จุดคุ้มทุน (คน)',
      v: (r) => (r.qStar !== null && r.qStar > 0 ? fmtInt(r.qStar) : 'ไม่มี'),
    },
    {
      label: 'ส่วนเกิน / ขาดทุน (ลบ.)',
      v: (r) => `${r.profit >= 0 ? '+' : '−'}${fmtMillion(Math.abs(r.profit))}`,
    },
  ];

  return (
    <Dialog open={Boolean(p)} onClose={onClose} maxWidth="sm" fullWidth>
      {p && both && (
        <>
          <DialogTitle sx={{ pr: 12 }}>
            {p.prog}
            <Typography variant="body2" color="text.secondary">
              {p.lvl} · {p.deg}
            </Typography>
            <IconButton
              aria-label="ปิด"
              onClick={onClose}
              sx={{ position: 'absolute', top: 12, insetInlineEnd: 12 }}
            >
              <i className="ri-close-line" />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 3 }}>
              <Typography variant="body2">
                นิสิตจริง <b>{fmtInt(p.Q)}</b> คน
              </Typography>
              <Typography variant="body2">
                เงินแผ่นดิน <b>{fmtMillion(p.st)}</b> · เงินรายได้ <b>{fmtMillion(p.own)}</b> ลบ.
              </Typography>
              <Typography variant="body2">
                ต้นทุนคงที่ <b>{fmtMillion(p.TFC)}</b> · ผันแปร <b>{fmtMillion(p.TVC)}</b> ลบ.
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell align="right">รวมเงินแผ่นดิน</TableCell>
                  <TableCell align="right">ไม่รวมเงินแผ่นดิน</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell>{row.label}</TableCell>
                    <TableCell align="right" className="num">
                      {row.v(both[0])}
                    </TableCell>
                    <TableCell align="right" className="num">
                      {row.v(both[1])}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              {after
                ? `หลังปรับ (บันทึก ${after.savedAt}): เป้า ${after.valid && after.qStar !== null ? `${fmtInt(after.qStar)} คน` : 'ไม่มีจุดคุ้มทุน'} · ${after.profit >= 0 ? 'ส่วนเกิน +' : 'ขาดทุน −'}${fmtMillion(Math.abs(after.profit))} ลบ.`
                : 'ยังไม่มีผลการปรับปรุงหลักสูตรนี้ที่บันทึกไว้ในเครื่องนี้'}
            </Typography>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};

export default FacultyOverview;
