/**
 * สร้าง src/data/mockup/programCostCats.ts — ต้นทุนรายหมวดรายจ่ายของแต่ละหลักสูตร
 * ตามสูตรแท็บ "4.จุดคุ้มทุนหลักสูตร(ใหม่)" (แถว 18–27 คงที่ · 30–36 ผันแปร) ของ Google Sheet
 * https://docs.google.com/spreadsheets/d/1ECcfx9i7Eua_YaoQcdbLaXwsXaEZ01AS80PDOMZKvDQ
 *
 * ต้นทุนหมวด c ของหลักสูตร = งบของหลักสูตรเอง (P-งบประมาณ AA/AB)
 *   + งบ สนง.เลขาฯ ระดับเดียวกัน (AM/AN) ÷ นิสิตทั้งระดับของคณะ × นิสิตหลักสูตร
 *   + งบส่วนกลางคณะ (AM/AN) ÷ นิสิตทั้งคณะ × นิสิตหลักสูตร
 * (ค่าเสื่อม · ศึกษาทั่วไป · ค่าธรรมเนียมรายการหลัก · หักสมทบ ใช้ค่าจาก rawData.ts ซึ่งตรงกับแท็บ 4 อยู่แล้ว)
 *
 * แท็บ P-งบประมาณ เป็น pivot — gviz อ่านไม่ได้ ต้องใช้ export CSV
 * วิธีใช้:  node apps/web/scripts/import-program-cost-cats.mjs && pnpm prettier --write apps/web/src/data/mockup/programCostCats.ts
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SHEET_ID = '1ECcfx9i7Eua_YaoQcdbLaXwsXaEZ01AS80PDOMZKvDQ';
const GID_BREAKEVEN = '1378132634';
const GID_BUDGET_PIVOT = '2084038664';
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'data',
  'mockup',
  'programCostCats.ts',
);

const FIXED_CATS = [
  '100:เงินเดือน',
  '210:ค่าจ้างประจำ',
  '220:ค่าจ้างชั่วคราว',
  '230:ค่าตอบแทนพนักงานราชการ',
  '300:ค่าตอบแทน',
  '400:ค่าใช้สอย',
  '500:ค่าวัสดุ',
  '600:ค่าครุภัณฑ์',
  '800:เงินอุดหนุน',
  '900:รายจ่ายอื่น',
];
const VARIABLE_CATS = [
  '300:ค่าตอบแทน',
  '400:ค่าใช้สอย',
  '410:ค่าสาธารณูปโภค',
  '500:ค่าวัสดุ',
  '600:ค่าครุภัณฑ์',
  '800:เงินอุดหนุน',
  '900:รายจ่ายอื่น',
];

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`โหลด ${url} ไม่ได้: HTTP ${res.status}`);
  return res.text();
}

async function fetchGviz(gid) {
  const text = await fetchText(
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=0&gid=${gid}`,
  );
  const table = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)).table;
  return table.rows.map((r) => r.c.map((c) => c?.v ?? null));
}

/** CSV แบบมีเครื่องหมายคำพูด (ตัวเลขใน export มาเป็น "  194,500.00 ") */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') cell += text[++i];
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') (row.push(cell), (cell = ''));
    else if (ch === '\n') (row.push(cell), rows.push(row), (row = []), (cell = ''));
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) (row.push(cell), rows.push(row));
  return rows;
}

/** ค่าติดลบใน export มาแบบบัญชี "(1,234.00)" */
const num = (s) => {
  if (typeof s === 'number') return s;
  const t = String(s ?? '').replace(/[,\s]/g, '');
  const v = /^\(.*\)$/.test(t) ? -Number(t.slice(1, -1)) : Number(t);
  return Number.isFinite(v) ? v : 0;
};
const r2 = (v) => Math.round(v * 100) / 100;

/* ---------- 1) P-งบประมาณ: AA/AB/AC = หลักสูตร · AM/AN/AO = สนง.เลขาฯ ตามระดับ + ส่วนกลางคณะ ---------- */
const progFix = new Map();
const progVar = new Map();
const poolFix = new Map();
const poolVar = new Map();
const add = (m, k, v) => k && m.set(k, (m.get(k) ?? 0) + num(v));
for (const c of parseCsv(
  await fetchText(
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID_BUDGET_PIVOT}`,
  ),
).slice(4)) {
  add(progFix, c[28], c[26]);
  add(progVar, c[28], c[27]);
  add(poolFix, c[40], c[38]);
  add(poolVar, c[40], c[39]);
}

/* ---------- 2) แท็บ 3: รายหลักสูตร (A = 0) — F คณะ&กลุ่มระดับ · G คณะ · H ระดับ · I หลักสูตร · K นิสิต ---------- */
const progs = (await fetchGviz(GID_BREAKEVEN)).filter((c) => c[0] === 0);
const qByGroup = new Map();
const qByFac = new Map();
for (const c of progs) {
  add(qByGroup, c[5], c[10]);
  add(qByFac, c[6], c[10]);
}

const perCat = (cats, own, pool, c) =>
  cats.map((cat) => {
    const q = num(c[10]);
    const grpQ = qByGroup.get(c[5]) ?? 0;
    const facQ = qByFac.get(c[6]) ?? 0;
    return r2(
      (own.get(c[6] + c[7] + c[8] + cat) ?? 0) +
        (grpQ ? ((pool.get(c[5] + cat) ?? 0) / grpQ) * q : 0) +
        (facQ ? ((pool.get(c[6] + 'ส่วนกลางคณะ' + cat) ?? 0) / facQ) * q : 0),
    );
  });

const COST_CATS = {};
for (const c of progs)
  COST_CATS[`${c[6]}|${c[7]}|${c[8]}`] = {
    fix: perCat(FIXED_CATS, progFix, poolFix, c),
    var: perCat(VARIABLE_CATS, progVar, poolVar, c),
  };

/* ---------- 3) เขียนไฟล์ ---------- */
writeFileSync(
  OUT,
  `/* ต้นทุนรายหมวดรายจ่ายของแต่ละหลักสูตร — สูตรแท็บ "4.จุดคุ้มทุนหลักสูตร(ใหม่)" ปีงบประมาณ 2568
   สร้างอัตโนมัติจาก apps/web/scripts/import-program-cost-cats.mjs (อย่าแก้ไฟล์นี้ด้วยมือ)
   คีย์ = "คณะ|ระดับ|หลักสูตร" · fix ตามลำดับ FIXED_CATS · var ตามลำดับ VARIABLE_CATS (บาท) */

export const FIXED_CATS = ${JSON.stringify(FIXED_CATS)} as const;

export const VARIABLE_CATS = ${JSON.stringify(VARIABLE_CATS)} as const;

export const COST_CATS: Record<string, { fix: number[]; var: number[] }> = ${JSON.stringify(COST_CATS)};
`,
  'utf8',
);
console.log('เขียน', OUT, '·', Object.keys(COST_CATS).length, 'หลักสูตร');
