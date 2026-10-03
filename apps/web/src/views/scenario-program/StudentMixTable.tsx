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

import { mixResult, type Segment, type SegmentResult } from './newProgramCalc';

const fmt = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('th-TH') : '—');
const pct = (v: number) => `${(v * 100).toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`;

type InputKey = 'n' | 'fee' | 'gov' | 'semesters' | 'years';

interface RowDef {
  label: string;
  input?: InputKey;
  out?: (r: SegmentResult) => string;
  /** ค่าคอลัมน์ "รวม" */
  total?: string;
  bold?: boolean;
  disabled?: boolean;
}

interface Props {
  segs: Segment[];
  onChange: (segs: Segment[]) => void;
  tfc: number;
  avc: number;
  mode: RevenueMode;
}

/** การวิเคราะห์สัดส่วนจำนวนนิสิตเพื่อหาจุดคุ้มทุน (แท็บ 4 คอลัมน์ X:AD) */
const StudentMixTable = ({ segs, onChange, tfc, avc, mode }: Props) => {
  const isNarrow = useMediaQuery((t: Theme) => t.breakpoints.down('md'));
  const mix = mixResult(segs, tfc, avc, mode);
  const withGov = mode === 'with_government';
  const set = (i: number, k: InputKey, v: number) =>
    onChange(segs.map((s, j) => (j === i ? { ...s, [k]: v } : s)));

  const rows: RowDef[] = [
    { label: 'จำนวนนิสิต (คน)', input: 'n', total: fmt(mix.total.n), bold: true },
    { label: 'สัดส่วนจำนวนนิสิต', out: (r) => pct(r.share), total: pct(mix.total.share) },
    { label: 'ค่าธรรมเนียม (บาท/ภาค/คน)', input: 'fee' },
    { label: 'เงินแผ่นดิน (บาท/ภาค/คน)', input: 'gov', disabled: !withGov },
    { label: 'จำนวนภาคเรียนต่อปี', input: 'semesters' },
    { label: 'จำนวนปีการศึกษา', input: 'years' },
    { label: 'รายรับตลอดหลักสูตร ต่อคน', out: (r) => fmt(r.perHeadProgram) },
    { label: 'รายรับต่อปี', out: (r) => fmt(r.revenue), total: fmt(mix.total.revenue), bold: true },
    {
      label: 'ต้นทุนคงที่ (ปันตามสัดส่วนนิสิต)',
      out: (r) => fmt(r.tfc),
      total: fmt(mix.total.tfc),
    },
    { label: 'ต้นทุนผันแปร (AVC × จำนวนนิสิต)', out: (r) => fmt(r.tvc), total: fmt(mix.total.tvc) },
    { label: 'กำไร (ขาดทุน)', out: (r) => fmt(r.profit), total: fmt(mix.total.profit), bold: true },
  ];

  const cell = (row: RowDef, i: number): ReactNode => {
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

    const r = mix.rows[i]!;
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

  const summary = (
    <Box
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 1,
        bgcolor:
          mix.total.profit >= 0
            ? 'var(--mui-palette-success-lightOpacity)'
            : 'var(--mui-palette-error-lightOpacity)',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        ตามสัดส่วนนี้: นิสิต {fmt(mix.total.n)} คน · รายรับเฉลี่ย{' '}
        {fmt(mix.total.n ? mix.total.revenue / mix.total.n : 0)} บ./คน/ปี · จุดคุ้มทุน{' '}
        {mix.qStar === null ? '—' : `${fmt(mix.qStar)} คน`} ·{' '}
        <Box component="span" sx={{ color: mix.total.profit >= 0 ? 'success.main' : 'error.main' }}>
          {mix.total.profit >= 0 ? 'กำไร' : 'ขาดทุน'} {fmt(Math.abs(mix.total.profit))} บาท/ปี
        </Box>
      </Typography>
      {mix.qStar !== null && mix.qStar < 0 && (
        <Typography variant="caption" color="warning.main">
          รายรับเฉลี่ยต่อคนต่ำกว่าต้นทุนผันแปรต่อคน (AVC) — เพิ่มนิสิตเท่าไรก็ไม่คุ้มทุน
        </Typography>
      )}
    </Box>
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
                {rows.map((row) => (
                  <Box
                    key={row.label}
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
                ))}
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
            {rows.map((row) => (
              <TableRow key={row.label}>
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {summary}
    </>
  );
};

export default StudentMixTable;
