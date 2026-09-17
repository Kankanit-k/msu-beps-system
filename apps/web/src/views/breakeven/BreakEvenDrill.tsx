'use client';

// React Imports
import { useMemo, useState } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Divider from '@mui/material/Divider';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import type { DeptRow, FacRow, ProgRow } from '@/data/mockup';
import type { RevenueMode } from '@beps/calc-engine';
import {
  computeBreakEven,
  fmtInt,
  fmtMillion,
  REVENUE_MODE_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
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

  const { rows, shownProgs, shownFacs, counts, totalSurplus } = useMemo(() => {
    const out: Row[] = [];
    let shownProgsN = 0;
    let shownFacsN = 0;
    let ok = 0;
    let loss = 0;
    let fcrOrNone = 0;
    let surplus = 0;

    RAW.FACS.forEach((f: FacRow) => {
      const facProgs = RAW.PROGS.filter((p) => p.fac === f.name);
      const facProgStatuses = facProgs.map((p) => ({ p, status: statusOf(computeBreakEven(p, mode)) }));

      facProgStatuses.forEach(({ status }) => {
        if (status === 'ok') ok++;
        else if (status === 'loss') loss++;
        else fcrOrNone++;
      });
      facProgStatuses.forEach(({ p }) => {
        surplus += computeBreakEven(p, mode).profit;
      });

      const hitProgs = filtering ? facProgStatuses.filter(({ p, status }) => progHit(p, status)) : facProgStatuses;

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
        const depHits = filtering ? depProgs.filter(({ p, status }) => progHit(p, status)) : depProgs;

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
          const pRes = computeBreakEven(p, mode);

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

    return {
      rows: out,
      shownProgs: shownProgsN,
      shownFacs: shownFacsN,
      counts: { ok, loss, fcrOrNone },
      totalSurplus: surplus,
    };
  }, [mode, expandedFac, expandedDept, searchTerm, filter, filtering]);

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4">เจาะลึกจุดคุ้มทุน</Typography>
          <Typography variant="body2" color="text.secondary">
            คณะ · ระดับการศึกษา · หลักสูตร
          </Typography>
        </Box>
        <ToggleButtonGroup size="small" color="primary" exclusive value={mode} onChange={(_, v) => v && setMode(v)}>
          <ToggleButton value="with_government">{REVENUE_MODE_LABEL.with_government}</ToggleButton>
          <ToggleButton value="without_government">{REVENUE_MODE_LABEL.without_government}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard label="หลักสูตรคุ้มทุน (Q ≥ Q*)" value={fmtInt(counts.ok)} unit={`จาก ${RAW.PROGS.length} หลักสูตร`} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="หลักสูตรยังไม่คุ้มทุน"
            value={fmtInt(counts.loss)}
            unit="Q < Q*"
            color="var(--mui-palette-error-main)"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="หลักสูตร R ≤ AVC"
            value={fmtInt(counts.fcrOrNone)}
            unit="รายรับต่อหัวต่ำกว่าต้นทุนผันแปร"
            color="var(--mui-palette-warning-main)"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            label="ส่วนเกินรวมทั้งหมด"
            value={`${totalSurplus >= 0 ? '+' : '−'}${fmtMillion(Math.abs(totalSurplus))}`}
            unit="ล้านบาท (สุทธิ)"
            color={totalSurplus >= 0 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)'}
          />
        </Grid>
      </Grid>

      <Card>
        <CardHeader
          title="เจาะลึกจุดคุ้มทุน 3 ระดับ"
          subheader="คลิกที่คณะเพื่อดูระดับการศึกษา และคลิกระดับเพื่อดูรายหลักสูตร · หรือพิมพ์ค้นหาด้านล่าง"
          action={
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button size="small" variant="outlined" onClick={expandAll}>
                ขยายทั้งหมด
              </Button>
              <Button size="small" variant="outlined" onClick={collapseAll}>
                ย่อทั้งหมด
              </Button>
            </Box>
          }
        />
        <Divider />
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', bgcolor: 'action.hover' }}>
          <TextField
            size="small"
            placeholder="ค้นหาคณะ / ระดับ / ชื่อหลักสูตร / ชื่อปริญญา..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 280 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <i className="ri-search-line" />
                  </InputAdornment>
                ),
                endAdornment: search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')}>
                      <i className="ri-close-line" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Chip
            size="small"
            label={
              filtering
                ? `พบ ${fmtInt(shownProgs)} หลักสูตร · ${fmtInt(shownFacs)} คณะ`
                : `${RAW.PROGS.length} หลักสูตร · ${RAW.FACS.length} คณะ`
            }
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {QUICK_FILTERS.map((qf) => (
              <Chip
                key={qf.value}
                size="small"
                label={qf.label}
                color={filter === qf.value ? 'primary' : 'default'}
                variant={filter === qf.value ? 'filled' : 'outlined'}
                onClick={() => setFilter(qf.value)}
              />
            ))}
          </Box>
        </Box>
        <Divider />
        <Box sx={{ maxHeight: 640, overflow: 'auto' }}>
          <TreeHeader />
          {rows.length === 0 && (
            <Box sx={{ p: 8, textAlign: 'center' }}>
              <Typography color="text.secondary">
                🔍 ไม่พบข้อมูลที่ตรงกับ &quot;{search}&quot;{filter !== 'all' ? ' ในตัวกรองที่เลือก' : ''} — ลองคำอื่นหรือกดล้างคำค้นหา
              </Typography>
            </Box>
          )}
          {rows.map((r) => (
            <TreeRow key={r.key} row={r} />
          ))}
        </Box>
      </Card>

      <Card sx={{ mt: 4 }}>
        <CardHeader title="ประเด็นสำคัญ — จุดคุ้มทุนรายหลักสูตร" />
        <CardContent component="ul" sx={{ m: 0, pl: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <li>
            <Typography variant="body2">
              จาก {RAW.PROGS.length} หลักสูตร มี <b>{fmtInt(counts.ok)}</b> หลักสูตรที่คุ้มทุนแล้ว, <b>{fmtInt(counts.loss)}</b>{' '}
              ยังไม่ถึงจุดคุ้มทุน และ <b>{fmtInt(counts.fcrOrNone)}</b> หลักสูตรที่ R ≤ AVC (ไม่มีจุดคุ้มทุน ณ ราคาปัจจุบัน)
            </Typography>
          </li>
        </CardContent>
      </Card>
    </Box>
  );
};

const TreeHeader = () => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'minmax(220px,2fr) repeat(6, minmax(80px,1fr)) minmax(90px,1fr)',
      gap: 2,
      px: 3,
      py: 2,
      borderBottom: '1px solid var(--mui-palette-divider)',
      bgcolor: 'background.paper',
      position: 'sticky',
      top: 0,
      zIndex: 1,
    }}
  >
    <Typography variant="caption" fontWeight={700}>
      คณะ / ระดับ / หลักสูตร
    </Typography>
    {['นิสิต (Q)', 'จุดคุ้มทุน Q*', 'รายได้/หัว R', 'AVC', 'TR (ลบ.)', 'ส่วนเกิน (ลบ.)'].map((h) => (
      <Typography key={h} variant="caption" fontWeight={700} textAlign="right">
        {h}
      </Typography>
    ))}
    <Typography variant="caption" fontWeight={700} textAlign="right">
      สถานะ
    </Typography>
  </Box>
);

const TreeRow = ({ row }: { row: Row }) => (
  <Box
    onClick={row.hasChildren ? row.onToggle : undefined}
    sx={{
      display: 'grid',
      gridTemplateColumns: 'minmax(220px,2fr) repeat(6, minmax(80px,1fr)) minmax(90px,1fr)',
      gap: 2,
      px: 3,
      py: 2,
      borderBottom: '1px solid var(--mui-palette-divider)',
      cursor: row.hasChildren ? 'pointer' : 'default',
      '&:hover': row.hasChildren ? { bgcolor: 'action.hover' } : undefined,
      bgcolor: row.level === 0 ? 'action.hover' : undefined,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: row.level * 4 }}>
      {row.hasChildren && (
        <i
          className="ri-arrow-right-s-line"
          style={{ transition: 'transform .15s', transform: row.open ? 'rotate(90deg)' : 'none' }}
        />
      )}
      <Box>
        <Typography variant="body2" fontWeight={row.level === 0 ? 700 : row.level === 1 ? 600 : 400}>
          {row.label}
        </Typography>
        {row.sub && (
          <Typography variant="caption" color="text.secondary">
            {row.sub}
          </Typography>
        )}
      </Box>
    </Box>
    <Typography variant="body2" textAlign="right" className="num">
      {fmtInt(row.q)}
    </Typography>
    <Typography variant="body2" textAlign="right" className="num">
      {row.qStar !== null ? fmtInt(row.qStar) : '—'}
    </Typography>
    <Typography variant="body2" textAlign="right" className="num">
      {row.r !== null ? fmtInt(row.r) : '—'}
    </Typography>
    <Typography variant="body2" textAlign="right" color="text.secondary" className="num">
      {row.avc !== null ? fmtInt(row.avc) : '—'}
    </Typography>
    <Typography variant="body2" textAlign="right" className="num">
      {fmtMillion(row.tr)}
    </Typography>
    <Typography
      variant="body2"
      textAlign="right"
      fontWeight={700}
      className="num"
      color={row.profit >= 0 ? 'success.main' : 'error.main'}
    >
      {row.profit >= 0 ? '+' : '−'}
      {fmtMillion(Math.abs(row.profit))}
    </Typography>
    <Box textAlign="right">
      <Chip size="small" label={STATUS_LABEL[row.status]} color={STATUS_COLOR[row.status]} />
    </Box>
  </Box>
);

const StatCard = ({ label, value, unit, color }: { label: string; value: string; unit: string; color?: string }) => (
  <Card>
    <CardContent>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={700} sx={{ color, my: 0.5 }} className="num">
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {unit}
      </Typography>
    </CardContent>
  </Card>
);

export default BreakEvenDrill;
