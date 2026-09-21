'use client';

// React Imports
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// Type Imports
import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { DotTitle } from '@components/ChartBits';
import DataCaveatNotes from '@components/DataCaveatNotes';
import KpiCard from '@components/KpiCard';
import NoteBar from '@components/NoteBar';
import PageHeaderBar from '@components/PageHeaderBar';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import type { DeptRow, FacRow, ProgRow } from '@/data/mockup';
import {
  computeBreakEven,
  fmtInt,
  fmtMillion,
  REVENUE_MODE_NOTE,
  shortFacName,
  statusOf,
  type BEStatus,
} from '@views/breakeven/calc';

type QuickFilter = 'all' | BEStatus;

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'ok', label: 'คุ้มทุน' },
  { value: 'loss', label: 'ยังไม่คุ้ม' },
  { value: 'fcr', label: 'R ≤ AVC' },
];

/** ป้ายสถานะในตาราง — ใช้คำสั้นแบบ .st-badge ของ mockup (ต่างจาก STATUS_LABEL ที่ใช้ในการ์ดสรุป W3) */
const BADGE_LABEL: Record<BEStatus, string> = {
  ok: 'คุ้มทุน',
  loss: 'ยังไม่คุ้ม',
  fcr: 'R≤AVC',
  none: 'ไม่มีข้อมูล',
};

const BADGE_COLOR: Record<BEStatus, 'success' | 'error' | 'warning' | 'default'> = {
  ok: 'success',
  loss: 'error',
  fcr: 'warning',
  none: 'default',
};

/** ความกว้างคอลัมน์ของหัวตารางและทุกแถว — ต้องตรงกันเป๊ะ จึงประกาศที่เดียว */
const GRID_COLS = 'minmax(220px,2fr) repeat(6, minmax(78px,1fr)) minmax(86px,0.9fr)';

const norm = (s: string) => s.toLowerCase();

type Row = {
  key: string;
  level: 0 | 1 | 2;
  label: string;
  sub?: string;
  q: number;
  qStar: number | null;
  r: number | null;
  avc: number | null;
  tr: number;
  profit: number;
  status: BEStatus;
  hasChildren: boolean;
  open?: boolean;
  onToggle?: () => void;
};

const BreakEvenDrill = () => {
  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [expandedFac, setExpandedFac] = useState<Record<string, boolean>>({});
  const [expandedDept, setExpandedDept] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<QuickFilter>('all');

  const searchTerm = search.trim().toLowerCase();
  const filtering = !!searchTerm || filter !== 'all';

  // ส่วนเกิน/นิสิตระดับมหาวิทยาลัย — ใช้กับชิปบนหัวหน้าจอและแถบข้อจำกัดข้อมูล (เหมือนหน้าอื่น)
  const uniRes = useMemo(() => computeBreakEven(RAW.UNI, mode), [mode]);

  /** ผลคำนวณรายหลักสูตรครั้งเดียว — ใช้ทั้ง KPI, ต้นไม้ และประเด็นสำคัญ */
  const progStats = useMemo(() => {
    const map = new Map<ProgRow, { res: ReturnType<typeof computeBreakEven>; status: BEStatus }>();

    RAW.PROGS.forEach((p) => {
      const res = computeBreakEven(p, mode);

      map.set(p, { res, status: statusOf(res) });
    });

    return map;
  }, [mode]);

  const { counts, totalSurplus } = useMemo(() => {
    let ok = 0;
    let loss = 0;
    let fcrOrNone = 0;
    let surplus = 0;

    progStats.forEach(({ res, status }) => {
      if (status === 'ok') ok++;
      else if (status === 'loss') loss++;
      else fcrOrNone++;
      surplus += res.profit;
    });

    return { counts: { ok, loss, fcrOrNone }, totalSurplus: surplus };
  }, [progStats]);

  const progHit = (p: ProgRow, status: BEStatus) => {
    const text =
      !searchTerm ||
      norm(p.prog).includes(searchTerm) ||
      norm(p.deg || '').includes(searchTerm) ||
      norm(p.fac).includes(searchTerm) ||
      norm(p.lvl).includes(searchTerm) ||
      norm(p.grp).includes(searchTerm);
    const statusHit = filter === 'all' || filter === status;

    return text && statusHit;
  };

  const { rows, shownProgs, shownFacs } = useMemo(() => {
    const out: Row[] = [];
    let shownProgsN = 0;
    let shownFacsN = 0;

    RAW.FACS.forEach((f: FacRow) => {
      const facProgStatuses = RAW.PROGS.filter((p) => p.fac === f.name).map((p) => ({
        p,
        status: progStats.get(p)!.status,
      }));

      const hitProgs = filtering
        ? facProgStatuses.filter(({ p, status }) => progHit(p, status))
        : facProgStatuses;

      if (filtering && hitProgs.length === 0) return;
      shownFacsN++;

      const facOpen = filtering ? true : !!expandedFac[f.name];
      const facRes = computeBreakEven(f, mode);

      out.push({
        key: `fac-${f.name}`,
        level: 0,
        label: f.name,
        q: facRes.q,
        qStar: facRes.qStar,
        r: facRes.r,
        avc: facRes.avc,
        tr: facRes.tr,
        profit: facRes.profit,
        status: statusOf(facRes),
        hasChildren: true,
        open: facOpen,
        onToggle: () => setExpandedFac((s) => ({ ...s, [f.name]: !s[f.name] })),
      });

      if (!facOpen) {
        shownProgsN += hitProgs.length;

        return;
      }

      RAW.DEPTS.filter((d: DeptRow) => d.fac === f.name).forEach((d) => {
        const key = `${f.name}||${d.grp}`;
        const depProgs = facProgStatuses.filter(({ p }) => p.grp === d.grp);
        const depHits = filtering
          ? depProgs.filter(({ p, status }) => progHit(p, status))
          : depProgs;

        if (filtering && depHits.length === 0) return;

        const depOpen = filtering ? true : !!expandedDept[key];
        const depRes = computeBreakEven(d, mode);

        out.push({
          key: `dep-${key}`,
          level: 1,
          label: `📚 ${d.grp}`,
          sub: `${filtering ? `${depHits.length} / ` : ''}${d.n} หลักสูตร`,
          q: depRes.q,
          qStar: depRes.qStar,
          r: depRes.r,
          avc: depRes.avc,
          tr: depRes.tr,
          profit: depRes.profit,
          status: statusOf(depRes),
          hasChildren: true,
          open: depOpen,
          onToggle: () => setExpandedDept((s) => ({ ...s, [key]: !s[key] })),
        });

        if (!depOpen) {
          shownProgsN += depHits.length;

          return;
        }

        depHits.forEach(({ p, status }) => {
          shownProgsN++;
          const pRes = progStats.get(p)!.res;

          out.push({
            key: `prog-${f.name}-${d.grp}-${p.prog}`,
            level: 2,
            label: p.prog,
            sub: p.lvl,
            q: pRes.q,
            qStar: pRes.qStar,
            r: pRes.r,
            avc: pRes.avc,
            tr: pRes.tr,
            profit: pRes.profit,
            status,
            hasChildren: false,
          });
        });
      });
    });

    return { rows: out, shownProgs: shownProgsN, shownFacs: shownFacsN };
  }, [mode, progStats, expandedFac, expandedDept, searchTerm, filter, filtering]);

  // ===== ประเด็นสำคัญ (ตรงกับ be-ins ของ mockup) =====
  const insights = useMemo(() => {
    type Insight = { sev: 'success' | 'warning' | 'error' | 'info'; text: ReactNode };
    const list: Insight[] = [];
    const entries = RAW.PROGS.map((p) => ({ p, ...progStats.get(p)! }));

    list.push({
      sev: counts.ok >= counts.loss + counts.fcrOrNone ? 'success' : 'warning',
      text: (
        <>
          จาก {RAW.PROGS.length} หลักสูตร มี <b>{fmtInt(counts.ok)}</b> หลักสูตรที่คุ้มทุนแล้ว,{' '}
          <b>{fmtInt(counts.loss)}</b> ยังไม่ถึงจุดคุ้มทุน และ <b>{fmtInt(counts.fcrOrNone)}</b>{' '}
          หลักสูตรที่ R ≤ AVC (ไม่มีจุดคุ้มทุน ณ ราคาปัจจุบัน)
        </>
      ),
    });

    const gap = entries
      .filter((e) => e.status === 'loss' && e.res.qStar !== null)
      .sort((a, b) => b.res.qStar! - b.res.q - (a.res.qStar! - a.res.q))[0];

    if (gap) {
      list.push({
        sev: 'warning',
        text: (
          <>
            หลักสูตรที่ต้องเพิ่มนิสิตมากสุดเพื่อคุ้มทุน: <b>{gap.p.prog}</b> (
            {shortFacName(gap.p.fac)}) ปัจจุบัน {fmtInt(gap.res.q)} คน ต้องการ{' '}
            {fmtInt(gap.res.qStar)} คน — ขาดอีก <b>{fmtInt(gap.res.qStar! - gap.res.q)} คน</b>
          </>
        ),
      });
    }

    const worst = entries
      .filter((e) => e.status !== 'ok')
      .sort((a, b) => a.res.profit - b.res.profit)
      .slice(0, 3);

    if (worst.length) {
      list.push({
        sev: 'error',
        text: (
          <>
            หลักสูตรขาดทุนสูงสุด:{' '}
            {worst
              .map((e) => `${e.p.prog} (−${fmtMillion(Math.abs(e.res.profit))} ลบ.)`)
              .join(', ')}
          </>
        ),
      });
    }

    return list;
  }, [progStats, counts]);

  const expandAll = () => {
    const fac: Record<string, boolean> = {};
    const dep: Record<string, boolean> = {};

    RAW.FACS.forEach((f) => (fac[f.name] = true));
    RAW.DEPTS.forEach((d) => (dep[`${d.fac}||${d.grp}`] = true));
    setExpandedFac(fac);
    setExpandedDept(dep);
  };
  const collapseAll = () => {
    setExpandedFac({});
    setExpandedDept({});
  };

  return (
    <Box>
      <PageHeaderBar
        title="จุดคุ้มทุน: คณะ · ระดับ · หลักสูตร"
        code="W2"
        mode={mode}
        onModeChange={setMode}
        q={uniRes.q}
        profit={uniRes.profit}
      />

      <DataCaveatNotes profit={uniRes.profit} />

      <NoteBar severity="info">{REVENUE_MODE_NOTE[mode]}</NoteBar>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="หลักสูตรคุ้มทุน (Q ≥ Q*)"
            value={fmtInt(counts.ok)}
            unit={`จาก ${RAW.PROGS.length} หลักสูตร`}
            accent="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="หลักสูตรยังไม่คุ้มทุน"
            value={fmtInt(counts.loss + counts.fcrOrNone)}
            unit="Q < Q* หรือ R ≤ AVC"
            accent="error"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="หลักสูตร R ≤ AVC"
            value={fmtInt(counts.fcrOrNone)}
            unit="ไม่มีจุดคุ้มทุน (ผันแปรสูงกว่ารายรับ)"
            accent="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="ส่วนเกินรวมทั้งหมด"
            value={`${totalSurplus >= 0 ? '+' : '−'}${fmtMillion(Math.abs(totalSurplus))}`}
            unit="ล้านบาท (สุทธิ)"
            accent="success"
            valueColor={
              totalSurplus >= 0
                ? 'var(--mui-palette-success-main)'
                : 'var(--mui-palette-error-main)'
            }
          />
        </Grid>
      </Grid>

      <Card>
        <CardHeader
          title={<DotTitle color="primary.main">เจาะลึกจุดคุ้มทุน 3 ระดับ</DotTitle>}
          subheader="คลิกที่คณะเพื่อดูระดับการศึกษา และคลิกระดับเพื่อดูรายหลักสูตร · หรือพิมพ์ค้นหาด้านล่าง"
          action={
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button size="small" variant="outlined" color="secondary" onClick={expandAll}>
                ขยายทั้งหมด
              </Button>
              <Button size="small" variant="outlined" color="secondary" onClick={collapseAll}>
                ย่อทั้งหมด
              </Button>
            </Box>
          }
        />
        <Box
          sx={{
            px: 4,
            py: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            flexWrap: 'wrap',
            borderBlock: 1,
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          <TextField
            size="small"
            placeholder="ค้นหาคณะ / ระดับ / ชื่อหลักสูตร / ชื่อปริญญา..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 300, bgcolor: 'background.paper' }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <i className="ri-search-line" />
                  </InputAdornment>
                ),
                endAdornment: search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')} title="ล้างคำค้นหา">
                      <i className="ri-close-line" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Chip
            size="small"
            variant="tonal"
            color="secondary"
            label={
              filtering
                ? `พบ ${fmtInt(shownProgs)} หลักสูตร · ${fmtInt(shownFacs)} คณะ`
                : `${RAW.PROGS.length} หลักสูตร · ${RAW.FACS.length} คณะ`
            }
          />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {QUICK_FILTERS.map((qf) => (
              <Chip
                key={qf.value}
                size="small"
                label={qf.label}
                color={filter === qf.value ? 'primary' : 'secondary'}
                variant={filter === qf.value ? 'filled' : 'outlined'}
                onClick={() => setFilter(qf.value)}
              />
            ))}
          </Box>
        </Box>
        <Box sx={{ maxBlockSize: 640, overflow: 'auto' }}>
          <TreeHeader />
          {rows.length === 0 && (
            <Box sx={{ p: 10, textAlign: 'center' }}>
              <Typography color="text.secondary">
                🔍 ไม่พบข้อมูลที่ตรงกับ &quot;{search}&quot;
                {filter !== 'all' ? ' ในตัวกรองที่เลือก' : ''} — ลองคำอื่นหรือกดล้างคำค้นหา
              </Typography>
            </Box>
          )}
          {rows.map((r) => (
            <TreeRow key={r.key} row={r} />
          ))}
        </Box>
      </Card>

      <Card sx={{ mt: 4 }}>
        <CardHeader
          title={<DotTitle color="primary.main">ประเด็นสำคัญ — จุดคุ้มทุนรายหลักสูตร</DotTitle>}
        />
        <CardContent>
          <Stack spacing={2}>
            {insights.map((ins, i) => (
              <Alert key={i} severity={ins.sev} variant="outlined">
                {ins.text}
              </Alert>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

const HEAD_CELLS = [
  'นิสิต (Q)',
  'จุดคุ้มทุน Q*',
  'รายได้/หัว R',
  'AVC',
  'TR (ลบ.)',
  'ส่วนเกิน (ลบ.)',
  'สถานะ',
];

const TreeHeader = () => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: GRID_COLS,
      gap: 3,
      px: 4,
      py: 2.5,
      borderBlockEnd: 1,
      borderColor: 'divider',
      bgcolor: 'background.paper',
      position: 'sticky',
      insetBlockStart: 0,
      zIndex: 1,
    }}
  >
    <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700 }} color="text.secondary">
      คณะ / ระดับ / หลักสูตร
    </Typography>
    {HEAD_CELLS.map((h) => (
      <Typography
        key={h}
        sx={{ fontSize: '0.6875rem', fontWeight: 700 }}
        color="text.secondary"
        textAlign="right"
      >
        {h}
      </Typography>
    ))}
  </Box>
);

const NumCell = ({ value, color, bold }: { value: string; color?: string; bold?: boolean }) => (
  <Typography
    className="num"
    textAlign="right"
    sx={{ fontSize: '0.8125rem', fontWeight: bold ? 700 : 400, color }}
  >
    {value}
  </Typography>
);

const TreeRow = ({ row }: { row: Row }) => (
  <Box
    onClick={row.hasChildren ? row.onToggle : undefined}
    sx={{
      display: 'grid',
      gridTemplateColumns: GRID_COLS,
      alignItems: 'center',
      gap: 3,
      px: 4,
      py: 2,
      borderBlockEnd: 1,
      borderColor: 'divider',
      cursor: row.hasChildren ? 'pointer' : 'default',
      '&:hover': row.hasChildren ? { bgcolor: 'action.hover' } : undefined,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: row.level * 4 }}>
      <Box
        component="i"
        className="ri-arrow-right-s-line"
        sx={{
          fontSize: '1rem',
          color: 'text.disabled',
          visibility: row.hasChildren ? 'visible' : 'hidden',
          transition: 'transform .15s',
          transform: row.open ? 'rotate(90deg)' : 'none',
        }}
      />
      <Box sx={{ minInlineSize: 0 }}>
        <Typography
          title={row.label}
          noWrap
          sx={{
            fontSize: '0.8125rem',
            fontWeight: row.level === 0 ? 700 : row.level === 1 ? 600 : 400,
          }}
        >
          {row.label}
        </Typography>
        {row.sub && (
          <Typography sx={{ fontSize: '0.625rem' }} color="text.disabled">
            {row.sub}
          </Typography>
        )}
      </Box>
    </Box>
    <NumCell value={fmtInt(row.q)} />
    <NumCell value={row.qStar !== null ? fmtInt(row.qStar) : '—'} />
    <NumCell value={row.r !== null ? fmtInt(row.r) : '—'} />
    <NumCell
      value={row.avc !== null ? fmtInt(row.avc) : '—'}
      color="var(--mui-palette-text-disabled)"
    />
    <NumCell value={fmtMillion(row.tr)} />
    <NumCell
      value={`${row.profit >= 0 ? '+' : '−'}${fmtMillion(Math.abs(row.profit))}`}
      color={row.profit >= 0 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)'}
      bold
    />
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Chip
        size="small"
        variant="tonal"
        label={BADGE_LABEL[row.status]}
        color={BADGE_COLOR[row.status]}
      />
    </Box>
  </Box>
);

export default BreakEvenDrill;
