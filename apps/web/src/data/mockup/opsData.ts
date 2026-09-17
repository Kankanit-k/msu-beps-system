/**
 * ข้อมูลจำลองสำหรับ W11 (Allocation Run), W12 (Reconciliation), W13 (Exception queue)
 * พอร์ตจาก mockup/assets/master-data.js — ค่าเงินอ้างอิงจาก RAW เพื่อให้ตัวเลขสอดคล้องกับ
 * ชุดข้อมูลตัวอย่างเดียวกับหน้าจอวิเคราะห์อื่น ๆ (ดู mockup/README.md และ SA.md §5, §13)
 *
 * สามหน้าจอนี้เป็น workflow เดียวกัน (สั่งคำนวณ → ตรวจยอด → ตามแก้ข้อยกเว้น) จึงใช้คำศัพท์และ
 * สถานะร่วมชุดเดียวกันจากไฟล์นี้ ไม่ประดิษฐ์คำใหม่แยกหน้า
 */
import { RAW } from './rawData';

/* ---------- allocation_run (W11) ---------- */

export type RunState = 'DRAFT' | 'RUNNING' | 'CALCULATED' | 'VALIDATED' | 'APPROVED' | 'FAILED';

export interface AllocationRun {
  id: number;
  year: number;
  basis: 'ACTUAL' | 'BUDGET';
  rule: string;
  scope: string;
  state: RunState;
  by: string;
  at: string;
  appr: string | null;
  dur: string;
  tc: number;
  diff: number;
  exc: number;
}

/** #1041 ใช้ฐาน BUDGET จึงสูงกว่า ACTUAL · #1039 เป็นปีงบ 2567 จึงต่ำกว่า (เช่นเดียวกับ mockup) */
export const RUNS: AllocationRun[] = [
  {
    id: 1042,
    year: 2568,
    basis: 'ACTUAL',
    rule: 'v3',
    scope: 'ทั้งมหาวิทยาลัย',
    state: 'APPROVED',
    by: 'นางสาวสิริมา ศรีสุภาพ',
    at: '11 ก.ค. 2569 14:32',
    appr: 'ผศ.ดร.ปิยภัทร บุษบาบดินทร์',
    dur: '4 น. 12 วิ.',
    tc: RAW.UNI.TC,
    diff: 0,
    exc: 8,
  },
  {
    id: 1041,
    year: 2568,
    basis: 'BUDGET',
    rule: 'v3',
    scope: 'ทั้งมหาวิทยาลัย',
    state: 'CALCULATED',
    by: 'นางสาวสิริมา ศรีสุภาพ',
    at: '11 ก.ค. 2569 11:08',
    appr: null,
    dur: '4 น. 05 วิ.',
    tc: RAW.UNI.TC * 1.0357,
    diff: 0,
    exc: 8,
  },
  {
    id: 1040,
    year: 2568,
    basis: 'ACTUAL',
    rule: 'v2',
    scope: 'ทั้งมหาวิทยาลัย',
    state: 'FAILED',
    by: 'นายอัครินทร์ บุพผา',
    at: '09 ก.ค. 2569 22:41',
    appr: null,
    dur: '3 น. 51 วิ.',
    tc: RAW.UNI.TC - 6117.34,
    diff: 6117.34,
    exc: 14,
  },
  {
    id: 1039,
    year: 2567,
    basis: 'ACTUAL',
    rule: 'v2',
    scope: 'ทั้งมหาวิทยาลัย',
    state: 'APPROVED',
    by: 'นางสาวสิริมา ศรีสุภาพ',
    at: '14 ส.ค. 2568 09:20',
    appr: 'ผศ.ดร.ปิยภัทร บุษบาบดินทร์',
    dur: '3 น. 44 วิ.',
    tc: RAW.UNI.TC * 0.9475,
    diff: 0,
    exc: 5,
  },
];

export const RUN_STATE_META: Record<RunState, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  DRAFT: { label: 'ร่าง', color: 'default' },
  RUNNING: { label: 'กำลังคำนวณ', color: 'info' },
  CALCULATED: { label: 'คำนวณเสร็จ', color: 'warning' },
  VALIDATED: { label: 'ตรวจยอดผ่าน', color: 'warning' },
  APPROVED: { label: 'อนุมัติแล้ว', color: 'success' },
  FAILED: { label: 'ไม่ผ่าน', color: 'error' },
};

/** ลำดับสถานะปกติของ run หนึ่งรอบ (ไม่รวม FAILED ซึ่งเป็นทางแยก) */
export const RUN_FLOW: RunState[] = ['DRAFT', 'RUNNING', 'CALCULATED', 'VALIDATED', 'APPROVED'];

export interface RunLogEntry {
  t: string;
  icon: string;
  html: string;
}

export const RUN_LOG: RunLogEntry[] = [
  {
    t: '11 ก.ค. 2569 14:32',
    icon: '✅',
    html: '<b>ผศ.ดร.ปิยภัทร บุษบาบดินทร์</b> อนุมัติรอบคำนวณ — ผลชุดนี้กลายเป็นตัวเลขอ้างอิงของปีงบ 2568',
  },
  {
    t: '11 ก.ค. 2569 14:05',
    icon: '🧾',
    html: 'ตรวจยอดกลับต้นทางผ่าน — ส่วนต่าง <b>0.00 บาท</b> (เกณฑ์ยอมรับ 0.00)',
  },
  {
    t: '11 ก.ค. 2569 14:01',
    icon: '⚙️',
    html: 'คำนวณเสร็จ 230 หลักสูตร × 2 ฐานรายได้ × 3 ระดับ ใช้เวลา 4 นาที 12 วินาที',
  },
  {
    t: '11 ก.ค. 2569 13:57',
    icon: '🚩',
    html: 'พบรายการค้างตรวจ <b>8 รายการ</b> มูลค่ารวม 9.4 ลบ. (0.39% ของต้นทุนรวม) — บันทึกไว้ ไม่ปิดกั้นการคำนวณ',
  },
  {
    t: '11 ก.ค. 2569 13:56',
    icon: '▶️',
    html: '<b>นางสาวสิริมา ศรีสุภาพ</b> สั่งเริ่มคำนวณ — ล็อกกติกาผังบัญชี v3 · ฐานต้นทุน ACTUAL',
  },
];

/** เหตุผลที่บล็อกการสร้าง run ใหม่ตอนนี้ (SA.md §9.1 ข้อ 5) — ใช้ในแผงสร้าง run ของ W11 */
export const RUN_BLOCKERS = [
  { title: 'ค่าเสื่อมราคาอาคารยังไม่มีข้อมูล', href: '/admin/exceptions' },
  { title: '4 หลักสูตรยังไม่มีค่าธรรมเนียมที่อนุมัติ', href: '/admin/exceptions' },
];

/* ---------- reconciliation (W12) ---------- */

export interface ReconMethod {
  label: string;
  value: number;
  color: string;
  alloc: boolean;
  note: string;
}

const allocTot = RAW.FACS.reduce((a, f) => a + (f.tfcOffice || 0), 0);

/** ยอดปันส่วนยึดจากผลรวม tfcOffice รายคณะ เพื่อให้การ์ดสรุปกับตารางรายคณะตรงกันเสมอ
 *  ส่วน DIRECT คือส่วนที่เหลือของต้นทุนรวม (เช่นเดียวกับ mockup) */
export const RECON_METHODS: ReconMethod[] = [
  {
    label: 'ผูกหลักสูตรโดยตรง (DIRECT)',
    value: RAW.UNI.TC - allocTot,
    color: '#0ca678',
    alloc: false,
    note: 'ต้นทุนที่ระบุหลักสูตรได้จากเอกสารต้นทาง',
  },
  {
    label: 'ตามการใช้จริง (ACTUAL_USAGE)',
    value: allocTot * 0.086,
    color: '#6d4cff',
    alloc: true,
    note: 'มีมิเตอร์/ทะเบียนการใช้แยก เช่น ค่าสาธารณูปโภค',
  },
  {
    label: 'ตามจำนวนนิสิต (STUDENT_HEADCOUNT)',
    value: allocTot * 0.871,
    color: '#f59f00',
    alloc: true,
    note: 'ตัวขับหลักของต้นทุนสำนักงานเลขานุการ',
  },
  {
    label: 'ตามสัดส่วนหลักสูตร (PROGRAM_SHARE)',
    value: allocTot * 0.043,
    color: '#e64980',
    alloc: true,
    note: 'ประมาณการ — หลักสูตรเล็กรับภาระสูงผิดปกติ ต้องระวังการตีความ',
  },
];

/* ---------- exception queue (W13) ---------- */

export type ExceptionFlag =
  | 'MISSING_SOURCE'
  | 'UNCLASSIFIED'
  | 'MISSING_DRIVER'
  | 'NO_FEE'
  | 'Q_ZERO'
  | 'ESTIMATED';

export type ExceptionState = 'OPEN' | 'IN_PROGRESS' | 'ACCEPTED' | 'RESOLVED';

export interface ExceptionItem {
  flag: ExceptionFlag;
  label: string;
  item: string;
  org: string;
  amount: number | null;
  owner: string;
  since: string;
  state: ExceptionState;
  note: string;
}

/** ต้นทุนที่ขาดไปทำให้ผลลัพธ์ดูดีเกินจริงเสมอ — ถ้ากำไรก็สูงเกินจริง ถ้าขาดทุนก็ขาดทุนน้อยกว่าจริง */
const surplus = RAW.UNI.TR - RAW.UNI.TC;
const fmtM1 = (v: number) => (Math.abs(v) / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const surplusCaveatText =
  surplus >= 0
    ? `ส่วนเกิน +${fmtM1(surplus)} ลบ. สูงเกินจริง`
    : `ตัวเลขขาดทุน ${fmtM1(surplus)} ลบ. น้อยกว่าความจริง`;

export const EXCEPTIONS: ExceptionItem[] = [
  {
    flag: 'MISSING_SOURCE',
    label: 'ไม่มีข้อมูลต้นทาง',
    item: 'ค่าเสื่อมราคาอาคาร — ทั้ง 20 หน่วยงาน',
    org: 'ทั้งมหาวิทยาลัย',
    amount: null,
    owner: 'กองคลัง — งานบริหารสินทรัพย์',
    since: '11 ก.ค. 2569',
    state: 'OPEN',
    note: `ยังไม่เชื่อมต่อระบบสินทรัพย์ส่วนอาคาร · TFC และ TC ต่ำกว่าจริง ${surplusCaveatText} และ Q* ทุกระดับต่ำกว่าที่ควรเป็น`,
  },
  {
    flag: 'UNCLASSIFIED',
    label: 'ยังไม่จำแนก',
    item: '2·2·400·40010 ค่าจดลิขสิทธิ์ / ค่าฐานข้อมูล',
    org: 'สำนักวิทยบริการ',
    amount: 1120400,
    owner: 'กองคลัง',
    since: '11 ก.ค. 2569',
    state: 'OPEN',
    note: 'รอกองคลังยืนยันว่าตีเป็น TFC หรือ TVC — ระหว่างนี้พักไว้ที่หน่วยงาน ไม่ปันลงหลักสูตร',
  },
  {
    flag: 'UNCLASSIFIED',
    label: 'ยังไม่จำแนก',
    item: '2·4·800·80001 เงินอุดหนุนทั่วไป',
    org: 'กองแผนงาน',
    amount: 482300,
    owner: 'กองคลัง',
    since: '11 ก.ค. 2569',
    state: 'IN_PROGRESS',
    note: 'มติที่ประชุมให้ตีเป็น FIXED ตั้งแต่ปี 2569 — ปี 2568 ยังค้าง',
  },
  {
    flag: 'MISSING_DRIVER',
    label: 'ไม่มีตัวขับ',
    item: 'ค่าสาธารณูปโภค — อาคารเรียนรวม RN',
    org: 'คณะมนุษยศาสตร์ฯ',
    amount: 214800,
    owner: 'กองอาคารสถานที่',
    since: '11 ก.ค. 2569',
    state: 'OPEN',
    note: 'กติกาสั่งปันตามการใช้จริง แต่ไม่มีเลขมิเตอร์ของอาคารนี้',
  },
  {
    flag: 'MISSING_DRIVER',
    label: 'ไม่มีตัวขับ',
    item: 'ค่าวัสดุคลินิก — โรงพยาบาลสุทธาเวช',
    org: 'คณะแพทยศาสตร์',
    amount: 91500,
    owner: 'คณะแพทยศาสตร์',
    since: '11 ก.ค. 2569',
    state: 'OPEN',
    note: 'ไม่มีทะเบียนการใช้แยกหลักสูตร จึงตกไปใช้ค่าเริ่มต้น STUDENT_HEADCOUNT',
  },
  {
    flag: 'NO_FEE',
    label: 'ไม่มีค่าธรรมเนียม',
    item: 'ชีววิทยา (ปริญญาโท) · เคมี (ปริญญาโท) และอีก 2 หลักสูตร',
    org: 'คณะวิทยาศาสตร์ · คณะพยาบาลศาสตร์',
    amount: null,
    owner: 'กองแผนงาน',
    since: '02 เม.ย. 2568',
    state: 'IN_PROGRESS',
    note: 'อัตรายังอยู่ที่สถานะร่าง/รออนุมัติ — TR รายหลักสูตรคำนวณไม่ได้',
  },
  {
    flag: 'Q_ZERO',
    label: 'นิสิต Q = 0',
    item: 'วิศวกรรมปฏิบัติ (ต่อเนื่อง) และอีก 2 หลักสูตร',
    org: 'คณะวิศวกรรมศาสตร์',
    amount: 3410200,
    owner: 'กองทะเบียน',
    since: '11 ก.ค. 2569',
    state: 'OPEN',
    note: 'หลักสูตรเปิดแต่ยังไม่มีนิสิตลงทะเบียน — R และ AVC เป็น null คำนวณ Q* ไม่ได้',
  },
  {
    flag: 'ESTIMATED',
    label: 'ประมาณการ',
    item: 'ต้นทุนสำนักงานเลขานุการที่ปันด้วย PROGRAM_SHARE',
    org: '14 คณะ',
    amount: 4100000,
    owner: 'กองแผนงาน',
    since: '11 ก.ค. 2569',
    state: 'ACCEPTED',
    note: 'ยอมรับเป็นวิธีสำรอง — ทำให้หลักสูตรที่มีนิสิตน้อยมี AVC สูงผิดปกติ ต้องกำกับทุกครั้งที่นำเสนอ',
  },
];

export const EXC_FLAG_META: Record<ExceptionFlag, { label: string; color: 'default' | 'info' | 'warning' | 'error' | 'secondary' }> = {
  MISSING_SOURCE: { label: 'ไม่มีข้อมูลต้นทาง', color: 'error' },
  UNCLASSIFIED: { label: 'ยังไม่จำแนก', color: 'warning' },
  MISSING_DRIVER: { label: 'ไม่มีตัวขับ', color: 'secondary' },
  NO_FEE: { label: 'ไม่มีค่าธรรมเนียม', color: 'info' },
  Q_ZERO: { label: 'Q = 0', color: 'error' },
  ESTIMATED: { label: 'ประมาณการ', color: 'secondary' },
};

export const EXC_STATE_META: Record<ExceptionState, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  OPEN: { label: 'ยังไม่แก้', color: 'error' },
  IN_PROGRESS: { label: 'กำลังตาม', color: 'warning' },
  ACCEPTED: { label: 'ยอมรับแล้ว', color: 'default' },
  RESOLVED: { label: 'แก้แล้ว', color: 'success' },
};
