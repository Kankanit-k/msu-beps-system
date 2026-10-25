'use client';

import { useState, type ReactNode } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, type Theme } from '@mui/material/styles';

import type { RevenueMode } from '@beps/calc-engine';

import NumberTextField from '@components/NumberTextField';

import { REVENUE_MODE_LABEL } from '@views/breakeven/calc';

import { editInputSx, gridTableSx } from './CostBlockTable';
import { isForeignSeg, mixResult, type MixResult, type Segment, type SegmentResult } from './newProgramCalc';

const fmt = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('th-TH') : '—');
const pct = (v: number) => `${(v * 100).toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`;

type InputKey = 'n' | 'fee' | 'gov' | 'semesters' | 'years';

interface RowDef {
  label: string;
  /** ลำดับ (คอลัมน์ซ้ายสุด) */
  no?: string;
  unit?: string;
  /** กลุ่มแถวผลลัพธ์ต่อกรณี — แถวหัวข้อ ไม่มีค่า */
  section?: RevenueMode;
  mode?: RevenueMode;
  input?: InputKey;
  out?: (r: SegmentResult, i: number) => string;
  /** ค่าคอลัมน์ "รวม" */
  total?: string;
  bold?: boolean;
  disabled?: boolean;
}

export type ModeCosts = Record<RevenueMode, { tfc: number; avc: number }>;

const MODES: RevenueMode[] = ['with_government', 'without_government'];

interface Props {
  segs: Segment[];
  /** ไม่ส่ง = แสดงอย่างเดียว (รายงานพิมพ์) */
  onChange?: (segs: Segment[]) => void;
  /** ต้นทุนคงที่/AVC ของแต่ละกรณี — แสดงผลรวม/ไม่รวมเงินแผ่นดินคู่กัน */
  costs: ModeCosts;
  /** เงินแผ่นดินดึงจากอัตราจัดสรรต่อหัว — แสดงอย่างเดียว ห้ามแก้ (หน้าปรับปรุงหลักสูตร มติ 25 ต.ค.) */
  lockGov?: boolean;
}

/** การวิเคราะห์สัดส่วนจำนวนนิสิตเพื่อหาจุดคุ้มทุน (แท็บ 4 คอลัมน์ X:AD) */
const StudentMixTable = ({ segs, onChange, costs, lockGov = false }: Props) => {
  const narrowScreen = useMediaQuery((t: Theme) => t.breakpoints.down('md'));
  const isNarrow = narrowScreen && !!onChange;
  const mixes = Object.fromEntries(
    MODES.map((m) => [m, mixResult(segs, costs[m].tfc, costs[m].avc, m)]),
  ) as Record<RevenueMode, MixResult>;
  const base = mixes.with_government;
  // แถว 7/8 (ผลรายกรณี) หุบ/กางได้ — ตั้งต้นหุบไว้ ให้เห็นกล่องสรุปด้านล่าง · รายงานพิมพ์กางเสมอ
  const [openModes, setOpenModes] = useState<RevenueMode[]>([]);
  const isOpen = (m: RevenueMode) => !onChange || openModes.includes(m);
  const toggle = (m: RevenueMode) =>
    setOpenModes((o) => (o.includes(m) ? o.filter((x) => x !== m) : [...o, m]));
  const set = (i: number, k: InputKey, v: number) =>
    onChange?.(segs.map((s, j) => (j === i ? { ...s, [k]: v } : s)));

  /** เงินแผ่นดิน/เงินรายได้ต่อปีของกลุ่ม — แผ่นดินเฉพาะนิสิตไทยและเฉพาะกรณีรวมเงินแผ่นดิน */
  const govYear = (m: RevenueMode, i: number) =>
    m === 'with_government' && !isForeignSeg(i) ? segs[i]!.gov * segs[i]!.n * segs[i]!.semesters : 0;
  const feeYear = (i: number) => segs[i]!.fee * segs[i]!.n * segs[i]!.semesters;
  const sumOver = (f: (i: number) => number) => segs.reduce((a, _, i) => a + f(i), 0);

  const outRows = (m: RevenueMode): RowDef[] => {
    const mix = mixes[m];

    const section: RowDef = {
      label: REVENUE_MODE_LABEL[m],
      section: m,
      no: m === 'with_government' ? '7' : '8',
    };

    const profit: RowDef = {
      label: 'กำไร (ขาดทุน)',
      mode: m,
      out: (r) => fmt(r.profit),
      total: fmt(mix.total.profit),
      bold: true,
      unit: 'บาท',
    };

    // หุบแล้วยังเห็นกำไร (ขาดทุน) — บรรทัดล่างสุดที่ต้องรู้
    if (!isOpen(m)) return [section, profit];

    return [
      section,
      {
        label: 'รายรับตลอดหลักสูตร ต่อคน',
        mode: m,
        out: (r) => fmt(r.perHeadProgram),
        unit: 'บาท',
      },
      ...(m === 'with_government'
        ? [
            {
              label: 'เงินงบประมาณแผ่นดินต่อปี',
              mode: m,
              out: (_: SegmentResult, i: number) => fmt(govYear(m, i)),
              total: fmt(sumOver((i) => govYear(m, i))),
              unit: 'บาท',
            },
          ]
        : []),
      {
        label: 'เงินรายได้ (ค่าธรรมเนียม) ต่อปี',
        mode: m,
        out: (_, i) => fmt(feeYear(i)),
        total: fmt(sumOver(feeYear)),
        unit: 'บาท',
      },
      {
        label: 'รายรับต่อปี',
        mode: m,
        out: (r) => fmt(r.revenue),
        total: fmt(mix.total.revenue),
        bold: true,
        unit: 'บาท',
      },
      {
        label: 'ต้นทุนคงที่ (ปันตามสัดส่วนนิสิต)',
        mode: m,
        out: (r) => fmt(r.tfc),
        total: fmt(mix.total.tfc),
        unit: 'บาท',
      },
      {
        label: 'ต้นทุนผันแปร (AVC × จำนวนนิสิต)',
        mode: m,
        out: (r) => fmt(r.tvc),
        total: fmt(mix.total.tvc),
        unit: 'บาท',
      },
      {
        label: 'ต้นทุนรวม (คงที่ + ผันแปร)',
        mode: m,
        out: (r) => fmt(r.tfc + r.tvc),
        total: fmt(mix.total.tfc + mix.total.tvc),
        bold: true,
        unit: 'บาท',
      },
      profit,
    ];
  };

  const rows: RowDef[] = [
    {
      no: '1',
      label: 'จำนวนนิสิต (คน)',
      input: 'n',
      total: fmt(base.total.n),
      bold: true,
      unit: 'คน',
    },
    {
      no: '2',
      unit: '%',
      label: 'สัดส่วนจำนวนนิสิต',
      mode: 'with_government',
      out: (r) => pct(r.share),
      total: pct(base.total.share),
    },
    { no: '3', label: 'ค่าธรรมเนียม (บาท/ภาค/คน)', input: 'fee', unit: 'บาท' },
    { no: '4', label: 'เงินแผ่นดิน (บาท/ภาค/คน)', input: 'gov', unit: 'บาท' },
    { no: '5', label: 'จำนวนภาคเรียนต่อปี', input: 'semesters', unit: 'ภาค' },
    { no: '6', label: 'จำนวนปีการศึกษา', input: 'years', unit: 'ปี' },
    ...MODES.flatMap(outRows),
  ];
  const sectionLabel = (m: RevenueMode, label: string) =>
    onChange ? (
      <>
        {isOpen(m) ? '▾' : '▸'} {label}
        <Box component="span" sx={{ ml: 1, fontWeight: 400, fontSize: 12, color: 'text.secondary' }}>
          {isOpen(m) ? 'คลิกเพื่อหุบ' : 'คลิกเพื่อดูรายรับ/ต้นทุน'}
        </Box>
      </>
    ) : (
      label
    );
  const rowKey = (row: RowDef) => `${row.mode ?? row.section ?? ''}:${row.label}`;
  const sectionColor = (m: RevenueMode) =>
    m === 'with_government' ? 'primary.main' : 'warning.main';

  const cell = (row: RowDef, i: number): ReactNode => {
    // นิสิตต่างชาติไม่ได้เงินแผ่นดิน — กล่องพิมพ์ไม่ได้ ค่า 0
    const locked = row.input === 'gov' && isForeignSeg(i);

    if (row.input && !onChange) return locked ? '—' : fmt(segs[i]![row.input]);
    // เงินแผ่นดินล็อกทั้งแถว — ตัวเลขเทา ไม่มีปากกา
    if (row.input === 'gov' && lockGov) {
      return (
        <Box
          component="span"
          title="ดึงจากเงินแผ่นดินเฉลี่ยต่อหัว เฉพาะนิสิตไทย — แก้ไขไม่ได้"
          sx={{ color: 'text.secondary' }}
        >
          {locked ? '—' : fmt(segs[i]!.gov)}
        </Box>
      );
    }

    if (row.input) {
      return (
        <NumberTextField
          size="small"
          showZero
          value={locked ? 0 : segs[i]![row.input]}
          disabled={row.disabled || locked}
          title={locked ? 'นิสิตต่างชาติไม่ได้เงินแผ่นดิน' : undefined}
          onChange={(v) => set(i, row.input!, v)}
          slotProps={{
            htmlInput: {
              style: { textAlign: 'right', paddingTop: 4, paddingBottom: 4 },
              'aria-label': `${row.label} ${segs[i]!.label}`,
            },
          }}
          sx={{ ...editInputSx, minWidth: 90 }}
        />
      );
    }

    const r = mixes[row.mode!].rows[i]!;
    const text = row.out!(r, i);
    const isProfit = row.label.startsWith('กำไร');

    return (
      <Box
        component="span"
        sx={{
          fontWeight: row.bold ? 700 : 400,
          color: isProfit ? (r.profit >= 0 ? 'success.main' : 'error.main') : undefined,
        }}
      >
        {text}
      </Box>
    );
  };

  const summaryBox = (m: RevenueMode) => {
    const mix = mixes[m];
    const ok = mix.total.profit >= 0;

    return (
      <Grid key={m} size={{ xs: 12, md: 6 }}>
        <Box
          sx={{
            p: 2,
            height: '100%',
            borderRadius: 1,
            borderLeft: 4,
            borderColor: sectionColor(m),
            bgcolor: ok
              ? 'var(--mui-palette-success-lightOpacity)'
              : 'var(--mui-palette-error-lightOpacity)',
          }}
        >
          <Typography variant="subtitle2" sx={{ color: sectionColor(m), fontWeight: 700 }}>
            {REVENUE_MODE_LABEL[m]}
          </Typography>
          <Typography variant="body2">
            จุดคุ้มทุน <b>{mix.qStar === null ? '—' : `${fmt(mix.qStar)} คน`}</b> · รายรับเฉลี่ย{' '}
            {fmt(mix.total.n ? mix.total.revenue / mix.total.n : 0)} บ./คน/ปี
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color: ok ? 'success.main' : 'error.main' }}
          >
            นิสิต {fmt(mix.total.n)} คน → {ok ? 'กำไร' : 'ขาดทุน'} {fmt(Math.abs(mix.total.profit))}{' '}
            บาท/ปี
          </Typography>
          {mix.qStar !== null && mix.qStar < 0 && (
            <Typography variant="caption" color="warning.main">
              รายรับเฉลี่ยต่อคนต่ำกว่าต้นทุนผันแปรต่อคน (AVC) — เพิ่มนิสิตเท่าไรก็ไม่คุ้มทุน
            </Typography>
          )}
        </Box>
      </Grid>
    );
  };

  const summary = (
    <Grid container spacing={2} sx={{ mt: 2 }}>
      {MODES.map(summaryBox)}
    </Grid>
  );

  if (isNarrow) {
    return (
      <>
        <Grid container spacing={2}>
          {segs.map((s, i) => (
            <Grid key={s.label} size={12}>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Typography variant="subtitle2" color="primary.main" sx={{ mb: 1 }}>
                  {s.label}
                </Typography>
                {rows.map((row) =>
                  row.section ? (
                    <Typography
                      key={rowKey(row)}
                      variant="caption"
                      onClick={() => toggle(row.section!)}
                      sx={{
                        display: 'block',
                        mt: 1.5,
                        fontWeight: 700,
                        color: sectionColor(row.section),
                        cursor: 'pointer',
                      }}
                    >
                      {sectionLabel(row.section, row.label)}
                    </Typography>
                  ) : (
                    <Box
                      key={rowKey(row)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        py: 0.5,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {row.label}
                      </Typography>
                      <Box sx={{ width: 140, textAlign: 'right' }}>{cell(row, i)}</Box>
                    </Box>
                  ),
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
        {summary}
      </>
    );
  }

  return (
    <>
      <TableContainer>
        <Table size="small" sx={{ minWidth: 900, ...gridTableSx }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 48 }}>ลำดับ</TableCell>
              <TableCell>รายการ</TableCell>
              {segs.map((s) => (
                <TableCell key={s.label}>{s.label}</TableCell>
              ))}
              <TableCell>รวม</TableCell>
              <TableCell sx={{ width: 64 }}>หน่วย</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) =>
              row.section ? (
                <TableRow
                  key={rowKey(row)}
                  hover={!!onChange}
                  onClick={() => toggle(row.section!)}
                  aria-expanded={isOpen(row.section)}
                  sx={{
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.05),
                    cursor: onChange ? 'pointer' : undefined,
                  }}
                >
                  <TableCell sx={{ fontWeight: 700 }}>{row.no}</TableCell>
                  <TableCell
                    colSpan={segs.length + 3}
                    sx={{ fontWeight: 800, color: sectionColor(row.section) }}
                  >
                    {sectionLabel(row.section, row.label)}
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={rowKey(row)}>
                  <TableCell sx={{ fontWeight: 700 }}>{row.no ?? ''}</TableCell>
                  <TableCell
                    sx={{
                      pl: row.mode && !row.no ? 4 : 2,
                      fontWeight: row.bold ? 700 : 400,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.label}
                  </TableCell>
                  {segs.map((s, i) => (
                    <TableCell
                      key={s.label}
                      align="right"
                      sx={{ py: row.input && onChange ? 0.25 : undefined }}
                    >
                      {cell(row, i)}
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {row.total ?? ''}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{row.unit}</TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {summary}
    </>
  );
};

export default StudentMixTable;
