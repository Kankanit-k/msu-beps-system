'use client';

// MUI Imports
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import type { RevenueMode } from '@beps/calc-engine';

import NumberTextField from '@components/NumberTextField';

import {
  FIXED_CATS,
  MAIN_FEE_RATE,
  UNI_SHARE_RATE,
  VARIABLE_CATS,
  type BlockResult,
  type CostBlock,
} from './newProgramCalc';

const fmt = (v: number | null) =>
  v === null || !Number.isFinite(v) ? '—' : Math.round(v).toLocaleString('th-TH');

interface Line {
  /** ชื่อหมวดซ้ำกันระหว่างต้นทุนคงที่กับผันแปร — ใช้ id แยกเป็น key / aria-label */
  id?: string;
  no?: number;
  label: string;
  value: number | null;
  unit: string;
  /** 0 = หัวข้อหลัก · 1 = ข้อย่อย · 2 = หมวดรายจ่าย */
  depth: 0 | 1 | 2;
  /** ตั้งค่าได้เมื่อแก้ไขได้ (โหมดคิดต้นทุนด้วยตัวเอง) */
  set?: (v: number) => CostBlock;
  /** ไม่นับในผลรวมของโหมดนี้ (เงินแผ่นดินในโหมดไม่รวม) */
  excluded?: boolean;
  highlight?: boolean;
}

interface Props {
  block: CostBlock;
  result: BlockResult;
  mode: RevenueMode;
  editable: boolean;
  onChange: (b: CostBlock) => void;
}

/** ตารางรายการแบบแท็บ 4 (ลำดับ · รายการ · จำนวน · หน่วย) — แก้ตัวเลขได้ในโหมดคิดต้นทุนด้วยตัวเอง */
const CostBlockTable = ({ block: b, result: r, mode, editable, onChange }: Props) => {
  const withGov = mode === 'with_government';
  const setArr = (k: 'fix' | 'var', i: number) => (v: number) => ({
    ...b,
    [k]: b[k].map((x, j) => (j === i ? v : x)),
  });

  const lines: Line[] = [
    {
      no: 1,
      label: 'จำนวนนักศึกษาจริง : คน (Q)',
      value: b.q,
      unit: 'คน',
      depth: 0,
      set: (v) => ({ ...b, q: v }),
    },
    {
      no: 2,
      label: `รายได้รวม : ${withGov ? 'รวม' : 'ไม่รวม'}เงินแผ่นดิน (Total Revenue : TR)`,
      value: r.tr,
      unit: 'บาท',
      depth: 0,
    },
    {
      label: '2.1 งบประมาณเงินแผ่นดิน',
      value: b.gov,
      unit: 'บาท',
      depth: 1,
      set: (v) => ({ ...b, gov: v }),
      excluded: !withGov,
    },
    {
      label: '2.2 งบประมาณเงินรายได้',
      value: b.income,
      unit: 'บาท',
      depth: 1,
      set: (v) => ({ ...b, income: v }),
    },
    { label: 'รายได้ต่อหน่วย : คน (R)', value: r.r, unit: 'บาท/คน', depth: 1 },
    { no: 3, label: 'ต้นทุนรวม (Total Cost : TC)', value: r.tc, unit: 'บาท', depth: 0 },
    { label: '3.1 ต้นทุนคงที่รวม (Total Fixed Cost : TFC)', value: r.tfc, unit: 'บาท', depth: 1 },
    ...FIXED_CATS.map<Line>((c, i) => ({
      id: `คงที่ ${c}`,
      label: c,
      value: b.fix[i] ?? 0,
      unit: 'บาท',
      depth: 2,
      set: setArr('fix', i),
    })),
    { label: 'ค่าเสื่อม', value: b.dep, unit: 'บาท', depth: 2, set: (v) => ({ ...b, dep: v }) },
    { label: '3.2 ต้นทุนผันแปร (Total Variable Cost : TVC)', value: r.tvc, unit: 'บาท', depth: 1 },
    ...VARIABLE_CATS.map<Line>((c, i) => ({
      id: `ผันแปร ${c}`,
      label: c,
      value: b.var[i] ?? 0,
      unit: 'บาท',
      depth: 2,
      set: setArr('var', i),
    })),
    {
      label: '- ศึกษาทั่วไป',
      value: b.genEd,
      unit: 'บาท',
      depth: 2,
      set: (v) => ({ ...b, genEd: v }),
    },
    {
      label: `- ค่าธรรมเนียมรายการหลัก (${MAIN_FEE_RATE.toLocaleString('th-TH')} บ./คน/ภาค)`,
      value: b.mainFee,
      unit: 'บาท',
      depth: 2,
    },
    {
      label: `- หักสมทบมหาวิทยาลัย (${UNI_SHARE_RATE.toLocaleString('th-TH')} บ./คน/ภาค)`,
      value: b.uniShare,
      unit: 'บาท',
      depth: 2,
    },
    { label: 'ต้นทุนผันแปรต่อหน่วย (AVC)', value: r.avc, unit: 'บาท/คน', depth: 1 },
    {
      no: 4,
      label: 'จำนวนนิสิต ณ จุดคุ้มทุน (Q*)',
      value: r.qStar,
      unit: 'คน',
      depth: 0,
      highlight: true,
    },
    { no: 5, label: 'รายได้ ณ จุดคุ้มทุน', value: r.beRevenue, unit: 'บาท', depth: 0 },
    {
      label: 'Diff (นิสิตจริง − จุดคุ้มทุน)',
      value: r.diff,
      unit: 'คน',
      depth: 0,
      highlight: true,
    },
  ];

  const negative = r.qStar !== null && r.qStar < 0;

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 48 }}>ลำดับ</TableCell>
            <TableCell>รายการ</TableCell>
            <TableCell align="right" sx={{ width: { xs: 140, sm: 200 } }}>
              จำนวน
            </TableCell>
            <TableCell sx={{ width: 64 }}>หน่วย</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((l) => {
            const isDiff = l.label.startsWith('Diff');
            const color =
              l.highlight && l.value !== null
                ? isDiff
                  ? l.value >= 0 && !negative
                    ? 'success.main'
                    : 'error.main'
                  : negative
                    ? 'warning.main'
                    : 'primary.main'
                : l.excluded
                  ? 'text.disabled'
                  : undefined;

            return (
              <TableRow
                key={l.id ?? l.label}
                sx={l.depth === 0 ? { bgcolor: 'action.hover' } : undefined}
              >
                <TableCell sx={{ fontWeight: 700 }}>{l.no ?? ''}</TableCell>
                <TableCell
                  sx={{
                    pl: 2 + l.depth * 2,
                    fontWeight: l.depth < 2 ? 700 : 400,
                    color: l.excluded ? 'text.disabled' : undefined,
                  }}
                >
                  {l.label}
                  {l.excluded && (
                    <Chip
                      size="small"
                      label="ไม่นับในโหมดนี้"
                      sx={{ ml: 1, height: 18, fontSize: 10 }}
                    />
                  )}
                  {l.highlight && !isDiff && negative && (
                    <Chip
                      size="small"
                      color="warning"
                      label="R ≤ AVC — ยิ่งรับนิสิตยิ่งขาดทุน"
                      sx={{ ml: 1, height: 18, fontSize: 10 }}
                    />
                  )}
                </TableCell>
                <TableCell align="right" sx={{ py: editable && l.set ? 0.5 : undefined }}>
                  {editable && l.set ? (
                    <NumberTextField
                      size="small"
                      value={Math.round(l.value ?? 0)}
                      onChange={(v) => onChange(l.set!(v))}
                      slotProps={{
                        htmlInput: { style: { textAlign: 'right' }, 'aria-label': l.id ?? l.label },
                      }}
                      sx={{ width: '100%' }}
                    />
                  ) : (
                    <Box
                      component="span"
                      sx={{
                        fontWeight: l.depth < 2 ? 700 : 400,
                        color,
                        textDecoration: l.excluded ? 'line-through' : undefined,
                      }}
                    >
                      {fmt(l.value)}
                    </Box>
                  )}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{l.unit}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CostBlockTable;
