'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';

import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { BEPS } from '@components/ChartBits';
import InfoTip from '@components/InfoTip';
import { fmtInt, fmtMillion } from '@views/breakeven/calc';

import type { ProgStat } from './FacultyContext';

const PAGE_SIZE = 10;

type SortKey = 'profit' | 'profitPct' | 'Q' | 'tr' | 'tc';

type Row = ProgStat & { tr: number; tc: number; profit: number; profitPct: number; rank: number };

const signed = (v: number) => `${v >= 0 ? '+' : '−'}${fmtMillion(Math.abs(v))}`;

/** ช่องจุดคุ้มทุน — เขียว = นิสิตถึงแล้ว · แดง = ยังไม่ถึง · — = ไม่มีจุดคุ้มทุน · ตัวหนา = โหมดที่เลือก */
const TargetCell = ({ q, target, active }: { q: number; target: number; active: boolean }) =>
  target <= 0 ? (
    <TableCell
      align="right"
      title="รายได้ต่อหัวไม่พอจ่ายต้นทุนผันแปร — ไม่มีจุดคุ้มทุน"
      sx={{ color: 'text.disabled' }}
    >
      —
    </TableCell>
  ) : (
    <TableCell
      align="right"
      className="num"
      sx={{ color: q >= target ? BEPS.breakEven : 'error.main', fontWeight: active ? 700 : 400 }}
    >
      {fmtInt(target)}
    </TableCell>
  );

/** อันดับ — 3 อันดับแรกเขียว · 3 อันดับท้ายแดง (เมื่อมีหลักสูตรมากพอ) */
const RankChip = ({ rank, total, profit }: { rank: number; total: number; profit: number }) => {
  const top = rank <= 3 && profit >= 0;
  const bottom = total > 6 && rank > total - 3;

  return (
    <Chip
      size="small"
      variant="tonal"
      color={top ? 'success' : bottom ? 'error' : 'default'}
      label={rank}
      sx={{ minWidth: 32, fontWeight: 700 }}
    />
  );
};

const StatusChip = ({ profit }: { profit: number }) => (
  <Chip
    size="small"
    variant="tonal"
    color={profit >= 0 ? 'success' : 'error'}
    label={profit >= 0 ? 'คุ้ม' : 'ไม่คุ้ม'}
  />
);

const COLUMNS: { key?: SortKey; label: string; align?: 'right'; hint?: string }[] = [
  { label: '#' },
  { label: 'หลักสูตร' },
  {
    key: 'Q',
    label: 'นิสิต / เป้าตามแผน',
    align: 'right',
    hint: 'นิสิตปัจจุบัน · เป้าตามแผนรับรอข้อมูลแผนรับจากกองแผน/ทะเบียน — ระหว่างนี้ดูช่องจุดคุ้มทุนแทนเป้า',
  },
  {
    key: 'tr',
    label: 'รายได้รวม',
    align: 'right',
    hint: 'ล้านบาท · บรรทัดเล็ก = เงินแผ่นดิน · เงินรายได้',
  },
  {
    key: 'tc',
    label: 'ต้นทุนรวม',
    align: 'right',
    hint: 'ล้านบาท · บรรทัดเล็ก = ต้นทุนคงที่ · ผันแปร',
  },
  {
    label: 'จุดคุ้มทุน (รวมแผ่นดิน)',
    align: 'right',
    hint: 'จำนวนนิสิตที่ต้องมีเพื่อคุ้มทุน เมื่อนับเงินแผ่นดินเป็นรายได้',
  },
  {
    label: 'จุดคุ้มทุน (ไม่รวม)',
    align: 'right',
    hint: 'จำนวนนิสิตที่ต้องมีเพื่อคุ้มทุน เมื่อนับเฉพาะเงินรายได้ (ค่าธรรมเนียม)',
  },
  {
    key: 'profit',
    label: 'ส่วนเกิน / ขาดทุน',
    align: 'right',
    hint: 'ล้านบาท ตามฐานรายได้ที่เลือกด้านบน · กดหัวคอลัมน์เพื่อเรียง',
  },
];

/**
 * ตารางจัดอันดับหลักสูตรในระดับเดียวกัน — อันดับ = ส่วนเกินมากสุด → ขาดทุนมากสุด (ตามโหมด)
 * กดหัวคอลัมน์เพื่อเรียงแบบอื่น · กดแถวเพื่อเปิดรายละเอียด · จอแคบเปลี่ยนเป็นการ์ด
 */
const ProgramRankTable = ({
  progs,
  mode,
  onPick,
}: {
  progs: ProgStat[];
  mode: RevenueMode;
  onPick: (key: string) => void;
}) => {
  const isMobile = useMediaQuery((t: Theme) => t.breakpoints.down('md'));
  const [sortKey, setSortKey] = useState<SortKey>('profit');
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);

  const ranked = useMemo<Row[]>(() => {
    const rows = progs.map((x) => {
      const tr = mode === 'with_government' ? x.p.st + x.p.own : x.p.own;
      const tc = x.p.TFC + x.p.TVC;
      const profit = tr - tc;

      return { ...x, tr, tc, profit, profitPct: tr ? profit / tr : 0, rank: 0 };
    });

    // อันดับคงที่ตามส่วนเกิน/ขาดทุน ไม่ว่าจะเรียงด้วยคอลัมน์ไหน
    [...rows].sort((a, b) => b.profit - a.profit).forEach((r, i) => (r.rank = i + 1));

    return rows;
  }, [progs, mode]);

  const sorted = useMemo(
    () =>
      [...ranked].sort(
        (a, b) =>
          (asc ? 1 : -1) *
          ((sortKey === 'Q' ? a.p.Q : a[sortKey]) - (sortKey === 'Q' ? b.p.Q : b[sortKey])),
      ),
    [ranked, sortKey, asc],
  );

  // เปลี่ยนระดับ/คณะ → กลับหน้าแรก (การเรียงยังอยู่)
  useEffect(() => setPage(0), [progs]);

  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const sortBy = (k: SortKey) => {
    if (k === sortKey) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(false);
    }
  };

  if (progs.length === 0)
    return (
      <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
        ไม่มีหลักสูตรที่มีนิสิตในระดับนี้
      </Typography>
    );

  const pager = (
    <TablePagination
      component="div"
      count={sorted.length}
      page={page}
      onPageChange={(_, p) => setPage(p)}
      rowsPerPage={PAGE_SIZE}
      rowsPerPageOptions={[PAGE_SIZE]}
      labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
    />
  );

  if (isMobile)
    return (
      <Box>
        <Stack spacing={2}>
          {pageRows.map((x) => (
            <Card
              key={x.key}
              variant="outlined"
              onClick={() => onPick(x.key)}
              sx={{ p: 2.5, cursor: 'pointer' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <RankChip rank={x.rank} total={ranked.length} profit={x.profit} />
                <Typography fontWeight={600} sx={{ flex: 1 }}>
                  {x.p.prog}
                </Typography>
                <StatusChip profit={x.profit} />
              </Box>
              <Typography variant="body2" color="text.secondary" className="num">
                นิสิต {fmtInt(x.p.Q)} คน · จุดคุ้มทุน {x.qStarGov > 0 ? fmtInt(x.qStarGov) : '—'} /{' '}
                {x.qStarOwn > 0 ? fmtInt(x.qStarOwn) : '—'} คน (รวม / ไม่รวมแผ่นดิน)
              </Typography>
              <Typography variant="body2" color="text.secondary" className="num">
                รายได้ {fmtMillion(x.tr)} · ต้นทุน {fmtMillion(x.tc)} ·{' '}
                <b
                  style={{
                    color: x.profit >= 0 ? BEPS.breakEven : 'var(--mui-palette-error-main)',
                  }}
                >
                  {signed(x.profit)} ลบ.
                </b>
              </Typography>
            </Card>
          ))}
        </Stack>
        {pager}
      </Box>
    );

  return (
    <Box>
      <TableContainer>
        <Table size="small" sx={{ '& .MuiTableCell-root': { fontSize: '0.8125rem' } }}>
          <TableHead>
            <TableRow>
              {COLUMNS.map((c) => (
                <TableCell key={c.label} align={c.align} sx={{ lineHeight: 1.3 }}>
                  {c.key ? (
                    <TableSortLabel
                      active={sortKey === c.key}
                      direction={sortKey === c.key && asc ? 'asc' : 'desc'}
                      onClick={() => sortBy(c.key!)}
                    >
                      {c.label}
                    </TableSortLabel>
                  ) : (
                    c.label
                  )}
                  {c.hint && <InfoTip text={c.hint} />}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((x) => (
              <TableRow key={x.key} hover onClick={() => onPick(x.key)} sx={{ cursor: 'pointer' }}>
                <TableCell>
                  <RankChip rank={x.rank} total={ranked.length} profit={x.profit} />
                </TableCell>
                <TableCell sx={{ maxWidth: 240, '& > *': { maxWidth: 240 } }}>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="primary.main"
                    noWrap
                    title={x.p.prog}
                  >
                    {x.p.prog}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    component="div"
                    title={x.p.deg}
                  >
                    {x.p.deg}
                  </Typography>
                </TableCell>
                <TableCell align="right" className="num" sx={{ whiteSpace: 'nowrap' }}>
                  {fmtInt(x.p.Q)}{' '}
                  <Typography component="span" variant="caption" color="text.disabled">
                    / —
                  </Typography>
                </TableCell>
                <TableCell align="right" className="num" sx={{ whiteSpace: 'nowrap' }}>
                  {fmtMillion(x.tr)}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    แผ่นดิน {fmtMillion(x.p.st)} · รายได้ {fmtMillion(x.p.own)}
                  </Typography>
                </TableCell>
                <TableCell align="right" className="num" sx={{ whiteSpace: 'nowrap' }}>
                  {fmtMillion(x.tc)}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    คงที่ {fmtMillion(x.p.TFC)} · ผันแปร {fmtMillion(x.p.TVC)}
                  </Typography>
                </TableCell>
                <TargetCell q={x.p.Q} target={x.qStarGov} active={mode === 'with_government'} />
                <TargetCell q={x.p.Q} target={x.qStarOwn} active={mode === 'without_government'} />
                <TableCell align="right">
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 1.5,
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      className="num"
                      color={x.profit >= 0 ? BEPS.breakEven : 'error.main'}
                    >
                      {signed(x.profit)}
                    </Typography>
                    <StatusChip profit={x.profit} />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {pager}
    </Box>
  );
};

export default ProgramRankTable;
