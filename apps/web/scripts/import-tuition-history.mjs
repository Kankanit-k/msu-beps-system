/**
 * สร้าง src/views/tuition/tuitionHistory.ts จากไฟล์ "tuition-comparison-6-years.html"
 * (รายงานค่าเทอมรายหลักสูตร เทียบ 3 วิธี ปีการศึกษา 2563–2568 · อ่านจาก Oracle ทะเบียน)
 *
 * ไฟล์ต้นทางมี `const DATA={rows:[...]}` หนึ่งแถว = ปี/ภาค × รหัสหลักสูตรทะเบียน × สัญชาติ × ระดับ × กลุ่มค่าธรรมเนียม
 *   วิธี 1 = อัตราตามหลักสูตร × นิสิต · วิธี 2 = อัตราตามกลุ่มนิสิต × นิสิต · วิธี 3 = เรียกเก็บจริง (ENROLLFEE 2001)
 *
 * ทะเบียนมีรหัสหลักสูตรหลายรหัสต่อหนึ่งหลักสูตรในระบบ (แผน ก/ข, แบบ 1.1/2.1, ปรับปรุงหลักสูตร)
 * จึงรวมขึ้นเป็น 230 หลักสูตรของ RAW.PROGS ด้วย คณะ + กลุ่มระดับ + ชื่อสาขา:
 *   1) ALIAS ที่กำหนดเอง  2) ชื่อทะเบียน = ชื่อในระบบ + แผน/แบบ/วงเล็บต่อท้าย (ยาวสุดชนะ)
 *   3) ชื่อทะเบียนเป็นคำนำหน้าของชื่อในระบบ เมื่อมีตัวเลือกเดียว
 *   หลักสูตรนานาชาติต้องจับคู่กับหลักสูตรนานาชาติ (ถ้ามี) · ที่เหลือเก็บไว้ใน UNMATCHED
 *
 * วิธีใช้:  node apps/web/scripts/import-tuition-history.mjs <path/to/tuition-comparison-6-years.html>
 *          && pnpm prettier --write apps/web/src/views/tuition/tuitionHistory.ts
 */

/* global console, process */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC = process.argv[2];
if (!SRC) throw new Error('ระบุ path ของไฟล์ tuition-comparison-6-years.html');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const OUT = join(ROOT, 'views', 'tuition', 'tuitionHistory.ts');

// ── อ่าน DATA จาก HTML (parse เป็น JSON เท่านั้น ไม่รันสคริปต์ในไฟล์)
const html = readFileSync(SRC, 'utf8');
const start = html.indexOf('{', html.indexOf('const DATA='));
// DATA = {"rows":[{...},...]} — จบที่ "}]}" ตัวแรก
const jsonText = html.slice(start, html.indexOf('}]}', start) + 3);
const { rows } = JSON.parse(jsonText);

// ── รายชื่อหลักสูตรในระบบจาก rawData.ts (fac / lvl / prog ตามลำดับใน PROGS)
const raw = readFileSync(join(ROOT, 'data', 'mockup', 'rawData.ts'), 'utf8');
const progs = [
  ...raw
    .slice(raw.indexOf('PROGS: ['))
    .matchAll(/fac: '([^']*)',\s*lvl: '([^']*)',\s*grp: '[^']*',\s*prog: '([^']*)'/g),
].map((m) => ({ fac: m[1], lvl: m[2], prog: m[3] }));

const FAC_ALIAS = {
  คณะศิลปกรรมศาสตร์: 'คณะศิลปกรรมศาสตร์และวัฒนธรรมศาสตร์',
  คณะวัฒนธรรมศาสตร์: 'คณะศิลปกรรมศาสตร์และวัฒนธรรมศาสตร์',
};

/** ชื่อทะเบียน → ชื่อในระบบ เมื่อกฎคำนำหน้าเลือกให้ไม่ได้ (key = คณะ|ระดับ|ชื่อทะเบียน) */
const ALIAS = {
  'คณะสถาปัตยกรรมศาสตร์ ผังเมืองและนฤมิตศิลป์|ปริญญาตรี|สถาปัตยกรรม': 'สถาปัตยกรรมศาสตรบัณฑิต',
  // ชื่อปริญญาในระบบยังเป็น "ศป.บ. นฤมิตศิลป์"
  'คณะสถาปัตยกรรมศาสตร์ ผังเมืองและนฤมิตศิลป์|ปริญญาตรี|นฤมิตศิลป์': 'นวัตกรรมการออกแบบ',
};

const levelGroup = (name) =>
  name.includes('เอก')
    ? 'ปริญญาเอก'
    : name.includes('โท')
      ? 'ปริญญาโท'
      : name.includes('ประกาศนียบัตรบัณฑิต')
        ? 'ป.บัณฑิต'
        : name.includes('ประกาศนียบัตร')
          ? 'ประกาศนียบัตร'
          : 'ปริญญาตรี';

const norm = (s) => (s ?? '').replace(/[\s.]+/g, '');
const intl = (s) => s.includes('นานาชาติ');
const base = (s) => norm(s.replace(/\(หลักสูตรนานาชาติ\)/g, ''));

/** ชื่อทะเบียน = ชื่อในระบบ + แผน/แบบ/วงเล็บต่อท้าย (กัน "ภูมิศาสตร์" กิน "ภูมิศาสตร์พัฒนา…") */
const planSuffix = (n, p) =>
  n.startsWith(p) && /^($|\(|แผน|แบบ|วิชาเอก|กลุ่มวิชา|\d)/.test(n.slice(p.length));

const byGroup = new Map();
progs.forEach((p, i) => {
  const k = `${p.fac}|${p.lvl}`;
  if (!byGroup.has(k)) byGroup.set(k, []);
  byGroup.get(k).push(i);
});

const matchCache = new Map();
const matchProgram = (fac, lvl, name) => {
  const key = `${fac}|${lvl}|${name}`;
  if (matchCache.has(key)) return matchCache.get(key);
  const cands = byGroup.get(`${fac}|${lvl}`) ?? [];
  let res = null;
  const alias = ALIAS[key];
  if (alias) {
    const i = cands.find((c) => progs[c].prog === alias);
    if (i !== undefined) res = { i, how: 'alias' };
  }
  if (!res) {
    // หลักสูตรนานาชาติจับคู่กับนานาชาติก่อน ถ้าไม่มีจึงยอมรับหลักสูตรปกติ
    const pools = intl(name)
      ? [cands.filter((c) => intl(progs[c].prog)), cands]
      : [cands.filter((c) => !intl(progs[c].prog))];
    const n = base(name);
    for (const pool of pools) {
      const fwd = pool
        .filter((c) => planSuffix(n, base(progs[c].prog)))
        .sort((a, b) => base(progs[b].prog).length - base(progs[a].prog).length);
      if (fwd.length) {
        res = { i: fwd[0], how: n === base(progs[fwd[0]].prog) ? 'exact' : 'prefix' };
        break;
      }
      const rev = pool.filter((c) => base(progs[c].prog).startsWith(n));
      if (rev.length === 1) {
        res = { i: rev[0], how: 'reverse' };
        break;
      }
    }
  }
  matchCache.set(key, res);
  return res;
};

// ── รวมยอด
const YEARS = [...new Set(rows.map((r) => r.year))].sort();
const emptyYear = (y) => ({ y, n: 0, m1: 0, m2: 0, billed: 0, billedN: 0 });
const add = (acc, r) => {
  // จำนวนนิสิตของปีใช้หัวนิสิตภาค 1 (ภาค 2/ฤดูร้อนเป็นคนกลุ่มเดียวกัน) · ยอดเงินรวมทุกภาค
  if (r.term === 1) acc.n += r.students;
  acc.m1 += (r.programRate ?? 0) * r.students;
  acc.m2 += (r.studentGroupRate ?? 0) * r.students;
  acc.billed += r.actualBilled ?? 0;
  if (r.term === 1) acc.billedN += r.billedStudents ?? 0;
};

const uni = YEARS.map(emptyYear);
const hist = new Map(); // progIndex → { years, regs:Map(name→how), rates:Map(rate→students), sems:Map }
const unmatched = new Map();

for (const r of rows) {
  const yi = YEARS.indexOf(r.year);
  add(uni[yi], r);
  const fac = FAC_ALIAS[r.facultyName] ?? r.facultyName;
  const lvl = levelGroup(r.levelName);
  const m = matchProgram(fac, lvl, r.programName.trim());
  if (!m) {
    const k = `${fac}|${lvl}|${r.programName.trim()}`;
    if (!unmatched.has(k))
      unmatched.set(k, { fac, lvl, name: r.programName.trim(), years: YEARS.map(emptyYear) });
    add(unmatched.get(k).years[yi], r);
    continue;
  }
  if (!hist.has(m.i))
    hist.set(m.i, {
      years: YEARS.map(emptyYear),
      regs: new Map(),
      rates: new Map(),
      sems: new Map(),
    });
  const h = hist.get(m.i);
  add(h.years[yi], r);
  h.regs.set(r.programName.trim(), m.how);
  if (r.year === YEARS.at(-1) && r.nationType === 'ไทย') {
    if (r.programRate) h.rates.set(r.programRate, (h.rates.get(r.programRate) ?? 0) + r.students);
    if (r.totalSemesters)
      h.sems.set(r.totalSemesters, (h.sems.get(r.totalSemesters) ?? 0) + r.students);
  }
}

const mode = (m) => (m.size ? [...m].sort((a, b) => b[1] - a[1])[0][0] : null);
const round = (y) => ({
  ...y,
  m1: Math.round(y.m1),
  m2: Math.round(y.m2),
  billed: Math.round(y.billed),
});

const programs = [...hist]
  .sort((a, b) => a[0] - b[0])
  .map(([i, h]) => ({
    key: `${progs[i].fac}|${progs[i].lvl}|${progs[i].prog}`,
    rate: mode(h.rates),
    sems: mode(h.sems),
    regs: [...h.regs].map(([name, how]) => ({ name, how })),
    years: h.years.map(round),
  }));

const unmatchedList = [...unmatched.values()]
  .map((u) => ({ ...u, years: u.years.map(round) }))
  .sort((a, b) => b.years.at(-1).n - a.years.at(-1).n);

const header = `/* ค่าเทอมรายหลักสูตรย้อนหลัง ปีการศึกษา ${YEARS[0]}–${YEARS.at(-1)} — เทียบ 3 วิธี (ระบบทะเบียน Oracle)
   สร้างอัตโนมัติจาก apps/web/scripts/import-tuition-history.mjs (อย่าแก้ไฟล์นี้ด้วยมือ)
   ต้นทาง: tuition-comparison-6-years.html · ${rows.length} แถว รวมขึ้นเป็น ${programs.length}/${progs.length} หลักสูตรของ RAW.PROGS
   ข้อจำกัด: อัตราค่าธรรมเนียมไม่มีปีมีผล (ใช้อัตราปัจจุบันย้อนหลัง) · ยอดเรียกเก็บ = ยอดตั้งบิล ไม่ใช่เงินรับจริง */

import type { TuitionHistoryData } from './tuitionHistory.types';

export const TUITION_HISTORY: TuitionHistoryData = `;

writeFileSync(
  OUT,
  header +
    JSON.stringify({
      years: YEARS,
      uni: uni.map(round),
      programs,
      unmatched: unmatchedList,
    }) +
    ';\n',
);

const last = uni.length - 1;
const matchedN = programs.reduce((s, p) => s + p.years[last].n, 0);
// eslint-disable-next-line no-console
console.log(
  `เขียน ${OUT}\n  หลักสูตรที่มีข้อมูล ${programs.length}/${progs.length} · นิสิตปี ${YEARS[last]} จับคู่ได้ ${matchedN}/${uni[last].n}` +
    ` · ชื่อทะเบียนที่จับคู่ไม่ได้ ${unmatchedList.length}`,
);
