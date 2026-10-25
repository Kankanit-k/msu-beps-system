'use client';

// W7 (2) — ปรับปรุงหลักสูตรเดิมแบบหน้าเดียว: เลือกหลักสูตร → วิธีปันส่วน → ปรับ 3 ทาง (ค่าเทอม/นิสิต/ต้นทุนผันแปร)
// แบบกรอกเอง หรือใช้ค่าที่ระบบคำนวณให้คุ้มทุน → เทียบ Q* ปัจจุบันกับหลังปรับปรุงทันที (สูตรแท็บ 4 เดียวกับ /scenario/program)

import { useEffect, useMemo, useState } from 'react';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import Snackbar from '@mui/material/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { RevenueMode } from '@beps/calc-engine';

import { DotTitle } from '@components/ChartBits';
import NumberTextField from '@components/NumberTextField';
import { RAW } from '@/data/mockup';
import type { ProgRow } from '@/data/mockup';
import { REVENUE_MODE_LABEL } from '@views/breakeven/calc';
import { lockedFacultyFor } from '@/configs/accessControl';
import { useRole } from '@/hooks/useRole';

import BreakEvenChart from './BreakEvenChart';
import FixedCostAllocationCard from './FixedCostAllocationCard';
import {
  applyLevers,
  blockFromProgram,
  blockResult,
  emptyBlock,
  FIXED_CATS,
  leversOf,
  leverTargets,
  MAIN_FEE_RATE,
  UNI_SHARE_RATE,
  VARIABLE_CATS,
  withPerHeadCharges,
  type BlockResult,
  type CostBlock,
  type Levers,
} from './newProgramCalc';
import { EDUCATION_LEVELS, PG_DATA, progOptionLabel } from './programData';
import ProgramPicker from './steps/ProgramPicker';
import { useFacultyAllocation } from './useFacultyAllocation';

const MODES: RevenueMode[] = ['with_government', 'without_government'];
const fmt = (v: number | null) =>
  v === null || !Number.isFinite(v) ? '—' : Math.round(v).toLocaleString('th-TH');
/** ผลต่างจากปัจจุบัน — ว่างเมื่อไม่เปลี่ยน */
const fmtDiff = (after: number | null, before: number | null) => {
  if (after === null || before === null) return null;
  const d = Math.round(after) - Math.round(before);

  return d === 0 ? null : `${d > 0 ? '+' : ''}${d.toLocaleString('th-TH')}`;
};

/* ---------- ร่าง — กันตัวเลขที่ลองกรอกหายเมื่อรีโหลด ---------- */
const DRAFT_KEY = 'beps.scenario-program2.draft';
const refKeyOf = (p: ProgRow) => `${p.fac}|${p.lvl}|${p.prog}|${p.deg}`;

interface Draft {
  fac: string | null;
  level?: string;
  refKey: string | null;
  semesters: number;
  lever?: Levers;
}

const loadDraft = (): Draft | null => {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);

    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
};

const saveDraft = (d: Draft | null) => {
  try {
    if (d) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // โหมดส่วนตัว/พื้นที่เต็ม — ยังคำนวณได้ แค่ไม่จำร่าง
  }
};

/** ช่องกรอกตัวเลขพร้อมหน่วย */
const Num = (props: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  unit?: string;
  helper?: string;
  /** ตัวเลขปัจจุบันของหลักสูตร — แสดงใต้ช่องเมื่อแก้ต่างไปจากเดิม */
  base?: number;
}) => {
  const changed = props.base !== undefined && Math.round(props.base) !== Math.round(props.value);

  return (
    <NumberTextField
      fullWidth
      size="small"
      label={props.label}
      value={Math.round(props.value)}
      onChange={props.onChange ?? (() => {})}
      disabled={!props.onChange}
      color={changed ? 'warning' : undefined}
      focused={changed || undefined}
      helperText={changed ? `ปัจจุบัน ${fmt(props.base!)} ${props.unit ?? 'บาท'}` : props.helper}
      slotProps={{
        htmlInput: { style: { textAlign: 'right' } },
        input: {
          endAdornment: (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {props.unit ?? 'บาท'}
            </Typography>
          ),
        },
      }}
    />
  );
};

interface CostRow {
  label: string;
  value: number;
  /** ค่าเดิม — มีเฉพาะแถวที่ขยับตามจำนวนนิสิต */
  base?: number;
  note?: string;
}

/** ต้นทุนแบบอ่านอย่างเดียว (มาจากข้อมูลงบประมาณตามชีต) — ซ่อนหมวดที่เป็น 0 */
const CostList = (props: { title: string; color: string; total: number; rows: CostRow[] }) => (
  <Card>
    <CardHeader
      title={<DotTitle color={props.color}>{props.title}</DotTitle>}
      subheader={
        <Chip
          size="small"
          variant="outlined"
          icon={<i className="ri-lock-line" />}
          label="จากข้อมูลงบประมาณ"
          sx={{ mt: 1 }}
        />
      }
      action={
        <Typography fontWeight={700} sx={{ mr: 2, mt: 1 }}>
          รวม {fmt(props.total)} บาท
        </Typography>
      }
    />
    <CardContent>
      <Table size="small">
        <TableBody>
          {props.rows
            .filter((r) => Math.round(r.value) !== 0 || (r.base ?? 0) !== 0)
            .map((r) => {
              const d = r.base === undefined ? null : fmtDiff(r.value, r.base);

              return (
                <TableRow key={r.label}>
                  <TableCell sx={{ pl: 0 }}>
                    {r.label}
                    {r.note && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {r.note}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ pr: 0, color: r.value < 0 ? 'error.main' : undefined }}
                  >
                    {fmt(r.value)}
                    {d && (
                      <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                        {d}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

const COLOR: Record<RevenueMode, 'primary' | 'warning'> = {
  with_government: 'primary',
  without_government: 'warning',
};

/** สถานะเทียบนิสิตจริงกับจุดคุ้มทุน */
const statusOf = (
  r: BlockResult,
): { color: 'default' | 'warning' | 'success' | 'error'; text: string } => {
  if (r.qStar === null || r.tr <= 0)
    return { color: 'default', text: 'กรอกจำนวนนิสิตและรายได้ก่อน' };
  if (r.qStar < 0)
    return {
      color: 'warning',
      text: 'รายได้ต่อคนต่ำกว่าต้นทุนผันแปรต่อคน — ยิ่งรับนิสิตเพิ่มยิ่งขาดทุน',
    };
  const diff = r.diff ?? 0;
  const now = `ตอนนี้มีนิสิต ${fmt(r.qStar + diff)} คน`;

  if (diff === 0) return { color: 'success', text: `${now} — คุ้มทุนพอดี` };

  return diff > 0
    ? { color: 'success', text: `${now} — คุ้มทุนแล้ว เกินมา ${fmt(diff)} คน` }
    : { color: 'error', text: `${now} — ยังไม่คุ้มทุน ต้องรับเพิ่มอีก ${fmt(-diff)} คน` };
};

/** Q* เดิม เทียบ Q* ใหม่ เป็นประโยคอ่านง่าย */
const compareText = (after: number | null, before: number | null): string => {
  if (before === null) return '';
  if (before < 0) return 'ก่อนปรับปรุง: รับนิสิตเพิ่มเท่าไรก็ไม่คุ้มทุน';
  const was = `ก่อนปรับปรุงต้องมี ${fmt(before)} คน`;
  if (after === null || after < 0) return was;
  const d = after - before;

  return d === 0
    ? `${was} (เท่าเดิม)`
    : `${was} — ${d < 0 ? 'ลดลง' : 'เพิ่มขึ้น'} ${fmt(Math.abs(d))} คน`;
};

const RESULT_ROWS: { label: string; get: (r: BlockResult) => number | null; bold?: boolean }[] = [
  { label: 'รายได้รวม (TR)', get: (r) => r.tr, bold: true },
  { label: 'รายได้ต่อคน (R)', get: (r) => r.r },
  { label: 'ต้นทุนคงที่ (TFC)', get: (r) => r.tfc },
  { label: 'ต้นทุนผันแปร (TVC)', get: (r) => r.tvc },
  { label: 'ต้นทุนผันแปรต่อคน (AVC)', get: (r) => r.avc },
  { label: 'ต้นทุนรวม (TC)', get: (r) => r.tc, bold: true },
  { label: 'กำไร/ขาดทุน (TR − TC)', get: (r) => r.tr - r.tc, bold: true },
  { label: 'รายได้ ณ จุดคุ้มทุน', get: (r) => r.beRevenue },
];

/** ผลจุดคุ้มทุนหลังปรับปรุง กรณีรวม/ไม่รวมเงินแผ่นดินวางคู่กัน เทียบกับตัวเลขปัจจุบัน */
const ResultPanel = ({
  results,
  base,
}: {
  results: Record<RevenueMode, BlockResult>;
  base: Record<RevenueMode, BlockResult>;
}) => (
  <Card>
    <CardHeader
      title={<DotTitle color="success.main">4. จุดคุ้มทุน ก่อน–หลังปรับปรุง</DotTitle>}
      subheader="คำนวณใหม่ทันทีที่แก้ตัวเลข · ตัวเลขเล็ก = ผลต่างจากปัจจุบัน"
    />
    <CardContent>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {MODES.map((m) => {
          const r = results[m];
          const st = statusOf(r);

          return (
            <Grid key={m} size={6}>
              <Box
                sx={{
                  border: 2,
                  borderColor: `${COLOR[m]}.main`,
                  borderRadius: 1,
                  p: 2,
                  height: '100%',
                }}
              >
                <Typography variant="caption" fontWeight={800} color={`${COLOR[m]}.main`}>
                  {REVENUE_MODE_LABEL[m]}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  หลังปรับปรุง ต้องมีนิสิตอย่างน้อย
                </Typography>
                <Typography variant="h3" fontWeight={800}>
                  {r.tr > 0 && r.qStar !== null && r.qStar >= 0 ? fmt(r.qStar) : '—'}
                  <Typography component="span" variant="body1" sx={{ ml: 1 }}>
                    คน จึงจะคุ้มทุน
                  </Typography>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 1 }}
                >
                  {compareText(r.tr > 0 ? r.qStar : null, base[m].qStar)}
                </Typography>
                <Chip
                  size="small"
                  color={st.color}
                  label={st.text}
                  sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }}
                />
              </Box>
            </Grid>
          );
        })}
      </Grid>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ pl: 0 }}>บาท</TableCell>
            {MODES.map((m) => (
              <TableCell key={m} align="right" sx={{ color: `${COLOR[m]}.main`, fontWeight: 700 }}>
                {m === 'with_government' ? 'รวม' : 'ไม่รวม'}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {RESULT_ROWS.map((row) => (
            <TableRow key={row.label}>
              <TableCell sx={{ pl: 0, fontWeight: row.bold ? 700 : 400 }}>{row.label}</TableCell>
              {MODES.map((m) => {
                const v = row.get(results[m]);
                const d = fmtDiff(v, row.get(base[m]));

                return (
                  <TableCell
                    key={m}
                    align="right"
                    sx={{
                      fontWeight: row.bold ? 700 : 400,
                      color: v !== null && v < 0 ? 'error.main' : undefined,
                    }}
                  >
                    {fmt(v)}
                    {d && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', fontWeight: 400 }}
                      >
                        {d}
                      </Typography>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

const LEVER_ROWS: {
  key: keyof Levers;
  label: string;
  /** ข้อความเป้าหมาย · null = ทางนี้อย่างเดียวไปไม่ถึง */
  text: (v: number) => string;
  none: string;
}[] = [
  { key: 'fee', label: 'เพิ่มค่าเทอม', text: (v) => `≥ ${fmt(v)} บ./คน/ปี`, none: '—' },
  {
    key: 'q',
    label: 'รับนิสิตเพิ่ม',
    text: (v) => `≥ ${fmt(v)} คน`,
    none: 'R ≤ AVC — ยิ่งรับยิ่งขาดทุน',
  },
  { key: 'cut', label: 'ลดต้นทุนผันแปร', text: (v) => `≥ ${v}%`, none: 'ลดหมดก็ยังไม่คุ้มทุน' },
];

/** Optimize — ค่าที่ต้องปรับทางเดียวให้คุ้มทุน แยกกรณีรวม/ไม่รวมเงินแผ่นดิน พร้อมปุ่มใช้ค่านั้น */
const LeverSuggestions = (props: {
  base: CostBlock;
  lever: Levers;
  block: CostBlock;
  results: Record<RevenueMode, BlockResult>;
  onApply: (k: keyof Levers, v: number) => void;
}) => {
  const targets = Object.fromEntries(
    MODES.map((m) => [m, leverTargets(props.base, props.lever, props.block, props.results[m], m)]),
  ) as Record<RevenueMode, ReturnType<typeof leverTargets>>;

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ pl: 0 }}>ระบบแนะนำ (ปรับทางเดียว)</TableCell>
          {MODES.map((m) => (
            <TableCell key={m} align="right" sx={{ color: `${COLOR[m]}.main`, fontWeight: 700 }}>
              {REVENUE_MODE_LABEL[m]}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {LEVER_ROWS.map((row) => (
          <TableRow key={row.key}>
            <TableCell sx={{ pl: 0 }}>{row.label}</TableCell>
            {MODES.map((m) => {
              const profit = props.results[m].tr - props.results[m].tc;
              const v = targets[m][row.key];

              return (
                <TableCell
                  key={m}
                  align="right"
                  sx={{ pr: m === 'without_government' ? 0 : undefined }}
                >
                  {profit >= 0 ? (
                    <Typography variant="body2" color="success.main">
                      คุ้มทุนแล้ว
                    </Typography>
                  ) : v === null ? (
                    <Typography variant="caption" color="warning.main">
                      {row.none}
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 1,
                      }}
                    >
                      <Typography variant="body2">{row.text(v)}</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        color={COLOR[m]}
                        onClick={() => props.onApply(row.key, v)}
                      >
                        ใช้
                      </Button>
                    </Box>
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const QuickCalcView = () => {
  const [fac, setFac] = useState<string | null>(null);
  const [level, setLevel] = useState<string>(EDUCATION_LEVELS[0] ?? 'ปริญญาตรี');
  const [refProg, setRefProg] = useState<ProgRow | null>(null);
  const [semesters, setSemesters] = useState(2);
  const [lever, setLever] = useState<Levers>({ q: 0, fee: 0, cut: 0 });
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  /** วิธีปันส่วนที่คณะล็อกไว้ — ยังไม่ล็อก = ยังปรับปรุงหลักสูตรไม่ได้ */
  const {
    lock,
    facRows,
    facPool,
    refId,
    afterOutcome,
    adjOf,
  } = useFacultyAllocation(fac, refProg, lever.q);
  /** ผู้ดูแลคณะ/อาจารย์ทำได้เฉพาะคณะ (และหลักสูตร) ของตน */
  const { role, scope } = useRole();
  const scopedFac = lockedFacultyFor(role, scope);
  const scopedProg = role === 'lecturer' ? scope.program : null;

  // อ่านหลัง mount — อ่านตอน render แรกจะทำให้ SSR กับ client ไม่ตรงกัน
  useEffect(() => {
    const d = loadDraft();

    if (d) {
      const ref = RAW.PROGS.find((p) => refKeyOf(p) === d.refKey) ?? null;

      setFac(d.fac);
      // ร่างรุ่นก่อนไม่มีระดับ — ใช้ระดับของหลักสูตรที่เลือกไว้
      setLevel(ref?.lvl ?? d.level ?? EDUCATION_LEVELS[0] ?? 'ปริญญาตรี');
      setRefProg(ref);
      setSemesters(d.semesters);
      if (d.lever) setLever(d.lever);
      else if (ref) setLever(leversOf(blockFromProgram(ref)));
    }

    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (draftReady)
      saveDraft({
        fac,
        level,
        refKey: refProg ? refKeyOf(refProg) : null,
        semesters,
        lever,
      });
  }, [draftReady, fac, level, refProg, semesters, lever]);

  const facultyOptions = useMemo(
    () => (scopedFac ? [scopedFac] : PG_DATA.map((g) => g.faculty)),
    [scopedFac],
  );
  const progOptions = useMemo(
    () =>
      (PG_DATA.find((g) => g.faculty === fac)?.programs ?? []).filter(
        (p) => p.lvl === level && (!scopedProg || refKeyOf(p) === scopedProg),
      ),
    [fac, level, scopedProg],
  );

  // ปัจจุบัน = ตัวเลขจริงของหลักสูตรตามชีต (คอลัมน์ E แท็บ 4)
  const baseBlock = useMemo(() => (refProg ? blockFromProgram(refProg) : null), [refProg]);
  // ต้นทุนมาจากชีตเสมอ — ปรับได้แค่ 3 ทางตามที่ประชุมกำหนด (ค่าเทอม · จำนวนนิสิต · ลด % ต้นทุนผันแปร)
  // ค่าตั้งต้นได้ตัวเลขชีตเดิม · เปลี่ยนจำนวนภาคการศึกษา → ค่าธรรมเนียมรายการหลัก/หักสมทบ = อัตรา × Q × เทอม
  const leverBlock = baseBlock ? applyLevers(baseBlock, lever) : emptyBlock();
  const calcBlock = semesters === 2 ? leverBlock : withPerHeadCharges(leverBlock, semesters);

  const afterAdj = adjOf(true);

  const resultsOf = (b: CostBlock, adj: number) =>
    Object.fromEntries(MODES.map((m) => [m, blockResult(b, m, adj)])) as Record<
      RevenueMode,
      BlockResult
    >;
  const results = resultsOf(calcBlock, afterAdj);
  const base = baseBlock ? resultsOf(baseBlock, adjOf(false)) : null;

  const set = (k: keyof Levers, v: number) => setLever((l) => ({ ...l, [k]: v }));

  const changeFac = (v: string | null) => {
    setFac(v);
    pickProg(null);
  };

  const pickProg = (p: ProgRow | null) => {
    setRefProg(p);

    if (p) {
      setLever(leversOf(blockFromProgram(p)));
      setSemesters(2);
      setToast(`ดึงตัวเลขปัจจุบันของ ${progOptionLabel(p)} แล้ว — ปรับ 3 ทางด้านล่างได้เลย`);
    } else {
      setLever({ q: 0, fee: 0, cut: 0 });
    }
  };

  const resetToCurrent = () => {
    if (!baseBlock) return;
    setLever(leversOf(baseBlock));
    setSemesters(2);
    setToast('คืนค่าเป็นตัวเลขปัจจุบันของหลักสูตรแล้ว');
  };

  // ผู้ดูแลคณะ/อาจารย์: คณะถูกกำหนดตามบัญชี — ตั้งให้เอง และไม่ค้างคณะอื่นจากร่างเดิม
  useEffect(() => {
    if (draftReady && scopedFac && fac !== scopedFac) changeFac(scopedFac);
  }, [draftReady, scopedFac, fac]);

  const hasNumbers = calcBlock.q > 0 && calcBlock.gov + calcBlock.income > 0;
  const baseLever = baseBlock ? leversOf(baseBlock) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Typography variant="h5" fontWeight={700}>
            🛠️ ปรับปรุงหลักสูตร — คำนวณจุดคุ้มทุน
          </Typography>
          <Typography variant="body2" color="text.secondary">
            เลือกหลักสูตรเดิม แล้วปรับค่าเทอม จำนวนนิสิต หรือต้นทุนผันแปร (กรอกเอง
            หรือใช้ค่าที่ระบบแนะนำ) ผลจุดคุ้มทุนเทียบกับปัจจุบันทันที · Q* = ROUNDUP(TFC ÷ (R −
            AVC)) ตามแท็บ 4 ของไฟล์ Excel
          </Typography>
        </Box>
        <Button
          color="secondary"
          variant="outlined"
          disabled={!refProg}
          onClick={() => setConfirmClear(true)}
        >
          คืนค่าปัจจุบัน
        </Button>
      </Box>

      <Grid container spacing={4}>
        {/* ---------- ฝั่งกรอก ---------- */}
        <Grid size={{ xs: 12, lg: 7 }} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Card>
            <CardHeader
              title={<DotTitle color="info.main">1. เลือกหลักสูตรที่จะปรับปรุง</DotTitle>}
            />
            <CardContent>
              <ProgramPicker
                facultyOptions={facultyOptions}
                fac={fac}
                onFacChange={changeFac}
                level={level}
                onLevelChange={(v) => {
                  setLevel(v);
                  pickProg(null);
                }}
                semesters={semesters}
                onSemestersChange={setSemesters}
                refOptions={progOptions}
                refProg={refProg}
                onRefChange={pickProg}
                refLabel="หลักสูตร"
                refRequired
                compact
                refHint="ดึงต้นทุน งบประมาณ และจำนวนนิสิตปัจจุบันของหลักสูตรนี้"
              />
            </CardContent>
          </Card>

          {/* คณะยังไม่ตั้งวิธีปันส่วนก็คำนวณได้ — ใช้ค่าปีก่อน/ตาม Excel (มติ 25 ต.ค.) */}
          {!baseBlock || !lock ? (
            <Alert severity="info">
              เลือกคณะและหลักสูตรที่จะปรับปรุงก่อน แล้วจึงปรับค่าเทอม จำนวนนิสิต และต้นทุนผันแปรได้
            </Alert>
          ) : (
            <>
              <FixedCostAllocationCard
                faculty={fac}
                isNew={false}
                hasRef
                lock={lock}
                pool={facPool}
                rows={facRows}
                outcome={afterOutcome}
                targetId={refId}
                targetLabel="หลักสูตรนี้"
                targetQ={lever.q}
                mode="with_government"
                compact
              />

              <Card>
                <CardHeader
                  title={<DotTitle color="primary.main">3. ปรับให้คุ้มทุน</DotTitle>}
                  subheader="กรอกเอง (Manual) หรือกด “ใช้” ค่าที่ระบบคำนวณให้ (Optimize) · ผสมหลายทางได้"
                />
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Num
                        base={baseLever!.fee}
                        label="ค่าเทอม (เงินรายได้ต่อคน)"
                        unit="บ./คน/ปี"
                        value={lever.fee}
                        onChange={(v) => set('fee', v)}
                        helper="งบเงินรายได้ ÷ จำนวนนิสิต"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Num
                        base={baseLever!.q}
                        label="จำนวนนิสิตที่รับ (Q)"
                        unit="คน"
                        value={lever.q}
                        onChange={(v) => set('q', v)}
                        helper="เงินแผ่นดินและต้นทุนผันแปรขยับตามจำนวนคน"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Num
                        base={0}
                        label="ลดต้นทุนผันแปร"
                        unit="%"
                        value={lever.cut}
                        onChange={(v) => set('cut', Math.min(100, v))}
                        helper="เฉพาะหมวดผันแปรของหลักสูตร"
                      />
                    </Grid>
                  </Grid>
                  <LeverSuggestions
                    base={baseBlock}
                    lever={lever}
                    block={calcBlock}
                    results={results}
                    onApply={(k, v) => {
                      set(k, v);
                      setToast(
                        `ใช้ค่าที่ระบบแนะนำแล้ว — ${LEVER_ROWS.find((r) => r.key === k)!.label}`,
                      );
                    }}
                  />
                </CardContent>
              </Card>

              <CostList
                title="ต้นทุนคงที่ (TFC)"
                color="error.main"
                total={results.with_government.tfc}
                rows={[
                  ...FIXED_CATS.map((c, i) => ({ label: c, value: baseBlock.fix[i] ?? 0 })),
                  { label: 'ค่าเสื่อม', value: baseBlock.dep },
                  {
                    label: 'ปรับส่วนแบ่งส่วนกลางคณะ',
                    value: afterAdj,
                    note: 'ตามวิธีที่คณะล็อก',
                  },
                ]}
              />

              <CostList
                title="ต้นทุนผันแปร (TVC)"
                color="warning.main"
                total={results.with_government.tvc}
                rows={[
                  ...VARIABLE_CATS.map((c, i) => ({
                    label: c,
                    value: calcBlock.var[i] ?? 0,
                    base: baseBlock.var[i] ?? 0,
                  })),
                  { label: 'ศึกษาทั่วไป', value: calcBlock.genEd, base: baseBlock.genEd },
                  {
                    label: 'ค่าธรรมเนียมรายการหลัก',
                    value: calcBlock.mainFee,
                    base: baseBlock.mainFee,
                    note: `${MAIN_FEE_RATE.toLocaleString('th-TH')} บ./คน/เทอม`,
                  },
                  {
                    label: 'หักสมทบมหาวิทยาลัย',
                    value: calcBlock.uniShare,
                    base: baseBlock.uniShare,
                    note: `${UNI_SHARE_RATE.toLocaleString('th-TH')} บ./คน/เทอม`,
                  },
                ]}
              />
            </>
          )}
        </Grid>

        {/* ---------- ฝั่งผลลัพธ์ — ติดจอขณะเลื่อนกรอก ---------- */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Box
            sx={{
              position: { lg: 'sticky' },
              top: { lg: 80 },
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {lock && afterOutcome && !afterOutcome.applied && (
              <Alert severity="warning">
                วิธีปันส่วนที่คณะล็อกไว้ใช้กับหลักสูตรนี้ไม่ได้ — ผลด้านล่างยังใช้ส่วนแบ่งตามชีต
              </Alert>
            )}
            {base && lock ? (
              <ResultPanel results={results} base={base} />
            ) : (
              <Card>
                <CardHeader
                  title={<DotTitle color="success.main">ผลจุดคุ้มทุนหลังปรับปรุง</DotTitle>}
                />
                <CardContent>
                  <Alert severity="info">เลือกหลักสูตรที่จะปรับปรุงเพื่อดูผลเทียบกับปัจจุบัน</Alert>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader
                title={<DotTitle color="primary.main">กราฟจุดคุ้มทุน</DotTitle>}
                subheader="รายได้รวม/ต้นทุนรวม ตามจำนวนนิสิต"
              />
              <CardContent>
                {hasNumbers && lock ? (
                  <BreakEvenChart
                    cases={MODES.map((m) => ({
                      mode: m,
                      q: calcBlock.q,
                      tfc: results[m].tfc,
                      avc: results[m].avc ?? 0,
                      rPerHead: results[m].r ?? 0,
                      qStar: results[m].qStar,
                    }))}
                  />
                ) : (
                  <Alert severity="info">
                    เลือกหลักสูตรที่จะปรับปรุง (และมีจำนวนนิสิต/งบประมาณ) เพื่อแสดงกราฟ
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
        <DialogTitle>คืนค่าเป็นตัวเลขปัจจุบัน?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ตัวเลขที่แก้ไว้ทั้งหมดจะกลับเป็นตัวเลขปัจจุบันของหลักสูตร ย้อนกลับไม่ได้
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClear(false)}>ยกเลิก</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              resetToCurrent();
              setConfirmClear(false);
            }}
          >
            คืนค่าปัจจุบัน
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </Box>
  );
};

export default QuickCalcView;
