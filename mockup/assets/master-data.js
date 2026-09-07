/* ==========================================================================
   MSU-BEPS — master-data.js
   ข้อมูลจำลองสำหรับหน้าจอที่ prototype v8-1 ยังไม่มี (W8, W9, W11–W15)
   โครงสร้างทุกก้อนอ้างอิงตารางจริงใน db/01_schema.sql ตามที่ระบุใน SA.md §5
   ตัวเลขเงินที่ใช้เป็นของจริงจากชุดข้อมูลปี 2568 · ชื่อคน/เวลา เป็นตัวอย่าง
   ========================================================================== */

/* ตัวช่วยจัดรูปยอดเงิน — ใช้ในข้อความบรรยายที่ต้องอ้างตัวเลขของชุดข้อมูลที่โหลดอยู่
   (core.js ยังไม่ถูกโหลดตอนนี้ จึงต้องมีตัวของตัวเอง) */
const _mb = v => (v / 1e6).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const _sur = RAW.UNI.TR - RAW.UNI.TC;
const _surTxt = (_sur >= 0 ? '+' : '−') + _mb(Math.abs(_sur)) + ' ลบ.';

/* ---------- fee_schedule + fee_approval_log (W8) ---------- */
const FEES = [
  { fac: 'คณะการบัญชีและการจัดการ', prog: 'บัญชีบัณฑิต', lvl: 'ปริญญาตรี', st: 'ภาคปกติ · ไทย', rate: 36000, prev: 34000, status: 'APPROVED', by: 'สภามหาวิทยาลัย', at: '18 มี.ค. 2568' },
  { fac: 'คณะการบัญชีและการจัดการ', prog: 'ธุรกิจระหว่างประเทศ (นานาชาติ)', lvl: 'ปริญญาตรี', st: 'ภาคปกติ · ไทย', rate: 90000, prev: 90000, status: 'APPROVED', by: 'สภามหาวิทยาลัย', at: '18 มี.ค. 2568' },
  { fac: 'คณะการบัญชีและการจัดการ', prog: 'ธุรกิจระหว่างประเทศ (นานาชาติ)', lvl: 'ปริญญาตรี', st: 'ภาคปกติ · ต่างชาติ', rate: 110000, prev: 110000, status: 'APPROVED', by: 'สภามหาวิทยาลัย', at: '18 มี.ค. 2568' },
  { fac: 'คณะการบัญชีและการจัดการ', prog: 'บัญชีมหาบัณฑิต', lvl: 'ปริญญาโท', st: 'ภาคพิเศษ · ไทย', rate: 100000, prev: 95000, status: 'PENDING_APPROVAL', by: null, at: null },
  { fac: 'คณะวิทยาศาสตร์', prog: 'เคมี', lvl: 'ปริญญาตรี', st: 'ภาคปกติ · ไทย', rate: 30000, prev: 30000, status: 'APPROVED', by: 'สภามหาวิทยาลัย', at: '18 มี.ค. 2568' },
  { fac: 'คณะวิทยาศาสตร์', prog: 'เคมี', lvl: 'ปริญญาโท', st: 'ภาคปกติ · ไทย', rate: 93311, prev: 88000, status: 'PENDING_APPROVAL', by: null, at: null },
  { fac: 'คณะวิทยาศาสตร์', prog: 'เคมี', lvl: 'ปริญญาเอก', st: 'ภาคปกติ · ไทย', rate: 143311, prev: 143311, status: 'APPROVED', by: 'สภามหาวิทยาลัย', at: '18 มี.ค. 2568' },
  { fac: 'คณะวิทยาศาสตร์', prog: 'ชีววิทยา', lvl: 'ปริญญาโท', st: 'ภาคปกติ · ไทย', rate: 93311, prev: 88000, status: 'DRAFT', by: null, at: null },
  { fac: 'คณะแพทยศาสตร์', prog: 'แพทยศาสตรบัณฑิต', lvl: 'ปริญญาตรี', st: 'ภาคปกติ · ไทย', rate: 62444, prev: 60000, status: 'APPROVED', by: 'สภามหาวิทยาลัย', at: '18 มี.ค. 2568' },
  { fac: 'คณะแพทยศาสตร์', prog: 'วิทยาศาสตร์สุขภาพ (นานาชาติ)', lvl: 'ปริญญาเอก', st: 'ภาคปกติ · ต่างชาติ', rate: 100000, prev: 100000, status: 'APPROVED', by: 'สภามหาวิทยาลัย', at: '18 มี.ค. 2568' },
  { fac: 'คณะนิติศาสตร์', prog: 'นิติศาสตรบัณฑิต', lvl: 'ปริญญาตรี', st: 'ภาคปกติ · ไทย', rate: 30000, prev: 28000, status: 'APPROVED', by: 'สภามหาวิทยาลัย', at: '18 มี.ค. 2568' },
  { fac: 'คณะพยาบาลศาสตร์', prog: 'ประกาศนียบัตรผู้ช่วยพยาบาล', lvl: 'ประกาศนียบัตร', st: 'ภาคปกติ · ไทย', rate: 45000, prev: 45000, status: 'DRAFT', by: null, at: null },
  { fac: 'คณะวิศวกรรมศาสตร์', prog: 'วิศวกรรมรถไฟความเร็วสูง', lvl: 'ปริญญาตรี', st: 'ภาคปกติ · ไทย', rate: 40000, prev: null, status: 'PENDING_APPROVAL', by: null, at: null },
  { fac: 'วิทยาลัยดุริยางคศิลป์', prog: 'ดุริยางคศาสตรบัณฑิต', lvl: 'ปริญญาตรี', st: 'ภาคปกติ · ไทย', rate: 38000, prev: 38000, status: 'REJECTED', by: 'คณะกรรมการการเงิน', at: '02 เม.ย. 2568' },
];

const FEE_STATUS = {
  APPROVED: { l: 'อนุมัติแล้ว', c: 'st-appr' },
  PENDING_APPROVAL: { l: 'รออนุมัติ', c: 'st-valid' },
  DRAFT: { l: 'ร่าง', c: 'st-draft' },
  REJECTED: { l: 'ไม่อนุมัติ', c: 'st-fail' },
};

/* fee_approval_log — ประวัติของรายการที่เลือก */
const FEE_LOG = [
  { t: '02 เม.ย. 2568 09:14', ic: '✅', h: '<b>สภามหาวิทยาลัย</b> อนุมัติอัตรา 36,000 บาท/ปี มีผลปีการศึกษา 2568' },
  { t: '18 มี.ค. 2568 16:40', ic: '📤', h: '<b>กองแผนงาน</b> เสนออนุมัติ — ปรับจาก 34,000 เป็น 36,000 บาท (+5.9%)' },
  { t: '18 มี.ค. 2568 16:12', ic: '📝', h: '<b>นางสาวสิริมา ศรีสุภาพ</b> แก้ไขร่าง แนบมติที่ประชุมคณะ ครั้งที่ 3/2568' },
  { t: '11 มี.ค. 2568 10:03', ic: '➕', h: '<b>คณะการบัญชีและการจัดการ</b> สร้างร่างอัตราใหม่สำหรับปีการศึกษา 2568' },
];

/* ---------- แหล่งข้อมูลต้นทาง + สถานะ sync (W9) ---------- */
const _allocTot = RAW.FACS.reduce((a, f) => a + (f.tfcOffice || 0), 0);
const SOURCES = [
  { name: 'งบประมาณรายจ่าย (ERP กองคลัง)', key: 'erp_budget', rows: 18432, amount: RAW.UNI.TC, at: '11 ก.ค. 2569 03:00', state: 'OK', mode: 'API รายวัน 03:00 น.', note: 'ครบทั้ง 20 หน่วยงาน' },
  { name: 'จำนวนนิสิตลงทะเบียน (ระบบทะเบียน)', key: 'reg_headcount', rows: RAW.UNI.Q, amount: null, at: '11 ก.ค. 2569 03:12', state: 'OK', mode: 'API รายวัน 03:00 น.', note: 'ตัดยอด ณ วันที่ 30 มิ.ย. 2569' },
  { name: 'ค่าธรรมเนียมการศึกษา (W8)', key: 'fee', rows: RAW.PROGS.length, amount: RAW.UNI.own, at: '02 เม.ย. 2568 09:14', state: 'PARTIAL', mode: 'กรอกในระบบ', note: '4 หลักสูตรยังไม่มีอัตราที่อนุมัติ' },
  { name: 'ค่าเสื่อมราคาครุภัณฑ์ (ระบบสินทรัพย์)', key: 'dep_equip', rows: 9841, amount: RAW.UNI.dep, at: '11 ก.ค. 2569 03:20', state: 'OK', mode: 'API รายเดือน', note: 'เฉพาะครุภัณฑ์' },
  { name: 'ค่าเสื่อมราคาอาคาร (ระบบสินทรัพย์)', key: 'dep_building', rows: 0, amount: 0, at: null, state: 'MISSING', mode: 'ยังไม่เชื่อมต่อ', note: 'ยังไม่มีข้อมูล — กระทบ TFC และ Q* ทั้งระบบ' },
  { name: 'ผังบัญชี 4 ระดับ (Master)', key: 'coa', rows: 412, amount: null, at: '20 พ.ค. 2569 11:47', state: 'OK', mode: 'นำเข้า Excel', note: 'สอดคล้องกับกติกาใน W14' },
];

const SRC_STATE = {
  OK: { l: 'ครบถ้วน', c: 'st-appr' },
  PARTIAL: { l: 'ไม่ครบ', c: 'st-valid' },
  MISSING: { l: 'ยังไม่มีข้อมูล', c: 'st-fail' },
};

/* บล็อก Validation ก่อนสั่งคำนวณ — SA §9.1 ข้อ 5 */
const VALIDATIONS = [
  { sev: 'block', title: 'คณะที่ยังไม่มีค่าเสื่อมราคาอาคาร', n: 20, unit: 'คณะ/วิทยาลัย', impact: `TFC ต่ำกว่าจริงทั้งระบบ · ส่วนเกิน ${_surTxt} สูงเกินจริง`, owner: 'กองคลัง — งานบริหารสินทรัพย์', go: 'W13-exceptions.html' },
  { sev: 'block', title: 'หลักสูตรที่ยังไม่มีค่าธรรมเนียมที่อนุมัติ', n: 4, unit: 'หลักสูตร', impact: 'TR รายหลักสูตรคำนวณไม่ได้ · ถูกกันออกจากยอดรวม', owner: 'กองแผนงาน', go: 'W8-tuition.html' },
  { sev: 'warn', title: 'รายการต้นทุนที่ยังไม่จำแนก TFC/TVC', n: 2, unit: 'คีย์บัญชี · 1.6 ลบ.', impact: 'ถูกพักไว้ที่หน่วยงาน ไม่ปันลงหลักสูตร', owner: 'กองคลัง', go: 'W14-account-rules.html' },
  { sev: 'warn', title: 'หลักสูตรที่มีนิสิต Q = 0', n: 3, unit: 'หลักสูตร', impact: 'หาร Q ไม่ได้ · R และ AVC เป็น null', owner: 'กองทะเบียน', go: 'W13-exceptions.html' },
  { sev: 'info', title: 'หลักสูตรที่มีนิสิตน้อยกว่า 30 คน', n: 41, unit: 'หลักสูตร', impact: 'ต้นทุน/หัวสูงผิดปกติ · กันออกจากกราฟแต่ยังอยู่ในยอดรวม', owner: '—', go: 'W15-settings.html' },
];

/* ---------- allocation_run (W11) ----------
   ยอดต้นทุนของแต่ละ run อ้างจาก RAW เพื่อให้ตรงกับชุดข้อมูลที่โหลดอยู่
   #1041 ใช้ฐาน BUDGET จึงสูงกว่า ACTUAL · #1039 เป็นปีงบ 2567 จึงต่ำกว่า */
const RUNS = [
  { id: 1042, year: 2568, basis: 'ACTUAL', rule: 'v3', scope: 'ทั้งมหาวิทยาลัย', state: 'APPROVED', by: 'นางสาวสิริมา ศรีสุภาพ', at: '11 ก.ค. 2569 14:32', appr: 'ผศ.ดร.ปิยภัทร บุษบาบดินทร์', dur: '4 น. 12 วิ.', tc: RAW.UNI.TC, diff: 0, exc: 8 },
  { id: 1041, year: 2568, basis: 'BUDGET', rule: 'v3', scope: 'ทั้งมหาวิทยาลัย', state: 'CALCULATED', by: 'นางสาวสิริมา ศรีสุภาพ', at: '11 ก.ค. 2569 11:08', appr: null, dur: '4 น. 05 วิ.', tc: RAW.UNI.TC * 1.0357, diff: 0, exc: 8 },
  { id: 1040, year: 2568, basis: 'ACTUAL', rule: 'v2', scope: 'ทั้งมหาวิทยาลัย', state: 'FAILED', by: 'นายอัครินทร์ บุพผา', at: '09 ก.ค. 2569 22:41', appr: null, dur: '3 น. 51 วิ.', tc: RAW.UNI.TC - 6117.34, diff: 6117.34, exc: 14 },
  { id: 1039, year: 2567, basis: 'ACTUAL', rule: 'v2', scope: 'ทั้งมหาวิทยาลัย', state: 'APPROVED', by: 'นางสาวสิริมา ศรีสุภาพ', at: '14 ส.ค. 2568 09:20', appr: 'ผศ.ดร.ปิยภัทร บุษบาบดินทร์', dur: '3 น. 44 วิ.', tc: RAW.UNI.TC * 0.9475, diff: 0, exc: 5 },
];

const RUN_STATE = {
  DRAFT: { l: 'ร่าง', c: 'st-draft' },
  RUNNING: { l: 'กำลังคำนวณ', c: 'st-run' },
  CALCULATED: { l: 'คำนวณเสร็จ', c: 'st-calc' },
  VALIDATED: { l: 'ตรวจยอดผ่าน', c: 'st-valid' },
  APPROVED: { l: 'อนุมัติแล้ว', c: 'st-appr' },
  FAILED: { l: 'ไม่ผ่าน', c: 'st-fail' },
};
const RUN_FLOW = ['DRAFT', 'RUNNING', 'CALCULATED', 'VALIDATED', 'APPROVED'];

const RUN_LOG = [
  { t: '11 ก.ค. 2569 14:32', ic: '✅', h: '<b>ผศ.ดร.ปิยภัทร บุษบาบดินทร์</b> อนุมัติรอบคำนวณ — ผลชุดนี้กลายเป็นตัวเลขอ้างอิงของปีงบ 2568' },
  { t: '11 ก.ค. 2569 14:05', ic: '🧾', h: 'ตรวจยอดกลับต้นทางผ่าน — ส่วนต่าง <b>0.00 บาท</b> (เกณฑ์ยอมรับ 0.00)' },
  { t: '11 ก.ค. 2569 14:01', ic: '⚙️', h: 'คำนวณเสร็จ 230 หลักสูตร × 2 ฐานรายได้ × 3 ระดับ ใช้เวลา 4 นาที 12 วินาที' },
  { t: '11 ก.ค. 2569 13:57', ic: '🚩', h: 'พบรายการค้างตรวจ <b>8 รายการ</b> มูลค่ารวม 9.4 ลบ. (0.39% ของต้นทุนรวม) — บันทึกไว้ ไม่ปิดกั้นการคำนวณ' },
  { t: '11 ก.ค. 2569 13:56', ic: '▶️', h: '<b>นางสาวสิริมา ศรีสุภาพ</b> สั่งเริ่มคำนวณ — ล็อกกติกาผังบัญชี v3 · ฐานต้นทุน ACTUAL' },
];

/* ---------- reconciliation (W12) ---------- */
/* ยอดที่ปันส่วนยึดจากผลรวม tfcOffice รายคณะ เพื่อให้การ์ดบนกับตารางรายคณะใน W12 ตรงกันเสมอ
   ส่วน DIRECT คือส่วนที่เหลือของต้นทุนรวม — สูตรนี้จึงถูกต้องกับทั้งข้อมูลจริงและชุดตัวอย่าง */
const RECON_METHODS = [
  { l: 'ผูกหลักสูตรโดยตรง (DIRECT)', v: RAW.UNI.TC - _allocTot, c: '#0ca678', alloc: false, note: 'ต้นทุนที่ระบุหลักสูตรได้จากเอกสารต้นทาง' },
  { l: 'ตามการใช้จริง (ACTUAL_USAGE)', v: _allocTot * 0.086, c: '#6d4cff', alloc: true, note: 'มีมิเตอร์/ทะเบียนการใช้แยก เช่น ค่าสาธารณูปโภค' },
  { l: 'ตามจำนวนนิสิต (STUDENT_HEADCOUNT)', v: _allocTot * 0.871, c: '#f59f00', alloc: true, note: 'ตัวขับหลักของต้นทุนสำนักงานเลขานุการ' },
  { l: 'ตามสัดส่วนหลักสูตร (PROGRAM_SHARE)', v: _allocTot * 0.043, c: '#e64980', alloc: true, note: 'ประมาณการ — หลักสูตรเล็กรับภาระสูงผิดปกติ ต้องระวังการตีความ' },
];

/* ---------- exception queue (W13) ---------- */
const EXCEPTIONS = [
  { flag: 'MISSING_SOURCE', label: 'ไม่มีข้อมูลต้นทาง', cls: 'flag-unc', item: 'ค่าเสื่อมราคาอาคาร — ทั้ง 20 หน่วยงาน', org: 'ทั้งมหาวิทยาลัย', amount: null, owner: 'กองคลัง — งานบริหารสินทรัพย์', since: '11 ก.ค. 2569', state: 'OPEN', note: `ยังไม่เชื่อมต่อระบบสินทรัพย์ส่วนอาคาร · TFC และ TC ต่ำกว่าจริง ส่วนเกิน ${_surTxt} จึงสูงเกินจริง และ Q* ทุกระดับต่ำกว่าที่ควรเป็น` },
  { flag: 'UNCLASSIFIED', label: 'ยังไม่จำแนก', cls: 'flag-unc', item: '2·2·400·40010 ค่าจดลิขสิทธิ์ / ค่าฐานข้อมูล', org: 'สำนักวิทยบริการ', amount: 1120400, owner: 'กองคลัง', since: '11 ก.ค. 2569', state: 'OPEN', note: 'รอกองคลังยืนยันว่าตีเป็น TFC หรือ TVC — ระหว่างนี้พักไว้ที่หน่วยงาน ไม่ปันลงหลักสูตร' },
  { flag: 'UNCLASSIFIED', label: 'ยังไม่จำแนก', cls: 'flag-unc', item: '2·4·800·80001 เงินอุดหนุนทั่วไป', org: 'กองแผนงาน', amount: 482300, owner: 'กองคลัง', since: '11 ก.ค. 2569', state: 'IN_PROGRESS', note: 'มติที่ประชุมให้ตีเป็น FIXED ตั้งแต่ปี 2569 — ปี 2568 ยังค้าง' },
  { flag: 'MISSING_DRIVER', label: 'ไม่มีตัวขับ', cls: 'flag-drv', item: 'ค่าสาธารณูปโภค — อาคารเรียนรวม RN', org: 'คณะมนุษยศาสตร์ฯ', amount: 214800, owner: 'กองอาคารสถานที่', since: '11 ก.ค. 2569', state: 'OPEN', note: 'กติกาสั่งปันตามการใช้จริง แต่ไม่มีเลขมิเตอร์ของอาคารนี้' },
  { flag: 'MISSING_DRIVER', label: 'ไม่มีตัวขับ', cls: 'flag-drv', item: 'ค่าวัสดุคลินิก — โรงพยาบาลสุทธาเวช', org: 'คณะแพทยศาสตร์', amount: 91500, owner: 'คณะแพทยศาสตร์', since: '11 ก.ค. 2569', state: 'OPEN', note: 'ไม่มีทะเบียนการใช้แยกหลักสูตร จึงตกไปใช้ค่าเริ่มต้น STUDENT_HEADCOUNT' },
  { flag: 'NO_FEE', label: 'ไม่มีค่าธรรมเนียม', cls: 'flag-fee', item: 'ชีววิทยา (ปริญญาโท) · เคมี (ปริญญาโท) และอีก 2 หลักสูตร', org: 'คณะวิทยาศาสตร์ · คณะพยาบาลศาสตร์', amount: null, owner: 'กองแผนงาน', since: '02 เม.ย. 2568', state: 'IN_PROGRESS', note: 'อัตรายังอยู่ที่สถานะร่าง/รออนุมัติ — TR รายหลักสูตรคำนวณไม่ได้' },
  { flag: 'Q_ZERO', label: 'นิสิต Q = 0', cls: 'flag-q0', item: 'วิศวกรรมปฏิบัติ (ต่อเนื่อง) และอีก 2 หลักสูตร', org: 'คณะวิศวกรรมศาสตร์', amount: 3410200, owner: 'กองทะเบียน', since: '11 ก.ค. 2569', state: 'OPEN', note: 'หลักสูตรเปิดแต่ยังไม่มีนิสิตลงทะเบียน — R และ AVC เป็น null คำนวณ Q* ไม่ได้' },
  { flag: 'ESTIMATED', label: 'ประมาณการ', cls: 'flag-drv', item: 'ต้นทุนสำนักงานเลขานุการที่ปันด้วย PROGRAM_SHARE', org: '14 คณะ', amount: 4100000, owner: 'กองแผนงาน', since: '11 ก.ค. 2569', state: 'ACCEPTED', note: 'ยอมรับเป็นวิธีสำรอง — ทำให้หลักสูตรที่มีนิสิตน้อยมี AVC สูงผิดปกติ ต้องกำกับทุกครั้งที่นำเสนอ' },
];

const EXC_STATE = {
  OPEN: { l: 'ยังไม่แก้', c: 'st-fail' },
  IN_PROGRESS: { l: 'กำลังตาม', c: 'st-valid' },
  ACCEPTED: { l: 'ยอมรับแล้ว', c: 'st-draft' },
  RESOLVED: { l: 'แก้แล้ว', c: 'st-appr' },
};

/* ---------- account_behavior_rule (W14) ---------- */
const ACCOUNTS = [
  { key: '1 · 1 · 100 · 10001', name: 'เงินเดือนข้าราชการ', org: null, amount: 612400000, rules: [
    { from: 2500, to: null, beh: 'FIXED', f: 1, v: 0, m: 'STUDENT_HEADCOUNT', note: 'เงินเดือนไม่แปรตามจำนวนนิสิต' } ] },
  { key: '1 · 1 · 210 · 21001', name: 'ค่าจ้างประจำ', org: null, amount: 87200000, rules: [
    { from: 2500, to: null, beh: 'FIXED', f: 1, v: 0, m: 'STUDENT_HEADCOUNT', note: '' } ] },
  { key: '2 · 2 · 410 · 41001', name: 'ค่าสาธารณูปโภค', org: null, amount: 96600000, rules: [
    { from: 2500, to: null, beh: 'VARIABLE', f: 0, v: 1, m: 'ACTUAL_USAGE', note: 'มีมิเตอร์แยกอาคาร จึงปันตามการใช้จริง' } ] },
  { key: '2 · 4 · 800 · 80001', name: 'เงินอุดหนุนทั่วไป', org: null, amount: 482300, rules: [
    { from: 2500, to: 2568, beh: 'UNCLASSIFIED', f: 0, v: 0, m: 'PROGRAM_SHARE', note: 'ยังไม่เคยตีความ — ติดธงรอตามแก้' },
    { from: 2569, to: 2569, beh: 'FIXED', f: 1, v: 0, m: 'STUDENT_HEADCOUNT', note: 'มติที่ประชุม: ปี 2569 ตีเป็นต้นทุนคงที่' },
    { from: 2570, to: 2570, beh: 'VARIABLE', f: 0, v: 1, m: 'STUDENT_HEADCOUNT', note: 'ปี 2570 เปลี่ยนเป็นผันแปรตามนิสิต' },
    { from: 2571, to: null, beh: 'MIXED', f: 0.5, v: 0.5, m: 'STUDENT_HEADCOUNT', note: 'ปี 2571 เป็นต้นไป แบ่งคนละครึ่ง' } ] },
  { key: '3 · 4 · 800 · 80001', name: 'เงินอุดหนุนโครงการวิจัย', org: null, amount: 41800000, rules: [
    { from: 2500, to: null, beh: 'FIXED', f: 1, v: 0, m: 'PROGRAM_SHARE', note: 'รหัสหมวดเดียวกับด้านบน แต่คนละแผนงาน จึงเป็นคนละประเภท — เหตุผลที่ต้องใช้คีย์ผสม 4 ระดับ' } ] },
  { key: '2 · 2 · 500 · 50001', name: 'ค่าวัสดุการศึกษา', org: null, amount: 148900000, rules: [
    { from: 2500, to: null, beh: 'MIXED', f: 0.35, v: 0.65, m: 'STUDENT_HEADCOUNT', note: 'ส่วนคงที่คือวัสดุห้องปฏิบัติการพื้นฐาน' } ] },
  { key: '2 · 2 · 500 · 50001', name: 'ค่าวัสดุการศึกษา (คณะแพทยศาสตร์)', org: 'คณะแพทยศาสตร์', amount: 63200000, rules: [
    { from: 2500, to: null, beh: 'MIXED', f: 0.15, v: 0.85, m: 'ACTUAL_USAGE', note: 'ตั้งเจาะจงคณะ — วัสดุคลินิกแปรตามนิสิตมากกว่าคณะอื่น (กติกาเจาะจงหน่วยงานมาก่อนกติกากลาง)' } ] },
  { key: '2 · 2 · 400 · 40010', name: 'ค่าจดลิขสิทธิ์ / ค่าฐานข้อมูล', org: null, amount: 1120400, rules: [
    { from: 2500, to: null, beh: 'UNCLASSIFIED', f: 0, v: 0, m: 'PROGRAM_SHARE', note: 'รอกองคลังยืนยันวิธีตีความ' } ] },
  { key: '2 · 2 · 600 · 60001', name: 'ค่าครุภัณฑ์การศึกษา', org: null, amount: 58700000, rules: [
    { from: 2500, to: null, beh: 'FIXED', f: 1, v: 0, m: 'PROGRAM_SHARE', note: '' } ] },
  { key: '— · — · — · DEP', name: 'ค่าเสื่อมราคา (อาคาร / ครุภัณฑ์)', org: null, amount: 302528496, rules: [
    { from: 2500, to: null, beh: 'FIXED', f: 1, v: 0, m: 'PROGRAM_SHARE', note: 'ไม่มีรหัสผังบัญชี จึงกำหนดผ่านค่าตั้ง depreciation_behavior ใน W15 · ปัจจุบันมีเฉพาะส่วนครุภัณฑ์' } ] },
];

const BEH = {
  FIXED: { l: 'คงที่', c: 'chip-n' },
  VARIABLE: { l: 'ผันแปร', c: 'chip-o' },
  MIXED: { l: 'แบ่งสัดส่วน', c: 'chip-g' },
  UNCLASSIFIED: { l: 'ยังไม่จำแนก', c: 'chip-r' },
};
const METHOD = {
  DIRECT: 'ผูกโดยตรง',
  ACTUAL_USAGE: 'ตามการใช้จริง',
  STUDENT_HEADCOUNT: 'ตามจำนวนนิสิต',
  PROGRAM_SHARE: 'ตามสัดส่วนหลักสูตร',
};

/* ---------- system_setting_def + system_setting (W15) ---------- */
const SETTINGS = [
  { key: 'qstar_primary_method', grp: 'calculation', name: 'วิธีคำนวณ Q* ระดับคณะ / มหาวิทยาลัย',
    desc: 'sum_of_programs = รวม Q* รายหลักสูตร (เข้มงวด ชดเชยข้ามหลักสูตรไม่ได้) · pooled = คำนวณจากยอดรวมครั้งเดียว · ระบบเก็บผลทั้งสองวิธีเสมอ ค่านี้เลือกว่าค่าไหนเป็นตัวหลักในรายงาน',
    type: 'enum', opts: ['sum_of_programs', 'pooled'], def: 'sum_of_programs', cur: null, affects: true,
    impact: {
      sum_of_programs: 'Q* มหาวิทยาลัย = <b>42,203 คน</b> · เข้มงวดกว่าเพราะแต่ละหลักสูตรต้องคุ้มต้นทุนคงที่ของตัวเอง',
      pooled: 'Q* มหาวิทยาลัย = <b>47,644 คน</b> · ยอมให้หลักสูตรที่กำไรอุ้มหลักสูตรที่ขาดทุน — <b>ต่างจากอีกวิธี 5,441 คน</b>',
    } },
  { key: 'cm_le_zero_policy', grp: 'calculation', name: 'เมื่อ CM ≤ 0 (ต้นทุนผันแปร/หัว สูงกว่ารายได้/หัว)',
    desc: 'full_cost_recovery = รายงานเป้าหมายขั้นต่ำ Q* = TC ÷ R (สูตรที่ 7) · not_computable = รายงานว่าไม่มีจุดคุ้มทุน ณ ระดับราคาปัจจุบัน',
    type: 'enum', opts: ['full_cost_recovery', 'not_computable'], def: 'full_cost_recovery', cur: null, affects: true,
    impact: {
      full_cost_recovery: '<b>18 หลักสูตร</b> จะแสดงเป้าหมายขั้นต่ำเป็นตัวเลข เช่น เคมี (ป.โท) = <b>24 คน</b> — ผู้ใช้อาจเข้าใจผิดว่าเป็นจุดคุ้มทุนจริง',
      not_computable: '<b>18 หลักสูตร</b> จะแสดงว่า "ไม่มีจุดคุ้มทุน" ตรงไปตรงมา — ต้องแก้ที่ค่าธรรมเนียมหรือต้นทุนผันแปร ไม่ใช่เพิ่มนิสิต',
    } },
  { key: 'qstar_rounding', grp: 'calculation', name: 'การปัดเศษ Q*',
    desc: 'ceil = ปัดขึ้นเสมอ (รับนิสิต 238.4 คนไม่ได้ ต้องรับ 239) · round = ปัดตามหลักคณิตศาสตร์ ตรงกับ prototype เดิม',
    type: 'enum', opts: ['ceil', 'round'], def: 'ceil', cur: null, affects: true,
    impact: {
      ceil: 'ปลอดภัยกว่าในเชิงวางแผนรับนิสิต — Q* จะไม่ต่ำกว่าความเป็นจริง',
      round: 'ตรงกับตัวเลขที่ prototype เคยแสดง แต่ <b>อาจต่ำกว่าจุดคุ้มทุนจริงได้ถึง 1 คน</b> ในทุกหลักสูตร',
    } },
  { key: 'default_revenue_mode', grp: 'calculation', name: 'ฐานรายได้ตั้งต้นของรายงาน',
    desc: 'ระบบคำนวณทั้งสองฐานเสมอ ค่านี้กำหนดว่าเปิดหน้าจอมาแล้วเห็นฐานไหนก่อน',
    type: 'enum', opts: ['with_government', 'without_government'], def: 'with_government', cur: null, affects: false,
    impact: {
      with_government: `เห็นภาพตามงบที่ได้รับจริงทั้งหมด — ส่วนเกิน <b>${_surTxt}</b>`,
      without_government: 'เห็นความสามารถพึ่งพาตนเอง — ตัวเลขจะติดลบมาก อาจตกใจถ้าเปิดมาเจอทันที',
    } },
  { key: 'default_allocation_method', grp: 'allocation', name: 'วิธีปันส่วนเมื่อกติกาไม่ได้ระบุ',
    desc: 'ใช้เมื่อกติกาใน W14 ไม่ได้กำหนดวิธีปันส่วนไว้',
    type: 'enum', opts: ['STUDENT_HEADCOUNT', 'PROGRAM_SHARE', 'ACTUAL_USAGE'], def: 'STUDENT_HEADCOUNT', cur: null, affects: true,
    impact: {
      STUDENT_HEADCOUNT: 'ปันตามจำนวนนิสิต — ตรงไปตรงมาและอธิบายง่ายที่สุด',
      PROGRAM_SHARE: 'ปันเท่าๆ กันรายหลักสูตร — <b>หลักสูตรเล็กจะรับภาระสูงผิดปกติ</b> (ต้นเหตุที่ทำให้ prototype มี AVC สูงมากในหลักสูตรที่มีนิสิตหลักหน่วย)',
      ACTUAL_USAGE: 'แม่นที่สุดแต่ต้องมีข้อมูลการใช้จริงครบทุกหลักสูตร ไม่งั้นจะได้ธง MISSING_DRIVER',
    } },
  { key: 'depreciation_behavior', grp: 'allocation', name: 'ประเภทต้นทุนของค่าเสื่อมราคา',
    desc: 'ค่าเสื่อมราคาไม่มีรหัสผังบัญชี จึงหากติกาปกติไม่เจอ ต้องกำหนดแยก · ปี 2568 ค่าเสื่อมราคา = 302.5 ลบ. (13% ของ TFC)',
    type: 'enum', opts: ['FIXED', 'VARIABLE'], def: 'FIXED', cur: null, affects: true,
    impact: {
      FIXED: 'ค่าเสื่อม 302.5 ลบ. อยู่ใน TFC → สัดส่วน TFC : TVC = <b>61.6 : 38.4</b>',
      VARIABLE: 'ค่าเสื่อม 302.5 ลบ. ย้ายไป TVC → TFC : TVC = <b>49.1 : 50.9</b> และ AVC เพิ่มขึ้นราว 6,200 บ./คน ทำให้ Q* ทุกหลักสูตรสูงขึ้น',
    } },
  { key: 'amount_basis', grp: 'allocation', name: 'ฐานจำนวนเงินที่ใช้เป็นต้นทุนหลัก',
    desc: 'ACTUAL = ยอดใช้จ่ายจริง · BUDGET = ยอดงบประมาณที่ได้รับจัดสรร — ยังรอมติผู้บริหาร',
    type: 'enum', opts: ['ACTUAL', 'BUDGET'], def: 'ACTUAL', cur: null, affects: true,
    impact: {
      ACTUAL: `ต้นทุนรวม <b>${_mb(RAW.UNI.TC)} ลบ.</b> — สะท้อนสิ่งที่เกิดขึ้นจริง เหมาะกับการรายงานย้อนหลัง`,
      BUDGET: `ต้นทุนรวม <b>${_mb(RAW.UNI.TC * 1.0357)} ลบ.</b> — สะท้อนกรอบที่ได้รับจัดสรร เหมาะกับการวางแผนปีถัดไป · ส่วนเกินจะกลายเป็น <b>${_mb(RAW.UNI.TR - RAW.UNI.TC * 1.0357)} ลบ.</b>`,
    } },
  { key: 'reconciliation_tolerance', grp: 'allocation', name: 'ส่วนต่างที่ยอมรับได้ในการตรวจยอด (บาท)',
    desc: 'ยอดปันส่วนรวมต่างจากยอดต้นทางเกินค่านี้ → รอบคำนวณจะเป็น FAILED · ตั้ง 0 = ต้องตรงพอดี',
    type: 'number', def: '0.00', cur: null, affects: false,
    impact: { '*': 'ตั้ง 0 บังคับให้ยอดตรงพอดีทุกบาท — ทำได้เพราะเครื่องปันส่วนใช้ largest-remainder แล้ว ถ้าตั้งหลวมกว่านี้จะกลบข้อผิดพลาดจริง' } },
  { key: 'outlier_min_q', grp: 'presentation', name: 'จำนวนนิสิตขั้นต่ำที่นำขึ้นกราฟ',
    desc: 'หน่วยที่มีนิสิตน้อยกว่านี้จะมีต้นทุน/หัวสูงจนบิดเบือนแกนกราฟ จึงกันออกจากกราฟ แต่ยังอยู่ในตารางและยอดรวมเสมอ',
    type: 'number', def: '30', cur: null, affects: false,
    impact: { '*': 'ที่ค่า 30 คน จะกัน <b>สถาบันวิจัยวลัยรุกขเวช</b> (3 คน · ต้นทุน/หัว 7.8 ลบ.) ออกจากกราฟ — ต้องมีหมายเหตุใต้กราฟเสมอว่ากันอะไรออก' } },
  { key: 'non_academic_unit_in_total', grp: 'presentation', name: 'นับหน่วยที่ไม่ผลิตบัณฑิตในยอดรวมหรือไม่',
    desc: 'หน่วยที่ is_academic = false (เช่น สถาบันวิจัย) มีต้นทุนแต่แทบไม่มีนิสิต',
    type: 'enum', opts: ['true', 'false'], def: 'true', cur: null, affects: true,
    impact: {
      true: `รวมทุกหน่วย — ส่วนเกินมหาวิทยาลัย <b>${_surTxt}</b>`,
      false: 'ตัดสถาบันวิจัยออกจากยอดรวม — ส่วนเกินเป็น <b>+54.0 ลบ.</b> และ ATC เฉลี่ยลดลง แต่ต้องรายงานหน่วยที่ตัดออกแยกต่างหาก',
    } },
];

const GRP_LABEL = {
  calculation: 'การคำนวณ',
  allocation: 'การปันส่วนต้นทุน',
  presentation: 'การแสดงผล',
};

const SETTING_LOG = [
  { t: 'ปีการศึกษา 2568', ic: '🎛', h: '<b>ยังไม่มีมติ</b> — ทุกค่ายังใช้ค่าเริ่มต้นจากนิยามระบบ · รอมติที่ประชุมกำหนด <code>cm_le_zero_policy</code>, <code>qstar_primary_method</code>, <code>qstar_rounding</code> และ <code>amount_basis</code>' },
  { t: 'ปีการศึกษา 2567', ic: '📌', h: '<code>qstar_rounding</code> = <b>round</b> (ตามที่ prototype เดิมคำนวณ) · อนุมัติโดย กองแผนงาน 14 ส.ค. 2568' },
  { t: 'ปีการศึกษา 2567', ic: '📌', h: '<code>outlier_min_q</code> = <b>50</b> → เปลี่ยนเป็น <b>30</b> ในปี 2568 เพื่อให้หลักสูตรบัณฑิตศึกษาขนาดเล็กขึ้นกราฟได้' },
  { t: 'ปีการศึกษา 2566', ic: '📌', h: '<code>depreciation_behavior</code> = <b>FIXED</b> — ใช้ต่อเนื่องมาตั้งแต่ปีแรกที่มีระบบ' },
];

/* ---------- app_role + app_user (W0, W18) ----------
   4 บทบาทตรงกับ CHECK constraint ใน db/01_schema.sql:
   role_name IN ('admin','budget_office','faculty_officer','viewer')
   ขอบเขตของผู้ใช้กำหนดด้วย app_user.org_unit_id (NULL = เห็นทุกหน่วยงาน) */
const ROLES = [
  { k: 'viewer', l: 'ผู้ดูข้อมูล', d: 'อธิการบดี · รองอธิการบดี · คณบดี · กรรมการ — ดูอย่างเดียว ไม่แก้อะไรได้',
    scoped: false, n: 42 },
  { k: 'faculty_officer', l: 'เจ้าหน้าที่คณะ', d: 'เห็นเฉพาะหน่วยงานที่ผูกไว้ใน org_unit_id · เสนอข้อมูลของคณะตัวเองได้',
    scoped: true, n: 31 },
  { k: 'budget_office', l: 'กองแผนงาน', d: 'แก้ข้อมูลหลักและเสนออนุมัติได้ทั้งมหาวิทยาลัย · สั่งสร้างรอบคำนวณได้',
    scoped: false, n: 6 },
  { k: 'admin', l: 'ผู้ดูแลระบบ', d: 'อนุมัติทุกอย่าง · ตั้งค่าระบบ · จัดการผู้ใช้และสิทธิ์ · ดู audit log ทั้งหมด',
    scoped: false, n: 3 },
];

/* y = ทำได้ · p = ได้เฉพาะขอบเขตที่ผูกไว้ · n = ไม่เห็นเมนูเลย
   ลำดับค่าใน v ตรงกับลำดับใน ROLES */
const RBAC = [
  { w: 'W1–W5', t: 'หน้าวิเคราะห์ทั้งหมด', v: ['y', 'p', 'y', 'y'] },
  { w: 'W6–W7', t: 'จำลองแผน (Scenario)', v: ['y', 'p', 'y', 'y'] },
  { w: 'W10', t: 'สูตร & หลักวิชาการ', v: ['y', 'y', 'y', 'y'] },
  { w: 'W12–W13', t: 'ผลตรวจยอด · รายการค้างตรวจ', v: ['y', 'p', 'y', 'y'] },
  { w: 'W8', a: 'แก้/เสนอ', t: 'ค่าธรรมเนียม — แก้ / เสนอ', v: ['n', 'p', 'y', 'y'] },
  { w: 'W8', a: 'อนุมัติ', t: 'ค่าธรรมเนียม — อนุมัติ', v: ['n', 'n', 'n', 'y'] },
  { w: 'W9', t: 'นำเข้าข้อมูลต้นทาง', v: ['n', 'n', 'y', 'y'] },
  { w: 'W11', a: 'สร้าง', t: 'สร้างรอบคำนวณ', v: ['n', 'n', 'y', 'y'] },
  { w: 'W11', a: 'อนุมัติ', t: 'อนุมัติรอบคำนวณ', v: ['n', 'n', 'n', 'y'] },
  { w: 'W16', a: 'แก้/เสนอ', t: 'ทะเบียนหลักสูตร — แก้ / เสนอ', v: ['n', 'p', 'y', 'y'] },
  { w: 'W16', a: 'อนุมัติ', t: 'อนุมัติเปิด / ปิดหลักสูตร', v: ['n', 'n', 'n', 'y'] },
  { w: 'W17', t: 'ทะเบียนหน่วยงาน · งวด · ประเภทนิสิต', v: ['n', 'n', 'n', 'y'] },
  { w: 'W19', t: 'ผังบัญชี 4 ระดับ', v: ['n', 'n', 'y', 'y'] },
  { w: 'W14', t: 'กติกาผังบัญชี TFC/TVC', v: ['n', 'n', 'y', 'y'] },
  { w: 'W15', t: 'นโยบายการคำนวณ', v: ['n', 'n', 'n', 'y'] },
  { w: 'W18', t: 'ผู้ใช้และสิทธิ์', v: ['n', 'n', 'n', 'y'] },
];

/* app_user — ตัวอย่างผู้ใช้ในระบบ */
const USERS = [
  { name: 'ผศ.ดร.ปิยภัทร บุษบาบดินทร์', email: 'piyapat.b@msu.ac.th', role: 'admin', org: null, last: '06 ก.ย. 2569 08:41', active: true },
  { name: 'นางสาวสิริมา ศรีสุภาพ', email: 'sirima.s@msu.ac.th', role: 'budget_office', org: null, last: '05 ก.ย. 2569 16:20', active: true },
  { name: 'นายอัครินทร์ บุพผา', email: 'akkarin.b@msu.ac.th', role: 'budget_office', org: null, last: '05 ก.ย. 2569 14:02', active: true },
  { name: 'นางวราภรณ์ ทองใบ', email: 'waraporn.t@msu.ac.th', role: 'faculty_officer', org: 'คณะการบัญชีและการจัดการ', last: '04 ก.ย. 2569 11:15', active: true },
  { name: 'นายชนะชัย โพธิ์ศรี', email: 'chanachai.p@msu.ac.th', role: 'faculty_officer', org: 'คณะวิศวกรรมศาสตร์', last: '02 ก.ย. 2569 09:48', active: true },
  { name: 'นางสาวกัญญา แสงทอง', email: 'kanya.s@msu.ac.th', role: 'faculty_officer', org: 'คณะวิทยาศาสตร์', last: '28 ส.ค. 2569 13:30', active: true },
  { name: 'รศ.ดร.สมชาย ใจดี', email: 'somchai.j@msu.ac.th', role: 'viewer', org: null, last: '05 ก.ย. 2569 07:55', active: true },
  { name: 'นายวิทยา คงเจริญ', email: 'wittaya.k@msu.ac.th', role: 'faculty_officer', org: 'คณะแพทยศาสตร์', last: '14 ก.พ. 2569 10:02', active: false },
  { name: 'นางสาวปาริชาต ดวงแก้ว', email: 'parichat.d@msu.ac.th', role: 'admin', org: null, last: 'ยังไม่เคยเข้าใช้', active: true, invited: true },
];

const USER_LOG = [
  { t: '06 ก.ย. 2569 08:30', ic: '🔑', h: '<b>ผศ.ดร.ปิยภัทร บุษบาบดินทร์</b> เชิญ <b>นางสาวปาริชาต ดวงแก้ว</b> เข้าใช้ระบบ สิทธิ์ <code>admin</code>' },
  { t: '01 ก.ย. 2569 15:12', ic: '🔄', h: 'เปลี่ยนสิทธิ์ <b>นายอัครินทร์ บุพผา</b> จาก <code>faculty_officer</code> เป็น <code>budget_office</code> — ขอบเขตเปลี่ยนจากคณะเดียวเป็นทั้งมหาวิทยาลัย' },
  { t: '20 ส.ค. 2569 09:00', ic: '⏸', h: 'ระงับบัญชี <b>นายวิทยา คงเจริญ</b> — ไม่เข้าใช้เกิน 180 วัน (นโยบายความปลอดภัย)' },
  { t: '11 ก.ค. 2569 14:32', ic: '✅', h: '<b>ผศ.ดร.ปิยภัทร บุษบาบดินทร์</b> อนุมัติรอบคำนวณ #1042 — เป็นการใช้สิทธิ์อนุมัติที่ถูกบันทึกใน audit log' },
];

/* ---------- erp_account (W19) ----------
   คีย์ที่แท้จริงคือคีย์ผสม 4 ระดับ (พิสูจน์จากข้อมูลจริง — MAPPING.md หัวข้อ 2) */
const ERP_ACCOUNTS = [
  { plan: '1', bud: '1', exp: '100', sub: '10001', name: 'เงินเดือนข้าราชการ', from: '2500', to: null, amount: 612400000, ruleKey: '1 · 1 · 100 · 10001' },
  { plan: '1', bud: '1', exp: '210', sub: '21001', name: 'ค่าจ้างประจำ', from: '2500', to: null, amount: 87200000, ruleKey: '1 · 1 · 210 · 21001' },
  { plan: '1', bud: '1', exp: '220', sub: '22001', name: 'ค่าจ้างชั่วคราว', from: '2500', to: null, amount: 41300000, ruleKey: null },
  { plan: '2', bud: '2', exp: '410', sub: '41001', name: 'ค่าสาธารณูปโภค', from: '2500', to: null, amount: 96600000, ruleKey: '2 · 2 · 410 · 41001' },
  { plan: '2', bud: '2', exp: '500', sub: '50001', name: 'ค่าวัสดุการศึกษา', from: '2500', to: null, amount: 212100000, ruleKey: '2 · 2 · 500 · 50001' },
  { plan: '2', bud: '2', exp: '600', sub: '60001', name: 'ค่าครุภัณฑ์การศึกษา', from: '2500', to: null, amount: 58700000, ruleKey: '2 · 2 · 600 · 60001' },
  { plan: '2', bud: '2', exp: '400', sub: '40010', name: 'ค่าจดลิขสิทธิ์ / ค่าฐานข้อมูล', from: '2500', to: null, amount: 1120400, ruleKey: '2 · 2 · 400 · 40010' },
  { plan: '2', bud: '4', exp: '800', sub: '80001', name: 'เงินอุดหนุนทั่วไป', from: '2500', to: null, amount: 482300, ruleKey: '2 · 4 · 800 · 80001' },
  { plan: '3', bud: '4', exp: '800', sub: '80001', name: 'เงินอุดหนุนโครงการวิจัย', from: '2500', to: null, amount: 41800000, ruleKey: '3 · 4 · 800 · 80001',
    note: 'รหัสหมวดเดียวกับแถวบน แต่คนละแผนงาน จึงเป็นคนละบัญชี' },
  { plan: '2', bud: '2', exp: '400', sub: '40022', name: 'ค่าเช่าเครื่องมือแพทย์', from: '2569', to: null, amount: 0, ruleKey: null,
    note: 'บัญชีใหม่ปีงบ 2569 — ยังไม่มีกติกา TFC/TVC' },
  { plan: '2', bud: '2', exp: '300', sub: '30004', name: 'ค่าตอบแทนวิทยากรภายนอก (ยกเลิก)', from: '2500', to: '2567', amount: 0, ruleKey: null,
    note: 'ปิดใช้ตั้งแต่ปีงบ 2568 — เก็บไว้เพื่อให้รายงานปีเก่ายังอ่านได้' },
];

/* ==========================================================================
   ทะเบียนข้อมูลหลัก — W16 (หลักสูตร) และ W17 (หน่วยงาน · งวด · ประเภทนิสิต)
   โครงสร้างตรงกับ db/01_schema.sql: program · program_version · org_unit
   · org_unit_map · dim_period · student_type
   ========================================================================== */

/* ---------- program + program_version (W16) ----------
   ชื่อหลักสูตร คณะ ระดับ และ Q อ้างอิงของจริงจาก RAW.PROGS
   ส่วน curriculum_version · สถานะ · ผู้เสนอ เป็นตัวอย่างเพื่อให้เห็นวงจรชีวิตหลักสูตร */
const PROGRAM_REG = [
  { code: 'ACC-BBA-01', prog: 'บัญชีบัณฑิต', fac: 'คณะการบัญชีและการจัดการ', lvl: 'ปริญญาตรี',
    deg: 'บัญชีบัณฑิต', intl: false, state: 'ACTIVE',
    vers: [
      { v: '2560', from: '2560', to: '2564', note: 'รุ่นปรับปรุงตามเกณฑ์ มคอ.1 สาขาบัญชี' },
      { v: '2565', from: '2565', to: null, note: 'ปรับปรุงตามรอบ 5 ปี · เพิ่มรายวิชาการวิเคราะห์ข้อมูล' },
    ] },

  { code: 'LAW-LLB-01', prog: 'นิติศาสตรบัณฑิต', fac: 'คณะนิติศาสตร์', lvl: 'ปริญญาตรี',
    deg: 'นิติศาสตรบัณฑิต', intl: false, state: 'REVISING',
    vers: [
      { v: '2563', from: '2563', to: null, note: 'รุ่นที่ใช้อยู่' },
      { v: '2569', from: '2569', to: null, note: 'ร่างปรับปรุง — อยู่ระหว่างเสนอสภาวิชาการ', draft: true },
    ] },

  { code: 'MED-MD-01', prog: 'แพทยศาสตรบัณฑิต', fac: 'คณะแพทยศาสตร์', lvl: 'ปริญญาตรี',
    deg: 'แพทยศาสตรบัณฑิต (พ.บ.)', intl: false, state: 'ACTIVE',
    vers: [{ v: '2565', from: '2565', to: null, note: 'ผ่านการรับรองจากแพทยสภา' }] },

  { code: 'SCI-CHEM-BS', prog: 'เคมี', fac: 'คณะวิทยาศาสตร์', lvl: 'ปริญญาตรี',
    deg: 'วท.บ. เคมี', intl: false, state: 'ACTIVE',
    vers: [{ v: '2564', from: '2564', to: null, note: '' }] },

  { code: 'SCI-CHEM-MS', prog: 'เคมี', fac: 'คณะวิทยาศาสตร์', lvl: 'ปริญญาโท',
    deg: 'วท.ม. เคมี', intl: false, state: 'SUSPENDED',
    vers: [{ v: '2562', from: '2562', to: null, note: 'งดรับนิสิตปีการศึกษา 2569 — นิสิตคงเหลือ 1 คน' }] },

  { code: 'SCI-BIO-MS', prog: 'ชีววิทยา', fac: 'คณะวิทยาศาสตร์', lvl: 'ปริญญาโท',
    deg: 'วท.ม. ชีววิทยา', intl: false, state: 'ACTIVE',
    vers: [{ v: '2563', from: '2563', to: null, note: '' }] },

  { code: 'ENG-HSR-01', prog: 'วิศวกรรมรถไฟความเร็วสูง', fac: 'คณะวิศวกรรมศาสตร์', lvl: 'ปริญญาตรี',
    deg: 'วศ.บ. วิศวกรรมรถไฟความเร็วสูง', intl: false, state: 'ACTIVE',
    vers: [{ v: '2566', from: '2566', to: null, note: 'หลักสูตรเปิดใหม่ รับรุ่นแรกปีการศึกษา 2566' }] },

  { code: 'ENG-PRAC-01', prog: 'วิศวกรรมปฏิบัติ (ต่อเนื่อง)', fac: 'คณะวิศวกรรมศาสตร์', lvl: 'ปริญญาตรี',
    deg: 'วศ.บ. วิศวกรรมปฏิบัติ (ต่อเนื่อง)', intl: false, state: 'ACTIVE',
    vers: [{ v: '2565', from: '2565', to: null, note: '' }] },

  { code: 'MUS-BM-01', prog: 'ดุริยางคศาสตรบัณฑิต', fac: 'วิทยาลัยดุริยางคศิลป์', lvl: 'ปริญญาตรี',
    deg: 'ดุริยางคศาสตรบัณฑิต', intl: false, state: 'ACTIVE',
    vers: [{ v: '2564', from: '2564', to: null, note: '' }] },

  { code: 'VET-DVM-01', prog: 'สัตวแพทยศาสตรบัณฑิต', fac: 'คณะสัตวแพทยศาสตร์', lvl: 'ปริญญาตรี',
    deg: 'สัตวแพทยศาสตรบัณฑิต', intl: false, state: 'ACTIVE',
    vers: [{ v: '2565', from: '2565', to: null, note: '' }] },

  /* --- รายการที่ยังไม่เข้าสู่การคำนวณ --- */
  { code: 'SCI-AI-BS', prog: 'วิทยาการปัญญาประดิษฐ์', fac: 'คณะวิทยาศาสตร์', lvl: 'ปริญญาตรี',
    deg: 'วท.บ. วิทยาการปัญญาประดิษฐ์', intl: false, state: 'PENDING_APPROVAL',
    proposedQ: 60, by: 'คณะวิทยาศาสตร์', at: '14 ส.ค. 2569',
    vers: [{ v: '2570', from: '2570', to: null, note: 'เสนอเปิดใหม่ รับรุ่นแรกปีการศึกษา 2570', draft: true }] },

  { code: 'ACC-IB-INTL', prog: 'ธุรกิจดิจิทัลระหว่างประเทศ (นานาชาติ)', fac: 'คณะการบัญชีและการจัดการ',
    lvl: 'ปริญญาตรี', deg: 'บธ.บ. ธุรกิจดิจิทัลระหว่างประเทศ', intl: true, state: 'DRAFT',
    proposedQ: 40, by: 'คณะการบัญชีและการจัดการ', at: '02 ก.ย. 2569',
    vers: [{ v: '2570', from: '2570', to: null, note: 'ร่างข้อเสนอ ยังไม่ยื่นเข้าสภาวิชาการ', draft: true }] },

  { code: 'HUM-THAI-MA', prog: 'ภาษาไทยเพื่ออาชีพ', fac: 'คณะมนุษยศาสตร์และสังคมศาสตร์', lvl: 'ปริญญาโท',
    deg: 'ศศ.ม. ภาษาไทยเพื่ออาชีพ', intl: false, state: 'CLOSED',
    vers: [{ v: '2558', from: '2558', to: '2568', note: 'ปิดหลักสูตร — นิสิตคนสุดท้ายสำเร็จการศึกษาปี 2568' }] },
];

const PROG_STATE = {
  DRAFT:            { l: 'ร่างข้อเสนอ',  c: 'st-draft', calc: false, why: 'ยังไม่ยื่นเข้าสภาวิชาการ · ไม่เข้าสู่การคำนวณ' },
  PENDING_APPROVAL: { l: 'รออนุมัติ',    c: 'st-valid', calc: false, why: 'รอมติสภาวิชาการ/สภามหาวิทยาลัย · ไม่เข้าสู่การคำนวณ' },
  ACTIVE:           { l: 'เปิดสอน',      c: 'st-appr',  calc: true,  why: 'เข้าสู่การคำนวณจุดคุ้มทุนตามปกติ' },
  REVISING:         { l: 'กำลังปรับปรุง', c: 'st-run',   calc: true,  why: 'รุ่นที่ใช้อยู่ยังคำนวณตามปกติ · รุ่นใหม่มีผลเมื่อถึงปีที่กำหนด' },
  SUSPENDED:        { l: 'งดรับนิสิต',    c: 'st-valid', calc: true,  why: 'ยังมีนิสิตคงค้างและมีต้นทุน จึงยังต้องคำนวณ' },
  CLOSED:           { l: 'ปิดหลักสูตร',   c: 'st-fail',  calc: false, why: 'ไม่มีนิสิตและไม่มีต้นทุนแล้ว · เก็บไว้เป็นประวัติเทียบข้ามปี' },
};

/* วงจรชีวิตหลักสูตร — ใช้วาดไทม์ไลน์บนหน้าจอ */
const PROG_FLOW = [
  { k: 'DRAFT', l: 'ร่างข้อเสนอ', d: 'คณะกรอกข้อมูลหลักสูตรและประมาณการจำนวนรับ' },
  { k: 'PENDING_APPROVAL', l: 'เสนออนุมัติ', d: 'ผ่านสภาวิชาการ แล้วเข้าสภามหาวิทยาลัย' },
  { k: 'ACTIVE', l: 'เปิดสอน', d: 'ผูกค่าธรรมเนียม (W8) แล้วเข้าสู่การคำนวณ' },
  { k: 'REVISING', l: 'ปรับปรุงรอบ มคอ.', d: 'สร้างรุ่นใหม่ ไม่ทับรุ่นเดิม' },
  { k: 'CLOSED', l: 'ปิดหลักสูตร', d: 'ตั้ง valid_to · ตัวเลขปีเก่าไม่เปลี่ยน' },
];

const PROGRAM_LOG = [
  { t: '02 ก.ย. 2569 10:22', ic: '➕', h: '<b>คณะการบัญชีและการจัดการ</b> สร้างร่างหลักสูตร <b>ธุรกิจดิจิทัลระหว่างประเทศ (นานาชาติ)</b> ประมาณการรับ 40 คน/ปี' },
  { t: '14 ส.ค. 2569 15:40', ic: '📤', h: '<b>คณะวิทยาศาสตร์</b> เสนอเปิด <b>วิทยาการปัญญาประดิษฐ์</b> เข้าสภาวิชาการ — แนบผลวิเคราะห์จุดคุ้มทุนจาก W7' },
  { t: '20 ก.ค. 2569 09:15', ic: '🔄', h: '<b>คณะนิติศาสตร์</b> สร้างรุ่นปรับปรุง <code>2569</code> ของ <b>นิติศาสตรบัณฑิต</b> — รุ่น <code>2563</code> ยังมีผลจนกว่ารุ่นใหม่จะอนุมัติ' },
  { t: '11 ก.ค. 2569 11:03', ic: '⏸', h: '<b>คณะวิทยาศาสตร์</b> ตั้ง <b>เคมี (ปริญญาโท)</b> เป็นงดรับนิสิตปี 2569 — ยังคำนวณต่อเพราะมีนิสิตคงค้าง 1 คน' },
  { t: '30 มิ.ย. 2569 16:48', ic: '⏹', h: 'ปิดหลักสูตร <b>ภาษาไทยเพื่ออาชีพ (ปริญญาโท)</b> — ตั้ง <code>valid_to</code> = 2568 ตัวเลขปี 2566–2568 ไม่เปลี่ยนตาม' },
];

/* ---------- org_unit + org_unit_map (W17) ---------- */
const ORG_UNITS = [
  { code: 'MSU', name: 'มหาวิทยาลัยมหาสารคาม', level: 'UNIVERSITY', parent: null, academic: true, erp: 'MSU', from: '2500', status: 'APPROVED' },
  { code: 'ACC', name: 'คณะการบัญชีและการจัดการ', level: 'FACULTY', parent: 'MSU', academic: true, erp: '0301', from: '2500', status: 'APPROVED' },
  { code: 'ACC-UG', name: 'คณะการบัญชีและการจัดการ — ปริญญาตรี', level: 'EDUCATION_LEVEL', parent: 'ACC', academic: true, erp: '0301-1', from: '2500', status: 'APPROVED' },
  { code: 'ACC-GR', name: 'คณะการบัญชีและการจัดการ — บัณฑิตศึกษา', level: 'EDUCATION_LEVEL', parent: 'ACC', academic: true, erp: '0301-2', from: '2500', status: 'APPROVED' },
  { code: 'SCI', name: 'คณะวิทยาศาสตร์', level: 'FACULTY', parent: 'MSU', academic: true, erp: '0305', from: '2500', status: 'APPROVED' },
  { code: 'ENG', name: 'คณะวิศวกรรมศาสตร์', level: 'FACULTY', parent: 'MSU', academic: true, erp: '0312', from: '2500', status: 'APPROVED' },
  { code: 'MED', name: 'คณะแพทยศาสตร์', level: 'FACULTY', parent: 'MSU', academic: true, erp: '0318', from: '2500', status: 'APPROVED' },
  { code: 'RES-WRK', name: 'สถาบันวิจัยวลัยรุกขเวช', level: 'FACULTY', parent: 'MSU', academic: false, erp: '0330', from: '2500', status: 'APPROVED',
    note: 'is_academic = false — เป็น cost pool ที่ต้องปันส่วนออกทั้งหมด' },
  { code: 'SEC-OFF', name: 'สำนักงานเลขานุการคณะ (รวมทุกคณะ)', level: 'FACULTY', parent: 'MSU', academic: false, erp: 'หลายรหัส', from: '2500', status: 'APPROVED',
    note: 'is_academic = false — ต้นทุน 1,123.7 ลบ. ปันลงหลักสูตรทั้งหมด' },
  { code: 'DIG', name: 'วิทยาลัยนวัตกรรมดิจิทัล', level: 'FACULTY', parent: 'MSU', academic: true, erp: null, from: '2570', status: 'DRAFT',
    note: 'หน่วยงานตั้งใหม่ปี 2570 — ยังไม่ได้ผูกรหัส ERP จึงยังรับต้นทุนไม่ได้' },
];

const ORG_LEVEL_LABEL = {
  UNIVERSITY: 'มหาวิทยาลัย',
  FACULTY: 'คณะ / วิทยาลัย / สถาบัน',
  EDUCATION_LEVEL: 'ระดับการศึกษา',
};

/* ---------- dim_period (W17) ---------- */
const PERIODS = [
  { fy: 2568, ay: 2568, sem: 'ทั้งปี', start: '1 ต.ค. 2567', end: '30 ก.ย. 2568', snap: '30 มิ.ย. 2569', rule: 'สถานะกำลังศึกษา · ลาพักไม่นับ', state: 'ปิดงวดแล้ว' },
  { fy: 2567, ay: 2567, sem: 'ทั้งปี', start: '1 ต.ค. 2566', end: '30 ก.ย. 2567', snap: '30 มิ.ย. 2568', rule: 'สถานะกำลังศึกษา · ลาพักไม่นับ', state: 'ปิดงวดแล้ว' },
  { fy: 2569, ay: 2569, sem: 'ทั้งปี', start: '1 ต.ค. 2568', end: '30 ก.ย. 2569', snap: null, rule: 'ยังไม่กำหนด', state: 'เปิดอยู่' },
];

/* ---------- student_type (W17) ---------- */
/* เก็บ "สัดส่วน" ไม่ใช่จำนวนดิบ แล้วกระจายจาก RAW.UNI.Q ด้วย largest-remainder
   ยอดรวมจึงตรงกับจำนวนนิสิตของงวดเสมอ ไม่ว่าจะโหลดข้อมูลจริงหรือชุดตัวอย่าง */
const STUDENT_TYPES = (() => {
  const defs = [
    { code: 'REG-TH', grp: 'ภาคปกติ', nat: 'ไทย', share: 0.9078, note: 'ประเภทหลัก' },
    { code: 'REG-INT', grp: 'ภาคปกติ', nat: 'ต่างชาติ', share: 0.0126, note: 'ค่าธรรมเนียมคนละอัตรากับนิสิตไทย' },
    { code: 'SPC-TH', grp: 'ภาคพิเศษ', nat: 'ไทย', share: 0.078, note: 'ส่วนใหญ่เป็นบัณฑิตศึกษา' },
    { code: 'SPC-INT', grp: 'ภาคพิเศษ', nat: 'ต่างชาติ', share: 0.0016, note: '' },
  ];
  const total = RAW.UNI.Q;
  const raw = defs.map(d => ({ ...d, exact: total * d.share }));
  raw.forEach(d => (d.n = Math.floor(d.exact)));
  let left = total - raw.reduce((a, d) => a + d.n, 0);
  [...raw]
    .sort((a, b) => b.exact - b.n - (a.exact - a.n))
    .forEach(d => {
      if (left-- > 0) d.n++;
    });
  return raw;
})();
