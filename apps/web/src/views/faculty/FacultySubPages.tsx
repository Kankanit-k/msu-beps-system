'use client';

// React Imports
import { useMemo, useState } from 'react';

// Next Imports
import Link from 'next/link';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import type { ReactNode } from 'react';

// Component Imports
import { BEPS } from '@components/ChartBits';
import KpiTile from '@components/KpiTile';
import { canAccess } from '@/configs/accessControl';
import { useRole } from '@/hooks/useRole';
import { fmtInt, fmtMillion, REVENUE_MODE_LABEL } from '@views/breakeven/calc';
import { buildProgramCrossData } from '@views/cross/crossData';
import { HeatmapCard, RankingCard, ScatterPair } from '@views/cross/CrossPanels';
import { fmtLockedAt } from '@views/fixed-cost-lock/lockStore';
import { ALLOC_METHOD_LABEL } from '@views/scenario-program/facultyAllocation';

import { useFaculty } from './FacultyContext';
import { ChartTitle, COST_SERIES, CostDonut, REVENUE_SERIES, StackedProgramBar, TargetVsActualChart } from './FacultyCharts';
import RevenueTable from './RevenueTable';
import FacultyStatusBar from './FacultyStatusBar';

/**
 * หน้าย่อยของภาพรวมคณะ — รอบนี้ย้ายเนื้อหาแท็บเดิมมาไว้ก่อน (ตารางละเอียดตามแผนเป็นรอบ C/D)
 * ทุกหน้ามีแถบติดบน + ตัวสลับระดับชุดเดียวกับหน้าภาพรวม
 */
const SubPage = ({ section, showRevenue, children }: { section: string; showRevenue?: boolean; children: ReactNode }) => {
  const { progs, year } = useFaculty();

  return (
    <Box>
      <FacultyStatusBar section={section} showRevenue={showRevenue} showLevel />
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

/** การ์ดที่กดแล้วเลื่อนลงไปตาราง */
const ScrollTile = ({ children }: { children: ReactNode }) => (
  <Box
    role="button"
    tabIndex={0}
    onClick={() => document.getElementById('revenue-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
    sx={{ blockSize: '100%', cursor: 'pointer', borderRadius: 1, '&:hover': { boxShadow: 4 } }}
  >
    {children}
  </Box>
);

const lvlShort = (lvl: string) => lvl.replace('ปริญญา', 'ป.');

export const FacultyRevenuePage = () => {
  const { fac, progs, level, mode, facRes, levelRes, openDetail } = useFaculty();
  const withGov = mode === 'with_government';
  const lvlSt = progs.reduce((a, x) => a + x.p.st, 0);
  const lvlOwn = progs.reduce((a, x) => a + x.p.own, 0);
  const stShare = fac.st + fac.own ? fac.st / (fac.st + fac.own) : 0;

  // ไม่รวมแผ่นดิน → ตัดแท่งม่วงออก · เรียงรายได้มาก → น้อยตามฐานที่เลือก
  const series = withGov ? REVENUE_SERIES : REVENUE_SERIES.filter((s) => s.name !== 'เงินแผ่นดิน');
  const ranked = useMemo(
    () => [...progs].sort((a, b) => (withGov ? b.p.st + b.p.own - a.p.st - a.p.own : b.p.own - a.p.own)),
    [progs, withGov],
  );

  return (
    <SubPage section="รายได้" showRevenue>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ScrollTile>
            <KpiTile
              label="รายได้รวมทั้งคณะ"
              value={fmtMillion(facRes.tr)}
              suffix="ลบ."
              accent="primary"
              color={BEPS.revenue.dark}
              icon="ri-hand-coin-line"
              footer={`${lvlShort(level)} ${fmtMillion(levelRes.tr)} ลบ. · ${REVENUE_MODE_LABEL[mode]}`}
              info={REV_INFO.tr}
            />
          </ScrollTile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ScrollTile>
            <KpiTile
              label="เงินงบประมาณแผ่นดินรวม"
              value={fmtMillion(fac.st)}
              suffix="ลบ."
              accent="secondary"
              color={withGov ? BEPS.revenue.onLight : undefined}
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
          <ScrollTile>
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
          <ScrollTile>
            <KpiTile
              label="รายได้เฉลี่ยต่อหัว"
              value={fmtInt(facRes.r ?? 0)}
              suffix="บาท"
              accent="primary"
              color={BEPS.profit}
              icon="ri-user-heart-line"
              footer={`${lvlShort(level)} ${fmtInt(levelRes.r ?? 0)} บาท/คน · นิสิต ${fmtInt(facRes.q)} คน`}
              info={REV_INFO.r}
            />
          </ScrollTile>
        </Grid>
      </Grid>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <StackedProgramBar
            title={`รายได้รายหลักสูตร — ${level}`}
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
            title={`ตารางรายได้รายหลักสูตร — ${level}`}
            info="บาท · กดหัวคอลัมน์เพื่อเรียง · กดแถวเพื่อดูรายละเอียดหลักสูตร"
          />
          <RevenueTable progs={progs} mode={mode} onPick={openDetail} />
        </CardContent>
      </Card>
    </SubPage>
  );
};

export const FacultyCostPage = () => {
  const { progs, level, levelRes, openDetail } = useFaculty();
  const share = levelRes.tc ? levelRes.tfc / levelRes.tc : 0;

  return (
    <SubPage section="ต้นทุน / ค่าใช้จ่าย">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <StackedProgramBar
                title={`ต้นทุนรายหลักสูตร — ${level}`}
                info="ต้นทุนคงที่ = ไม่เปลี่ยนตามจำนวนนิสิต (บุคลากร ค่าเสื่อม ส่วนกลางที่ปันมา) · ต้นทุนผันแปร = เพิ่มตามจำนวนนิสิต · กดแท่งเพื่อดูรายละเอียด"
                progs={progs}
                series={COST_SERIES}
                onPick={openDetail}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <CostDonut tfc={levelRes.tfc} tvc={levelRes.tvc} title={`โครงสร้างต้นทุน — ${level}`} />
              {share > 0.5 && (
                <Alert severity="warning" sx={{ mt: 3 }}>
                  ต้นทุนคงที่ {(share * 100).toFixed(0)}% ของต้นทุนรวม (เกิน 50%) — ต้องมีนิสิตมากพอจึงจะกระจายภาระต้นทุนคงที่ได้
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </SubPage>
  );
};

export const FacultyBreakEvenPage = () => {
  const { fac, progs, mode, after, openDetail } = useFaculty();
  const [view, setView] = useState<'rank' | 'heat' | 'scatter'>('rank');

  const crossRows = useMemo(() => {
    const keys = new Set(progs.map((x) => x.key));

    return buildProgramCrossData(fac.name, 'all', mode).filter((x) => x.key && keys.has(x.key));
  }, [fac.name, mode, progs]);

  return (
    <SubPage section="จุดคุ้มทุน">
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TargetVsActualChart progs={progs} mode={mode} onPick={openDetail} />
        </CardContent>
      </Card>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <ToggleButtonGroup size="small" color="primary" exclusive value={view} onChange={(_, v) => v && setView(v)}>
          <ToggleButton value="rank">ตารางอันดับ ก่อน | หลังปรับ</ToggleButton>
          <ToggleButton value="heat">ตารางสี</ToggleButton>
          <ToggleButton value="scatter">กราฟกระจาย</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {view === 'rank' ? (
        <RankingCard rows={crossRows} unitWord="หลักสูตร" after={after} onRowClick={(row) => openDetail(row.key)} />
      ) : view === 'heat' ? (
        <HeatmapCard rows={crossRows} unitWord="หลักสูตร" />
      ) : (
        <ScatterPair rows={crossRows} unitWord="หลักสูตร" />
      )}
    </SubPage>
  );
};

export const FacultyConfigPage = () => {
  const { year, lock, lockReady } = useFaculty();
  const { role } = useRole();

  return (
    <Box>
      <FacultyStatusBar section="การตั้งค่าคณะ" />
      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography fontWeight={600}>วิธีปันต้นทุนคงที่ส่วนกลางของคณะ · ปีงบ {year}</Typography>
          {!lockReady ? (
            <Typography color="text.secondary">กำลังโหลด…</Typography>
          ) : lock ? (
            <Typography>
              ล็อกวิธี <b>{ALLOC_METHOD_LABEL[lock.choice.method]}</b> เมื่อ {fmtLockedAt(lock.lockedAt)}
              {lock.lockedBy ? ` โดย ${lock.lockedBy}` : ''}
            </Typography>
          ) : (
            <Typography color="warning.main">คณะยังไม่ได้ล็อกวิธีปันส่วนของปีงบนี้</Typography>
          )}
          <Alert severity="info">
            ตัวเลขบนหน้าภาพรวมคณะยังเป็นข้อมูลจริงตามชีต (หารรายหัว) — วิธีที่ล็อกใช้กับการวิเคราะห์หลักสูตร
          </Alert>
          {canAccess(role, '/admin/fixed-cost-lock') && (
            <Box>
              <Button variant="contained" component={Link} href="/admin/fixed-cost-lock" startIcon={<i className="ri-edit-line" />}>
                แก้ไขการตั้งค่า
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
