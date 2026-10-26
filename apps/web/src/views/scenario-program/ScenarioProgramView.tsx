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
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';

import { calcBreakEvenBothModes, type RevenueMode } from '@beps/calc-engine';

// Component Imports
import DataCaveatNotes from '@components/DataCaveatNotes';
import PageHeaderBar, { MOCK_RUN } from '@components/PageHeaderBar';

// Data / calc Imports
import { canExportReport, lockedFacultyFor, roleDisplay } from '@/configs/accessControl';
import { RAW } from '@/data/mockup';
import { computeBreakEven, REVENUE_MODE_LABEL, sheetQStar } from '@views/breakeven/calc';
import { feesForProgram } from '@views/tuition/feeData';
import { facultyRows, poolAmountOf } from '@views/fixed-cost-policy/data';
import {
  lockFacultyBySubmit,
  policySourceLabel,
  useFacultyLock,
} from '@views/fixed-cost-lock/lockStore';
import { useAuthUser } from '@/hooks/AuthHooks';
import { useRole } from '@/hooks/useRole';

import ProgramReport from './ProgramReport';
import ReportPreviewDialog from './ReportPreviewDialog';
import { type CostGroup } from './CostBlockTable';
import FixedCostAllocationCard, {
  METHOD_HINT,
  type MethodCompareRow,
} from './FixedCostAllocationCard';
import {
  ALLOC_METHOD_LABEL,
  ALLOC_METHOD_SHORT,
  allocateFaculty,
  allocBuckets,
  newProgramChoice,
  DEFAULT_ALLOC_CHOICE,
  NEW_PROGRAM_ID,
  policyOf,
  shareOf,
  type AllocMethod,
  type FacultyScenario,
} from './facultyAllocation';
import { type ModeCosts } from './StudentMixTable';
import { buildSegments, fitSegs, scaleSegs, segTotals } from './segments';
import CostStep from './steps/CostStep';
import HistoryTable from './steps/HistoryTable';
import SaveSuccessDialog from './steps/SaveSuccessDialog';
import MixStep, { type CostBasis } from './steps/MixStep';
import ProgramStep, { type Purpose } from './steps/ProgramStep';
import SummaryStep from './steps/SummaryStep';
import {
  SlimStepper,
  StepGuide,
  WizardNav,
  WizardStepper,
  type GuideItem,
  type StepKey,
} from './steps/WizardStepper';
import {
  blockFromProgram,
  blockResult,
  defaultYears,
  embeddedShareOf,
  emptyBlock,
  scaleQ,
  withPerHeadCharges,
  type CostBlock,
  type Segment,
} from './newProgramCalc';
import {
  PG_DATA,
  EDUCATION_LEVELS,
  DEFAULT_LEVEL,
  levelsOfFaculty,
  progOptionLabel,
} from './programData';
import { loadHistory, saveHistory } from './historyStore';
import { isSubmitted, type ProgramHistoryEntry } from './types';
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
    refLabel: 'หลักสูตรอ้างอิง',
    refCol: 'หลักสูตรอ้างอิง',
    customCol: 'หลักสูตรใหม่',
    tableHint:
      'กรอกตัวเลขในคอลัมน์ "หลักสูตรใหม่" เฉพาะกรณีรวมเงินแผ่นดิน แก้ได้ทุกช่อง (ตั้งต้นจากหลักสูตรอ้างอิง) — ระบบคำนวณกรณีไม่รวมเงินแผ่นดินให้อัตโนมัติ · ผลต่าง = หลักสูตรใหม่ − อ้างอิง',
  },
};
/** ปรับปรุงหลักสูตรเดิม: ตารางต้นทุนขึ้นในขั้นที่ 1 ทันทีที่เลือกหลักสูตร (ตั้งต้นจากตัวเลขปัจจุบัน) — ไม่แยกเป็นขั้นของตัวเอง */
const fmtInt = (v: number) => (Math.round(v) || 0).toLocaleString('th-TH');

const STEP_KEYS: Record<Purpose, StepKey[]> = {
  improve: ['program', 'mix', 'summary'],
  new: ['program', 'mix', 'summary'],
};

/** ชื่อขั้นตามมติประชุม — ปรับปรุงหลักสูตร 25 ต.ค. · เปิดหลักสูตรใหม่ 26 ต.ค. */
const PURPOSE_STEP_LABEL: Record<Purpose, Record<StepKey, string>> = {
  improve: {
    program: 'คำนวณตั้งต้น',
    mix: 'แจกแจงแผนรับนิสิต',
    summary: 'พรีวิวรายงาน & ยืนยัน',
  },
  new: {
    program: 'ข้อมูลหลักสูตรและการคำนวณตั้งต้น',
    mix: 'แจกแจงสัดส่วนแผนรับนิสิต',
    summary: 'สรุปและพรีวิวรายงาน',
  },
};

/** คำอธิบายสั้นใต้ชื่อขั้นในแถบขั้นตอน — ผู้ใช้ใหม่เห็นทันทีว่าแต่ละขั้นทำอะไร */
const STEP_HINT: Record<Purpose, Record<StepKey, string>> = {
  improve: {
    program: 'เลือกหลักสูตร ปรับจำนวนนิสิต/ค่าธรรมเนียม',
    mix: 'แบ่งนิสิตไทย/ต่างชาติ/นอกเวลา',
    summary: 'บันทึก และออกรายงาน PDF',
  },
  new: {
    program: 'ตั้งชื่อ เลือกหลักสูตรอ้างอิง กรอกจำนวนนิสิต/ค่าธรรมเนียม',
    mix: 'แบ่งนิสิตไทย/ต่างชาติ/นอกเวลา (ถ้ามี)',
    summary: 'ตรวจผล บันทึกร่าง พิมพ์ร่าง หรือยืนยันออกรายงาน PDF',
  },
};

/** ก้อนต้นทุนรายกรณี — กรอกขาเดียว ทั้งสองกรณีเป็นก้อนเดียวกัน (ไม่รวมเงินแผ่นดินแค่ไม่นับเงินแผ่นดินในรายได้) */
type ManualBlocks = Record<RevenueMode, CostBlock>;

const MODES: RevenueMode[] = ['with_government', 'without_government'];
/** เพดานค้นหาจำนวนนิสิตขั้นต่ำที่คุ้มทุน — เกินนี้ถือว่าหาไม่ได้ */
const MAX_BREAKEVEN_Q = 20000;
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
  /** ปรับปรุงหลักสูตร: ฟอร์มนี้ยืนยัน (SUBMITTED) เป็นรายการนี้แล้ว — ล็อกห้ามแก้ */
  lockedId?: number | null;
  /** วิธีปันส่วน ณ ตอนเก็บร่าง — เปิดกลับมาแล้ววิธีของคณะเปลี่ยน แจ้งผู้ใช้ (D7) */
  allocMethod?: string;
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
type Rate = { fee: number; gov: number };

/** อัตราเฉลี่ยของการ์ด ② ไว้เช็กว่าเปลี่ยนหรือยัง — ยังไม่มีนิสิต = null */
const rateOf = (b: { q: number; income: number; gov: number }, semesters: number): Rate | null =>
  b.q > 0 && semesters > 0 ? { fee: b.income / b.q / semesters, gov: b.gov / b.q / semesters } : null;

/** เทียบอัตราแบบเผื่อเศษทศนิยม (scaleQ คูณ/หารแล้วเลขท้ายขยับ) */
const sameRate = (a: Rate | null, b: Rate | null) =>
  !!a && !!b && Math.abs(a.fee - b.fee) < 1e-6 && Math.abs(a.gov - b.gov) < 1e-6;

const ScenarioProgramView = ({ purpose }: { purpose: Purpose }) => {
  const [newName, setNewName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [fac, setFac] = useState<string | null>(null);
  const [level, setLevel] = useState<string>(DEFAULT_LEVEL);
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
  const { lock: facLock, ready: lockReady } = useFacultyLock(year, fac);
  /** เปิดหลักสูตรใหม่ก็ใช้วิธีที่คณะล็อกไว้ (ผู้ใช้สั่ง 2026-10-24) — กำหนด % รายหลักสูตรปรับใน newProgramChoice ด้านล่าง */
  const lock = facLock;
  /** ผู้ดูแลคณะ/อาจารย์ทำได้เฉพาะคณะ (และหลักสูตร) ของตน */
  const { role, scope } = useRole();
  const scopedFac = lockedFacultyFor(role, scope);
  const scopedProg = role === 'lecturer' ? scope.program : null;
  const canReport = canExportReport(role);
  const { user } = useAuthUser();
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
  /** รายการที่ฟอร์มนี้ยืนยันไปแล้ว — ล็อกฟอร์มจนกว่าจะเริ่มใหม่ หรือกองแผนปลดล็อก */
  const [lockedId, setLockedId] = useState<number | null>(null);
  /** วิธีปันส่วน ณ ตอนบันทึกร่างที่เปิดมาแก้ — ต่างจากปัจจุบันแจ้งผู้ใช้ (D7) */
  const [openedMethod, setOpenedMethod] = useState<string | null>(null);
  /** อัตราเฉลี่ยของการ์ด ② ที่ตาราง ③ ตรงกันล่าสุด — ต่างจากปัจจุบัน = ผู้ใช้แก้ค่าธรรมเนียมในการ์ด ② · null = เพิ่งเลือกหลักสูตร */
  const prevRate = useRef<Rate | null>(null);
  /** สัดส่วนนิสิต/อัตรารายกลุ่มที่ผู้ใช้ตั้งไว้ล่าสุดในตาราง ③ — แบ่ง/ปรับจากชุดนี้เสมอ พิมพ์ในการ์ด ② ทีละหลัก
   *  (ผ่าน 0 หรือ 3 คน) แล้วนิสิตต่างชาติหรือส่วนต่างค่าธรรมเนียมจึงไม่หาย · null = ใช้ตารางปัจจุบัน */
  const mixShape = useRef<Segment[] | null>(null);

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
    const loaded = 'q' in d.manual ? bothModes(d.manual) : d.manual;
    // กรอกขาเดียว (ปรับปรุง D1 · เปิดใหม่ มติ 26 ต.ค.) — ร่างเก่าที่เคยกรอกแยกรายกรณี ยึดก้อนรวมเงินแผ่นดิน
    const manualBlocks = bothModes(loaded.with_government);

    setManual(manualBlocks);
    prevRate.current = rateOf(manualBlocks.with_government, d.semesters);
    mixShape.current = null;
    // ร่างเก่าเก็บชื่อหัวคอลัมน์แบบเดิม/ป.โท-เอกมี 4 คอลัมน์ — ใช้ชื่อปัจจุบันและเติมคอลัมน์ที่ขาด
    const blank = buildSegments(d.level, null, d.semesters);

    setSegs(blank.map((b, i) => ({ ...(d.segs[i] ?? b), label: b.label })));
    // ร่างรุ่นก่อนไม่ได้จำ — ตัวเลขกำหนดเองตั้งต้นจากหลักสูตรอ้างอิงเสมอ
    const ref = RAW.PROGS.find((p) => refKeyOf(p) === d.refKey);

    setManualEmbedded(d.manualEmbedded ?? (ref ? embeddedShareOf(ref) : 0));
    // ร่างรุ่นก่อนไม่มีขั้นยืนยัน — มีหลักสูตรแล้วถือว่ายืนยัน ตัวเลขที่ทดลองไว้จะได้ไม่ถูกรีเซ็ต
    setConfirmed(purpose === 'improve' ? !!ref : (d.confirmed ?? !!ref));
    setLockedId(d.lockedId ?? null);
    setOpenedMethod(d.allocMethod ?? null);
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
      setOpenedMethod(opened.allocMethod ?? null);
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
    lockedId,
    ...(lock ? { allocMethod: ALLOC_METHOD_LABEL[alloc.method] } : {}),
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
    lockedId,
  ]);

  const targetQ = manual[mode].q;
  // การ์ด ③ คิดจากกรณีรวมเงินแผ่นดินของการ์ด ② เสมอ ไม่ตามฐานรายได้ที่หัวหน้า
  const mixBase = manual.with_government;

  // การ์ด ② (ผลรวม) กับตาราง ③ (อัตรารายกลุ่ม) เป็นข้อมูลชุดเดียวกัน — ขั้นที่ 3 กราฟ และรายงานจึงตรงกับที่จำลองเสมอ
  // ② เปลี่ยน Q → แบ่งนิสิตใหม่ตามสัดส่วนเดิม อัตรารายกลุ่มคงเดิม · ② เปลี่ยนค่าธรรมเนียม/เงินแผ่นดิน (Q เท่าเดิม)
  // → ปรับทุกกลุ่มเป็นสัดส่วนเท่ากัน · แล้วเขียนผลรวมของ ③ กลับที่ ② (เปลี่ยน Q แล้วค่าธรรมเนียมเฉลี่ยขยับตามสัดส่วนกลุ่ม)
  // แก้ใน ③ ดู onMixChange
  useEffect(() => {
    if (!draftReady) return;
    const b = mixBase;
    const t0 = segTotals(segs);

    // ③ เป็น 0 ทั้งตาราง หลังเคยตรงกันแล้ว = กำลังพิมพ์ใหม่ในตาราง ③ — รอค่าก่อน (เพิ่งเลือกหลักสูตร → ใส่กลุ่มแรก)
    if (b.q <= 0 || (t0.q <= 0 && prevRate.current)) return;

    const shape = (mixShape.current ??= segs);
    const counts = scaleSegs(shape, b.q);
    let next = t0.q !== b.q ? segs.map((s, i) => ({ ...s, n: counts[i]!.n })) : segs;

    // เพิ่งเลือกหลักสูตร (อัตราตามแท็บค่าธรรมเนียม → ให้ผลรวมเท่าตัวเลขปัจจุบัน) หรือแก้อัตราในการ์ด ②
    const fresh = !prevRate.current;

    if (fresh || (t0.q === b.q && !sameRate(prevRate.current, rateOf(b, semesters)))) {
      const rates = next.map((s, i) => ({ ...s, fee: shape[i]!.fee, gov: shape[i]!.gov }));

      next = fitSegs(rates, b.income, b.gov, fresh);
      // จำอัตราใหม่ไว้เป็นฐาน — ยกเว้นช่องที่ลบจนเป็น 0 ระหว่างพิมพ์ (ส่วนต่างระหว่างกลุ่มจะหาย)
      mixShape.current = shape.map((x, i) => ({
        ...x,
        fee: b.income > 0 ? next[i]!.fee : x.fee,
        gov: b.gov > 0 ? next[i]!.gov : x.gov,
      }));
    }

    if (next !== segs) setSegs(next);

    const t = segTotals(next);
    const synced = { ...b, income: t.income, gov: t.gov };

    prevRate.current = rateOf(synced, semesters);
    if (Math.abs(t.income - b.income) > 0.01 || Math.abs(t.gov - b.gov) > 0.01) {
      setManual(bothModes(synced));
    }
  }, [draftReady, mixBase, segs, semesters]);

  /** แก้ตาราง ③ → จำนวนนิสิต/เงินรายได้/เงินแผ่นดินของการ์ด ② ตาม (ต้นทุนผันแปรต่อหัวคงเดิม) */
  const onMixChange = (next: Segment[]) => {
    setSegs(next);
    mixShape.current = next;
    const t = segTotals(next);

    if (t.q <= 0) return;
    const b = { ...scaleQ(mixBase, t.q), income: t.income, gov: t.gov };

    prevRate.current = rateOf(b, semesters);
    setManual(bothModes(b));
  };

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
  // ตารางแบบแท็บ 4 พร้อมแถวค่าธรรมเนียมต่อภาค/ปี/ตลอดหลักสูตร
  // ปรับปรุง: แก้ได้เฉพาะจำนวนนิสิต ค่าธรรมเนียม และต้นทุนผันแปร · เปิดใหม่: แก้ได้ทุกช่อง (Freestyle มติ 26 ต.ค.)
  const basicOnly = true;
  // มีหลักสูตรอ้างอิง → ค่าธรรมเนียมรายการหลัก/หักสมทบคิด "ต่อหัวตามจริงของหลักสูตร" × Q (ตัวเลขชีตคิดที่ 2 ภาค)
  // ต้นทุนต่อหัวจึงคงเดิมเมื่อแก้แค่จำนวนนิสิต — Q* เปลี่ยนเฉพาะเมื่อแก้ค่าธรรมเนียม (ผู้ใช้เลือก 2026-10-14)
  // ไม่มีหลักสูตรอ้างอิง (กรอกเองล้วน) → คิดตามอัตรา × Q × ภาค แบบ T38/T39
  const withCharges = (b: CostBlock) => {
    if (!refBlock || refBlock.q <= 0) return withPerHeadCharges(b, semesters);

    const k = (b.q / refBlock.q) * (semesters / 2);

    return { ...b, mainFee: refBlock.mainFee * k, uniShare: refBlock.uniShare * k };
  };
  const manualBlockOf = (m: RevenueMode) => withCharges(manual[m]);
  /** ต้นทุนคงที่รวมที่กรอก (ก่อนปรับส่วนแบ่งคณะ) — เปิดใหม่ลดจนต่ำกว่าส่วนแบ่งที่ต้องหักออก = TFC ติดลบ (D2) */
  const manualFixed =
    manual.with_government.fix.reduce((a, b) => a + b, 0) + manual.with_government.dep;
  const fixedBelowEmbedded =
    purpose === 'new' && manualEmbedded > 0 && manualFixed < manualEmbedded;
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
  const allocBucketList = activeScenario
    ? allocBuckets(activeScenario, lock?.choice.bucketLevel ?? DEFAULT_ALLOC_CHOICE.bucketLevel)
    : [];
  const { choice: alloc, note: allocNote } =
    isNew && lock
      ? newProgramChoice(lock.choice, allocBucketList, refId, level)
      : { choice: lock?.choice ?? DEFAULT_ALLOC_CHOICE, note: null };
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

  /** ข้อ 2.2: หลักสูตรนี้ถ้าใช้แต่ละวิธี — กำหนด % แสดงเฉพาะเมื่อคณะใช้วิธีนี้ (มีสัดส่วนที่กรอกไว้) */
  const methodCompare: MethodCompareRow[] | undefined =
    isNew || !lock || !activeScenario
      ? undefined
      : (['PER_HEAD_FTES', 'EQUAL_PROGRAM', 'CUSTOM_PCT'] as AllocMethod[])
          .filter((m) => m !== 'CUSTOM_PCT' || alloc.method === 'CUSTOM_PCT')
          .map((method) => {
            const pol =
              method === alloc.method
                ? allocPolicy
                : policyOf({ ...alloc, method }, allocBucketList);
            const res = MODES.map((m) => {
              const sc = scenarioOf('manual', m);
              const o = sc ? allocateFaculty(sc, pol) : null;
              const t = targetOf('manual');

              return blockResult(manualBlockOf(m), m, o && t ? (shareOf(o, t)?.adj ?? 0) : 0);
            });
            const [w, wo] = res as [ReturnType<typeof blockResult>, ReturnType<typeof blockResult>];

            return {
              method,
              current: method === alloc.method,
              tfc: w.tfc,
              qStarWith: w.qStar,
              qStarWithout: wo.qStar,
              profit: w.tr - w.tc,
              ok: w.qStar !== null && w.qStar >= 0 && (w.diff ?? -1) >= 0,
            };
          });

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
                      // ปรับปรุง: บอกวิธีปันส่วนที่ใช้ — "ปัจจุบัน" คิดวิธีเดียวกับ "หลังปรับปรุง" จึงอาจไม่ตรงกับตัวเลขตามชีต
                      title:
                        !isNew && lock
                          ? `${text.refCol} (${ALLOC_METHOD_SHORT[alloc.method]})`
                          : text.refCol,
                      block: refBlock,
                      result: blockResult(refBlock, m, adjOf('ref', m)),
                      ...(isNew && refProg
                        ? { subtitle: `อ้างอิงจาก: ${progOptionLabel(refProg)}` }
                        : {}),
                    },
                  ]
                : []),
              {
                key: 'manual',
                title: text.customCol,
                block: custom,
                result: blockResult(custom, m, adjOf('manual', m)),
                // เปิดใหม่: กรอกเฉพาะกรณีรวมเงินแผ่นดิน อีกกรณีระบบคิดให้ (มติ 26 ต.ค. ห้าม Double Data)
                editable: !isNew || m === 'with_government',
                ...(isNew && m === 'without_government'
                  ? { subtitle: 'คำนวณจากกรณีรวมเงินแผ่นดิน' }
                  : {}),
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
    // คณะยังไม่ตั้งวิธีปันส่วนก็คำนวณได้ — ใช้ค่าปีก่อน/ตาม Excel (มติ 25 ต.ค.) · รออ่านค่าให้เสร็จก่อนเท่านั้น
    fac && !lockReady
      ? 'กำลังอ่านวิธีปันส่วนของคณะ…'
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
   * ก้อนของการ์ด ② ที่จำนวนนิสิต q — แบ่งนิสิตลงตาราง ③ แบบเดียวกับตอนซิงก์ (สัดส่วนล่าสุด · อัตรารายกลุ่มคงเดิม)
   * รายได้จึงเท่ากับที่จะได้จริงหลังปัดจำนวนคนรายกลุ่ม ไม่ใช่ค่าเฉลี่ย × q
   */
  const blockAtQ = (q: number): CostBlock => {
    const base = manual.with_government;
    const counts = scaleSegs(mixShape.current ?? segs, q);
    const t = segTotals(segs.map((s, i) => ({ ...s, n: counts[i]!.n })));

    return t.q === q ? { ...scaleQ(base, q), income: t.income, gov: t.gov } : scaleQ(base, q);
  };

  /**
   * จำนวนนิสิตขั้นต่ำที่คุ้มทุนทั้งกรณีรวมและไม่รวมเงินแผ่นดิน ที่ค่าธรรมเนียม/ต้นทุนผันแปรต่อหัวของคอลัมน์หลังปรับปรุง
   * = q น้อยสุดที่ Q*(q) ≤ q — ปันส่วนตามรายหัวทำให้ TFC (จึง Q*) ขยับตาม q · null = หาไม่ได้ (R ≤ AVC)
   * modes = กรณีที่ต้องคุ้มทุน (ค่าเริ่มต้นทั้งสองกรณี)
   */
  const breakEvenQ = (modes: RevenueMode[] = MODES): number | null => {
    // ตั้งต้นจากตัวเลขที่ผู้ใช้แก้แล้ว (ค่าธรรมเนียม/ต้นทุนผันแปร) ไม่ใช่ตัวเลขปัจจุบันของหลักสูตร
    const base = manual.with_government;

    if (!refBlock || base.q <= 0) return null;

    const needAt = (q: number) => {
      const needs = modes.map(
        (m) => blockResult(withCharges(blockAtQ(q)), m, adjOf('manual', m, q)).qStar,
      );

      return needs.some((n) => n === null || n <= 0) ? null : Math.max(...(needs as number[]));
    };

    // ไล่จาก 1 คนขึ้นไปหาจำนวนแรกที่คุ้มทุนจริง — ปัดจำนวนคนรายกลุ่มทำให้ Q*(q) ไม่เรียบ วนหาจุดตรึงจึงเด้งไปมาได้
    for (let q = 1; q <= MAX_BREAKEVEN_Q; q++) {
      const need = needAt(q);

      if (need !== null && need <= q) return q;
    }

    return null;
  };

  /** เลือกหลักสูตร/รีเซ็ตแล้ว ตั้งคอลัมน์หลังปรับปรุงเป็นจำนวนนิสิตขั้นต่ำที่คุ้มทุน — รอรอบ render ที่มีหลักสูตรและวิธีปันส่วนแล้ว */
  // state ไม่ใช่ ref — กดรีเซ็ตซ้ำหลักสูตรเดิมต้องทำให้ effect รันอีกรอบ
  const [pendingDefault, setPendingDefault] = useState(0);

  useEffect(() => {
    if (!pendingDefault || !refBlock || !lockReady) return;
    setPendingDefault(0);
    // ปรับปรุงหลักสูตร: จำนวนนิสิตแผนเดียวใช้ทั้งสองกรณี (D1) — ตั้งเป็นขั้นต่ำที่คุ้มทุนกรณีรวมเงินแผ่นดิน
    const q = breakEvenQ(['with_government']);

    if (q === null) {
      setToast(
        'หาจำนวนนิสิตขั้นต่ำที่คุ้มทุนไม่ได้ — รายได้ต่อคนไม่พอครอบต้นทุนผันแปรต่อคน ลองปรับค่าธรรมเนียมก่อน',
      );

      return;
    }

    setManual(bothModes(blockAtQ(q)));
    setToast(`ตั้งจำนวนนิสิตเป็น ${fmtInt(q)} คน — ขั้นต่ำที่คุ้มทุนกรณีรวมเงินแผ่นดิน`);
  }, [pendingDefault, refBlock, lockReady, lock]);

  const pickRef = (p: ProgRow | null, lvl = level) => {
    setRefProg(p);
    // ปรับปรุงหลักสูตร: เลือกหลักสูตรแล้วไปต่อได้ทันที ไม่ต้องกดยืนยัน (มติ 25 ต.ค.) · ตั้งต้นที่ตัวเลขปัจจุบัน (D4)
    setConfirmed(purpose === 'improve' && !!p);
    if (p) copyManualFrom(p);

    setSegs(buildSegments(lvl, p, semesters));
    prevRate.current = null;
    mixShape.current = null;
  };

  // ปรับปรุงหลักสูตร: ระดับเฉพาะที่คณะมีหลักสูตรจริง · เปิดใหม่: ทุกระดับ (คณะอาจเปิดระดับใหม่)
  const levelOptions = purpose === 'improve' ? levelsOfFaculty(fac) : EDUCATION_LEVELS;

  const onFacChange = (v: string | null) => {
    setFac(v);
    const lvls = purpose === 'improve' ? levelsOfFaculty(v) : EDUCATION_LEVELS;
    // ระดับเดิมไม่มีในคณะนี้ → ปริญญาตรีถ้ามี ไม่งั้นระดับแรกของคณะ (คณะมีระดับเดียว = เลือกให้เลย)
    const lvl = lvls.includes(level)
      ? level
      : lvls.includes(DEFAULT_LEVEL)
        ? DEFAULT_LEVEL
        : (lvls[0] ?? DEFAULT_LEVEL);

    setLevel(lvl);
    pickRef(null, lvl);
  };

  // ผู้ดูแลคณะ/อาจารย์: คณะถูกกำหนดตามบัญชี — ตั้งให้เอง (รวมหลังล้างฟอร์ม) และไม่ค้างคณะอื่นจากร่างเดิม
  useEffect(() => {
    if (draftReady && scopedFac && fac !== scopedFac) onFacChange(scopedFac);
  }, [draftReady, scopedFac, fac]);

  // อาจารย์: ระบบเลือกหลักสูตรที่รับผิดชอบให้ทันที (Default view) — ไม่ทับร่างที่เป็นหลักสูตรเดียวกัน
  useEffect(() => {
    if (!draftReady || purpose !== 'improve' || !scopedProg) return;
    if (refProg && refKeyOf(refProg) === scopedProg) return;

    const p = RAW.PROGS.find((x) => refKeyOf(x) === scopedProg);

    if (!p) return;
    setFac(p.fac);
    setLevel(p.lvl);
    pickRef(p, p.lvl);
  }, [draftReady, purpose, scopedProg, refProg]);

  const onLevelChange = (v: string) => {
    setLevel(v);
    pickRef(null, v);
  };

  const onSemestersChange = (v: number) => {
    setSemesters(v);
    setSegs((xs) => xs.map((s) => ({ ...s, semesters: v })));
  };

  const clearForm = () => {
    setNewName('');
    setNameTouched(false);
    setFac(null);
    setLevel(DEFAULT_LEVEL);
    setSemesters(2);
    setRefProg(null);
    setManualOnly(false);
    setConfirmed(false);
    setManual(bothModes(emptyBlock()));
    setManualEmbedded(0);
    setSegs(buildSegments(DEFAULT_LEVEL, null, 2));
    mixShape.current = null;
    setEditingId(null);
    setLockedId(null);
    setOpenedMethod(null);
    saveDraft(purpose, null);
  };

  const allocTargetLabel = isNew ? 'หลักสูตรใหม่' : 'หลักสูตรนี้';

  /** ผลที่เพิ่งบันทึก — เปิดกล่องแจ้งสำเร็จ */
  const [savedEntry, setSavedEntry] = useState<ProgramHistoryEntry | null>(null);

  /** ผลคำนวณปัจจุบันในรูปรายการประวัติ — ใช้ทั้งบันทึก และพรีวิว/พิมพ์ร่างโดยยังไม่บันทึก */
  const buildEntry = (): ProgramHistoryEntry => {
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
        years: defaultYears(level),
        fees: refProg ? feesForProgram(refProg.fac, refProg.deg) : [],
        alloc: activeOutcome
          ? {
              method: ALLOC_METHOD_LABEL[alloc.method],
              hint: METHOD_HINT[alloc.method],
              source: lock ? policySourceLabel(lock) : null,
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
      status: 'DRAFT',
    };

    return entry;
  };

  const submittedBy = user?.STAFFNAME
    ? `${user.STAFFNAME} ${user.STAFFSURNAME ?? ''}`.trim()
    : `${roleDisplay[role].label}${fac ? ` ${fac}` : ''}`;

  /** บันทึก (ร่าง) หรือ ยืนยัน (SUBMITTED = ล็อก) */
  const handleSave = (submit = false) => {
    if (!canSave) return;

    const base = buildEntry();
    const entry: ProgramHistoryEntry = submit
      ? {
          ...base,
          status: 'SUBMITTED',
          submittedAt: new Date().toLocaleString('th-TH', {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
          submittedBy,
        }
      : base;

    // แก้ไขผลเดิม → ทับรายการเดิมและยกขึ้นบนสุด · ไม่ได้แก้ไข → เพิ่มรายการใหม่
    const next = [entry, ...history.filter((h) => h.id !== entry.id)];

    setHistory(next);
    saveHistory(next);

    if (submit) {
      // มติ 25 ต.ค. ข้อ 2.3: ยืนยันฉบับจริง → ล็อกการตั้งค่าวิธีปันส่วนของคณะปีนั้น (ค่าที่ใช้คำนวณเอกสารนี้)
      if (fac && lock) {
        lockFacultyBySubmit(year, fac, lock.choice, {
          at: new Date().toISOString(),
          by: submittedBy,
          program: entry.name,
        });
      }

      // ยืนยันแล้วล็อกฟอร์ม — แก้/ยืนยันซ้ำไม่ได้ จนกว่าจะเริ่มคำนวณใหม่ หรือกองแผนปลดล็อก
      setEditingId(null);
      setLockedId(entry.id);
      setToast(`ยืนยัน "${entry.name}" แล้ว — ข้อมูลถูกล็อก กำลังเปิดรายงานฉบับจริง`);
      printReport(entry.id);

      return;
    }

    setEditingId(entry.id);
    setSavedEntry(entry);
  };

  const router = useRouter();
  /** เปิดผลที่บันทึกไว้แล้วไปขั้นสรุป — รอให้ขั้นที่ 1 ผ่าน (วิธีปันส่วนของคณะโหลดเสร็จ) ก่อน */
  const [pendingStep, setPendingStep] = useState(false);

  const openEntry = (h: ProgramHistoryEntry) => {
    if (!h.input) return;

    if (isSubmitted(h)) {
      setToast(`"${h.name}" ยืนยันแล้ว — แก้ไขไม่ได้ ต้องทำบันทึกขออนุมัติถึงกองแผน`);

      return;
    }

    if (h.isNew !== isNew) {
      // คนละหน้ากัน (ปรับปรุง ↔ เปิดใหม่) — ไปหน้านั้นแล้วเปิดที่นั่น
      router.push(`/scenario/program/${h.isNew ? 'new' : 'improve'}?open=${h.id}`);

      return;
    }

    applyDraft(h.input as Draft);
    setEditingId(h.id);
    setOpenedMethod(h.allocMethod ?? null);
    setPendingStep(true);
    setToast(`เปิด "${h.name}" แล้ว — แก้ไขได้ กดบันทึกเพื่อทับผลเดิม`);
  };

  /** รายการที่รอยืนยันการลบ */
  const [deleteTarget, setDeleteTarget] = useState<ProgramHistoryEntry | null>(null);

  const deleteEntry = (h: ProgramHistoryEntry) => {
    if (isSubmitted(h)) return;

    const next = history.filter((x) => x.id !== h.id);

    setHistory(next);
    saveHistory(next);
    if (editingId === h.id) setEditingId(null);
    setToast(`ลบ "${h.name}" แล้ว`);
  };

  /** ผลที่ฟอร์มนี้ยืนยันไว้ — ยังเป็น SUBMITTED อยู่ = ล็อก (กองแผนปลดล็อกแล้วฟอร์มกลับมาแก้ได้) */
  const lockedEntry = history.find((h) => h.id === lockedId && isSubmitted(h)) ?? null;
  const formLocked = !!lockedEntry;

  const uni = computeBreakEven(RAW.UNI, mode);
  const latest = history[0];
  const [printId, setPrintId] = useState<number | null>(null);
  /** พิมพ์ฉบับร่างจากพรีวิวโดยยังไม่บันทึก */
  const [draftPrint, setDraftPrint] = useState<ProgramHistoryEntry | null>(null);
  const printEntry = draftPrint ?? history.find((h) => h.id === printId) ?? latest;
  /** เปิดดูตัวอย่างรายงานก่อน — ดาวน์โหลด/พิมพ์จากในกล่องตัวอย่าง */
  const [previewOpen, setPreviewOpen] = useState(false);
  const printReport = (id: number) => {
    setDraftPrint(null);
    setPrintId(id);
    setPreviewOpen(true);
  };
  /** ยืนยันและพิมพ์ฉบับจริง — รอกล่องยืนยันก่อน · ปลดล็อก (กองแผน) */
  const [submitAsk, setSubmitAsk] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<ProgramHistoryEntry | null>(null);
  const canUnlock = role === 'universityAdmin';
  const unlockEntry = (h: ProgramHistoryEntry) => {
    const next = history.map((x) =>
      x.id === h.id
        ? { ...x, status: 'DRAFT' as const, submittedAt: undefined, submittedBy: undefined }
        : x,
    );

    setHistory(next);
    saveHistory(next);
    setToast(`ปลดล็อก "${h.name}" แล้ว — กลับเป็นร่าง แก้ไขได้`);
  };
  /** ขั้นที่ 1 ต้องครบก่อน ครบแล้วไปขั้นไหนก็ได้ — กลับไปแก้จนไม่ครบ ขั้นหลังล็อกคืนเอง */
  const locked = groups.length === 0;
  const stepBlocker = programBlocker ?? allocBlocker;
  const stepKeys = STEP_KEYS[purpose];
  const stepLabels = stepKeys.map((k) => PURPOSE_STEP_LABEL[purpose][k]);
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
            {
              text: basicOnly
                ? 'กรอกตัวเลขในคอลัมน์ "หลักสูตรใหม่" (การ์ด ②) เฉพาะกรณีรวมเงินแผ่นดิน โดยระบบจะคำนวณผลลัพธ์กรณีไม่รวมเงินแผ่นดินให้โดยอัตโนมัติ'
                : 'กรอกตัวเลขในคอลัมน์ "หลักสูตรใหม่" (การ์ด ②) เฉพาะกรณีรวมเงินแผ่นดิน โดยระบบจะคำนวณผลลัพธ์กรณีไม่รวมเงินแผ่นดินให้โดยอัตโนมัติ',
              done: numbersOk,
            },
            { text: 'กด "ถัดไป" ที่แถบด้านล่าง' },
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
    mix: {
      title: 'แบ่งสัดส่วนนิสิตแต่ละกลุ่ม',
      items: [
        {
          text: `จำนวนนิสิตตั้งต้นจากขั้นที่ 1 (${REVENUE_MODE_LABEL.with_government} ${fmtInt(mixBase.q)} คน) แบ่งตามสัดส่วนเดิม — แก้รายกลุ่มได้ (ไทย/ต่างชาติ ในเวลา/นอกเวลา) ผลรวมกลับไปที่การ์ด ② อัตโนมัติ`,
        },
        { text: 'ดูแถว "กำไร (ขาดทุน)" ว่าแต่ละกลุ่มคุ้มทุนหรือไม่' },
        { text: 'กด "ถัดไป" เพื่อดูสรุปผล (ขั้นนี้ข้ามได้ถ้าไม่ต้องแยกกลุ่ม)' },
      ],
    },
    summary: {
      title: 'ตรวจผล บันทึก และออกรายงาน',
      items: [
        { text: `ตรวจผลเทียบ "${text.refCol}" กับ "${text.customCol}" และกราฟจุดคุ้มทุน` },
        { text: 'ตรวจพรีวิวรายงาน แล้วกด "บันทึกร่าง" เพื่อเก็บไว้แก้ต่อ หรือ "พิมพ์ฉบับร่าง" (มีลายน้ำ)' },
        { text: 'ข้อมูลถูกต้องแล้ว กด "ยืนยันและพิมพ์ฉบับจริง" — ยืนยันแล้วข้อมูลถูกล็อก' },
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
          below={
            isNew ? undefined : (
              <SlimStepper
                steps={stepLabels}
                active={activeStep}
                maxStep={maxStep}
                onGo={goTo}
                lockReason={stepBlocker}
                status={
                  (isNew ? newName.trim() : refProg) && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: { xs: 'none', md: 'block' }, whiteSpace: 'nowrap' }}
                    >
                      {isNew ? newName.trim() : refProg?.prog}
                      {editingId !== null ? ' · กำลังแก้ไขร่างที่บันทึกไว้' : ''}{' '}
                      <Chip
                        size="small"
                        variant="tonal"
                        color={formLocked ? 'success' : 'default'}
                        label={formLocked ? '🔒 ยืนยันแล้ว' : 'ร่าง'}
                        sx={{ height: 20, fontSize: 11, ml: 1 }}
                      />
                    </Typography>
                  )
                }
              />
            )
          }
        />

        {/* หน้านี้กรอกตัวเลขเอง ไม่ได้อ่านจากรอบคำนวณ จึงขึ้นเฉพาะแถบข้อมูลตัวอย่าง (ตาม mockup) */}
        <DataCaveatNotes profit={uni.profit} limitations={false} />

        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
          {text.heading}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {isNew && (
            <WizardStepper
              steps={stepLabels}
              hints={stepHints}
              active={activeStep}
              maxStep={maxStep}
              onGo={goTo}
            />
          )}

          {stepKey && (purpose !== 'improve' || SHOW_IMPROVE_STEP_GUIDE) && (
            <StepGuide
              active={activeStep}
              total={stepKeys.length}
              title={guide[stepKey].title}
              items={guide[stepKey].items}
            />
          )}

          {formLocked && lockedEntry && (
            <Alert
              severity="success"
              icon={<i className="ri-lock-line" />}
              action={
                <Button color="inherit" size="small" onClick={() => setConfirm('form')}>
                  เริ่มคำนวณใหม่
                </Button>
              }
            >
              ยืนยันแล้วเมื่อ {lockedEntry.submittedAt} โดย {lockedEntry.submittedBy} —
              ข้อมูลถูกล็อก แก้ไขไม่ได้ หากต้องการแก้ไขให้ทำบันทึกข้อความขออนุมัติถึงกองแผนงาน
            </Alert>
          )}

          {openedMethod && lock && openedMethod !== ALLOC_METHOD_LABEL[alloc.method] && (
            <Alert severity="warning" icon={<i className="ri-scales-3-line" />}>
              วิธีปันส่วนต้นทุนคงที่ของคณะเปลี่ยนจากตอนบันทึกร่างนี้ (เดิม: {openedMethod} · ตอนนี้:{' '}
              {ALLOC_METHOD_LABEL[alloc.method]}) — ตัวเลขด้านล่างคำนวณใหม่ตามวิธีปัจจุบันแล้ว
            </Alert>
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
              กำลังแก้ไขผลที่บันทึกไว้: {history.find((h) => h.id === editingId)?.name} —
              กดบันทึกจะทับผลเดิม
            </Alert>
          )}

          {/* ปันส่วนต้นทุนคงที่: คณะล็อกไว้แล้ว แก้ไม่ได้ — อยู่บนสุดของขั้นที่ 1 หุบไว้ บอกแค่วิธีที่คณะเลือก */}
          {stepKey === 'program' && fac && lock && (
            <FixedCostAllocationCard
              faculty={fac}
              isNew={isNew}
              hasRef={isNew ? manualEmbedded !== 0 : !!refProg}
              lock={lock}
              choice={alloc}
              newRule={allocNote}
              pool={facPool}
              rows={facRows}
              outcome={activeOutcome}
              targetId={targetOf('manual')}
              targetLabel={allocTargetLabel}
              targetQ={targetQ}
              mode={mode}
              collapsible
              compare={methodCompare}
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
              levelOptions={levelOptions}
              onLevelChange={onLevelChange}
              semesters={semesters}
              onSemestersChange={onSemestersChange}
              refOptions={refOptions}
              refProg={refProg}
              onRefChange={(p) => pickRef(p)}
              onManual={isNew && !refProg && !manualOnly ? () => setManualOnly(true) : undefined}
              onClear={formLocked ? undefined : () => setConfirm('form')}
              lockProgram={purpose === 'improve' && !!scopedProg}
              confirmed={formLocked}
            />
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
              onUnlock={canUnlock ? setUnlockTarget : undefined}
            />
          )}

          {/* ตารางอยู่ในขั้นที่ 1 — ปรับปรุง: หลังยืนยันหลักสูตร · เปิดใหม่: เมื่อเลือกหลักสูตรอ้างอิงหรือกดกรอกเอง */}
          {stepKey === 'program' && (isNew ? !locked : !programBlocker) && (
            <CostStep
              title={
                basicOnly
                  ? isNew
                    ? '② กรอกจำนวนนิสิต / ค่าธรรมเนียม'
                    : '② ทดลองปรับจำนวนนิสิต / ค่าธรรมเนียม'
                  : '② ตารางคำนวณจุดคุ้มทุน'
              }
              groups={groups}
              subheader={
                formLocked
                  ? '🔒 ยืนยันแล้ว — แสดงอย่างเดียว แก้ไขไม่ได้'
                  : refBlock
                    ? `${basicOnly ? `พิมพ์ตัวเลขใหม่ในช่องสีเหลือง (คอลัมน์ "✎ ${text.customCol}") — ผลจุดคุ้มทุนคำนวณให้ทันที` : text.tableHint} · ค่าธรรมเนียมรายการหลักและหักสมทบคิดต่อหัวตามจริงของหลักสูตร × จำนวนนิสิต`
                    : 'กรอกต้นทุนรายหมวดเองแยกกรณีรวม/ไม่รวมเงินแผ่นดิน'
              }
              showAllocAdj
              basicOnly={basicOnly}
              readOnly={formLocked}
              semesters={semesters}
              years={defaultYears(level)}
              {...(isNew
                ? {
                    editAll: true,
                    notice: (
                      <>
                        <Alert severity="info" variant="outlined" sx={{ mb: 2, py: 0 }}>
                          จำนวนนิสิต = เป้าหมายรวมทุกชั้นปีเมื่อเปิดครบหลักสูตร (
                          {defaultYears(level)} ปี) — ช่วงปีแรก ๆ
                          ที่ยังมีนิสิตไม่ครบทุกชั้นปีอาจขาดทุนได้
                          เพราะต้นทุนคงที่ยังกระจายไม่เต็มที่
                        </Alert>
                        {fixedBelowEmbedded && (
                          <Alert severity="warning" sx={{ mb: 2 }}>
                            ต้นทุนคงที่รวมของหลักสูตรใหม่ ({fmtInt(manualFixed)} บาท)
                            น้อยกว่าส่วนแบ่งส่วนกลางคณะที่ติดมากับหลักสูตรอ้างอิง (
                            {fmtInt(manualEmbedded)} บาท) ซึ่งระบบหักออกก่อนปันส่วนใหม่ —
                            ต้นทุนคงที่หลังหักจะติดลบ ตรวจตัวเลขต้นทุนคงที่อีกครั้ง
                          </Alert>
                        )}
                      </>
                    ),
                  }
                : {
                    editVariable: true,
                    extraAction: !formLocked && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setPendingDefault((n) => n + 1)}
                        startIcon={<i className="ri-focus-3-line" />}
                        title="ตั้งจำนวนนิสิตเป็นขั้นต่ำที่คุ้มทุน กรณีรวมเงินแผ่นดิน ที่ค่าธรรมเนียมปัจจุบัน"
                      >
                        ใช้จำนวนขั้นต่ำที่คุ้มทุน
                      </Button>
                    ),
                  })}
              // ตารางส่งก้อนที่แสดงอยู่กลับมา — ค่าธรรมเนียมรายการหลัก/หักสมทบในนั้นอาจเป็นค่าที่คิดจากอัตรา × Q
              // (แก้ไม่ได้ในตาราง) จึงคงค่าดิบของหลักสูตรไว้ ไม่งั้นแก้ Q กลับเท่าเดิมแล้ว TC/Q* ไม่กลับเป็นปัจจุบัน
              onChange={(m, b) =>
                setManual((x) => {
                  const next = { ...b, mainFee: x[m].mainFee, uniShare: x[m].uniShare };

                  // ก้อนเดียวใช้ทั้งสองกรณี — ปรับปรุงแก้กรณีไหนก็ได้ · เปิดใหม่แก้เฉพาะกรณีรวมเงินแผ่นดิน
                  return bothModes(next);
                })
              }
              onReset={
                refProg && !formLocked
                  ? () => {
                      copyManualFrom(refProg);
                      setToast(`รีเซ็ตคอลัมน์${text.customCol}กลับเป็นค่า${text.refCol}แล้ว`);
                    }
                  : undefined
              }
              resetLabel={`รีเซ็ต${text.customCol}`}
            />
          )}

          {stepKey === 'mix' && (
            <MixStep
              segs={segs}
              onSegsChange={onMixChange}
              costs={mixCosts}
              lockGov={!isNew}
              readOnly={formLocked}
              note={`เชื่อมกับการ์ด ② กรณี${REVENUE_MODE_LABEL.with_government} (นิสิต ${fmtInt(mixBase.q)} คน) — แก้ที่นี่แล้วการ์ด ② ขั้นที่ 3 และรายงานเปลี่ยนตาม · แก้ค่าธรรมเนียมในการ์ด ② ทุกกลุ่มปรับเป็นสัดส่วนเท่ากัน`}
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
              onSave={() => handleSave()}
              history={history}
              onPrint={canReport ? printReport : undefined}
              onClearHistory={() => setConfirm('history')}
              onOpenHistory={openEntry}
              onDeleteHistory={setDeleteTarget}
              editingId={editingId}
              onUnlock={canUnlock ? setUnlockTarget : undefined}
              preview={
                <Card>
                  <CardHeader
                    title={`พรีวิวรายงาน — ${isNew ? 'เอกสารจัดทำหลักสูตรใหม่' : 'เอกสารปรับปรุงหลักสูตรเดิม'}`}
                    subheader="ตรวจข้อมูลทั้งหมดก่อนสั่งพิมพ์ · ฉบับร่างมีลายน้ำ ยืนยันแล้วลายน้ำหายและข้อมูลถูกล็อก"
                  />
                  <CardContent>
                    {canSave || lockedEntry ? (
                      <Box
                        sx={{
                          position: 'relative',
                          overflow: 'auto',
                          maxHeight: '75vh',
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: 'common.white',
                          color: 'common.black',
                        }}
                      >
                        <ProgramReport entry={lockedEntry ?? buildEntry()} />
                      </Box>
                    ) : (
                      <Alert severity="warning" variant="outlined">
                        {saveBlocker}
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              }
              actions={
                lockedEntry ? (
                  <Card>
                    <CardContent
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 2,
                      }}
                    >
                      <Typography variant="body2" color="success.main" sx={{ mr: 'auto' }}>
                        🔒 ยืนยันแล้ว — พิมพ์ฉบับจริงซ้ำได้ แต่แก้ไขหรือยืนยันซ้ำไม่ได้
                      </Typography>
                      {canReport && (
                        <Button
                          variant="outlined"
                          onClick={() => printReport(lockedEntry.id)}
                          startIcon={<i className="ri-printer-line" />}
                        >
                          พิมพ์ฉบับจริง
                        </Button>
                      )}
                      <Button
                        variant="contained"
                        onClick={() => setConfirm('form')}
                        startIcon={<i className="ri-add-line" />}
                      >
                        เริ่มคำนวณใหม่
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 2,
                      }}
                    >
                      <Typography
                        variant="body2"
                        color={saveBlocker ? 'error.main' : 'text.secondary'}
                        sx={{ mr: 'auto' }}
                      >
                        {saveBlocker ??
                          (canReport
                            ? 'บันทึกร่างไว้แก้ต่อได้ · ยืนยันแล้วข้อมูลถูกล็อก แก้ไขต้องทำบันทึกขออนุมัติถึงกองแผน'
                            : 'บันทึกร่างและพิมพ์ฉบับร่างได้ · การยืนยันฉบับจริงทำได้เฉพาะกองแผนและอาจารย์ประจำหลักสูตร')}
                      </Typography>
                      <Button
                        variant="outlined"
                        disabled={!canSave}
                        onClick={() => handleSave()}
                        startIcon={<i className="ri-save-line" />}
                      >
                        {editingId ? 'บันทึกร่าง (ทับเดิม)' : 'บันทึกร่าง'}
                      </Button>
                      <Button
                        variant="outlined"
                        disabled={!canSave}
                        onClick={() => {
                          setDraftPrint(buildEntry());
                          setPreviewOpen(true);
                        }}
                        startIcon={<i className="ri-printer-line" />}
                      >
                        พิมพ์ฉบับร่าง
                      </Button>
                      {canReport && (
                        <Button
                          variant="contained"
                          color="success"
                          disabled={!canSave}
                          onClick={() => setSubmitAsk(true)}
                          startIcon={<i className="ri-lock-line" />}
                        >
                          ยืนยันและพิมพ์ฉบับจริง
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              }
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
                : `ร่างทั้งหมด (${history.filter((h) => !isSubmitted(h)).length} รายการ) จะถูกลบออกจากเครื่องนี้ถาวร และหน้า "แผนการรับนิสิต" จะเลือกผลคำนวณเหล่านี้ไม่ได้อีก · ผลที่ยืนยันแล้วไม่ถูกลบ`}
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
                // ผลที่ยืนยันแล้วล็อก — ไม่ถูกล้าง
                const kept = history.filter(isSubmitted);

                setHistory(kept);
                saveHistory(kept);
                setEditingId(null);
                setToast(
                  kept.length
                    ? `ล้างร่างแล้ว — ผลที่ยืนยันแล้ว ${kept.length} รายการยังอยู่`
                    : 'ล้างประวัติการคำนวณแล้ว',
                );
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
            &quot;{deleteTarget?.name}&quot; ({deleteTarget?.time}) จะถูกลบออกจากประวัติถาวร และหน้า
            &quot;แผนการรับนิสิต&quot; จะเลือกผลนี้ไม่ได้อีก
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

      <Dialog open={submitAsk} onClose={() => setSubmitAsk(false)}>
        <DialogTitle>ยืนยันและล็อกข้อมูล?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            เมื่อยืนยัน &quot;{isNew ? newName.trim() : refProg?.prog}&quot; แล้ว
            ลายน้ำฉบับร่างจะหายไป และข้อมูลจะถูกล็อก
            <b> ห้ามแก้ไขในระบบอีก</b> — หากต้องการแก้ไขภายหลัง
            ต้องทำบันทึกข้อความขออนุมัติถึงกองแผนงาน
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitAsk(false)}>ยกเลิก</Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              setSubmitAsk(false);
              handleSave(true);
            }}
          >
            ยืนยันและพิมพ์
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!unlockTarget} onClose={() => setUnlockTarget(null)}>
        <DialogTitle>ปลดล็อกผลที่ยืนยันแล้ว?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            &quot;{unlockTarget?.name}&quot; (ยืนยันเมื่อ {unlockTarget?.submittedAt} โดย{' '}
            {unlockTarget?.submittedBy}) จะกลับเป็นร่าง ผู้รับผิดชอบแก้ไขได้อีกครั้ง —
            ทำเมื่อได้รับบันทึกขออนุมัติแล้วเท่านั้น
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlockTarget(null)}>ยกเลิก</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              if (unlockTarget) unlockEntry(unlockTarget);
              setUnlockTarget(null);
            }}
          >
            ปลดล็อก
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
      {printEntry && (canReport || !isSubmitted(printEntry)) && (
        <Box sx={{ display: 'none', '@media print': { display: 'block' } }}>
          <ProgramReport entry={printEntry} />
        </Box>
      )}
    </Box>
  );
};

export default ScenarioProgramView;
