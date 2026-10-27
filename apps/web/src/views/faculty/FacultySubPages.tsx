'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

// Next Imports
import Link from 'next/link';

// MUI Imports
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import type { ReactNode } from 'react';

// Component Imports
import { BEPS } from '@components/ChartBits';
import InfoTip from '@components/InfoTip';
import KpiTile from '@components/KpiTile';
import { canAccess } from '@/configs/accessControl';
import { useRole } from '@/hooks/useRole';
import BreakEvenLineChart from '@views/breakeven/BreakEvenLineChart';
import { fmtInt, fmtMillion, REVENUE_MODE_LABEL } from '@views/breakeven/calc';
import { buildProgramCrossData } from '@views/cross/crossData';
import { HeatmapCard, RankingCard, ScatterPair } from '@views/cross/CrossPanels';
import { facultyDepCompare } from '@views/cost-data/depreciationData';
import { policySourceLabel } from '@views/fixed-cost-lock/lockStore';
import { LOCK_SETTINGS_HREF, policySourceShort } from '@views/fixed-cost-lock/NoLockAlert';
import { ALLOC_METHOD_LABEL } from '@views/scenario-program/facultyAllocation';

import { useFaculty } from './FacultyContext';
import type { ProgStat } from './FacultyContext';
import {
  BE_LINE,
  ChartTitle,
  COST_SERIES,
  FIXED_COST_ALERT,
  fixedShare,
  REVENUE_SERIES,
  StackedProgramBar,
  TargetVsActualChart,
} from './FacultyCharts';
import CostTable from './CostTable';
import RevenueTable from './RevenueTable';
import FacultyStatusBar from './FacultyStatusBar';

/**
 * หน้าย่อยของภาพรวมคณะ (รายได้ · ต้นทุน · จุดคุ้มทุน · การตั้งค่า)
 * ทุกหน้ามีแถบติดบน + ตัวสลับระดับชุดเดียวกับหน้าภาพรวม
 */
const SubPage = ({
  section,
  showRevenue,
  showCost,
  levelTabs,
  children,
}: {
  section: string;
  showRevenue?: boolean;
  showCost?: boolean;
  /** ห้ามรวมทุกระดับ — ระดับเป็นแถบปุ่มทีละระดับ */
  levelTabs?: boolean;
  children: ReactNode;
}) => {
  const { progs, year, setRequireLevel } = useFaculty();

  useEffect(() => {
    if (!levelTabs) return;
    setRequireLevel(true);

    return () => setRequireLevel(false);
  }, [levelTabs, setRequireLevel]);

  return (
    <Box>
      <FacultyStatusBar
        section={section}
        showRevenue={showRevenue}
        showCost={showCost}
        showLevel
        levelTabs={levelTabs}
      />
      {progs.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center" sx={{ py: 8 }}>
              คณะนี้ยังไม่มีหลักสูตรที่มีนิสิตในปีการศึกษา {year} — เลือกคณะอื่นที่แถบด้านบน
            </Typography>
          </CardContent>
        </Card>
      ) : (
        children
      )}
    </Box>
  );
};

const REV_INFO = {
  tr: 'ทั้งคณะทุกระดับ · รวมเงินแผ่นดิน = เงินแผ่นดิน + เงินรายได้ · ไม่รวม = เงินรายได้ (ค่าธรรมเนียม) อย่างเดียว',
  st: 'งบประมาณแผ่นดินที่ปันให้หลักสูตรทั้งคณะ (ทุกระดับ)',
  own: 'เงินรายได้ = ค่าธรรมเนียมการศึกษาทั้งคณะ (ทุกระดับ)',
  r: 'รายได้รวม ÷ นิสิตปัจจุบัน ตามฐานรายได้ที่เลือกด้านบน',
};

/** การ์ดที่กดแล้วเลื่อนลงไปตาราง (id ของการ์ดตาราง) */
const ScrollTile = ({ target, children }: { target: string; children: ReactNode }) => (
  <Box
    role="button"
    tabIndex={0}
    onClick={() =>
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    onKeyDown={(e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }}
    sx={{ blockSize: '100%', cursor: 'pointer', borderRadius: 1, '&:hover': { boxShadow: 4 } }}
  >
    {children}
  </Box>
);

const lvlShort = (lvl: string) => lvl.replace('ปริญญา', 'ป.');

const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`;

export const FacultyRevenuePage = () => {
  const { fac, progs, level, mode, facRes, levelRes, openDetail } = useFaculty();
  const withGov = mode === 'with_government';
  const lvlSt = progs.reduce((a, x) => a + x.p.st, 0);
  const lvlOwn = progs.reduce((a, x) => a + x.p.own, 0);
  const stShare = fac.st + fac.own ? fac.st / (fac.st + fac.own) : 0;

  // ไม่รวมแผ่นดิน → ตัดแท่งม่วงออก · เรียงรายได้มาก → น้อยตามฐานที่เลือก
  const series = withGov ? REVENUE_SERIES : REVENUE_SERIES.filter((s) => s.name !== 'เงินแผ่นดิน');
  const ranked = useMemo(
    () =>
      [...progs].sort((a, b) =>
        withGov ? b.p.st + b.p.own - a.p.st - a.p.own : b.p.own - a.p.own,
      ),
    [progs, withGov],
  );

  // รายได้ ป.ตรี/โท/เอก มาจากคนละแหล่ง — ไม่รวมทุกระดับในกราฟเดียว
  return (
    <SubPage section="รายได้" showRevenue levelTabs>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ScrollTile target="revenue-table">
            <KpiTile
              label="รายได้รวมทั้งคณะ"
              value={fmtMillion(facRes.tr)}
              suffix="ลบ."
              accent="primary"
              icon="ri-hand-coin-line"
              footer={`${lvlShort(level)} ${fmtMillion(levelRes.tr)} ลบ. · ${REVENUE_MODE_LABEL[mode]}`}
              info={REV_INFO.tr}
            />
          </ScrollTile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ScrollTile target="revenue-table">
            <KpiTile
              label="เงินงบประมาณแผ่นดินรวม"
              value={fmtMillion(fac.st)}
              suffix="ลบ."
              accent="secondary"
              color={BEPS.breakEven}
              icon="ri-government-line"
              progress={stShare * 100}
              footer={
                withGov
                  ? `${(stShare * 100).toFixed(0)}% ของรายได้ · ${lvlShort(level)} ${fmtMillion(lvlSt)} ลบ.`
                  : 'ไม่นับในฐานรายได้นี้'
              }
              info={REV_INFO.st}
            />
          </ScrollTile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ScrollTile target="revenue-table">
            <KpiTile
              label="เงินรายได้ / ค่าธรรมเนียมรวม"
              value={fmtMillion(fac.own)}
              suffix="ลบ."
              accent="primary"
              color={BEPS.revenue.dark}
              icon="ri-graduation-cap-line"
              progress={(1 - stShare) * 100}
              footer={`${((1 - stShare) * 100).toFixed(0)}% ของรายได้ · ${lvlShort(level)} ${fmtMillion(lvlOwn)} ลบ.`}
              info={REV_INFO.own}
            />
          </ScrollTile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ScrollTile target="revenue-table">
            <KpiTile
              label="รายได้เฉลี่ยต่อหัว"
              value={fmtInt(facRes.r ?? 0)}
              suffix="บาท"
              accent="primary"
              color={BEPS.cost.dark}
              icon="ri-user-heart-line"
              footer={`${lvlShort(level)} ${fmtInt(levelRes.r ?? 0)} บาท/คน · นิสิต ${fmtInt(facRes.q)} คน`}
              info={REV_INFO.r}
            />
          </ScrollTile>
        </Grid>
      </Grid>
      <Card sx={{ mb: 3, overflow: 'visible' }}>
        <CardContent>
          <StackedProgramBar
            title={`รายได้รายหลักสูตร/ปี — ${level}`}
            info={
              withGov
                ? 'ล้านบาท · เงินรายได้ = ค่าธรรมเนียมการศึกษา · เงินแผ่นดิน = งบประมาณแผ่นดินที่ปันให้หลักสูตร · เรียงรายได้รวมมาก → น้อย · กดแท่งเพื่อดูรายละเอียด'
                : 'ล้านบาท · ไม่รวมเงินแผ่นดิน — แสดงเฉพาะเงินรายได้ (ค่าธรรมเนียม) ที่หลักสูตรหาเองได้ · เรียงมาก → น้อย · กดแท่งเพื่อดูรายละเอียด'
            }
            progs={ranked}
            series={series}
            onPick={openDetail}
          />
        </CardContent>
      </Card>
      <Card id="revenue-table" sx={{ scrollMarginTop: 120 }}>
        <CardContent>
          <ChartTitle
            title={`ตารางรายได้รายหลักสูตร/ปี — ${level}`}
            info="บาท · กดหัวคอลัมน์เพื่อเรียง · กดแถวเพื่อดูรายละเอียดหลักสูตร"
          />
          <RevenueTable progs={progs} mode={mode} onPick={openDetail} />
        </CardContent>
      </Card>
    </SubPage>
  );
};

const COST_INFO = {
  tc: 'ทั้งคณะทุกระดับ · ต้นทุนคงที่ + ต้นทุนผันแปร · ต้นทุนไม่เปลี่ยนตามฐานรายได้ที่เลือกด้านบน',
  tfc: `ไม่เปลี่ยนตามจำนวนนิสิต: คงที่ทางตรง (เช่น เงินเดือนอาจารย์) + ส่วนกลางคณะที่ปันมา + ค่าเสื่อมราคา · เกิน ${FIXED_COST_ALERT * 100}% ของต้นทุนรวม มีแนวโน้มขาดทุนสูง`,
  tvc: 'เพิ่ม/ลดตามจำนวนนิสิตจริง: ค่าตอบแทน ค่าใช้สอย ค่าวัสดุ สาธารณูปโภค วิชาศึกษาทั่วไป และเงินสมทบ',
  perHead: 'ต้นทุนรวม ÷ นิสิตปัจจุบัน · เทียบกับรายได้เฉลี่ยต่อหัวตามฐานรายได้ที่เลือก',
};

/** แถวในการ์ดจุดสังเกต */
const WatchItem = ({
  icon,
  color,
  children,
  onClick,
}: {
  icon: string;
  color?: string;
  children: ReactNode;
  onClick?: () => void;
}) => (
  <Box
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={(e) => {
      if (!onClick || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      onClick();
    }}
    sx={{
      display: 'flex',
      gap: 1.5,
      alignItems: 'flex-start',
      p: 1.5,
      borderRadius: 1,
      cursor: onClick ? 'pointer' : undefined,
      '&:hover': onClick ? { bgcolor: 'action.hover' } : undefined,
    }}
  >
    <Box
      component="i"
      className={icon}
      sx={{ color: color ?? 'text.secondary', fontSize: 20, mt: 0.25 }}
    />
    <Typography variant="body2" component="div">
      {children}
    </Typography>
  </Box>
);

const COST_CHART_INFO = `ต้นทุนคงที่ = ไม่เปลี่ยนตามจำนวนนิสิต (บุคลากร ค่าเสื่อม ส่วนกลางที่ปันมา) · ต้นทุนผันแปร = เพิ่มตามจำนวนนิสิต · ⚠ = ต้นทุนคงที่เกิน ${FIXED_COST_ALERT * 100}% · เรียงมาก → น้อย · กดแท่งเพื่อดูหมวดรายจ่าย`;

/** ชิปจุดสังเกตแบบสั้น — ไอคอนสี + ข้อความบรรทัดเดียว · กดได้เมื่อมี onClick */
const WatchChip = ({
  icon,
  color,
  children,
  onClick,
}: {
  icon: string;
  color?: string;
  children: ReactNode;
  onClick?: () => void;
}) => (
  <Chip
    variant="outlined"
    onClick={onClick}
    icon={
      <Box
        component="i"
        className={icon}
        sx={{
          color: `${color ?? 'var(--mui-palette-text-secondary)'} !important`,
          fontSize: '18px !important',
        }}
      />
    }
    label={children}
    sx={{
      height: 'auto',
      py: 0.75,
      borderRadius: 2,
      '& .MuiChip-label': { whiteSpace: 'normal', fontSize: '0.8125rem' },
    }}
  />
);

export const FacultyCostPage = () => {
  const { fac, year, progs, level, facRes, levelRes, lock, lockReady, openDetail } = useFaculty();
  const { role } = useRole();
  const dep = facultyDepCompare(fac.name);
  const [onlyHigh, setOnlyHigh] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);

  // เปลี่ยนระดับ/คณะ → ล้างตัวกรอง “คงที่เกินเกณฑ์”
  useEffect(() => setOnlyHigh(false), [level, fac.name]);

  const share = fixedShare(facRes.tfc, facRes.tc);
  const lvlShare = fixedShare(levelRes.tfc, levelRes.tc);
  const high = share > FIXED_COST_ALERT;
  const costPerHead = facRes.q ? facRes.tc / facRes.q : 0;
  const lvlPerHead = levelRes.q ? levelRes.tc / levelRes.q : 0;
  const pickCost = (key: string) => openDetail(key, 'cost');

  // กราฟคู่: ต้นทุนรวม | ต่อหัว — แต่ละกราฟเรียงมาก → น้อยตามค่าของตัวเอง · ⚠ = ต้นทุนคงที่เกินเกณฑ์
  const ranked = useMemo(() => {
    const per = (x: ProgStat) => (x.p.Q ? x.p.TC / x.p.Q : 0);
    const marked = progs.map((x) =>
      fixedShare(x.p.TFC, x.p.TC) > FIXED_COST_ALERT ? { ...x, label: `⚠ ${x.label}` } : x,
    );

    return {
      total: [...marked].sort((a, b) => b.p.TC - a.p.TC),
      head: [...marked].sort((a, b) => per(b) - per(a)),
    };
  }, [progs]);

  const watch = useMemo(() => {
    const top = [...progs].sort((a, b) => b.p.TC - a.p.TC)[0];
    const highs = progs.filter((x) => fixedShare(x.p.TFC, x.p.TC) > FIXED_COST_ALERT);
    const maxHead = [...progs]
      .filter((x) => x.p.Q > 0)
      .sort((a, b) => b.p.TC / b.p.Q - a.p.TC / a.p.Q)[0];

    return { top, highs, maxHead };
  }, [progs]);

  // ข้อในป็อปอัป: ปิดป็อปอัปก่อนแล้วค่อยไปที่หลักสูตร/ตาราง
  const closeThen = (fn: () => void) => () => {
    setWatchOpen(false);
    fn();
  };

  const showHighs = () => {
    setOnlyHigh(true);
    document.getElementById('cost-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <SubPage section="ต้นทุน / ค่าใช้จ่าย" showCost>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ScrollTile target="cost-table">
            <KpiTile
              label="ต้นทุนรวมทั้งคณะ"
              value={fmtMillion(facRes.tc)}
              suffix="ลบ."
              accent="primary"
              icon="ri-wallet-3-line"
              footer={`${lvlShort(level)} ${fmtMillion(levelRes.tc)} ลบ. · ${fmtPct(facRes.tc ? levelRes.tc / facRes.tc : 0)} ของคณะ`}
              info={COST_INFO.tc}
            />
          </ScrollTile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ScrollTile target="cost-table">
            <KpiTile
              label={high ? '⚠ ต้นทุนคงที่' : 'ต้นทุนคงที่'}
              value={fmtMillion(facRes.tfc)}
              suffix="ลบ."
              accent="warning"
              color={BEPS.breakEven}
              icon="ri-building-2-line"
              progress={share * 100}
              footer={`${fmtPct(share)} ของต้นทุนรวม${high ? ` (เกิน ${FIXED_COST_ALERT * 100}%)` : ''} · ${lvlShort(level)} ${fmtPct(lvlShare)}`}
              info={COST_INFO.tfc}
            />
          </ScrollTile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ScrollTile target="cost-table">
            <KpiTile
              label="ต้นทุนผันแปร"
              value={fmtMillion(facRes.tvc)}
              suffix="ลบ."
              accent="error"
              color={BEPS.revenue.dark}
              icon="ri-user-shared-line"
              progress={(1 - share) * 100}
              footer={`${fmtPct(1 - share)} ของต้นทุนรวม · ${lvlShort(level)} ${fmtMillion(levelRes.tvc)} ลบ.`}
              info={COST_INFO.tvc}
            />
          </ScrollTile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ScrollTile target="cost-table">
            <KpiTile
              label="ต้นทุนเฉลี่ยต่อหัว"
              value={fmtInt(costPerHead)}
              suffix="บาท"
              accent="primary"
              color={BEPS.cost.dark}
              icon="ri-user-heart-line"
              footer={`รายได้ต่อหัว ${fmtInt(facRes.r ?? 0)} บาท · ${lvlShort(level)} ${fmtInt(lvlPerHead)} บาท/คน`}
              info={COST_INFO.perHead}
            />
          </ScrollTile>
        </Grid>
      </Grid>
      {/* จุดสังเกต — แถบชิปสั้น เห็นตลอด · กดชิปไปที่หลักสูตร/ตาราง · รายละเอียดเต็มในป็อปอัป */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              mb: 1.5,
            }}
          >
            <ChartTitle
              title={`จุดสังเกต — ${level}`}
              info="สรุปจุดที่ควรดูต่อจากหลักสูตรในระดับที่เลือก · กดชิปเพื่อไปที่หลักสูตรหรือตาราง · กด “รายละเอียด” เพื่อดูคำอธิบายเต็ม"
            />
            <Button
              size="small"
              variant="outlined"
              endIcon={<i className="ri-arrow-right-s-line" />}
              onClick={() => setWatchOpen(true)}
              sx={{ flexShrink: 0 }}
            >
              รายละเอียด
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {watch.top && (
              <WatchChip
                icon="ri-focus-3-line"
                color={BEPS.cost.dark}
                onClick={() => pickCost(watch.top!.key)}
              >
                กระจุกที่ <b>{watch.top.label}</b>{' '}
                {fmtPct(facRes.tc ? watch.top.p.TC / facRes.tc : 0)}
              </WatchChip>
            )}
            <WatchChip
              icon="ri-alarm-warning-line"
              color={watch.highs.length ? 'var(--mui-palette-warning-main)' : undefined}
              onClick={watch.highs.length ? showHighs : undefined}
            >
              คงที่เกิน {FIXED_COST_ALERT * 100}%: <b>{watch.highs.length}</b>/{progs.length}{' '}
              หลักสูตร
            </WatchChip>
            {watch.maxHead && (
              <WatchChip
                icon="ri-user-star-line"
                color={BEPS.profit}
                onClick={() => pickCost(watch.maxHead!.key)}
              >
                ต่อหัวสูงสุด <b>{watch.maxHead.label}</b>{' '}
                {fmtInt(watch.maxHead.p.TC / watch.maxHead.p.Q)} บาท
              </WatchChip>
            )}
            {dep && (
              <WatchChip icon="ri-building-line" onClick={() => setWatchOpen(true)}>
                ค่าเสื่อมปีงบ {year} (กองคลัง){' '}
                <b>
                  {dep.y2568 >= dep.y2567 ? '+' : '−'}
                  {dep.y2567 ? fmtPct(Math.abs(dep.y2568 / dep.y2567 - 1)) : '–'}
                </b>
              </WatchChip>
            )}
            <WatchChip icon="ri-scales-3-line" onClick={() => setWatchOpen(true)}>
              ปันส่วน: <b>{!lockReady || !lock ? '…' : ALLOC_METHOD_LABEL[lock.choice.method]}</b>
              {lock && ` (${policySourceShort(lock)})`}
            </WatchChip>
          </Box>
        </CardContent>
      </Card>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ blockSize: '100%', overflow: 'visible' }}>
            <CardContent>
              <StackedProgramBar
                title={`ต้นทุนรายหลักสูตร — ${level}`}
                info={`ล้านบาท · ${COST_CHART_INFO}`}
                progs={ranked.total}
                series={COST_SERIES}
                onPick={pickCost}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardContent>
              <StackedProgramBar
                title={`ต้นทุนต่อหัวรายหลักสูตร — ${level}`}
                info={`บาทต่อนิสิต 1 คน · ${COST_CHART_INFO}`}
                progs={ranked.head}
                series={COST_SERIES}
                onPick={pickCost}
                perHead
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Dialog open={watchOpen} onClose={() => setWatchOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pr: 8 }}>
          จุดสังเกต — {level}
          <IconButton
            aria-label="ปิด"
            onClick={() => setWatchOpen(false)}
            sx={{ position: 'absolute', insetInlineEnd: 12, insetBlockStart: 12 }}
          >
            <i className="ri-close-line" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {watch.top && (
            <WatchItem
              icon="ri-focus-3-line"
              color={BEPS.cost.dark}
              onClick={closeThen(() => pickCost(watch.top!.key))}
            >
              ต้นทุนกระจุกที่ <b>{watch.top.label}</b> — {fmtMillion(watch.top.p.TC)} ลบ. ={' '}
              <b>{fmtPct(facRes.tc ? watch.top.p.TC / facRes.tc : 0)}</b> ของต้นทุนทั้งคณะ
            </WatchItem>
          )}
          <WatchItem
            icon="ri-alarm-warning-line"
            color={watch.highs.length ? 'var(--mui-palette-warning-main)' : undefined}
            onClick={watch.highs.length ? closeThen(showHighs) : undefined}
          >
            {watch.highs.length ? (
              <>
                ต้นทุนคงที่เกิน {FIXED_COST_ALERT * 100}%: <b>{watch.highs.length}</b> จาก{' '}
                {progs.length} หลักสูตร — กดเพื่อดูรายชื่อ
              </>
            ) : (
              <>ไม่มีหลักสูตรที่ต้นทุนคงที่เกิน {FIXED_COST_ALERT * 100}%</>
            )}
          </WatchItem>
          {watch.maxHead && (
            <WatchItem
              icon="ri-user-star-line"
              color={BEPS.profit}
              onClick={closeThen(() => pickCost(watch.maxHead!.key))}
            >
              ต้นทุนต่อหัวสูงสุด <b>{watch.maxHead.label}</b>{' '}
              {fmtInt(watch.maxHead.p.TC / watch.maxHead.p.Q)} บาท/คน (เฉลี่ยระดับนี้{' '}
              {fmtInt(lvlPerHead)})
            </WatchItem>
          )}
          {dep && (
            <WatchItem icon="ri-building-line">
              ค่าเสื่อมทั้งคณะ: ระบบคำนวณใช้ปีงบ {Number(year) - 1} <b>{fmtMillion(dep.y2567)}</b>{' '}
              ลบ. · ปีงบ {year} (กองคลัง) <b>{fmtMillion(dep.y2568)}</b> ลบ.{' '}
              <Box component="span" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                ({dep.y2568 >= dep.y2567 ? '+' : '−'}
                {fmtMillion(Math.abs(dep.y2568 - dep.y2567))} ลบ.
                {dep.y2567
                  ? ` · ${dep.y2568 >= dep.y2567 ? '+' : '−'}${fmtPct(Math.abs(dep.y2568 / dep.y2567 - 1))}`
                  : ''}
                )
              </Box>
              <InfoTip
                text={`ปีงบ ${year} เป็นข้อมูลอ้างอิงจากกองคลัง ยังไม่เข้าสูตร — กองคลังยังไม่ได้กระจายลงรายหลักสูตร ตัวเลขทุกหน้าจึงยังใช้ปีงบ ${Number(year) - 1} · เทียบระดับทั้งคณะเท่านั้น${dep.withHospital ? ' · ปีงบ ' + year + ' รวมยอดโรงพยาบาลของคณะแล้ว ให้เทียบได้กับปีก่อนที่รวมไว้ในคณะ' : ''}`}
              />
              {canAccess(role, '/cost-data') && (
                <Box
                  component={Link}
                  href="/cost-data?tab=depreciation"
                  sx={{ display: 'block', fontSize: '0.8125rem', mt: 0.5 }}
                >
                  ดูค่าเสื่อมรายหน่วยงาน →
                </Box>
              )}
            </WatchItem>
          )}
          <WatchItem icon="ri-scales-3-line">
            วิธีปันส่วนที่ใช้วิเคราะห์หลักสูตร:{' '}
            <b>{!lockReady || !lock ? '…' : ALLOC_METHOD_LABEL[lock.choice.method]}</b>
            {lock && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {policySourceLabel(lock)}
              </Typography>
            )}
            <InfoTip text="ตัวเลขในหน้านี้ใช้การหารรายหัวตามชีต (ข้อมูลจริง) ทั้งหมด เพื่อให้หน้ารายได้ ต้นทุน และจุดคุ้มทุนตรงกัน — วิธีที่คณะตั้งค่าไว้ (หรือค่าปีก่อน/ตาม Excel) ใช้กับการวิเคราะห์หลักสูตร" />
            {canAccess(role, LOCK_SETTINGS_HREF) && (
              <Box
                component={Link}
                href={LOCK_SETTINGS_HREF}
                sx={{ display: 'block', fontSize: '0.8125rem', mt: 0.5 }}
              >
                ดูวิธีปันส่วนคณะ →
              </Box>
            )}
          </WatchItem>
        </DialogContent>
      </Dialog>
      <Card id="cost-table" sx={{ scrollMarginTop: 120 }}>
        <CardContent>
          <ChartTitle
            title={`ตารางต้นทุนรายหลักสูตร — ${level}`}
            info="บาท · กดหัวคอลัมน์เพื่อเรียง · กดแถวเพื่อดูต้นทุนตามหมวดรายจ่าย · Export ได้ตามตัวกรองและการเรียงที่เห็น"
          />
          <CostTable
            progs={progs}
            facName={fac.name}
            facTc={facRes.tc}
            level={level}
            year={year}
            onlyHigh={onlyHigh}
            onClearFilter={() => setOnlyHigh(false)}
            onPick={pickCost}
          />
        </CardContent>
      </Card>
    </SubPage>
  );
};

const BE_INFO = {
  q: 'นิสิตปัจจุบันของหลักสูตรในระดับที่เลือก · ตัดยอด ณ วันปิดลงทะเบียนภาคเรียนที่ 2',
  gov: 'ผลบวกจุดคุ้มทุน (Q*) ของหลักสูตรในระดับนี้ เมื่อนับเงินแผ่นดินเป็นรายได้ — วิธีเดียวกับชีต Excel',
  own: 'ผลบวกจุดคุ้มทุน (Q*) ของหลักสูตรในระดับนี้ เมื่อมีแต่เงินรายได้ (ไม่มีงบแผ่นดิน / ออกนอกระบบ) — วิธีเดียวกับชีต Excel',
  gap: 'รวมเฉพาะส่วนที่ขาดของหลักสูตรที่ยังไม่ถึงจุดคุ้มทุน — หลักสูตรที่เกินเป้าไม่นำมาหักกลบ เพราะนิสิตย้ายข้ามหลักสูตรไม่ได้ · หลักสูตรที่ไม่มีจุดคุ้มทุน (รายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร) ไม่นับ',
  pass: 'ผ่าน = นิสิตจริงถึงจุดคุ้มทุนตามฐานที่เลือก · กดเพื่อกรองตารางเฉพาะหลักสูตรที่ยังไม่ผ่าน',
};

/** สรุปจุดคุ้มทุนของหลักสูตรชุดหนึ่งตามฐานรายได้ */
const beSummary = (progs: ProgStat[], withGov: boolean) => {
  const t = { qStar: 0, gap: 0, short: 0, ok: 0, none: 0 };

  progs.forEach((x) => {
    const target = withGov ? x.qStarGov : x.qStarOwn;

    t.qStar += target; // ผลบวกแบบชีต (ติดลบก็นับ)
    if (target <= 0) t.none += 1;
    else if (x.p.Q >= target) t.ok += 1;
    else {
      t.short += 1;
      t.gap += target - x.p.Q;
    }
  });

  return t;
};

export const FacultyBreakEvenPage = () => {
  const {
    fac,
    progs,
    allProgs,
    level,
    mode,
    facRes,
    levelRes,
    after,
    openDetail,
    lock,
    lockReady,
  } = useFaculty();
  const withGov = mode === 'with_government';
  const [view, setView] = useState<'rank' | 'heat' | 'scatter'>('rank');
  const [onlyFail, setOnlyFail] = useState(false);

  // เปลี่ยนระดับ/คณะ → ล้างตัวกรอง “ยังไม่ผ่าน”
  useEffect(() => setOnlyFail(false), [level, fac.name]);

  const gov = useMemo(() => beSummary(progs, true), [progs]);
  const own = useMemo(() => beSummary(progs, false), [progs]);
  const cur = withGov ? gov : own;
  const facCur = useMemo(() => beSummary(allProgs, withGov), [allProgs, withGov]);
  const facGov = useMemo(() => beSummary(allProgs, true).qStar, [allProgs]);
  const facOwn = useMemo(() => beSummary(allProgs, false).qStar, [allProgs]);
  const q = levelRes.q;
  const chartH = Math.max(320, progs.length * 24 + 60);

  const crossRows = useMemo(() => {
    const keys = new Set(progs.map((x) => x.key));

    return buildProgramCrossData(fac.name, 'all', mode).filter((x) => x.key && keys.has(x.key));
  }, [fac.name, mode, progs]);

  const shownRows = onlyFail ? crossRows.filter((x) => !x.isOk) : crossRows;

  const showFails = () => {
    setOnlyFail(true);
    setView('rank');
    document.getElementById('be-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** การ์ดเป้าหมาย: รวมเงินแผ่นดิน = เขียว · ไม่รวม = ม่วง (ฐานที่เลือกบอกที่บรรทัดล่าง) */
  const targetTile = (isGov: boolean) => {
    const t = isGov ? gov : own;
    const active = isGov === withGov;

    return (
      <KpiTile
        label={`เป้าหมาย ณ จุดคุ้มทุน · ${isGov ? 'รวม' : 'ไม่รวม'}เงินแผ่นดิน`}
        value={fmtInt(t.qStar)}
        suffix="คน"
        accent="primary"
        color={isGov ? BEPS.breakEven : BEPS.revenue.dark}
        icon={isGov ? 'ri-government-line' : 'ri-flag-2-line'}
        progress={t.qStar > 0 ? Math.min(100, (q / t.qStar) * 100) : 0}
        footer={`${t.qStar > 0 ? `นิสิตจริง ${fmtPct(q / t.qStar)} ของเป้า` : 'ไม่มีจุดคุ้มทุน'}${active ? ' · ฐานที่เลือก' : ''} · ทั้งคณะ ${fmtInt(isGov ? facGov : facOwn)}`}
        info={isGov ? BE_INFO.gov : BE_INFO.own}
      />
    );
  };

  return (
    <SubPage section="จุดคุ้มทุน">
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 'grow' }}>
          <ScrollTile target="be-table">
            <KpiTile
              label="นิสิตปัจจุบัน"
              value={fmtInt(q)}
              suffix="คน"
              accent="primary"
              icon="ri-group-line"
              footer={`${lvlShort(level)} ${progs.length} หลักสูตร · ทั้งคณะ ${fmtInt(facRes.q)} คน`}
              info={BE_INFO.q}
            />
          </ScrollTile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 'grow' }}>
          <ScrollTile target="be-table">{targetTile(true)}</ScrollTile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 'grow' }}>
          <ScrollTile target="be-table">{targetTile(false)}</ScrollTile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 'grow' }}>
          <ScrollTile target="be-table">
            <KpiTile
              label={cur.gap > 0 ? 'ยังขาดอีก' : 'ถึงจุดคุ้มทุนครบ'}
              value={fmtInt(cur.gap)}
              suffix="คน"
              accent={cur.gap > 0 ? 'error' : 'success'}
              color={BEPS.cost.dark}
              icon="ri-user-add-line"
              footer={`${cur.short} หลักสูตรยังขาด · ${REVENUE_MODE_LABEL[mode]} · ทั้งคณะ ${fmtInt(facCur.gap)} คน`}
              info={`${BE_INFO.gap} · ถ้าหักกลบได้ (Q* รวม − นิสิตรวม) = ${fmtInt(cur.qStar - q)} คน`}
            />
          </ScrollTile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 'grow' }}>
          <Box
            role="button"
            tabIndex={0}
            onClick={showFails}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              showFails();
            }}
            sx={{
              blockSize: '100%',
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { boxShadow: 4 },
            }}
          >
            <KpiTile
              label="หลักสูตรผ่าน / ทั้งหมด"
              value={`${cur.ok} / ${progs.length}`}
              suffix="หลักสูตร"
              accent={cur.ok === progs.length ? 'success' : 'error'}
              color={BEPS.profit}
              icon="ri-alarm-warning-line"
              progress={progs.length ? (cur.ok / progs.length) * 100 : 0}
              footer={`ไม่ผ่าน ${cur.short}${cur.none ? ` · ไม่มีจุดคุ้มทุน ${cur.none}` : ''} · ทั้งคณะผ่าน ${facCur.ok}/${allProgs.length}`}
              info={BE_INFO.pass}
            />
          </Box>
        </Grid>
      </Grid>
      {/* วิธีปันส่วนต้นทุนคงที่ที่ผลหลังปรับใช้ + ที่มา (คณะตั้งค่า / ค่าปีก่อน / ตาม Excel) */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: -1.5, mb: 2 }}
      >
        <i className="ri-scales-3-line" style={{ verticalAlign: 'middle' }} /> ปันส่วนต้นทุนคงที่:{' '}
        <b>{!lockReady || !lock ? '…' : ALLOC_METHOD_LABEL[lock.choice.method]}</b>
        {lock && ` · ${policySourceLabel(lock)}`}
      </Typography>
      {/* 2 กราฟวางคู่กัน — ความสูงเท่ากัน ตามจำนวนหลักสูตร */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardContent>
              <TargetVsActualChart progs={progs} mode={mode} onPick={openDetail} height={chartH} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ blockSize: '100%' }}>
            <CardContent>
              <ChartTitle
                title={`จุดตัดคุ้มทุน — ${level} · ${REVENUE_MODE_LABEL[mode]}`}
                info="จุดตัดของเส้นรายได้รวมกับเส้นต้นทุนรวม = จุดคุ้มทุน (เริ่มมีกำไร) · จุดสีเข้ม = จำนวนนิสิตปัจจุบัน · จุดคุ้มทุนที่ปักไว้ = ผลบวก Q* รายหลักสูตรแบบชีต Excel"
              />
              <BreakEvenLineChart res={levelRes} q={levelRes.q} height={chartH} palette={BE_LINE} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Box
        id="be-table"
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          mb: 3,
          scrollMarginTop: 120,
        }}
      >
        {onlyFail && (
          <Chip
            color="error"
            variant="outlined"
            label={`แสดงเฉพาะหลักสูตรที่ยังไม่ผ่าน (${shownRows.length})`}
            onDelete={() => setOnlyFail(false)}
          />
        )}
        <ToggleButtonGroup
          size="small"
          color="primary"
          exclusive
          value={view}
          onChange={(_, v) => v && setView(v)}
        >
          <ToggleButton value="rank">ตารางอันดับ ก่อน | หลังปรับ</ToggleButton>
          <ToggleButton value="heat">ตารางสี</ToggleButton>
          <ToggleButton value="scatter">กราฟกระจาย</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {view === 'rank' ? (
        <RankingCard
          rows={shownRows}
          unitWord="หลักสูตร"
          after={after}
          basis={REVENUE_MODE_LABEL[mode]}
          summaryLabel={`รวม${onlyFail ? 'ที่ยังไม่ผ่าน' : ''} ${lvlShort(level)}`}
          onRowClick={(row) => openDetail(row.key)}
        />
      ) : view === 'heat' ? (
        <HeatmapCard rows={shownRows} unitWord="หลักสูตร" />
      ) : (
        <ScatterPair rows={shownRows} unitWord="หลักสูตร" />
      )}
    </SubPage>
  );
};
