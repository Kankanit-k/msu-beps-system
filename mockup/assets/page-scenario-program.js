/* ==========================================================================
   MSU-BEPS — W7 คำนวณจุดคุ้มทุนรายหลักสูตร (Scenario) + รายงาน PDF
   ยกมาจาก prototype v8-1 โดยไม่แก้สูตร · ต้องโหลดหลัง core.js
   ========================================================================== */

/* ============ SELF-CALC (รายคณะ / รายหลักสูตร) + PDF ============ */
const MM=(v,d=2)=>(Number(v)/1e6).toLocaleString('th-TH',{minimumFractionDigits:d,maximumFractionDigits:d});
const CEILq=x=>Math.ceil(x-1e-9);
const modeLbl=()=>BM==='in'?'รวมเงินแผ่นดิน':'ไม่รวมเงินแผ่นดิน';
const FAC_DATA=(()=>{const o={};RAW.FACS.forEach(f=>{o[f.name]={Q:f.Q,TR:f.TR,TFC:f.TFC,TVC:f.TVC,TC:f.TC,st:f.st,own:f.own,Rin:f.Rin,Rex:f.Rex,AVC:f.AVC,Qin:f.Qin,Qex:f.Qex};});return o;})();
const PG_DATA=(()=>{const m={};RAW.PROGS.forEach(p=>{if(!m[p.fac])m[p.fac]={faculty:p.fac,programs:[]};m[p.fac].programs.push({program:p.prog,level:p.lvl,degree:p.deg,Q:p.Q,TR:p.TR,TFC:p.TFC,TVC:p.TVC,TC:p.TC,st:p.st,own:p.own,Rin:p.Rin,Rex:p.Rex,AVC:p.AVC,Qin:p.Qin,Qex:p.Qex});});return Object.values(m);})();
const TFC_PRESETS=['100:เงินเดือน','210:ค่าจ้างประจำ','220:ค่าจ้างชั่วคราว','230:ค่าตอบแทนพนักงานราชการ','300:ค่าตอบแทน','400:ค่าใช้สอย','500:ค่าวัสดุ','600:ค่าครุภัณฑ์','800:เงินอุดหนุน','900:รายจ่ายอื่น','ค่าเสื่อมราคา'];
const TVC_PRESETS=['300:ค่าตอบแทน','400:ค่าใช้สอย','410:ค่าสาธารณูปโภค','500:ค่าวัสดุ','600:ค่าครุภัณฑ์','800:เงินอุดหนุน','900:รายจ่ายอื่น','ค่าธรรมเนียมศึกษาทั่วไป','ค่าธรรมเนียมรายการหลัก (รายหัวนิสิต)','หักสมทบมหาวิทยาลัย (รายหัวนิสิต)'];
let inpList=[],_lastInp=null,pgHist=[],pgChart=null;

let _pgInit=false;
function initPgDropdowns(){if(_pgInit)return;_pgInit=true;const fs=document.getElementById('pg-fac');if(!fs)return;PG_DATA.forEach(g=>{const o=document.createElement('option');o.value=g.faculty;o.textContent=g.faculty;fs.appendChild(o);});}
function onPgTypeChange(){
  initPgDropdowns();const isNew=document.getElementById('pg-type').value==='new';
  document.getElementById('pg-old-fac-wrap').style.display=isNew?'none':'';
  document.getElementById('pg-old-prog-wrap').style.display=isNew?'none':'';
  document.getElementById('pg-new-name-wrap').style.display=isNew?'':'none';
  document.getElementById('pg-new-fac-wrap').style.display=isNew?'':'none';
  ['pg-q','pg-st','pg-own','pg-tfc','pg-tvc','pg-tr'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('pg-autofill-badge').style.display='none';
  document.getElementById('pg-ref-note').style.display='none';
  if(!isNew){document.getElementById('pg-fac').value='';document.getElementById('pg-name-sel').innerHTML='<option value="">-- เลือกหลักสูตร --</option>';}
}
function onFacChange(){
  initPgDropdowns();const fv=document.getElementById('pg-fac').value,ps=document.getElementById('pg-name-sel');
  ps.innerHTML='<option value="">-- เลือกหลักสูตร --</option>';
  ['pg-q','pg-st','pg-own','pg-tfc','pg-tvc','pg-tr'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('pg-autofill-badge').style.display='none';document.getElementById('pg-ref-note').style.display='none';
  if(!fv)return;const g=PG_DATA.find(x=>x.faculty===fv);if(!g)return;
  g.programs.forEach(p=>{const o=document.createElement('option');o.value=p.program;o.textContent=p.program+' ('+p.level+')';ps.appendChild(o);});
}
function onProgChange(){
  const fv=document.getElementById('pg-fac').value,pv=document.getElementById('pg-name-sel').value;
  if(!fv||!pv)return;const g=PG_DATA.find(x=>x.faculty===fv);if(!g)return;const p=g.programs.find(x=>x.program===pv);if(!p)return;
  const lvlSel=document.getElementById('pg-level');for(let o of lvlSel.options){if(o.value===p.level){o.selected=true;break;}}
  const setV=(id,v)=>{document.getElementById(id).value=v;};
  setV('pg-q',p.Q);setV('pg-st',Math.round(p.st));setV('pg-own',Math.round(p.own));setV('pg-tr',Math.round(p.TR));setV('pg-tfc',Math.round(p.TFC));setV('pg-tvc',Math.round(p.TVC));
  document.getElementById('pg-autofill-badge').style.display='';
  const note=document.getElementById('pg-ref-note');
  if(p.Q>0){const cmIn=p.Rin-p.AVC,cmEx=p.Rex-p.AVC;note.style.display='';
    note.innerHTML=`<b style="color:var(--navy2)">${p.program}</b> · ${p.level} · ${fv}<br>AVC = <b>${fmtB(p.AVC)}</b> บ./คน | นิสิตจริง <b>${fmtN(p.Q)}</b> คน<br>
      <span style="color:var(--navy2)">● รวมแผ่นดิน:</span> R=<b>${fmtB(p.Rin)}</b> · CM=<b>${fmtB(cmIn)}</b> · <b>Q*=${p.Qin?fmtN(p.Qin)+' คน':'—'}</b> ${p.Qin?(p.Q>=p.Qin?'<span style="color:var(--green);font-weight:700">✓ คุ้ม</span>':'<span style="color:var(--red);font-weight:700">⚠ ขาด '+fmtN(p.Qin-p.Q)+'</span>'):''}<br>
      <span style="color:var(--gold)">● ไม่รวมแผ่นดิน:</span> R=<b>${fmtB(p.Rex)}</b> · CM=<b>${fmtB(cmEx)}</b> · <b>Q*=${p.Qex?fmtN(p.Qex)+' คน':'ไม่มี (CM≤0)'}</b> ${p.Qex?(p.Q>=p.Qex?'<span style="color:var(--green);font-weight:700">✓ คุ้ม</span>':'<span style="color:var(--red);font-weight:700">⚠ ขาด '+fmtN(p.Qex-p.Q)+'</span>'):''}`;}
}
function calcPg(){
  const num=id=>parseFloat((document.getElementById(id)||{}).value)||0;
  const isNew=document.getElementById('pg-type').value==='new';
  const name=isNew?(document.getElementById('pg-name-new').value||'หลักสูตรใหม่'):(document.getElementById('pg-name-sel').value||'ไม่ระบุ');
  const fac=isNew?(document.getElementById('pg-fac-new').value||''):(document.getElementById('pg-fac').value||'');
  const level=document.getElementById('pg-level').value||'';
  const Q=num('pg-q'),ST=num('pg-st'),OWN=num('pg-own'),TR=ST+OWN,TFC=num('pg-tfc'),TVC=num('pg-tvc'),TC=TFC+TVC,AVC=Q>0?TVC/Q:0;
  if(Q<=0||TR<=0||TC<=0){alert('กรุณากรอก จำนวนนิสิต, งบประมาณ (แผ่นดิน/รายได้) และต้นทุน (TFC/TVC) ให้ครบก่อนคำนวณ');return;}
  const calc=rev=>{const R=Q>0?rev/Q:0,CM=R-AVC;const Qs=CM>0?CEILq(TFC/CM):(R>0?CEILq(TC/R):null);const profit=rev-TC;return {R,CM,Qs,full:CM<=0,profit,pp:TC>0?profit/TC*100:0,isOk:Qs?Q>=Qs:false};};
  const A=calc(TR),B=calc(OWN),cur=BM==='in'?A:B;
  pgHist.unshift({name,fac,level,type:isNew?'new':'old',Q,ST,OWN,TR,TFC,TVC,TC,AVC,A,B,time:new Date().toLocaleTimeString('th-TH')});
  renderPgHist();document.getElementById('pg-result').style.display='block';
  const pdfBtn=document.getElementById('btn-pdf-report');
  pdfBtn.disabled=false;pdfBtn.style.cssText='display:flex;align-items:center;gap:7px;padding:9px 20px;border:none;border-radius:10px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;background:var(--navy2);color:#fff;letter-spacing:.02em;box-shadow:0 4px 12px rgba(109,76,255,.3)';pdfBtn.title='เปิดรายงาน PDF';
  const ss=[['รายได้รวม (TR)','var(--navy2)',MM(TR,3)+' ล.'],['ต้นทุนรวม (TC)','var(--text)',MM(TC,3)+' ล.'],['ต้นทุนคงที่ (TFC)','var(--navy2)',MM(TFC,3)+' ล.'],['ต้นทุนผันแปร (TVC)','var(--gold)',MM(TVC,3)+' ล.'],['AVC ต่อหน่วย','var(--gold)',fmtB(AVC)+' บ./คน'],['นิสิตจริง (Q)','var(--text2)',fmtN(Q)+' คน']];
  const card=(t,c,m)=>`<div style="border:1.5px solid ${c};border-radius:10px;padding:13px 15px;background:${m.isOk?'var(--green3)':'var(--red3)'}">
    <div style="font-size:10px;font-weight:800;color:${c};text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">${t}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;font-size:11.5px;margin-bottom:8px">
      <div>R/หัว: <b>${fmtB(m.R)}</b> บ.</div><div>CM/หัว: <b style="color:${m.CM>0?'var(--green)':'var(--red)'}">${fmtB(m.CM)}</b> บ.</div>
      <div>Q*: <b style="color:var(--red);font-size:13px">${m.Qs?fmtN(m.Qs)+' คน':'—'}</b>${m.full?' <span style="font-size:8px;font-weight:800;padding:1px 4px;border-radius:6px;background:var(--gold4);color:var(--gold)">TC÷R</span>':''}</div>
      <div>กำไร: <b style="color:${m.profit>=0?'var(--green)':'var(--red)'}">${m.pp>=0?'+':''}${m.pp.toFixed(1)}%</b></div></div>
    <div style="font-size:11px;font-weight:700;color:${m.isOk?'var(--green)':'var(--red)'}">${!m.Qs?'⚠ คำนวณไม่ได้':(m.full?'⚠ CM≤0 · ใช้ TC÷R · ':'')+(m.isOk?'✓ เกินจุดคุ้มทุน +'+fmtN(Q-m.Qs)+' คน':'⚠ ต้องเพิ่มอีก '+fmtN(m.Qs-Q)+' คน')}</div></div>`;
  document.getElementById('pg-result-card').innerHTML=`<div class="card-head"><div><div class="card-title"><span class="dot" style="background:var(--navy2)"></span>${name}</div><div class="card-sub">${fac||'—'} · ${level||'—'} · ${isNew?'หลักสูตรใหม่':'หลักสูตรเดิม'}</div></div></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:12px">${ss.map(([l,c,v])=>`<div class="stat-box" style="padding:9px 12px"><div class="stat-lbl" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${l}">${l}</div><div class="stat-val" style="color:${c};font-size:12px">${v}</div></div>`).join('')}</div>
    <div style="display:flex;flex-direction:column;gap:9px">${card('กรณีรวมเงินแผ่นดิน','var(--navy2)',A)}${card('กรณีไม่รวมเงินแผ่นดิน','var(--gold)',B)}</div>`;
  pgLine(Q,TFC,AVC,cur.R,cur.Qs);
}
function pgLine(Q,TFC,AVC,R_ph,qsSum){
  let mQ=Math.max(Q*1.5,30);if(qsSum&&qsSum>0&&isFinite(qsSum))mQ=Math.max(mQ,qsSum*1.4);mQ=Math.min(mQ,2e5);
  const sp=Math.max(1,Math.ceil(mQ/40)),pts=[],trA=[],tcA=[],tfA=[];
  for(let q=0;q<=mQ;q+=sp){pts.push(q);trA.push(q*R_ph/1e6);tcA.push((TFC+AVC*q)/1e6);tfA.push(TFC/1e6);}
  const ds=[{label:'TR',data:trA,borderColor:C.navy,borderWidth:2.5,pointRadius:0,fill:false},
    {label:'TC',data:tcA,borderColor:C.red,borderWidth:2.5,pointRadius:0,fill:false},
    {label:'TFC',data:tfA,borderColor:C.gold,borderWidth:1.5,pointRadius:0,borderDash:[6,4],fill:false}];
  const nearest=target=>{let bi=0,bd=Infinity;pts.forEach((q,k)=>{const dd=Math.abs(q-target);if(dd<bd){bd=dd;bi=k;}});return bi;};
  if(qsSum&&qsSum>0&&qsSum<=mQ){const a=pts.map(()=>null);a[nearest(qsSum)]=qsSum*R_ph/1e6;ds.push({label:'Q*',data:a,borderColor:C.red,backgroundColor:'#fff',pointRadius:6,pointBorderWidth:2.5,showLine:false});}
  if(Q>0&&Q<=mQ){const a=pts.map(()=>null);a[nearest(Q)]=Q*R_ph/1e6;ds.push({label:'นิสิตจริง',data:a,borderColor:C.gold,backgroundColor:'#fff',pointRadius:6,pointBorderWidth:2.5,pointStyle:'rectRot',showLine:false});}
  mk('pg-chart',{type:'line',data:{labels:pts,datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{callbacks:{title:i=>'นิสิต '+fmtN(Number(i[0].label))+' คน',label:c=>c.parsed.y===null?null:c.dataset.label+': '+MM(c.parsed.y*1e6,3)+' ล.'}}},
    scales:{x:{grid:{color:C.grid},title:{display:true,text:'จำนวนนิสิต (คน)'},ticks:{maxTicksLimit:9,callback:function(v){return fmtN(Number(this.getLabelForValue(v)));}}},
      y:{grid:{color:C.grid},beginAtZero:true,title:{display:true,text:'ล้านบาท'},ticks:{callback:v=>MM(v*1e6,1)+'ล.'}}}}});
}
function renderPgHist(){
  const el=document.getElementById('pg-hist-body');if(!el)return;
  if(!pgHist.length){el.innerHTML='<div style="padding:16px;text-align:center;color:var(--text4);font-size:12px">ยังไม่มีประวัติ</div>';return;}
  el.innerHTML='<div style="overflow-x:auto"><table class="tbl" style="min-width:820px"><thead><tr><th>เวลา</th><th>หลักสูตร</th><th>ระดับ</th><th>ประเภท</th><th class="num">Q</th><th class="num">AVC</th><th class="num">Q* รวมแผ่นดิน</th><th class="num">Q* ไม่รวม</th><th class="num">สถานะ</th></tr></thead><tbody>'
    +pgHist.map(f=>{const A=f.A||{},B=f.B||{},okA=A.Qs&&f.Q>=A.Qs,okB=B.Qs&&f.Q>=B.Qs;
      return `<tr><td style="color:var(--text4);white-space:nowrap">${f.time}</td><td style="font-weight:600;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${f.name}">${f.name}</td><td style="font-size:10px">${f.level||'—'}</td><td><span style="font-size:9px;padding:2px 7px;border-radius:10px;font-weight:700;background:${f.type==='new'?'var(--navy4)':'var(--gold4)'};color:${f.type==='new'?'var(--navy2)':'var(--gold)'}">${f.type==='new'?'ใหม่':'เดิม'}</span></td><td class="num">${fmtN(f.Q)}</td><td class="num" style="color:var(--gold)">${fmtB(f.AVC)}</td><td class="num ${okA?'pos':'neg'}">${A.Qs?fmtN(A.Qs):'—'}</td><td class="num ${okB?'pos':'neg'}">${B.Qs?fmtN(B.Qs):'—'}</td><td style="text-align:right"><span class="st-badge ${okA?'st-ok':'st-loss'}" style="display:inline-block">${okA?'✓':'⚠'}</span></td></tr>`;}).join('')
    +'</tbody></table></div>';
}
// ---- PDF report ----
function closePdfReport(){document.getElementById('pdf-overlay').style.display='none';}
function openPdfReport(){
  if(!pgHist.length){alert('กรุณาคำนวณจุดคุ้มทุนก่อนออกรายงาน');return;}
  const h=pgHist[0],m=(BM==='in'?h.A:h.B)||{};
  const d=Object.assign({},h,{R:m.R||0,CM:m.CM||0,Qs:m.Qs||null,profit:m.profit||0,pp:m.pp||0,isOk:!!m.isOk,TR:BM==='in'?h.TR:h.OWN,modeLabel:modeLbl()});
  const logo=document.querySelector('.sb-logo-img')?document.querySelector('.sb-logo-img').src:'';
  const now=new Date(),dateStr=now.toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'});
  const typeLabel=d.type==='new'?'หลักสูตรใหม่ (New Program)':'หลักสูตรเดิม (Existing Program)';
  const statusLabel=d.isOk?'ผ่านจุดคุ้มทุน':'ยังไม่ถึงจุดคุ้มทุน',statusColor=d.isOk?'#3a8c00':'#a67500';
  const beRev=d.Qs?d.Qs*d.R:0,MoS=d.TR-beRev;
  // SVG chart
  const maxQ=Math.max(d.Q*1.4,d.Qs?d.Qs*1.6:d.Q*2,30),pts=10,step=maxQ/pts;
  const svgW=640,svgH=240,pad=50,maxY=maxQ*d.R/1e6*1.15;
  const sx=q=>pad+(q/maxQ)*(svgW-pad*2),sy=v=>svgH-pad-(v/maxY)*(svgH-pad*2);
  const trPts=[],tcPts=[];
  for(let i=0;i<=pts;i++){const q=i*step;trPts.push(sx(q).toFixed(1)+','+sy(q*d.R/1e6).toFixed(1));tcPts.push(sx(q).toFixed(1)+','+sy((d.TFC+d.AVC*q)/1e6).toFixed(1));}
  const tfcY=sy(d.TFC/1e6).toFixed(1),bepX=d.Qs?sx(d.Qs).toFixed(1):null,bepY=d.Qs?sy(d.Qs*d.R/1e6).toFixed(1):null;
  const svg=`<svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg" style="font-family:sans-serif">
    <rect width="${svgW}" height="${svgH}" fill="#f8fafd" rx="8"/>
    ${[1,2,3,4].map(i=>`<line x1="${pad}" y1="${sy(maxY*i/5).toFixed(1)}" x2="${svgW-pad}" y2="${sy(maxY*i/5).toFixed(1)}" stroke="#e2e8f2"/>`).join('')}
    <line x1="${pad}" y1="${tfcY}" x2="${svgW-pad}" y2="${tfcY}" stroke="#56ca00" stroke-width="1.5" stroke-dasharray="6,4"/>
    <text x="${svgW-pad+4}" y="${tfcY}" font-size="9" fill="#56ca00" dominant-baseline="middle">TFC</text>
    <polyline points="${tcPts.join(' ')}" fill="none" stroke="#ff4c51" stroke-width="2"/>
    <polyline points="${trPts.join(' ')}" fill="none" stroke="#6d4cff" stroke-width="2.5"/>
    ${bepX?`<circle cx="${bepX}" cy="${bepY}" r="5" fill="#5938e0" stroke="#fff" stroke-width="1.5"/><line x1="${bepX}" y1="${bepY}" x2="${bepX}" y2="${svgH-pad}" stroke="#5938e0" stroke-dasharray="4,3"/><text x="${bepX}" y="${svgH-pad+12}" font-size="9" fill="#5938e0" text-anchor="middle" font-weight="700">Q*=${fmtN(d.Qs)}</text>`:''}
    <circle cx="${sx(d.Q).toFixed(1)}" cy="${sy(d.Q*d.R/1e6).toFixed(1)}" r="4" fill="#ffb400" stroke="#fff" stroke-width="1.5"/>
    <text x="${sx(d.Q).toFixed(1)}" y="${(sy(d.Q*d.R/1e6)-8).toFixed(1)}" font-size="9" fill="#ffb400" text-anchor="middle" font-weight="700">Q=${fmtN(d.Q)}</text>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${svgH-pad}" stroke="#334155" stroke-width="1.5"/>
    <line x1="${pad}" y1="${svgH-pad}" x2="${svgW-pad}" y2="${svgH-pad}" stroke="#334155" stroke-width="1.5"/>
    <text x="${svgW/2}" y="${svgH-8}" font-size="9" fill="#6f6880" text-anchor="middle">จำนวนนิสิต (คน)</text>
    <text x="12" y="${svgH/2}" font-size="9" fill="#6f6880" text-anchor="middle" transform="rotate(-90,12,${svgH/2})">ล้านบาท</text>
    <rect x="${pad+10}" y="${pad-5}" width="8" height="8" fill="#6d4cff" rx="1"/><text x="${pad+22}" y="${pad+3}" font-size="9" fill="#334155">TR</text>
    <rect x="${pad+50}" y="${pad-5}" width="8" height="8" fill="#ff4c51" rx="1"/><text x="${pad+62}" y="${pad+3}" font-size="9" fill="#334155">TC</text>
    <circle cx="${pad+96}" cy="${pad-1}" r="4" fill="#5938e0"/><text x="${pad+104}" y="${pad+3}" font-size="9" fill="#334155">Q*</text>
    <circle cx="${pad+130}" cy="${pad-1}" r="4" fill="#ffb400"/><text x="${pad+138}" y="${pad+3}" font-size="9" fill="#334155">Q จริง</text>
  </svg>`;
  const hdr=`<div class="pdf-header">${logo?`<img src="${logo}" class="pdf-logo" alt="MSU">`:'<div style="width:52px;height:52px;background:#5938e0;border-radius:8px"></div>'}<div class="pdf-header-text"><h1>มหาวิทยาลัยมหาสารคาม | Mahasarakham University</h1><p>รายงานการวิเคราะห์จุดคุ้มทุน (Break-Even Analysis Report) · กองแผนงาน</p></div>`;
  const report=`<div class="pdf-page">
    ${hdr}<div style="margin-left:auto;text-align:right;font-size:9px;color:#9b95a6;line-height:1.8"><div style="font-weight:700;color:#5938e0">ปีการศึกษา 2568</div><div>${dateStr}</div><div style="font-size:8px;background:#efeaff;color:#6d4cff;padding:2px 8px;border-radius:10px;display:inline-block;font-weight:700;margin-top:4px">${typeLabel}</div><div style="font-size:8px;background:#fff3d6;color:#8a5a00;padding:2px 8px;border-radius:10px;display:inline-block;font-weight:700;margin-top:3px">ฐานรายได้: ${d.modeLabel}</div></div></div>
    <div class="pdf-title">รายงานการวิเคราะห์จุดคุ้มทุนหลักสูตร</div>
    <div class="pdf-subtitle">${d.name} · ${d.fac||'-'} · ${d.level}</div>
    <div class="pdf-result-box ${d.isOk?'pdf-result-ok':'pdf-result-warn'}" style="display:flex;align-items:center;gap:14px">
      <div style="font-size:28px">${d.isOk?'✅':'⚠️'}</div><div><div style="font-size:14px;font-weight:800;color:${statusColor}">${statusLabel}</div>
      <div style="font-size:11px;color:#5a5169;margin-top:2px">${d.Qs?`จำนวนนิสิต ณ จุดคุ้มทุน = ${fmtN(d.Qs)} คน · นิสิตจริง = ${fmtN(d.Q)} คน · ส่วนต่าง ${d.Q>=d.Qs?'+':''}${fmtN(d.Q-d.Qs)} คน · รายได้ ณ จุดคุ้มทุน = ${MM(beRev,3)} ล้านบาท`:'ไม่มีจุดคุ้มทุน'}</div></div></div>
    <div class="pdf-sec">1. ข้อมูลหลักสูตร</div>
    <div class="pdf-info-grid">
      <div class="pdf-info-box"><div class="pdf-info-label">ชื่อหลักสูตร</div><div class="pdf-info-val">${d.name}</div></div>
      <div class="pdf-info-box"><div class="pdf-info-label">สังกัดคณะ / วิทยาลัย</div><div class="pdf-info-val">${d.fac||'-'}</div></div>
      <div class="pdf-info-box"><div class="pdf-info-label">ระดับการศึกษา</div><div class="pdf-info-val">${d.level}</div></div>
      <div class="pdf-info-box"><div class="pdf-info-label">ประเภทหลักสูตร</div><div class="pdf-info-val">${typeLabel}</div></div></div>
    <div class="pdf-sec">2. ตัวชี้วัดทางการเงิน</div>
    <div class="pdf-kpi-row">
      <div class="pdf-kpi"><div class="pdf-kpi-label">นิสิตจริง (Q)</div><div class="pdf-kpi-val" style="color:#5938e0">${fmtN(d.Q)}</div><div style="font-size:9px;color:#9b95a6">คน</div></div>
      <div class="pdf-kpi"><div class="pdf-kpi-label">Q* จุดคุ้มทุน</div><div class="pdf-kpi-val" style="color:${statusColor}">${d.Qs?fmtN(d.Qs):'N/A'}</div><div style="font-size:9px;color:#9b95a6">คน</div></div>
      <div class="pdf-kpi"><div class="pdf-kpi-label">รายได้/หัว (R)</div><div class="pdf-kpi-val" style="color:#6d4cff">${fmtB(d.R)}</div><div style="font-size:9px;color:#9b95a6">บาท/คน</div></div>
      <div class="pdf-kpi"><div class="pdf-kpi-label">CM/หัว</div><div class="pdf-kpi-val" style="color:${d.CM>=0?'#3a8c00':'#c2383c'}">${fmtB(d.CM)}</div><div style="font-size:9px;color:#9b95a6">บาท/คน</div></div></div>
    <div class="pdf-sec">3. โครงสร้างต้นทุนและรายได้</div>
    <table class="pdf-table"><thead><tr><th>รายการ</th><th>สัญลักษณ์</th><th>จำนวนเงิน (บาท)</th><th>ล้านบาท</th></tr></thead><tbody>
      <tr><td>รายได้รวม</td><td>TR</td><td class="bold navy">${fmtB(d.TR)}</td><td class="navy">${MM(d.TR,3)}</td></tr>
      <tr><td>ต้นทุนรวม</td><td>TC</td><td class="bold">${fmtB(d.TC)}</td><td>${MM(d.TC,3)}</td></tr>
      <tr><td style="padding-left:20px;color:#5a5169">ต้นทุนคงที่รวม</td><td>TFC</td><td class="navy">${fmtB(d.TFC)}</td><td class="navy">${MM(d.TFC,3)}</td></tr>
      <tr><td style="padding-left:20px;color:#5a5169">ต้นทุนผันแปรรวม</td><td>TVC</td><td class="gold">${fmtB(d.TVC)}</td><td class="gold">${MM(d.TVC,3)}</td></tr>
      <tr><td style="padding-left:20px;color:#5a5169">ต้นทุนผันแปรต่อหน่วย</td><td>AVC</td><td class="gold">${fmtB(d.AVC)}</td><td class="gold">บ./คน</td></tr>
      <tr style="background:#f0ecff"><td style="font-weight:700">Contribution Margin/หน่วย</td><td>CM</td><td class="bold" style="color:${d.CM>=0?'#3a8c00':'#c2383c'}">${fmtB(d.CM)}</td><td style="color:${d.CM>=0?'#3a8c00':'#c2383c'};font-weight:700">บ./คน</td></tr>
      <tr style="background:${d.profit>=0?'#e6f8d9':'#ffe4e5'}"><td style="font-weight:700">ส่วนเกิน / ขาดทุน</td><td>π</td><td class="bold" style="color:${d.profit>=0?'#3a8c00':'#c2383c'}">${d.profit>=0?'+':''}${fmtB(d.profit)}</td><td style="color:${d.profit>=0?'#3a8c00':'#c2383c'};font-weight:700">${d.profit>=0?'+':''}${MM(d.profit,3)}</td></tr>
      ${d.Qs?`<tr style="background:#f8fafd"><td style="font-weight:700">รายได้ ณ จุดคุ้มทุน</td><td>BE Rev</td><td class="bold">${fmtB(beRev)}</td><td>${MM(beRev,3)}</td></tr><tr style="background:#f8fafd"><td style="font-weight:700">Margin of Safety</td><td>MoS</td><td class="bold ${MoS>=0?'green':'red'}">${fmtB(MoS)}</td><td class="${MoS>=0?'green':'red'}">${MM(MoS,3)}</td></tr>`:''}
    </tbody></table>
    <div class="pdf-sec">4. การคำนวณจุดคุ้มทุน</div>
    <div class="pdf-formula-box">Q* = TFC ÷ (R − AVC) = ${fmtB(d.TFC)} ÷ (${fmtB(d.R)} − ${fmtB(d.AVC)}) <strong style="color:#5938e0">${d.Qs?'= '+fmtN(d.Qs)+' คน':''}</strong></div>
    <div class="pdf-formula-box">π = (R − AVC) × Q − TFC = (${fmtB(d.R)} − ${fmtB(d.AVC)}) × ${fmtN(d.Q)} − ${fmtB(d.TFC)} = <strong style="color:${d.profit>=0?'#3a8c00':'#c2383c'}">${d.profit>=0?'+':''}${fmtB(d.profit)} บาท</strong></div>
    <div class="pdf-footer-line"><span>รายงานโดย MSU-BEPS · มหาวิทยาลัยมหาสารคาม · ปีการศึกษา 2568</span><span>หน้า 1 / 2</span></div>
  </div>
  <div class="pdf-page">
    ${hdr}</div>
    <div class="pdf-sec">5. กราฟเส้นจุดคุ้มทุน (Break-Even Chart)</div>
    <div style="text-align:center;margin-bottom:12px;border:1px solid #e2e8f2;border-radius:8px;overflow:hidden">${svg}</div>
    <div style="font-size:9.5px;color:#6f6880;text-align:center;margin-bottom:16px">จุดสีเข้ม (●) = Q* จุดคุ้มทุน${d.Qs?' = '+fmtN(d.Qs)+' คน':''} · จุดสีทอง (◆) = นิสิตจริง ${fmtN(d.Q)} คน</div>
    <div class="pdf-sec">6. ข้อเสนอแนะ</div>
    <div style="font-size:11.5px;color:#334155;line-height:2;background:#f8fafd;border-radius:8px;padding:14px 16px;border:1px solid #e2e8f2;margin-bottom:16px">
      ${d.isOk?`<strong style="color:#3a8c00">✅ หลักสูตรผ่านเกณฑ์จุดคุ้มทุน</strong><br>มีนิสิตจริง <strong>${fmtN(d.Q)} คน</strong> ${d.Qs?`เกินจุดคุ้มทุน <strong>${fmtN(d.Qs)} คน</strong> อยู่ <strong>+${fmtN(d.Q-d.Qs)} คน</strong>`:''} · CM <strong>${fmtB(d.CM)} บ./คน</strong> · ส่วนเกิน <strong>${MM(d.profit,3)} ล้านบาท</strong><br>แนะนำ: ${d.type==='new'?'สามารถเปิดหลักสูตรได้ตามแผน โดยรักษาจำนวนนิสิตไม่ต่ำกว่า '+(d.Qs?fmtN(d.Qs):'-')+' คน':'รักษาจำนวนนิสิตและโครงสร้างต้นทุนให้คงที่เพื่อความยั่งยืน และพิจารณานำส่วนเกินไปพัฒนาคุณภาพ'}`:`<strong style="color:#a67500">⚠️ หลักสูตรยังไม่ถึงจุดคุ้มทุน</strong><br>มีนิสิตจริง <strong>${fmtN(d.Q)} คน</strong> ต้องเพิ่มอีก <strong>${d.Qs?fmtN(d.Qs-d.Q):'-'} คน</strong> เพื่อให้ถึงจุดคุ้มทุน<br>แนะนำ: ${d.type==='new'?'ควรทบทวนแผนรับนิสิต เพิ่มการประชาสัมพันธ์ หรือลดต้นทุนคงที่ก่อนเปิดหลักสูตร':'ควรพิจารณาปรับโครงสร้างต้นทุน เพิ่มค่าธรรมเนียม หรือเพิ่มจำนวนนิสิตให้ถึงเกณฑ์ · หากพึ่งพางบแผ่นดินสูงควรวางแผนความยั่งยืน'}`}
    </div>
    <div class="pdf-sec">7. ผู้รับรองรายงาน</div>
    <div class="pdf-sig-grid">
      <div class="pdf-sig-box"><div class="sig-title">ผู้จัดทำ</div><div style="margin-top:4px">(...................................)</div><div style="margin-top:4px;font-size:9px">วันที่: ${dateStr}</div></div>
      <div class="pdf-sig-box"><div class="sig-title">ประธานหลักสูตร</div><div style="margin-top:4px">(...................................)</div><div style="margin-top:4px;font-size:9px">วันที่: .........................</div></div>
      <div class="pdf-sig-box"><div class="sig-title">คณบดี / ผู้อำนวยการ</div><div style="margin-top:4px">(...................................)</div><div style="margin-top:4px;font-size:9px">วันที่: .........................</div></div></div>
    <div style="margin-top:20px;padding:10px 14px;background:#f0ecff;border-radius:8px;border:1px solid rgba(109,76,255,.20);font-size:9.5px;color:#5938e0;line-height:1.8"><strong>อ้างอิงมาตรฐาน:</strong> การวิเคราะห์จุดคุ้มทุนอ้างอิงตาม Horngren, Datar & Rajan (2015) และหลักเกณฑ์กรมบัญชีกลาง (2566) ว่าด้วยการคำนวณต้นทุนต่อหน่วยผลผลิตของสถาบันอุดมศึกษา</div>
    <div class="pdf-footer-line"><span>รายงานโดย MSU-BEPS · มหาวิทยาลัยมหาสารคาม · ปีการศึกษา 2568</span><span>หน้า 2 / 2</span></div>
  </div>`;
  document.getElementById('pdf-report').innerHTML=report;
  document.getElementById('pdf-overlay').style.display='flex';
}
function reportDocHtml(){
  const reportEl=document.getElementById('pdf-report');
  if(!reportEl||!reportEl.innerHTML.trim())return null;
  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>รายงานการวิเคราะห์จุดคุ้มทุน — มหาวิทยาลัยมหาสารคาม</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#f0f4f8;font-family:'Sarabun','IBM Plex Sans Thai',sans-serif;color:#2e263d;padding:20px 0}
.toolbar{background:#5938e0;color:#fff;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.toolbar h2{font-size:14px;font-weight:700}.toolbar p{font-size:11px;opacity:.7;margin-top:2px}
.btn-print{background:#6d4cff;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-family:'Sarabun',sans-serif;font-size:13px;font-weight:700;cursor:pointer}
.btn-close{background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:8px;padding:8px 16px;font-family:'Sarabun',sans-serif;font-size:12px;cursor:pointer;margin-left:10px}
.page-wrap{max-width:794px;margin:20px auto}
.pdf-page{width:794px;min-height:1123px;padding:40px 48px;background:#fff;page-break-after:always;box-shadow:0 4px 20px rgba(0,0,0,.1);position:relative;margin-bottom:20px}
.pdf-page:last-child{page-break-after:auto}
.pdf-header{display:flex;align-items:center;gap:14px;padding-bottom:12px;border-bottom:3.5px solid #5938e0;margin-bottom:18px}
.pdf-logo{width:52px;height:52px;border-radius:8px;object-fit:contain;background:#f0f4fa;padding:3px}
.pdf-header-text h1{font-size:13.5px;font-weight:800;color:#5938e0;font-family:'Manrope',sans-serif}.pdf-header-text p{font-size:9.5px;color:#6f6880}
.pdf-title{font-size:18px;font-weight:800;color:#5938e0;margin:0 0 4px}.pdf-subtitle{font-size:11px;color:#6f6880;margin:0 0 16px}
.pdf-sec{font-size:9.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#6d4cff;margin:16px 0 7px;display:flex;align-items:center;gap:7px}
.pdf-sec::before{content:'';width:3px;height:11px;background:#6d4cff;border-radius:2px}
.pdf-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:14px}
.pdf-info-box{background:#f8fafd;border:1px solid #e2e8f2;border-radius:7px;padding:9px 13px}
.pdf-info-label{font-size:8px;font-weight:700;color:#9b95a6;text-transform:uppercase;margin-bottom:3px}.pdf-info-val{font-size:12.5px;font-weight:700;color:#2e263d}
.pdf-kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:14px}
.pdf-kpi{background:#f8fafd;border-radius:7px;padding:9px 11px;text-align:center;border:1px solid #e2e8f2}
.pdf-kpi-label{font-size:7.5px;font-weight:700;color:#9b95a6;text-transform:uppercase;margin-bottom:4px}.pdf-kpi-val{font-size:15px;font-weight:800}
.pdf-table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px}
.pdf-table th{background:#5938e0;color:#fff;padding:7px 11px;text-align:left;font-size:9px;font-weight:700}
.pdf-table th:last-child,.pdf-table td:last-child{text-align:right}
.pdf-table td{padding:7px 11px;border-bottom:1px solid #e2e8f2}.pdf-table tr:nth-child(even) td{background:#f8fafd}
.pdf-table .bold{font-weight:700}.pdf-table .navy{color:#5938e0;font-weight:700}.pdf-table .gold{color:#b8860b;font-weight:700}.pdf-table .green{color:#3a8c00;font-weight:700}.pdf-table .red{color:#c2383c;font-weight:700}
.pdf-result-box{border-radius:9px;padding:12px 16px;margin-bottom:14px;border:2px solid}.pdf-result-ok{background:#e6f8d9;border-color:#56ca00}.pdf-result-warn{background:#fff3d6;border-color:#ffb400}
.pdf-formula-box{background:#f0ecff;border:1px solid rgba(109,76,255,.25);border-radius:7px;padding:10px 14px;margin-bottom:10px;font-size:11.5px;color:#5938e0;line-height:1.8}
.pdf-sig-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:24px}
.pdf-sig-box{text-align:center;padding-top:45px;border-top:1px solid #334155;font-size:10px;color:#5a5169}.pdf-sig-box .sig-title{font-weight:700;color:#2e263d;font-size:10.5px}
.pdf-footer-line{position:absolute;bottom:24px;left:48px;right:48px;border-top:1px solid #e2e8f2;padding-top:7px;font-size:8px;color:#9b95a6;display:flex;justify-content:space-between}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{background:#fff!important;padding:0!important}.toolbar{display:none!important}.page-wrap{margin:0!important;max-width:none!important}.pdf-page{box-shadow:none!important;margin:0!important;min-height:auto!important}@page{size:A4;margin:0}}
</style></head><body>
<div class="toolbar"><div><h2>🖨 รายงานการวิเคราะห์จุดคุ้มทุน — มหาวิทยาลัยมหาสารคาม</h2><p>ตรวจสอบก่อนบันทึก · กด "พิมพ์ / บันทึก PDF" เพื่อดาวน์โหลด</p></div><div><button class="btn-print" onclick="window.print()">🖨 พิมพ์ / บันทึก PDF</button><button class="btn-close" onclick="window.close()">× ปิด</button></div></div>
<div class="page-wrap">${reportEl.innerHTML}</div></body></html>`;
}
function printPdfReport(){
  const doc=reportDocHtml();
  if(!doc){alert('ไม่มีข้อมูลรายงาน กรุณาคำนวณก่อน');return;}
  const w=window.open('','_blank','width=880,height=900,scrollbars=yes');
  if(!w){alert('เบราว์เซอร์บล็อก Pop-up — กรุณาอนุญาต หรือใช้ปุ่ม "ดาวน์โหลดไฟล์" แทน');return;}
  w.document.write(doc);w.document.close();
}
function _reportFilename(ext){
  const h=pgHist[0]||{};
  const safe=String(h.name||'รายงาน').replace(/[\\/:*?"<>|\s]+/g,'_').slice(0,60);
  return 'รายงานจุดคุ้มทุน_'+safe+'.'+ext;
}
function downloadReportHtml(){
  const doc=reportDocHtml();if(!doc){alert('ไม่มีข้อมูลรายงาน กรุณาคำนวณก่อน');return;}
  const blob=new Blob(['﻿'+doc],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=_reportFilename('html');document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);
}
async function downloadReport(){
  const rep=document.getElementById('pdf-report');
  if(!rep||!rep.innerHTML.trim()){alert('ไม่มีข้อมูลรายงาน กรุณาคำนวณก่อน');return;}
  const jsPDFctor=window.jspdf&&window.jspdf.jsPDF;
  if(!jsPDFctor||typeof window.html2canvas!=='function'){
    alert('ไม่สามารถโหลดตัวสร้าง PDF ได้ (ต้องมีอินเทอร์เน็ต) — จะดาวน์โหลดเป็นไฟล์ HTML ให้แทน ซึ่งเปิดแล้วสั่งพิมพ์เป็น PDF ได้');
    return downloadReportHtml();
  }
  const btn=document.getElementById('btn-dl-pdf'),old=btn?btn.textContent:'';
  if(btn){btn.textContent='⏳ กำลังสร้าง PDF...';btn.style.opacity='.7';btn.disabled=true;}
  try{
    const pages=[...rep.querySelectorAll('.pdf-page')];
    const pdf=new jsPDFctor('p','mm','a4');
    const W=210,H=297;
    for(let i=0;i<pages.length;i++){
      const canvas=await window.html2canvas(pages[i],{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false,windowWidth:pages[i].scrollWidth});
      const img=canvas.toDataURL('image/jpeg',0.95);
      if(i>0)pdf.addPage();
      const ratio=Math.min(W/canvas.width,H/canvas.height);
      const w=canvas.width*ratio,h=canvas.height*ratio;
      pdf.addImage(img,'JPEG',(W-w)/2,0,w,h,undefined,'FAST');
    }
    pdf.save(_reportFilename('pdf'));
  }catch(e){
    alert('เกิดข้อผิดพลาดในการสร้าง PDF — จะดาวน์โหลดเป็นไฟล์ HTML ให้แทน');
    downloadReportHtml();
  }finally{
    if(btn){btn.textContent=old;btn.style.opacity='1';btn.disabled=false;}
  }
}


/* ---- เริ่มทำงาน ---- */
window.renderPage = renderPgHist;
onPgTypeChange();
renderPgHist();
