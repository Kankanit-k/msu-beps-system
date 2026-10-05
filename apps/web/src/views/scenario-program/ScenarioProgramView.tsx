'use client';

import { useEffect, useMemo, useState } from 'react';

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

import { calcBreakEvenBothModes, type RevenueMode } from '@beps/calc-engine';

// Component Imports
import DataCaveatNotes from '@components/DataCaveatNotes';
import PageHeaderBar, { MOCK_RUN } from '@components/PageHeaderBar';

// Data / calc Imports
import { RAW } from '@/data/mockup';
import { computeBreakEven, REVENUE_MODE_LABEL, sheetQStar } from '@views/breakeven/calc';
import { feesForProgram } from '@views/tuition/feeData';
import { facultyRows, poolAmountOf } from '@views/fixed-cost-policy/data';
import { loadDraft as loadPolicyDraft } from '@views/fixed-cost-policy/draft';

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
  type AllocChoice,
  type FacultyScenario,
} from './facultyAllocation';
import { type ModeCosts } from './StudentMixTable';
import CostStep from './steps/CostStep';
import HistoryTable from './steps/HistoryTable';
import SaveSuccessDialog from './steps/SaveSuccessDialog';
import MixStep, { type CostBasis } from './steps/MixStep';
import ProgramStep, { type Purpose } from './steps/ProgramStep';
import SummaryStep from './steps/SummaryStep';
import { STEPS, WizardNav, WizardStepper } from './steps/WizardStepper';
import {
  blockFromProgram,
  blockResult,
  defaultYears,
  embeddedShareOf,
  emptyBlock,
  segmentLabels,
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
/** ต้นทุนกำหนดเองแยกตามกรณี — รวม/ไม่รวมเงินแผ่นดินปรับได้อิสระจากกัน */
type ManualBlocks = Record<RevenueMode, CostBlock>;

const MODES: RevenueMode[] = ['with_government', 'without_government'];
const bothModes = (b: CostBlock): ManualBlocks => ({
  with_government: b,
  without_government: structuredClone(b),
});

/** เงินแผ่นดิน บาท/ภาค/คน ตั้งต้นตามแท็บ 4 (Y14) — ใส่ให้กลุ่มปกติไทย ปกติต่างชาติ และต่อเนื่อง */
const DEFAULT_GOV_PER_SEM = 3550;

/** ตั้งต้นตารางสัดส่วนนิสิต: จำนวนนิสิตไทย/ต่างชาติจากหลักสูตรอ้างอิง · ค่าธรรมเนียมจากแท็บค่าธรรมเนียม68 */
function buildSegments(level: string, ref: ProgRow | null, semesters: number): Segment[] {
  const fees = ref ? feesForProgram(ref.fac, ref.deg) : [];
  const inTime = fees.find((f) => f.mode === 'ในเวลา');
  const offTime = fees.find((f) => f.mode === 'นอกเวลา');
  const thaiReg = inTime?.rate ?? 18000;
  const fee = [
    thaiReg,
    offTime?.rate ?? 0,
    inTime?.rateIntl ?? 25000,
    offTime?.rateIntl ?? 0,
    thaiReg,
  ];
  const n = [ref?.qT ?? 0, 0, ref?.qF ?? 0, 0, 0];
  const years = defaultYears(level);

  return segmentLabels(level).map((label, i) => ({
    label,
    n: n[i]!,
    fee: fee[i]!,
    gov: i % 2 === 0 ? DEFAULT_GOV_PER_SEM : 0,
    semesters,
    years: i === 4 ? 2 : years,
  }));
}

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
  alloc?: AllocChoice;
  allocSource?: string | null;
  /** ส่วนแบ่งส่วนกลางที่ฝังในคอลัมน์กำหนดเอง (ติดมาจากหลักสูตรที่คัดลอกตัวเลข) */
  manualEmbedded?: number;
}

const refKeyOf = (p: ProgRow) => `${p.fac}|${p.lvl}|${p.prog}|${p.deg}`;

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
    // โหมดส่วนตัว/พื้นที่เต็ม — ฟอร์มยังใช้ได้ แค่ไม่จำร่าง
  }
};

/** ส่วนแบ่งส่วนกลางคณะ (งบสำนักงาน + ค่าเสื่อม) ที่ชีตแท็บ 3 ปันไว้ — ใช้กับหลักสูตรอื่นในคณะ */
const sheetShareOf = poolAmountOf('ALL');

const ScenarioProgramView = () => {
  const [purpose, setPurpose] = useState<Purpose>('improve');
  const [newName, setNewName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [fac, setFac] = useState<string | null>(null);
  const [level, setLevel] = useState<string>(EDUCATION_LEVELS[0] ?? 'ปริญญาตรี');
  const [semesters, setSemesters] = useState(2);
  const [refProg, setRefProg] = useState<ProgRow | null>(null);
  /** เปิดหลักสูตรใหม่โดยไม่มีหลักสูตรอ้างอิง — กดกรอกต้นทุนเองแล้ว */
  const [manualOnly, setManualOnly] = useState(false);
  const [manual, setManual] = useState<ManualBlocks>(() => bothModes(emptyBlock()));
  const [segs, setSegs] = useState<Segment[]>(() => buildSegments(level, null, 2));
  const [alloc, setAlloc] = useState<AllocChoice>(DEFAULT_ALLOC_CHOICE);
  const [allocSource, setAllocSource] = useState<string | null>(null);
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
  const [confirm, setConfirm] = useState<'history' | 'form' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  // อ่านหลัง mount เท่านั้น — อ่านตอน render แรกจะทำให้ SSR กับ client ไม่ตรงกัน
  useEffect(() => {
    setHistory(loadHistory());
    const d = loadDraft();

    if (d) {
      // ร่างรุ่นก่อนมีวัตถุประสงค์ — คิดต้นทุนเอง = เปิดหลักสูตรใหม่
      setPurpose(d.purpose ?? (d.basis === 'manual' ? 'new' : 'improve'));
      setNewName(d.newName ?? '');
      setFac(d.fac);
      setLevel(d.level);
      setSemesters(d.semesters);
      setRefProg(RAW.PROGS.find((p) => refKeyOf(p) === d.refKey) ?? null);
      // ร่างรุ่นก่อน: basis 'manual' แปลว่ากรอกเองล้วนก็ต่อเมื่อเปิดใหม่และไม่มีหลักสูตรอ้างอิง
      setManualOnly(d.manualOnly ?? (d.basis === 'manual' && !d.refKey && d.purpose !== 'improve'));
      // ร่างรุ่นก่อนมีก้อนเดียว — ใช้ตั้งต้นทั้งสองกรณี
      setManual('q' in d.manual ? bothModes(d.manual) : d.manual);
      // ร่างเก่าเก็บชื่อหัวคอลัมน์แบบเดิม/ป.โท-เอกมี 4 คอลัมน์ — ใช้ชื่อปัจจุบันและเติมคอลัมน์ที่ขาด
      const blank = buildSegments(d.level, null, d.semesters);

      setSegs(blank.map((b, i) => ({ ...(d.segs[i] ?? b), label: b.label })));
      setAlloc(d.alloc ?? DEFAULT_ALLOC_CHOICE);
      setAllocSource(d.allocSource ?? null);
      // ร่างรุ่นก่อนไม่ได้จำ — ตัวเลขกำหนดเองตั้งต้นจากหลักสูตรอ้างอิงเสมอ
      const ref = RAW.PROGS.find((p) => refKeyOf(p) === d.refKey);

      setManualEmbedded(d.manualEmbedded ?? (ref ? embeddedShareOf(ref) : 0));
    }

    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    saveDraft({
      purpose,
      newName,
      fac,
      level,
      semesters,
      refKey: refProg ? refKeyOf(refProg) : null,
      manualOnly,
      manual,
      segs,
      alloc,
      allocSource,
      manualEmbedded,
    });
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
    alloc,
    allocSource,
    manualEmbedded,
  ]);

  const facultyOptions = useMemo(() => PG_DATA.map((g) => g.faculty), []);
  const refOptions = useMemo(
    () => (PG_DATA.find((g) => g.faculty === fac)?.programs ?? []).filter((p) => p.lvl === level),
    [fac, level],
  );

  const text = PURPOSE_TEXT[purpose];
  const refBlock = useMemo(() => (refProg ? blockFromProgram(refProg) : null), [refProg]);
  // ตั้งต้นจากหลักสูตรอ้างอิง → ใช้ค่าธรรมเนียมรายการหลัก/หักสมทบจริงของหลักสูตร (ผลต่างเริ่มที่ 0)
  // จนกว่าจะแก้จำนวนนิสิตหรือจำนวนเทอม จึงคิดตามอัตรา × Q × ภาค แบบ T38/T39
  const manualBlockOf = (m: RevenueMode) => {
    const b = manual[m];
    const keepRefCharges = !!refBlock && b.q === refBlock.q && semesters === 2;

    return keepRefCharges ? b : withPerHeadCharges(b, semesters);
  };
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
  const scenarioOf = (b: CostBasis, m: RevenueMode): FacultyScenario | null => {
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
        ...(b === 'manual' ? { qOverride: { id: refId, q: manual[m].q } } : {}),
      };
    }

    return {
      pool: facPool,
      programs: facPrograms,
      ...(refId ? { embedded: { id: refId, amount: embeddedShareOf(refProg!) } } : {}),
      newProgram: {
        label: newName.trim() || 'หลักสูตรใหม่',
        educationLevel: level,
        q: manual[m].q,
        sheetShare: manualEmbedded,
      },
    };
  };
  const targetOf = (b: CostBasis) => (isNew && b === 'manual' ? NEW_PROGRAM_ID : refId);

  const activeScenario = scenarioOf('manual', mode);
  const allocBucketList = activeScenario ? allocBuckets(activeScenario, alloc.bucketLevel) : [];
  const allocPolicy = policyOf(alloc, allocBucketList);
  const outcomeOf = (b: CostBasis, m: RevenueMode) => {
    const sc = scenarioOf(b, m);

    return sc ? allocateFaculty(sc, allocPolicy) : null;
  };
  const activeOutcome = outcomeOf('manual', mode);
  /** ส่วนที่ต้องบวกเข้า TFC ของคอลัมน์ — 0 เมื่อตามชีต หรือนโยบายยังไม่ผ่านการตรวจ */
  const adjOf = (b: CostBasis, m: RevenueMode) => {
    const o = outcomeOf(b, m);
    const t = targetOf(b);

    return o && t ? (shareOf(o, t)?.adj ?? 0) : 0;
  };
  const allocBlocker =
    alloc.method === 'SHEET'
      ? null
      : !activeOutcome
        ? fac
          ? 'เลือกหลักสูตรก่อน เพื่อปันส่วนต้นทุนคงที่ส่วนกลางคณะ'
          : 'เลือกคณะก่อน เพื่อปันส่วนต้นทุนคงที่ส่วนกลางคณะ'
        : !activeOutcome.applied
          ? 'แก้ข้อทักท้วงของการปันส่วนต้นทุนคงที่ก่อน'
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
  /** ขั้นที่ 1 ต้องครบก่อนไปขั้นที่ 2 */
  const programBlocker =
    purpose === 'improve' && !refProg
      ? 'เลือกคณะและหลักสูตรที่จะปรับปรุงก่อน'
      : nameError
        ? 'กรอกชื่อหลักสูตรที่จะเปิดก่อน'
        : semesters < 1
          ? 'จำนวนเทอมต้องอย่างน้อย 1 เทอม'
          : groups.length === 0
            ? 'เลือกหลักสูตรอ้างอิง หรือถ้าไม่มี ให้กดปุ่ม "กรอกต้นทุนเอง" ในกล่องสีฟ้าด้านบนก่อน'
            : null;
  const saveBlocker =
    programBlocker ??
    (!numbersOk
      ? 'ต้องมีจำนวนนิสิต งบประมาณ และต้นทุนก่อน ทั้งกรณีรวมและไม่รวมเงินแผ่นดิน'
      : allocBlocker);
  const canSave = !saveBlocker;

  const onPurposeChange = (p: Purpose) => {
    setPurpose(p);
    // ปรับปรุงต้องมีหลักสูตรเดิมเป็นฐานเสมอ — ไม่มีโหมดกรอกเองล้วน
    if (p === 'improve') setManualOnly(false);
  };

  const pickRef = (p: ProgRow | null, lvl = level) => {
    setRefProg(p);
    if (p) copyManualFrom(p);
    setSegs(buildSegments(lvl, p, semesters));
  };

  const onFacChange = (v: string | null) => {
    setFac(v);
    pickRef(null);

    // สัดส่วน % ผูกกับหลักสูตรของคณะ ใช้ข้ามคณะไม่ได้ — ตั้งต้นจากร่างนโยบาย W20 ของคณะใหม่ถ้ามี
    const year = MOCK_RUN.budgetYear;
    const d = v ? loadPolicyDraft({ year, faculty: v, pool: 'ALL' }) : null;

    if (d) {
      setAlloc({
        method: d.method,
        bucketLevel: d.bucketLevel,
        subMethod: d.subMethod,
        pct: d.pct,
      });
      setAllocSource(
        `ตั้งต้นจากร่างนโยบายต้นทุนคงที่ของคณะ (W20 · ปีงบ ${year} · ยังไม่ผ่านการอนุมัติ)`,
      );
    } else {
      setAlloc((a) => ({ ...a, pct: {} }));
      setAllocSource(null);
    }
  };

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
    setLevel(EDUCATION_LEVELS[0] ?? 'ปริญญาตรี');
    setSemesters(2);
    setRefProg(null);
    setManualOnly(false);
    setManual(bothModes(emptyBlock()));
    setManualEmbedded(0);
    setSegs(buildSegments(EDUCATION_LEVELS[0] ?? 'ปริญญาตรี', null, 2));
    setAlloc(DEFAULT_ALLOC_CHOICE);
    setAllocSource(null);
    saveDraft(null);
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

    const entry: ProgramHistoryEntry = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('th-TH'),
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
              source: allocSource,
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
        showAllocAdj: alloc.method !== 'SHEET',
        segs,
        mixCosts,
      },
    };

    const next = [entry, ...history];

    setHistory(next);
    saveHistory(next);
    setSavedEntry(entry);
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
  /** ขั้นที่ 1–2 ต้องครบตามลำดับ ครบแล้วไปขั้นไหนก็ได้ — กลับไปแก้จนไม่ครบ ขั้นหลังล็อกคืนเอง */
  const locked = groups.length === 0;
  const maxStep = programBlocker ? 0 : allocBlocker ? 1 : STEPS.length - 1;
  const stepBlocker = programBlocker ?? allocBlocker;
  const [step, setStep] = useState(0);
  const activeStep = Math.min(step, maxStep);

  // ลดขั้นที่จำไว้ตาม — ไม่ให้เด้งข้ามไปขั้นหลังเองเมื่อกรอกครบ
  useEffect(() => {
    if (step > maxStep) setStep(maxStep);
  }, [step, maxStep]);
  const goTo = (i: number) => {
    setStep(Math.min(i, maxStep));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
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
          code="W7"
          mode={mode}
          onModeChange={setMode}
          q={uni.q}
          profit={uni.profit}
        />

        {/* หน้านี้กรอกตัวเลขเอง ไม่ได้อ่านจากรอบคำนวณ จึงขึ้นเฉพาะแถบข้อมูลตัวอย่าง (ตาม mockup) */}
        <DataCaveatNotes profit={uni.profit} limitations={false} />

        <Typography variant="h5" fontWeight={700} sx={{ mb: 4 }}>
          {text.heading}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <WizardStepper active={activeStep} maxStep={maxStep} onGo={goTo} />

          {activeStep === 0 && (
            <ProgramStep
              purpose={purpose}
              onPurposeChange={onPurposeChange}
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
            />
          )}

          {/* ยังไม่เลือกหลักสูตร (เข้าหน้าครั้งแรก/ล้างฟอร์ม) — ยังดู/ออก PDF ผลที่บันทึกไว้ได้ */}
          {locked && history.length > 0 && (
            <HistoryTable
              history={history}
              onPrint={printReport}
              onClear={() => setConfirm('history')}
            />
          )}

          {activeStep === 1 && (
            <FixedCostAllocationCard
              faculty={fac}
              isNew={isNew}
              hasRef={isNew ? manualEmbedded !== 0 : !!refProg}
              choice={alloc}
              onChoice={setAlloc}
              choiceSource={allocSource}
              buckets={allocBucketList}
              pool={facPool}
              rows={facRows}
              outcome={activeOutcome}
              targetId={targetOf('manual')}
              targetLabel={allocTargetLabel}
              mode={mode}
              onToast={setToast}
            />
          )}

          {activeStep === 2 && (
            <CostStep
              groups={groups}
              subheader={
                refBlock
                  ? `${text.tableHint} · ค่าธรรมเนียมรายการหลักและหักสมทบคิดจากอัตรา × นิสิต × เทอม เมื่อแก้จำนวนนิสิต`
                  : 'กรอกต้นทุนรายหมวดเองแยกกรณีรวม/ไม่รวมเงินแผ่นดิน'
              }
              showAllocAdj={alloc.method !== 'SHEET'}
              onChange={(m, b) => setManual((x) => ({ ...x, [m]: b }))}
              onReset={
                refProg
                  ? () => {
                      copyManualFrom(refProg);
                      setToast(`รีเซ็ตคอลัมน์${text.customCol}กลับเป็นค่า${text.refCol}แล้ว`);
                    }
                  : undefined
              }
              resetLabel={`รีเซ็ต${text.customCol}`}
            />
          )}

          {activeStep === 3 && <MixStep segs={segs} onSegsChange={setSegs} costs={mixCosts} />}

          {activeStep === 4 && (
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
              onPrint={printReport}
              onClearHistory={() => setConfirm('history')}
            />
          )}

          <WizardNav
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
          {confirm === 'form' ? 'ล้างฟอร์มและเริ่มที่ขั้นตอนที่ 1?' : 'ล้างประวัติการคำนวณ?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirm === 'form'
              ? 'ชื่อหลักสูตร ข้อมูลหลักสูตร หลักสูตรอ้างอิง ต้นทุนที่กรอกเอง และตารางสัดส่วนนิสิตจะถูกล้างกลับเป็นค่าตั้งต้น (ประวัติที่บันทึกไว้ไม่หาย)'
              : `ประวัติทั้งหมด (${history.length} รายการ) จะถูกลบออกจากเครื่องนี้ถาวร และหน้า "แผนการรับนิสิต" จะเลือกผลคำนวณเหล่านี้ไม่ได้อีก`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>ยกเลิก</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (confirm === 'form') {
                startNew();
                setToast('ล้างฟอร์มแล้ว — เริ่มที่ขั้นตอนที่ 1');
              } else {
                setHistory([]);
                saveHistory([]);
                setToast('ล้างประวัติการคำนวณแล้ว');
              }

              setConfirm(null);
            }}
          >
            {confirm === 'form' ? 'ล้างฟอร์ม' : 'ล้างประวัติ'}
          </Button>
        </DialogActions>
      </Dialog>

      <SaveSuccessDialog
        entry={savedEntry}
        onClose={() => setSavedEntry(null)}
        onReport={(id) => {
          setSavedEntry(null);
          printReport(id);
        }}
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
      {printEntry && (
        <Box sx={{ display: 'none', '@media print': { display: 'block' } }}>
          <ProgramReport entry={printEntry} />
        </Box>
      )}
    </Box>
  );
};

export default ScenarioProgramView;
