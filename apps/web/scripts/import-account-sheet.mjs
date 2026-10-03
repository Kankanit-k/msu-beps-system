/**
 * สร้าง src/data/mockup/accountMaster.ts จาก Google Sheet จุดคุ้มทุนหลักสูตร ปีงบประมาณ 2568
 * https://docs.google.com/spreadsheets/d/1ECcfx9i7Eua_YaoQcdbLaXwsXaEZ01AS80PDOMZKvDQ
 *
 * - "Masterแยกหมวด" → ผังบัญชีคีย์ผสม 4 ระดับ + ประเภทต้นทุน (คงที่ / ผันแปร / 50:50) + หมายเหตุ
 * - "งบประมาณ68"    → วงเงินอนุมัติ รวมต่อคีย์ แยกเงินแผ่นดิน (10) / เงินรายได้ (20)
 *
 * วิธีใช้:  node apps/web/scripts/import-account-sheet.mjs && pnpm prettier --write apps/web/src/data/mockup/accountMaster.ts
 */

/* global fetch, console */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SHEET_ID = '1ECcfx9i7Eua_YaoQcdbLaXwsXaEZ01AS80PDOMZKvDQ';
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'data',
  'mockup',
  'accountMaster.ts',
);

async function fetchTab(sheet, tq) {
  const url =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=0` +
    `&sheet=${encodeURIComponent(sheet)}` +
    (tq ? `&tq=${encodeURIComponent(tq)}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`โหลดแท็บ ${sheet} ไม่ได้: HTTP ${res.status}`);
  const text = await res.text();
  const table = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)).table;
  return table.rows.map((r) => r.c.map((c) => c?.v ?? null)).slice(1);
}

const clean = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() || null : null);
/** "100:เงินเดือน" → ['100', 'เงินเดือน'] */
const split = (v) => {
  const s = clean(v) ?? '';
  const i = s.indexOf(':');
  return [s.slice(0, i), s.slice(i + 1)];
};
const BEH = {
  ต้นทุนคงที่: 'TFC',
  ต้นทุนผันแปร: 'TVC',
  'ต้นทุนคงที่ / ต้นทุนผันแปร 50/50': 'MIXED',
};

/* ---------- 1) วงเงินอนุมัติต่อคีย์ (แท็บ งบประมาณ68) ---------- */
// C แหล่งงบ · F วงเงินอนุมัติ · S หมวดงบ · T หมวดรายจ่าย · U หมวดย่อย · W แผนงาน
const budget = new Map();
for (const [src, amt, bud, exp, sub, plan] of await fetchTab('งบประมาณ68', 'select C,F,S,T,U,W')) {
  const key = `${clean(plan)}${clean(bud)}${clean(exp)}${clean(sub)}`;
  const b = budget.get(key) ?? { gov: 0, own: 0, lines: 0 };
  if (String(src).startsWith('10')) b.gov += amt ?? 0;
  else b.own += amt ?? 0;
  b.lines += 1;
  budget.set(key, b);
}

/* ---------- 2) ผังบัญชี + ประเภทต้นทุน (แท็บ Masterแยกหมวด) ---------- */
const r2 = (v) => Math.round(v * 100) / 100;
const accounts = [];
const seen = new Set();
for (const c of await fetchTab('Masterแยกหมวด')) {
  if (!c[1] || !c[3]) continue; // ข้ามแถว Total
  const [plan, planName] = split(c[0]);
  const [bud, budName] = split(c[1]);
  const [exp, expName] = split(c[2]);
  const [sub, name] = split(c[3]);
  const key = `${clean(c[0])}${clean(c[1])}${clean(c[2])}${clean(c[3])}`;
  const b = budget.get(key) ?? { gov: 0, own: 0, lines: 0 };
  seen.add(key);
  accounts.push({
    plan,
    planName,
    bud,
    budName,
    exp,
    expName,
    sub,
    name,
    beh: BEH[clean(c[6])] ?? 'UNCLASSIFIED',
    basis: clean(c[7]),
    remark: clean(c[8])?.replace('ค่าเสื่อราคม', 'ค่าเสื่อมราคา') ?? null,
    gov: r2(b.gov),
    own: r2(b.own),
    amount: r2(b.gov + b.own),
    lines: b.lines,
  });
}

const orphan = [...budget.keys()].filter((k) => !seen.has(k));
if (orphan.length)
  console.warn(`⚠ คีย์ในงบประมาณ68 ที่ไม่มีใน Masterแยกหมวด: ${orphan.join(', ')}`);

const src = `/* ผังบัญชีคีย์ผสม 4 ระดับ + ประเภทต้นทุน ปีงบประมาณ 2568 — จาก Google Sheet จุดคุ้มทุนหลักสูตร
   สร้างอัตโนมัติจาก apps/web/scripts/import-account-sheet.mjs (อย่าแก้ไฟล์นี้ด้วยมือ)
   https://docs.google.com/spreadsheets/d/${SHEET_ID}
   แท็บ "Masterแยกหมวด" (ประเภทต้นทุน) + "งบประมาณ68" (วงเงินอนุมัติ รวมต่อคีย์) */

export interface AccountMasterRow {
  plan: string;
  planName: string;
  bud: string;
  budName: string;
  exp: string;
  expName: string;
  sub: string;
  name: string;
  /** UNCLASSIFIED = ไฟล์ต้นทางเว้นว่าง · MIXED = คงที่/ผันแปร 50:50 */
  beh: 'TFC' | 'TVC' | 'MIXED' | 'UNCLASSIFIED';
  /** เกณฑ์ปันส่วน เช่น "คิดตามจำนวนนิสิต" */
  basis: string | null;
  remark: string | null;
  /** วงเงินอนุมัติ งบประมาณเงินแผ่นดิน / เงินรายได้ / รวม (บาท) */
  gov: number;
  own: number;
  amount: number;
  /** จำนวนรายการงบประมาณในแท็บ งบประมาณ68 ที่ผูกกับคีย์นี้ */
  lines: number;
}

export const ACCOUNT_MASTER: AccountMasterRow[] = ${JSON.stringify(accounts, null, 2)};
`;

writeFileSync(OUT, src);
// eslint-disable-next-line no-console
console.log(`เขียน ${accounts.length} บัญชี (${budget.size} คีย์มียอด) → ${OUT}`);
