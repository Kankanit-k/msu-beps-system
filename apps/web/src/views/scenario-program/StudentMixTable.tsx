'use client';

import type { ReactNode } from 'react';

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
import type { Theme } from '@mui/material/styles';

import type { RevenueMode } from '@beps/calc-engine';

import NumberTextField from '@components/NumberTextField';

import { REVENUE_MODE_LABEL } from '@views/breakeven/calc';

import { mixResult, type MixResult, type Segment, type SegmentResult } from './newProgramCalc';

const fmt = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('th-TH') : '—');
const pct = (v: number) => `${(v * 100).toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`;

type InputKey = 'n' | 'fee' | 'gov' | 'semesters' | 'years';

interface RowDef {
  label: string;
  /** กลุ่มแถวผลลัพธ์ต่อกรณี — แถวหัวข้อ ไม่มีค่า */
  section?: RevenueMode;
  mode?: RevenueMode;
  input?: InputKey;
  out?: (r: SegmentResult) => string;
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
}

/** การวิเคราะห์สัดส่วนจำนวนนิสิตเพื่อหาจุดคุ้มทุน (แท็บ 4 คอลัมน์ X:AD) */
const StudentMixTable = ({ segs, onChange, costs }: Props) => {
  const narrowScreen = useMediaQuery((t: Theme) => t.breakpoints.down('md'));
  const isNarrow = narrowScreen && !!onChange;
  const mixes = Object.fromEntries(
    MODES.map((m) => [m, mixResult(segs, costs[m].tfc, costs[m].avc, m)]),
  ) as Record<RevenueMode, MixResult>;
  const base = mixes.with_government;
  const set = (i: number, k: InputKey, v: number) =>
    onChange?.(segs.map((s, j) => (j === i ? { ...s, [k]: v } : s)));

  const outRows = (m: RevenueMode): RowDef[] => {
    const mix = mixes[m];

    return [
      { label: REVENUE_MODE_LABEL[m], section: m },
      { label: 'รายรับตลอดหลักสูตร ต่อคน', mode: m, out: (r) => fmt(r.perHeadProgram) },
      {
        label: 'รายรับต่อปี',
        mode: m,
        out: (r) => fmt(r.revenue),
        total: fmt(mix.total.revenue),
        bold: true,
      },
      {
        label: 'ต้นทุนคงที่ (ปันตามสัดส่วนนิสิต)',
        mode: m,
        out: (r) => fmt(r.tfc),
        total: fmt(mix.total.tfc),
      },
      {
        label: 'ต้นทุนผันแปร (AVC × จำนวนนิสิต)',
        mode: m,
        out: (r) => fmt(r.tvc),
        total: fmt(mix.total.tvc),
      },
      {
        label: 'กำไร (ขาดทุน)',
        mode: m,
        out: (r) => fmt(r.profit),
        total: fmt(mix.total.profit),
        bold: true,
      },
    ];
  };

  const rows: RowDef[] = [
    { label: 'จำนวนนิสิต (คน)', input: 'n', total: fmt(base.total.n), bold: true },
    {
      label: 'สัดส่วนจำนวนนิสิต',
      mode: 'with_government',
      out: (r) => pct(r.share),
      total: pct(base.total.share),
    },
    { label: 'ค่าธรรมเนียม (บาท/ภาค/คน)', input: 'fee' },
    { label: 'เงินแผ่นดิน (บาท/ภาค/คน)', input: 'gov' },
    { label: 'จำนวนภาคเรียนต่อปี', input: 'semesters' },
    { label: 'จำนวนปีการศึกษา', input: 'years' },
    ...MODES.flatMap(outRows),
  ];
  const rowKey = (row: RowDef) => `${row.mode ?? row.section ?? ''}:${row.label}`;
  const sectionColor = (m: RevenueMode) =>
    m === 'with_government' ? 'primary.main' : 'warning.main';

  const cell = (row: RowDef, i: number): ReactNode => {
    if (row.input && !onChange) return fmt(segs[i]![row.input]);
    if (row.input) {
      return (
        <NumberTextField
          size="small"
          value={segs[i]![row.input]}
          disabled={row.disabled}
          onChange={(v) => set(i, row.input!, v)}
          slotProps={{
            htmlInput: {
              style: { textAlign: 'right' },
              'aria-label': `${row.label} ${segs[i]!.label}`,
            },
          }}
          sx={{ width: '100%', minWidth: 90 }}
        />
      );
    }

    const r = mixes[row.mode!].rows[i]!;
    const text = row.out!(r);
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
                      sx={{
                        display: 'block',
                        mt: 1.5,
                        fontWeight: 700,
                        color: sectionColor(row.section),
                      }}
                    >
                      {row.label}
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
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>รายการ</TableCell>
              {segs.map((s) => (
                <TableCell key={s.label} align="right">
                  {s.label}
                </TableCell>
              ))}
              <TableCell align="right">รวม</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) =>
              row.section ? (
                <TableRow key={rowKey(row)}>
                  <TableCell
                    colSpan={segs.length + 2}
                    sx={{
                      fontWeight: 700,
                      color: sectionColor(row.section),
                      bgcolor: 'action.hover',
                    }}
                  >
                    {row.label}
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={rowKey(row)}>
                  <TableCell sx={{ fontWeight: row.bold ? 700 : 400, whiteSpace: 'nowrap' }}>
                    {row.label}
                  </TableCell>
                  {segs.map((s, i) => (
                    <TableCell key={s.label} align="right" sx={{ py: row.input ? 0.5 : undefined }}>
                      {cell(row, i)}
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {row.total ?? ''}
                  </TableCell>
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
