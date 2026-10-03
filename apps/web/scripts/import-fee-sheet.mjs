/**
 * สร้าง src/views/tuition/feeRates.ts จากแท็บ "ค่าธรรมเนียม68" ของ Google Sheet จุดคุ้มทุนหลักสูตร
 * (แท็บเดียวกับไฟล์ Excel "20260711_จุดคุ้มทุน update")
 * https://docs.google.com/spreadsheets/d/1ECcfx9i7Eua_YaoQcdbLaXwsXaEZ01AS80PDOMZKvDQ
 *
 * คอลัมน์: B คณะ · C ระดับ · D วุฒิ/สาขา · E แผน/แขนง · F ในเวลา/นอกเวลา
 *          G ภาคการศึกษาตลอดหลักสูตร · H ค่าธรรมเนียม (ไทย) · I ค่าธรรมเนียม (ต่างชาติ)
 * อัตราเป็นบาทต่อภาคการศึกษา · บางหลักสูตรเป็นอัตราขั้นบันไดตามชั้นปี (เก็บเป็นข้อความ rateText)
 *
 * วิธีใช้:  node apps/web/scripts/import-fee-sheet.mjs && pnpm prettier --write apps/web/src/views/tuition/feeRates.ts
 */

/* global fetch, console */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SHEET_ID = '1ECcfx9i7Eua_YaoQcdbLaXwsXaEZ01AS80PDOMZKvDQ';
const TAB = 'ค่าธรรมเนียม68';
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'views',
  'tuition',
  'feeRates.ts',
);

const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=0&sheet=${encodeURIComponent(TAB)}`;
const res = await fetch(url);
if (!res.ok) throw new Error(`โหลดแท็บ ${TAB} ไม่ได้: HTTP ${res.status}`);
const text = await res.text();
const table = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)).table;
const rows = table.rows.map((r) => r.c.map((c) => c?.v ?? null));

const clean = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() || null : v);

/** "18,000 " → 18000 · ข้อความอื่น (อัตราขั้นบันได/หมายเหตุ) → null */
const toNum = (v) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && /^[\d,]+$/.test(v.replace(/\s/g, ''))) {
    return Number(v.replace(/[\s,]/g, ''));
  }
  return null;
};

const fees = [];
for (const c of rows.slice(1)) {
  if (!c[1] || !c[3]) continue;
  const rate = toNum(c[7]);
  const intl = toNum(c[8]);
  fees.push({
    fac: clean(c[1]),
    lvl: clean(c[2]),
    prog: clean(c[3]),
    plan: clean(c[4]),
    mode: clean(c[5]) ?? 'ในเวลา',
    sems: toNum(c[6]),
    rate,
    rateText: rate === null ? clean(c[7]) : null,
    rateIntl: intl,
    note: intl === null ? clean(c[8]) : null,
  });
}

const src = `/* อัตราค่าธรรมเนียมการศึกษา ปีงบประมาณ 2568 — จากแท็บ "${TAB}"
   สร้างอัตโนมัติจาก apps/web/scripts/import-fee-sheet.mjs (อย่าแก้ไฟล์นี้ด้วยมือ)
   https://docs.google.com/spreadsheets/d/${SHEET_ID} */

import type { FeeRow } from './feeData';

export const FEE_RATES: FeeRow[] = ${JSON.stringify(fees, null, 2)};
`;

writeFileSync(OUT, src);
// eslint-disable-next-line no-console
console.log(`เขียน ${fees.length} อัตรา → ${OUT}`);
