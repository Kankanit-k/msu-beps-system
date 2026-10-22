'use client';

import { useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

// Third-party Imports
import type { ApexOptions } from 'apexcharts';
import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { DotTitle } from '@components/ChartBits';
import DataCaveatNotes, { SHOW_CROSS_NOTES } from '@components/DataCaveatNotes';
import NoteBar from '@components/NoteBar';
import PageHeaderBar from '@components/PageHeaderBar';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import { lockedFacultyFor } from '@/configs/accessControl';
import { useRole } from '@/hooks/useRole';
import {
  computeBreakEven,
  inLevel,
  LEVEL_SCOPE_LABEL,
  REVENUE_MODE_NOTE,
  sumRows,
} from '@views/breakeven/calc';
import type { LevelScope } from '@views/breakeven/calc';

import { buildCrossData, buildProgramCrossData } from './crossData';
import {
  AXIS_LABEL_STYLE,
  AXIS_TITLE_STYLE,
  fmtM,
  HeatmapCard,
  niceRange,
  pct,
  RankingCard,
  SCATTER_BASE,
  ScatterPair,
  tooltipFor,
} from './CrossPanels';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), {
  ssr: false,
});

const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');

/** สี/ป้ายของ 4 กลุ่มใน Quadrant — สีฟองตรงกับสีป้ายมุมกราฟ */
const QUADRANT_STYLE = {
  stars: { label: 'ดาวเด่น', icon: '⭐', color: '#2bb389' },
  recover: { label: 'ต้องฟื้นฟู', icon: '🔄', color: '#f5a524' },
  growth: { label: 'กำลังเติบโต', icon: '📈', color: '#7c5cff' },
  risk: { label: 'เสี่ยง', icon: '⚠️', color: '#ef6b95' },
};

type QuadrantInfo = { label: string; icon: string; color: string; rows: unknown[]; unit: string };

const QuadrantLabel = ({ q }: { q: QuadrantInfo }) => (
  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: q.color }}>
    {q.icon} {q.label} · {q.rows.length} {q.unit}
  </Typography>
);

/** แถวป้ายกลุ่มซ้าย/ขวา — ซ้าย = นิสิตไม่ถึงจุดคุ้มทุน (Util < 100%) · ขวา = ถึงจุดคุ้มทุน */
const QuadrantLabels = ({ left, right }: { left: QuadrantInfo; right: QuadrantInfo }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, px: 6 }}>
    <QuadrantLabel q={left} />
    <QuadrantLabel q={right} />
  </Box>
);

/** ไอคอนนำหน้าแต่ละบรรทัดของ "ประเด็นสำคัญ" ตามระดับความรุนแรง */
const INSIGHT_ICON = {
  info: { icon: '▸', color: 'primary.main' },
  error: { icon: '⚠', color: 'error.main' },
  warning: { icon: '⚠', color: 'warning.main' },
  success: { icon: '✓', color: 'success.main' },
} as const;

const CrossAnalysisView = () => {
  const [mode, setMode] = useState<RevenueMode>('with_government');

  const [level, setLevel] = useState<LevelScope>('all');

  // ผู้ดูแลคณะ/อาจารย์ เห็นได้เฉพาะคณะของตน — แตกเป็นรายหลักสูตรของคณะนั้น
  const { role, scope: roleScope } = useRole();
  const lockedFac = lockedFacultyFor(role, roleScope);
  const unitWord = lockedFac ? 'หลักสูตร' : 'คณะ';

  // ชิปบนหัวหน้าจอ — ผู้ดูแลคณะเห็นของคณะตน (ตามระดับที่เลือก) ที่เหลือเห็นระดับมหาวิทยาลัย
  const uniRes = useMemo(() => computeBreakEven(RAW.UNI, mode), [mode]);
  const headRes = useMemo(() => {
    if (!lockedFac) return uniRes;
    const fac = RAW.FACS.find((f) => f.name === lockedFac);
    const scope =
      level === 'all' && fac
        ? fac
        : sumRows(RAW.PROGS.filter((p) => p.fac === lockedFac && inLevel(p, level)));

    return computeBreakEven(scope, mode);
  }, [lockedFac, level, mode, uniRes]);

  const data = useMemo(
    () => (lockedFac ? buildProgramCrossData(lockedFac, level, mode) : buildCrossData(mode)),
    [lockedFac, level, mode],
  );
  const valid = useMemo(() => data.filter((d) => d.valid), [data]);

  // ---- Bubble Quadrant: Util(x) x กำไร%(y) ขนาด=รายได้รวม · เส้นแบ่งที่ Util 100% และกำไร 0% ----
  const stars = valid.filter((d) => d.util >= 100 && d.profitPct >= 0);
  const growth = valid.filter((d) => d.util >= 100 && d.profitPct < 0);
  const recover = valid.filter((d) => d.util < 100 && d.profitPct >= 0);
  const risk = valid.filter((d) => d.util < 100 && d.profitPct < 0);
  const qStars = { ...QUADRANT_STYLE.stars, rows: stars, unit: unitWord };
  const qRecover = { ...QUADRANT_STYLE.recover, rows: recover, unit: unitWord };
  const qGrowth = { ...QUADRANT_STYLE.growth, rows: growth, unit: unitWord };
  const qRisk = { ...QUADRANT_STYLE.risk, rows: risk, unit: unitWord };
  const quadrants = [qStars, qRecover, qGrowth, qRisk];

  // z = √รายได้รวม — ApexCharts ปรับรัศมีตาม z แบบเส้นตรง จึงใช้รากที่สองให้ "พื้นที่" ฟองแปรตามรายได้
  const bubbleSeries = quadrants.map((q) => ({
    name: q.label,
    data: q.rows.map((d) => ({
      x: d.util,
      y: d.profitPct,
      z: Math.sqrt(Math.max(d.trM, 0)),
      meta: d,
    })),
  }));

  // แกนต้องคร่อมเส้นแบ่ง (Util 100%, กำไร 0%) เสมอ — ป้ายกลุ่มเหนือ/ใต้กราฟจึงตรงกับฝั่งของเส้นแบ่ง
  const bx = niceRange([0, 100, ...valid.map((d) => d.util)], 50, true);
  const by = niceRange([0, ...valid.map((d) => d.profitPct)], 20);
  const bubbleOptions: ApexOptions = {
    chart: {
      type: 'bubble',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      parentHeightOffset: 0,
    },
    colors: quadrants.map((q) => q.color),
    fill: { opacity: 0.55 },
    // ขอบฟองของ bubble มาจาก markers (ไม่ใช่ stroke) — ใช้สีเดียวกับฟองแทนขอบขาวค่า default
    markers: { strokeWidth: 1.5, strokeColors: quadrants.map((q) => q.color) },
    dataLabels: { enabled: false },
    legend: { show: false },
    plotOptions: { bubble: { minBubbleRadius: 5, maxBubbleRadius: 34 } },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
      padding: { right: 16 },
    },
    annotations: {
      xaxis: [{ x: 100, borderColor: 'var(--mui-palette-text-disabled)', strokeDashArray: 4 }],
      yaxis: [{ y: 0, borderColor: 'var(--mui-palette-text-disabled)', strokeDashArray: 4 }],
    },
    xaxis: {
      ...SCATTER_BASE.xaxis,
      ...bx,
      title: { text: 'นิสิตจริงเทียบจุดคุ้มทุน %', style: AXIS_TITLE_STYLE },
      labels: { ...SCATTER_BASE.xaxis?.labels, formatter: (v) => `${Math.round(Number(v))}%` },
    },
    yaxis: {
      ...by,
      title: { text: 'อัตรากำไร %', style: AXIS_TITLE_STYLE },
      labels: { style: AXIS_LABEL_STYLE, formatter: (v) => pct(Math.round(v)) },
    },
    tooltip: {
      ...SCATTER_BASE.tooltip,
      custom: tooltipFor(
        (d) =>
          `นิสิตจริงเทียบจุดคุ้มทุน ${d.util}% · อัตรากำไร ${pct(d.profitPct)}<br/>รายได้รวม ${fmtM(d.trM)} ล้านบาท`,
      ),
    },
  };

  // ---- Insights ----
  const invalid = data.filter((d) => !d.valid);
  const hiAVC = valid.filter((d) => d.avcRRatio >= 50);
  const totalProg = data.reduce((s, d) => s + d.nProg, 0);
  const totalOkProg = data.reduce((s, d) => s + d.okProg, 0);

  type Insight = { severity: 'info' | 'error' | 'warning' | 'success'; html: string };
  const insights: Insight[] = [
    {
      severity: 'info',
      html: `จัดกลุ่ม 4 กลุ่ม: ⭐ ดาวเด่น <b>${stars.length}</b> · 📈 กำลังเติบโต <b>${growth.length}</b> · 🔄 ต้องฟื้นฟู <b>${recover.length}</b> · ⚠️ เสี่ยง <b>${risk.length}</b>${invalid.length ? ` · ไม่มีจุดคุ้มทุน <b>${invalid.length}</b>` : ''}`,
    },
  ];

  if (risk.length) {
    insights.push({
      severity: 'error',
      html: `กลุ่มเสี่ยง — ${risk.length} ${unitWord} (นิสิตไม่ถึงจุดคุ้มทุนและขาดทุน): ${[...risk]
        .sort((a, b) => a.profitPct - b.profitPct)
        .slice(0, 3)
        .map((d) => `${d.short} (นิสิตจริงเทียบจุดคุ้มทุน ${d.util}% · อัตรากำไร ${d.profitPct}%)`)
        .join(', ')}`,
    });
  }

  if (invalid.length) {
    insights.push({
      severity: 'error',
      html: `${invalid.length} ${unitWord}มีรายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร (ส่วนเกินต่อหัวติดลบหรือเป็นศูนย์): ${invalid.map((d) => `${d.short} (ส่วนเกินต่อหัว ${fmtB(d.CM)} บาท)`).join(', ')} → ใช้เป้าหมายคืนทุนเต็มจำนวน (ต้นทุนรวม ÷ รายได้ต่อหัว) แทนจุดคุ้มทุน · ควรขึ้นค่าธรรมเนียมหรือลดต้นทุนผันแปร`,
    });
  }

  if (stars.length) {
    insights.push({
      severity: 'success',
      html: `⭐ กลุ่มดาวเด่น — ${stars.length} ${unitWord} (นิสิตเกินจุดคุ้มทุนและมีกำไร): ${[
        ...stars,
      ]
        .sort((a, b) => b.profitPct - a.profitPct)
        .slice(0, 3)
        .map((d) => `${d.short} (+${d.profitPct}%)`)
        .join(', ')}`,
    });
  }

  if (hiAVC.length) {
    insights.push({
      severity: 'warning',
      html: `${hiAVC.length} ${unitWord}มีสัดส่วนต้นทุนผันแปรต่อรายได้ตั้งแต่ 50% ขึ้นไป (ต้นทุนผันแปรกินรายได้เกินครึ่ง) — ขาดทุน <b>${hiAVC.filter((d) => d.profitPct < 0).length}/${hiAVC.length}</b> ${unitWord}`,
    });
  }

  if (totalProg) {
    insights.push({
      severity: totalOkProg / totalProg >= 0.5 ? 'success' : 'error',
      html: `ภาพรวม: <b>${totalOkProg}/${totalProg} หลักสูตรถึงจุดคุ้มทุน (${((totalOkProg / totalProg) * 100).toFixed(0)}%)</b> ในโหมดนี้`,
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* หัวหน้าจอชุดเดียวกับหน้าอื่น — ตัด mb ของแถบสุดท้ายออก เพราะคอนเทนเนอร์นี้เว้นระยะด้วย gap แล้ว */}
      <Box sx={{ '& > :last-child': { mb: 0 } }}>
        <PageHeaderBar
          title="วิเคราะห์เชิงเปรียบเทียบ และตารางสีเปรียบเทียบ"
          mode={mode}
          onModeChange={setMode}
          q={headRes.q}
          profit={headRes.profit}
        />

        {SHOW_CROSS_NOTES && (
          <>
            <DataCaveatNotes profit={uniRes.profit} />

            <NoteBar severity="info">
              {REVENUE_MODE_NOTE[mode]} · นิสิตจริงเทียบจุดคุ้มทุน โดยจุดคุ้มทุน = ผลรวมรายหลักสูตร
              · คณะที่รายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร จะไม่มีจุดคุ้มทุน (แสดง —)
            </NoteBar>
          </>
        )}
      </Box>

      {lockedFac && (
        <Card>
          <CardContent>
            <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip variant="outlined" icon={<i className="ri-lock-line" />} label={lockedFac} />
              <ToggleButtonGroup
                size="small"
                color="primary"
                exclusive
                value={level}
                onChange={(_, v: LevelScope | null) => v && setLevel(v)}
              >
                {(Object.keys(LEVEL_SCOPE_LABEL) as LevelScope[]).map((l) => (
                  <ToggleButton key={l} value={l}>
                    {LEVEL_SCOPE_LABEL[l]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
          </CardContent>
        </Card>
      )}

      <HeatmapCard rows={data} unitWord={unitWord} />

      <ScatterPair rows={data} unitWord={unitWord} />

      {/* Quadrant bubble */}
      <Card>
        <CardHeader
          title={<DotTitle color="primary.main">จัดกลุ่ม{unitWord}ตามประสิทธิภาพ 4 กลุ่ม</DotTitle>}
          subheader="แกนนอน = นิสิตจริงเทียบจุดคุ้มทุน % · แกนตั้ง = อัตรากำไร % · ขนาดวงกลม = รายได้รวม · เส้นประ = นิสิตเท่าจุดคุ้มทุนพอดี (100%) / กำไรเท่าศูนย์"
        />
        <CardContent>
          {/* กรอบพื้นอ่อนรอบกราฟ — ป้ายกลุ่มวางนอกพื้นที่พล็อต (บน: Recover/Stars · ล่าง: Risk/Growth) จะได้ไม่ทับฟองที่อยู่ชิดมุม */}
          <Box
            sx={{
              border: '1px solid var(--mui-palette-divider)',
              borderRadius: 2,
              bgcolor: 'var(--mui-palette-action-hover)',
              p: 2,
            }}
          >
            <QuadrantLabels left={qRecover} right={qStars} />
            <AppReactApexCharts
              type="bubble"
              height={400}
              series={bubbleSeries}
              options={bubbleOptions}
            />
            <QuadrantLabels left={qRisk} right={qGrowth} />
          </Box>
        </CardContent>
      </Card>

      <RankingCard rows={data} unitWord={unitWord} />

      {/* Insights — รายการบรรทัดเดียวพร้อมไอคอนนำหน้าตามความรุนแรง */}
      <Card sx={{ borderInlineStart: '4px solid var(--mui-palette-primary-main)' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
            ประเด็นสำคัญ — วิเคราะห์เชิงเปรียบเทียบ
          </Typography>
          {insights.map((ins, i) => {
            const ic = INSIGHT_ICON[ins.severity];

            return (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline' }}>
                <Typography
                  component="span"
                  sx={{ color: ic.color, fontWeight: 700, flexShrink: 0, fontSize: '0.8125rem' }}
                >
                  {ic.icon}
                </Typography>
                <Typography
                  component="span"
                  sx={{ fontSize: '0.8125rem', color: 'text.primary', '& b': { fontWeight: 700 } }}
                  dangerouslySetInnerHTML={{ __html: ins.html }}
                />
              </Box>
            );
          })}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CrossAnalysisView;
