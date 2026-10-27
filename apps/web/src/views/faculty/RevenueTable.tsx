'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';

import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import InfoTip from '@components/InfoTip';
import { fmtInt } from '@views/breakeven/calc';

import type { ProgStat } from './FacultyContext';

const PAGE_SIZE = 10;

/** พึ่งพาเงินแผ่นดินเกินนี้ → ไฮไลต์ */
export const GOV_DEP_ALERT = 0.5;

type SortKey = 'Q' | 'st' | 'own' | 'tr' | 'dep';

type Row = ProgStat & { Q: number; st: number; own: number; tr: number; dep: number };

/** สัดส่วนเงินแผ่นดินต่อรายได้ทั้งหมด — ไม่ขึ้นกับฐานรายได้ที่เลือก */
const govDep = (st: number, own: number) => (st + own ? st / (st + own) : 0);

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** ช่อง % พึ่งพาแผ่นดิน — แถบเล็ก + ตัวเลข · เกินเกณฑ์เป็นสีเตือน */
const DepCell = ({ dep }: { dep: number }) => {
  const high = dep > GOV_DEP_ALERT;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.5 }}>
      <LinearProgress
        variant="determinate"
        value={dep * 100}
        color={high ? 'warning' : 'primary'}
        sx={{ inlineSize: 56, blockSize: 6, borderRadius: 3 }}
      />
      <Typography
        variant="body2"
        className="num"
        fontWeight={high ? 700 : 400}
        color={high ? 'warning.main' : undefined}
        sx={{ minInlineSize: 48, textAlign: 'end' }}
      >
        {pct(dep)}
      </Typography>
    </Box>
  );
};

const COLUMNS: { key?: SortKey; label: string; hint?: string }[] = [
  { label: 'หลักสูตร' },
  { key: 'Q', label: 'นิสิตปัจจุบัน', hint: 'คน · ตัดยอด ณ วันปิดลงทะเบียน' },
  { key: 'st', label: 'เงินงบประมาณแผ่นดิน (บาท)', hint: 'งบประมาณแผ่นดินที่ปันให้หลักสูตร' },
  { key: 'own', label: 'เงินรายได้ / ค่าเทอม (บาท)', hint: 'ค่าธรรมเนียมการศึกษา' },
  {
    key: 'tr',
    label: 'รายได้รวม (บาท)',
    hint: 'ตามฐานรายได้ที่เลือกด้านบน — ไม่รวมแผ่นดิน = เงินรายได้อย่างเดียว',
  },
  {
    key: 'dep',
    label: '% พึ่งพาเงินแผ่นดิน',
    hint: `เงินแผ่นดิน ÷ (เงินแผ่นดิน + เงินรายได้) · เกิน ${GOV_DEP_ALERT * 100}% ไฮไลต์สีส้ม`,
  },
];

/**
 * ตารางรายได้รายหลักสูตร (ระดับที่เลือก หรือทุกระดับ) — ตัวเลขจริงใต้กราฟ ไม่ต้องชี้ทีละแท่ง
 * กดหัวคอลัมน์เพื่อเรียง · กดแถวเปิดรายละเอียด · แถวรวมท้ายตาราง · จอแคบเป็นการ์ด
 */
const RevenueTable = ({
  progs,
  mode,
  onPick,
}: {
  progs: ProgStat[];
  mode: RevenueMode;
  onPick: (key: string) => void;
}) => {
  const isMobile = useMediaQuery((t: Theme) => t.breakpoints.down('md'));
  const [sortKey, setSortKey] = useState<SortKey>('tr');
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);
  const withGov = mode === 'with_government';

  const rows = useMemo<Row[]>(
    () =>
      progs.map((x) => ({
        ...x,
        Q: x.p.Q,
        st: x.p.st,
        own: x.p.own,
        tr: withGov ? x.p.st + x.p.own : x.p.own,
        dep: govDep(x.p.st, x.p.own),
      })),
    [progs, withGov],
  );

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (asc ? 1 : -1) * (a[sortKey] - b[sortKey])),
    [rows, sortKey, asc],
  );

  const total = useMemo(() => {
    const t = rows.reduce(
      (a, r) => ({ Q: a.Q + r.Q, st: a.st + r.st, own: a.own + r.own, tr: a.tr + r.tr }),
      {
        Q: 0,
        st: 0,
        own: 0,
        tr: 0,
      },
    );

    return { ...t, dep: govDep(t.st, t.own) };
  }, [rows]);

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

  // ไม่รวมแผ่นดิน → คอลัมน์แผ่นดินจางลง (ยังแสดงเพื่อดูสัดส่วนพึ่งพา)
  const stSx = withGov ? undefined : { color: 'text.disabled' };

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
              <Typography fontWeight={600} sx={{ mb: 1 }}>
                {x.p.prog}
              </Typography>
              <Typography variant="body2" color="text.secondary" className="num">
                นิสิต {fmtInt(x.Q)} คน · รายได้รวม <b>{fmtInt(x.tr)}</b> บาท
              </Typography>
              <Typography variant="body2" color="text.secondary" className="num">
                <Box component="span" sx={stSx}>
                  แผ่นดิน {fmtInt(x.st)}
                </Box>{' '}
                · รายได้ {fmtInt(x.own)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  พึ่งพาแผ่นดิน
                </Typography>
                <DepCell dep={x.dep} />
              </Box>
            </Card>
          ))}
          <Card variant="outlined" sx={{ p: 2.5, bgcolor: 'action.hover' }}>
            <Typography fontWeight={700} className="num">
              รวม {rows.length} หลักสูตร · นิสิต {fmtInt(total.Q)} คน · {fmtInt(total.tr)} บาท ·
              พึ่งพาแผ่นดิน {pct(total.dep)}
            </Typography>
          </Card>
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
                <TableCell
                  key={c.label}
                  align={c.key ? 'right' : undefined}
                  sx={{ lineHeight: 1.3 }}
                >
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
                <TableCell sx={{ maxWidth: 260, '& > *': { maxWidth: 260 } }}>
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
                <TableCell align="right" className="num">
                  {fmtInt(x.Q)}
                </TableCell>
                <TableCell align="right" className="num" sx={stSx}>
                  {fmtInt(x.st)}
                </TableCell>
                <TableCell align="right" className="num">
                  {fmtInt(x.own)}
                </TableCell>
                <TableCell align="right" className="num" sx={{ fontWeight: 700 }}>
                  {fmtInt(x.tr)}
                </TableCell>
                <TableCell align="right">
                  <DepCell dep={x.dep} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 700, color: 'text.primary' } }}>
              <TableCell>รวม {rows.length} หลักสูตร</TableCell>
              <TableCell align="right" className="num">
                {fmtInt(total.Q)}
              </TableCell>
              <TableCell align="right" className="num" sx={stSx}>
                {fmtInt(total.st)}
              </TableCell>
              <TableCell align="right" className="num">
                {fmtInt(total.own)}
              </TableCell>
              <TableCell align="right" className="num">
                {fmtInt(total.tr)}
              </TableCell>
              <TableCell align="right">
                <DepCell dep={total.dep} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
      {pager}
    </Box>
  );
};

export default RevenueTable;
