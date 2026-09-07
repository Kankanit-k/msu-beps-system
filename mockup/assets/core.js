/* ==========================================================================
   MSU-BEPS — core.js
   ตัวช่วยคำนวณ + เปลือกหน้าจอ (sidebar / topbar) ที่ทุกหน้าใช้ร่วมกัน
   สูตรและ helper ทั้งหมดยกมาจาก prototype v8-1 โดยไม่แก้ค่า
   ต้องโหลดหลัง data.js และ logo.js
   ========================================================================== */

/* ============ state & helpers (ยกมาจาก v8-1) ============ */
let BM = 'in';
const F0 = v => Number(v) || 0;
const M = v => F0(v) / 1e6;
const fmtM = v => M(v).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtN = v => Math.round(F0(v)).toLocaleString('th-TH');
const fmtB = v => Math.round(F0(v)).toLocaleString('th-TH');
const short = s => s.replace('คณะ', '').replace('วิทยาลัย', 'วล.').replace('สถาบันวิจัย', 'สถ.');
const C = {
  navy: '#6d4cff', navyD: '#3730a3', gold: '#f59f00', gold2: '#fcc419',
  green: '#0ca678', red: '#e64980', grid: 'rgba(15,23,42,.06)', tick: '#64748b',
};
if (window.Chart) {
  Chart.defaults.font.family = "'Prompt','IBM Plex Sans Thai',sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = C.tick;
}

/* R / Q* / TR เปลี่ยนตามฐานรายได้ที่เลือก (สูตรที่ 5a / 5b) */
const R = o => (BM === 'in' ? F0(o.Rin) : F0(o.Rex));
const Qs = o => (BM === 'in' ? o.Qin : o.Qex);
const TRc = o => (BM === 'in' ? F0(o.TR) : F0(o.own));
const AVC = o => F0(o.AVC);
const ATC = o => (F0(o.Q) > 0 ? F0(o.TC) / F0(o.Q) : 0);
const profit = o => TRc(o) - F0(o.TC);
const status = o => {
  if (R(o) <= AVC(o)) return 'no';
  return F0(o.Q) >= Qs(o) ? 'ok' : 'loss';
};
const OUTLIER_MIN_Q = 30;

const charts = {};
function mk(id, cfg) {
  if (charts[id]) charts[id].destroy();
  const el = document.getElementById(id);
  if (el) charts[id] = new Chart(el, cfg);
}
const el = id => document.getElementById(id);

function renderInsights(id, arr) {
  const host = document.getElementById(id);
  if (!host) return;
  host.innerHTML = arr.map(x => `<li class="${x.t || 'info'}">${x.h}</li>`).join('');
}

/* ตัวช่วยวาดแถวเล็กๆ ที่ใช้ร่วมหลายหน้า (ยกมาจาก v8-1) */
const row2=(l,v,pct,col)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:8px"><span style="font-size:11px;color:var(--text2);font-weight:600"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${col};margin-right:6px"></span>${l}</span><span style="font-size:12px;font-weight:700;color:var(--text)" class="num">${v} <span style="color:var(--text3);font-size:10px">${pct}</span></span></div>`;
const trRow=(i,n,v,q,cls)=>`<tr><td style="color:var(--text3);font-weight:700">${i}</td><td style="font-weight:600">${n}</td><td class="num ${cls}" style="font-weight:700">${v}</td><td class="num" style="color:var(--text3);font-size:11px">${q}</td></tr>`;
const emptyRow=()=>`<tr><td colspan="4" style="text-align:center;color:var(--text4);padding:18px">— ไม่มีข้อมูล —</td></tr>`;

const noteTxt = () =>
  BM === 'in'
    ? 'ฐานรายได้ = เงินแผ่นดิน + เงินรายได้ (สะท้อนต้นทุนจริงทั้งหมด)'
    : 'ฐานรายได้ = เงินรายได้/ค่าธรรมเนียมเท่านั้น (สะท้อนการเลี้ยงตัวเองของหลักสูตร)';

/* ============ ผังเมนู — W0–W15 ตาม SA.md §9 ============ */
const NAV = [
  {
    g: 'ข้อมูลภาพรวม',
    items: [
      { w: 'W1', ic: '📊', t: 'ภาพรวมมหาวิทยาลัย', f: 'W1-overview.html' },
      { w: 'W4', ic: '💰', t: 'รายได้รายคณะ', f: 'W4c-revenue.html' },
      { w: 'W4', ic: '🏗', t: 'โครงสร้างต้นทุน', f: 'W4b-cost.html' },
      { w: 'W4', ic: '👤', t: 'รายได้ vs ต้นทุน/หัว', f: 'W4a-perhead.html' },
    ],
  },
  {
    g: 'เจาะลึกจุดคุ้มทุน',
    items: [
      { w: 'W2', ic: '🧭', t: 'คณะ · ระดับ · หลักสูตร', f: 'W2-breakeven.html' },
      { w: 'W3', ic: '⚖', t: 'กราฟจุดคุ้มทุน', f: 'W3-chart.html' },
    ],
  },
  {
    g: 'การวิเคราะห์',
    items: [
      { w: 'W5', ic: '🔥', t: 'Cross Analysis', f: 'W5-cross.html' },
      { w: 'W10', ic: '📐', t: 'สูตร & หลักวิชาการ', f: 'W10-method.html' },
    ],
  },
  {
    g: 'คำนวณด้วยตนเอง',
    items: [
      { w: 'W6', ic: '✏️', t: 'จุดคุ้มทุนรายคณะ', f: 'W6-scenario-faculty.html' },
      { w: 'W7', ic: '🎓', t: 'จุดคุ้มทุนรายหลักสูตร', f: 'W7-scenario-program.html' },
    ],
  },
  {
    g: 'ปันส่วนต้นทุน',
    role: 'นักวิเคราะห์',
    items: [
      { w: 'W11', ic: '⚙️', t: 'รอบคำนวณ (Run)', f: 'W11-allocation-run.html' },
      { w: 'W12', ic: '🧾', t: 'ผลตรวจยอด', f: 'W12-reconciliation.html' },
      { w: 'W13', ic: '🚩', t: 'รายการค้างตรวจ', f: 'W13-exceptions.html' },
    ],
  },
  {
    g: 'ทะเบียนข้อมูลหลัก',
    role: 'ผู้ดูแลข้อมูล',
    items: [
      { w: 'W16', ic: '🎓', t: 'ทะเบียนหลักสูตร', f: 'W16-programs.html' },
      { w: 'W17', ic: '🏛', t: 'หน่วยงาน · งวด · นิสิต', f: 'W17-master-data.html' },
      { w: 'W19', ic: '📒', t: 'ผังบัญชี 4 ระดับ', f: 'W19-erp-accounts.html' },
      { w: 'W8', ic: '💳', t: 'ค่าธรรมเนียมการศึกษา', f: 'W8-tuition.html' },
      { w: 'W9', ic: '📥', t: 'ข้อมูลต้นทุน & นำเข้า', f: 'W9-cost-data.html' },
    ],
  },
  {
    g: 'ตั้งค่าระบบ',
    role: 'ผู้ดูแลระบบ',
    items: [
      { w: 'W14', ic: '🗂', t: 'กติกาผังบัญชี TFC/TVC', f: 'W14-account-rules.html' },
      { w: 'W15', ic: '🎛', t: 'นโยบายการคำนวณ', f: 'W15-settings.html' },
      { w: 'W18', ic: '🔑', t: 'ผู้ใช้และสิทธิ์', f: 'W18-users.html' },
    ],
  },
];

/* รอบคำนวณที่กำลังดูอยู่ — SA §9.2 ข้อ 9: ทุกหน้าวิเคราะห์ต้องบอกว่าเป็นผลของ run ไหน */
const RUN = {
  id: 1042,
  year: 2568,
  calcAt: '11 ก.ค. 2569 14:32',
  state: 'APPROVED',
  basis: 'ACTUAL',
  ruleVer: 'v3',
};

/* ============ เปลือกหน้าจอ ============
   buildShell({ w, title, bm, run })
     w     — รหัสหน้าจอ เช่น 'W1' (ใช้ไฮไลต์เมนู)
     title — ชื่อหน้าบน topbar
     bm    — true = แสดงปุ่มสลับฐานรายได้ (หน้าวิเคราะห์ W1–W5)
     run   — true = แสดงแถบรอบคำนวณ + ปีงบประมาณ
   หน้าที่ต้อง re-render เมื่อสลับฐานรายได้ ให้ประกาศ window.renderPage
   ================================================================ */
function buildShell(opt) {
  const cur = opt.f || location.pathname.split('/').pop();

  const nav = NAV.map(grp => {
    const hasActive = grp.items.some(i => i.f === cur);
    const items = grp.items
      .map(
        i => `<a class="sb-item${i.f === cur ? ' active' : ''}" href="${i.f}">
        <div class="sb-icon">${i.ic}</div><span>${i.t}</span><span class="sb-w">${i.w}</span></a>`
      )
      .join('');
    return `<div class="sb-grp open${hasActive ? ' has-active' : ''}">
      <div class="sb-group"><span class="sb-caret">▸</span><span>${grp.g}</span>
        ${grp.role ? `<span class="sb-role" title="เห็นเฉพาะ role: ${grp.role}">🔒</span>` : ''}
        <span class="sb-count">${grp.items.length}</span></div>
      <div class="sb-sub">${items}</div></div>`;
  }).join('');

  const sidebar = `<nav id="sidebar">
    <div class="sb-logo">
      <img src="${MSU_LOGO}" class="sb-logo-img" alt="ตราสัญลักษณ์มหาวิทยาลัยมหาสารคาม">
      <div>
        <div class="sb-logo-tag">Mahasarakham University</div>
        <div class="sb-logo-title">MSU-BEPS</div>
        <div class="sb-logo-sub">Break-Even Point System<br>ระบบวิเคราะห์จุดคุ้มทุน</div>
      </div>
    </div>
    <div class="sb-nav">${nav}</div>
    <div class="sb-footer">
      <p id="sb-stats">นิสิต ${fmtN(RAW.UNI.Q)} คน · 20 คณะ/วิทยาลัย · 230 หลักสูตร</p>
      <div class="sb-ver">ข้อมูลอัพเดท 20260711 · รอบคำนวณ #${RUN.id}</div>
      <div class="sb-links">
        <a class="sb-back" href="screens.html">☰ สารบัญหน้าจอทั้งหมด</a>
        <a class="sb-back" href="W0-login.html">🔐 หน้าเข้าสู่ระบบ (W0)</a>
      </div>
      <div class="credit-section">
        <div class="credit-label">ผู้พัฒนาระบบ</div>
        <div class="credit-item"><div class="credit-avatar">👩</div><div>
          <div class="credit-name">นางสาวสิริมา ศรีสุภาพ</div><div class="credit-role">กระบวนการ</div></div></div>
        <div class="credit-item"><div class="credit-avatar">👨</div><div>
          <div class="credit-name">นายอัครินทร์ บุพผา</div><div class="credit-role">ระบบ</div></div></div>
      </div>
    </div>
  </nav>`;

  const runBar = opt.run === false ? '' : `
    <select class="tb-year" id="tb-year" title="ปีงบประมาณ">
      <option value="2568" selected>ปีงบประมาณ 2568</option>
      <option value="2567">ปีงบประมาณ 2567</option>
      <option value="2566">ปีงบประมาณ 2566</option>
    </select>
    <a class="tb-run" href="W11-allocation-run.html" title="ผลชุดนี้มาจากรอบคำนวณไหน — กดเพื่อดูคอนโซล Run">
      <span class="tb-run-id">Run #${RUN.id}</span>
      <span class="tb-run-meta">คำนวณ ${RUN.calcAt} · กติกา ${RUN.ruleVer} · ฐาน ${RUN.basis}</span>
      <span class="chip chip-g">อนุมัติแล้ว</span>
    </a>`;

  const bmBar = opt.bm === false ? '' : `
    <div class="bm-wrap">
      <span class="bm-lbl">ฐานรายได้:</span>
      <div class="bm-toggle">
        <button class="bm-opt on" id="bm-in" data-bm="in" title="R = (เงินแผ่นดิน + เงินรายได้) ÷ จำนวนนิสิต">รวมเงินแผ่นดิน</button>
        <button class="bm-opt" id="bm-ex" data-bm="ex" title="R = เงินรายได้ ÷ จำนวนนิสิต">ไม่รวมเงินแผ่นดิน</button>
      </div>
    </div>
    <div class="badge badge-navy num" id="tb-q">—</div>
    <div class="badge badge-gold" id="tb-status">—</div>`;

  const topbar = `<div id="topbar">
    <div class="tb-page">${opt.title}<span class="tb-wid">${opt.w}</span></div>
    <div class="tb-spacer"></div>
    ${runBar}${bmBar}
    <a class="tb-user" href="W0-login.html"
       title="ผู้ใช้ที่เข้าสู่ระบบ · สิทธิ์กำหนดว่าเห็นเมนูใดบ้าง — กดเพื่อไปหน้าเข้าสู่ระบบ (W0)">
      <span class="tb-avatar">ผ</span>
      <span><b>ผศ.ดร.ปิยภัทร บุษบาบดินทร์</b><br><span class="tb-role">ผู้ดูข้อมูล · เปลี่ยนผู้ใช้</span></span>
    </a>
  </div>`;

  document.body.insertAdjacentHTML('afterbegin', sidebar);
  const main = document.getElementById('main');
  main.insertAdjacentHTML('afterbegin', topbar);

  /* ถ้ากำลังใช้ชุดข้อมูลตัวอย่าง ต้องบอกให้ชัดว่าตัวเลขไม่ใช่ของจริง */
  if (RAW.__sample) {
    const page = document.querySelector('.page');
    if (page) page.insertAdjacentHTML('afterbegin', sampleBanner());
  }

  document.querySelectorAll('.sb-group').forEach(g => {
    g.onclick = () => g.parentElement.classList.toggle('open');
  });
  document.querySelectorAll('.bm-opt[data-bm]').forEach(b => {
    b.onclick = () => {
      BM = b.dataset.bm;
      document.getElementById('bm-in').classList.toggle('on', BM === 'in');
      document.getElementById('bm-ex').classList.toggle('on', BM === 'ex');
      refreshTopbar();
      if (window.renderPage) window.renderPage();
    };
  });
  refreshTopbar();
}

function refreshTopbar() {
  const U = RAW.UNI;
  const q = document.getElementById('tb-q');
  if (!q) return;
  q.textContent = fmtN(U.Q) + ' นิสิต';
  const p = profit(U);
  const s = document.getElementById('tb-status');
  s.textContent = (p >= 0 ? 'ส่วนเกิน ' : 'ขาดทุน ') + fmtM(Math.abs(p)) + ' ลบ.';
  s.className = 'badge';
  s.style.background = p >= 0 ? 'var(--green3)' : 'var(--red3)';
  s.style.color = p >= 0 ? 'var(--green)' : 'var(--red)';
}

/* แถบเตือนว่ากำลังดูชุดข้อมูลตัวอย่าง ไม่ใช่ตัวเลขจริงของมหาวิทยาลัย */
function sampleBanner() {
  return `<div class="caveat" style="background:var(--red3);border-color:rgba(194,24,91,.25);
      border-left-color:var(--red2);color:var(--red)">
    <span>🔢</span><span><b>ตัวเลขในหน้านี้เป็นข้อมูลตัวอย่าง ไม่ใช่ของจริง</b> —
    repo นี้ไม่เก็บข้อมูลการเงินของมหาวิทยาลัย (ดูเหตุผลใน <code>.gitignore</code>)
    จึงโหลด <code>assets/data.sample.js</code> ที่ตัวเลขถูกสุ่มรบกวนแล้ว
    ความสัมพันธ์ทุกสูตรยังถูกต้อง แต่<b>ห้ามนำตัวเลขไปอ้างอิง</b>
    · ถ้ามี <code>assets/data.js</code> ในเครื่อง หน้าจอจะแสดงตัวเลขจริงเองโดยอัตโนมัติ</span></div>`;
}

/* แถบเตือนข้อจำกัดของข้อมูล — ค่าเสื่อมราคาอาคารยังไม่ครบ
   ต้องติดไว้ทุกหน้าที่แสดงส่วนเกิน/Q* ไม่ให้ผู้บริหารอ่านเป็นตัวเลขสุดท้าย */
function dataCaveat() {
  const p = profit(RAW.UNI);
  return `<div class="caveat"><span>⚠️</span><span><b>ข้อจำกัดของข้อมูลชุดนี้</b> — ค่าเสื่อมราคาอาคารยังไม่ครบ
    (ฟิลด์ <code>dep</code> รวม ${fmtM(RAW.UNI.dep)} ลบ. มีเฉพาะครุภัณฑ์) TFC และ TC จึงต่ำกว่าความจริง
    ส่วนเกิน ${p >= 0 ? '+' : '−'}${fmtM(Math.abs(p))} ลบ. <b>สูงเกินจริง</b>
    และ Q* ทุกระดับ<b>ต่ำกว่าที่ควรเป็น</b>
    — ดูรายการค้างที่ <a href="W13-exceptions.html">รายการค้างตรวจ</a></span></div>`;
}
