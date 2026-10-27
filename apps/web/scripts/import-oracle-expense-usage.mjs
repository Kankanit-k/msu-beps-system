/**
 * สร้าง src/data/mockup/oracleExpenseUsage.ts จากไฟล์ "expense-category-classification.html"
 * (Oracle PPLN_BUDGET ปีงบ 2568 · หมวดรายจ่ายที่แต่ละหน่วยงานมีในงบ — ไม่มียอดเงิน)
 *
 * ไฟล์ต้นทางมี `FACULTY_USAGE=[{facultyId, facultyName, categoryId, sourceKey}]`
 *   sourceKey = คีย์ 4 ระดับ "แผนงาน|หมวดงบ|หมวดรายจ่าย|หมวดย่อย" — ตรงกับ ACCOUNT_MASTER ทุกแถว
 *   หน่วยงานที่ Oracle ไม่มีชื่อ ("ไม่พบชื่อคณะ (รหัส …)") เก็บแยกไว้ใน ORACLE_UNNAMED_ORGS รอกองแผนยืนยัน
 *
 * วิธีใช้:  node apps/web/scripts/import-oracle-expense-usage.mjs <path/to/expense-category-classification.html>
 *          && pnpm prettier --write apps/web/src/data/mockup/oracleExpenseUsage.ts
 */

/* global process */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = process.argv[2];
if (!SRC) throw new Error('ระบุ path ของไฟล์ expense-category-classification.html');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const OUT = join(ROOT, 'data', 'mockup', 'oracleExpenseUsage.ts');

// ── อ่าน array JSON ตามชื่อตัวแปร (parse เป็น JSON เท่านั้น ไม่รันสคริปต์ในไฟล์)
const html = readFileSync(SRC, 'utf8');
const grabArray = (name) => {
  const s = html.indexOf('[', html.indexOf(name));
  let depth = 0;
  let inStr = false;

  for (let i = s; i < html.length; i++) {
    const c = html[i];

    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) return JSON.parse(html.slice(s, i + 1));
  }

  throw new Error(`ไม่พบ ${name}`);
};
const usage = grabArray('FACULTY_USAGE=');

// ── คีย์ใน ACCOUNT_MASTER — ทุก sourceKey ต้องมี ไม่งั้นหน้าตั้งค่าจะไม่มีกติกาตั้งต้นให้
const master = readFileSync(join(ROOT, 'data', 'mockup', 'accountMaster.ts'), 'utf8');
const known = new Set(
  [
    ...master.matchAll(
      /plan: '([^']+)',[\s\S]*?bud: '([^']+)',[\s\S]*?exp: '([^']+)',[\s\S]*?sub: '([^']+)'/g,
    ),
  ].map((m) => m.slice(1, 5).join('|')),
);
const unknown = [...new Set(usage.map((u) => u.sourceKey))].filter((k) => !known.has(k));
if (unknown.length) throw new Error(`คีย์ที่ไม่มีใน ACCOUNT_MASTER: ${unknown.join(', ')}`);

const toKey = (k) => k.split('|').join(' · ');
const byFaculty = {};
const unnamed = {};

for (const u of usage) {
  if (u.facultyName.startsWith('ไม่พบชื่อคณะ')) {
    unnamed[u.facultyId] = (unnamed[u.facultyId] ?? 0) + 1;
    continue;
  }
  (byFaculty[u.facultyName] ??= new Set()).add(toKey(u.sourceKey));
}

const sorted = Object.fromEntries(
  Object.entries(byFaculty)
    .sort(([a], [b]) => a.localeCompare(b, 'th'))
    .map(([f, s]) => [f, [...s].sort()]),
);

writeFileSync(
  OUT,
  `// สร้างอัตโนมัติจาก scripts/import-oracle-expense-usage.mjs — อย่าแก้ด้วยมือ
// ที่มา: Oracle PPLN_BUDGET ปีงบ 2568 (expense-category-classification.html) · ไม่มียอดเงิน มีแค่ว่าหน่วยงานใช้รายการใด

export const ORACLE_USAGE_FY = 2568;

/** ชื่อหน่วยงาน → คีย์ 4 ระดับ (รูปแบบเดียวกับ accountKey) ที่มีในงบปี 2568 */
export const ORACLE_FACULTY_USAGE: Record<string, string[]> = ${JSON.stringify(sorted)};

/** รหัสหน่วยงานที่ Oracle ไม่มีชื่อ → จำนวนรายการ · รอกองแผนยืนยันว่าเป็นหน่วยงานใด */
export const ORACLE_UNNAMED_ORGS: Record<string, number> = ${JSON.stringify(unnamed)};
`,
);
