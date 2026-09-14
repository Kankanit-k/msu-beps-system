/**
 * รวม mockup ทั้ง 20 หน้าจอให้เป็นไฟล์ HTML เดียว
 *
 * ทำไม
 * ────
 * ชุดแยกไฟล์ (หนึ่งหน้าจอ = หนึ่งไฟล์) เหมาะกับการส่งต่อ dev และ deploy
 * แต่เวลาส่งให้ผู้บริหารทางอีเมลหรือ USB ไฟล์เดียวที่เปิดออฟไลน์ได้ย่อมง่ายกว่า
 * — แบบเดียวกับ prototype v8-1 เดิม
 *
 * วิธีรวม
 * ───────
 * ปัญหาใหญ่ของการยัดทุกหน้าไว้ในไฟล์เดียวคือ **ชื่อ id ซ้ำกันข้ามหน้า**
 * (detail · cnt · f-year · f-q · k-n ... รวม 14 ตัว) และตัวแปร JS ชื่อซ้ำกัน
 *
 * แก้ด้วยการ **mount ทีละหน้า** — ใน DOM มีเนื้อหาของหน้าเดียวเสมอ
 * เปลี่ยนหน้าคือล้างของเก่าแล้ววางของใหม่ ทำให้ id ไม่มีวันชนกัน
 * ส่วน JS ของแต่ละหน้าถูกห่อไว้ในฟังก์ชัน init() ของตัวเอง ตัวแปรจึงไม่รั่วออกมา
 *
 * วิธีใช้
 *   node mockup/make-single-file.mjs           # สร้างทั้ง 2 แบบ
 *   node mockup/make-single-file.mjs --sample  # เฉพาะแบบข้อมูลตัวอย่าง
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const A = (...p) => join(HERE, 'assets', ...p);
const rd = (p) => readFileSync(p, 'utf8');

/* ลำดับหน้าจอ — ตรงกับ NAV ใน core.js บวกหน้าที่ไม่อยู่ในเมนู (W0, สารบัญ) */
const SCREEN_FILES = [
  'W1-overview.html',
  'W4c-revenue.html',
  'W4b-cost.html',
  'W4a-perhead.html',
  'W2-breakeven.html',
  'W3-chart.html',
  'W5-cross.html',
  'W10-method.html',
  'W6-scenario-faculty.html',
  'W7-scenario-program.html',
  'W11-allocation-run.html',
  'W12-reconciliation.html',
  'W13-exceptions.html',
  'W16-programs.html',
  'W17-master-data.html',
  'W19-erp-accounts.html',
  'W8-tuition.html',
  'W9-cost-data.html',
  'W14-account-rules.html',
  'W15-settings.html',
  'W18-users.html',
  'W0-login.html',
  'screens.html',
];

/* คำสงวนของภาษา — กันไม่ให้ regex จับ on* handler อย่าง onclick="if(...)" มาเป็นชื่อฟังก์ชัน */
const RESERVED = new Set(['if', 'for', 'while', 'return', 'this', 'function', 'switch', 'try']);

/* ---------- แกะหนึ่งหน้าจอออกเป็นชิ้นส่วน ---------- */
function parseScreen(file) {
  const src = rd(join(HERE, file));
  const key = file.replace(/\.html$/, '');

  /* เนื้อหา body: ตั้งแต่หลัง <body> จนถึง <script> ตัวแรก */
  const bStart = src.indexOf('<body>') + '<body>'.length;
  const bEnd = src.indexOf('<script', bStart);
  let html = src.slice(bStart, bEnd).trim();

  /* หน้าที่มีเปลือก (sidebar/topbar) จะห่อเนื้อหาไว้ใน <div id="main">
     ในไฟล์เดียวมี #main ของ router อยู่แล้ว ถ้าปล่อยไว้จะซ้อนกันสองชั้น
     และ margin-left ของ #main จะถูกคิดซ้ำ ทำให้เนื้อหาล้นจอ — จึงต้องลอกชั้นนอกออก
     (เนื้อหาที่อยู่ต่อจาก </div> เช่น pdf-overlay ของ W7 ต้องเก็บไว้ด้วย) */
  const shell = /^<div id="main">/.test(html);
  if (shell) {
    const open = '<div id="main">';
    let i = open.length,
      depth = 1;
    while (i < html.length && depth > 0) {
      const nextOpen = html.indexOf('<div', i);
      const nextClose = html.indexOf('</div>', i);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        i = nextOpen + 4;
      } else {
        depth--;
        i = nextClose + 6;
      }
    }
    html = html.slice(open.length, i - 6).trim() + '\n' + html.slice(i).trim();
  }

  /* สคริปต์ที่ฝังในหน้า (บล็อกที่ไม่มี src) */
  const inline = [...src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .join('\n');

  /* ตัวเลือกที่ส่งให้ buildShell — เอาไปทำ topbar */
  const bs = inline.match(/buildShell\(\s*\{([\s\S]*?)\}\s*\);?/);
  const opt = {};
  if (bs) {
    for (const [, k, v] of bs[1].matchAll(/(\w+)\s*:\s*('([^']*)'|true|false)/g)) {
      opt[k] = v === 'true' ? true : v === 'false' ? false : v.slice(1, -1);
    }
  }

  /* ตัดคำสั่งที่ router จะจัดการเองออกจาก init */
  let init = inline
    .replace(/buildShell\(\s*\{[\s\S]*?\}\s*\);?/, '')
    .replace(/document\.querySelector\('\.page'\)\.insertAdjacentHTML\([\s\S]*?\);/, '');
  const wantsCaveat = /dataCaveat\(\)/.test(inline);

  /* ตรรกะที่อยู่ในไฟล์ assets/page-*.js ของหน้านั้น */
  for (const [, p] of src.matchAll(/<script[^>]*src="assets\/(page-[^"]+)"/g)) {
    init += '\n\n/* ── ' + p + ' ── */\n' + rd(A(p));
  }

  /* ฟังก์ชันที่ถูกเรียกจาก on* handler ใน HTML ต้องมองเห็นจากภายนอก init() */
  const exports = [
    ...new Set([...html.matchAll(/\son\w+="\s*(\w+)\s*\(/g)].map((m) => m[1])),
  ].filter((n) => !RESERVED.has(n));

  return { key, file, html, init, opt, wantsCaveat, exports, shell };
}

const screens = SCREEN_FILES.filter((f) => existsSync(join(HERE, f))).map(parseScreen);

/* ---------- ประกอบไฟล์ ---------- */
function build({ sample }) {
  const dataFile = sample ? 'data.sample.js' : 'data.js';
  if (!existsSync(A(dataFile))) return null;

  const entries = screens
    .map(
      (s) => `
  '${s.key}': {
    w: ${JSON.stringify(s.opt.w || '')},
    title: ${JSON.stringify(s.opt.title || s.key)},
    bm: ${s.opt.bm !== false},
    run: ${s.opt.run !== false},
    shell: ${s.shell},
    caveat: ${s.wantsCaveat},
    html: ${JSON.stringify(s.html)},
    init: function () {
${s.init}
${s.exports.map((n) => `      try { window.${n} = ${n}; } catch (e) {}`).join('\n')}
    },
  },`,
    )
    .join('\n');

  const out = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MSU-BEPS | ระบบวิเคราะห์จุดคุ้มทุน — ต้นแบบหน้าจอ W0–W19</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<style>
${rd(A('beps.css'))}
${rd(A('extra.css'))}
/* ── เฉพาะฉบับไฟล์เดียว ── */
#page-host > .page { display: block; }
#page-host > .login-wrap, #page-host > .hub { animation: none; }
body.full-page #sidebar, body.full-page #topbar { display: none !important; }
body.full-page #main { margin-left: 0 !important; }
</style>
</head>
<body>

<div id="main"><div id="page-host"></div></div>

<script>
${rd(A('logo.js'))}
</script>
<script>
${rd(A(dataFile))}
</script>
<script>
${rd(A('master-data.js'))}
</script>
<script>
${rd(A('core.js'))}
</script>

<script>
/* ══════════════════════════════════════════════════════════════════
   หน้าจอทั้งหมด — html เป็นสตริง ส่วน init() คือตรรกะของหน้านั้น
   router จะ mount ทีละหน้า ทำให้ id ที่ซ้ำกันข้ามหน้าไม่ชนกัน
   ══════════════════════════════════════════════════════════════════ */
const SCREENS = {${entries}
};

/* ---------- เปลือกหน้าจอ ---------- */
const HOST = document.getElementById('page-host');
const MAIN = document.getElementById('main');
const KEYS = Object.keys(SCREENS);
const keyOfFile = f => f.replace(/\\.html$/, '');

function sidebarHtml(cur) {
  const nav = NAV.map(grp => {
    const items = grp.items.filter(i => SCREENS[keyOfFile(i.f)]);
    if (!items.length) return '';
    const active = items.some(i => keyOfFile(i.f) === cur);
    return \`<div class="sb-grp open\${active ? ' has-active' : ''}">
      <div class="sb-group"><span class="sb-caret">▸</span><span>\${grp.g}</span>
        \${grp.role ? \`<span class="sb-role" title="เห็นเฉพาะ role: \${grp.role}">🔒</span>\` : ''}
        <span class="sb-count">\${items.length}</span></div>
      <div class="sb-sub">\${items.map(i => {
        const k = keyOfFile(i.f);
        return \`<a class="sb-item\${k === cur ? ' active' : ''}" href="#\${k}">
          <div class="sb-icon">\${i.ic}</div><span>\${i.t}</span><span class="sb-w">\${i.w}</span></a>\`;
      }).join('')}</div></div>\`;
  }).join('');

  return \`<nav id="sidebar">
    <div class="sb-logo">
      <img src="\${MSU_LOGO}" class="sb-logo-img" alt="ตราสัญลักษณ์มหาวิทยาลัยมหาสารคาม">
      <div>
        <div class="sb-logo-tag">Mahasarakham University</div>
        <div class="sb-logo-title">MSU-BEPS</div>
        <div class="sb-logo-sub">Break-Even Point System<br>ระบบวิเคราะห์จุดคุ้มทุน</div>
      </div>
    </div>
    <div class="sb-nav">\${nav}</div>
    <div class="sb-footer">
      <p>นิสิต \${fmtN(RAW.UNI.Q)} คน · \${RAW.FACS.length} คณะ/วิทยาลัย · \${RAW.PROGS.length} หลักสูตร</p>
      <div class="sb-ver">ข้อมูลอัพเดท 20260711 · รอบคำนวณ #\${RUN.id}</div>
      <div class="sb-links">
        <a class="sb-back" href="#screens">☰ สารบัญหน้าจอทั้งหมด</a>
        <a class="sb-back" href="#W0-login">🔐 หน้าเข้าสู่ระบบ (W0)</a>
      </div>
      <div class="credit-section">
        <div class="credit-label">ผู้พัฒนาระบบ</div>
        <div class="credit-item"><div class="credit-avatar">👩</div><div>
          <div class="credit-name">นางสาวสิริมา ศรีสุภาพ</div><div class="credit-role">กระบวนการ</div></div></div>
        <div class="credit-item"><div class="credit-avatar">👨</div><div>
          <div class="credit-name">นายอัครินทร์ บุพผา</div><div class="credit-role">ระบบ</div></div></div>
      </div>
    </div>
  </nav>\`;
}

function topbarHtml(s) {
  const runBar = s.run === false ? '' : \`
    <select class="tb-year" title="ปีงบประมาณ">
      <option selected>ปีงบประมาณ 2568</option><option>ปีงบประมาณ 2567</option><option>ปีงบประมาณ 2566</option>
    </select>
    <a class="tb-run" href="#W11-allocation-run" title="ผลชุดนี้มาจากรอบคำนวณไหน">
      <span class="tb-run-id">Run #\${RUN.id}</span>
      <span class="tb-run-meta">คำนวณ \${RUN.calcAt} · กติกา \${RUN.ruleVer} · ฐาน \${RUN.basis}</span>
      <span class="chip chip-g">อนุมัติแล้ว</span>
    </a>\`;

  const bmBar = s.bm === false ? '' : \`
    <div class="bm-wrap">
      <span class="bm-lbl">ฐานรายได้:</span>
      <div class="bm-toggle">
        <button class="bm-opt\${BM === 'in' ? ' on' : ''}" id="bm-in" data-bm="in">รวมเงินแผ่นดิน</button>
        <button class="bm-opt\${BM === 'ex' ? ' on' : ''}" id="bm-ex" data-bm="ex">ไม่รวมเงินแผ่นดิน</button>
      </div>
    </div>
    <div class="badge badge-navy num" id="tb-q">—</div>
    <div class="badge badge-gold" id="tb-status">—</div>\`;

  return \`<div id="topbar">
    <div class="tb-page">\${s.title}<span class="tb-wid">\${s.w}</span></div>
    <div class="tb-spacer"></div>
    \${runBar}\${bmBar}
    <a class="tb-user" href="#W0-login" title="กดเพื่อไปหน้าเข้าสู่ระบบ (W0)">
      <span class="tb-avatar">ผ</span>
      <span><b>ผศ.ดร.ปิยภัทร บุษบาบดินทร์</b><br><span class="tb-role">ผู้ดูข้อมูล · เปลี่ยนผู้ใช้</span></span>
    </a>
  </div>\`;
}

/* ---------- router ---------- */
let current = null;

function show(key) {
  const s = SCREENS[key] || SCREENS[KEYS[0]];
  key = SCREENS[key] ? key : KEYS[0];

  /* ล้างกราฟของหน้าเดิม ไม่งั้น Chart.js จะอ้าง canvas ที่ถูกถอดออกไปแล้ว */
  Object.keys(charts).forEach(id => {
    try { charts[id].destroy(); } catch (e) {}
    delete charts[id];
  });

  document.body.classList.toggle('full-page', !s.shell);

  /* sidebar สร้างใหม่เมื่อเปลี่ยนหน้า เพื่ออัปเดตเมนูที่ active */
  const old = document.getElementById('sidebar');
  if (old) old.remove();
  if (s.shell) document.body.insertAdjacentHTML('afterbegin', sidebarHtml(key));

  HOST.innerHTML = '';
  const bar = document.getElementById('topbar');
  if (bar) bar.remove();
  if (s.shell) MAIN.insertAdjacentHTML('afterbegin', topbarHtml(s));

  HOST.innerHTML = s.html;
  if (s.caveat) {
    const pg = HOST.querySelector('.page');
    if (pg) pg.insertAdjacentHTML('afterbegin', dataCaveat());
  }
  if (RAW.__sample && s.shell) {
    const pg = HOST.querySelector('.page');
    if (pg) pg.insertAdjacentHTML('afterbegin', sampleBanner());
  }

  window.renderPage = null;
  try {
    s.init();
  } catch (e) {
    console.error('หน้า ' + key + ' ทำงานผิดพลาด:', e);
  }

  /* ปุ่มสลับฐานรายได้ต้องผูกใหม่ทุกครั้งเพราะ topbar ถูกสร้างใหม่ */
  document.querySelectorAll('.bm-opt[data-bm]').forEach(b => {
    b.onclick = () => {
      BM = b.dataset.bm;
      show(key);
    };
  });
  document.querySelectorAll('.sb-group').forEach(g => {
    g.onclick = () => g.parentElement.classList.toggle('open');
  });
  refreshTopbar();

  current = key;
  document.title = 'MSU-BEPS · ' + (s.w ? s.w + ' ' : '') + s.title;
  window.scrollTo(0, 0);
}

addEventListener('hashchange', () => show(location.hash.slice(1)));
show(location.hash.slice(1) || KEYS[0]);
</script>
</body>
</html>
`;

  return out;
}

/* ---------- เขียนไฟล์ ---------- */
const onlySample = process.argv.includes('--sample');
const jobs = [{ sample: true, name: 'MSU-BEPS-mockup.html', note: 'ข้อมูลตัวอย่าง — แชร์ได้' }];
if (!onlySample) {
  jobs.push({
    sample: false,
    name: 'MSU-BEPS-mockup-ข้อมูลจริง.html',
    note: 'ข้อมูลจริง — ห้ามขึ้น git/เว็บ',
  });
}

for (const j of jobs) {
  const html = build(j);
  if (!html) {
    console.log(`  ข้าม ${j.name} — ไม่พบ assets/${j.sample ? 'data.sample.js' : 'data.js'}`);
    continue;
  }
  const out = join(HERE, '..', j.name);
  writeFileSync(out, html, 'utf8');
  console.log(
    `  ${j.name}  ${(html.length / 1024).toFixed(0)} KB  · ${screens.length} หน้าจอ · ${j.note}`,
  );
}
