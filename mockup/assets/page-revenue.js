/* ==========================================================================
   MSU-BEPS — W4 รายได้รายคณะ
   ยกมาจาก prototype v8-1 โดยไม่แก้สูตร · ต้องโหลดหลัง core.js
   ========================================================================== */

/* ============ REVENUE ============ */
function renderRevenue(){
  const U=RAW.UNI,F=RAW.FACS;
  document.getElementById('rev-note').textContent=noteTxt();
  document.getElementById('rk1l').textContent=BM==='in'?'รายได้รวม (TR)':'เงินรายได้ (ค่าธรรมเนียม)';
  document.getElementById('rk1').textContent=fmtM(TRc(U));
  document.getElementById('rk2').textContent=fmtM(U.st);
  document.getElementById('rk3').textContent=fmtM(U.own);
  document.getElementById('rk4').textContent=fmtB(R(U));
  document.getElementById('rth-tr').textContent=BM==='in'?'TR':'เงินรายได้';
  const labels=F.map(f=>short(f.name));
  mk('rev-main',{type:'bar',data:{labels,datasets:[
    {label:'เงินรายได้',data:F.map(f=>M(f.own)),backgroundColor:C.navy,borderRadius:3,stack:'s'},
    {label:'เงินแผ่นดิน',data:F.map(f=>M(f.st)),backgroundColor:C.gold2,borderRadius:3,stack:'s'}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.x.toLocaleString('th-TH',{maximumFractionDigits:1})+' ลบ.'}}},
      scales:{x:{stacked:true,grid:{color:C.grid}},y:{stacked:true,grid:{display:false},ticks:{font:{size:9.5}}}}}});
  document.getElementById('rev-tbl').innerHTML=F.map((f,i)=>{
    const sur=profit(f);
    return `<tr><td style="color:var(--text3);font-weight:700">${i+1}</td><td style="font-weight:600">${f.name}</td>
    <td class="num">${fmtN(f.Q)}</td><td class="num">${fmtM(TRc(f))}</td><td class="num">${fmtM(f.TC)}</td>
    <td class="num ${sur>=0?'pos':'neg'}" style="font-weight:700">${sur>=0?'+':'−'}${fmtM(Math.abs(sur))}</td>
    <td class="num">${fmtB(R(f))}</td><td class="num" style="color:var(--red)">${Qs(f)?fmtN(Qs(f)):'—'}</td></tr>`;}).join('');
}


/* ---- เริ่มทำงาน ---- */
window.renderPage = renderRevenue;
renderRevenue();
