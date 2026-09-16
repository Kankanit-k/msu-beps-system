/* ==========================================================================
   MSU-BEPS — W7 ส่วนที่ 2: วิเคราะห์สัดส่วนจำนวนนิสิตเพื่อหาจุดคุ้มทุน
   ต้องโหลดหลัง core.js และ page-scenario-program.js

   พอร์ตจาก packages/calc-engine/src/admission-mix.ts แบบหนึ่งต่อหนึ่ง
   (mockup เป็น static HTML ไม่มี bundler จึงคัดลอกตรรกะมา ไม่ได้ import)
   ชื่อทุกตัวขึ้นต้นด้วย am/AM เพราะไฟล์นี้ถูกรวมเข้า scope เดียวกับ
   page-scenario-program.js ตอนสร้างฉบับไฟล์เดียว

   ⚠ Q* รายประเภทขึ้นกับส่วนผสมที่กรอกเข้ามา — TFC เป็นก้อนเดียวของทั้งหลักสูตร
     ต้องปันตามสัดส่วนหัวนิสิตก่อน เปลี่ยนส่วนผสมแล้วค่านี้เปลี่ยน
     คำถาม "ตรึงไทยไว้ ต้องรับต่างชาติกี่คน" ใช้ amSolveTarget() ซึ่งเป็น goal-seek
   ========================================================================== */

const amCeil = (x) => Math.ceil(x - 1e-9);
const amFmt2 = (v) =>
  Number(v).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ชุดประเภทนิสิตมาตรฐาน — ตรงกับ Masterโครงสร้าง!J:M ของไฟล์ต้นฉบับ */
function amStdTypes(level) {
  const grad = level === 'ปริญญาโท' || level === 'ปริญญาเอก';
  return grad
    ? [
        { code: 'TH_IN', label: 'ในเวลา (นิสิตไทย)' },
        { code: 'TH_OUT', label: 'นอกเวลา (นิสิตไทย)' },
        { code: 'INT_IN', label: 'ในเวลา (นิสิตต่างชาติ)' },
        { code: 'INT_OUT', label: 'นอกเวลา (นิสิตต่างชาติ)' },
      ]
    : [
        { code: 'TH_REG', label: 'ปกติ (นิสิตไทย)' },
        { code: 'TH_SPE', label: 'พิเศษ (นิสิตไทย)' },
        { code: 'INT_REG', label: 'ปกติ (นิสิตต่างชาติ)' },
        { code: 'INT_SPE', label: 'พิเศษ (นิสิตต่างชาติ)' },
      ];
}

let amRows = [];
let amLast = null;
let amChart = null;

/* ---------------- ตรรกะ (ตรงกับ calc-engine) ---------------- */

function amResolveHeadcount(row) {
  return row.basis === 'headcount'
    ? Number(row.headcount) || 0
    : (Number(row.intakePerYear) || 0) * (Number(row.durationYears) || 0);
}

/* รายได้ต่อหัวต่อปี — BM คือโหมดฐานรายได้ของทั้งระบบ ('in' = รวมเงินแผ่นดิน) */
function amRevenuePerHead(row, mode) {
  const gov = mode === 'in' ? Number(row.govPerTerm) || 0 : 0;
  return ((Number(row.feePerTerm) || 0) + gov) * (Number(row.termsPerYear) || 0);
}

function amCalcMix(rows, tfc, avc, mode) {
  const heads = rows.map(amResolveHeadcount);
  const total = heads.reduce((a, b) => a + b, 0);

  const out = rows.map((row, i) => {
    const q = heads[i];
    const share = total > 0 ? q / total : 0;
    const rHead = amRevenuePerHead(row, mode);
    const allocTfc = tfc * share;
    const tvc = avc * q;
    const cm = rHead - avc;
    /* CM ≤ 0 → ใช้ TC ÷ R ตามนโยบาย cm_le_zero_policy เหมือนทุกหน้าจอ */
    const qStar = cm > 0 ? amCeil(allocTfc / cm) : rHead > 0 ? amCeil((allocTfc + tvc) / rHead) : null;
    return {
      code: row.code,
      label: row.label,
      q,
      share,
      rHead,
      revenue: rHead * q,
      allocTfc,
      tvc,
      cm,
      full: cm <= 0,
      qStar,
      contribution: rHead * q - allocTfc - tvc,
    };
  });

  const revenue = out.reduce((a, r) => a + r.revenue, 0);
  const totalTvc = avc * total;
  const totalR = total > 0 ? revenue / total : 0;
  const totalCm = totalR - avc;
  const totalQStar =
    total <= 0
      ? null
      : totalCm > 0
        ? amCeil(tfc / totalCm)
        : totalR > 0
          ? amCeil((tfc + totalTvc) / totalR)
          : null;

  return {
    rows: out,
    total: {
      q: total,
      revenue,
      tfc,
      tvc: totalTvc,
      r: totalR,
      avc,
      cm: totalCm,
      qStar: totalQStar,
      full: totalCm <= 0,
      profit: revenue - tfc - totalTvc,
    },
  };
}

/**
 * goal-seek — ตรึงประเภทอื่นไว้ ต้องรับประเภทนี้กี่คนจึงคุ้มทุนทั้งหลักสูตร
 *   รายได้อื่น + R_t · x = TFC + AVC · (Q_อื่น + x)
 *   x = (TFC + AVC · Q_อื่น − รายได้อื่น) ÷ (R_t − AVC)
 * ไม่ต้องปันส่วน TFC จึงไม่ขึ้นกับส่วนผสมที่กรอกเข้ามา
 */
function amSolveTarget(rows, tfc, avc, mode, code) {
  const target = rows.find((r) => r.code === code);
  if (!target) return null;
  const others = rows.filter((r) => r !== target);
  const oh = others.reduce((a, r) => a + amResolveHeadcount(r), 0);
  const orev = others.reduce((a, r) => a + amRevenuePerHead(r, mode) * amResolveHeadcount(r), 0);
  const cm = amRevenuePerHead(target, mode) - avc;
  const shortfall = tfc + avc * oh - orev;
  const planned = amResolveHeadcount(target);

  if (shortfall <= 0) return { code, required: 0, status: 'already', planned, gap: planned };
  if (cm <= 0) return { code, required: null, status: 'unreachable', planned, gap: null };
  const required = amCeil(shortfall / cm);
  return { code, required, status: 'normal', planned, gap: planned - required };
}

/* ---------------- ตารางกรอกแผนการรับ ---------------- */

function amNewRow(code, label) {
  return {
    code,
    label,
    basis: 'headcount',
    headcount: 0,
    intakePerYear: 0,
    durationYears: 4,
    termsPerYear: Number((document.getElementById('am-terms') || {}).value) || 2,
    feePerTerm: 0,
    govPerTerm: 0,
  };
}

function amFillStandard() {
  const level = (document.getElementById('pg-level') || {}).value || 'ปริญญาตรี';
  amRows = amStdTypes(level).map((t) => amNewRow(t.code, t.label));
  amSeedFromReference();
  amRenderRows();
}

/* เติมจำนวนนิสิตจริงของหลักสูตรอ้างอิงลงแถวแรก เพื่อให้เริ่มจากของจริงแล้วค่อยปรับ */
function amSeedFromReference() {
  const q = Number((document.getElementById('pg-q') || {}).value) || 0;
  if (q > 0 && amRows.length) amRows[0].headcount = q;
}

function amAddRow() {
  const n = amRows.length + 1;
  amRows.push(amNewRow('ROW' + n, 'ประเภทที่ ' + n));
  amRenderRows();
}

function amAddContinuing() {
  if (amRows.some((r) => r.code === 'CONT2')) return;
  const row = amNewRow('CONT2', 'ต่อเนื่อง 2 ปี');
  /* หลักสูตรต่อเนื่องต่างที่ "จำนวนปี" ไม่ใช่ตัวนิสิต จึงกรอกแบบรับต่อปี × 2 ปี */
  row.basis = 'intake';
  row.durationYears = 2;
  amRows.push(row);
  amRenderRows();
}

function amDelRow(i) {
  amRows.splice(i, 1);
  amRenderRows();
}

function amSetField(i, field, value) {
  const row = amRows[i];
  if (!row) return;
  row[field] = field === 'basis' || field === 'label' || field === 'code' ? value : Number(value) || 0;
  /* เปลี่ยนแบบกรอกต้องสลับช่อง "จำนวน"/"ปี" จึงเรนเดอร์ใหม่ทั้งตาราง
     ส่วนการพิมพ์ตัวเลขห้ามเรนเดอร์ใหม่ (ช่องจะเสียโฟกัส) — อัปเดตเฉพาะคอลัมน์ที่คำนวณมา */
  if (field === 'basis') {
    amRenderRows();
    return;
  }
  const cell = document.getElementById('am-head-' + i);
  if (cell) cell.textContent = fmtN(amResolveHeadcount(row));
}

function amRenderRows() {
  const el = document.getElementById('am-rows');
  if (!el) return;
  if (!amRows.length) {
    el.innerHTML =
      '<div style="padding:18px;text-align:center;color:var(--text4);font-size:12px">ยังไม่มีแผนการรับ — กด “เติมประเภทมาตรฐาน” เพื่อเริ่ม</div>';
    return;
  }
  const inp = (i, f, v, w) =>
    `<input class="inp" style="padding:5px 8px;font-size:11.5px;width:${w}px" type="number" min="0" value="${v}" oninput="amSetField(${i},'${f}',this.value)">`;

  el.innerHTML =
    '<div style="overflow-x:auto"><table class="tbl" style="min-width:960px"><thead><tr>' +
    '<th>ประเภทนิสิต</th><th>แบบกรอก</th><th class="num">จำนวน</th><th class="num">ปี</th>' +
    '<th class="num">เทอม/ปี</th><th class="num">ค่าธรรมเนียม/เทอม</th><th class="num">เงินแผ่นดิน/เทอม</th>' +
    '<th class="num">นิสิตคงค้าง</th><th></th></tr></thead><tbody>' +
    amRows
      .map((r, i) => {
        const isIntake = r.basis === 'intake';
        return (
          `<tr><td><input class="inp" style="padding:5px 8px;font-size:11.5px;width:180px" type="text" value="${r.label}" oninput="amSetField(${i},'label',this.value)"></td>` +
          `<td><select class="inp" style="padding:5px 8px;font-size:11.5px;width:110px" onchange="amSetField(${i},'basis',this.value)">` +
          `<option value="headcount"${isIntake ? '' : ' selected'}>คงค้างรวม</option>` +
          `<option value="intake"${isIntake ? ' selected' : ''}>รับต่อปี</option></select></td>` +
          `<td class="num">${inp(i, isIntake ? 'intakePerYear' : 'headcount', isIntake ? r.intakePerYear : r.headcount, 80)}</td>` +
          `<td class="num">${isIntake ? inp(i, 'durationYears', r.durationYears, 55) : '<span style="color:var(--text4)">—</span>'}</td>` +
          `<td class="num">${inp(i, 'termsPerYear', r.termsPerYear, 55)}</td>` +
          `<td class="num">${inp(i, 'feePerTerm', r.feePerTerm, 100)}</td>` +
          `<td class="num">${inp(i, 'govPerTerm', r.govPerTerm, 100)}</td>` +
          `<td class="num" id="am-head-${i}" style="font-weight:700;color:var(--navy2)">${fmtN(amResolveHeadcount(r))}</td>` +
          `<td style="text-align:right"><button onclick="amDelRow(${i})" title="ลบแถว" style="border:1px solid var(--red3);background:var(--red3);color:var(--red2);border-radius:8px;padding:3px 9px;cursor:pointer;font-family:inherit;font-weight:700">×</button></td></tr>`
        );
      })
      .join('') +
    '</tbody></table></div>';
}

/* ---------------- คำนวณและแสดงผล ---------------- */

function amRun() {
  const q = Number((document.getElementById('pg-q') || {}).value) || 0;
  const tfc = Number((document.getElementById('pg-tfc') || {}).value) || 0;
  const tvc = Number((document.getElementById('pg-tvc') || {}).value) || 0;
  const avcOverride = Number((document.getElementById('am-avc') || {}).value) || 0;
  const avc = avcOverride > 0 ? avcOverride : q > 0 ? tvc / q : 0;

  if (!amRows.length) {
    alert('กรุณาเติมแผนการรับนิสิตอย่างน้อย 1 ประเภทก่อน');
    return;
  }
  if (tfc <= 0 || avc <= 0) {
    alert(
      'ต้องมี TFC และต้นทุนผันแปรต่อหัว (AVC) ก่อน\n' +
        'กรอก TFC/TVC/จำนวนนิสิตในการ์ดด้านบน หรือระบุ AVC เองในช่อง “ต้นทุนผันแปรต่อหัว”',
    );
    return;
  }
  const codes = amRows.map((r) => r.code);
  if (new Set(codes).size !== codes.length) {
    alert('มีรหัสประเภทนิสิตซ้ำกัน — แผนการรับต้องมีหนึ่งแถวต่อหนึ่งประเภท');
    return;
  }

  amLast = amCalcMix(amRows, tfc, avc, BM);
  amRenderResult(avc);
}

function amRenderResult(avc) {
  const box = document.getElementById('am-result');
  if (!box || !amLast) return;
  box.style.display = 'block';

  const t = amLast.total;
  const modeTxt = BM === 'in' ? 'รวมเงินแผ่นดิน' : 'ไม่รวมเงินแผ่นดิน';
  const stats = [
    ['นิสิตตามแผน', 'var(--navy2)', fmtN(t.q) + ' คน'],
    ['จุดคุ้มทุนรวม (Q*)', 'var(--red)', t.qStar ? fmtN(t.qStar) + ' คน' : '—'],
    ['รายรับรวม/ปี', 'var(--navy2)', MM(t.revenue, 3) + ' ล.'],
    ['ต้นทุนรวม/ปี', 'var(--text)', MM(t.tfc + t.tvc, 3) + ' ล.'],
    ['AVC', 'var(--gold)', fmtB(avc) + ' บ./คน'],
    ['ส่วนเกิน/ขาด', t.profit >= 0 ? 'var(--green)' : 'var(--red)', MM(t.profit, 3) + ' ล.'],
  ];

  const rowHtml = amLast.rows
    .map(
      (r) => `<tr>
      <td style="font-weight:600">${r.label}</td>
      <td class="num">${fmtN(r.q)}</td>
      <td class="num">${(r.share * 100).toFixed(2)}%</td>
      <td class="num">${fmtB(r.rHead)}</td>
      <td class="num">${MM(r.revenue, 2)}</td>
      <td class="num">${MM(r.allocTfc, 2)}</td>
      <td class="num">${MM(r.tvc, 2)}</td>
      <td class="num" style="color:${r.cm > 0 ? 'var(--green)' : 'var(--red)'}">${fmtB(r.cm)}</td>
      <td class="num" style="font-weight:700">${r.qStar === null ? '—' : fmtN(r.qStar)}${r.full ? ' <span style="font-size:8px;font-weight:800;padding:1px 4px;border-radius:6px;background:var(--gold4);color:var(--gold)">TC÷R</span>' : ''}</td>
      <td class="num ${r.contribution >= 0 ? 'pos' : 'neg'}" style="font-weight:700">${amFmt2(r.contribution / 1e6)}</td>
    </tr>`,
    )
    .join('');

  const sumRow = `<tr style="background:var(--bg2);font-weight:800">
      <td>รวม</td><td class="num">${fmtN(t.q)}</td><td class="num">100.00%</td>
      <td class="num">${fmtB(t.r)}</td><td class="num">${MM(t.revenue, 2)}</td>
      <td class="num">${MM(t.tfc, 2)}</td><td class="num">${MM(t.tvc, 2)}</td>
      <td class="num" style="color:${t.cm > 0 ? 'var(--green)' : 'var(--red)'}">${fmtB(t.cm)}</td>
      <td class="num">${t.qStar ? fmtN(t.qStar) : '—'}</td>
      <td class="num ${t.profit >= 0 ? 'pos' : 'neg'}">${amFmt2(t.profit / 1e6)}</td></tr>`;

  const verdict =
    t.qStar === null
      ? '<span style="color:var(--text3)">คำนวณจุดคุ้มทุนไม่ได้ — ตรวจค่าธรรมเนียมและจำนวนนิสิต</span>'
      : t.q >= t.qStar
        ? `<span style="color:var(--green);font-weight:800">✓ แผนการรับนี้ผ่านจุดคุ้มทุน เกินมา ${fmtN(t.q - t.qStar)} คน</span>`
        : `<span style="color:var(--red);font-weight:800">⚠ แผนการรับนี้ยังไม่ถึงจุดคุ้มทุน ขาดอีก ${fmtN(t.qStar - t.q)} คน</span>`;

  box.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-head"><div><div class="card-title"><span class="dot" style="background:var(--navy2)"></span>ผลแยกตามแผนการรับนิสิต</div>
        <div class="card-sub">ฐานรายได้: ${modeTxt} · สลับที่แถบด้านบนแล้วตารางนี้คำนวณใหม่ให้เอง</div></div></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:14px">
        ${stats.map(([l, c, v]) => `<div class="stat-box" style="padding:9px 12px"><div class="stat-lbl">${l}</div><div class="stat-val" style="color:${c};font-size:12px">${v}</div></div>`).join('')}
      </div>
      <div style="font-size:12px;margin-bottom:12px">${verdict}</div>
      <div style="overflow-x:auto"><table class="tbl" style="min-width:1000px">
        <thead><tr><th>ประเภทนิสิต</th><th class="num">นิสิต</th><th class="num">สัดส่วน</th>
          <th class="num">รายรับ/หัว/ปี</th><th class="num">รายรับ (ล.)</th><th class="num">TFC ปันส่วน (ล.)</th>
          <th class="num">TVC (ล.)</th><th class="num">CM/หัว</th><th class="num">Q* ของส่วนที่ปันมา</th>
          <th class="num">ส่วนเกิน (ล.)</th></tr></thead>
        <tbody>${rowHtml}${sumRow}</tbody></table></div>
      <div style="margin-top:12px;font-size:10.5px;line-height:1.85;color:var(--text3);background:var(--gold4);border:1px solid var(--gold3);border-radius:9px;padding:10px 13px">
        <b style="color:var(--gold)">⚠ อ่านคอลัมน์ “Q* ของส่วนที่ปันมา” ให้ถูก</b><br>
        TFC เป็นก้อนเดียวของทั้งหลักสูตร ต้องปันตามสัดส่วนหัวนิสิตก่อนจึงพูดถึงจุดคุ้มทุนรายประเภทได้
        ค่านี้จึง <b>ขึ้นกับส่วนผสมที่กรอกไว้</b> เปลี่ยนสัดส่วนแล้วค่าเปลี่ยนตาม ไม่ใช่ค่าคงที่ของกลุ่ม<br>
        ถ้าคำถามคือ “ตรึงกลุ่มอื่นไว้ ต้องรับกลุ่มนี้กี่คนจึงคุ้ม” ให้ดูช่องหาเป้าหมายด้านล่าง ซึ่งไม่ต้องปันส่วน TFC<br>
        <b style="color:var(--gold)">⚠ “ส่วนเกิน” ไม่ใช่จุดคุ้มทุน</b> — ชีต Excel เดิมตั้งชื่อค่านี้ว่า “จุดคุ้มทุนของหลักสูตร” ซึ่งผิด
      </div>
    </div>

    <div class="g2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-head"><div><div class="card-title"><span class="dot" style="background:var(--gold)"></span>หาเป้าหมายการรับ (Goal Seek)</div>
          <div class="card-sub">ตรึงประเภทอื่นไว้ตามแผน แล้วหาว่าประเภทนี้ต้องรับกี่คน</div></div></div>
        <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px">
          <div style="flex:1;min-width:200px"><label class="inp-label">ประเภทที่ให้ปรับ</label>
            <select id="am-target" class="inp" onchange="amGoalSeek()">
              ${amLast.rows.map((r) => `<option value="${r.code}">${r.label}</option>`).join('')}
            </select></div>
          <button class="btn-primary" onclick="amGoalSeek()" style="max-width:150px">▶ หาเป้าหมาย</button>
        </div>
        <div id="am-goal"></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--navy2)"></span>ส่วนเกินรายประเภท (ล้านบาท)</div></div>
        <div class="ch" style="height:250px"><canvas id="am-chart"></canvas></div>
      </div>
    </div>`;

  amGoalSeek();
  amDrawChart();
}

function amGoalSeek() {
  const el = document.getElementById('am-goal');
  const sel = document.getElementById('am-target');
  if (!el || !sel || !amLast) return;

  const q = Number((document.getElementById('pg-q') || {}).value) || 0;
  const tvc = Number((document.getElementById('pg-tvc') || {}).value) || 0;
  const tfc = Number((document.getElementById('pg-tfc') || {}).value) || 0;
  const avcOverride = Number((document.getElementById('am-avc') || {}).value) || 0;
  const avc = avcOverride > 0 ? avcOverride : q > 0 ? tvc / q : 0;

  const out = amSolveTarget(amRows, tfc, avc, BM, sel.value);
  if (!out) {
    el.innerHTML = '';
    return;
  }
  const row = amRows.find((r) => r.code === out.code);
  const name = row ? row.label : out.code;

  if (out.status === 'unreachable') {
    el.innerHTML = `<div style="border:1.5px solid var(--red3);background:var(--red3);border-radius:10px;padding:14px">
      <div style="font-weight:800;color:var(--red);margin-bottom:6px">⚠ รับเท่าไหร่ก็ไม่คุ้ม</div>
      <div style="font-size:11.5px;line-height:1.8;color:var(--text2)">รายรับต่อหัวของ <b>${name}</b> ไม่เกินต้นทุนผันแปรต่อหัว (AVC ${fmtB(avc)} บ.)
      ทุกคนที่รับเพิ่มทำให้ขาดทุนมากขึ้น — ต้องขึ้นค่าธรรมเนียมหรือลดต้นทุนผันแปรก่อน</div></div>`;
    return;
  }
  if (out.status === 'already') {
    el.innerHTML = `<div style="border:1.5px solid var(--green3);background:var(--green3);border-radius:10px;padding:14px">
      <div style="font-weight:800;color:var(--green);margin-bottom:6px">✓ ไม่ต้องรับ ${name} ก็คุ้มทุนแล้ว</div>
      <div style="font-size:11.5px;line-height:1.8;color:var(--text2)">ประเภทอื่นตามแผนคุ้มต้นทุนทั้งหลักสูตรอยู่แล้ว
      · แผนปัจจุบันตั้งไว้ <b>${fmtN(out.planned)}</b> คน</div></div>`;
    return;
  }

  const ok = out.gap >= 0;
  el.innerHTML = `<div style="border:1.5px solid ${ok ? 'var(--green3)' : 'var(--red3)'};background:${ok ? 'var(--green3)' : 'var(--red3)'};border-radius:10px;padding:14px">
    <div style="font-size:11px;color:var(--text3);margin-bottom:4px">ต้องรับ <b>${name}</b></div>
    <div style="font-size:26px;font-weight:800;color:var(--navy2);line-height:1.2">${fmtN(out.required)} <span style="font-size:13px;font-weight:600">คน</span></div>
    <div style="font-size:11.5px;line-height:1.9;color:var(--text2);margin-top:8px">
      แผนปัจจุบัน <b>${fmtN(out.planned)}</b> คน ·
      <b style="color:${ok ? 'var(--green)' : 'var(--red)'}">${ok ? 'เกินพอ +' + fmtN(out.gap) : 'ยังขาด ' + fmtN(-out.gap)} คน</b><br>
      <span style="color:var(--text4)">คำนวณโดยตรึงประเภทอื่นไว้ตามแผน จึงไม่ขึ้นกับการปันส่วน TFC</span></div></div>`;
}

function amDrawChart() {
  if (!amLast || typeof mk !== 'function') return;
  const labels = amLast.rows.map((r) => r.label);
  const data = amLast.rows.map((r) => r.contribution / 1e6);
  amChart = mk('am-chart', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'ส่วนเกิน',
          data,
          backgroundColor: data.map((v) => (v >= 0 ? C.green : C.red)),
          borderRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => amFmt2(c.parsed.y) + ' ล้านบาท' } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { grid: { color: C.grid }, title: { display: true, text: 'ล้านบาท' } },
      },
    },
  });
}

/* สลับฐานรายได้ที่แถบด้านบน → core.js เรียก window.renderPage()
   ต้องคำนวณใหม่ ไม่ใช่ปล่อยให้ตารางค้างตัวเลขของฐานเดิมโดยไม่มีอะไรบอก
   มีการ์ดยาม: ถ้าไม่ได้อยู่หน้า W7 แล้ว (ฉบับรวมไฟล์เดียวสลับหน้าได้) ให้ไม่ทำอะไร */
window.renderPage = function () {
  if (!document.getElementById('am-result')) return;
  if (amLast) amRun();
};

/* ฉบับรวมไฟล์เดียว (make-single-file.mjs) ห่อสคริปต์ของแต่ละหน้าไว้ใน init() ของตัวเอง
   แล้ว export เฉพาะชื่อที่ "ปรากฏใน on* handler ของ HTML แบบสถิต" ออกมาที่ window
   แต่ handler ของตารางแผนการรับถูกสร้างตอนรันไทม์ จึงไม่ถูกจับ ต้องประกาศเอง
   ไม่อย่างนั้นช่องกรอกกับปุ่มลบจะตายเงียบๆ เฉพาะในฉบับไฟล์เดียว */
try {
  window.amSetField = amSetField;
  window.amDelRow = amDelRow;
  window.amGoalSeek = amGoalSeek;
} catch (e) {
  /* ไม่มี window (เช่นถูก import ในเทสต์) — ข้ามไป */
}
