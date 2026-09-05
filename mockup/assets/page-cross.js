/* ==========================================================================
   MSU-BEPS — W5 Cross Analysis & Heatmap
   ยกมาจาก prototype v8-1 โดยไม่แก้สูตร · ต้องโหลดหลัง core.js
   ========================================================================== */

/* ============ CROSS ANALYSIS ============ */
let _crossSort='pp';
function crossData(){
  return RAW.FACS.map(f=>{
    const Q=F0(f.Q),TC=F0(f.TC),TFC=F0(f.TFC),TVC=F0(f.TVC),TR=TRc(f),r=R(f),avc=AVC(f);
    const CM=r-avc,qs=Qs(f),valid=qs>0&&CM>0,util=valid?Math.round(Q/qs*100):0;
    const pp=TC>0?(TR-TC)/TC*100:0;
    const P=RAW.PROGS.filter(p=>p.fac===f.name);
    const okP=P.filter(p=>status(p)==='ok').length;
    return {name:f.name,short:short(f.name),Q,Qs:valid?qs:0,valid,util,pp:+pp.toFixed(1),
      R:Math.round(r),AVC:Math.round(avc),ATC:Math.round(ATC(f)),CM:Math.round(CM),
      TR_m:TR/1e6,profit_m:(TR-TC)/1e6,
      avc_r_ratio:r>0?+(avc/r*100).toFixed(1):999,tfc_tc_ratio:TC>0?+(TFC/TC*100).toFixed(1):0,
      nProg:P.length,okProg:okP,progOk_ratio:P.length?+(okP/P.length*100).toFixed(0):0,isOk:valid?Q>=qs:false};
  });
}
const HM=[{k:'util',l:'Utilization',s:'Q/Q* %',f:v=>v>0?v+'%':'—',g:'high'},
  {k:'pp',l:'กำไร %',s:'Profit',f:v=>(v>=0?'+':'')+v+'%',g:'high'},
  {k:'progOk_ratio',l:'หลักสูตรคุ้ม',s:'%',f:v=>v+'%',g:'high'},
  {k:'CM',l:'CM/หัว',s:'บาท',f:v=>fmtB(v),g:'high'},
  {k:'R',l:'R/หัว',s:'บาท',f:v=>fmtB(v),g:'high'},
  {k:'AVC',l:'AVC/หัว',s:'บาท',f:v=>fmtB(v),g:'low'},
  {k:'avc_r_ratio',l:'AVC/R',s:'%',f:v=>v>=999?'—':v+'%',g:'low'},
  {k:'tfc_tc_ratio',l:'TFC/TC',s:'%',f:v=>v+'%',g:'low'},
  {k:'profit_m',l:'ส่วนเกิน',s:'ลบ.',f:v=>(v>=0?'+':'−')+Math.abs(v).toLocaleString('th-TH',{minimumFractionDigits:1,maximumFractionDigits:1}),g:'high'},
  {k:'Q',l:'Q จริง',s:'คน',f:v=>fmtN(v),g:'high'}];
function hmColor(val,m,all){
  const s=[...all].sort((a,b)=>a-b),mn=s[0],mx=s[s.length-1];
  if(mx===mn)return{bg:'#f1f5f9',fg:'#64748b'};
  const norm=(val-mn)/(mx-mn),score=m.g==='high'?norm:1-norm;
  let r,g,b;
  if(score<0.25){const t=score/0.25;r=252;g=Math.round(205+15*t);b=Math.round(210-24*t);}
  else if(score<0.5){const t=(score-0.25)/0.25;r=255;g=Math.round(220+23*t);b=Math.round(186+5*t);}
  else if(score<0.75){const t=(score-0.5)/0.25;r=Math.round(255-46*t);g=Math.round(243-7*t);b=Math.round(191+22*t);}
  else{const t=(score-0.75)/0.25;r=Math.round(209-21*t);g=Math.round(236-4*t);b=Math.round(213+6*t);}
  return{bg:`rgb(${r},${g},${b})`,fg:'#334155'};
}
function renderCross(){
  const cd=crossData();
  document.getElementById('cross-note').innerHTML=`โหมด <b>${BM==='in'?'รวมเงินแผ่นดิน':'ไม่รวมเงินแผ่นดิน'}</b> · <b>Utilization = Q ÷ Q*</b> (Q* = ผลรวมรายหลักสูตร) · คณะที่ <b>CM ≤ 0</b> จะไม่มี Q* (แสดง —)`;
  // heatmap
  const valA={};HM.forEach(m=>valA[m.k]=cd.map(d=>d[m.k]));
  let h='<table class="hm-table"><thead><tr><th class="col-name">คณะ / วิทยาลัย</th>';
  HM.forEach(m=>h+=`<th title="${m.l} (${m.s})">${m.l}<br><span style="font-size:8px;font-weight:500">${m.s}</span></th>`);
  h+='</tr></thead><tbody>';
  cd.forEach(d=>{
    const st=d.isOk?'<span style="font-size:9px;padding:1px 6px;border-radius:8px;background:var(--green3);color:var(--green);font-weight:700">✓</span>':'<span style="font-size:9px;padding:1px 6px;border-radius:8px;background:var(--red3);color:var(--red);font-weight:700">⚠</span>';
    h+=`<tr><td class="col-name"><div style="display:flex;align-items:center;gap:6px">${st}<span style="font-size:11px;font-weight:700">${d.short}</span></div></td>`;
    HM.forEach(m=>{const {bg,fg}=hmColor(d[m.k],m,valA[m.k]);h+=`<td style="background:${bg};color:${fg}" title="${d.name}: ${m.l} = ${m.f(d[m.k])}"><div class="hm-cell"><div class="hm-val">${m.f(d[m.k])}</div></div></td>`;});
    h+='</tr>';
  });
  h+='</tbody></table>';document.getElementById('heatmap-container').innerHTML=h;
  // scatters
  const V=cd.filter(d=>d.valid),nEx=cd.length-V.length;
  document.getElementById('cross-ex').textContent=nEx>0?`กราฟไม่รวม ${nEx} คณะที่ CM ≤ 0 (ไม่มีจุดคุ้มทุน) — ดูในตาราง`:'';
  const cols=V.map(d=>d.isOk?'rgba(12,166,120,.75)':'rgba(230,73,128,.75)'),bcs=V.map(d=>d.isOk?C.green:C.red);
  mk('cross-scatter1',{type:'scatter',data:{datasets:[{data:V.map(d=>({x:d.Qs,y:d.pp,label:d.short})),backgroundColor:cols,borderColor:bcs,borderWidth:1.5,pointRadius:7,pointHoverRadius:9}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw.label}: Q*=${fmtN(c.raw.x)} คน, กำไร ${c.raw.y>=0?'+':''}${c.raw.y}%`}}},
      scales:{x:{title:{display:true,text:'Q* จุดคุ้มทุน (คน)'},grid:{color:C.grid}},y:{title:{display:true,text:'กำไร %'},grid:{color:C.grid},ticks:{callback:v=>(v>=0?'+':'')+v+'%'}}}}});
  mk('cross-scatter2',{type:'scatter',data:{datasets:[{data:V.map(d=>({x:d.avc_r_ratio,y:d.util,label:d.short})),backgroundColor:cols,borderColor:bcs,borderWidth:1.5,pointRadius:7,pointHoverRadius:9}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw.label}: AVC/R=${c.raw.x}%, Util=${c.raw.y}%`}}},
      scales:{x:{title:{display:true,text:'AVC/R Ratio (%) — ต่ำ = ดี'},grid:{color:C.grid},ticks:{callback:v=>v+'%'}},y:{title:{display:true,text:'Utilization Q/Q* (%)'},grid:{color:C.grid},ticks:{callback:v=>v+'%'}}}}});
  // bubble quadrant
  const maxTR=Math.max(...V.map(d=>d.TR_m))||1;
  mk('cross-bubble',{type:'bubble',data:{datasets:V.map(d=>({label:d.short,data:[{x:d.util,y:d.pp,r:Math.max(5,d.TR_m/maxTR*35)}],backgroundColor:d.isOk?'rgba(109,76,255,.6)':'rgba(230,73,128,.6)',borderColor:d.isOk?C.navy:C.red,borderWidth:1.5}))},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.dataset.label}: Util=${c.raw.x}%, กำไร ${c.raw.y>=0?'+':''}${c.raw.y}%, TR=${fmtM(V.find(d=>d.short===c.dataset.label)?.TR_m*1e6||0)} ลบ.`}}},
      scales:{x:{title:{display:true,text:'Utilization Q/Q* (%)'},grid:{color:C.grid},ticks:{callback:v=>v+'%'}},y:{title:{display:true,text:'กำไร % (Profit Margin)'},grid:{color:C.grid},ticks:{callback:v=>(v>=0?'+':'')+v+'%'}}}}});
  document.getElementById('quadrant-labels').innerHTML=`
    <div style="position:absolute;top:10px;left:52%;font-size:9px;font-weight:700;color:#0ca678;opacity:.65">⭐ Stars (Util สูง · กำไรสูง)</div>
    <div style="position:absolute;top:10px;left:5%;font-size:9px;font-weight:700;color:#f59f00;opacity:.65">🔄 Recover (Util ต่ำ · กำไรสูง)</div>
    <div style="position:absolute;bottom:30px;left:52%;font-size:9px;font-weight:700;color:#6d4cff;opacity:.65">📈 Growth (Util สูง · กำไรต่ำ)</div>
    <div style="position:absolute;bottom:30px;left:5%;font-size:9px;font-weight:700;color:#e64980;opacity:.65">⚠️ Risk (Util ต่ำ · กำไรต่ำ)</div>`;
  sortCross(_crossSort);
  // insights
  const inv=cd.filter(d=>!d.valid);
  const stars=V.filter(d=>d.util>=100&&d.pp>=0),growth=V.filter(d=>d.util>=100&&d.pp<0),recov=V.filter(d=>d.util<100&&d.pp>=0),risk=V.filter(d=>d.util<100&&d.pp<0);
  const I=[{t:'info',h:`<b>จัดกลุ่ม 4 กลุ่ม</b>: ⭐ Stars <b>${stars.length}</b> · 📈 Growth <b>${growth.length}</b> · 🔄 Recover <b>${recov.length}</b> · ⚠️ Risk <b>${risk.length}</b>${inv.length?` · ไม่มี Q* <b>${inv.length}</b>`:''}`}];
  if(risk.length)I.push({t:'crit',h:`<b>⚠ กลุ่ม Risk — ${risk.length} คณะ</b> (นิสิตไม่ถึง Q* และขาดทุน): ${[...risk].sort((a,b)=>a.pp-b.pp).slice(0,3).map(d=>`${d.short} (Util ${d.util}% · ${d.pp}%)`).join(', ')}`});
  if(inv.length)I.push({t:'crit',h:`<b>${inv.length} คณะมี CM ≤ 0</b>: ${inv.map(d=>`${d.short} (CM ${fmtB(d.CM)})`).join(', ')} → Q* ใช้ TC ÷ ค่าเทอม · ควรขึ้นค่าธรรมเนียมหรือลดต้นทุนผันแปร`});
  if(stars.length)I.push({t:'ok',h:`<b>⭐ กลุ่ม Stars — ${stars.length} คณะ</b> (เกิน Q* และมีกำไร): ${[...stars].sort((a,b)=>b.pp-a.pp).slice(0,3).map(d=>`${d.short} (+${d.pp}%)`).join(', ')}`});
  const hiAVC=V.filter(d=>d.avc_r_ratio>=50);
  if(hiAVC.length)I.push({t:'warn',h:`<b>${hiAVC.length} คณะมี AVC/R ≥ 50%</b> (ต้นทุนผันแปรกินรายได้เกินครึ่ง) — ขาดทุน <b>${hiAVC.filter(d=>d.pp<0).length}/${hiAVC.length}</b> คณะ`});
  const totP=cd.reduce((s,d)=>s+d.nProg,0),totOk=cd.reduce((s,d)=>s+d.okProg,0);
  if(totP)I.push({t:totOk/totP>=0.5?'ok':'crit',h:`ภาพรวม: <b>${totOk}/${totP} หลักสูตรถึงจุดคุ้มทุน (${(totOk/totP*100).toFixed(0)}%)</b> ในโหมดนี้`});
  renderInsights('cross-ins',I);
}
function sortCross(key){
  _crossSort=key;
  document.querySelectorAll('.metric-btn').forEach(b=>b.classList.toggle('on',b.dataset.sort===key));
  const cd=crossData().sort((a,b)=>(key==='avc_r_ratio'||key==='tfc_tc_ratio')?a[key]-b[key]:b[key]-a[key]);
  let h=`<table class="tbl" style="min-width:900px"><thead><tr><th>#</th><th>คณะ / วิทยาลัย</th><th class="num">Q จริง</th><th class="num">Q*</th><th class="num">Util%</th><th class="num">หลักสูตรคุ้ม</th><th class="num">กำไร%</th><th class="num">CM/หัว</th><th class="num">AVC/R%</th><th class="num">ส่วนเกิน(ลบ.)</th><th class="num">สถานะ</th></tr></thead><tbody>`;
  cd.forEach((d,i)=>{
    const bad=!d.valid;
    const stBg=bad?'var(--red3)':d.isOk?'var(--green3)':'var(--gold4)',stC=bad?'var(--red)':d.isOk?'var(--green)':'var(--gold)',stTx=bad?'⚠ CM≤0':d.isOk?'✓ ผ่าน':'⚠ ไม่ผ่าน';
    h+=`<tr><td><span class="rank ${i<3?'r'+(i+1):''}">${i+1}</span></td><td style="font-weight:600;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${d.name}">${d.name}</td>
      <td class="num">${fmtN(d.Q)}</td><td class="num" style="color:var(--red);font-weight:700">${d.Qs?fmtN(d.Qs):'—'}</td>
      <td class="num" style="font-weight:700;color:${bad?'var(--text4)':d.util>=100?'var(--green)':'var(--red)'}">${bad?'—':d.util+'%'}</td>
      <td class="num" style="color:${d.progOk_ratio>=50?'var(--green)':'var(--red)'}">${d.okProg}/${d.nProg}</td>
      <td class="num" style="font-weight:700;color:${d.pp>=0?'var(--green)':'var(--red)'}">${d.pp>=0?'+':''}${d.pp}%</td>
      <td class="num ${d.CM>0?'pos':'neg'}" style="font-weight:700">${d.CM>0?'+':'−'}${fmtB(Math.abs(d.CM))}</td>
      <td class="num" style="color:${d.avc_r_ratio>=999?'var(--text4)':d.avc_r_ratio<=20?'var(--green)':d.avc_r_ratio<=40?'var(--gold)':'var(--red)'}">${d.avc_r_ratio>=999?'—':d.avc_r_ratio+'%'}</td>
      <td class="num ${d.profit_m>=0?'pos':'neg'}">${d.profit_m>=0?'+':'−'}${Math.abs(d.profit_m).toLocaleString('th-TH',{minimumFractionDigits:1,maximumFractionDigits:1})}</td>
      <td style="text-align:right"><span class="st-badge" style="display:inline-block;background:${stBg};color:${stC}">${stTx}</span></td></tr>`;
  });
  h+='</tbody></table>';document.getElementById('cross-rank-table').innerHTML=h;
}
document.querySelectorAll('.metric-btn').forEach(b=>b.onclick=()=>sortCross(b.dataset.sort));


/* ---- เริ่มทำงาน ---- */
window.renderPage = renderCross;
renderCross();
