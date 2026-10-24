'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
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
import { downloadCsv } from '@/utils/csv';
import { fmtInt, shortFacName } from '@views/breakeven/calc';

import { FIXED_COST_ALERT, fixedShare } from './FacultyCharts';
import type { ProgStat } from './FacultyContext';

const PAGE_SIZE = 10;

type SortKey =
  'Q' | 'direct' | 'office' | 'dep' | 'tfc' | 'tvc' | 'tc' | 'share' | 'perHead' | 'ofFac';

type Row = ProgStat & Record<SortKey, number>;

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** ช่อง % ต้นทุนคงที่ — เกินเกณฑ์เป็นตัวหนาสีเตือน + ⚠ */
const ShareCell = ({ share }: { share: number }) => {
  const high = share > FIXED_COST_ALERT;

  return (
    <Typography
      variant="body2"
      component="span"
      className="num"
      fontWeight={high ? 700 : 400}
      color={high ? 'warning.main' : undefined}
      sx={{ whiteSpace: 'nowrap' }}
    >
      {high && '⚠ '}
      {pct(share)}
    </Typography>
  );
};

const COLUMNS: { key: SortKey; label: string; hint: string; bold?: boolean }[] = [
  { key: 'Q', label: 'นิสิต', hint: 'คน · นิสิตปัจจุบัน' },
  {
    key: 'direct',
    label: 'คงที่ทางตรง',
    hint: 'ต้นทุนคงที่ที่ลงหลักสูตรโดยตรง เช่น เงินเดือนอาจารย์ประจำหลักสูตร (บาท)',
  },
  {
    key: 'office',
    label: 'ส่วนกลางที่ปันมา',
    hint: 'ต้นทุนคงที่ของสำนักงานคณะที่ปันลงหลักสูตร (หารรายหัวตามชีต) (บาท)',
  },
  {
    key: 'dep',
    label: 'ค่าเสื่อมราคา',
    hint: 'ค่าเสื่อมราคาอาคาร/ครุภัณฑ์ที่ปันลงหลักสูตร · ปีงบก่อนหน้า (บาท)',
  },
  {
    key: 'tfc',
    label: 'รวมต้นทุนคงที่',
    hint: 'ทางตรง + ส่วนกลาง + ค่าเสื่อม · ไม่เปลี่ยนตามจำนวนนิสิต (บาท)',
    bold: true,
  },
  {
    key: 'tvc',
    label: 'ต้นทุนผันแปร',
    hint: 'เพิ่ม/ลดตามจำนวนนิสิต รวมศึกษาทั่วไปและเงินสมทบ (บาท)',
    bold: true,
  },
  { key: 'tc', label: 'ต้นทุนรวม', hint: 'ต้นทุนคงที่ + ต้นทุนผันแปร (บาท)', bold: true },
  {
    key: 'share',
    label: '% คงที่',
    hint: `ต้นทุนคงที่ ÷ ต้นทุนรวม · เกิน ${FIXED_COST_ALERT * 100}% มีแนวโน้มขาดทุนสูง (ไฮไลต์สีส้ม)`,
  },
  { key: 'perHead', label: 'ต้นทุนต่อหัว', hint: 'ต้นทุนรวม ÷ นิสิตปัจจุบัน (บาท/คน)' },
  {
    key: 'ofFac',
    label: '% ของคณะ',
    hint: 'ต้นทุนรวมของหลักสูตร ÷ ต้นทุนรวมทุกหลักสูตรในคณะ (ทุกระดับ) — ดูว่าต้นทุนกระจุกที่หลักสูตรใด',
  },
];

const toRow = (x: ProgStat, facTc: number): Row => ({
  ...x,
  Q: x.p.Q,
  direct: x.p.tfcProg,
  office: x.p.tfcOffice,
  dep: x.p.dep,
  tfc: x.p.TFC,
  tvc: x.p.TVC,
  tc: x.p.TC,
  share: fixedShare(x.p.TFC, x.p.TC),
  perHead: x.p.Q ? x.p.TC / x.p.Q : 0,
  ofFac: facTc ? x.p.TC / facTc : 0,
});

/**
 * ตารางต้นทุนรายหลักสูตร (ระดับเดียว) — แยกต้นทุนคงที่เป็น ทางตรง · ส่วนกลางที่ปันมา · ค่าเสื่อม
 * กดหัวคอลัมน์เพื่อเรียง · กดแถวเปิดรายละเอียด · แถวรวมท้ายตาราง · Export CSV · จอแคบเป็นการ์ด
 */
const CostTable = ({
  progs,
  facName,
  facTc,
  level,
  year,
  onlyHigh,
  onClearFilter,
  onPick,
}: {
  progs: ProgStat[];
  facName: string;
  /** ต้นทุนรวมทุกหลักสูตรในคณะ (ทุกระดับ) — ฐานของคอลัมน์ % ของคณะ */
  facTc: number;
  level: string;
  year: string;
  /** แสดงเฉพาะหลักสูตรที่ต้นทุนคงที่เกินเกณฑ์ */
  onlyHigh: boolean;
  onClearFilter: () => void;
  onPick: (key: string) => void;
}) => {
  const isMobile = useMediaQuery((t: Theme) => t.breakpoints.down('lg'));
  const [sortKey, setSortKey] = useState<SortKey>('tc');
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);

  const all = useMemo(() => progs.map((x) => toRow(x, facTc)), [progs, facTc]);
  const rows = useMemo(
    () => (onlyHigh ? all.filter((r) => r.share > FIXED_COST_ALERT) : all),
    [all, onlyHigh],
  );

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (asc ? 1 : -1) * (a[sortKey] - b[sortKey])),
    [rows, sortKey, asc],
  );

  const total = useMemo(() => {
    const t = rows.reduce(
      (a, r) => ({
        Q: a.Q + r.Q,
        direct: a.direct + r.direct,
        office: a.office + r.office,
        dep: a.dep + r.dep,
        tfc: a.tfc + r.tfc,
        tvc: a.tvc + r.tvc,
        tc: a.tc + r.tc,
      }),
      { Q: 0, direct: 0, office: 0, dep: 0, tfc: 0, tvc: 0, tc: 0 },
    );

    return {
      ...t,
      share: fixedShare(t.tfc, t.tc),
      perHead: t.Q ? t.tc / t.Q : 0,
      ofFac: facTc ? t.tc / facTc : 0,
    };
  }, [rows, facTc]);

  // เปลี่ยนระดับ/คณะ/ตัวกรอง → กลับหน้าแรก (การเรียงยังอยู่)
  useEffect(() => setPage(0), [progs, onlyHigh]);

  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const sortBy = (k: SortKey) => {
    if (k === sortKey) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(false);
    }
  };

  const exportCsv = () =>
    downloadCsv(`ต้นทุนรายหลักสูตร-${shortFacName(facName)}-${level}-ปีงบ${year}`, [
      [
        `ต้นทุนรายหลักสูตร ${facName} · ${level} · ต้นทุนปีงบ ${year} (ค่าเสื่อมปีงบ ${Number(year) - 1})`,
      ],
      [
        `ส่งออกเมื่อ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}${onlyHigh ? ` · เฉพาะหลักสูตรต้นทุนคงที่เกิน ${FIXED_COST_ALERT * 100}%` : ''}`,
      ],
      ['หลักสูตร', 'ชื่อปริญญา', ...COLUMNS.map((c) => c.label)],
      ...sorted.map((r) => [
        r.p.prog,
        r.p.deg,
        r.Q,
        Math.round(r.direct),
        Math.round(r.office),
        Math.round(r.dep),
        Math.round(r.tfc),
        Math.round(r.tvc),
        Math.round(r.tc),
        pct(r.share),
        Math.round(r.perHead),
        pct(r.ofFac),
      ]),
      [
        `รวม ${rows.length} หลักสูตร`,
        '',
        total.Q,
        Math.round(total.direct),
        Math.round(total.office),
        Math.round(total.dep),
        Math.round(total.tfc),
        Math.round(total.tvc),
        Math.round(total.tc),
        pct(total.share),
        Math.round(total.perHead),
        pct(total.ofFac),
      ],
    ]);

  const toolbar = (
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
      {onlyHigh && (
        <Chip
          size="small"
          color="warning"
          variant="tonal"
          label={`เฉพาะต้นทุนคงที่เกิน ${FIXED_COST_ALERT * 100}% · ${rows.length} หลักสูตร`}
          onDelete={onClearFilter}
        />
      )}
      <Button
        size="small"
        variant="outlined"
        startIcon={<i className="ri-download-2-line" />}
        onClick={exportCsv}
        disabled={rows.length === 0}
        sx={{ marginInlineStart: 'auto' }}
      >
        Export CSV
      </Button>
    </Box>
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

  if (rows.length === 0)
    return (
      <Box>
        {toolbar}
        <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
          ไม่มีหลักสูตรที่ต้นทุนคงที่เกิน {FIXED_COST_ALERT * 100}% ในระดับนี้
        </Typography>
      </Box>
    );

  if (isMobile)
    return (
      <Box>
        {toolbar}
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
                นิสิต {fmtInt(x.Q)} คน · ต้นทุนรวม <b>{fmtInt(x.tc)}</b> บาท · ต่อหัว{' '}
                {fmtInt(x.perHead)} บาท
              </Typography>
              <Typography variant="body2" color="text.secondary" className="num">
                คงที่ {fmtInt(x.tfc)} (ทางตรง {fmtInt(x.direct)} · ส่วนกลาง {fmtInt(x.office)} ·
                ค่าเสื่อม {fmtInt(x.dep)})
              </Typography>
              <Typography variant="body2" color="text.secondary" className="num">
                ผันแปร {fmtInt(x.tvc)} · {pct(x.ofFac)} ของคณะ
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  % คงที่
                </Typography>
                <ShareCell share={x.share} />
              </Box>
            </Card>
          ))}
          <Card variant="outlined" sx={{ p: 2.5, bgcolor: 'action.hover' }}>
            <Typography fontWeight={700} className="num">
              รวม {rows.length} หลักสูตร · นิสิต {fmtInt(total.Q)} คน · {fmtInt(total.tc)} บาท ·
              คงที่ {pct(total.share)} · ต่อหัว {fmtInt(total.perHead)} บาท
            </Typography>
          </Card>
        </Stack>
        {pager}
      </Box>
    );

  const cells = (r: Omit<Row, keyof ProgStat>) =>
    COLUMNS.map((c) => (
      <TableCell
        key={c.key}
        align="right"
        className="num"
        sx={c.bold ? { fontWeight: 700 } : undefined}
      >
        {c.key === 'share' ? (
          <ShareCell share={r.share} />
        ) : c.key === 'ofFac' ? (
          pct(r.ofFac)
        ) : (
          fmtInt(r[c.key])
        )}
      </TableCell>
    ));

  return (
    <Box>
      {toolbar}
      <TableContainer>
        <Table size="small" sx={{ '& .MuiTableCell-root': { fontSize: '0.8125rem', px: 1.5 } }}>
          <TableHead>
            <TableRow>
              <TableCell>หลักสูตร</TableCell>
              {COLUMNS.map((c) => (
                <TableCell key={c.key} align="right" sx={{ lineHeight: 1.3 }}>
                  <TableSortLabel
                    active={sortKey === c.key}
                    direction={sortKey === c.key && asc ? 'asc' : 'desc'}
                    onClick={() => sortBy(c.key)}
                  >
                    {c.label}
                  </TableSortLabel>
                  <InfoTip text={c.hint} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((x) => (
              <TableRow key={x.key} hover onClick={() => onPick(x.key)} sx={{ cursor: 'pointer' }}>
                <TableCell sx={{ maxWidth: 220, '& > *': { maxWidth: 220 } }}>
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
                {cells(x)}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 700, color: 'text.primary' } }}>
              <TableCell>รวม {rows.length} หลักสูตร</TableCell>
              {cells(total)}
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
      {pager}
    </Box>
  );
};

export default CostTable;
