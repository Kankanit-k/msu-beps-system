'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// MUI Imports
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import { calcBreakEvenBothModes, type RevenueMode } from '@beps/calc-engine';

// Component Imports
import DataCaveatNotes from '@components/DataCaveatNotes';
import PageHeaderBar, { MOCK_RUN } from '@components/PageHeaderBar';

// Data / calc Imports
import { canExportReport } from '@/configs/accessControl';
import { RAW } from '@/data/mockup';
import { computeBreakEven, REVENUE_MODE_LABEL, sheetQStar } from '@views/breakeven/calc';
import { feesForProgram } from '@views/tuition/feeData';
import { facultyRows, poolAmountOf } from '@views/fixed-cost-policy/data';
import { fmtLockedAt, useFacultyLock } from '@views/fixed-cost-lock/lockStore';
import NoLockAlert from '@views/fixed-cost-lock/NoLockAlert';
import { useRole } from '@/hooks/useRole';

import ProgramReport from './ProgramReport';
import ReportPreviewDialog from './ReportPreviewDialog';
import { type CostGroup } from './CostBlockTable';
import FixedCostAllocationCard, { METHOD_HINT } from './FixedCostAllocationCard';
import {
  ALLOC_METHOD_LABEL,
  allocateFaculty,
  allocBuckets,
  DEFAULT_ALLOC_CHOICE,
  NEW_PROGRAM_ID,
  policyOf,
  shareOf,
  type FacultyScenario,
} from './facultyAllocation';
import { type ModeCosts } from './StudentMixTable';
import { buildSegments, scaleSegs } from './segments';
import CostStep from './steps/CostStep';
import HistoryTable from './steps/HistoryTable';
import SaveSuccessDialog from './steps/SaveSuccessDialog';
import MixStep, { type CostBasis } from './steps/MixStep';
import ProgramStep, { type Purpose } from './steps/ProgramStep';
import SummaryStep from './steps/SummaryStep';
import {
  STEP_LABEL,
  StepGuide,
  WizardNav,
  WizardStepper,
  type GuideItem,
  type StepKey,
} from './steps/WizardStepper';
import {
  blockFromProgram,
  blockResult,
  embeddedShareOf,
  emptyBlock,
  scaleQ,
  withPerHeadCharges,
  type CostBlock,
  type Segment,
} from './newProgramCalc';
import { PG_DATA, EDUCATION_LEVELS, progOptionLabel } from './programData';
import { loadHistory, saveHistory } from './historyStore';
import type { ProgramHistoryEntry } from './types';
import type { ProgRow } from '@/data/mockup';

const PURPOSE_TEXT: Record<
  Purpose,
  { heading: string; refLabel: string; refCol: string; customCol: string; tableHint: string }
> = {
  improve: {
    heading: '🎓 คำนวณจุดคุ้มทุน — ปรับปรุงหลักสูตรเดิม',
    refLabel: 'หลักสูตรที่จะปรับปรุง',
    refCol: 'ปัจจุบัน',
    customCol: 'หลังปรับปรุง',
    tableHint:
      'แก้ตัวเลขในคอลัมน์ "หลังปรับปรุง" ของแต่ละกรณีได้อิสระ (ตั้งต้นจากตัวเลขปัจจุบันของหลักสูตร) · ผลต่าง = หลังปรับปรุง − ปัจจุบัน',
  },
  new: {
    heading: '🎓 คำนวณจุดคุ้มทุน — เปิดหลักสูตรใหม่',
    refLabel: 'หลักสูตรอ้างอิง (ไม่บังคับ)',
    refCol: 'หลักสูตรอ้างอิง',
    customCol: 'หลักสูตรใหม่',
    tableHint:
      'แก้ตัวเลขในคอลัมน์ "หลักสูตรใหม่" ของแต่ละกรณีได้อิสระ (ตั้งต้นจากหลักสูตรอ้างอิง) · ผลต่าง = หลักสูตรใหม่ − อ้างอิง',
  },
};
/** ปรับปรุงหลักสูตรเดิม: ตารางต้นทุนขึ้นในขั้นที่ 1 ทันทีที่เลือกหลักสูตร (ตั้งต้นจากตัวเลขปัจจุบัน) — ไม่แยกเป็นขั้นของตัวเอง */
const fmtInt = (v: number) => (Math.round(v) || 0).toLocaleString('th-TH');

const STEP_KEYS: Record<Purpose, StepKey[]> = {
  improve: ['program', 'mix', 'summary'],
  new: ['program', 'cost', 'mix', 'summary'],
};

/** คำอธิบายสั้นใต้ชื่อขั้นในแถบขั้นตอน — ผู้ใช้ใหม่เห็นทันทีว่าแต่ละขั้นทำอะไร */
const STEP_HINT: Record<Purpose, Record<StepKey, string>> = {
  improve: {
    program: 'เลือกหลักสูตร ปรับจำนวนนิสิต/ค่าธรรมเนียม',
    cost: '',
    mix: 'แบ่งนิสิตไทย/ต่างชาติ/นอกเวลา',
    summary: 'บันทึก และออกรายงาน PDF',
  },
  new: {
    program: 'ตั้งชื่อ และเลือกหลักสูตรอ้างอิง',
    cost: 'กรอก/แก้ต้นทุนและรายได้',
    mix: 'แบ่งนิสิตไทย/ต่างชาติ/นอกเวลา (ถ้ามี)',
    summary: 'ตรวจผล บันทึก และออกรายงาน PDF',
  },
};

/** ต้นทุนกำหนดเองแยกตามกรณี — รวม/ไม่รวมเงินแผ่นดินปรับได้อิสระจากกัน */
type ManualBlocks = Record<RevenueMode, CostBlock>;

const MODES: RevenueMode[] = ['with_government', 'without_government'];
const bothModes = (b: CostBlock): ManualBlocks => ({
  with_government: b,
  without_government: structuredClone(b),
});

/* ---------- ร่างฟอร์ม — กันข้อมูลหายเมื่อปิด/รีโหลดหน้า ---------- */
const DRAFT_KEY = 'beps.scenario-program.draft';

interface Draft {
  purpose?: Purpose;
  newName?: string;
  fac: string | null;
  level: string;
  semesters: number;
  refKey: string | null;
  /** กดกรอกต้นทุนเองโดยไม่มีหลักสูตรอ้างอิง */
  manualOnly?: boolean;
  /** ร่างรุ่นก่อน — ฐานต้นทุนที่เลือก ('manual' = กรอกเอง) */
  basis?: CostBasis;
  manual: ManualBlocks | CostBlock;
  segs: Segment[];
  /** ส่วนแบ่งส่วนกลางที่ฝังในคอลัมน์กำหนดเอง (ติดมาจากหลักสูตรที่คัดลอกตัวเลข) */
  manualEmbedded?: number;
  /** ปรับปรุงหลักสูตร: ยืนยันขั้นที่ 1 (หลักสูตร + เทอม/ปี) แล้ว */
  confirmed?: boolean;
}

/** กล่องคำแนะนำขั้นตอนในหน้าปรับปรุงหลักสูตร — ซ่อนไว้ก่อนตามที่ผู้ใช้ขอ (ดูรก) · true = แสดงคืน */
const SHOW_IMPROVE_STEP_GUIDE = false;

const refKeyOf = (p: ProgRow) => `${p.fac}|${p.lvl}|${p.prog}|${p.deg}`;

// แยกร่างตามหน้า (ปรับปรุง/เปิดใหม่) — สองหน้าไม่ทับร่างกัน
const draftKeyOf = (purpose: Purpose) => `${DRAFT_KEY}.${purpose}`;

const loadDraft = (purpose: Purpose): Draft | null => {
  try {
    const raw = window.localStorage.getItem(draftKeyOf(purpose));

    if (raw) return JSON.parse(raw) as Draft;

    // ร่างรุ่นก่อนเก็บรวมคีย์เดียว — ใช้ต่อเฉพาะเมื่อเป็นวัตถุประสงค์เดียวกับหน้านี้
    const legacy = window.localStorage.getItem(DRAFT_KEY);
    const d = legacy ? (JSON.parse(legacy) as Draft) : null;
    const legacyPurpose = d && (d.purpose ?? (d.basis === 'manual' ? 'new' : 'improve'));

    return legacyPurpose === purpose ? d : null;
  } catch {
    return null;
  }
};

const saveDraft = (purpose: Purpose, d: Draft | null) => {
  try {
    if (d) window.localStorage.setItem(draftKeyOf(purpose), JSON.stringify(d));
    else window.localStorage.removeItem(draftKeyOf(purpose));
  } catch {
    // โหมดส่วนตัว/พื้นที่เต็ม — ฟอร์มยังใช้ได้ แค่ไม่จำร่าง
  }
};

/** ส่วนแบ่งส่วนกลางคณะ (งบสำนักงาน + ค่าเสื่อม) ที่ชีตแท็บ 3 ปันไว้ — ใช้กับหลักสูตรอื่นในคณะ */
const sheetShareOf = poolAmountOf('ALL');

/** purpose มาจากเมนูย่อย — /scenario/program/improve หรือ /scenario/program/new */
const ScenarioProgramView = ({ purpose }: { purpose: Purpose }) => {
  const [newName, setNewName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [fac, setFac] = useState<string | null>(null);
  const [level, setLevel] = useState<string>(EDUCATION_LEVELS[0] ?? 'ปริญญาตรี');
  const [semesters, setSemesters] = useState(2);
  const [refProg, setRefProg] = useState<ProgRow | null>(null);
  /** เปิดหลักสูตรใหม่โดยไม่มีหลักสูตรอ้างอิง — กดกรอกต้นทุนเองแล้ว */
  const [manualOnly, setManualOnly] = useState(false);
  /**
   * ปรับปรุงหลักสูตร: ต้องยืนยันขั้นที่ 1 (รวมเทอม/ปี) ก่อนขึ้นตาราง ② — ตั้งเทอมให้เสร็จก่อน
   * ตาราง ② จะได้ไม่ถูกเปลี่ยนตามทีหลัง · ยืนยันแล้วช่องในขั้นที่ 1 ล็อก
   */
  const [confirmed, setConfirmed] = useState(false);
  const [manual, setManual] = useState<ManualBlocks>(() => bothModes(emptyBlock()));
  const [segs, setSegs] = useState<Segment[]>(() => buildSegments(level, null, 2));
  /** คณะล็อกวิธีปันส่วนต้นทุนคงที่ไว้ (หน้าตั้งค่าวิธีปันส่วน) — หน้านี้ใช้ตามนั้น แก้ไม่ได้ */
  const year = MOCK_RUN.budgetYear;
  const { lock, ready: lockReady } = useFacultyLock(year, fac);
  const alloc = lock?.choice ?? DEFAULT_ALLOC_CHOICE;
  /** ผู้ดูแลคณะ/อาจารย์ทำได้เฉพาะคณะ (และหลักสูตร) ของตน */
  const { role, scope } = useRole();
  const scopedFac = role === 'deptAdmin' || role === 'lecturer' ? scope.faculty : null;
  const scopedProg = role === 'lecturer' ? scope.program : null;
  const canReport = canExportReport(role);
  // ปรับปรุงหลักสูตรเดิม — ตารางคำนวณจุดคุ้มทุนแก้ได้เฉพาะจำนวนนิสิตและค่าธรรมเนียมการศึกษา (ทุกบทบาท)
  const basicOnly = purpose === 'improve';
  /**
   * ส่วนแบ่งส่วนกลางที่ฝังอยู่ในคอลัมน์กำหนดเอง — ผูกกับ "หลักสูตรที่คัดลอกตัวเลขมา" ไม่ใช่หลักสูตรอ้างอิงปัจจุบัน
   * ล้างหลักสูตรอ้างอิงแล้วตัวเลขที่คัดลอกยังอยู่ ส่วนแบ่งที่ติดมาก็ยังต้องถูกถอดออก ไม่งั้นนับซ้ำ
   */
  const [manualEmbedded, setManualEmbedded] = useState(0);
  const copyManualFrom = (p: ProgRow) => {
    setManual(bothModes(blockFromProgram(p)));
    setManualEmbedded(embeddedShareOf(p));
  };

  const [mode, setMode] = useState<RevenueMode>('with_government');
  const [history, setHistory] = useState<ProgramHistoryEntry[]>([]);
  const [confirm, setConfirm] = useState<'history' | 'form' | 'edit' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  /** ผลที่บันทึกไว้ซึ่งเปิดกลับมาแก้ไขอยู่ — บันทึกแล้วทับรายการนี้แทนการเพิ่มรายการใหม่ */
  const [editingId, setEditingId] = useState<number | null>(null);
  /** ตารางสัดส่วนนิสิตปรับตามจำนวนนิสิตที่เปลี่ยน — ตั้งไว้ก่อนเปิดร่าง/ผลที่บันทึก จะได้ไม่ถูกปรับทับ */
  const prevQ = useRef<number | null>(null);

  /** เทข้อมูลฟอร์ม (ร่าง หรือผลที่บันทึกไว้) กลับเข้าฟอร์ม */
  const applyDraft = (d: Draft) => {
    setNewName(d.newName ?? '');
    setNameTouched(false);
    setFac(d.fac);
    setLevel(d.level);
    setSemesters(d.semesters);
    setRefProg(RAW.PROGS.find((p) => refKeyOf(p) === d.refKey) ?? null);
    // ร่างรุ่นก่อน: basis 'manual' แปลว่ากรอกเองล้วนก็ต่อเมื่อเปิดใหม่และไม่มีหลักสูตรอ้างอิง
    setManualOnly(purpose === 'new' && (d.manualOnly ?? (d.basis === 'manual' && !d.refKey)));
    // ร่างรุ่นก่อนมีก้อนเดียว — ใช้ตั้งต้นทั้งสองกรณี
    const manualBlocks = 'q' in d.manual ? bothModes(d.manual) : d.manual;

    setManual(manualBlocks);
    prevQ.current = manualBlocks[mode].q;
    // ร่างเก่าเก็บชื่อหัวคอลัมน์แบบเดิม/ป.โท-เอกมี 4 คอลัมน์ — ใช้ชื่อปัจจุบันและเติมคอลัมน์ที่ขาด
    const blank = buildSegments(d.level, null, d.semesters);

    setSegs(blank.map((b, i) => ({ ...(d.segs[i] ?? b), label: b.label })));
    // ร่างรุ่นก่อนไม่ได้จำ — ตัวเลขกำหนดเองตั้งต้นจากหลักสูตรอ้างอิงเสมอ
    const ref = RAW.PROGS.find((p) => refKeyOf(p) === d.refKey);

    setManualEmbedded(d.manualEmbedded ?? (ref ? embeddedShareOf(ref) : 0));
    // ร่างรุ่นก่อนไม่มีขั้นยืนยัน — มีหลักสูตรแล้วถือว่ายืนยัน ตัวเลขที่ทดลองไว้จะได้ไม่ถูกรีเซ็ต
    setConfirmed(d.confirmed ?? !!ref);
  };

  // อ่านหลัง mount เท่านั้น — อ่านตอน render แรกจะทำให้ SSR กับ client ไม่ตรงกัน
  useEffect(() => {
    const saved = loadHistory();

    setHistory(saved);
    // ?open=<id> — เปิดผลที่บันทึกไว้จากอีกหน้า (ปรับปรุง ↔ เปิดใหม่) มาแก้ไข
    const openId = Number(new URLSearchParams(window.location.search).get('open'));
    const opened = openId ? saved.find((h) => h.id === openId && h.input) : undefined;

    if (opened) {
      applyDraft(opened.input as Draft);
      setEditingId(opened.id);
      setPendingStep(true);
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      const d = loadDraft(purpose);

      if (d) applyDraft(d);
    }

    setDraftReady(true);
  }, []);

  /** ข้อมูลฟอร์มปัจจุบัน — เก็บเป็นร่าง และแนบไปกับผลที่บันทึกเพื่อเปิดกลับมาแก้ไข */
  const currentDraft = (): Draft => ({
    purpose,
    newName,
    fac,
    level,
    semesters,
    refKey: refProg ? refKeyOf(refProg) : null,
    manualOnly,
    manual,
    segs,
    manualEmbedded,
    confirmed,
  });

  useEffect(() => {
    if (!draftReady) return;
    saveDraft(purpose, currentDraft());
  }, [
    draftReady,
    purpose,
    newName,
    fac,
    level,
    semesters,
    refProg,
    manualOnly,
    manual,
    segs,
    manualEmbedded,
    confirmed,
  ]);

  // ตารางสัดส่วนนิสิตตั้งต้นจากจำนวนนิสิตที่จำลองในคอลัมน์ที่แก้ได้ ของกรณีที่เลือกที่หัวหน้า
  // ปรับเฉพาะตอน Q หรือกรณีเปลี่ยน — แก้รายกลุ่มในขั้นสัดส่วนแล้วไม่ถูกทับ
  const targetQ = manual[mode].q;

  useEffect(() => {
    if (!draftReady) return;
    if (prevQ.current !== null && prevQ.current !== targetQ) {
      setSegs((xs) => scaleSegs(xs, targetQ));
    }

    prevQ.current = targetQ;
  }, [draftReady, targetQ]);

  const facultyOptions = useMemo(
    () => (scopedFac ? [scopedFac] : PG_DATA.map((g) => g.faculty)),
    [scopedFac],
  );
  const refOptions = useMemo(
    () =>
      (PG_DATA.find((g) => g.faculty === fac)?.programs ?? []).filter(
        (p) =>
          p.lvl === level &&
          // ปรับปรุงหลักสูตร: อาจารย์เลือกได้เฉพาะหลักสูตรของตน · เปิดใหม่ใช้หลักสูตรไหนในคณะอ้างอิงก็ได้
          (purpose === 'new' || !scopedProg || refKeyOf(p) === scopedProg),
      ),
    [fac, level, purpose, scopedProg],
  );

  const text = PURPOSE_TEXT[purpose];
  const refBlock = useMemo(() => (refProg ? blockFromProgram(refProg) : null), [refProg]);
  // มีหลักสูตรอ้างอิง → ค่าธรรมเนียมรายการหลัก/หักสมทบคิด "ต่อหัวตามจริงของหลักสูตร" × Q (ตัวเลขชีตคิดที่ 2 ภาค)
  // ต้นทุนต่อหัวจึงคงเดิมเมื่อแก้แค่จำนวนนิสิต — Q* เปลี่ยนเฉพาะเมื่อแก้ค่าธรรมเนียม (ผู้ใช้เลือก 2026-10-14)
  // ไม่มีหลักสูตรอ้างอิง (กรอกเองล้วน) → คิดตามอัตรา × Q × ภาค แบบ T38/T39
  const withCharges = (b: CostBlock) => {
    if (!refBlock || refBlock.q <= 0) return withPerHeadCharges(b, semesters);

    const k = (b.q / refBlock.q) * (semesters / 2);

    return { ...b, mainFee: refBlock.mainFee * k, uniShare: refBlock.uniShare * k };
  };
  const manualBlockOf = (m: RevenueMode) => withCharges(manual[m]);
  // คอลัมน์ที่แก้ได้ (หลักสูตรใหม่/หลังปรับปรุง) คือสิ่งที่กำลังประเมินเสมอ — คอลัมน์อ้างอิงมีไว้เทียบเท่านั้น
  const block = manualBlockOf(mode);

  /* ---------- ปันส่วนต้นทุนคงที่ส่วนกลางคณะใหม่ทั้งคณะ (facultyAllocation.ts) ---------- */
  const facRows = useMemo(() => (fac ? facultyRows(fac) : []), [fac]);
  const facPrograms = useMemo(
    () =>
      facRows.map(({ p, id }) => ({
        id,
        label: progOptionLabel(p),
        educationLevel: p.lvl,
        q: p.Q,
        sheetShare: sheetShareOf(p),
      })),
    [facRows],
  );
  const facPool = facPrograms.reduce((a, p) => a + p.sheetShare, 0);
  const refId = facRows.find((r) => r.p === refProg)?.id ?? null;
  const isNew = purpose === 'new';

  /**
   * สถานการณ์ของคณะที่คอลัมน์หนึ่งใช้
   * - ปรับปรุง: คอลัมน์ปัจจุบันใช้นิสิตจริง · คอลัมน์หลังปรับปรุงแทนนิสิตของหลักสูตรนี้ด้วยค่าที่กรอก
   * - เปิดใหม่: ทั้งสองคอลัมน์อ่านจากคณะเดียวกันที่มีหลักสูตรใหม่แล้ว (อ้างอิง = หลังเปิดหลักสูตรใหม่)
   */
  /** q = จำนวนนิสิตของคอลัมน์ที่แก้ได้ (ตั้งต้นจากที่กรอก — ส่งค่าอื่นเพื่อลองหาจุดคุ้มทุน) */
  const scenarioOf = (b: CostBasis, m: RevenueMode, q = manual[m].q): FacultyScenario | null => {
    if (!fac) return null;

    if (!isNew) {
      if (!refId) return null;

      return {
        pool: facPool,
        programs: facPrograms,
        embedded: {
          id: refId,
          amount: b === 'manual' ? manualEmbedded : embeddedShareOf(refProg!),
        },
        ...(b === 'manual' ? { qOverride: { id: refId, q } } : {}),
      };
    }

    return {
      pool: facPool,
      programs: facPrograms,
      ...(refId ? { embedded: { id: refId, amount: embeddedShareOf(refProg!) } } : {}),
      newProgram: {
        label: newName.trim() || 'หลักสูตรใหม่',
        educationLevel: level,
        q,
        sheetShare: manualEmbedded,
      },
    };
  };
  const targetOf = (b: CostBasis) => (isNew && b === 'manual' ? NEW_PROGRAM_ID : refId);

  const activeScenario = scenarioOf('manual', mode);
  const allocBucketList = activeScenario ? allocBuckets(activeScenario, alloc.bucketLevel) : [];
  const allocPolicy = lock ? policyOf(alloc, allocBucketList) : null;
  const outcomeOf = (b: CostBasis, m: RevenueMode, q?: number) => {
    const sc = scenarioOf(b, m, q);

    return sc ? allocateFaculty(sc, allocPolicy) : null;
  };
  const activeOutcome = outcomeOf('manual', mode);
  /** ส่วนที่ต้องบวกเข้า TFC ของคอลัมน์ — 0 เมื่อตามชีต หรือนโยบายยังไม่ผ่านการตรวจ */
  const adjOf = (b: CostBasis, m: RevenueMode, q?: number) => {
    const o = outcomeOf(b, m, q);
    const t = targetOf(b);

    return o && t ? (shareOf(o, t)?.adj ?? 0) : 0;
  };
  const allocBlocker = !lock
    ? null
    : !activeOutcome
      ? fac
        ? 'เลือกหลักสูตรก่อน เพื่อปันส่วนต้นทุนคงที่ส่วนกลางคณะ'
        : 'เลือกคณะก่อน เพื่อปันส่วนต้นทุนคงที่ส่วนกลางคณะ'
      : !activeOutcome.applied
        ? 'วิธีปันส่วนที่คณะล็อกไว้ใช้กับกรณีนี้ไม่ได้ — ดูรายละเอียดในกล่อง "ปันส่วนต้นทุนคงที่" ด้านบน'
        : null;

  const result = blockResult(block, mode, adjOf('manual', mode));

  // กรณีรวม/ไม่รวมเงินแผ่นดิน วางคู่กัน · แต่ละกรณี: อ้างอิงหลักสูตรเดิม | กำหนดเอง
  const groups: CostGroup[] =
    refBlock || manualOnly
      ? MODES.map((m) => {
          const custom = manualBlockOf(m);

          return {
            key: m,
            title: REVENUE_MODE_LABEL[m],
            mode: m,
            color: m === 'with_government' ? 'primary' : 'warning',
            cols: [
              ...(refBlock
                ? [
                    {
                      key: 'ref',
                      title: text.refCol,
                      block: refBlock,
                      result: blockResult(refBlock, m, adjOf('ref', m)),
                    },
                  ]
                : []),
              {
                key: 'manual',
                title: text.customCol,
                block: custom,
                result: blockResult(custom, m, adjOf('manual', m)),
                editable: true,
              },
            ],
          };
        })
      : [];
  /** ผลของคอลัมน์ที่กำลังประเมิน แยกรายกรณี — ใช้กับตารางสัดส่วน กราฟ และการบันทึก */
  const resultOf = (m: RevenueMode) => blockResult(manualBlockOf(m), m, adjOf('manual', m));
  const mixCosts = Object.fromEntries(
    MODES.map((m) => {
      const r = resultOf(m);

      return [m, { tfc: r.tfc, avc: r.avc ?? 0 }];
    }),
  ) as ModeCosts;
  // กราฟ/รายงานแสดงทั้งสองกรณี — ทั้งสองต้องมีตัวเลขครบ
  const numbersOk = MODES.every((m) => {
    const b = manualBlockOf(m);

    return b.q > 0 && b.gov + b.income > 0 && resultOf(m).tc > 0;
  });
  const nameError = purpose === 'new' && !newName.trim();
  /** ขั้นที่ 1 (เลือกหลักสูตร + ปันส่วนต้นทุนคงที่ใช้ได้) ต้องครบก่อนไปขั้นที่ 2 */
  const pickBlocker =
    fac && lockReady && !lock
      ? `${fac}ยังไม่ได้ล็อกวิธีปันส่วนต้นทุนคงที่ — รอผู้ดูแลคณะตั้งค่าก่อน`
      : purpose === 'improve' && !refProg
        ? 'เลือกคณะและหลักสูตรที่จะปรับปรุงก่อน'
        : nameError
          ? 'กรอกชื่อหลักสูตรที่จะเปิดก่อน'
          : semesters < 1
            ? 'จำนวนเทอมต้องอย่างน้อย 1 เทอม'
            : groups.length === 0
              ? 'เลือกหลักสูตรอ้างอิง หรือถ้าไม่มี ให้กดปุ่ม "กรอกต้นทุนเอง" ในกล่องสีฟ้าด้านบนก่อน'
              : null;
  const programBlocker =
    pickBlocker ??
    (purpose === 'improve' && !confirmed ? 'กด "ยืนยันข้อมูลหลักสูตร" ในการ์ด ① ก่อน' : null);
  const saveBlocker =
    programBlocker ??
    (!numbersOk
      ? 'ต้องมีจำนวนนิสิต งบประมาณ และต้นทุนก่อน ทั้งกรณีรวมและไม่รวมเงินแผ่นดิน'
      : allocBlocker);
  const canSave = !saveBlocker;

  /**
   * จำนวนนิสิตขั้นต่ำที่คุ้มทุนทั้งกรณีรวมและไม่รวมเงินแผ่นดิน ที่ค่าธรรมเนียมต่อหัวเดิม
   * วนหาจุดตรึง q = max Q*(q) — ปันส่วนตามรายหัวทำให้ TFC (จึง Q*) ขยับตาม q · null = หาไม่ได้ (R ≤ AVC / ไม่ลู่เข้า)
   * modes = กรณีที่ต้องคุ้มทุน (ค่าเริ่มต้นทั้งสองกรณี)
   */
  const breakEvenQ = (modes: RevenueMode[] = MODES): number | null => {
    if (!refBlock || refBlock.q <= 0) return null;

    let q = refBlock.q;

    for (let i = 0; i < 30; i++) {
      const needs = modes.map(
        (m) => blockResult(withCharges(scaleQ(refBlock, q)), m, adjOf('manual', m, q)).qStar,
      );

      if (needs.some((n) => n === null || n <= 0)) return null;

      const need = Math.max(...(needs as number[]));

      if (need === q) return q;
      q = need;
    }

    return null;
  };

  /** เลือกหลักสูตร/รีเซ็ตแล้ว ตั้งคอลัมน์หลังปรับปรุงเป็นจำนวนนิสิตขั้นต่ำที่คุ้มทุน — รอรอบ render ที่มีหลักสูตรและวิธีปันส่วนแล้ว */
  // state ไม่ใช่ ref — กดรีเซ็ตซ้ำหลักสูตรเดิมต้องทำให้ effect รันอีกรอบ
  const [pendingDefault, setPendingDefault] = useState(0);

  useEffect(() => {
    if (!pendingDefault || !refBlock || !lockReady) return;
    setPendingDefault(0);
    const q = breakEvenQ();
    // กรณีรวมเงินแผ่นดินใช้ Q* หลังปรับปรุงของกรณีตัวเอง (ผู้ใช้เลือก 2026-10-18)
    const qWith = breakEvenQ(['with_government']) ?? q;

    setManual((x) => ({
      with_government: qWith !== null ? scaleQ(x.with_government, qWith) : x.with_government,
      without_government: q !== null ? scaleQ(x.without_government, q) : x.without_government,
    }));
  }, [pendingDefault, refBlock, lockReady, lock]);

  const pickRef = (p: ProgRow | null, lvl = level) => {
    setRefProg(p);
    setConfirmed(false);
    if (p) copyManualFrom(p);

    setSegs(buildSegments(lvl, p, semesters));
  };

  const onFacChange = (v: string | null) => {
    setFac(v);
    pickRef(null);
  };

  // ผู้ดูแลคณะ/อาจารย์: คณะถูกกำหนดตามบัญชี — ตั้งให้เอง (รวมหลังล้างฟอร์ม) และไม่ค้างคณะอื่นจากร่างเดิม
  useEffect(() => {
    if (draftReady && scopedFac && fac !== scopedFac) onFacChange(scopedFac);
  }, [draftReady, scopedFac, fac]);

  const onLevelChange = (v: string) => {
    setLevel(v);
    pickRef(null, v);
  };

  const onSemestersChange = (v: number) => {
    setSemesters(v);
    setSegs((xs) => xs.map((s) => ({ ...s, semesters: v })));
  };

  /** ยืนยันขั้นที่ 1 → ตาราง ② ตั้งต้นจากหลักสูตร ที่จำนวนนิสิตขั้นต่ำที่คุ้มทุนตามเทอม/ปีที่ยืนยัน */
  const confirmProgram = () => {
    if (!refProg || pickBlocker) return;
    copyManualFrom(refProg);
    setPendingDefault((n) => n + 1);
    setConfirmed(true);
    setToast(`ยืนยัน${refProg.prog} ${semesters} เทอม/ปีแล้ว — ทดลองปรับตัวเลขในการ์ด ② ได้`);
  };

  const clearForm = () => {
    setNewName('');
    setNameTouched(false);
    setFac(null);
    setLevel(EDUCATION_LEVELS[0] ?? 'ปริญญาตรี');
    setSemesters(2);
    setRefProg(null);
    setManualOnly(false);
    setConfirmed(false);
    setManual(bothModes(emptyBlock()));
    setManualEmbedded(0);
    setSegs(buildSegments(EDUCATION_LEVELS[0] ?? 'ปริญญาตรี', null, 2));
    setEditingId(null);
    saveDraft(purpose, null);
  };

  const allocTargetLabel = isNew ? 'หลักสูตรใหม่' : 'หลักสูตรนี้';

  /** ผลที่เพิ่งบันทึก — เปิดกล่องแจ้งสำเร็จ */
  const [savedEntry, setSavedEntry] = useState<ProgramHistoryEntry | null>(null);

  const handleSave = () => {
    if (!canSave) return;

    const name = isNew ? newName.trim() : (refProg?.prog ?? '');

    // ต้นทุนกำหนดเองแยกตามกรณี → คิดแต่ละโหมดจากก้อนของโหมดนั้น
    const both = (m: RevenueMode) => {
      const b = manualBlockOf(m);
      const r = resultOf(m);

      return calcBreakEvenBothModes({
        q: b.q,
        governmentBudget: b.gov,
        incomeBudget: b.income,
        tfc: r.tfc,
        tvc: r.tvc,
      })[m];
    };

    const editing = history.some((h) => h.id === editingId);
    const entry: ProgramHistoryEntry = {
      id: editing && editingId ? editingId : Date.now(),
      time: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
      name,
      fac: fac ?? '',
      level,
      isNew,
      ref: refProg ? progOptionLabel(refProg) : undefined,
      q: block.q,
      tr: block.gov + block.income,
      tfc: result.tfc,
      tvc: result.tvc,
      avc: result.avc ?? 0,
      withGov: both('with_government'),
      withoutGov: both('without_government'),
      allocMethod: ALLOC_METHOD_LABEL[alloc.method],
      mode,
      detail: {
        refCol: text.refCol,
        customCol: text.customCol,
        basisCol: text.customCol,
        semesters,
        fees: refProg ? feesForProgram(refProg.fac, refProg.deg) : [],
        alloc: activeOutcome
          ? {
              method: ALLOC_METHOD_LABEL[alloc.method],
              hint: METHOD_HINT[alloc.method],
              source: lock
                ? `คณะล็อกไว้เมื่อ ${fmtLockedAt(lock.lockedAt)} โดย ${lock.lockedBy}`
                : null,
              pool: facPool,
              programs: activeOutcome.shares.length,
              targetLabel: allocTargetLabel,
              shares: activeOutcome.shares.map((x) => {
                const p = facRows.find((r) => r.id === x.id)?.p;
                const target = x.id === targetOf('manual');
                const after = p && { ...p, TFC: p.TFC - x.before + x.after };

                return {
                  label: x.label,
                  lvl: p?.lvl ?? level,
                  q: target ? block.q : (p?.Q ?? manual[mode].q),
                  before: x.before,
                  after: x.after,
                  target,
                  ...(p && after && !target
                    ? {
                        qStar: Object.fromEntries(
                          MODES.map((m) => [
                            m,
                            { before: sheetQStar(p, m), after: sheetQStar(after, m) },
                          ]),
                        ) as Record<RevenueMode, { before: number; after: number }>,
                      }
                    : {}),
                };
              }),
              ...(alloc.method === 'CUSTOM_PCT'
                ? {
                    pct: {
                      level: alloc.bucketLevel === 'PROGRAM' ? 'รายหลักสูตร' : 'ระดับการศึกษา',
                      subMethod:
                        alloc.bucketLevel === 'PROGRAM'
                          ? null
                          : alloc.subMethod === 'PER_HEAD_FTES'
                            ? 'ตามรายหัว'
                            : 'หารเท่ากัน',
                      lines: allocBucketList.map((b) => ({
                        label: b.label,
                        programs: b.programCount,
                        q: b.q,
                        pct: alloc.pct[b.key] ?? '',
                      })),
                    },
                  }
                : {}),
              warnings: activeOutcome.issues.map((i) => i.message),
            }
          : null,
        groups,
        showAllocAdj: true,
        segs,
        mixCosts,
      },
      input: currentDraft(),
    };

    // แก้ไขผลเดิม → ทับรายการเดิมและยกขึ้นบนสุด · ไม่ได้แก้ไข → เพิ่มรายการใหม่
    const next = [entry, ...history.filter((h) => h.id !== entry.id)];

    setHistory(next);
    saveHistory(next);
    setEditingId(entry.id);
    setSavedEntry(entry);
  };

  const router = useRouter();
  /** เปิดผลที่บันทึกไว้แล้วไปขั้นสรุป — รอให้ขั้นที่ 1 ผ่าน (วิธีปันส่วนของคณะโหลดเสร็จ) ก่อน */
  const [pendingStep, setPendingStep] = useState(false);

  const openEntry = (h: ProgramHistoryEntry) => {
    if (!h.input) return;

    if (h.isNew !== isNew) {
      // คนละหน้ากัน (ปรับปรุง ↔ เปิดใหม่) — ไปหน้านั้นแล้วเปิดที่นั่น
      router.push(`/scenario/program/${h.isNew ? 'new' : 'improve'}?open=${h.id}`);

      return;
    }

    applyDraft(h.input as Draft);
    setEditingId(h.id);
    setPendingStep(true);
    setToast(`เปิด "${h.name}" แล้ว — แก้ไขได้ กดบันทึกเพื่อทับผลเดิม`);
  };

  /** รายการที่รอยืนยันการลบ */
  const [deleteTarget, setDeleteTarget] = useState<ProgramHistoryEntry | null>(null);

  const deleteEntry = (h: ProgramHistoryEntry) => {
    const next = history.filter((x) => x.id !== h.id);

    setHistory(next);
    saveHistory(next);
    if (editingId === h.id) setEditingId(null);
    setToast(`ลบ "${h.name}" แล้ว`);
  };

  const uni = computeBreakEven(RAW.UNI, mode);
  const latest = history[0];
  const [printId, setPrintId] = useState<number | null>(null);
  const printEntry = history.find((h) => h.id === printId) ?? latest;
  /** เปิดดูตัวอย่างรายงานก่อน — ดาวน์โหลด/พิมพ์จากในกล่องตัวอย่าง */
  const [previewOpen, setPreviewOpen] = useState(false);
  const printReport = (id: number) => {
    setPrintId(id);
    setPreviewOpen(true);
  };
  /** ขั้นที่ 1 ต้องครบก่อน ครบแล้วไปขั้นไหนก็ได้ — กลับไปแก้จนไม่ครบ ขั้นหลังล็อกคืนเอง */
  const locked = groups.length === 0;
  const stepBlocker = programBlocker ?? allocBlocker;
  const stepKeys = STEP_KEYS[purpose];
  const stepLabels = stepKeys.map((k) => STEP_LABEL[k]);
  const stepHints = stepKeys.map((k) => STEP_HINT[purpose][k]);
  /** สิ่งที่ต้องทำในแต่ละขั้น เรียงตามลำดับการ์ดในหน้า */
  const guide: Record<StepKey, { title: string; items: GuideItem[] }> = {
    program: isNew
      ? {
          title: 'กรอกข้อมูลหลักสูตรใหม่',
          items: [
            { text: 'ตั้งชื่อหลักสูตรที่จะเปิด', done: !nameError },
            {
              text: 'เลือก คณะ → ระดับ → หลักสูตรอ้างอิง (หรือกด "กรอกต้นทุนเอง" ถ้าไม่มี)',
              done: groups.length > 0,
            },
            { text: 'กด "ถัดไป" ที่แถบด้านล่าง เพื่อไปกรอกต้นทุนและรายได้' },
          ],
        }
      : {
          title: 'เลือกหลักสูตรและทดลองปรับตัวเลข',
          items: [
            { text: 'เลือก คณะ → ระดับ → หลักสูตรที่จะปรับปรุง (การ์ด ①)', done: !!refProg },
            { text: 'ตั้ง "เทอม/ปี" ให้เรียบร้อย แล้วกด "ยืนยันข้อมูลหลักสูตร"', done: confirmed },
            {
              text: 'ช่อง "หลังปรับปรุง" ตั้งต้นเป็นจำนวนนิสิตขั้นต่ำที่คุ้มทุนทั้ง 2 กรณีให้แล้ว — ทดลองแก้จำนวนนิสิต และ/หรือ ค่าธรรมเนียมได้ (การ์ด ②)',
            },
            {
              text: 'ดูผลที่แถว "จำนวนนิสิต ณ จุดคุ้มทุน (Q*)" — แถว Diff เป็นสีเขียว = รับนิสิตพอแล้ว คุ้มทุน',
            },
            { text: 'พอใจแล้วกด "ถัดไป" ที่แถบด้านล่าง' },
          ],
        },
    cost: {
      title: 'กรอกต้นทุนและรายได้',
      items: [
        { text: 'กรอก/แก้ตัวเลขในคอลัมน์ "หลักสูตรใหม่" ทั้งกรณีรวมและไม่รวมเงินแผ่นดิน' },
        { text: 'ต้องมีจำนวนนิสิต งบประมาณ และต้นทุน ครบทั้งสองกรณี', done: numbersOk },
        { text: 'กด "ถัดไป" ที่แถบด้านล่าง' },
      ],
    },
    mix: {
      title: 'แบ่งสัดส่วนนิสิตแต่ละกลุ่ม',
      items: [
        {
          text: `จำนวนนิสิตตั้งต้นจากขั้นที่ 1 (${REVENUE_MODE_LABEL[mode]} ${fmtInt(targetQ)} คน) แบ่งตามสัดส่วนเดิม — แก้รายกลุ่มได้ (ไทย/ต่างชาติ ในเวลา/นอกเวลา)`,
        },
        { text: 'ดูแถว "กำไร (ขาดทุน)" ว่าแต่ละกลุ่มคุ้มทุนหรือไม่' },
        { text: 'กด "ถัดไป" เพื่อดูสรุปผล (ขั้นนี้ข้ามได้ถ้าไม่ต้องแยกกลุ่ม)' },
      ],
    },
    summary: {
      title: 'ตรวจผล บันทึก และออกรายงาน',
      items: [
        { text: `ตรวจผลเทียบ "${text.refCol}" กับ "${text.customCol}" และกราฟจุดคุ้มทุน` },
        { text: 'กดปุ่ม "บันทึกผลคำนวณ" เพื่อเก็บผลไว้ในประวัติ' },
        { text: 'กด "ออกรายงาน PDF" เพื่อพิมพ์หรือแนบเสนอ' },
      ],
    },
  };
  const maxStep = stepBlocker ? 0 : stepKeys.length - 1;
  const [step, setStep] = useState(0);
  const activeStep = Math.min(step, maxStep);
  const stepKey = stepKeys[activeStep];

  // ลดขั้นที่จำไว้ตาม — ไม่ให้เด้งข้ามไปขั้นหลังเองเมื่อกรอกครบ
  useEffect(() => {
    if (step > maxStep) setStep(maxStep);
  }, [step, maxStep]);
  const goTo = (i: number) => {
    setStep(Math.min(i, maxStep));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!pendingStep || !lockReady || maxStep === 0) return;
    setPendingStep(false);
    goTo(maxStep);
  }, [pendingStep, lockReady, maxStep]);
  /** เริ่มคำนวณหลักสูตรถัดไป — ล้างฟอร์มแล้วกลับขั้นที่ 1 (ประวัติยังอยู่) */
  const startNew = () => {
    clearForm();
    goTo(0);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ '@media print': { display: 'none' } }}>
        <PageHeaderBar
          title="คำนวณจุดคุ้มทุนรายหลักสูตร"
          mode={mode}
          onModeChange={setMode}
          q={uni.q}
          profit={uni.profit}
        />

        {/* หน้านี้กรอกตัวเลขเอง ไม่ได้อ่านจากรอบคำนวณ จึงขึ้นเฉพาะแถบข้อมูลตัวอย่าง (ตาม mockup) */}
        <DataCaveatNotes profit={uni.profit} limitations={false} />

        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
          {text.heading}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <WizardStepper
            steps={stepLabels}
            hints={stepHints}
            active={activeStep}
            maxStep={maxStep}
            onGo={goTo}
          />

          {stepKey && (purpose !== 'improve' || SHOW_IMPROVE_STEP_GUIDE) && (
            <StepGuide
              active={activeStep}
              total={stepKeys.length}
              title={guide[stepKey].title}
              items={guide[stepKey].items}
            />
          )}

          {editingId !== null && history.some((h) => h.id === editingId) && (
            <Alert
              severity="info"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    setEditingId(null);
                    setToast('เลิกแก้ไขแล้ว — กดบันทึกจะเพิ่มเป็นรายการใหม่');
                  }}
                >
                  บันทึกเป็นรายการใหม่แทน
                </Button>
              }
            >
              กำลังแก้ไขผลที่บันทึกไว้: {history.find((h) => h.id === editingId)?.name} — กดบันทึกจะทับผลเดิม
            </Alert>
          )}

          {/* ปันส่วนต้นทุนคงที่: คณะล็อกไว้แล้ว แก้ไม่ได้ — อยู่บนสุดของขั้นที่ 1 หุบไว้ บอกแค่วิธีที่คณะเลือก */}
          {stepKey === 'program' && fac && lock && (
            <FixedCostAllocationCard
              faculty={fac}
              isNew={isNew}
              hasRef={isNew ? manualEmbedded !== 0 : !!refProg}
              lock={lock}
              pool={facPool}
              rows={facRows}
              outcome={activeOutcome}
              targetId={targetOf('manual')}
              targetLabel={allocTargetLabel}
              targetQ={targetQ}
              mode={mode}
              collapsible
            />
          )}

          {stepKey === 'program' && (
            <ProgramStep
              purpose={purpose}
              refLabel={text.refLabel}
              newName={newName}
              onNewNameChange={setNewName}
              nameTouched={nameTouched}
              onNameBlur={() => setNameTouched(true)}
              nameError={nameError}
              facultyOptions={facultyOptions}
              fac={fac}
              onFacChange={onFacChange}
              level={level}
              onLevelChange={onLevelChange}
              semesters={semesters}
              onSemestersChange={onSemestersChange}
              refOptions={refOptions}
              refProg={refProg}
              onRefChange={(p) => pickRef(p)}
              onManual={
                isNew && !refProg && !manualOnly
                  ? () => {
                      setManualOnly(true);
                      // maxStep ยังเป็นค่าก่อนเลือกกรอกเอง — ตั้งตรง แล้วให้ effect ลดขั้นถ้าขั้นที่ 1 ยังไม่ครบ
                      setStep(1);
                    }
                  : undefined
              }
              onClear={() => setConfirm('form')}
              {...(purpose === 'improve'
                ? {
                    confirmed,
                    confirmBlocker: pickBlocker,
                    onConfirm: confirmProgram,
                    onEdit: () => setConfirm('edit'),
                  }
                : {})}
            />
          )}
          {stepKey === 'program' && fac && lockReady && !lock && (
            <NoLockAlert faculty={fac} role={role} />
          )}

          {/* ยังไม่เลือกหลักสูตร (เข้าหน้าครั้งแรก/ล้างฟอร์ม) — ยังดู/ออก PDF ผลที่บันทึกไว้ได้ */}
          {locked && history.length > 0 && (
            <HistoryTable
              history={history}
              onPrint={canReport ? printReport : undefined}
              onClear={() => setConfirm('history')}
              onOpen={openEntry}
              onDelete={setDeleteTarget}
              editingId={editingId}
            />
          )}

          {(stepKey === 'cost' || (stepKey === 'program' && !isNew && !programBlocker)) && (
            <CostStep
              title={basicOnly ? '② ทดลองปรับจำนวนนิสิต / ค่าธรรมเนียม' : undefined}
              groups={groups}
              subheader={
                refBlock
                  ? `${basicOnly ? 'พิมพ์ตัวเลขใหม่ในช่องสีเหลือง (คอลัมน์ "✎ หลังปรับปรุง") — ผลจุดคุ้มทุนคำนวณให้ทันที' : text.tableHint} · ค่าธรรมเนียมรายการหลักและหักสมทบคิดต่อหัวตามจริงของหลักสูตร × จำนวนนิสิต`
                  : 'กรอกต้นทุนรายหมวดเองแยกกรณีรวม/ไม่รวมเงินแผ่นดิน'
              }
              showAllocAdj
              basicOnly={basicOnly}
              // ตารางส่งก้อนที่แสดงอยู่กลับมา — ค่าธรรมเนียมรายการหลัก/หักสมทบในนั้นอาจเป็นค่าที่คิดจากอัตรา × Q
              // (แก้ไม่ได้ในตาราง) จึงคงค่าดิบของหลักสูตรไว้ ไม่งั้นแก้ Q กลับเท่าเดิมแล้ว TC/Q* ไม่กลับเป็นปัจจุบัน
              onChange={(m, b) =>
                setManual((x) => ({
                  ...x,
                  [m]: { ...b, mainFee: x[m].mainFee, uniShare: x[m].uniShare },
                }))
              }
              onReset={
                refProg
                  ? () => {
                      copyManualFrom(refProg);
                      if (purpose === 'improve') {
                        setPendingDefault((n) => n + 1);
                        setToast(
                          `รีเซ็ต${text.customCol}แล้ว — จำนวนนิสิตตั้งเป็นขั้นต่ำที่คุ้มทุนทั้ง 2 กรณี`,
                        );
                      } else {
                        setToast(`รีเซ็ตคอลัมน์${text.customCol}กลับเป็นค่า${text.refCol}แล้ว`);
                      }
                    }
                  : undefined
              }
              resetLabel={`รีเซ็ต${text.customCol}`}
            />
          )}

          {stepKey === 'mix' && (
            <MixStep
              segs={segs}
              onSegsChange={setSegs}
              costs={mixCosts}
              note={`ตั้งต้นจากจำนวนนิสิต${text.customCol}ในขั้นที่ 1 กรณี${REVENUE_MODE_LABEL[mode]} (${fmtInt(targetQ)} คน) แบ่งตามสัดส่วนเดิม · สลับกรณีที่ "ฐานรายได้" ด้านบน`}
            />
          )}

          {stepKey === 'summary' && (
            <SummaryStep
              groups={groups}
              compareSubheader={
                refBlock
                  ? `เทียบ${text.refCol}กับ${text.customCol} ทั้งกรณีรวมและไม่รวมเงินแผ่นดิน · กราฟ ตารางสัดส่วนนิสิต และการบันทึกใช้${text.customCol}`
                  : `${text.customCol} ทั้งกรณีรวมและไม่รวมเงินแผ่นดิน`
              }
              chartSubheader={`${text.customCol} · เทียบกรณีรวมและไม่รวมเงินแผ่นดิน`}
              chart={MODES.flatMap((m) => {
                const q = manualBlockOf(m).q;
                const r = resultOf(m);

                return q > 0
                  ? [
                      {
                        mode: m,
                        q,
                        tfc: r.tfc,
                        avc: r.avc ?? 0,
                        rPerHead: r.r ?? 0,
                        qStar: r.qStar,
                      },
                    ]
                  : [];
              })}
              saveBlocker={saveBlocker}
              onSave={handleSave}
              history={history}
              onPrint={canReport ? printReport : undefined}
              onClearHistory={() => setConfirm('history')}
              onOpenHistory={openEntry}
              onDeleteHistory={setDeleteTarget}
              editingId={editingId}
            />
          )}

          <WizardNav
            steps={stepLabels}
            active={activeStep}
            lockReason={activeStep >= maxStep ? stepBlocker : null}
            groups={groups}
            onGo={goTo}
            onRestart={() => setConfirm('form')}
          />
        </Box>
      </Box>

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)}>
        <DialogTitle>
          {confirm === 'form'
            ? 'ล้างฟอร์มและเริ่มที่ขั้นตอนที่ 1?'
            : confirm === 'edit'
              ? 'แก้ไขข้อมูลหลักสูตร?'
              : 'ล้างประวัติการคำนวณ?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirm === 'form'
              ? 'ชื่อหลักสูตร ข้อมูลหลักสูตร หลักสูตรอ้างอิง ต้นทุนที่กรอกเอง และตารางสัดส่วนนิสิตจะถูกล้างกลับเป็นค่าตั้งต้น (ประวัติที่บันทึกไว้ไม่หาย)'
              : confirm === 'edit'
                ? 'การ์ด ② จะซ่อนระหว่างแก้ไข และเมื่อกดยืนยันใหม่ ตัวเลขที่ทดลองไว้จะถูกรีเซ็ตเป็นจำนวนนิสิตขั้นต่ำที่คุ้มทุนตามเทอม/ปีใหม่'
                : `ประวัติทั้งหมด (${history.length} รายการ) จะถูกลบออกจากเครื่องนี้ถาวร และหน้า "แผนการรับนิสิต" จะเลือกผลคำนวณเหล่านี้ไม่ได้อีก`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>ยกเลิก</Button>
          <Button
            variant="contained"
            color={confirm === 'edit' ? 'primary' : 'error'}
            onClick={() => {
              if (confirm === 'edit') {
                setConfirmed(false);
                setToast('แก้ไขข้อมูลหลักสูตรได้แล้ว — เสร็จแล้วกด "ยืนยันข้อมูลหลักสูตร"');
              } else if (confirm === 'form') {
                startNew();
                setToast('ล้างฟอร์มแล้ว — เริ่มที่ขั้นตอนที่ 1');
              } else {
                setHistory([]);
                saveHistory([]);
                setEditingId(null);
                setToast('ล้างประวัติการคำนวณแล้ว');
              }

              setConfirm(null);
            }}
          >
            {confirm === 'form' ? 'ล้างฟอร์ม' : confirm === 'edit' ? 'แก้ไข' : 'ล้างประวัติ'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>ลบผลการจำลองนี้?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            &quot;{deleteTarget?.name}&quot; ({deleteTarget?.time}) จะถูกลบออกจากประวัติถาวร
            และหน้า &quot;แผนการรับนิสิต&quot; จะเลือกผลนี้ไม่ได้อีก
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>ยกเลิก</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (deleteTarget) deleteEntry(deleteTarget);
              setDeleteTarget(null);
            }}
          >
            ลบ
          </Button>
        </DialogActions>
      </Dialog>

      <SaveSuccessDialog
        entry={savedEntry}
        onClose={() => setSavedEntry(null)}
        onReport={
          canReport
            ? (id) => {
                setSavedEntry(null);
                printReport(id);
              }
            : undefined
        }
        onStartNew={() => {
          setSavedEntry(null);
          startNew();
          setToast('เริ่มคำนวณใหม่ — ผลก่อนหน้าอยู่ในประวัติการคำนวณ');
        }}
      />

      <ReportPreviewDialog
        entry={previewOpen ? (printEntry ?? null) : null}
        onClose={() => setPreviewOpen(false)}
        onPrint={() => window.print()}
        onToast={setToast}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
      />

      {/* รายงานสำหรับพิมพ์เท่านั้น — ซ่อนบนหน้าจอปกติ แสดงเฉพาะตอนสั่งพิมพ์ (window.print) */}
      {canReport && printEntry && (
        <Box sx={{ display: 'none', '@media print': { display: 'block' } }}>
          <ProgramReport entry={printEntry} />
        </Box>
      )}
    </Box>
  );
};

export default ScenarioProgramView;
