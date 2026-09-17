'use client';

// React Imports
import { useMemo, useState } from 'react';

// Next Imports
import dynamic from 'next/dynamic';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import type { ApexOptions } from 'apexcharts';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import type { ProgRow } from '@/data/mockup';
import type { BreakEvenResult, RevenueMode, ScopeLevel } from '@beps/calc-engine';
import {
  aggregateRows,
  computeBreakEven,
  fmtInt,
  fmtMillion,
  STATUS_COLOR,
  STATUS_LABEL,
  statusOf,
} from '@views/breakeven/calc';

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'));

type AnalysisLevel = 'uni' | 'fac' | 'dep' | 'prog';

const LVL_ORDER = ['ปริญญาตรี', 'ประกาศนียบัตร', 'ป.บัณฑิต', 'ปริญญาโท', 'ปริญญาเอก'];
const levelRank = (lvl: string) => {
  const i = LVL_ORDER.indexOf(lvl);

  return i < 0 ? 99 : i;
};

const facLevels = (facName: string): string[] =>
  [...new Set(RAW.PROGS.filter((p) => p.fac === facName).map((p) => p.lvl))].sort(
    (a, b) => levelRank(a) - levelRank(b),
  );

interface Entity {
  name: string;
  q: number;
  st: number;
  own: number;
  res: BreakEvenResult;
  resWithoutGov: BreakEvenResult;
}

const buildEntity = (
  level: AnalysisLevel,
  facIdx: number,
  lvlSel: string,
  progIdx: number,
  mode: RevenueMode,
): Entity => {
  if (level === 'uni') {
    const row = RAW.UNI;

    return {
      name: 'มหาวิทยาลัยมหาสารคาม (รวมทุกคณะ)',
      q: row.Q,
      st: row.st,
      own: row.own,
      res: computeBreakEven(row, mode),
      resWithoutGov: computeBreakEven(row, 'without_government'),
    };
  }

  const fac = RAW.FACS[facIdx] ?? RAW.FACS[0]!;

  if (level === 'fac') {
    return {
      name: fac.name,
      q: fac.Q,
      st: fac.st,
      own: fac.own,
      res: computeBreakEven(fac, mode),
      resWithoutGov: computeBreakEven(fac, 'without_government'),
    };
  }

  const progsInLevel = RAW.PROGS.filter((p) => p.fac === fac.name && p.lvl === lvlSel);

  if (level === 'dep') {
    if (progsInLevel.length === 0) {
      const empty = computeBreakEven({ Q: 0, st: 0, own: 0, TFC: 0, TVC: 0 }, mode);

      return { name: `${fac.name} — ${lvlSel}`, q: 0, st: 0, own: 0, res: empty, resWithoutGov: empty };
    }

    const scope: ScopeLevel = 'education_level';

    return {
      name: `${fac.name} — ${lvlSel} (รวม ${progsInLevel.length} หลักสูตร)`,
      q: progsInLevel.reduce((s, p) => s + p.Q, 0),
      st: progsInLevel.reduce((s, p) => s + p.st, 0),
      own: progsInLevel.reduce((s, p) => s + p.own, 0),
      res: aggregateRows(progsInLevel, mode, scope),
      resWithoutGov: aggregateRows(progsInLevel, 'without_government', scope),
    };
  }

  // prog
  const p: ProgRow = progsInLevel[progIdx] ?? progsInLevel[0] ?? RAW.PROGS[0]!;

  return {
    name: `${fac.name} — ${p.prog} (${p.lvl})`,
    q: p.Q,
    st: p.st,
    own: p.own,
    res: computeBreakEven(p, mode),
    resWithoutGov: computeBreakEven(p, 'without_government'),
  };
};

type Severity = 'crit' | 'warn' | 'info' | 'ok';
const SEVERITY_ICON: Record<Severity, string> = {
  crit: 'ri-error-warning-fill',
  warn: 'ri-alert-fill',
  info: 'ri-information-fill',
  ok: 'ri-checkbox-circle-fill',
};
const SEVERITY_COLOR: Record<Severity, string> = {
  crit: 'var(--mui-palette-error-main)',
  warn: 'var(--mui-palette-warning-main)',
  info: 'var(--mui-palette-info-main)',
  ok: 'var(--mui-palette-success-main)',
};

interface Rec {
  t: Severity;
  h: string;
}

const buildRecommendations = (entity: Entity, mode: RevenueMode, uniRes: BreakEvenResult): { prog: Rec[]; exec: Rec[] } => {
  const { res, resWithoutGov, q, st, own } = entity;
  const r = res.r ?? 0;
  const cm = res.cm ?? 0;
  const status = statusOf(res);
  const qStar = res.qStar;
  const fcr = r > 0 ? Math.ceil(res.tc / r) : 0;
  const mos = qStar !== null && q > qStar ? q - qStar : 0;

  const P: Rec[] = [];

  if (status === 'fcr' || status === 'none') {
    P.push({
      t: 'crit',
      h: `ราคาต่อหัว (R ${fmtInt(res.r)}) ต่ำกว่าต้นทุนผันแปรต่อหัว (AVC ${fmtInt(res.avc)}) — รับนิสิตเพิ่มยิ่งขาดทุน ควรชะลอการขยายจนกว่าจะปรับโครงสร้างราคา/ต้นทุน`,
    });
    P.push({
      t: 'warn',
      h: `ตั้งเป้าให้ R สูงกว่า AVC: ทบทวนอัตราค่าธรรมเนียม หรือลดต้นทุนผันแปรต่อหัวให้ต่ำกว่า ${fmtInt(res.r)} บ./คน`,
    });
    P.push({
      t: 'info',
      h: `แนวทาง Full-Cost Recovery: ต้องมีนิสิตราว ${fmtInt(fcr)} คน ค่าเทอมรวมจึงครอบคลุมต้นทุน (ปัจจุบัน ${fmtInt(q)} คน)`,
    });
  } else if (status === 'loss') {
    P.push({
      t: 'warn',
      h: `เพิ่มการรับเข้าอีก ${fmtInt((qStar ?? 0) - q)} คน (เป็น ${fmtInt(qStar)} คน) เพื่อถึงจุดคุ้มทุน — นิสิตแต่ละคนสมทบกำไรส่วนเกิน ${fmtInt(cm)} บ. เข้าไปชดเชยต้นทุนคงที่`,
    });
    P.push({
      t: 'info',
      h: `หรือเพิ่ม CM ต่อหัว ด้วยการขึ้นค่าธรรมเนียม/เพิ่มรายได้เสริม หรือลด AVC และลดต้นทุนคงที่ (TFC ${fmtMillion(res.tfc)} ลบ.) โดยใช้ทรัพยากรร่วมกับหลักสูตรอื่น`,
    });
  } else {
    P.push({
      t: 'ok',
      h: `คุ้มทุนแล้ว มี Margin of Safety ${fmtInt(mos)} คน (${q ? ((mos / q) * 100).toFixed(0) : 0}% ของนิสิตปัจจุบัน)`,
    });
    P.push({
      t: 'info',
      h: `นำส่วนเกิน ${fmtMillion(res.profit)} ลบ. ไปพัฒนาคุณภาพหลักสูตร งานวิจัย หรือทุนนิสิต เพื่อรักษาความสามารถในการแข่งขัน`,
    });
  }

  if (mode === 'with_government') {
    const exStatus = statusOf(resWithoutGov);

    if (exStatus === 'fcr' || exStatus === 'none') {
      P.push({
        t: 'crit',
        h: `โหมด "ไม่รวมเงินแผ่นดิน": หน่วยนี้ยังไม่มีจุดคุ้มทุน — สะท้อนการพึ่งพางบแผ่นดินสูง ควรวางแผนเพิ่มรายได้ค่าธรรมเนียม/แหล่งทุนภายนอก`,
      });
    } else if (resWithoutGov.qStar !== null && q < resWithoutGov.qStar) {
      P.push({
        t: 'crit',
        h: `โหมด "ไม่รวมเงินแผ่นดิน": ต้องการ ${fmtInt(resWithoutGov.qStar)} คน จึงคุ้มทุนได้ด้วยตัวเอง — สะท้อนการพึ่งพางบแผ่นดินสูง`,
      });
    }
  }

  const stateShare = st + own > 0 ? st / (st + own) : 0;
  const uniAtc = uniRes.atc ?? 0;
  const atc = res.atc ?? 0;

  const E: Rec[] = [];

  E.push({
    t: stateShare >= 0.4 ? 'warn' : 'info',
    h: `พึ่งพางบประมาณเงินแผ่นดิน ${(stateShare * 100).toFixed(0)}% ของรายได้ — ${
      stateShare >= 0.5
        ? 'สัดส่วนสูงมาก ควรเร่งกระจายความเสี่ยงด้านรายได้'
        : stateShare >= 0.4
          ? 'สัดส่วนค่อนข้างสูง ควรติดตามใกล้ชิด'
          : 'อยู่ในระดับบริหารจัดการได้'
    }`,
  });

  if (status === 'ok' && res.profit > 0) {
    E.push({
      t: 'ok',
      h: `เป็นหน่วยที่สร้างส่วนเกิน (+${fmtMillion(res.profit)} ลบ.) — พิจารณาให้ช่วยอุ้มหลักสูตรเชิงยุทธศาสตร์ที่จำเป็นแต่ยังไม่คุ้มทุน (cross-subsidy) โดยกำหนดเพดานและตัวชี้วัดชัดเจน`,
    });
  } else {
    E.push({
      t: 'crit',
      h: `หน่วยนี้ขาดทุน (${fmtMillion(res.profit)} ลบ.) — ระดับคณะ/มหาวิทยาลัยควรตัดสินใจเชิงพอร์ต: สนับสนุนต่อ (หากเป็นพันธกิจ/ยุทธศาสตร์), ปรับโครงสร้าง หรือควบรวม`,
    });
  }

  E.push({
    t: 'info',
    h: `ต้นทุนต่อหัว ${fmtInt(atc)} บ. ${atc > uniAtc ? 'สูงกว่า' : 'ต่ำกว่า'}ค่าเฉลี่ยมหาวิทยาลัย (${fmtInt(uniAtc)}) — ${
      q < 800
        ? 'หน่วยขนาดเล็กทำให้ต้นทุนคงที่เฉลี่ยต่อหัวสูง ควรใช้ทรัพยากร/รวมชั้นเรียนข้ามหลักสูตร'
        : 'ขนาดอยู่ในเกณฑ์ที่ได้ประโยชน์จากการประหยัดต่อขนาด'
    }`,
  });

  E.push({
    t: 'warn',
    h: `ใช้ตัวเลข "ไม่รวมเงินแผ่นดิน" เป็นเกณฑ์ความยั่งยืนระยะยาว และเตรียมแผนรองรับกรณีถูกปรับลดงบอุดหนุน`,
  });

  return { prog: P, exec: E };
};

const BreakEvenChart = () => {
  const [level, setLevel] = useState<AnalysisLevel>('prog');
  const [facIdx, setFacIdx] = useState(0);
  const [lvl, setLvl] = useState<string>('');
  const [progIdx, setProgIdx] = useState(0);
  const [mode] = useState<RevenueMode>('with_government');

  const fac = RAW.FACS[facIdx] ?? RAW.FACS[0]!;
  const levels = useMemo(() => facLevels(fac.name), [fac.name]);
  const effectiveLvl = lvl && levels.includes(lvl) ? lvl : (levels[0] ?? '');
  const progsInLevel = useMemo(
    () => RAW.PROGS.filter((p) => p.fac === fac.name && p.lvl === effectiveLvl),
    [fac.name, effectiveLvl],
  );

  const entity = useMemo(
    () => buildEntity(level, facIdx, effectiveLvl, progIdx, mode),
    [level, facIdx, effectiveLvl, progIdx, mode],
  );
  const uniRes = useMemo(() => computeBreakEven(RAW.UNI, mode), [mode]);

  const { res, name, q } = entity;
  const r = res.r ?? 0;
  const avc = res.avc ?? 0;
  const tfc = res.tfc;
  const qStar = res.qStar;
  const xmax = Math.max(q, qStar ?? 0) * 1.35 || 100;

  const chartOptions: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false }, parentHeightOffset: 0 },
    colors: [
      'var(--mui-palette-primary-main)',
      'var(--mui-palette-error-main)',
      'var(--mui-palette-warning-main)',
      'var(--mui-palette-success-main)',
      'var(--mui-palette-text-primary)',
    ],
    stroke: { width: [2.5, 2.5, 1.5, 0, 0], dashArray: [0, 0, 6, 0, 0], curve: 'straight' },
    markers: { size: [0, 0, 0, 7, 7], strokeWidth: 2 },
    legend: { show: true, position: 'top', horizontalAlign: 'left' },
    grid: { borderColor: 'var(--mui-palette-divider)' },
    xaxis: { type: 'numeric', min: 0, max: xmax, title: { text: 'จำนวนนิสิต (คน)' } },
    yaxis: {
      title: { text: 'มูลค่า (ล้านบาท)' },
      labels: {
        formatter: (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 1 }),
      },
    },
    tooltip: {
      x: { formatter: (v: number) => `นิสิต ${fmtInt(v)} คน` },
      y: { formatter: (v: number) => `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ลบ.` },
    },
  };

  const chartSeries = [
    { name: 'รายได้รวม (TR)', type: 'line', data: [[0, 0], [xmax, (r * xmax) / 1e6]] },
    { name: 'ต้นทุนรวม (TC)', type: 'line', data: [[0, tfc / 1e6], [xmax, (tfc + avc * xmax) / 1e6]] },
    { name: 'ต้นทุนคงที่ (TFC)', type: 'line', data: [[0, tfc / 1e6], [xmax, tfc / 1e6]] },
    {
      name: 'จุดคุ้มทุน',
      type: 'scatter',
      data: qStar !== null ? [[qStar, (r * qStar) / 1e6]] : [],
    },
    { name: 'ปัจจุบัน', type: 'scatter', data: [[q, (r * q) / 1e6]] },
  ];

  const status = statusOf(res);
  const need = qStar !== null && q < qStar ? qStar - q : 0;

  const { prog: progRecs, exec: execRecs } = useMemo(
    () => buildRecommendations(entity, mode, uniRes),
    [entity, mode, uniRes],
  );

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4">กราฟจุดคุ้มทุน</Typography>
        <Typography variant="body2" color="text.secondary">
          เส้นรายได้รวม (TR) และต้นทุนรวม (TC) ตามจำนวนนิสิต จุดตัดคือจุดคุ้มทุน (Q*)
        </Typography>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>หน่วยวิเคราะห์</InputLabel>
            <Select
              label="หน่วยวิเคราะห์"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <MenuItem value="uni">มหาวิทยาลัย (รวม)</MenuItem>
              <MenuItem value="fac">รายคณะ</MenuItem>
              <MenuItem value="dep">คณะ × ระดับการศึกษา</MenuItem>
              <MenuItem value="prog">รายหลักสูตร</MenuItem>
            </Select>
          </FormControl>

          {(level === 'fac' || level === 'dep' || level === 'prog') && (
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>คณะ</InputLabel>
              <Select
                label="คณะ"
                value={facIdx}
                onChange={(e) => {
                  setFacIdx(Number(e.target.value));
                  setLvl('');
                  setProgIdx(0);
                }}
              >
                {RAW.FACS.map((f, i) => (
                  <MenuItem key={f.name} value={i}>
                    {f.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {(level === 'dep' || level === 'prog') && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>ระดับการศึกษา</InputLabel>
              <Select
                label="ระดับการศึกษา"
                value={effectiveLvl}
                onChange={(e) => {
                  setLvl(e.target.value);
                  setProgIdx(0);
                }}
              >
                {levels.map((l) => (
                  <MenuItem key={l} value={l}>
                    {l}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {level === 'prog' && (
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>หลักสูตร</InputLabel>
              <Select label="หลักสูตร" value={progIdx} onChange={(e) => setProgIdx(Number(e.target.value))}>
                {progsInLevel.map((p, i) => (
                  <MenuItem key={p.prog} value={i}>
                    {p.prog}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        {[
          ['นิสิตปัจจุบัน (Q)', `${fmtInt(q)} คน`],
          ['จุดคุ้มทุน (Q*)', qStar !== null ? `${fmtInt(qStar)} คน` : 'ไม่มี'],
          ['รายได้/หัว (R)', `${fmtInt(res.r)} บาท`],
          ['ต้นทุนผันแปร/หัว (AVC)', `${fmtInt(res.avc)} บาท`],
          ['กำไรส่วนเกิน/หัว (R−AVC)', `${fmtInt(r - avc)} บาท`],
          [
            'ส่วนเกิน/ขาดทุน',
            `${res.profit >= 0 ? '+' : '−'}${fmtMillion(Math.abs(res.profit))} ลบ.`,
          ],
        ].map(([label, value]) => (
          <Grid key={label} size={{ xs: 6, sm: 4, md: 2 }}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h6" fontWeight={700} className="num">
                  {value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardHeader title="แผนภาพจุดคุ้มทุน (Break-Even Chart)" />
            <CardContent>
              <AppReactApexCharts type="line" height={380} width="100%" options={chartOptions} series={chartSeries} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="สรุปการวิเคราะห์" action={<Chip size="small" label={STATUS_LABEL[status]} color={STATUS_COLOR[status]} />} />
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                {name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.9 }}>
                หน่วยนี้มีนิสิต <b>{fmtInt(q)}</b> คน ต้นทุนคงที่ (TFC) <b>{fmtMillion(tfc)}</b> ลบ. ต้นทุนผันแปรต่อหัว
                (AVC) <b>{fmtInt(avc)}</b> บาท และรายได้ต่อหัว (R) <b>{fmtInt(r)}</b> บาท
                <br />
                <br />
                {status === 'fcr' || status === 'none' ? (
                  <>
                    รายรับต่อหัวต่ำกว่าต้นทุนผันแปรต่อหัว จึงไม่มีจุดคุ้มทุน ณ ระดับราคาปัจจุบัน ต้องปรับค่าธรรมเนียมหรือลดต้นทุนผันแปร
                  </>
                ) : status === 'ok' ? (
                  <>
                    จำนวนนิสิตปัจจุบัน ({fmtInt(q)}) มากกว่าจุดคุ้มทุน ({fmtInt(qStar)}) อยู่ <b>{fmtInt(q - (qStar ?? 0))}</b>{' '}
                    คน สร้างส่วนเกิน <b>{fmtMillion(res.profit)}</b> ลบ.
                  </>
                ) : (
                  <>
                    ต้องเพิ่มนิสิตอีก <b>{fmtInt(need)}</b> คน (จาก {fmtInt(q)} เป็น {fmtInt(qStar)}) หรือลดต้นทุน/เพิ่มค่าธรรมเนียม
                    จึงจะถึงจุดคุ้มทุน
                  </>
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <RecommendationCard title="🎓 ข้อเสนอแนะ — ผู้บริหารหลักสูตร" subtitle="เชิงปฏิบัติการ ระดับหลักสูตร/หน่วยที่เลือก" items={progRecs} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <RecommendationCard
            title="🏛️ ข้อเสนอแนะ — ผู้บริหารคณะ / มหาวิทยาลัย"
            subtitle="เชิงกลยุทธ์ ระดับพอร์ตหลักสูตรและงบประมาณ"
            items={execRecs}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

const RecommendationCard = ({ title, subtitle, items }: { title: string; subtitle: string; items: Rec[] }) => (
  <Card sx={{ height: '100%' }}>
    <CardHeader title={title} subheader={subtitle} />
    <CardContent sx={{ pt: 0 }}>
      <List dense disablePadding>
        {items.map((item, i) => (
          <ListItem key={i} disableGutters alignItems="flex-start">
            <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
              <i className={SEVERITY_ICON[item.t]} style={{ color: SEVERITY_COLOR[item.t] }} />
            </ListItemIcon>
            <ListItemText primary={<Typography variant="body2">{item.h}</Typography>} />
          </ListItem>
        ))}
      </List>
    </CardContent>
  </Card>
);

export default BreakEvenChart;
