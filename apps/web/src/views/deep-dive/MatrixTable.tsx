'use client';

// React Imports
import { Fragment, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
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

// Component Imports
import InfoTip from '@components/InfoTip';

import { DD_YEARS } from './deepDiveData';
import type { Series } from './deepDiveData';

const PAGE_SIZE = 25;

export interface MatrixRow {
  key: string;
  label: string;
  sub?: string;
  values: Series;
  /** รูปแบบตัวเลขของแถวนี้ (เช่น แถวย่อยจำนวนนิสิต) — ไม่ส่ง = ของตาราง */
  fmt?: (v: number | null) => string;
  /** ป้ายหลังชื่อ (เช่น สถานะ) */
  badge?: ReactNode;
  /** แถวย่อยเมื่อกาง (เช่น หมวดค่าใช้จ่าย) */
  children?: MatrixRow[];
}

export interface ExtraCol {
  key: string;
  label: string;
  hint?: string;
  get: (r: MatrixRow) => number | null;
  fmt: (v: number | null) => string;
  /** สีตัวเลข */
  tone?: (v: number | null) => string | undefined;
}

/** เส้นแนวโน้มเล็ก — ข้ามปีที่ไม่มีข้อมูล */
export const Sparkline = ({
  values,
  color = 'var(--mui-palette-primary-main)',
}: {
  values: Series;
  color?: string;
}) => {
  const pts = values
    .map((v, i) => (v === null ? null : { i, v }))
    .filter((x): x is { i: number; v: number } => !!x);

  if (pts.length < 2)
    return (
      <Typography variant="caption" color="text.disabled">
        {pts.length ? '1 ปี' : '—'}
      </Typography>
    );
  const W = 72;
  const H = 22;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const x = (i: number) => (i / (values.length - 1)) * (W - 4) + 2;
  const y = (v: number) => (max === min ? H / 2 : H - 2 - ((v - min) / (max - min)) * (H - 4));
  const d = pts.map((p) => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1]!;

  return (
    <svg width={W} height={H} role="img" aria-label="แนวโน้ม">
      <polyline points={d} fill="none" stroke={color} strokeWidth={1.6} />
      <circle cx={x(last.i)} cy={y(last.v)} r={2.4} fill={color} />
    </svg>
  );
};

/**
 * ตาราง Matrix: แถว = หลักสูตร (กางเป็นแถวย่อยได้) · คอลัมน์ = ปี + คอลัมน์สรุป
 * ชื่อหลักสูตรตรึงซ้าย · เรียงได้ทุกคอลัมน์ตัวเลข · แบ่งหน้า 25 แถว · จอแคบเป็นการ์ด
 * ปีที่ยังไม่มีข้อมูลขึ้นป้าย "รอข้อมูล" (ไม่ใช้ตัวเลขประมาณ)
 */
const MatrixTable = ({
  rows,
  fmt,
  signed,
  pendingYears = [],
  extra = [],
  total,
  defaultSort,
  onPick,
  pickLabel = 'ดูรายละเอียด',
  emptyText,
}: {
  rows: MatrixRow[];
  fmt: (v: number | null) => string;
  /** บวก = เขียว · ลบ = แดง */
  signed?: boolean;
  pendingYears?: readonly number[];
  extra?: ExtraCol[];
  total?: { label: string; values: Series };
  /** 'y:<index>' หรือ key ของ extra */
  defaultSort?: { key: string; asc?: boolean };
  onPick?: (key: string) => void;
  pickLabel?: string;
  emptyText: ReactNode;
}) => {
  const isMobile = useMediaQuery((t: Theme) => t.breakpoints.down('md'));
  const lastIdx = DD_YEARS.length - 1;
  const [sortKey, setSortKey] = useState(defaultSort?.key ?? `y:${lastIdx}`);
  const [asc, setAsc] = useState(defaultSort?.asc ?? false);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const valueOf = (r: MatrixRow, k: string) => {
    if (k.startsWith('y:')) return r.values[Number(k.slice(2))] ?? null;

    return extra.find((c) => c.key === k)?.get(r) ?? null;
  };

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const va = valueOf(a, sortKey);
        const vb = valueOf(b, sortKey);

        // ไม่มีข้อมูลไปท้ายเสมอ
        if (va === null) return vb === null ? 0 : 1;
        if (vb === null) return -1;

        return (asc ? 1 : -1) * (va - vb);
      }),
    [rows, sortKey, asc],
  );

  // ตัวกรองเปลี่ยน → กลับหน้าแรก (การเรียงยังอยู่)
  // เทียบด้วยชุดคีย์ — แถวที่สร้างใหม่ทุก render แต่ชุดเดิม จะไม่ดีดกลับหน้า 1
  const rowSig = rows.map((r) => r.key).join('|');

  useEffect(() => setPage(0), [rowSig]);

  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const sortBy = (k: string) => {
    if (k === sortKey) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(false);
    }
  };

  const toggle = (k: string) =>
    setOpen((s) => {
      const n = new Set(s);

      if (n.has(k)) n.delete(k);
      else n.add(k);

      return n;
    });

  const tone = (v: number | null) =>
    v === null ? 'text.disabled' : signed ? (v < 0 ? 'error.main' : 'success.main') : undefined;

  const pending = (i: number) => pendingYears.includes(DD_YEARS[i]!);

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

  if (rows.length === 0)
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <i className="ri-filter-off-line" style={{ fontSize: 36, opacity: 0.4 }} />
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {emptyText}
        </Typography>
      </Box>
    );

  if (isMobile)
    return (
      <Box>
        <Stack spacing={2}>
          {pageRows.map((r) => (
            <Card key={r.key} variant="outlined" sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1 }}>
                <Box sx={{ minInlineSize: 0 }}>
                  <Typography fontWeight={600}>{r.label}</Typography>
                  {r.badge}
                </Box>
                <Sparkline values={r.values} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}>
                {DD_YEARS.map((y, i) => (
                  <Box key={y} sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" component="div">
                      {y}
                    </Typography>
                    <Typography
                      variant="caption"
                      className="num"
                      fontWeight={600}
                      color={tone(r.values[i] ?? null)}
                    >
                      {pending(i) ? 'รอ' : fmt(r.values[i] ?? null)}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {extra.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} className="num">
                  {extra.map((c) => `${c.label} ${c.fmt(c.get(r))}`).join(' · ')}
                </Typography>
              )}
              {onPick && (
                <Typography
                  variant="body2"
                  color="primary.main"
                  sx={{ mt: 1, cursor: 'pointer' }}
                  onClick={() => onPick(r.key)}
                >
                  {pickLabel} ›
                </Typography>
              )}
            </Card>
          ))}
        </Stack>
        {pager}
      </Box>
    );

  const stickySx = {
    position: 'sticky',
    left: 0,
    zIndex: 1,
    bgcolor: 'background.paper',
    minInlineSize: 240,
    maxInlineSize: 300,
  } as const;

  const renderRow = (r: MatrixRow, depth: number): ReactNode => {
    const isOpen = open.has(r.key);

    return (
      <Fragment key={r.key}>
        <TableRow hover sx={depth ? { bgcolor: 'action.hover' } : undefined}>
          <TableCell
            sx={{ ...stickySx, pl: depth ? 6 : 2, ...(depth ? { bgcolor: 'inherit' } : {}) }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {r.children?.length ? (
                <IconButton
                  size="small"
                  aria-label={isOpen ? 'หุบ' : 'กาง'}
                  onClick={() => toggle(r.key)}
                >
                  <i className={isOpen ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} />
                </IconButton>
              ) : null}
              <Box sx={{ minInlineSize: 0 }}>
                <Typography
                  variant="body2"
                  fontWeight={depth ? 400 : 600}
                  color={onPick && !depth ? 'primary.main' : undefined}
                  noWrap
                  title={r.label}
                  sx={onPick && !depth ? { cursor: 'pointer' } : undefined}
                  onClick={onPick && !depth ? () => onPick(r.key) : undefined}
                >
                  {r.label}
                </Typography>
                {(r.sub || r.badge) && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {r.badge}
                    {r.sub && (
                      <Typography variant="caption" color="text.secondary" noWrap title={r.sub}>
                        {r.sub}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          </TableCell>
          {DD_YEARS.map((y, i) => (
            <TableCell
              key={y}
              align="right"
              className="num"
              sx={{ color: tone(r.values[i] ?? null) }}
            >
              {(r.fmt ?? fmt)(r.values[i] ?? null)}
            </TableCell>
          ))}
          <TableCell align="center">{depth ? null : <Sparkline values={r.values} />}</TableCell>
          {extra.map((c) => {
            const v = c.get(r);

            return (
              <TableCell key={c.key} align="right" className="num" sx={{ color: c.tone?.(v) }}>
                {c.fmt(v)}
              </TableCell>
            );
          })}
        </TableRow>
        {isOpen && r.children?.map((ch) => renderRow(ch, depth + 1))}
      </Fragment>
    );
  };

  return (
    <Box>
      <TableContainer>
        <Table size="small" sx={{ '& .MuiTableCell-root': { fontSize: '0.8125rem' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...stickySx, zIndex: 2 }}>หลักสูตร</TableCell>
              {DD_YEARS.map((y, i) => (
                <TableCell
                  key={y}
                  align="right"
                  sx={{ whiteSpace: 'nowrap', verticalAlign: 'bottom' }}
                >
                  {pending(i) && (
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      component="div"
                      sx={{ lineHeight: 1.2 }}
                    >
                      รอข้อมูล
                    </Typography>
                  )}
                  <TableSortLabel
                    active={sortKey === `y:${i}`}
                    direction={sortKey === `y:${i}` && asc ? 'asc' : 'desc'}
                    onClick={() => sortBy(`y:${i}`)}
                  >
                    {y}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="center">แนวโน้ม</TableCell>
              {extra.map((c) => (
                <TableCell key={c.key} align="right" sx={{ lineHeight: 1.3 }}>
                  <TableSortLabel
                    active={sortKey === c.key}
                    direction={sortKey === c.key && asc ? 'asc' : 'desc'}
                    onClick={() => sortBy(c.key)}
                  >
                    {c.label}
                  </TableSortLabel>
                  {c.hint && <InfoTip text={c.hint} />}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>{pageRows.map((r) => renderRow(r, 0))}</TableBody>
          {total && (
            <TableFooter>
              <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 700, color: 'text.primary' } }}>
                <TableCell sx={stickySx}>{total.label}</TableCell>
                {DD_YEARS.map((y, i) => (
                  <TableCell
                    key={y}
                    align="right"
                    className="num"
                    sx={{ color: `${tone(total.values[i] ?? null) ?? 'text.primary'} !important` }}
                  >
                    {fmt(total.values[i] ?? null)}
                  </TableCell>
                ))}
                <TableCell align="center">
                  <Sparkline values={total.values} />
                </TableCell>
                {extra.map((c) => (
                  <TableCell key={c.key} />
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
      {pager}
    </Box>
  );
};

export default MatrixTable;
