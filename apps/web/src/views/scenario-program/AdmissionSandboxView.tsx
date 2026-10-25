'use client';

/**
 * ห้องจำลองแผนรับนิสิต (/scenario/sandbox) — ทุกบทบาทจำลองและบันทึกได้ ออกรายงานได้เฉพาะ canExportReport
 *
 * เลือกหลักสูตร → กรอกจำนวนรับรายกลุ่ม → เห็นจุดคุ้มทุนสองกรณี + สามทางไปจุดคุ้มทุน + ความเสี่ยงรับไม่เต็มแผน
 * สูตรไม่เขียนใหม่: ตารางสัดส่วนนิสิตแท็บ 4 (mixResult) · TFC ตามวิธีปันส่วนที่คณะล็อก (useFacultyAllocation
 * ตัวเดียวกับ /scenario/program2) · AVC ต่อหัวตามชีต
 */

import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

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
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import type { RevenueMode } from '@beps/calc-engine';

import { DotTitle } from '@components/ChartBits';
import NumberTextField from '@components/NumberTextField';
import { MOCK_RUN } from '@components/PageHeaderBar';
import { canExportReport, lockedFacultyFor } from '@/configs/accessControl';
import { RAW } from '@/data/mockup';
import type { ProgRow } from '@/data/mockup';
import { useRole } from '@/hooks/useRole';
import { REVENUE_MODE_LABEL } from '@views/breakeven/calc';
import { feesForProgram } from '@views/tuition/feeData';

import {
  blockFromProgram,
  blockResult,
  mixResult,
  type MixResult,
  type Segment,
} from './newProgramCalc';
import { DEFAULT_LEVEL, PG_DATA, progOptionLabel } from './programData';
import SandboxPlansCard from './SandboxPlansCard';
import {
  loadDraft,
  loadPlans,
  saveDraft,
  savePlans,
  type SandboxPlan,
} from './sandboxStore';
import { buildSegments, scaleSegs } from './segments';
import ProgramPicker from './steps/ProgramPicker';
import { useFacultyAllocation } from './useFacultyAllocation';

const MODES: RevenueMode[] = ['with_government', 'without_government'];
const refKeyOf = (p: ProgRow) => `${p.fac}|${p.lvl}|${p.prog}|${p.deg}`;
const fmt = (v: number) => (Math.round(v) || 0).toLocaleString('th-TH');
const mb = (v: number) =>
  `${v < 0 ? '−' : ''}${(Math.abs(v) / 1e6).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ล้าน`;
const sumN = (segs: Segment[]) => segs.reduce((a, s) => a + s.n, 0);
/** รายรับต่อหัวต่อปี − AVC = ส่วนเกินที่นิสิตหนึ่งคนในกลุ่มนี้ช่วยปิดต้นทุนคงที่ */
const cmOf = (s: Segment, avc: number, m: RevenueMode) =>
  (s.fee + (m === 'with_government' ? s.gov : 0)) * s.semesters - avc;
const offered = (s: Segment) => s.fee + s.gov > 0;
/** ไล่หาจุดคุ้มทุนได้ไกลสุดกี่คน — ต้นทุนคงที่ต้องคิดใหม่ทุกจำนวน จึงต้องมีเพดาน */
const MAX_SCAN = 3000;
/** ไล่ทีละ STEP ก่อนแล้วค่อยละเอียดทีละคน — ลดการปันส่วนใหม่ลง ~10 เท่า ไม่ให้พิมพ์แล้วหน่วง */
const STEP = 10;
/** Q* ใช้ได้เมื่อเป็นบวก — ROUNDUP แบบชีตติดลบได้เมื่อรายได้ต่อหัวต่ำกว่าต้นทุนผันแปร */
const validQStar = (r: MixResult) => (r.qStar !== null && r.qStar > 0 ? r.qStar : null);

type LeverAction =
  | { kind: 'heads'; q: number }
  | { kind: 'fee'; perSem: number }
  | { kind: 'mix'; from: number; to: number; n: number };

interface LeverView {
  title: string;
  value: string;
  note: string;
  action?: LeverAction;
}

/**
 * สามทางไปจุดคุ้มทุน (ขาดทุน) หรือระยะเผื่อ (คุ้มทุนแล้ว) ของกรณีที่เลือก
 * @param target จำนวนรับรวมที่กำไร ≥ 0 จริงเมื่อคิดต้นทุนคงที่ใหม่ตามวิธีปันส่วนของคณะ
 *   (ขาดทุน = จำนวนน้อยสุดที่ถึงจุดคุ้มทุน · คุ้มทุน = จำนวนต่ำสุดที่ยังไม่ขาดทุน · null = ไปไม่ถึง)
 */
function leversFor(
  segs: Segment[],
  r: MixResult,
  avc: number,
  m: RevenueMode,
  target: number | null,
): LeverView[] {
  const q = r.total.n;
  const profit = r.total.profit;
  const headSem = segs.reduce((a, s) => a + (s.fee > 0 ? s.n * s.semesters : 0), 0);

  if (profit >= 0) {
    return [
      {
        title: 'รับลดได้อีก',
        value: target === null ? '—' : `${fmt(q - target)} คน`,
        note: 'สัดส่วนกลุ่มเท่าเดิม ยังไม่ขาดทุน',
      },
      {
        title: 'ค่าธรรมเนียมลดได้',
        value: headSem > 0 ? `${fmt(Math.floor(profit / headSem / 10) * 10)} บาท/ภาค` : '—',
        note: 'ลดเท่ากันทุกกลุ่มที่เก็บค่าธรรมเนียม ยังไม่ขาดทุน',
      },
      {
        title: 'ต้นทุนคงที่เพิ่มได้',
        value: `${mb(profit)} บาท`,
        note: 'เช่น จ้างอาจารย์เพิ่ม ก่อนแตะจุดคุ้มทุน',
      },
    ];
  }

  const gap = -profit;
  const out: LeverView[] = [
    target !== null
      ? {
          title: 'รับเพิ่มในสัดส่วนเดิม',
          value: `+${fmt(target - q)} คน`,
          note: `รวมเป็น ${fmt(target)} คนต่อปี (คิดต้นทุนคงที่ที่ขยับตามวิธีปันส่วนของคณะแล้ว)`,
          action: { kind: 'heads', q: target },
        }
      : {
          title: 'รับเพิ่มในสัดส่วนเดิม',
          value: 'ไม่ได้ผล',
          note: `รับเพิ่มถึง ${fmt(MAX_SCAN)} คนก็ยังไม่คุ้มทุน — ส่วนเกินต่อหัวไม่พอกับต้นทุนคงที่ที่เพิ่มตามจำนวนนิสิต`,
        },
  ];

  if (headSem > 0) {
    const perSem = Math.ceil(gap / headSem / 10) * 10;

    out.push({
      title: 'ขึ้นค่าธรรมเนียม',
      value: `+${fmt(perSem)} บาท/ภาค`,
      note: 'เท่ากันทุกกลุ่มที่เก็บค่าธรรมเนียม ต้องผ่านประกาศค่าธรรมเนียม',
      action: { kind: 'fee', perSem },
    });
  } else {
    out.push({ title: 'ขึ้นค่าธรรมเนียม', value: '—', note: 'ยังไม่มีกลุ่มที่เก็บค่าธรรมเนียม' });
  }

  const idx = segs.map((s, i) => ({ s, i, cm: cmOf(s, avc, m) }));
  const best = idx
    .filter(({ s }) => offered(s))
    .reduce<(typeof idx)[number] | null>((a, x) => (!a || x.cm > a.cm ? x : a), null);
  const worst = idx
    .filter(({ s }) => s.n > 0)
    .reduce<(typeof idx)[number] | null>((a, x) => (!a || x.cm < a.cm ? x : a), null);

  if (best && worst && best.cm > worst.cm) {
    const n = Math.ceil(gap / (best.cm - worst.cm));

    out.push(
      n <= worst.s.n
        ? {
            title: 'ปรับสัดส่วนกลุ่ม',
            value: `ย้าย ${fmt(n)} คน`,
            note: `จาก${worst.s.label} ไป${best.s.label} จำนวนรับรวมเท่าเดิม`,
            action: { kind: 'mix', from: worst.i, to: best.i, n },
          }
        : {
            title: 'ปรับสัดส่วนกลุ่ม',
            value: 'ไม่พอ',
            note: `ย้าย${worst.s.label}ทั้งหมด ${fmt(worst.s.n)} คนไป${best.s.label} ยังไม่คุ้มทุน`,
          },
    );
  } else {
    out.push({
      title: 'ปรับสัดส่วนกลุ่ม',
      value: 'ไม่มีผล',
      note: 'ใส่ค่าธรรมเนียมให้กลุ่มอื่นก่อน จึงจะเทียบได้ว่าย้ายไปกลุ่มไหนคุ้มกว่า',
    });
  }

  return out;
}

const AdmissionSandboxView = () => {
  const { role, scope } = useRole();
  const scopedFac = lockedFacultyFor(role, scope);
  const scopedProg = role === 'lecturer' ? scope.program : null;

  const [fac, setFac] = useState<string | null>(null);
  const [level, setLevel] = useState(DEFAULT_LEVEL);
  const [refProg, setRefProg] = useState<ProgRow | null>(null);
  const [semesters, setSemesters] = useState(2);
  const [segs, setSegs] = useState<Segment[]>(() => buildSegments(DEFAULT_LEVEL, null, 2));
  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [plans, setPlans] = useState<SandboxPlan[]>([]);
  const [draftReady, setDraftReady] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // localStorage อ่านได้หลัง mount เท่านั้น
  useEffect(() => {
    const d = loadDraft();

    if (d) {
      setFac(d.fac);
      setLevel(d.level);
      setRefProg(RAW.PROGS.find((p) => refKeyOf(p) === d.refKey) ?? null);
      setSemesters(d.semesters);
      setSegs(d.segs);
    }

    void loadPlans().then(setPlans);
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (draftReady)
      saveDraft({ fac, level, refKey: refProg ? refKeyOf(refProg) : null, semesters, segs });
  }, [draftReady, fac, level, refProg, semesters, segs]);

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

  const pickProg = (p: ProgRow | null, lvl = level) => {
    setRefProg(p);
    setSegs(buildSegments(lvl, p, semesters));
    if (p) setToast(`ดึงจำนวนนิสิตและค่าธรรมเนียมของ ${progOptionLabel(p)} มาตั้งต้นแล้ว`);
  };

  const changeFac = (v: string | null) => {
    setFac(v);
    pickProg(null);
  };

  // ผู้ดูแลคณะ/อาจารย์: คณะถูกกำหนดตามบัญชี — ไม่ค้างคณะอื่นจากร่างเดิม
  useEffect(() => {
    if (!draftReady) return;
    if (scopedFac && fac !== scopedFac) changeFac(scopedFac);
    else if (scopedProg && refProg && refKeyOf(refProg) !== scopedProg) pickProg(null);
  }, [draftReady, scopedFac, scopedProg, fac, refProg]);

  /* ---------- คำนวณ ---------- */
  // ผลคำนวณใช้ค่าที่หน่วงไว้ — ช่องกรอกอัปเดตทันที ผลตามมาเมื่อว่าง ไม่ให้พิมพ์แล้วหน่วง
  const calcSegs = useDeferredValue(segs);
  const q = sumN(calcSegs);
  const { lock, adjOf, adjAt } = useFacultyAllocation(fac, refProg, q);
  const base = useMemo(() => (refProg ? blockFromProgram(refProg) : null), [refProg]);
  /** TFC ตามวิธีปันส่วนของคณะ ณ จำนวนรับนี้ · AVC ต่อหัวตามชีต (ต้นทุนเหมือนกันทั้งสองกรณี) */
  const baseResult = base && base.q > 0 ? blockResult(base, 'with_government', adjOf(true)) : null;
  const costs = baseResult ? { tfc: baseResult.tfc, avc: baseResult.avc ?? 0 } : null;
  const mixes = costs
    ? (Object.fromEntries(
        MODES.map((m) => [m, mixResult(calcSegs, costs.tfc, costs.avc, m)]),
      ) as Record<RevenueMode, MixResult>)
    : null;

  /** กำไรเมื่อรับรวม qq คนในสัดส่วนเดิม — ต้นทุนคงที่คิดใหม่ตามวิธีปันส่วนของคณะ ณ จำนวนนั้น */
  const profitAt = (qq: number, m: RevenueMode) =>
    base && costs
      ? mixResult(scaleSegs(calcSegs, qq), blockResult(base, m, adjAt(qq)).tfc, costs.avc, m).total
          .profit
      : 0;
  /** ดู leversFor — ไล่ทีละคนเพราะต้นทุนคงที่ขยับตามจำนวนรับ สูตรปิดใช้ไม่ได้ */
  const targetOf = (m: RevenueMode): number | null => {
    if (!mixes || q === 0) return null;

    if (mixes[m].total.profit >= 0) {
      let lo = q;

      while (lo - STEP >= 1 && profitAt(lo - STEP, m) >= 0) lo -= STEP;
      while (lo > 1 && profitAt(lo - 1, m) >= 0) lo--;

      return lo;
    }

    for (let hi = q + STEP; hi <= q + MAX_SCAN; hi += STEP) {
      if (profitAt(hi, m) < 0) continue;

      for (let qq = hi - STEP + 1; qq < hi; qq++) if (profitAt(qq, m) >= 0) return qq;

      return hi;
    }

    return null;
  };
  const targets = mixes
    ? (Object.fromEntries(MODES.map((m) => [m, targetOf(m)])) as Record<RevenueMode, number | null>)
    : null;

  const ready = !!refProg && !!lock && !!costs && !!mixes;

  const setSeg = (i: number, patch: Partial<Segment>) =>
    setSegs((xs) => xs.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const applyLever = (a: LeverAction) => {
    if (a.kind === 'heads') {
      setSegs((xs) => scaleSegs(xs, a.q));
      setToast(`ปรับแผนรับเป็น ${fmt(a.q)} คนในสัดส่วนเดิม`);
    } else if (a.kind === 'fee') {
      setSegs((xs) => xs.map((s) => (s.fee > 0 && s.n > 0 ? { ...s, fee: s.fee + a.perSem } : s)));
      setToast(`ขึ้นค่าธรรมเนียมกลุ่มที่เก็บค่าธรรมเนียมคนละ ${fmt(a.perSem)} บาท/ภาค`);
    } else {
      setSegs((xs) =>
        xs.map((s, i) =>
          i === a.from ? { ...s, n: s.n - a.n } : i === a.to ? { ...s, n: s.n + a.n } : s,
        ),
      );
      setToast(`ย้าย ${fmt(a.n)} คนแล้ว จำนวนรับรวมเท่าเดิม`);
    }
  };

  /* ---------- บันทึก/เปิดแผน ---------- */
  const saveBlocker = !ready
    ? 'เลือกหลักสูตรที่คำนวณได้ก่อนบันทึก'
    : q === 0
      ? 'แผนนี้ยังไม่มีจำนวนรับ กรอกในขั้นที่ 2 ก่อน'
      : null;

  const persist = (next: SandboxPlan[]) => {
    setPlans(next);
    void savePlans(next);
  };

  const handleSave = (name: string) => {
    if (!mixes || !refProg) return;

    if (scopedProg && refKeyOf(refProg) !== scopedProg) {
      setToast('หลักสูตรนี้อยู่นอกขอบเขตสิทธิ์ปัจจุบัน บันทึกไม่ได้');

      return;
    }

    const plan: SandboxPlan = {
      id: Date.now(),
      name,
      savedAt: new Date().toISOString(),
      dataYear: MOCK_RUN.budgetYear,
      fac,
      level,
      refKey: refKeyOf(refProg),
      progLabel: progOptionLabel(refProg),
      semesters,
      segs: calcSegs,
      q,
      result: Object.fromEntries(
        MODES.map((m) => [m, { qStar: validQStar(mixes[m]), profit: mixes[m].total.profit }]),
      ) as SandboxPlan['result'],
    };

    persist([plan, ...plans]);
    setToast(`บันทึก "${name}" แล้ว ดูย้อนหลังได้ในตารางด้านล่าง`);
  };

  const handleOpen = (p: SandboxPlan) => {
    if ((scopedFac && p.fac !== scopedFac) || (scopedProg && p.refKey !== scopedProg)) {
      setToast('แผนนี้เป็นของหลักสูตรนอกขอบเขตสิทธิ์ปัจจุบัน เปิดไม่ได้');

      return;
    }

    const ref = RAW.PROGS.find((x) => refKeyOf(x) === p.refKey) ?? null;

    if (!ref) {
      setToast('ไม่พบหลักสูตรของแผนนี้ในข้อมูลปีปัจจุบัน เปิดไม่ได้');

      return;
    }

    setFac(p.fac);
    setLevel(p.level);
    setRefProg(ref);
    setSemesters(p.semesters);
    setSegs(p.segs);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setToast(
      p.dataYear === MOCK_RUN.budgetYear
        ? `เปิดแผน "${p.name}" แล้ว แก้ต่อได้เลย`
        : `เปิดแผน "${p.name}" แล้ว — บันทึกด้วยข้อมูลปี ${p.dataYear} ผลตอนนี้คิดจากข้อมูลปี ${MOCK_RUN.budgetYear}`,
    );
  };

  const handleDelete = (p: SandboxPlan) => {
    persist(plans.filter((x) => x.id !== p.id));
    setToast('ลบแผนแล้ว');
  };

  /* ---------- แสดงผล ---------- */
  const sel = mixes?.[mode] ?? null;
  const gaugeMax = mixes
    ? Math.max(q, ...MODES.map((m) => validQStar(mixes[m]) ?? 0), 1) * 1.15
    : 1;
  const pct = (v: number) => `${Math.min(100, (v / gaugeMax) * 100)}%`;

  const selTarget = targets?.[mode] ?? null;
  const verdict = !sel ? null : q === 0 ? (
    <Alert severity="warning">ยังไม่มีแผนรับ กรอกจำนวนรับอย่างน้อยหนึ่งกลุ่มในขั้นที่ 2</Alert>
  ) : sel.total.profit >= 0 ? (
    <Alert severity="success">
      แผนนี้คุ้มทุน มีส่วนเกินปีละ {mb(sel.total.profit)} บาท
      {selTarget !== null && ` รับได้ต่ำกว่าแผนถึง ${fmt(q - selTarget)} คนก่อนขาดทุน`}
    </Alert>
  ) : selTarget === null ? (
    <Alert severity="error">
      แผนนี้ขาดทุนปีละ {mb(-sel.total.profit)} บาท และรับเพิ่มในสัดส่วนเดิมอีก {fmt(MAX_SCAN)} คนก็ยังไม่คุ้มทุน
      ต้องปรับค่าธรรมเนียมหรือสัดส่วนกลุ่ม ดูทางเลือกด้านล่าง
    </Alert>
  ) : (
    <Alert severity="error">
      แผนนี้ขาดทุนปีละ {mb(-sel.total.profit)} บาท ต้องรับเพิ่มอีก {fmt(selTarget - q)}{' '}
      คนในสัดส่วนเดิม หรือดูทางเลือกด้านล่าง
    </Alert>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Typography variant="h5" fontWeight={700}>
            🧪 ห้องจำลองแผนรับนิสิต
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ปรับจำนวนรับรายกลุ่มนิสิต แล้วดูทันทีว่าหลักสูตรคุ้มทุนหรือไม่ ขาดอีกเท่าไร
            และมีทางไหนไปถึงจุดคุ้มทุน · ใช้ตารางสัดส่วนนิสิตแท็บ 4 ของไฟล์ Excel
          </Typography>
        </Box>
        <Chip color="warning" variant="outlined" label="ผลจำลอง — ไม่ใช่เอกสารอ้างอิง" />
        <Button
          color="secondary"
          variant="outlined"
          disabled={!refProg}
          onClick={() => setConfirmReset(true)}
        >
          คืนค่าตั้งต้น
        </Button>
      </Box>

      <Grid container spacing={4}>
        {/* ---------- ฝั่งกรอก ---------- */}
        <Grid size={{ xs: 12, lg: 5 }} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Card>
            <CardHeader title={<DotTitle color="info.main">1. เลือกหลักสูตร</DotTitle>} />
            <CardContent>
              <ProgramPicker
                facultyOptions={facultyOptions}
                fac={fac}
                onFacChange={changeFac}
                level={level}
                onLevelChange={(v) => {
                  setLevel(v);
                  pickProg(null, v);
                }}
                semesters={semesters}
                onSemestersChange={(v) => {
                  setSemesters(v);
                  setSegs((xs) => xs.map((s) => ({ ...s, semesters: v })));
                }}
                refOptions={progOptions}
                refProg={refProg}
                onRefChange={(p) => pickProg(p)}
                refLabel="หลักสูตร"
                refRequired
                compact
                refHint="ดึงต้นทุน จำนวนนิสิต และค่าธรรมเนียมของหลักสูตรนี้มาตั้งต้น"
              />
              {costs && (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 3 }}>
                  {[
                    ['ต้นทุนคงที่ต่อปี (TFC)', costs.tfc],
                    ['ต้นทุนผันแปรต่อหัว (AVC)', costs.avc],
                  ].map(([k, v]) => (
                    <Box key={k} sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 2, py: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {k}
                      </Typography>
                      <Typography fontWeight={700}>{fmt(v as number)} บาท</Typography>
                    </Box>
                  ))}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ gridColumn: '1 / -1' }}
                  >
                    🔒 ต้นทุนมาจากชีตและวิธีปันส่วนที่คณะล็อกไว้ ปรับในหน้านี้ไม่ได้
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* คณะยังไม่ตั้งวิธีปันส่วนก็คำนวณได้ — ใช้ค่าปีก่อน/ตาม Excel (มติ 25 ต.ค.) */}
          {!ready ? (
            <Alert severity="info">
              {refProg && base && base.q <= 0
                ? 'หลักสูตรนี้ไม่มีนิสิตในปีฐาน คำนวณต้นทุนผันแปรต่อหัวไม่ได้ — เลือกหลักสูตรอื่น'
                : 'เลือกคณะและหลักสูตรก่อน แล้วจึงวางแผนรับนิสิตรายกลุ่มได้'}
            </Alert>
          ) : (
            <Card>
              <CardHeader
                title={<DotTitle color="warning.main">2. แผนรับนิสิตต่อปี</DotTitle>}
                subheader="ค่าธรรมเนียมตั้งต้นจากประกาศค่าธรรมเนียม · แก้ได้เพื่อทดลองเท่านั้น ไม่กระทบข้อมูลจริง"
              />
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {refProg && feesForProgram(refProg.fac, refProg.deg).length === 0 && (
                  <Alert severity="warning">
                    จับคู่ค่าธรรมเนียมของหลักสูตรนี้กับประกาศค่าธรรมเนียมไม่ได้
                    ระบบใส่ค่าตั้งต้นให้แทน — แก้ค่าธรรมเนียมให้ตรงก่อนอ่านผล
                  </Alert>
                )}
                {segs.map((s, i) => (
                  <Box
                    key={s.label}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'minmax(0,1fr) 110px 130px' },
                      gap: 2,
                      alignItems: 'center',
                      pb: 2,
                      borderBottom: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Box>
                      <Typography fontWeight={600}>{s.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        เงินแผ่นดิน {fmt(s.gov)} บาท/ภาค
                      </Typography>
                    </Box>
                    <NumberTextField
                      size="small"
                      label="จำนวนรับ (คน)"
                      value={s.n}
                      onChange={(v) => setSeg(i, { n: v })}
                    />
                    <NumberTextField
                      size="small"
                      label="ค่าธรรมเนียม/ภาค"
                      value={s.fee}
                      onChange={(v) => setSeg(i, { fee: v })}
                    />
                  </Box>
                ))}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>รวมรับต่อปี</Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {fmt(sumN(segs))} คน
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* ---------- ฝั่งผล ---------- */}
        <Grid size={{ xs: 12, lg: 7 }} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {!ready || !mixes || !costs || !sel ? (
            <Alert severity="info" variant="outlined">
              ผลการจำลองจะแสดงที่นี่เมื่อเลือกหลักสูตรแล้ว
            </Alert>
          ) : (
            <>
              <Card>
                <CardHeader
                  title={<DotTitle color="primary.main">3. ผลการจำลอง</DotTitle>}
                  action={
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={mode}
                      onChange={(_, v: RevenueMode | null) => v && setMode(v)}
                      sx={{ mr: 2 }}
                    >
                      {MODES.map((m) => (
                        <ToggleButton key={m} value={m}>
                          {REVENUE_MODE_LABEL[m]}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  }
                  subheader="กรณีที่เลือกใช้ตั้งเป้าในสามทางไปจุดคุ้มทุนด้านล่าง"
                />
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 2,
                    }}
                  >
                    {MODES.map((m) => {
                      const r = mixes[m];
                      const qs = validQStar(r);
                      const t = targets?.[m] ?? null;
                      const ok = r.total.profit >= 0;

                      return (
                        <Box
                          key={m}
                          sx={{
                            border: m === mode ? 2 : 1,
                            borderColor: m === mode ? 'primary.main' : 'divider',
                            borderRadius: 1,
                            p: 2,
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {REVENUE_MODE_LABEL[m]}
                            </Typography>
                            <Chip
                              size="small"
                              color={q === 0 ? 'default' : ok ? 'success' : 'error'}
                              label={q === 0 ? 'ยังไม่มีแผนรับ' : ok ? 'คุ้มทุน' : 'ยังไม่คุ้มทุน'}
                            />
                          </Box>
                          <Typography variant="h4" fontWeight={700}>
                            {qs === null ? '—' : fmt(qs)}{' '}
                            <Typography component="span" variant="body2" color="text.secondary">
                              คน · Q* ตามสูตรแท็บ 4
                            </Typography>
                          </Typography>
                          <Typography variant="body2">
                            แผนรับ <b>{fmt(q)}</b> คน
                            {q > 0 &&
                              (t === null
                                ? ok
                                  ? ''
                                  : ' · รับเพิ่มอย่างเดียวไม่ถึงจุดคุ้มทุน'
                                : ok
                                  ? ` · รับลดได้อีก ${fmt(q - t)} คน`
                                  : ` · ต้องรับเพิ่มอีก ${fmt(t - q)} คน`)}
                          </Typography>
                          <Typography variant="body2">
                            กำไร(ขาดทุน)ต่อปี{' '}
                            <Box
                              component="b"
                              sx={{ color: ok ? 'success.main' : 'error.main' }}
                            >
                              {mb(r.total.profit)} บาท
                            </Box>
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>

                  {/* แถบแผนรับเทียบจุดคุ้มทุนสองกรณี */}
                  <Box>
                    <Box
                      sx={{ position: 'relative', height: 34, bgcolor: 'action.hover', borderRadius: 1, mt: 4, mb: 7 }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 8,
                          bottom: 8,
                          width: pct(q),
                          bgcolor: 'primary.main',
                          borderRadius: 1,
                        }}
                      />
                      {MODES.map((m) => {
                        const qs = validQStar(mixes[m]);
                        const gov = m === 'with_government';

                        return qs === null ? null : (
                          <Box
                            key={m}
                            sx={{
                              position: 'absolute',
                              left: pct(qs),
                              top: -4,
                              bottom: -4,
                              borderLeft: '2px dashed',
                              borderColor: gov ? 'secondary.main' : 'text.primary',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                position: 'absolute',
                                transform: 'translateX(-50%)',
                                whiteSpace: 'nowrap',
                                ...(gov ? { bottom: -22 } : { top: -22 }),
                              }}
                            >
                              {fmt(qs)}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      แถบทึบ = แผนรับ · เส้นประบน = จุดคุ้มทุนไม่รวมเงินแผ่นดิน · เส้นประล่าง =
                      จุดคุ้มทุนรวมเงินแผ่นดิน · Q* คิดที่ต้นทุนคงที่ ณ แผนรับนี้ ถ้าคณะปันตามหัวนิสิต
                      ต้นทุนคงที่จะขยับตามจำนวนรับ ตัวเลข &quot;ต้องรับเพิ่ม&quot; คิดรวมผลนี้แล้ว
                    </Typography>
                  </Box>
                  {verdict}
                </CardContent>
              </Card>

              <Card>
                <CardHeader
                  title={<DotTitle color="success.main">สามทางไปจุดคุ้มทุน</DotTitle>}
                  subheader={
                    q === 0
                      ? undefined
                      : sel.total.profit >= 0
                      ? `กรณี${REVENUE_MODE_LABEL[mode]} แผนนี้คุ้มทุนแล้ว ตัวเลขด้านล่างคือระยะเผื่อก่อนจะขาดทุน`
                      : `กรณี${REVENUE_MODE_LABEL[mode]} ขาดอยู่ปีละ ${mb(-sel.total.profit)} บาท — แต่ละทางใช้แยกกัน กด "ลองใช้" เพื่อปรับแผนทันที`
                  }
                />
                <CardContent>
                  {q === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      กรอกแผนรับก่อน แล้วระบบจะเสนอทางไปจุดคุ้มทุน
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                        gap: 2,
                      }}
                    >
                      {leversFor(calcSegs, sel, costs.avc, mode, selTarget).map((l) => (
                        <Box
                          key={l.title}
                          sx={{
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {l.title}
                          </Typography>
                          <Typography variant="h6" fontWeight={700}>
                            {l.value}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                            {l.note}
                          </Typography>
                          {l.action && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => applyLever(l.action!)}
                              sx={{ alignSelf: 'flex-start' }}
                            >
                              ลองใช้
                            </Button>
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader
                  title={<DotTitle color="info.main">ใครช่วยแบกต้นทุน</DotTitle>}
                  subheader={`ส่วนเกินต่อหัว = รายรับต่อหัวต่อปี − ต้นทุนผันแปรต่อหัว · กรณี${REVENUE_MODE_LABEL[mode]}`}
                />
                <CardContent>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>กลุ่ม</TableCell>
                          <TableCell align="right">คน</TableCell>
                          <TableCell align="right">ส่วนเกิน/หัว/ปี</TableCell>
                          <TableCell align="right">ส่วนเกินรวม</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {calcSegs.filter((s) => offered(s) || s.n > 0).map((s) => {
                          const cm = cmOf(s, costs.avc, mode);

                          return (
                            <TableRow key={s.label}>
                              <TableCell>{s.label}</TableCell>
                              <TableCell align="right">{fmt(s.n)}</TableCell>
                              <TableCell
                                align="right"
                                sx={{ color: cm < 0 ? 'error.main' : undefined }}
                              >
                                {fmt(cm)}
                              </TableCell>
                              <TableCell align="right">{fmt(cm * s.n)}</TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>รวม</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {fmt(q)}
                          </TableCell>
                          <TableCell />
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {fmt(sel.total.profit + costs.tfc)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Typography variant="caption" color="text.secondary">
                    ส่วนเกินรวมต้องเกินต้นทุนคงที่ {mb(costs.tfc)} บาท จึงจะคุ้มทุน
                  </Typography>
                </CardContent>
              </Card>

              {q > 0 && (
              <Card>
                <CardHeader
                  title={<DotTitle color="error.main">ถ้ารับได้ไม่เต็มแผน</DotTitle>}
                  subheader="กำไร(ขาดทุน)ต่อปี เมื่อรับได้จริงเป็น % ของแผน · สัดส่วนกลุ่มเท่าเดิม ต้นทุนคงที่คิดตามวิธีปันส่วนของคณะ"
                />
                <CardContent>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(5, 1fr)' },
                      gap: 1,
                    }}
                  >
                    {[70, 80, 90, 100, 110].map((p) => {
                      const pr = profitAt(Math.round((q * p) / 100), mode);

                      return (
                        <Box
                          key={p}
                          sx={{
                            borderRadius: 1,
                            p: 1.5,
                            textAlign: 'center',
                            bgcolor: pr >= 0 ? 'success.lightOpacity' : 'error.lightOpacity',
                            color: pr >= 0 ? 'success.main' : 'error.main',
                            outline: p === 100 ? '2px solid' : 'none',
                            outlineOffset: -2,
                          }}
                        >
                          <Typography variant="caption" color="inherit" display="block">
                            รับได้ {p}%{p === 100 ? ' (แผน)' : ''}
                          </Typography>
                          <Typography fontWeight={700} color="inherit">
                            {mb(pr)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>
              )}
            </>
          )}
        </Grid>
      </Grid>

      <SandboxPlansCard
        plans={plans}
        saveBlocker={saveBlocker}
        onSave={handleSave}
        onOpen={handleOpen}
        onDelete={handleDelete}
        onToast={setToast}
      />

      {canExportReport(role) ? (
        <Alert
          severity="info"
          action={
            <Button component={Link} href="/scenario/program/improve" color="inherit" size="small">
              ไปหน้าออกรายงาน
            </Button>
          }
        >
          รายงานสำหรับแนบคำขอปรับปรุงหรือเปิดหลักสูตร ออกได้จากหน้าจุดคุ้มทุนรายหลักสูตร
          (ใช้ตัวเลขชุดเดียวกับห้องจำลองนี้)
        </Alert>
      ) : (
        <Alert severity="warning" icon={<span>🔒</span>}>
          บทบาทนี้จำลองและบันทึกแผนได้เต็มที่ แต่ออกรายงานสำหรับแนบคำขอปรับปรุงหรือเปิดหลักสูตรไม่ได้
          — ออกได้เฉพาะกองแผนงานและอาจารย์ประจำหลักสูตร หากต้องใช้ ให้ส่งชื่อแผนนี้ให้ผู้มีสิทธิ์
        </Alert>
      )}

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} maxWidth="xs" fullWidth>
        <DialogTitle>คืนค่าตั้งต้น?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            จำนวนรับและค่าธรรมเนียมที่ปรับไว้จะกลับเป็นตัวเลขของหลักสูตรตามชีต
            แผนที่บันทึกไว้แล้วไม่หาย
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReset(false)}>ยกเลิก</Button>
          <Button
            variant="contained"
            onClick={() => {
              setSegs(buildSegments(level, refProg, semesters));
              setConfirmReset(false);
              setToast('คืนค่าตั้งต้นของหลักสูตรแล้ว');
            }}
          >
            คืนค่า
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

export default AdmissionSandboxView;
