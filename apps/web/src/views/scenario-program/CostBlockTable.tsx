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
  v === null || !Number.isFinite(v) ? '—' : (Math.round(v) || 0).toLocaleString('th-TH');

const fmtDiff = (v: number) => {
  const x = Math.round(v);

  return x === 0 ? '0' : `${x > 0 ? '+' : '−'}${Math.abs(x).toLocaleString('th-TH')}`;
};

interface Line {
  /** ชื่อหมวดซ้ำกันระหว่างต้นทุนคงที่กับผันแปร — ใช้ id แยกเป็น key / aria-label */
  id?: string;
  no?: number;
  label: string;
  get: (b: CostBlock, r: BlockResult) => number | null;
  unit: string;
  /** 0 = หัวข้อหลัก · 1 = ข้อย่อย · 2 = หมวดรายจ่าย */
  depth: 0 | 1 | 2;
  /** ตั้งค่าได้เมื่อคอลัมน์แก้ไขได้ (กำหนดเอง) */
  set?: (b: CostBlock, v: number) => CostBlock;
  /** เงินแผ่นดิน — ไม่นับในกลุ่มไม่รวมเงินแผ่นดิน */
  govOnly?: boolean;
  highlight?: boolean;
}

export interface CostColumn {
  key: string;
  title: string;
  block: CostBlock;
  result: BlockResult;
  editable?: boolean;
}

/** กลุ่มคอลัมน์ต่อกรณี (รวม/ไม่รวมเงินแผ่นดิน) — มีคอลัมน์ผลต่างเมื่อมี 2 คอลัมน์ */
export interface CostGroup {
  key: string;
  title: string;
  mode: RevenueMode;
  color: 'primary' | 'warning';
  cols: CostColumn[];
}

interface Props {
  groups: CostGroup[];
  onChange: (mode: RevenueMode, b: CostBlock) => void;
  /** แสดงแถวปรับส่วนแบ่งส่วนกลางคณะ — เฉพาะเมื่อใช้วิธีปันส่วนอื่นที่ไม่ใช่ตามชีต */
  showAllocAdj?: boolean;
}

const ALLOC_ADJ = 'allocAdj';

const setArr = (k: 'fix' | 'var', i: number) => (b: CostBlock, v: number) => ({
  ...b,
  [k]: b[k].map((x, j) => (j === i ? v : x)),
});

const LINES: Line[] = [
  {
    no: 1,
    label: 'จำนวนนักศึกษาจริง : คน (Q)',
    get: (b) => b.q,
    unit: 'คน',
    depth: 0,
    set: (b, v) => ({ ...b, q: v }),
  },
  {
    no: 2,
    label: 'รายได้รวม (Total Revenue : TR)',
    get: (_, r) => r.tr,
    unit: 'บาท',
    depth: 0,
  },
  {
    label: '2.1 งบประมาณเงินแผ่นดิน',
    get: (b) => b.gov,
    unit: 'บาท',
    depth: 1,
    set: (b, v) => ({ ...b, gov: v }),
    govOnly: true,
  },
  {
    label: '2.2 งบประมาณเงินรายได้',
    get: (b) => b.income,
    unit: 'บาท',
    depth: 1,
    set: (b, v) => ({ ...b, income: v }),
  },
  { label: 'รายได้ต่อหน่วย : คน (R)', get: (_, r) => r.r, unit: 'บาท/คน', depth: 1 },
  { no: 3, label: 'ต้นทุนรวม (Total Cost : TC)', get: (_, r) => r.tc, unit: 'บาท', depth: 0 },
  {
    label: '3.1 ต้นทุนคงที่รวม (Total Fixed Cost : TFC)',
    get: (_, r) => r.tfc,
    unit: 'บาท',
    depth: 1,
  },
  ...FIXED_CATS.map<Line>((c, i) => ({
    id: `คงที่ ${c}`,
    label: c,
    get: (b) => b.fix[i] ?? 0,
    unit: 'บาท',
    depth: 2,
    set: setArr('fix', i),
  })),
  {
    label: 'ค่าเสื่อม',
    get: (b) => b.dep,
    unit: 'บาท',
    depth: 2,
    set: (b, v) => ({ ...b, dep: v }),
  },
  {
    id: ALLOC_ADJ,
    label: 'ปรับส่วนแบ่งส่วนกลางคณะ (ตามวิธีปันส่วน)',
    get: (_, r) => r.fixAdj,
    unit: 'บาท',
    depth: 2,
  },
  {
    label: '3.2 ต้นทุนผันแปร (Total Variable Cost : TVC)',
    get: (_, r) => r.tvc,
    unit: 'บาท',
    depth: 1,
  },
  ...VARIABLE_CATS.map<Line>((c, i) => ({
    id: `ผันแปร ${c}`,
    label: c,
    get: (b) => b.var[i] ?? 0,
    unit: 'บาท',
    depth: 2,
    set: setArr('var', i),
  })),
  {
    label: '- ศึกษาทั่วไป',
    get: (b) => b.genEd,
    unit: 'บาท',
    depth: 2,
    set: (b, v) => ({ ...b, genEd: v }),
  },
  {
    label: `- ค่าธรรมเนียมรายการหลัก (${MAIN_FEE_RATE.toLocaleString('th-TH')} บ./คน/ภาค)`,
    get: (b) => b.mainFee,
    unit: 'บาท',
    depth: 2,
  },
  {
    label: `- หักสมทบมหาวิทยาลัย (${UNI_SHARE_RATE.toLocaleString('th-TH')} บ./คน/ภาค)`,
    get: (b) => b.uniShare,
    unit: 'บาท',
    depth: 2,
  },
  { label: 'ต้นทุนผันแปรต่อหน่วย (AVC)', get: (_, r) => r.avc, unit: 'บาท/คน', depth: 1 },
  {
    no: 4,
    label: 'จำนวนนิสิต ณ จุดคุ้มทุน (Q*)',
    get: (_, r) => r.qStar,
    unit: 'คน',
    depth: 0,
    highlight: true,
  },
  { no: 5, label: 'รายได้ ณ จุดคุ้มทุน', get: (_, r) => r.beRevenue, unit: 'บาท', depth: 0 },
  {
    label: 'Diff (นิสิตจริง − จุดคุ้มทุน)',
    get: (_, r) => r.diff,
    unit: 'คน',
    depth: 0,
    highlight: true,
  },
];

/**
 * ตารางรายการแบบแท็บ 4 (ลำดับ · รายการ · จำนวน · หน่วย) — แยกกลุ่มกรณีรวม/ไม่รวมเงินแผ่นดิน
 * แต่ละกลุ่ม: อ้างอิงหลักสูตรเดิม | กำหนดเอง | ผลต่าง
 */
const CostBlockTable = ({ groups, onChange, showAllocAdj = false }: Props) => {
  const lines = showAllocAdj ? LINES : LINES.filter((l) => l.id !== ALLOC_ADJ);
  const nCols = groups.reduce((a, g) => a + g.cols.length, 0);
  const valueWidth = { xs: 120, sm: nCols > 2 ? 140 : 180 };
  const anyNegative = groups.some((g) =>
    g.cols.some((c) => c.result.qStar !== null && c.result.qStar < 0),
  );
  const groupStart = { borderLeft: 2, borderLeftColor: 'divider' };

  const colorOf = (l: Line, v: number | null, negative: boolean, excluded: boolean) =>
    l.highlight && v !== null
      ? l.label.startsWith('Diff')
        ? v >= 0 && !negative
          ? 'success.main'
          : 'error.main'
        : negative
          ? 'warning.main'
          : 'primary.main'
      : excluded
        ? 'text.disabled'
        : undefined;

  return (
    <TableContainer>
      <Table size="small" sx={{ minWidth: nCols > 2 ? 1100 : nCols > 1 ? 720 : undefined }}>
        <TableHead>
          <TableRow>
            <TableCell rowSpan={2} sx={{ width: 48 }}>
              ลำดับ
            </TableCell>
            <TableCell rowSpan={2}>รายการ</TableCell>
            {groups.map((g) => (
              <TableCell
                key={g.key}
                align="center"
                colSpan={g.cols.length + (g.cols.length === 2 ? 1 : 0)}
                sx={{
                  ...groupStart,
                  fontWeight: 800,
                  color: `${g.color}.main`,
                  borderBottom: 2,
                  borderBottomColor: `${g.color}.main`,
                }}
              >
                {g.title}
              </TableCell>
            ))}
            <TableCell rowSpan={2} sx={{ width: 64 }}>
              หน่วย
            </TableCell>
          </TableRow>
          <TableRow>
            {groups.map((g) => [
              ...g.cols.map((c, ci) => (
                <TableCell
                  key={`${g.key}-${c.key}`}
                  align="right"
                  sx={{
                    ...(ci === 0 ? groupStart : {}),
                    width: valueWidth,
                    fontWeight: 700,
                  }}
                >
                  {c.title}
                </TableCell>
              )),
              g.cols.length === 2 && (
                <TableCell key={`${g.key}-diff`} align="right" sx={{ width: { xs: 100, sm: 120 } }}>
                  ผลต่าง
                </TableCell>
              ),
            ])}
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((l) => (
            <TableRow
              key={l.id ?? l.label}
              sx={l.depth === 0 ? { bgcolor: 'action.hover' } : undefined}
            >
              <TableCell sx={{ fontWeight: 700 }}>{l.no ?? ''}</TableCell>
              <TableCell sx={{ pl: 2 + l.depth * 2, fontWeight: l.depth < 2 ? 700 : 400 }}>
                {l.label}
                {l.highlight && !l.label.startsWith('Diff') && anyNegative && (
                  <Chip
                    size="small"
                    color="warning"
                    label="R ≤ AVC — ยิ่งรับนิสิตยิ่งขาดทุน"
                    sx={{ ml: 1, height: 18, fontSize: 10 }}
                  />
                )}
              </TableCell>
              {groups.map((g) => {
                const excluded = !!l.govOnly && g.mode === 'without_government';
                const values = g.cols.map((c) => l.get(c.block, c.result));
                const d =
                  g.cols.length === 2 && values[0] !== null && values[1] !== null
                    ? values[1]! - values[0]!
                    : null;

                return [
                  ...g.cols.map((c, ci) => {
                    const v = values[ci]!;
                    const negative = c.result.qStar !== null && c.result.qStar < 0;
                    const input = c.editable && l.set && !excluded;

                    return (
                      <TableCell
                        key={`${g.key}-${c.key}`}
                        align="right"
                        title={excluded ? 'ไม่นับในกรณีไม่รวมเงินแผ่นดิน' : undefined}
                        sx={{
                          ...(ci === 0 ? groupStart : {}),
                          py: input ? 0.5 : undefined,
                        }}
                      >
                        {input ? (
                          <NumberTextField
                            size="small"
                            value={Math.round(v ?? 0)}
                            onChange={(x) => onChange(g.mode, l.set!(c.block, x))}
                            slotProps={{
                              htmlInput: {
                                style: { textAlign: 'right' },
                                'aria-label': `${g.title} ${c.title} ${l.id ?? l.label}`,
                              },
                            }}
                            sx={{ width: '100%' }}
                          />
                        ) : (
                          <Box
                            component="span"
                            sx={{
                              fontWeight: l.depth < 2 ? 700 : 400,
                              color: colorOf(l, v, negative, excluded),
                              textDecoration: excluded ? 'line-through' : undefined,
                            }}
                          >
                            {fmt(v)}
                          </Box>
                        )}
                      </TableCell>
                    );
                  }),
                  g.cols.length === 2 && (
                    <TableCell
                      key={`${g.key}-diff`}
                      align="right"
                      sx={{
                        fontWeight: l.depth < 2 ? 700 : 400,
                        color:
                          d === null || Math.round(d) === 0 || excluded
                            ? 'text.disabled'
                            : 'info.main',
                      }}
                    >
                      {d === null ? '—' : fmtDiff(d)}
                    </TableCell>
                  ),
                ];
              })}
              <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{l.unit}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CostBlockTable;
