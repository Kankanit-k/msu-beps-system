/**
 * สร้าง src/data/mockup/rawData.ts จาก Google Sheet จุดคุ้มทุนหลักสูตร ปีงบประมาณ 2568
 * https://docs.google.com/spreadsheets/d/1ECcfx9i7Eua_YaoQcdbLaXwsXaEZ01AS80PDOMZKvDQ
 *
 * ดึงรายหลักสูตรจาก 2 แท็บ (ผ่าน gviz JSON ซึ่งให้ค่าทศนิยมเต็ม ไม่ใช่ค่าที่ปัดไว้แสดงผล)
 * - "3.จุดคุ้มทุนหลักสูตร(เดิม)" → คณะ/ระดับ/หลักสูตร, จำนวนนิสิต, งบแผ่นดิน (st), งบรายได้ (own)
 * - "2.ค่าใช้จ่าย"               → องค์ประกอบ TFC / TVC รายหลักสูตร
 * แล้วรวมขึ้นเป็น คณะ×ระดับ / คณะ / มหาวิทยาลัย แบบ bottom-up ด้วยสูตรเดียวกับ mockup/make-data-sample.mjs
 *
 * วิธีใช้:  node apps/web/scripts/import-breakeven-sheet.mjs && pnpm prettier --write apps/web/src/data/mockup/rawData.ts
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SHEET_ID = '1ECcfx9i7Eua_YaoQcdbLaXwsXaEZ01AS80PDOMZKvDQ';
const GID_BREAKEVEN = '1378132634';
const GID_COST = '1353769819';
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'data',
  'mockup',
  'rawData.ts',
);

async function fetchRows(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=0&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`โหลดแท็บ gid=${gid} ไม่ได้: HTTP ${res.status}`);
  const text = await res.text();
  const table = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)).table;
  return table.rows.map((r) => r.c.map((c) => c?.v ?? null));
}

const num = (v) => (typeof v === 'number' ? v : 0);
const r2 = (v) => Math.round(v * 100) / 100;
const CEIL = (x) => Math.ceil(x - 1e-9);

/* สูตรเดียวกับ mockup/make-data-sample.mjs */
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
  /* สูตรที่ 7 — เมื่อ CM ≤ 0 ใช้ Full-Cost Recovery (Q* = TC / R) */
  o.Qin = cmIn > 0 ? CEIL(o.TFC / cmIn) : o.Rin > 0 ? CEIL(o.TC / o.Rin) : null;
  o.Qex = cmEx > 0 ? CEIL(o.TFC / cmEx) : o.Rex > 0 ? CEIL(o.TC / o.Rex) : null;
  o.mIn = cmIn > 0 ? 'cm' : 'fcr';
  o.mEx = cmEx > 0 ? 'cm' : 'fcr';
  return o;
}

/* ---------- 1) ต้นทุนรายหลักสูตร (แท็บ 2) — คีย์ = คณะ&ระดับ&หลักสูตร ---------- */
// คอลัมน์: F ไทย · G ต่างชาติ · H ต้นทุนคงที่หลักสูตร · I–K สนง.เลขาฯ · L ค่าเสื่อม
//          N ผันแปรหลักสูตร · O–Q สนง.เลขาฯ · R ศึกษาทั่วไป · S สมทบรายการหลัก · T สมทบมหาวิทยาลัย
const cost = new Map();
for (const c of await fetchRows(GID_COST)) {
  if (!c[1] || !c[2] || !c[3]) continue; // ข้ามหัวตารางและแถวรวมคณะ
  cost.set(`${c[1]}${c[2]}${c[3]}`, {
    qT: num(c[5]),
    qF: num(c[6]),
    tfcProg: num(c[7]),
    tfcOffice: num(c[8]) + num(c[9]) + num(c[10]),
    dep: num(c[11]),
    tvcProg: num(c[13]),
    tvcOffice: num(c[14]) + num(c[15]) + num(c[16]),
    genEd: num(c[17]),
    matchMain: num(c[18]),
    matchUni: num(c[19]),
  });
}

/* ---------- 2) รายหลักสูตร (แท็บ 3 แถวที่คอลัมน์ A = 0) ---------- */
// คอลัมน์: B คีย์ · E กลุ่มระดับ · G คณะ · H ระดับ · I หลักสูตร · J ปริญญา · K นิสิต · L งบแผ่นดิน · M งบรายได้
const PROGS = [];
for (const c of await fetchRows(GID_BREAKEVEN)) {
  if (c[0] !== 0) continue;
  const k = cost.get(c[1]);
  if (!k) throw new Error(`ไม่พบต้นทุนของหลักสูตร "${c[1]}" ในแท็บ 2.ค่าใช้จ่าย`);
  const p = {
    fac: c[6],
    lvl: c[7],
    grp: c[4],
    prog: c[8],
    deg: c[9],
    qT: k.qT,
    qF: k.qF,
    Q: num(c[10]),
    st: r2(num(c[11])),
    own: r2(num(c[12])),
  };
  for (const f of [
    'tfcProg',
    'tfcOffice',
    'dep',
    'tvcProg',
    'tvcOffice',
    'genEd',
    'matchMain',
    'matchUni',
  ])
    p[f] = r2(k[f]);
  PROGS.push(derive(p));
}

/* ---------- 3) รวมขึ้นเป็นระดับบน (bottom-up) ---------- */
const SUM_KEYS = [
  'Q',
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
const PROG_ONLY = ['tvcProg', 'tvcOffice', 'genEd', 'matchMain', 'matchUni', 'mIn', 'mEx'];

function rollup(rows, extra) {
  const o = { ...extra };
  for (const k of SUM_KEYS) o[k] = r2(rows.reduce((s, x) => s + x[k], 0));
  o.Q = Math.round(o.Q);
  o.n = rows.length;
  derive(o);
  for (const k of PROG_ONLY) delete o[k];
  return o;
}

const uniq = (xs) => [...new Set(xs)];
const DEPTS = uniq(PROGS.map((p) => `${p.fac}\u0000${p.grp}`)).map((key) => {
  const [fac, grp] = key.split('\u0000');
  return rollup(
    PROGS.filter((p) => p.fac === fac && p.grp === grp),
    { fac, grp },
  );
});
const FACS = uniq(PROGS.map((p) => p.fac)).map((name) =>
  rollup(
    PROGS.filter((p) => p.fac === name),
    { name },
  ),
);
const UNI = rollup(PROGS, {});

/* ---------- 4) เขียนไฟล์ ---------- */
const header = `/* ชุดข้อมูลจริง ปีงบประมาณ 2568 — จาก Google Sheet จุดคุ้มทุนหลักสูตร
   ────────────────────────────────────────────────────────────────────
   สร้างอัตโนมัติจาก apps/web/scripts/import-breakeven-sheet.mjs (อย่าแก้ไฟล์นี้ด้วยมือ)
   https://docs.google.com/spreadsheets/d/${SHEET_ID}
   แท็บ "3.จุดคุ้มทุนหลักสูตร(เดิม)" (นิสิต · งบแผ่นดิน · งบรายได้) + "2.ค่าใช้จ่าย" (องค์ประกอบ TFC/TVC)
   ระดับคณะ / คณะ×ระดับ / มหาวิทยาลัย รวมขึ้นจากรายหลักสูตร
   UNI = มหาวิทยาลัย · FACS = ${FACS.length} คณะ · DEPTS = ${DEPTS.length} คณะ x ระดับ · PROGS = ${PROGS.length} หลักสูตร */

import type { RawData } from './rawData.types';

export const RAW: RawData = `;

writeFileSync(
  OUT,
  header + JSON.stringify({ UNI, FACS, DEPTS, PROGS, __sample: false }) + ';\n',
  'utf8',
);

const m = (v) => (v / 1e6).toFixed(2);
console.log('เขียน', OUT);
console.log(`  หลักสูตร ${PROGS.length} · คณะ ${FACS.length} · คณะ×ระดับ ${DEPTS.length}`);
console.log(
  `  นิสิต ${UNI.Q} · TR ${m(UNI.TR)} · TFC ${m(UNI.TFC)} · TVC ${m(UNI.TVC)} · TC ${m(UNI.TC)} ลบ.`,
);
