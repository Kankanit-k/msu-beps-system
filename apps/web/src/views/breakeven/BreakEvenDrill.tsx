'use client';

// React Imports
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

// Type Imports
import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { DotTitle } from '@components/ChartBits';
import DataCaveatNotes, { SHOW_BREAKEVEN_NOTES } from '@components/DataCaveatNotes';
import KpiCard from '@components/KpiCard';
import NoteBar from '@components/NoteBar';
import PageHeaderBar from '@components/PageHeaderBar';
import { gridTableSx } from '@views/scenario-program/CostBlockTable';

// Hook Imports
import { lockedFacultyFor } from '@/configs/accessControl';
import { useRole } from '@/hooks/useRole';

// Util Imports
import { downloadCsv } from '@/utils/csv';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import type { DeptRow, FacRow, ProgRow } from '@/data/mockup';
import {
  computeBreakEven,
  fmtInt,
  fmtMillion,
  inLevel,
  LEVEL_SCOPE_LABEL,
  sumRows,
  type LevelScope,
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
  { value: 'fcr', label: 'รายได้/หัว ≤ ผันแปร/หัว' },
];

/** ป้ายสถานะในตาราง — ใช้คำสั้นแบบ .st-badge ของ mockup (ต่างจาก STATUS_LABEL ที่ใช้ในการ์ดสรุป W3) */
const BADGE_LABEL: Record<BEStatus, string> = {
  ok: 'คุ้มทุน',
  loss: 'ยังไม่คุ้ม',
  fcr: 'รายได้/หัว ≤ ผันแปร/หัว',
  none: 'ไม่มีข้อมูล',
};

const BADGE_COLOR: Record<BEStatus, 'success' | 'error' | 'warning' | 'default'> = {
  ok: 'success',
  loss: 'error',
  fcr: 'warning',
  none: 'default',
};

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
  // ระหว่างค้นหา/กรอง ทุกแถวเปิดเป็นค่าเริ่มต้น — เก็บเฉพาะแถวที่ผู้ใช้ย่อเอง (ล้างเมื่อเปลี่ยนคำค้น/ตัวกรอง)
  const [collapsedFac, setCollapsedFac] = useState<Record<string, boolean>>({});
  const [collapsedDept, setCollapsedDept] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<QuickFilter>('all');

  // ผู้ดูแลคณะ/อาจารย์ เห็นเฉพาะคณะของตัวเอง
  const { role, scope: roleScope } = useRole();
  const lockedFac = lockedFacultyFor(role, roleScope);
  const [level, setLevel] = useState<LevelScope>('all');

  // ระดับปริญญาตรี vs ที่เหลือ (บัณฑิตศึกษา/ประกาศนียบัตร) — แบ่งแบบเดียวกับ inLevel
  const depts = useMemo(
    () =>
      RAW.DEPTS.filter(
        (d) =>
          (!lockedFac || d.fac === lockedFac) &&
          (level === 'all' || (level === 'ug') === (d.grp === 'ปริญญาตรี')),
      ),
    [lockedFac, level],
  );
  const facs = useMemo(
    () =>
      RAW.FACS.filter(
        (f) => (!lockedFac || f.name === lockedFac) && depts.some((d) => d.fac === f.name),
      ),
    [lockedFac, depts],
  );
  const progs = useMemo(
    () => RAW.PROGS.filter((p) => (!lockedFac || p.fac === lockedFac) && inLevel(p, level)),
    [lockedFac, level],
  );
  /** แถวคณะ — ทุกระดับใช้ตัวเลขคณะตามชีต · เลือกระดับแล้วรวมเฉพาะระดับนั้น */
  const facRow = (f: FacRow) =>
    level === 'all' ? f : sumRows(depts.filter((d) => d.fac === f.name));

  const searchTerm = search.trim().toLowerCase();
  const filtering = !!searchTerm || filter !== 'all';

  // ส่วนเกิน/นิสิตระดับมหาวิทยาลัย — ใช้กับชิปบนหัวหน้าจอและแถบข้อจำกัดข้อมูล (เหมือนหน้าอื่น)
  const uniRes = useMemo(() => computeBreakEven(RAW.UNI, mode), [mode]);
  const headRes = useMemo(
    () =>
      level !== 'all'
        ? computeBreakEven(sumRows(depts), mode)
        : lockedFac && facs[0]
          ? computeBreakEven(facs[0], mode)
          : uniRes,
    [level, depts, facs, lockedFac, mode, uniRes],
  );

  /** ผลคำนวณรายหลักสูตรครั้งเดียว — ใช้ทั้ง KPI, ต้นไม้ และประเด็นสำคัญ */
  const progStats = useMemo(() => {
    const map = new Map<ProgRow, { res: ReturnType<typeof computeBreakEven>; status: BEStatus }>();

    progs.forEach((p) => {
      const res = computeBreakEven(p, mode);

      map.set(p, { res, status: statusOf(res) });
    });

    return map;
  }, [mode, progs]);

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

    facs.forEach((f: FacRow) => {
      const facProgStatuses = progs
        .filter((p) => p.fac === f.name)
        .map((p) => ({
          p,
          status: progStats.get(p)!.status,
        }));

      const hitProgs = filtering
        ? facProgStatuses.filter(({ p, status }) => progHit(p, status))
        : facProgStatuses;

      if (filtering && hitProgs.length === 0) return;
      shownFacsN++;

      // ล็อกคณะเดียว → เปิดแถวคณะไว้ตั้งแต่แรก (ย่อเองได้)
      const facOpenByDefault = filtering || !!lockedFac;
      const facOpen = facOpenByDefault ? !collapsedFac[f.name] : !!expandedFac[f.name];
      const facRes = computeBreakEven(facRow(f), mode);

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
        onToggle: () =>
          (facOpenByDefault ? setCollapsedFac : setExpandedFac)((s) => ({
            ...s,
            [f.name]: !s[f.name],
          })),
      });

      if (!facOpen) {
        shownProgsN += hitProgs.length;

        return;
      }

      depts
        .filter((d: DeptRow) => d.fac === f.name)
        .forEach((d) => {
          const key = `${f.name}||${d.grp}`;
          const depProgs = facProgStatuses.filter(({ p }) => p.grp === d.grp);
          const depHits = filtering
            ? depProgs.filter(({ p, status }) => progHit(p, status))
            : depProgs;

          if (filtering && depHits.length === 0) return;

          const depOpen = filtering ? !collapsedDept[key] : !!expandedDept[key];
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
            onToggle: () =>
              (filtering ? setCollapsedDept : setExpandedDept)((s) => ({ ...s, [key]: !s[key] })),
          });

          if (!depOpen) {
            shownProgsN += depHits.length;

            return;
          }

          depHits.forEach(({ p, status }) => {
            shownProgsN++;
            const pRes = progStats.get(p)!.res;

            out.push({
              key: `prog-${RAW.PROGS.indexOf(p)}`,
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
  }, [
    mode,
    lockedFac,
    level,
    depts,
    facs,
    progs,
    progStats,
    expandedFac,
    expandedDept,
    collapsedFac,
    collapsedDept,
    searchTerm,
    filter,
    filtering,
  ]);

  // ===== ประเด็นสำคัญ (ตรงกับ be-ins ของ mockup) =====
  const insights = useMemo(() => {
    type Insight = { sev: 'success' | 'warning' | 'error' | 'info'; text: ReactNode };
    const list: Insight[] = [];
    const entries = progs.map((p) => ({ p, ...progStats.get(p)! }));

    list.push({
      sev: counts.ok >= counts.loss + counts.fcrOrNone ? 'success' : 'warning',
      text: (
        <>
          จาก {progs.length} หลักสูตร มี <b>{fmtInt(counts.ok)}</b> หลักสูตรที่คุ้มทุนแล้ว,{' '}
          <b>{fmtInt(counts.loss)}</b> ยังไม่ถึงจุดคุ้มทุน และ <b>{fmtInt(counts.fcrOrNone)}</b>{' '}
          หลักสูตรที่รายได้ต่อหัวต่ำกว่าต้นทุนผันแปรต่อหัว (ไม่มีจุดคุ้มทุน ณ ราคาปัจจุบัน)
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
            {worst.map((e, i) => (
              <span key={e.p.prog}>
                {i > 0 && ', '}
                <b>{e.p.prog}</b> (−{fmtMillion(Math.abs(e.res.profit))} ลบ.)
              </span>
            ))}
          </>
        ),
      });
    }

    return list;
  }, [progs, progStats, counts]);

  const allOpen = () => {
    const fac: Record<string, boolean> = {};
    const dep: Record<string, boolean> = {};

    facs.forEach((f) => (fac[f.name] = true));
    depts.forEach((d) => (dep[`${d.fac}||${d.grp}`] = true));

    return { fac, dep };
  };
  const expandAll = () => {
    const { fac, dep } = allOpen();

    setExpandedFac(fac);
    setExpandedDept(dep);
    setCollapsedFac({});
    setCollapsedDept({});
  };
  const collapseAll = () => {
    const { fac, dep } = allOpen();

    setExpandedFac({});
    setExpandedDept({});
    setCollapsedFac(fac);
    setCollapsedDept(dep);
  };
  const resetCollapsed = () => {
    setCollapsedFac({});
    setCollapsedDept({});
  };
  const clearFilters = () => {
    setSearch('');
    setFilter('all');
    resetCollapsed();
  };

  const scopeLabel = [lockedFac ?? 'ทุกคณะ', level !== 'all' && LEVEL_SCOPE_LABEL[level]]
    .filter(Boolean)
    .join('-');

  /** ส่งออกทั้งต้นไม้ (คณะ → ระดับ → หลักสูตร) ตามคณะ/ระดับที่เลือก ไม่ขึ้นกับแถวที่ขยายอยู่ */
  const exportExcel = () => {
    const line = (
      fac: string,
      grp: string,
      prog: string,
      res: ReturnType<typeof computeBreakEven>,
    ) => [
      fac,
      grp,
      prog,
      Math.round(res.q),
      res.qStar === null ? '' : Math.round(res.qStar),
      res.r === null ? '' : Math.round(res.r),
      res.avc === null ? '' : Math.round(res.avc),
      +(res.tr / 1e6).toFixed(2),
      +(res.profit / 1e6).toFixed(2),
      BADGE_LABEL[statusOf(res)],
    ];
    const out: (string | number)[][] = [
      [
        'คณะ',
        'ระดับ',
        'หลักสูตร',
        'นิสิต (Q)',
        'จุดคุ้มทุน (Q*)',
        'รายได้/หัว (R)',
        'ผันแปร/หัว (AVC)',
        'รายได้รวม (ลบ.)',
        'ส่วนเกิน (ลบ.)',
        'สถานะ',
      ],
    ];

    facs.forEach((f) => {
      out.push(line(f.name, '', '', computeBreakEven(facRow(f), mode)));
      depts
        .filter((d) => d.fac === f.name)
        .forEach((d) => {
          out.push(line(f.name, d.grp, '', computeBreakEven(d, mode)));
          progs
            .filter((p) => p.fac === f.name && p.grp === d.grp)
            .forEach((p) => out.push(line(f.name, d.grp, p.prog, progStats.get(p)!.res)));
        });
    });

    downloadCsv(`จุดคุ้มทุน-${scopeLabel}`, out);
  };

  return (
    <Box>
      <PageHeaderBar
        title="จุดคุ้มทุน: คณะ · ระดับ · หลักสูตร"
        mode={mode}
        onModeChange={setMode}
        q={headRes.q}
        profit={headRes.profit}
      />

      {SHOW_BREAKEVEN_NOTES && (
        <>
          <DataCaveatNotes profit={uniRes.profit} />

          <NoteBar severity="info">{REVENUE_MODE_NOTE[mode]}</NoteBar>
        </>
      )}

      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          {lockedFac && (
            <Chip variant="outlined" icon={<i className="ri-lock-line" />} label={lockedFac} />
          )}
          <ToggleButtonGroup
            size="small"
            color="primary"
            exclusive
            value={level}
            onChange={(_, v: LevelScope | null) => {
              if (!v) return;
              setLevel(v);
              resetCollapsed();
            }}
          >
            {(Object.keys(LEVEL_SCOPE_LABEL) as LevelScope[]).map((l) => (
              <ToggleButton key={l} value={l}>
                {LEVEL_SCOPE_LABEL[l]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="body2" color="text.secondary">
            {lockedFac
              ? `${fmtInt(progs.length)} หลักสูตรในคณะของคุณ`
              : `${fmtInt(progs.length)} หลักสูตร · ${facs.length} คณะ`}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<i className="ri-download-2-line" />}
            onClick={exportExcel}
            disabled={facs.length === 0}
            sx={{ marginInlineStart: 'auto' }}
          >
            ส่งออก Excel
          </Button>
        </CardContent>
      </Card>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="หลักสูตรคุ้มทุน (นิสิตถึงจุดคุ้มทุน)"
            value={fmtInt(counts.ok)}
            unit={`จาก ${progs.length} หลักสูตร`}
            accent="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="หลักสูตรยังไม่คุ้มทุน"
            value={fmtInt(counts.loss + counts.fcrOrNone)}
            unit="นิสิตไม่ถึงจุดคุ้มทุน หรือ รายได้/หัว ≤ ผันแปร/หัว"
            accent="error"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="หลักสูตรรายได้/หัว ≤ ผันแปร/หัว"
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
            onChange={(e) => {
              setSearch(e.target.value);
              resetCollapsed();
            }}
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
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearch('');
                        resetCollapsed();
                      }}
                      title="ล้างคำค้นหา"
                    >
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
                : `${progs.length} หลักสูตร · ${facs.length} คณะ`
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
                onClick={() => {
                  setFilter(qf.value);
                  resetCollapsed();
                }}
              />
            ))}
          </Box>
          {filtering && (
            <Button
              size="small"
              variant="text"
              color="secondary"
              startIcon={<i className="ri-close-line" />}
              onClick={clearFilters}
            >
              ล้างตัวกรอง
            </Button>
          )}
        </Box>
        <CardContent>
          <TableContainer>
            <Table
              size="small"
              sx={{
                minWidth: 1000,
                ...gridTableSx,
                // ธีมตัดเส้นล่างของแถวสุดท้าย — ตารางนี้ตีเส้นทุกช่องจึงใส่คืน
                '& tbody tr:last-child td': { borderBottom: 1, borderColor: 'divider' },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 260 }}>คณะ / ระดับ / หลักสูตร</TableCell>
                  {HEAD_CELLS.map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={HEAD_CELLS.length + 1} sx={{ py: 10, textAlign: 'center' }}>
                      <Typography color="text.secondary" sx={{ mb: 3 }}>
                        🔍 ไม่พบหลักสูตร
                        {searchTerm ? <>ที่ตรงกับ &quot;{search.trim()}&quot;</> : ''}
                        {filter !== 'all' ? `ในสถานะ "${BADGE_LABEL[filter]}"` : ''}
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<i className="ri-filter-off-line" />}
                        onClick={clearFilters}
                      >
                        ล้างตัวกรอง
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TreeRow key={r.key} row={r} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card sx={{ mt: 4, borderLeft: 4, borderLeftColor: 'primary.main' }}>
        <CardHeader
          title="ประเด็นสำคัญ — จุดคุ้มทุนรายหลักสูตร"
          titleTypographyProps={{ variant: 'h6', color: 'primary.dark' }}
        />
        <CardContent
          component="ul"
          sx={{
            m: 0,
            pt: 0,
            pl: 4,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          {insights.map((ins, i) => (
            <Box
              key={i}
              component="li"
              sx={{
                position: 'relative',
                pl: 4,
                '&::before': {
                  content: '"▸"',
                  position: 'absolute',
                  left: 0,
                  color: 'primary.main',
                },
              }}
            >
              <Typography variant="body2">{ins.text}</Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};

const HEAD_CELLS = [
  'นิสิต (คน)',
  'นิสิต ณ จุดคุ้มทุน (คน)',
  'รายได้/หัว (บาท)',
  'ผันแปร/หัว (บาท)',
  'รายได้รวม (ลบ.)',
  'ส่วนเกิน (ลบ.)',
  'สถานะ',
];

const NumCell = ({ value, color, bold }: { value: string; color?: string; bold?: boolean }) => (
  <TableCell align="right" className="num" sx={{ fontWeight: bold ? 700 : 400, color }}>
    {value}
  </TableCell>
);

const TreeRow = ({ row }: { row: Row }) => (
  <TableRow
    onClick={row.hasChildren ? row.onToggle : undefined}
    hover={row.hasChildren}
    sx={{
      cursor: row.hasChildren ? 'pointer' : 'default',
      // แถวคณะพื้นฟ้าอ่อน เหมือนแถวหมวดหลักในตารางทดลองปรับ
      bgcolor: row.level === 0 ? (t) => alpha(t.palette.primary.main, 0.05) : undefined,
    }}
  >
    <TableCell>
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
    </TableCell>
    <NumCell value={fmtInt(row.q)} bold={row.level === 0} />
    <NumCell
      value={row.qStar !== null ? fmtInt(row.qStar) : '—'}
      color="var(--mui-palette-primary-main)"
    />
    <NumCell value={row.r !== null ? fmtInt(row.r) : '—'} />
    <NumCell value={row.avc !== null ? fmtInt(row.avc) : '—'} />
    <NumCell value={fmtMillion(row.tr)} />
    <NumCell
      value={`${row.profit >= 0 ? '+' : '−'}${fmtMillion(Math.abs(row.profit))}`}
      color={row.profit >= 0 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)'}
      bold
    />
    <TableCell align="center">
      <Chip
        size="small"
        variant="tonal"
        label={BADGE_LABEL[row.status]}
        color={BADGE_COLOR[row.status]}
      />
    </TableCell>
  </TableRow>
);

export default BreakEvenDrill;
