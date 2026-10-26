'use client';

/**
 * ตั้งค่าวิธีปันส่วนต้นทุนคงที่ของคณะ (ปีงบ × คณะ) — มติ 25 ต.ค. 2569 (PLAN-2026-10-25-fixed-cost-default)
 *
 * - ไม่บังคับ: ยังไม่ตั้งค่าปีนี้ หน้าคำนวณใช้ค่าปีก่อนหน้า → ไม่เคยตั้งใช้ค่าตามแบบจำลอง Excel (หารรายหัว)
 * - ผู้ดูแลคณะเลือก 1 ใน 3 วิธี (หารรายหัว · หารเท่ากันทุกหลักสูตร · กำหนด %) แล้ว "บันทึกการตั้งค่า" → มีผลทันที
 *   แก้ได้อิสระจนกว่าจะมีหลักสูตรในคณะยืนยันเอกสารฉบับจริง → 🔒 ล็อก · แก้ต้องทำบันทึกขออนุมัติ แล้วกองแผนปลดล็อก
 * - สถานะ 3 แบบ: ยังไม่ตั้ง / ตั้งค่าแล้ว / ล็อกแล้ว · ผู้บริหารคณะเปิดดูคณะตนได้อย่างเดียว (D5)
 */
import { useEffect, useMemo, useState } from 'react';

// MUI Imports
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Autocomplete from '@mui/material/Autocomplete';
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
import Snackbar from '@mui/material/Snackbar';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import type { StepIconProps } from '@mui/material/StepIcon';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { MOCK_RUN } from '@components/PageHeaderBar';
import { useAuthUser } from '@/hooks/AuthHooks';
import { useRole } from '@/hooks/useRole';
import { roleDisplay } from '@/configs/accessControl';
import type { ProgRow } from '@/data/mockup';
import { fmtMillion } from '@views/breakeven/calc';
import { FACULTIES, facultyRows, poolAmountOf } from '@views/fixed-cost-policy/data';
import MethodCards from '@views/fixed-cost-policy/MethodCards';
import PercentTable, {
  BucketLevelToggle,
  fillRemainderPct,
} from '@views/fixed-cost-policy/PercentTable';
import {
  ALLOC_METHOD_LABEL,
  type AllocMethod,
  allocateFaculty,
  allocBuckets,
  DEFAULT_ALLOC_CHOICE,
  levelCapIssue,
  levelCapsOf,
  splitLevelPctByFtes,
  policyOf,
  type AllocChoice,
  type FacultyScenario,
} from '@views/scenario-program/facultyAllocation';
import { gridTableSx } from '@views/scenario-program/CostBlockTable';
import { progDegreeLabel } from '@views/scenario-program/programData';

import {
  fmtLockedAt,
  lockFaculty,
  unlockFaculty,
  unlockSubmit,
  useFacultyConfig,
  useFacultyLock,
} from './lockStore';

/** ขั้นตอนบนหน้านี้ — hint บอกว่าขั้นนั้นต้องทำอะไร ผู้ใช้อ่านแถบขั้นตอนอย่างเดียวก็รู้ลำดับงาน */
const STEPS = [
  { id: 'step-faculty', label: 'เลือกคณะ', hint: 'เลือกคณะที่จะตั้งค่า' },
  { id: 'step-method', label: 'เลือกวิธีแบ่งต้นทุน', hint: 'เลือก 1 ใน 3 วิธีตามมติคณะ' },
  { id: 'step-compare', label: 'เทียบผล 3 วิธี', hint: 'ดูภาระของแต่ละหลักสูตร (ไม่บังคับ)' },
  { id: 'step-save', label: 'บันทึกการตั้งค่า', hint: 'กดบันทึก — หน้าคำนวณใช้ค่านี้ทันที' },
];

type StepStatus = 'done' | 'current' | 'optional' | 'todo';

const STATUS_CHIP: Record<
  StepStatus,
  { label: string; color: 'success' | 'primary' | 'info' | 'default'; icon: string }
> = {
  done: { label: 'เสร็จแล้ว', color: 'success', icon: 'ri-check-line' },
  current: { label: 'ทำขั้นนี้', color: 'primary', icon: 'ri-arrow-right-line' },
  optional: { label: 'ดูก่อนตัดสินใจ', color: 'info', icon: 'ri-eye-line' },
  todo: { label: 'รอขั้นก่อนหน้า', color: 'default', icon: 'ri-time-line' },
};

/** วงกลมเลขขั้น — เขียว ✓ = เสร็จ · น้ำเงิน = กำลังทำ · เทา = ยังไม่ถึง */
const StepNo = ({ no, status }: { no: number; status: StepStatus }) => (
  <Box
    sx={{
      width: 32,
      height: 32,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      flexShrink: 0,
      color:
        status === 'todo' ? 'text.disabled' : status === 'optional' ? 'info.main' : 'common.white',
      bgcolor:
        status === 'done'
          ? 'success.main'
          : status === 'current'
            ? 'primary.main'
            : status === 'optional'
              ? 'background.paper'
              : 'action.disabledBackground',
      // ขั้นไม่บังคับ = วงกลมเส้นขอบ ไม่ให้ดูเหมือนขั้นที่ต้องทำ
      border: status === 'optional' ? 2 : 0,
      borderStyle: 'dashed',
      borderColor: 'info.main',
    }}
  >
    {status === 'done' ? <i className="ri-check-line" /> : no}
  </Box>
);

/** หัวการ์ดของแต่ละขั้น: เลขขั้น + ชื่อ + ต้องทำอะไร + สถานะ */
const StepHeader = ({
  no,
  status,
  title,
  hint,
}: {
  no: number;
  status: StepStatus;
  title: string;
  hint: string;
}) => {
  const chip = STATUS_CHIP[status];

  return (
    <CardHeader
      avatar={<StepNo no={no} status={status} />}
      title={`ขั้นที่ ${no} · ${title}`}
      subheader={hint}
      titleTypographyProps={{ variant: 'h5', fontWeight: 700, color: 'primary.main' }}
      action={
        <Chip
          size="small"
          variant="tonal"
          color={chip.color}
          icon={<i className={chip.icon} />}
          label={chip.label}
        />
      }
      sx={{ '& .MuiCardHeader-action': { alignSelf: 'center', m: 0 } }}
    />
  );
};
const ROWS_PER_PAGE = 10;
const METHODS: AllocMethod[] = ['PER_HEAD_FTES', 'EQUAL_PROGRAM', 'CUSTOM_PCT'];
const fmtB = (v: number) => Math.round(v).toLocaleString('th-TH');
/** ผลต่างจากชีตเป็นคำ — เลขบวก/ลบในวงเล็บสีสวนกับความรู้สึก (ลบ = ดี) ผู้ใช้อ่านสะดุด */
const fmtDiff = (v: number) => `${v > 0 ? '▲ ภาระเพิ่ม' : '▼ ภาระลด'} ${fmtB(Math.abs(v))}`;
/** ลำดับระดับทั้งหน้า (ขั้นที่ 2 + ตารางเทียบ) — ระดับที่ไม่รู้จักไปท้ายสุด */
const LVL_ORDER = ['ประกาศนียบัตร', 'ปริญญาตรี', 'ป.บัณฑิต', 'ปริญญาโท', 'ปริญญาเอก'];
const lvlRank = (lvl: string) => {
  const i = LVL_ORDER.indexOf(lvl);

  return i < 0 ? LVL_ORDER.length : i;
};

/* ---------- ร่างที่ยังไม่บันทึก (ต่อคณะ) — กันกรอก % หายเมื่อปิด/รีโหลด ---------- */
const DRAFT_KEY = 'beps:fixed-cost-lock:draft:v1';
type Drafts = Record<string, AllocChoice & { savedAt: string }>;

const readDrafts = (): Drafts => {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);

    return raw ? (JSON.parse(raw) as Drafts) : {};
  } catch {
    return {};
  }
};

const writeDrafts = (d: Drafts) => {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // โหมดส่วนตัว/พื้นที่เต็ม — ยังตั้งค่าได้ แค่ไม่จำร่าง
  }
};

/** ส่วนแบ่งส่วนกลางคณะ (งบสำนักงาน + ค่าเสื่อม) ที่ชีตแท็บ 3 ปันไว้ */
const sheetShareOf = poolAmountOf('ALL');

const FixedCostLockView = () => {
  const year = MOCK_RUN.budgetYear;
  const { role, scope, ready: roleReady } = useRole();
  const { user } = useAuthUser();
  // ผู้บริหารคณะ (D5) ดูได้อย่างเดียว — เจ้าหน้าที่คณะเป็นคนกดบันทึก ("ร่วมกัน" = ตกลงในที่ประชุมคณะ)
  const readOnly = role === 'facultyExec';
  // ระดับคณะเห็น/ตั้งได้เฉพาะคณะของตน · ผู้ดูแลมหาวิทยาลัยเลือกได้ทุกคณะ
  const scopedFac = role === 'deptAdmin' || role === 'facultyExec' ? scope.faculty : null;
  const denied =
    role === 'universityAdmin'
      ? null
      : role === 'deptAdmin' || role === 'facultyExec'
        ? scopedFac
          ? null
          : `ยังไม่ได้ระบุคณะของ${roleDisplay[role].label} — เลือกคณะจากเมนูโปรไฟล์ (มุมมองสิทธิ์) ก่อน`
        : role === 'lecturer'
          ? 'หน้านี้สำหรับเจ้าหน้าที่/ผู้บริหารคณะ — อาจารย์ประจำหลักสูตรคำนวณได้เลยด้วยวิธีที่คณะตั้งไว้ (ถ้าคณะยังไม่ตั้ง ใช้ค่าปีก่อนหรือค่าเริ่มต้นตามแบบจำลอง Excel)'
          : 'หน้านี้สำหรับเจ้าหน้าที่ระดับคณะ/มหาวิทยาลัย และผู้บริหารคณะเท่านั้น';
  const facultyOptions = scopedFac ? [scopedFac] : FACULTIES;

  const [fac, setFac] = useState<string | null>(null);
  const [choice, setChoice] = useState<AllocChoice>(DEFAULT_ALLOC_CHOICE);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  /** กำลังแก้การตั้งค่าที่บันทึกไว้ — ค่าเดิมยังใช้คำนวณอยู่จนกว่าจะกดบันทึกอีกครั้ง */
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<
    'save' | 'clearConfig' | 'unlockSubmit' | 'clear' | 'clearSplit' | null
  >(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [page, setPage] = useState(0);
  /** การตั้งค่าที่คณะบันทึกไว้ปีนี้ (null = ยังไม่ตั้ง) */
  const { config, ready } = useFacultyConfig(year, fac);
  /** ค่าที่หน้าคำนวณใช้จริงตอนนี้ (ปีนี้ → ปีก่อน → ตาม Excel) */
  const { lock: effective } = useFacultyLock(year, fac);
  const submitLock = config?.submitLock;
  /** ตั้งค่าแล้วและไม่ได้อยู่ระหว่างแก้ */
  const saved = !!config && !editing;
  /** ฟอร์มแก้ไม่ได้: ดูอย่างเดียว · ล็อกจากการยืนยันเอกสาร · ตั้งค่าแล้ว (ยังไม่กดแก้ไข) */
  const locked = readOnly || !!submitLock || saved;

  useEffect(() => {
    if (scopedFac) setFac(scopedFac);
  }, [scopedFac]);

  // เปลี่ยนคณะ/ที่เก็บเปลี่ยน → ตั้งค่าแล้วแสดงค่าที่บันทึก · ยังไม่ตั้งแสดงร่าง หรือค่าที่หน้าคำนวณใช้อยู่
  useEffect(() => {
    if (!fac || !ready) return;
    const d = config || readOnly ? undefined : readDrafts()[fac];

    setEditing(false);
    if (config) setChoice(config.choice);
    else if (d)
      setChoice({
        method: d.method,
        bucketLevel: d.bucketLevel,
        subMethod: d.subMethod,
        pct: d.pct,
        levelPct: d.levelPct,
      });
    else setChoice(effective?.choice ?? DEFAULT_ALLOC_CHOICE);
    setSavedAt(d?.savedAt ?? null);
    setPage(0);
  }, [fac, ready, config, effective, readOnly]);

  const update = (patch: Partial<AllocChoice>) => {
    if (!fac || locked) return;
    const next = { ...choice, ...patch };

    setChoice(next);
    // ร่างเก็บเฉพาะตอนยังไม่ตั้งค่า — แก้ค่าที่บันทึกแล้ว กด "ยกเลิกแก้ไข" ก็กลับค่าเดิม
    if (config) return;
    const at = new Date().toISOString();

    writeDrafts({ ...readDrafts(), [fac]: { ...next, savedAt: at } });
    setSavedAt(at);
  };

  const dropDraft = (f: string) => {
    const d = readDrafts();

    delete d[f];
    writeDrafts(d);
    setSavedAt(null);
  };

  /* ---------- ผลปันส่วนของทั้งคณะตามวิธีที่เลือก (ชุดคำนวณเดียวกับหน้าคำนวณรายหลักสูตร) ---------- */
  const rows = useMemo(() => (fac ? facultyRows(fac) : []), [fac]);
  /** แสดงแค่ชื่อปริญญา — ชื่อซ้ำในระดับเดียวกัน (6 คู่ในชีต) ต่อชื่อหลักสูตรในวงเล็บให้แยกได้ */
  const progName = useMemo(() => {
    const n = new Map<string, number>();
    const key = (p: ProgRow) => `${p.lvl}|${progDegreeLabel(p)}`;

    rows.forEach(({ p }) => n.set(key(p), (n.get(key(p)) ?? 0) + 1));

    return (p: ProgRow) =>
      n.get(key(p))! > 1 ? `${progDegreeLabel(p)} (${p.prog})` : progDegreeLabel(p);
  }, [rows]);
  /** ตารางขั้นที่ 3 จัดกลุ่มตามระดับ — sort คงลำดับเดิมภายในระดับเดียวกัน */
  const byLevel = useMemo(
    () => [...rows].sort((a, b) => lvlRank(a.p.lvl) - lvlRank(b.p.lvl)),
    [rows],
  );
  const levelCount = useMemo(() => {
    const m = new Map<string, number>();

    rows.forEach(({ p }) => m.set(p.lvl, (m.get(p.lvl) ?? 0) + 1));

    return m;
  }, [rows]);
  const scenario: FacultyScenario | null = useMemo(() => {
    if (!fac) return null;
    const programs = rows.map(({ p, id }) => ({
      id,
      label: progName(p),
      educationLevel: p.lvl,
      q: p.Q,
      sheetShare: sheetShareOf(p),
    }));

    return { pool: programs.reduce((a, p) => a + p.sheetShare, 0), programs };
  }, [fac, rows, progName]);
  const byLvl = (bs: ReturnType<typeof allocBuckets>) =>
    [...bs].sort((a, b) => lvlRank(a.group ?? a.key) - lvlRank(b.group ?? b.key));
  const buckets = scenario ? byLvl(allocBuckets(scenario, choice.bucketLevel)) : [];
  const outcome = scenario ? allocateFaculty(scenario, policyOf(choice, buckets)) : null;
  const errors = outcome?.issues.filter((i) => i.severity === 'error') ?? [];
  // รายหลักสูตร: % รายระดับก่อน แล้วหลักสูตรในระดับรวมกันต้องเท่า % ของระดับ
  const levelBuckets = scenario ? byLvl(allocBuckets(scenario, 'EDUCATION_LEVEL')) : [];
  const groupCaps = levelCapsOf(
    choice,
    levelBuckets.map((b) => b.key),
  );
  const capIssue = levelCapIssue(choice, buckets);
  const warnings = outcome?.issues.filter((i) => i.severity === 'warning') ?? [];

  const lockBlocker = !fac
    ? 'เลือกคณะก่อน'
    : rows.length === 0
      ? 'คณะนี้ไม่มีหลักสูตรในชุดข้อมูล'
      : !outcome?.applied
        ? 'แก้ข้อทักท้วงของวิธีปันส่วนก่อน (เช่น % รวมไม่ครบ 100)'
        : capIssue;
  const activeStep = !fac ? 0 : saved ? 4 : readOnly ? 2 : lockBlocker ? 1 : 3;
  const methodOk = !!fac && rows.length > 0 && !lockBlocker;
  const status: StepStatus[] = [
    fac ? 'done' : 'current',
    !fac ? 'todo' : saved || readOnly || methodOk ? 'done' : 'current',
    !fac ? 'todo' : saved ? 'done' : 'optional',
    !fac ? 'todo' : saved ? 'done' : readOnly ? 'todo' : methodOk ? 'current' : 'todo',
  ];
  /** เงื่อนไขที่ปุ่มบันทึกต้องผ่านทุกข้อ — แสดงเป็นรายการให้รู้ว่าปุ่มจะกดได้เมื่อไร */
  const lockChecks = [
    { ok: !!fac, label: 'เลือกคณะแล้ว (ขั้นที่ 1)' },
    { ok: rows.length > 0, label: 'คณะมีหลักสูตรในชุดข้อมูล' },
    {
      ok: !!fac && rows.length > 0 && !lockBlocker,
      label:
        choice.method === 'CUSTOM_PCT'
          ? 'กรอกสัดส่วน % ครบ 100 และไม่มีข้อทักท้วง (ขั้นที่ 2)'
          : 'เลือกวิธีปันส่วนแล้ว (ขั้นที่ 2)',
    },
  ];

  const StepIcon = ({ icon }: StepIconProps) => (
    <StepNo no={Number(icon)} status={status[Number(icon) - 1] ?? 'todo'} />
  );
  const goTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const lockedBy = user?.STAFFNAME
    ? `${user.STAFFNAME} ${user.STAFFSURNAME ?? ''}`.trim()
    : `${roleDisplay[role].label}${fac ? ` ${fac}` : ''}`;

  const doSave = () => {
    setConfirm(null);
    if (!fac || lockBlocker || readOnly) return;
    if (!lockFaculty({ year, faculty: fac, choice, lockedBy })) {
      setToast({
        msg: submitLock
          ? 'บันทึกไม่สำเร็จ — การตั้งค่าปีนี้ถูกล็อกแล้วจากการยืนยันเอกสาร ต้องทำบันทึกขออนุมัติถึงกองแผนงาน'
          : 'บันทึกไม่สำเร็จ — เบราว์เซอร์ไม่อนุญาตให้บันทึกข้อมูล',
        ok: false,
      });

      return;
    }

    dropDraft(fac);
    setEditing(false);
    setToast({
      msg: `บันทึกการตั้งค่า "${ALLOC_METHOD_LABEL[choice.method]}" ของ${fac}แล้ว — หน้าคำนวณใช้ค่านี้ทันที`,
      ok: true,
    });
  };

  /** ยกเลิกแก้ไข → กลับเป็นค่าที่บันทึกไว้ */
  const cancelEdit = () => {
    if (config) setChoice(config.choice);
    setEditing(false);
  };

  /** ล้างการตั้งค่าปีนี้ → หน้าคำนวณกลับไปใช้ค่าปีก่อน/ตาม Excel */
  const doClearConfig = () => {
    setConfirm(null);
    if (!fac || readOnly) return;
    dropDraft(fac);
    setToast(
      unlockFaculty(year, fac)
        ? {
            msg: `ล้างการตั้งค่าปี ${year} ของ${fac}แล้ว — หน้าคำนวณกลับไปใช้ค่าปีก่อนหน้า หรือค่าตามแบบจำลอง Excel`,
            ok: true,
          }
        : {
            msg: submitLock
              ? 'ล้างไม่ได้ — การตั้งค่าปีนี้ถูกล็อกแล้วจากการยืนยันเอกสาร'
              : 'ล้างไม่สำเร็จ — เบราว์เซอร์ไม่อนุญาตให้บันทึกข้อมูล',
            ok: false,
          },
    );
  };

  /** กองแผนปลดล็อก (หลังได้รับบันทึกขออนุมัติ) — การตั้งค่ายังอยู่ คณะแก้ต่อได้ */
  const doUnlockSubmit = () => {
    setConfirm(null);
    if (!fac || role !== 'universityAdmin') return;
    setToast(
      unlockSubmit(year, fac)
        ? {
            msg: `ปลดล็อก${fac}แล้ว — คณะแก้การตั้งค่าได้ · เอกสารที่ยืนยันแล้วคงตัวเลขเดิม`,
            ok: true,
          }
        : { msg: 'ปลดล็อกไม่สำเร็จ — เบราว์เซอร์ไม่อนุญาตให้บันทึกข้อมูล', ok: false },
    );
  };

  /**
   * % รายระดับมีที่เก็บ 2 ที่: แบบ "ตามระดับการศึกษา" ใช้ pct[ระดับ] · แบบ "รายหลักสูตร" ใช้ levelPct (ข้อ ก.)
   * เขียนพร้อมกันทั้งคู่ — สลับแบบไปมาแล้ว % ที่กรอกไว้ไม่หาย (policyOf อ่านเฉพาะ key ของ bucket ที่ใช้อยู่)
   */
  const setLevelPct = (k: string, v: string) =>
    update({ pct: { ...choice.pct, [k]: v }, levelPct: { ...choice.levelPct, [k]: v } });

  /** สลับระดับ: ยกค่า % รายระดับของแบบเดิมไปแบบใหม่ (รองรับร่างเก่าที่ยังไม่ได้เขียนคู่) */
  const switchBucketLevel = (bucketLevel: AllocChoice['bucketLevel']) => {
    if (bucketLevel === choice.bucketLevel) return;
    const levels = levelBuckets.map((b) => b.key);
    const from = choice.bucketLevel === 'EDUCATION_LEVEL' ? choice.pct : (choice.levelPct ?? {});
    const carried = Object.fromEntries(
      levels.filter((l) => (from[l] ?? '').trim() !== '').map((l) => [l, from[l]!]),
    );

    update({
      bucketLevel,
      pct: { ...choice.pct, ...carried },
      levelPct: { ...choice.levelPct, ...carried },
    });
  };

  const fill = () => {
    const res = fillRemainderPct(buckets, choice.pct);

    if (!res) return;
    if ('error' in res) setToast({ msg: res.error, ok: false });
    else update({ pct: res.pct });
  };

  const splitByFtes = () => {
    if (!groupCaps) return;
    if (levelCapIssue(choice, buckets)?.startsWith('% รายระดับ')) {
      setToast({ msg: 'กรอก % รายระดับการศึกษา (ข้อ ก.) ให้รวม 100% ก่อน', ok: false });

      return;
    }
    update({ pct: splitLevelPctByFtes(groupCaps, buckets) });
    setToast({ msg: 'แบ่ง % ลงหลักสูตรตามจำนวนนิสิตแล้ว — ปรับแก้รายหลักสูตรต่อได้', ok: true });
  };

  const hasProgramPct = buckets.some((b) => (choice.pct[b.key] ?? '').trim() !== '');

  const clearSplit = () => {
    setConfirm(null);
    const pct = { ...choice.pct };

    buckets.forEach((b) => delete pct[b.key]);
    update({ pct });
    setToast({ msg: 'ล้าง % รายหลักสูตรแล้ว — % รายระดับ (ข้อ ก.) ยังอยู่', ok: true });
  };

  /* ---------- เทียบทั้ง 3 วิธี (กำหนด % ใช้สัดส่วนที่กรอกไว้ในขั้นที่ 2) ---------- */
  const compare = scenario
    ? METHODS.map((m) => {
        const o = allocateFaculty(scenario, policyOf({ ...choice, method: m }, buckets));

        return { m, applied: o.applied, after: new Map(o.shares.map((x) => [x.id, x.after])) };
      })
    : [];

  if (!roleReady) return null;
  if (denied) {
    return (
      <Alert severity="warning" icon={<i className="ri-lock-line" />}>
        <AlertTitle>ตั้งค่าวิธีปันส่วนต้นทุนคงที่ไม่ได้</AlertTitle>
        {denied}
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          ตั้งค่าวิธีปันส่วนต้นทุนคงที่ของคณะ
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ปีงบประมาณ {year} · ไม่บังคับ — ถ้าคณะยังไม่ตั้งค่า หน้าคำนวณใช้ค่าปีก่อนหน้า
          หรือค่าเริ่มต้นตามแบบจำลอง Excel (หารรายหัว) · บันทึกแล้วมีผลทันที
          แก้ได้จนกว่าจะมีหลักสูตรในคณะยืนยันเอกสารฉบับจริง (ล็อก)
          {readOnly && ' · ผู้บริหารคณะดูได้อย่างเดียว เจ้าหน้าที่ระดับคณะเป็นผู้บันทึก'}
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel nonLinear>
            {STEPS.map((st, i) => (
              <Step key={st.id} completed={status[i] === 'done'}>
                <StepButton
                  disabled={i > 0 && !fac}
                  onClick={() => goTo(st.id)}
                  optional={
                    <Typography variant="caption" color="text.secondary" display="block">
                      {st.hint}
                    </Typography>
                  }
                >
                  <StepLabel StepIconComponent={StepIcon}>
                    <Typography
                      variant="body2"
                      fontWeight={status[i] === 'current' ? 700 : 500}
                      color={status[i] === 'todo' ? 'text.disabled' : 'text.primary'}
                    >
                      ขั้นที่ {i + 1} · {st.label}
                    </Typography>
                  </StepLabel>
                </StepButton>
              </Step>
            ))}
          </Stepper>
          {!fac && (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 3 }}>
              เริ่มที่ขั้นที่ 1 — เลือกคณะด้านล่าง แล้วขั้นที่ 2–4 จะปรากฏ
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* ---------- 1. คณะ + สถานะ ---------- */}
      <Card id={STEPS[0]!.id} sx={{ scrollMarginTop: 80 }}>
        <StepHeader
          no={1}
          status={status[0]!}
          title="เลือกคณะ / หน่วยงาน"
          hint="เลือกคณะที่ประชุมตกลงวิธีปันส่วนแล้ว · ระบบจะแสดงสถานะการตั้งค่าปัจจุบันของคณะนั้น"
        />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Autocomplete
            options={facultyOptions}
            value={fac}
            disabled={!!scopedFac}
            onChange={(_, v) => setFac(v)}
            sx={{ maxWidth: 480 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="คณะ"
                helperText={
                  scopedFac
                    ? readOnly
                      ? 'ผู้บริหารคณะดูได้เฉพาะคณะของตน'
                      : 'ผู้ดูแลคณะตั้งค่าได้เฉพาะคณะของตน'
                    : undefined
                }
              />
            )}
          />
          {fac && ready && config && submitLock && (
            <Alert
              severity="info"
              icon={<i className="ri-lock-line" />}
              action={
                role === 'universityAdmin' ? (
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    startIcon={<i className="ri-lock-unlock-line" />}
                    sx={{ bgcolor: 'background.paper', whiteSpace: 'nowrap' }}
                    onClick={() => setConfirm('unlockSubmit')}
                  >
                    ปลดล็อก (กองแผน)
                  </Button>
                ) : undefined
              }
            >
              <AlertTitle>🔒 ล็อกแล้ว — {ALLOC_METHOD_LABEL[config.choice.method]}</AlertTitle>
              ล็อกเมื่อหลักสูตร <b>{submitLock.program}</b> ยืนยันเอกสารฉบับจริง{' '}
              {fmtLockedAt(submitLock.at)} โดย {submitLock.by} · ตั้งค่าเมื่อ{' '}
              {fmtLockedAt(config.lockedAt)} โดย {config.lockedBy}
              <br />
              แก้ไขต้องทำบันทึกข้อความขออนุมัติถึงกองแผนงาน แล้วกองแผนจะปลดล็อกให้
            </Alert>
          )}
          {fac && ready && config && !submitLock && (
            <Alert
              severity="success"
              icon={<i className="ri-checkbox-circle-line" />}
              action={
                !readOnly && !editing ? (
                  <Button
                    variant="outlined"
                    color="success"
                    size="small"
                    startIcon={<i className="ri-edit-line" />}
                    sx={{ bgcolor: 'background.paper', whiteSpace: 'nowrap' }}
                    onClick={() => setEditing(true)}
                  >
                    แก้ไขการตั้งค่า
                  </Button>
                ) : undefined
              }
            >
              <AlertTitle>ตั้งค่าแล้ว — {ALLOC_METHOD_LABEL[config.choice.method]}</AlertTitle>
              บันทึกเมื่อ {fmtLockedAt(config.lockedAt)} โดย {config.lockedBy} · หน้าคำนวณของ{fac}
              ใช้ค่านี้ · แก้ได้จนกว่าจะมีหลักสูตรในคณะยืนยันเอกสารฉบับจริง
              {editing && ' — กำลังแก้ไข: ค่าเดิมยังใช้คำนวณอยู่จนกว่าจะกดบันทึก'}
            </Alert>
          )}
          {fac && ready && !config && effective && (
            <Alert
              severity={effective.prevInvalidYear ? 'warning' : 'info'}
              icon={<i className="ri-information-line" />}
            >
              <AlertTitle>ยังไม่ได้ตั้งค่าปี {year}</AlertTitle>
              ตอนนี้หน้าคำนวณใช้
              {effective.source === 'prev-year'
                ? `ค่าปี ${effective.fromYear}`
                : 'ค่าเริ่มต้นตามแบบจำลอง Excel'}{' '}
              — <b>{ALLOC_METHOD_LABEL[effective.choice.method]}</b>
              {effective.prevInvalidYear &&
                ` · ค่าปี ${effective.prevInvalidYear} ใช้กับหลักสูตรปีนี้ไม่ได้ — ใช้ค่าตาม Excel แทน กรุณาตั้งค่า`}
              {!readOnly && ' · ตั้งค่าในขั้นที่ 2–4 ด้านล่าง (ฟอร์มเริ่มจากค่าที่ใช้อยู่)'}
            </Alert>
          )}
        </CardContent>
      </Card>

      {fac && scenario && (
        <>
          {/* ---------- 2. วิธี ---------- */}
          <Card id={STEPS[1]!.id} sx={{ scrollMarginTop: 80 }}>
            <StepHeader
              no={2}
              status={status[1]!}
              title="เลือกวิธีแบ่งต้นทุน"
              hint={
                submitLock
                  ? 'ล็อกแล้ว — แก้ไขต้องทำบันทึกข้อความขออนุมัติถึงกองแผนงาน'
                  : readOnly
                    ? 'ดูอย่างเดียว — เจ้าหน้าที่ระดับคณะเป็นผู้บันทึกการตั้งค่า'
                    : saved
                      ? 'ตั้งค่าแล้ว — กด “แก้ไขการตั้งค่า” ถ้าต้องการเปลี่ยนวิธี'
                      : `แบ่งต้นทุนคงที่คณะ ${fmtMillion(scenario.pool)} ลบ. ลง ${rows.length} หลักสูตร — เลือก 1 วิธี`
              }
            />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Box
                aria-disabled={locked}
                sx={locked ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
              >
                <MethodCards
                  value={choice.method}
                  onChange={(method) => update({ method })}
                  current={effective?.choice.method}
                  disabled={locked}
                  disabledHint={
                    readOnly
                      ? 'ดูอย่างเดียว — เจ้าหน้าที่ระดับคณะเป็นผู้บันทึกการตั้งค่า'
                      : submitLock
                        ? 'ล็อกแล้ว — แก้ไขต้องทำบันทึกข้อความขออนุมัติถึงกองแผนงาน'
                        : 'กด "แก้ไขการตั้งค่า" ก่อน จึงจะเปลี่ยนวิธีได้'
                  }
                />
              </Box>
              {choice.method === 'CUSTOM_PCT' && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                    จะกำหนด % ที่ระดับไหน? — คลิกเลือก 1 แบบ
                  </Typography>
                  <BucketLevelToggle
                    value={choice.bucketLevel}
                    onChange={switchBucketLevel}
                    disabled={locked}
                  />
                </Box>
              )}
              {groupCaps && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                    ก. กำหนด % ของแต่ละระดับการศึกษา
                  </Typography>
                  <PercentTable
                    buckets={levelBuckets}
                    pct={choice.levelPct ?? {}}
                    onPctChange={setLevelPct}
                    bucketLevel="EDUCATION_LEVEL"
                    onBucketLevelChange={() => {}}
                    subMethod={choice.subMethod}
                    onSubMethodChange={() => {}}
                    onFillRemainder={() => {}}
                    onClearDraft={() => {}}
                    draftSavedAt={null}
                    readOnly={locked}
                    hideControls
                  />
                  <Box
                    sx={{
                      mt: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      ข. แบ่ง % ของแต่ละระดับลงหลักสูตร — หลักสูตรในระดับเดียวกันรวมกันห้ามเกิน %
                      ของระดับ
                    </Typography>
                    {!locked && (
                      <Tooltip title="แบ่ง % ของแต่ละระดับลงหลักสูตรตามจำนวนนิสิตรายหัว (เท่ากับในชีต) — คนเยอะได้ % มาก รวมกันเท่า % ของระดับพอดี · ค่าที่กรอกไว้จะถูกแทนที่">
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<i className="ri-group-line" />}
                          sx={{ marginInlineStart: { md: 'auto' } }}
                          onClick={splitByFtes}
                        >
                          แบ่งตามจำนวนนิสิต
                        </Button>
                      </Tooltip>
                    )}
                    {!locked && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<i className="ri-eraser-line" />}
                        disabled={!hasProgramPct}
                        onClick={() => setConfirm('clearSplit')}
                      >
                        ล้าง % รายหลักสูตร
                      </Button>
                    )}
                  </Box>
                </Box>
              )}
              {choice.method === 'CUSTOM_PCT' && (
                <PercentTable
                  buckets={buckets}
                  pct={choice.pct}
                  onPctChange={(k, v) =>
                    choice.bucketLevel === 'EDUCATION_LEVEL'
                      ? setLevelPct(k, v)
                      : update({ pct: { ...choice.pct, [k]: v } })
                  }
                  bucketLevel={choice.bucketLevel}
                  onBucketLevelChange={switchBucketLevel}
                  subMethod={choice.subMethod}
                  onSubMethodChange={(subMethod) => update({ subMethod })}
                  onFillRemainder={fill}
                  onClearDraft={() => setConfirm('clear')}
                  draftSavedAt={null}
                  readOnly={locked}
                  hideControls
                  groupCaps={groupCaps}
                />
              )}
              {choice.method === 'CUSTOM_PCT' && choice.bucketLevel === 'PROGRAM' && !locked && (
                <Alert severity="info" variant="outlined">
                  กำหนด % รายหลักสูตร: หลักสูตรที่จะเปิดใหม่ยังไม่มี % —
                  อาจารย์จะเปิดหลักสูตรใหม่ไม่ได้จนกว่าคณะจะแก้การตั้งค่าเพิ่มสัดส่วนให้
                  ถ้าต้องการรองรับหลักสูตรใหม่ ให้กำหนดรายระดับการศึกษา
                </Alert>
              )}
              {capIssue && !locked && <Alert severity="error">{capIssue}</Alert>}
              {errors.map((i) => (
                <Alert key={i.code} severity="error">
                  {i.message}
                  {i.refs?.length ? ` — ${i.refs.join(', ')}` : ''}
                </Alert>
              ))}
              {warnings.map((i) => (
                <Alert key={i.code} severity="warning" variant="outlined">
                  {i.message}
                </Alert>
              ))}
              {/* ร่างของทั้งขั้น (ทุกวิธี) — วางมุมขวาล่างของการ์ด */}
              {!locked && savedAt && (
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}
                >
                  <Typography variant="caption" color="text.disabled">
                    บันทึกร่างอัตโนมัติ {new Date(savedAt).toLocaleTimeString('th-TH')}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<i className="ri-eraser-line" />}
                    onClick={() => setConfirm('clear')}
                  >
                    ล้างร่าง
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* ---------- 3. เทียบ 3 วิธี ---------- */}
          <Card id={STEPS[2]!.id} sx={{ scrollMarginTop: 80 }}>
            <StepHeader
              no={3}
              status={status[2]!}
              title="เทียบส่วนแบ่งรายหลักสูตรทั้ง 3 วิธี"
              hint="ดูว่าแต่ละวิธีทำให้หลักสูตรรับภาระเท่าไร (ไม่บังคับ) · บรรทัดล่าง = เทียบกับที่ชีตปันไว้ (▲ แดง = ภาระเพิ่ม · ▼ เขียว = ภาระลด) · คอลัมน์ที่ไฮไลต์ = วิธีที่เลือกอยู่ · เปลี่ยนวิธีได้จากปุ่ม “เลือกวิธีนี้”"
            />
            <CardContent>
              <TableContainer>
                <Table size="small" sx={gridTableSx}>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" sx={{ width: 56 }}>
                        ลำดับ
                      </TableCell>
                      <TableCell>หลักสูตร</TableCell>
                      <TableCell align="right">นิสิต (คน)</TableCell>
                      {compare.map(({ m }) => (
                        <TableCell
                          key={m}
                          align="right"
                          sx={m === choice.method ? { bgcolor: 'action.selected' } : undefined}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              gap: 1,
                            }}
                          >
                            {ALLOC_METHOD_LABEL[m]} (บาท)
                            {!locked && m !== choice.method && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<i className="ri-checkbox-circle-line" />}
                                sx={{ whiteSpace: 'nowrap' }}
                                onClick={() => update({ method: m })}
                              >
                                เลือกวิธีนี้
                              </Button>
                            )}
                            {m === choice.method && (
                              <Chip
                                size="small"
                                color="primary"
                                icon={<i className="ri-check-line" />}
                                label="เลือกอยู่"
                              />
                            )}
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {byLevel
                      .slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE)
                      .flatMap(({ p, id }, i, pageRows) => [
                        // แถวหัวกลุ่มระดับ — ขึ้นใหม่ทุกครั้งที่ระดับเปลี่ยน และที่แถวแรกของแต่ละหน้า
                        (i === 0 || pageRows[i - 1]!.p.lvl !== p.lvl) && (
                          <TableRow
                            key={`lvl-${p.lvl}`}
                            sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.05) }}
                          >
                            <TableCell colSpan={3 + compare.length} sx={{ fontWeight: 700 }}>
                              {p.lvl}
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                                sx={{ ml: 2 }}
                              >
                                {levelCount.get(p.lvl)} หลักสูตร
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ),
                        <TableRow key={id} hover>
                          {/* ลำดับต่อเนื่องข้ามหน้า */}
                          <TableCell align="center">{page * ROWS_PER_PAGE + i + 1}</TableCell>
                          <TableCell sx={{ pl: 4 }}>{progName(p)}</TableCell>
                          <TableCell align="right">{fmtB(p.Q)}</TableCell>
                          {compare.map(({ m, applied, after }) => {
                            const v = after.get(id) ?? 0;
                            const d = v - sheetShareOf(p);

                            return (
                              <TableCell
                                key={m}
                                align="right"
                                sx={{
                                  whiteSpace: 'nowrap',
                                  ...(m === choice.method && { bgcolor: 'action.selected' }),
                                }}
                              >
                                {applied ? (
                                  <>
                                    <Box component="span" sx={{ fontWeight: 700 }}>
                                      {fmtB(v)}
                                    </Box>
                                    {/* เท่าชีต → ไม่ต้องโชว์ผลต่าง */}
                                    {Math.round(d) !== 0 && (
                                      <Box
                                        sx={{
                                          fontSize: '0.75rem',
                                          color: d > 0 ? 'error.main' : 'success.main',
                                        }}
                                      >
                                        {fmtDiff(d)}
                                      </Box>
                                    )}
                                  </>
                                ) : (
                                  <Typography variant="caption" color="text.disabled">
                                    —
                                  </Typography>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>,
                      ])}
                  </TableBody>
                </Table>
              </TableContainer>
              {rows.length > ROWS_PER_PAGE && (
                <TablePagination
                  component="div"
                  count={rows.length}
                  page={page}
                  rowsPerPage={ROWS_PER_PAGE}
                  rowsPerPageOptions={[ROWS_PER_PAGE]}
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
                  onPageChange={(_, p) => setPage(p)}
                />
              )}
              {compare.some((c) => c.m === 'CUSTOM_PCT' && !c.applied) && (
                <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                  วิธีกำหนด % เอง ยังแสดงผลไม่ได้ — เลือกวิธีนี้ในขั้นที่ 2 แล้วกรอกสัดส่วนให้ครบ
                  100% ก่อน
                </Alert>
              )}
            </CardContent>
          </Card>
          {/* ---------- 4. บันทึกการตั้งค่า ---------- */}
          <Card
            id={STEPS[3]!.id}
            sx={{
              scrollMarginTop: 80,
              border: 2,
              borderColor: saved
                ? 'success.main'
                : methodOk && !readOnly
                  ? 'primary.main'
                  : 'divider',
            }}
          >
            <StepHeader
              no={4}
              status={status[3]!}
              title="บันทึกการตั้งค่า"
              hint={
                submitLock
                  ? 'ล็อกแล้วจากการยืนยันเอกสาร — แก้ไขต้องทำบันทึกข้อความขออนุมัติถึงกองแผนงาน'
                  : readOnly
                    ? 'ผู้บริหารคณะดูได้อย่างเดียว — เจ้าหน้าที่ระดับคณะเป็นผู้บันทึกตามที่ประชุมคณะตกลง'
                    : saved
                      ? 'ตั้งค่าแล้ว — หน้าคำนวณใช้ค่านี้ · แก้ได้จนกว่าจะมีหลักสูตรในคณะยืนยันเอกสารฉบับจริง'
                      : 'กดบันทึกเมื่อผ่านทุกเงื่อนไข — หน้าคำนวณใช้ค่านี้ทันที'
              }
            />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {submitLock ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                  <Chip
                    color="info"
                    icon={<i className="ri-lock-line" />}
                    label={`ล็อกแล้ว — ${ALLOC_METHOD_LABEL[config.choice.method]}`}
                  />
                  {role === 'universityAdmin' ? (
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<i className="ri-lock-unlock-line" />}
                      onClick={() => setConfirm('unlockSubmit')}
                    >
                      ปลดล็อก (กองแผน)
                    </Button>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      แก้ไขต้องทำบันทึกข้อความขออนุมัติถึงกองแผนงาน
                    </Typography>
                  )}
                </Box>
              ) : readOnly ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                  <Chip
                    color={config ? 'success' : 'default'}
                    icon={<i className={config ? 'ri-checkbox-circle-line' : 'ri-time-line'} />}
                    label={
                      config
                        ? `ตั้งค่าแล้ว — ${ALLOC_METHOD_LABEL[config.choice.method]}`
                        : `ยังไม่ได้ตั้งค่าปี ${year}`
                    }
                  />
                  <Typography variant="body2" color="text.secondary">
                    ผู้บริหารคณะดูได้อย่างเดียว — เจ้าหน้าที่ระดับคณะเป็นผู้บันทึกการตั้งค่า
                  </Typography>
                </Box>
              ) : saved ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                  <Chip
                    color="success"
                    icon={<i className="ri-checkbox-circle-line" />}
                    label={`ตั้งค่าแล้ว — ${ALLOC_METHOD_LABEL[config.choice.method]}`}
                  />
                  <Button
                    variant="contained"
                    startIcon={<i className="ri-edit-line" />}
                    onClick={() => setEditing(true)}
                  >
                    แก้ไขการตั้งค่า
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<i className="ri-delete-bin-line" />}
                    onClick={() => setConfirm('clearConfig')}
                  >
                    ล้างการตั้งค่าปีนี้
                  </Button>
                </Box>
              ) : (
                <>
                  <Box
                    component="ul"
                    sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}
                  >
                    {lockChecks.map((c) => (
                      <Box
                        component="li"
                        key={c.label}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                      >
                        <Box
                          component="i"
                          className={c.ok ? 'ri-checkbox-circle-fill' : 'ri-close-circle-line'}
                          sx={{ fontSize: 20, color: c.ok ? 'success.main' : 'error.main' }}
                        />
                        <Typography variant="body2" color={c.ok ? 'text.primary' : 'error.main'}>
                          {c.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    <Tooltip title={lockBlocker ?? ''}>
                      {/* span ห่อปุ่ม disabled ให้ tooltip บอกเหตุผลได้ */}
                      <span>
                        <Button
                          variant="contained"
                          color="success"
                          size="large"
                          startIcon={<i className="ri-save-line" />}
                          disabled={!!lockBlocker}
                          onClick={() => setConfirm('save')}
                        >
                          บันทึกการตั้งค่า
                        </Button>
                      </span>
                    </Tooltip>
                    {editing && (
                      <Button
                        variant="outlined"
                        color="secondary"
                        size="large"
                        startIcon={<i className="ri-arrow-go-back-line" />}
                        onClick={cancelEdit}
                      >
                        ยกเลิกแก้ไข
                      </Button>
                    )}
                    <Typography
                      variant="body2"
                      color={lockBlocker ? 'error.main' : 'text.secondary'}
                    >
                      {lockBlocker
                        ? `ยังกดไม่ได้ — ${lockBlocker}`
                        : `พร้อมบันทึก "${ALLOC_METHOD_LABEL[choice.method]}" ของ${fac} ปีงบ ${year}`}
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={confirm === 'save'} onClose={() => setConfirm(null)}>
        <DialogTitle>บันทึกการตั้งค่าวิธีปันส่วนของ{fac}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ใช้วิธี &ldquo;{ALLOC_METHOD_LABEL[choice.method]}&rdquo; กับทุกหลักสูตรใน{fac} ปีงบ{' '}
            {year} — หน้าคำนวณใช้ค่านี้ทันที แก้ไขได้จนกว่าจะมีหลักสูตรในคณะยืนยันเอกสารฉบับจริง
            (หลังจากนั้นล็อก ต้องทำบันทึกขออนุมัติถึงกองแผนงาน)
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="secondary" onClick={() => setConfirm(null)}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<i className="ri-save-line" />}
            onClick={doSave}
          >
            ยืนยันบันทึก
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirm === 'clearConfig'} onClose={() => setConfirm(null)}>
        <DialogTitle>
          ล้างการตั้งค่าปี {year} ของ{fac}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            การตั้งค่าที่บันทึกไว้ของปีนี้จะถูกลบ — หน้าคำนวณกลับไปใช้ค่าปีก่อนหน้า
            หรือค่าเริ่มต้นตามแบบจำลอง Excel (หารรายหัว) ตั้งค่าใหม่ได้ภายหลัง
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="secondary" onClick={() => setConfirm(null)}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<i className="ri-delete-bin-line" />}
            onClick={doClearConfig}
          >
            ล้างการตั้งค่า
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirm === 'unlockSubmit'} onClose={() => setConfirm(null)}>
        <DialogTitle>ปลดล็อกการตั้งค่าของ{fac} (กองแผน)?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ทำเมื่อได้รับบันทึกข้อความขออนุมัติจากคณะแล้วเท่านั้น — คณะจะแก้การตั้งค่าปี {year}{' '}
            ได้อีกครั้ง การตั้งค่าเดิมยังใช้คำนวณอยู่ · เอกสารที่ยืนยันไปแล้วคงตัวเลขเดิม
            {submitLock && ` (ล็อกจากหลักสูตร ${submitLock.program})`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="secondary" onClick={() => setConfirm(null)}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<i className="ri-lock-unlock-line" />}
            onClick={doUnlockSubmit}
          >
            ยืนยันปลดล็อก
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirm === 'clearSplit'} onClose={() => setConfirm(null)}>
        <DialogTitle>ล้าง % รายหลักสูตรทั้งหมด?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ช่องสัดส่วนของทุกหลักสูตรในข้อ ข. จะกลับเป็นค่าว่าง (ทุกหน้า) · % รายระดับการศึกษาในข้อ
            ก. ไม่ถูกล้าง ย้อนกลับไม่ได้ — กด &quot;แบ่งตามจำนวนนิสิต&quot; ใหม่ได้ภายหลัง
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="secondary" onClick={() => setConfirm(null)}>
            ยกเลิก
          </Button>
          <Button variant="contained" color="error" onClick={clearSplit}>
            ล้าง
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirm === 'clear'} onClose={() => setConfirm(null)}>
        <DialogTitle>ล้างร่างของ{fac}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            วิธีและสัดส่วนที่เลือกไว้แต่ยังไม่บันทึกจะกลับเป็นค่าที่หน้าคำนวณใช้อยู่ ย้อนกลับไม่ได้
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="secondary" onClick={() => setConfirm(null)}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirm(null);
              if (!fac) return;
              dropDraft(fac);
              setChoice(effective?.choice ?? DEFAULT_ALLOC_CHOICE);
              setToast({ msg: 'ล้างร่างแล้ว', ok: true });
            }}
          >
            ล้างร่าง
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert
          severity={toast?.ok ? 'success' : 'error'}
          variant="filled"
          onClose={() => setToast(null)}
        >
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FixedCostLockView;
