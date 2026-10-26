'use client';

import { useRef, useState } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';

import type { RevenueMode } from '@beps/calc-engine';

import NumberTextField from '@components/NumberTextField';

import {
  FIXED_CATS,
  MAIN_FEE_RATE,
  scaleQ,
  UNI_SHARE_RATE,
  VARIABLE_CATS,
  type BlockResult,
  type CostBlock,
} from './newProgramCalc';

/** ตีเส้นทุกช่อง หัวตารางพื้นฟ้าอ่อน — แบบเดียวกับตารางระบบ KPI */
export const gridTableSx = {
  '& th, & td': { border: 1, borderColor: 'divider' },
  // ธีมตัดเส้นล่างของแถวสุดท้ายออก — ใส่คืนให้ตารางปิดกรอบครบ
  '& tbody tr:last-of-type td': { borderBottom: 1, borderColor: 'divider' },
  '& thead th': {
    bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
    fontWeight: 700,
    fontSize: '0.8125rem',
    textAlign: 'center',
    verticalAlign: 'middle',
  },
} satisfies SxProps<Theme>;

/** ช่องที่ต้องกรอก — พื้นเหลืองอ่อน กรอบน้ำเงิน ตัวหนา ให้เห็นชัดว่าพิมพ์ตรงนี้ */
/** ช่องกรอกในตาราง — กรอบฟ้า + ดินสอนำหน้า ให้เห็นทันทีว่าแก้ได้ · โฟกัสแล้วเป็นพื้นขาวมีวงแสง */
export const editInputSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    bgcolor: (t) => alpha(t.palette.warning.main, 0.12),
    fontWeight: 700,
    borderRadius: 1.5,
    cursor: 'text',
    transition: 'background-color .15s, box-shadow .15s',
    '&::before': {
      content: '"✎"',
      pl: 1,
      color: 'primary.main',
      fontWeight: 400,
    },
    '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
    '&:hover:not(.Mui-focused):not(.Mui-disabled):not(.Mui-error) .MuiOutlinedInput-notchedOutline':
      {
        borderColor: 'primary.main',
      },
    '&.Mui-focused': {
      bgcolor: 'background.paper',
      boxShadow: (t) => `0 0 0 3px ${alpha(t.palette.primary.main, 0.25)}`,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: 'primary.main',
      borderWidth: 2,
    },
    '&.Mui-disabled': { bgcolor: 'action.hover', '&::before': { content: 'none' } },
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: (t) => alpha(t.palette.primary.main, 0.45),
    borderWidth: 1.5,
  },
  '& .Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: 'divider', borderWidth: 1 },
} satisfies SxProps<Theme>;

const fmt = (v: number | null) =>
  v === null || !Number.isFinite(v) ? '—' : (Math.round(v) || 0).toLocaleString('th-TH');

const fmtDiff = (v: number) => {
  const x = Math.round(v);

  return x === 0 ? '0' : `${x > 0 ? '▲' : '▼'} ${Math.abs(x).toLocaleString('th-TH')}`;
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
  /** @param s ก้อนต้นทุนตอนเริ่มแก้ช่องนี้ (focus) */
  set?: (b: CostBlock, v: number, s?: CostBlock) => CostBlock;
  /** เงินแผ่นดิน — ไม่นับในกลุ่มไม่รวมเงินแผ่นดิน */
  govOnly?: boolean;
  highlight?: boolean;
  /** แก้ได้แม้จำกัดสิทธิ์ (ผู้ปรับปรุงหลักสูตร/อาจารย์) — จำนวนนิสิต */
  basic?: boolean;
  /** แสดงเฉพาะตอนจำกัดสิทธิ์ (basicOnly) */
  basicOnlyRow?: boolean;
  /** หมวดต้นทุนผันแปร — แก้ได้เมื่อเปิด editVariable (หน้าปรับปรุงหลักสูตร) */
  variable?: boolean;
  /** แถวสรุปคุ้มทุน/ไม่คุ้มทุน — แสดงเป็นป้ายแทนตัวเลข */
  status?: boolean;
}

export interface CostColumn {
  key: string;
  title: string;
  block: CostBlock;
  result: BlockResult;
  editable?: boolean;
  /** บรรทัดเล็กใต้หัวคอลัมน์ (เช่น "อ้างอิงจาก: …") — แสดงเป็น tooltip ด้วย */
  subtitle?: string;
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
  /** ตารางเต็มแบบแท็บ 4 แต่แก้ได้เฉพาะแถว basic (จำนวนนิสิต · ค่าธรรมเนียมต่อคนต่อปี) */
  basicOnly?: boolean;
  /** basicOnly + แก้ต้นทุนผันแปรรายหมวดได้ด้วย (ปรับปรุงหลักสูตร มติ 25 ต.ค.) */
  editVariable?: boolean;
  /** basicOnly + แก้ได้ทุกแถว (เปิดหลักสูตรใหม่แบบ Freestyle มติ 26 ต.ค.) */
  editAll?: boolean;
  /** แสดงอย่างเดียว (ผลยืนยันแล้ว) */
  readOnly?: boolean;
  /** เทอม/ปี และจำนวนปี — แสดงค่าธรรมเนียมต่อภาค/ต่อปี/ตลอดหลักสูตร (ไม่ส่ง = แสดงเฉพาะต่อปี) */
  semesters?: number;
  years?: number;
}

const ALLOC_ADJ = 'allocAdj';

const setArr = (k: 'fix' | 'var', i: number) => (b: CostBlock, v: number) => ({
  ...b,
  [k]: b[k].map((x, j) => (j === i ? v : x)),
});

/** ค่าธรรมเนียมต่อคน 3 แบบ — รายได้ค่าธรรมเนียม (2.2) = อัตราต่อคนต่อปี × Q · แก้ช่องไหนก็แปลงกลับเป็นต่อปี */
const feeLines = (semesters?: number, years?: number): Line[] => {
  const perYear = (b: CostBlock) => (b.q > 0 ? b.income / b.q : null);
  const setYear = (b: CostBlock, v: number) => (b.q > 0 ? { ...b, income: v * b.q } : b);
  const line = (label: string, unit: string, k: number): Line => ({
    label,
    get: (b) => {
      const y = perYear(b);

      return y === null ? null : y * k;
    },
    unit,
    depth: 2,
    basic: true,
    basicOnlyRow: true,
    set: (b, v) => setYear(b, v / k),
  });

  return [
    ...(semesters && semesters > 0
      ? [line('- ค่าธรรมเนียมการศึกษาต่อคนต่อภาค', 'บาท/คน/ภาค', 1 / semesters)]
      : []),
    line('- ค่าธรรมเนียมการศึกษาต่อคนต่อปี', 'บาท/คน/ปี', 1),
    ...(years && years > 0
      ? [line(`- ค่าธรรมเนียมการศึกษาต่อคนตลอดหลักสูตร (${years} ปี)`, 'บาท/คน', years)]
      : []),
  ];
};

const linesOf = (semesters?: number, years?: number): Line[] => [
  {
    no: 1,
    label: 'จำนวนนักศึกษาจริง : คน (Q)',
    get: (b) => b.q,
    unit: 'คน',
    depth: 0,
    basic: true,
    // TR = Q × R และ TVC = Q × AVC — ปรับรายได้/ต้นทุนผันแปรตามสัดส่วน Q ให้ R และ AVC คงเดิม
    // (ค่าธรรมเนียมรายการหลัก/หักสมทบ คิดต่อหัว × Q ใน manualBlockOf ของ ScenarioProgramView)
    // เทียบกับค่าตอนเริ่มแก้ช่อง (s) ไม่ใช่ทีละปุ่ม — พิมพ์ 5→58→580 หรือลบจนว่างแล้วค่าไม่เพี้ยน
    // s.q = 0 (ยังไม่มี R/AVC ให้คงไว้ เช่นกรอกรายได้ก่อน Q) → ไม่ปรับ
    set: (b, v, s = b) => scaleQ(b, v, s),
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
    label: '2.2 งบประมาณเงินรายได้ (ค่าธรรมเนียมการศึกษา)',
    get: (b) => b.income,
    unit: 'บาท',
    depth: 1,
    // จำกัดสิทธิ์ (basicOnly) — แสดงเฉยๆ ไม่ให้กรอก
    set: (b, v) => ({ ...b, income: v }),
  },
  // จำลองปรับค่าธรรมเนียม — ต่อภาค / ต่อปี / ตลอดหลักสูตร
  ...feeLines(semesters, years),
  { label: 'รายได้ต่อหน่วย : คน (R)', get: (_, r) => r.r, unit: 'บาท/คน', depth: 1 },
  {
    no: 3,
    label: 'ต้นทุนรวม (Total Cost : TC)',
    get: (_, r) => r.tc,
    unit: 'บาท',
    depth: 0,
  },
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
    variable: true,
  })),
  {
    label: '- ศึกษาทั่วไป',
    get: (b) => b.genEd,
    unit: 'บาท',
    depth: 2,
    set: (b, v) => ({ ...b, genEd: v }),
    variable: true,
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
    label: 'จำนวนนิสิต ณ จุดคุ้มทุน (Q)',
    get: (_, r) => r.qStar,
    unit: 'คน',
    depth: 0,
    highlight: true,
  },
  { no: 5, label: 'รายได้ ณ จุดคุ้มทุน', get: (_, r) => r.beRevenue, unit: 'บาท', depth: 0 },
  {
    label: 'Diff (นิสิตจริง − นิสิต ณ จุดคุ้มทุน)',
    get: (_, r) => r.diff,
    unit: 'คน',
    depth: 0,
    highlight: true,
  },
  {
    label: 'ผลการคุ้มทุน',
    get: (_, r) => r.diff,
    unit: '',
    depth: 0,
    status: true,
  },
];

const lineKey = (l: Line) => l.id ?? l.label;

/** หมวดรายจ่ายใต้ข้อ 3 (ต้นทุนรวม) — หุบได้ ให้เห็นส่วนบน (Q/รายได้) กับส่วนล่าง (จุดคุ้มทุน) ในจอเดียว */
const COST_DETAIL = (() => {
  const all = linesOf();

  return new Set(
    all
      .slice(
        all.findIndex((l) => l.no === 3),
        all.findIndex((l) => l.no === 4),
      )
      .filter((l) => l.depth === 2)
      .map(lineKey),
  );
})();

/** สถานะคุ้มทุนของคอลัมน์ — Q ≥ Q* = คุ้มทุน · Q* ติดลบ/หาไม่ได้ = ไม่มีจุดคุ้มทุน */
const statusOf = (r: BlockResult) =>
  r.qStar === null || r.qStar < 0 || r.diff === null
    ? { ok: false, title: 'ไม่มีจุดคุ้มทุน', detail: '' }
    : r.diff > 0
      ? { ok: true, title: 'คุ้มทุน', detail: `เกิน ${fmt(r.diff)} คน` }
      : r.diff === 0
        ? { ok: true, title: 'คุ้มทุน', detail: 'พอดีจุดคุ้มทุน' }
        : { ok: false, title: 'ยังไม่คุ้มทุน', detail: `ขาด ${fmt(-r.diff)} คน` };

/**
 * ตารางรายการแบบแท็บ 4 (ลำดับ · รายการ · จำนวน · หน่วย) — แยกกลุ่มกรณีรวม/ไม่รวมเงินแผ่นดิน
 * แต่ละกลุ่ม: อ้างอิงหลักสูตรเดิม | กำหนดเอง | ผลต่าง
 */
const CostBlockTable = ({
  groups,
  onChange,
  showAllocAdj = false,
  basicOnly = false,
  editVariable = false,
  editAll = false,
  readOnly = false,
  semesters,
  years,
}: Props) => {
  const editStart = useRef<CostBlock | null>(null);
  // แก้ได้เฉพาะ Q/ค่าธรรมเนียม → หุบหมวดรายจ่ายไว้ก่อน · กรอกต้นทุนเองต้องเห็นช่องกรอกทุกหมวด
  const [costOpen, setCostOpen] = useState(!basicOnly || editAll);
  const lines = linesOf(semesters, years).filter(
    (l) =>
      (basicOnly || !l.basicOnlyRow) &&
      (showAllocAdj || l.id !== ALLOC_ADJ) &&
      (costOpen || !COST_DETAIL.has(lineKey(l))),
  );
  const nCols = groups.reduce((a, g) => a + g.cols.length, 0);
  // คอลัมน์ตัวเลข (รวมผลต่าง) กว้างเท่ากันและคงที่ — table-layout: fixed กันช่องยืด/หดตามตัวเลขที่พิมพ์
  const nValueCols = groups.reduce((a, g) => a + g.cols.length + (g.cols.length === 2 ? 1 : 0), 0);
  const valueWidth = nCols > 2 ? 140 : 180;
  const anyNegative = groups.some((g) =>
    g.cols.some((c) => c.result.qStar !== null && c.result.qStar < 0),
  );

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
      <Table
        size="small"
        sx={{
          tableLayout: 'fixed',
          minWidth: 48 + 240 + 64 + nValueCols * valueWidth,
          ...gridTableSx,
          // แบบจำกัดสิทธิ์: แถวเตี้ยลง ตารางเต็มแบบแท็บ 4 จะได้ไม่ยาวเกินไป
          // (คีย์ซ้ำกับ gridTableSx — ต้องรวมเส้นไว้ด้วย ไม่งั้นเส้นตารางหาย)
          ...(basicOnly && {
            '& th, & td': { ...gridTableSx['& th, & td'], py: 1.25, px: 2, fontSize: '0.875rem' },
            '& thead th': { ...gridTableSx['& thead th'], fontSize: '0.875rem' },
          }),
        }}
      >
        <colgroup>
          <col style={{ width: 48 }} />
          <col />
          {Array.from({ length: nValueCols }, (_, i) => (
            <col key={i} style={{ width: valueWidth }} />
          ))}
          <col style={{ width: 64 }} />
        </colgroup>
        <TableHead>
          <TableRow>
            <TableCell rowSpan={2}>ลำดับ</TableCell>
            <TableCell rowSpan={2}>รายการ</TableCell>
            {groups.map((g) => (
              <TableCell
                key={g.key}
                align="center"
                colSpan={g.cols.length + (g.cols.length === 2 ? 1 : 0)}
                sx={{ fontWeight: 800, color: `${g.color}.dark` }}
              >
                {g.title}
              </TableCell>
            ))}
            <TableCell rowSpan={2}>หน่วย</TableCell>
          </TableRow>
          <TableRow>
            {groups.map((g) => [
              ...g.cols.map((c) => (
                <TableCell key={`${g.key}-${c.key}`} align="right" title={c.subtitle}>
                  {c.editable && !readOnly ? `✎ ${c.title}` : c.title}
                  {c.subtitle && (
                    <Box
                      component="span"
                      sx={{
                        display: 'block',
                        fontSize: 11,
                        fontWeight: 400,
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.subtitle}
                    </Box>
                  )}
                </TableCell>
              )),
              g.cols.length === 2 && (
                <TableCell key={`${g.key}-diff`} align="right">
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
              sx={
                l.depth === 0 ? { bgcolor: (t) => alpha(t.palette.primary.main, 0.05) } : undefined
              }
            >
              <TableCell sx={{ fontWeight: 700 }}>{l.no ?? ''}</TableCell>
              <TableCell sx={{ pl: 2 + l.depth * 2, fontWeight: l.depth < 2 ? 700 : 400 }}>
                {l.no === 3 ? (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setCostOpen((o) => !o)}
                    aria-expanded={costOpen}
                    sx={{
                      all: 'unset',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      '&:focus-visible': { outline: 2, outlineColor: 'primary.main' },
                    }}
                  >
                    <i
                      className={costOpen ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'}
                      style={{ fontSize: 18 }}
                    />
                    {l.label}
                    <Box
                      component="span"
                      sx={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: 'primary.main',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {costOpen
                        ? 'ซ่อนรายหมวด'
                        : !readOnly && editAll
                          ? 'ดูรายหมวด / แก้ต้นทุน'
                          : !readOnly && editVariable
                            ? 'ดูรายหมวด / แก้ต้นทุนผันแปร'
                            : 'ดูรายหมวด'}
                    </Box>
                  </Box>
                ) : (
                  l.label
                )}
                {l.no === 4 && anyNegative && (
                  <Chip
                    size="small"
                    color="warning"
                    label="R ≤ AVC — ยิ่งรับนิสิตยิ่งขาดทุน"
                    sx={{ ml: 1, height: 18, fontSize: 10 }}
                  />
                )}
              </TableCell>
              {l.status
                ? groups.map((g) => {
                    const sts = g.cols.map((c) => statusOf(c.result));

                    return [
                      ...g.cols.map((c, ci) => (
                        <TableCell key={`${g.key}-${c.key}`} align="right">
                          <Chip
                            size="small"
                            variant="tonal"
                            color={sts[ci]!.ok ? 'success' : 'error'}
                            icon={
                              <i
                                className={
                                  sts[ci]!.ok ? 'ri-checkbox-circle-fill' : 'ri-close-circle-fill'
                                }
                              />
                            }
                            label={sts[ci]!.title}
                            // จำนวนที่เกิน/ขาดเห็นในแถว Diff ด้านบนแล้ว — ไว้ใน tooltip ไม่กินความสูงแถว
                            title={sts[ci]!.detail || undefined}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                      )),
                      g.cols.length === 2 && (
                        <TableCell
                          key={`${g.key}-diff`}
                          align="right"
                          sx={{
                            fontSize: 12,
                            fontWeight: 700,
                            color:
                              sts[0]!.ok === sts[1]!.ok
                                ? 'text.disabled'
                                : sts[1]!.ok
                                  ? 'success.main'
                                  : 'error.main',
                          }}
                        >
                          {sts[0]!.ok === sts[1]!.ok
                            ? 'คงเดิม'
                            : sts[1]!.ok
                              ? '▲ กลายเป็นคุ้มทุน'
                              : '▼ กลายเป็นไม่คุ้มทุน'}
                        </TableCell>
                      ),
                    ];
                  })
                : groups.map((g) => {
                    const excluded = !!l.govOnly && g.mode === 'without_government';
                    // ไม่นับเงินแผ่นดิน → แสดง "—" ทั้งค่าและผลต่าง
                    const values = g.cols.map((c) => (excluded ? null : l.get(c.block, c.result)));
                    const d =
                      g.cols.length === 2 && values[0] !== null && values[1] !== null
                        ? values[1]! - values[0]!
                        : null;

                    return [
                      ...g.cols.map((c, ci) => {
                        const v = values[ci]!;
                        const negative = c.result.qStar !== null && c.result.qStar < 0;
                        const input =
                          !readOnly &&
                          c.editable &&
                          l.set &&
                          !excluded &&
                          (!basicOnly || editAll || l.basic || (editVariable && l.variable));

                        return (
                          <TableCell
                            key={`${g.key}-${c.key}`}
                            align="right"
                            title={excluded ? 'ไม่นับในกรณีไม่รวมเงินแผ่นดิน' : undefined}
                            sx={{ py: input ? 0.25 : undefined }}
                          >
                            {input ? (
                              <NumberTextField
                                size="small"
                                value={Math.round(v ?? 0)}
                                onFocus={() => (editStart.current = c.block)}
                                onBlur={() => (editStart.current = null)}
                                onChange={(x) =>
                                  onChange(
                                    g.mode,
                                    l.set!(c.block, x, editStart.current ?? undefined),
                                  )
                                }
                                slotProps={{
                                  htmlInput: {
                                    style: { textAlign: 'right', paddingTop: 4, paddingBottom: 4 },
                                    'aria-label': `${g.title} ${c.title} ${l.id ?? l.label}`,
                                  },
                                }}
                                sx={editInputSx}
                              />
                            ) : (
                              <Box
                                component="span"
                                sx={{
                                  fontWeight: l.depth < 2 ? 700 : 400,
                                  color: colorOf(l, v, negative, excluded),
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
                                : d > 0
                                  ? 'success.main'
                                  : 'error.main',
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
