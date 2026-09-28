'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

// MUI Imports
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

// Type Imports
import type { RevenueMode } from '@beps/calc-engine';

// Component Imports
import { DotTitle } from '@components/ChartBits';

// Data / calc Imports
import type { ProgRow } from '@/data/mockup';
import {
  computeBreakEven,
  fmtInt,
  fmtMillion,
  shortFacName,
  statusOf,
  STATUS_COLOR,
  STATUS_LABEL,
} from '@views/breakeven/calc';

type SortKey = 'Q' | 'TC' | 'atc' | 'r' | 'diff';

type CalcRow = {
  p: ProgRow;
  atc: number | null;
  r: number | null;
  diff: number | null;
};

/** คอลัมน์ตัวเลขที่กดเรียงได้ — ป้ายหัวตารางกับตัวเปรียบเทียบมาจากนิยามเดียวกัน */
const SORTABLE: { key: SortKey; label: string; value: (row: CalcRow) => number | null }[] = [
  { key: 'Q', label: 'นิสิต (คน)', value: (row) => row.p.Q },
  { key: 'TC', label: 'ต้นทุนรวม (ลบ.)', value: (row) => row.p.TC },
  { key: 'atc', label: 'ต้นทุน/คน (บาท)', value: (row) => row.atc },
  { key: 'r', label: 'รายได้/คน (บาท)', value: (row) => row.r },
  { key: 'diff', label: 'ส่วนต่าง/คน (บาท)', value: (row) => row.diff },
];

type Props = {
  progs: readonly ProgRow[];
  mode: RevenueMode;
  /** แสดงคอลัมน์คณะเมื่อขอบเขตครอบมากกว่าหนึ่งคณะ */
  showFaculty: boolean;
  scopeLabel: string;
};

/**
 * ต้นทุนรายหลักสูตรในขอบเขตที่กำลังดู — เรียงได้ทุกคอลัมน์ตัวเลข ตั้งต้นที่ต้นทุนรวมมากสุด
 * เพื่อให้หลักสูตรที่มีน้ำหนักทางการเงินอยู่หน้าแรก ส่วนหลักสูตรที่ขาดทุนหนักสุดกดเรียงจาก
 * คอลัมน์ "ส่วนต่าง/คน" ได้ในคลิกเดียว
 */
const ProgramCostTable = ({ progs, mode, showFaculty, scopeLabel }: Props) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // ตั้งต้นที่ต้นทุนมากสุด — ไม่งั้นหลักสูตรนิสิตหลักหน่วยที่ต้นทุน/หัวสูงผิดปกติยึดหัวตารางทั้งหน้า
  const [sortBy, setSortBy] = useState<SortKey>('TC');
  const [desc, setDesc] = useState(true);

  const sortHandler = (key: SortKey) => () => {
    setDesc(key === sortBy ? !desc : true);
    setSortBy(key);
    setPage(0);
  };

  const calculated = useMemo(
    () =>
      progs.map((p) => {
        const res = computeBreakEven(p, mode);

        return {
          p,
          atc: res.atc,
          r: res.r,
          // ส่วนต่างต่อหัว = รายได้ต่อหัว − ต้นทุนรวมต่อหัว (บวก = หลักสูตรเลี้ยงตัวเองได้)
          diff: res.r !== null && res.atc !== null ? res.r - res.atc : null,
          status: statusOf(res),
        };
      }),
    [progs, mode],
  );

  const rows = useMemo(() => {
    const col = SORTABLE.find((c) => c.key === sortBy)!;

    return [...calculated].sort((a, b) => {
      const av = col.value(a);
      const bv = col.value(b);

      // แถวที่คำนวณต่อหัวไม่ได้ให้ไปท้ายตารางเสมอ ไม่ว่าจะเรียงทางไหน
      if (av === null) return bv === null ? 0 : 1;
      if (bv === null) return -1;

      return desc ? bv - av : av - bv;
    });
  }, [calculated, sortBy, desc]);

  // กลับไปหน้าแรกเมื่อขอบเขตเปลี่ยน — ไม่งั้นกรองคณะเล็กแล้วจะค้างอยู่หน้าที่ไม่มีแถว
  useEffect(() => setPage(0), [calculated]);

  const paged = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const colSpan = showFaculty ? 10 : 9;
  const lossCount = rows.filter((r) => r.status !== 'ok').length;

  return (
    <Card sx={{ mb: 4 }}>
      <CardHeader
        title={<DotTitle color="primary.main">ต้นทุนแยกตามหลักสูตร</DotTitle>}
        subheader={`${fmtInt(rows.length)} หลักสูตรใน${scopeLabel} · กดหัวคอลัมน์เพื่อเรียงใหม่`}
        action={
          rows.length > 0 && (
            <Chip
              size="small"
              variant="tonal"
              color={lossCount > 0 ? 'error' : 'success'}
              label={`ยังไม่คุ้มทุน ${fmtInt(lossCount)} จาก ${fmtInt(rows.length)} หลักสูตร`}
            />
          )
        }
      />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>หลักสูตร</TableCell>
              {showFaculty && <TableCell>คณะ</TableCell>}
              <TableCell>ระดับ</TableCell>
              {SORTABLE.map((col) => (
                <TableCell
                  key={col.key}
                  align="right"
                  sortDirection={sortBy === col.key && desc ? 'desc' : 'asc'}
                >
                  <TableSortLabel
                    active={sortBy === col.key}
                    direction={sortBy === col.key && desc ? 'desc' : 'asc'}
                    onClick={sortHandler(col.key)}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell>สถานะจุดคุ้มทุน</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    ไม่มีหลักสูตรในขอบเขตนี้ — ลองล้างตัวกรองเพื่อดูทุกคณะ
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {paged.map(({ p, atc, r, diff, status }, i) => (
              <TableRow key={`${p.fac}-${p.lvl}-${p.prog}`} hover>
                <TableCell sx={{ color: 'text.disabled', fontWeight: 700 }}>
                  {page * rowsPerPage + i + 1}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{p.prog}</TableCell>
                {showFaculty && (
                  <TableCell sx={{ color: 'text.secondary' }}>{shortFacName(p.fac)}</TableCell>
                )}
                <TableCell sx={{ color: 'text.secondary' }}>{p.lvl}</TableCell>
                <TableCell align="right">{fmtInt(p.Q)}</TableCell>
                <TableCell align="right">{fmtMillion(p.TC)}</TableCell>
                <TableCell align="right">{fmtInt(atc)}</TableCell>
                <TableCell align="right">{fmtInt(r)}</TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 700,
                    color:
                      diff === null ? 'text.disabled' : diff >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {diff === null ? '—' : `${diff >= 0 ? '+' : '−'}${fmtInt(Math.abs(diff))}`}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="tonal"
                    color={STATUS_COLOR[status]}
                    label={STATUS_LABEL[status]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="แถวต่อหน้า"
      />
    </Card>
  );
};

export default ProgramCostTable;
