'use client';

// React Imports
import type { ReactNode } from 'react';

// Next Imports
import Link from 'next/link';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// Component Imports
import { BEPS } from '@components/ChartBits';
import KpiTile from '@components/KpiTile';
import BreakEvenLineChart from '@views/breakeven/BreakEvenLineChart';
import { fmtInt, fmtMillion, REVENUE_MODE_LABEL } from '@views/breakeven/calc';
import { ALLOC_METHOD_LABEL } from '@views/scenario-program/facultyAllocation';
import type { AllocMethod } from '@views/scenario-program/facultyAllocation';

import { useFaculty } from './FacultyContext';
import type { ProgStat } from './FacultyContext';
import {
  BE_LINE,
  ChartTitle,
  CostDonut,
  REVENUE_SERIES,
  StackedProgramBar,
  FIXED_COST_ALERT,
  TargetVsActualChart,
} from './FacultyCharts';
import FacultyStatusBar from './FacultyStatusBar';
import ProgramRankTable from './ProgramRankTable';

/** หลักสูตรในระดับเดียวกันเกินนี้ → กราฟหน้าภาพรวมแสดงเฉพาะอันดับต้น + ลิงก์ "ดูทั้งหมด" */
const TOP_N = 12;
const CHART_H = 250;

const METHOD_SHORT: Record<AllocMethod, string> = {
  PER_HEAD_FTES: 'หารรายหัว',
  EQUAL_PROGRAM: 'หารเท่ากัน',
  CUSTOM_PCT: 'กำหนด %',
};

const INFO = {
  tr: 'รวมเงินแผ่นดิน = เงินแผ่นดิน + เงินรายได้ · ไม่รวม = เงินรายได้ (ค่าธรรมเนียม) อย่างเดียว — ทั้งคณะทุกระดับ',
  tc: 'ต้นทุนคงที่ + ต้นทุนผันแปรของทั้งคณะ (ทุกระดับ)',
  q: 'จำนวนนิสิตจริงทุกชั้นปีของคณะ (ตามข้อมูลชีต)',
  profit: 'รายได้รวม − ต้นทุนรวม ตามฐานรายได้ที่เลือกด้านบน',
  r: 'รายได้รวม ÷ นิสิตจริง เทียบกับต้นทุนรวม ÷ นิสิตจริง',
  cfg: 'วิธีปันต้นทุนคงที่ส่วนกลางของคณะที่ล็อกไว้สำหรับการวิเคราะห์หลักสูตร — ตัวเลขบนหน้านี้ยังเป็นข้อมูลจริงตามชีต (หารรายหัว)',
};

/** การ์ด KPI ที่กดแล้วไปหน้าย่อย */
const TileLink = ({ href, children }: { href?: string; children: ReactNode }) =>
  href ? (
    <Box
      component={Link}
      href={href}
      sx={{
        display: 'block',
        blockSize: '100%',
        textDecoration: 'none',
        borderRadius: 1,
        '&:hover': { boxShadow: 4 },
      }}
    >
      {children}
    </Box>
  ) : (
    <>{children}</>
  );

/** การ์ดกราฟ + ลิงก์ "ดูทั้งหมด" เมื่อตัดเหลืออันดับต้น */
const ChartCard = ({
  children,
  more,
}: {
  children: ReactNode;
  more?: { href: string; total: number };
}) => (
  <Card sx={{ blockSize: '100%', overflow: 'visible' }}>
    <CardContent sx={{ pb: '12px !important' }}>
      {children}
      {more && more.total > TOP_N && (
        <Box sx={{ textAlign: 'end' }}>
          <Button
            size="small"
            component={Link}
            href={more.href}
            endIcon={<i className="ri-arrow-right-line" />}
          >
            ดูทั้งหมด {more.total} หลักสูตร
          </Button>
        </Box>
      )}
    </CardContent>
  </Card>
);

const topBy = (progs: ProgStat[], v: (x: ProgStat) => number) =>
  [...progs].sort((a, b) => v(b) - v(a)).slice(0, TOP_N);

/**
 * ภาพรวมคณะ (/faculty) — การ์ดรวมทั้งคณะ + กราฟ 2×2 และตารางจัดอันดับของระดับที่เลือก
 * ห้ามรวม ตรี/โท/เอก ในกราฟหรือตารางเดียวกัน · รายละเอียดอยู่ในเมนูย่อย
 */
const FacultyLanding = () => {
  const {
    fac,
    year,
    mode,
    levels,
    level,
    allProgs,
    progs,
    facRes,
    levelRes,
    lock,
    lockReady,
    openDetail,
  } = useFaculty();

  const tr = facRes.tr;
  const stShare = fac.st + fac.own ? fac.st / (fac.st + fac.own) : 0;
  const tfcShare = facRes.tc ? facRes.tfc / facRes.tc : 0;
  const r = facRes.r ?? 0;
  const costPerHead = facRes.q ? facRes.tc / facRes.q : 0;
  const levelTfcShare = levelRes.tc ? levelRes.tfc / levelRes.tc : 0;
  const method = lock?.choice.method;

  return (
    <Box>
      <FacultyStatusBar showLevel />

      {/* จังหวะที่ 1 · การ์ด 6 ใบ — ผลรวมทั้งคณะ */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiTile
            label="นิสิตปัจจุบัน"
            value={fmtInt(facRes.q)}
            suffix="คน"
            accent="primary"
            icon="ri-group-line"
            footer={`${levels.map((l) => `${l.lvl.replace('ปริญญา', '')} ${fmtInt(l.Q)}`).join(' · ')} · ${allProgs.length} หลักสูตร`}
            info={INFO.q}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiTile
            label="รายได้เฉลี่ยต่อหัว"
            value={fmtInt(r)}
            suffix="บาท"
            accent="success"
            color={BEPS.breakEven}
            icon="ri-user-heart-line"
            progress={costPerHead ? (r / costPerHead) * 100 : 0}
            footer={`ต้นทุนต่อหัว ${fmtInt(costPerHead)} บาท`}
            info={INFO.r}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <TileLink href="/faculty/revenue">
            <KpiTile
              label="รายได้รวม"
              value={fmtMillion(tr)}
              suffix="ลบ."
              accent="primary"
              color={BEPS.revenue.dark}
              icon="ri-hand-coin-line"
              progress={(1 - stShare) * 100}
              footer={
                mode === 'with_government'
                  ? `แผ่นดิน ${(stShare * 100).toFixed(0)}% · รายได้ ${((1 - stShare) * 100).toFixed(0)}%`
                  : `เงินรายได้อย่างเดียว · ไม่นับแผ่นดิน ${fmtMillion(fac.st)}`
              }
              info={INFO.tr}
            />
          </TileLink>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <TileLink href="/faculty/cost">
            <KpiTile
              label="ต้นทุนรวม"
              value={fmtMillion(facRes.tc)}
              suffix="ลบ."
              accent="error"
              color={BEPS.cost.dark}
              icon="ri-stack-line"
              progress={tfcShare * 100}
              footer={`คงที่ ${(tfcShare * 100).toFixed(0)}% · ผันแปร ${((1 - tfcShare) * 100).toFixed(0)}%`}
              info={INFO.tc}
            />
          </TileLink>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <TileLink href="/faculty/breakeven">
            <KpiTile
              label="ส่วนเกิน / ขาดทุน"
              value={`${facRes.profit >= 0 ? '+' : '−'}${fmtMillion(Math.abs(facRes.profit))}`}
              suffix="ลบ."
              accent={facRes.profit >= 0 ? 'success' : 'error'}
              color={BEPS.profit}
              icon={facRes.profit >= 0 ? 'ri-arrow-up-circle-line' : 'ri-arrow-down-circle-line'}
              progress={tr ? (Math.abs(facRes.profit) / tr) * 100 : 0}
              footer={`${tr ? ((facRes.profit / tr) * 100).toFixed(1).replace('-', '−') : '0'}% ของรายได้ · ${REVENUE_MODE_LABEL[mode]}`}
              info={INFO.profit}
            />
          </TileLink>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <TileLink href="/faculty/config">
            <KpiTile
              label="สถานะการตั้งค่า"
              value={!lockReady ? '…' : method ? METHOD_SHORT[method] : 'ยังไม่ล็อก'}
              accent={method ? 'success' : 'warning'}
              color={method ? BEPS.breakEven : undefined}
              icon={method ? 'ri-lock-line' : 'ri-lock-unlock-line'}
              footer={
                method
                  ? `ล็อกแล้ว · ${ALLOC_METHOD_LABEL[method]} · ปีงบ ${year}`
                  : `ยังไม่ล็อกวิธีปันส่วน · ปีงบ ${year}`
              }
              info={INFO.cfg}
            />
          </TileLink>
        </Grid>
      </Grid>

      {progs.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center" sx={{ py: 8 }}>
              คณะนี้ยังไม่มีหลักสูตรที่มีนิสิตในปีการศึกษา {year} — เลือกคณะอื่นที่แถบด้านบน
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* กราฟ 2×2 ของระดับที่เลือก */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <ChartCard>
                <CostDonut
                  tfc={levelRes.tfc}
                  tvc={levelRes.tvc}
                  title={`โครงสร้างต้นทุน — ${level}`}
                  height={190}
                />
                {levelTfcShare > FIXED_COST_ALERT && (
                  <Alert severity="warning" sx={{ mt: 2, py: 0 }}>
                    ต้นทุนคงที่ {(levelTfcShare * 100).toFixed(0)}% ของต้นทุนรวม (เกิน{' '}
                    {FIXED_COST_ALERT * 100}%) — ต้องมีนิสิตมากพอจึงจะกระจายภาระได้
                  </Alert>
                )}
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ChartCard more={{ href: '/faculty/revenue', total: progs.length }}>
                <StackedProgramBar
                  title={`โครงสร้างรายได้ — ${level}`}
                  info="ล้านบาท · เงินรายได้ = ค่าธรรมเนียมการศึกษา · เงินแผ่นดิน = งบประมาณแผ่นดินที่ปันให้หลักสูตร · กดแท่งเพื่อดูรายละเอียด"
                  progs={topBy(progs, (x) => x.p.st + x.p.own)}
                  series={REVENUE_SERIES}
                  onPick={openDetail}
                  height={CHART_H}
                />
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ChartCard more={{ href: '/faculty/breakeven', total: progs.length }}>
                <TargetVsActualChart
                  progs={topBy(progs, (x) => x.p.Q)}
                  mode={mode}
                  onPick={openDetail}
                  height={CHART_H}
                />
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ChartCard>
                <ChartTitle
                  title={`จุดตัดคุ้มทุน — ${level}`}
                  info="จุดตัดของเส้นรายได้รวมกับเส้นต้นทุนรวม = จุดคุ้มทุน · จุดสีเข้ม = จำนวนนิสิตปัจจุบัน"
                />
                <BreakEvenLineChart
                  res={levelRes}
                  q={levelRes.q}
                  height={CHART_H}
                  palette={BE_LINE}
                />
              </ChartCard>
            </Grid>
          </Grid>

          {/* จังหวะที่ 2 · ตารางจัดอันดับหลักสูตร */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                <ChartTitle
                  title={`จัดอันดับหลักสูตร — ${level} (${progs.length})`}
                  info="อันดับ = ส่วนเกินมากสุด (ดีที่สุด) → ขาดทุนมากสุด ตามฐานรายได้ที่เลือก · เขียว 3 อันดับแรก · แดง 3 อันดับท้าย · กดแถวเพื่อดูรายละเอียด"
                />
                <Button
                  size="small"
                  component={Link}
                  href="/faculty/breakeven"
                  endIcon={<i className="ri-arrow-right-line" />}
                  sx={{ marginInlineStart: 'auto' }}
                >
                  ดูละเอียด
                </Button>
              </Box>
              <ProgramRankTable progs={progs} mode={mode} onPick={openDetail} />
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default FacultyLanding;
