/**
 * สร้าง mockup/assets/data.sample.js จาก mockup/assets/data.js
 *
 * ทำไมต้องมีไฟล์นี้
 * ─────────────────
 * `data.js` คือข้อมูลการเงินจริงของ มมส. ปีงบประมาณ 2568 แยกรายคณะและรายหลักสูตร
 * ซึ่ง `.gitignore` ของโปรเจกต์ห้าม commit (ดูเหตุผลในไฟล์นั้น)
 * repo จึงเก็บเฉพาะ `data.sample.js` ที่ตัวเลขถูกสุ่มรบกวนแล้ว เพื่อให้เปิด mockup ดูได้
 *
 * วิธีสุ่ม
 * ────────
 * - รบกวนเฉพาะ "ตัวตั้ง" รายหลักสูตร (Q และยอดเงินแต่ละหมวด) ด้วยตัวคูณคนละค่าต่อรายการ
 * - แล้ว **คำนวณค่าที่เหลือใหม่ทั้งหมดจากสูตรเดิม** (TR · TFC · TVC · TC · R · AVC · Q*)
 *   ผลคือชุดข้อมูลที่ทุกสูตรยังสอดคล้องกัน หน้าจอจึงทำงานเหมือนของจริงทุกประการ
 * - ระดับคณะและระดับ คณะ×ระดับ รวมขึ้นจากรายหลักสูตร (bottom-up) ไม่ได้สุ่มแยก
 * - ชื่อคณะ / หลักสูตร / ปริญญา เก็บไว้ตามเดิม เพราะเป็นข้อมูลสาธารณะ
 * - ใช้ PRNG ที่มี seed คงที่ — รันกี่ครั้งก็ได้ผลเดิม
 *
 * วิธีใช้:  node mockup/make-data-sample.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'assets', 'data.js');
const OUT = join(HERE, 'assets', 'data.sample.js');

/* ---------- PRNG แบบมี seed (mulberry32) ---------- */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(25680711);
/* ตัวคูณคนละช่วงสำหรับ "เงิน" กับ "จำนวนนิสิต" — จงใจให้ค่าเฉลี่ยไม่เท่า 1
   เพื่อให้ทั้งตัวเลขรายรายการและยอดรวมระดับมหาวิทยาลัยห่างจากของจริงอย่างชัดเจน
   (ถ้าใช้ตัวคูณเฉลี่ย 1 ยอดรวมจะลู่เข้าหาค่าจริงตามกฎเลขจำนวนมาก) */
const jMoney = () => 0.45 + rand() * 0.5; // เฉลี่ย ~0.70
const jQ = () => 0.75 + rand() * 0.7; // เฉลี่ย ~1.10

const r2 = (v) => Math.round(v * 100) / 100;
const CEIL = (x) => Math.ceil(x - 1e-9);

/* ---------- อ่านข้อมูลจริง ---------- */
const raw = readFileSync(SRC, 'utf8');
const RAW = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));

/* ---------- คำนวณค่าที่ derive ได้ ใหม่จากสูตรเดิม ---------- */
function derive(o) {
  o.TR = r2(o.st + o.own);
  o.TFC = r2(o.tfcProg + o.tfcOffice + o.dep);
  o.TVC = r2(o.tvcProg + o.tvcOffice + o.genEd + o.matchMain + o.matchUni);
  o.TC = r2(o.TFC + o.TVC);
  o.Rin = o.Q ? r2(o.TR / o.Q) : 0;
  o.Rex = o.Q ? r2(o.own / o.Q) : 0;
  o.AVC = o.Q ? r2(o.TVC / o.Q) : 0;
  const cmIn = o.Rin - o.AVC;
  const cmEx = o.Rex - o.AVC;
  /* สูตรที่ 7 — เมื่อ CM ≤ 0 ใช้ Full-Cost Recovery (Q* = TC ÷ R) */
  o.Qin = cmIn > 0 ? CEIL(o.TFC / cmIn) : o.Rin > 0 ? CEIL(o.TC / o.Rin) : null;
  o.Qex = cmEx > 0 ? CEIL(o.TFC / cmEx) : o.Rex > 0 ? CEIL(o.TC / o.Rex) : null;
  o.mIn = cmIn > 0 ? 'cm' : 'fcr';
  o.mEx = cmEx > 0 ? 'cm' : 'fcr';
  return o;
}

/* ---------- 1) รบกวนตัวตั้งรายหลักสูตร ---------- */
const MONEY = [
  'st',
  'own',
  'tfcProg',
  'tfcOffice',
  'dep',
  'tvcProg',
  'tvcOffice',
  'genEd',
  'matchMain',
  'matchUni',
];

const PROGS = RAW.PROGS.map((p) => {
  const o = { ...p };
  o.Q = Math.max(1, Math.round(p.Q * jQ()));
  o.qT = o.Q;
  o.qF = 0;
  for (const k of MONEY) o[k] = r2((p[k] || 0) * jMoney());
  return derive(o);
});

/* ---------- 2) รวมขึ้นเป็นระดับบน (bottom-up) ---------- */
const SUM_KEYS = ['Q', ...MONEY];

function rollup(rows, extra) {
  const o = { ...extra };
  for (const k of SUM_KEYS) o[k] = r2(rows.reduce((s, x) => s + (x[k] || 0), 0));
  o.Q = Math.round(o.Q);
  o.n = rows.length;
  return derive(o);
}

/* ระดับ คณะ × ระดับการศึกษา — ยึดคู่ (fac, grp) ตามลำดับเดิมของ DEPTS */
const DEPTS = RAW.DEPTS.map((d) =>
  rollup(
    PROGS.filter((p) => p.fac === d.fac && p.grp === d.grp),
    { fac: d.fac, grp: d.grp },
  ),
);

/* ระดับคณะ — ยึดลำดับเดิมของ FACS */
const FACS = RAW.FACS.map((f) =>
  rollup(
    PROGS.filter((p) => p.fac === f.name),
    { name: f.name },
  ),
);

/* ระดับมหาวิทยาลัย */
const UNI = rollup(PROGS, {});

/* ---------- 3) ตัดฟิลด์ที่ระดับบนไม่มีในของจริง ให้โครงตรงกัน ---------- */
const PROG_ONLY = [
  'tvcProg',
  'tvcOffice',
  'genEd',
  'matchMain',
  'matchUni',
  'qT',
  'qF',
  'mIn',
  'mEx',
];
for (const o of [UNI, ...FACS, ...DEPTS]) for (const k of PROG_ONLY) delete o[k];

const OUT_DATA = { UNI, FACS, DEPTS, PROGS };

/* ---------- 4) เขียนไฟล์ ---------- */
const header = `/* ชุดข้อมูล "ตัวอย่าง" สำหรับเปิด mockup — ตัวเลขไม่ใช่ของจริง
   ────────────────────────────────────────────────────────────────────
   สร้างอัตโนมัติจาก mockup/make-data-sample.mjs (อย่าแก้ไฟล์นี้ด้วยมือ)

   ข้อมูลการเงินจริงของ มมส. อยู่ใน assets/data.js ซึ่ง .gitignore กันไว้ไม่ให้ขึ้น git
   ถ้ามีไฟล์นั้นอยู่ในเครื่อง หน้าจอจะโหลดทับชุดนี้เองและแสดงตัวเลขจริง

   ตัวเลขในไฟล์นี้ถูกสุ่มรบกวนรายรายการแล้วคำนวณใหม่ตามสูตรเดิมทั้งหมด
   ความสัมพันธ์ทุกสูตรจึงยังถูกต้อง (TR = st + own · TC = TFC + TVC · Q* = TFC ÷ (R − AVC) ฯลฯ)
   แต่ตัวเลข "ไม่ตรงกับงบประมาณจริงของมหาวิทยาลัย" และห้ามนำไปอ้างอิง
   UNI = มหาวิทยาลัย · FACS = ${FACS.length} คณะ · DEPTS = ${DEPTS.length} คณะ x ระดับ · PROGS = ${PROGS.length} หลักสูตร */
var RAW = `;

writeFileSync(OUT, header + JSON.stringify(OUT_DATA) + ';\nRAW.__sample = true;\n', 'utf8');

/* ---------- สรุปให้ดูว่าต่างจากของจริงแค่ไหน ---------- */
const pc = (a, b) => (((a - b) / b) * 100).toFixed(1) + '%';
console.log('เขียน', OUT);
console.log(`  หลักสูตร ${PROGS.length} · คณะ ${FACS.length} · คณะ×ระดับ ${DEPTS.length}`);
console.log(
  `  นิสิตรวม   ${UNI.Q.toLocaleString()} (ของจริง ${RAW.UNI.Q.toLocaleString()} · ต่าง ${pc(UNI.Q, RAW.UNI.Q)})`,
);
console.log(
  `  ต้นทุนรวม  ${(UNI.TC / 1e6).toFixed(1)} ลบ. (ของจริง ${(RAW.UNI.TC / 1e6).toFixed(1)} ลบ. · ต่าง ${pc(UNI.TC, RAW.UNI.TC)})`,
);
console.log(
  `  รายได้รวม  ${(UNI.TR / 1e6).toFixed(1)} ลบ. (ของจริง ${(RAW.UNI.TR / 1e6).toFixed(1)} ลบ. · ต่าง ${pc(UNI.TR, RAW.UNI.TR)})`,
);
