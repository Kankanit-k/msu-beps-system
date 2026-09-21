/* ==========================================================================
   MSU-BEPS — W6 คำนวณจุดคุ้มทุนรายคณะ (Scenario)
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

function initInpFac(){
  const sel=document.getElementById('inp-fac-sel');if(!sel||sel.options.length>1)return;
  RAW.FACS.forEach(f=>{const o=document.createElement('option');o.value=f.name;o.textContent=f.name;sel.appendChild(o);});
  sel.onchange=onInpFacChange;
  ['inp-q','inp-st','inp-own'].forEach(id=>{const e=document.getElementById(id);if(e)e.addEventListener('input',updatePre);});
}
function onInpFacChange(){
  const v=document.getElementById('inp-fac-sel').value, badge=document.getElementById('inp-fac-badge');
  const setV=(id,val)=>{const e=document.getElementById(id);if(e)e.value=val;};
  if(!v||!FAC_DATA[v]){badge.style.display='none';return;}
  const d=FAC_DATA[v];
  setV('inp-q',d.Q);setV('inp-st',Math.round(d.st));setV('inp-own',Math.round(d.own));setV('inp-tr',Math.round(d.TR));setV('inp-name',v);
  const t=document.getElementById('tfc-items');t.innerHTML='';addRow('tfc-items','TFC','ต้นทุนคงที่รวม (TFC)',Math.round(d.TFC));
  const c=document.getElementById('tvc-items');c.innerHTML='';addRow('tvc-items','TVC','ต้นทุนผันแปรรวม (TVC)',Math.round(d.TVC));
  badge.style.display='';
  badge.innerHTML=`✓ ดึงจากระบบ — Q = ${fmtN(d.Q)} คน · แผ่นดิน ${fmtB(d.st)} + รายได้ ${fmtB(d.own)} = TR ${fmtB(d.TR)} บ. · TFC ${fmtB(d.TFC)} · TVC ${fmtB(d.TVC)} บ. | <b>Q* ระบบ:</b> รวมแผ่นดิน ${d.Qin?fmtN(d.Qin):'—'} คน · ไม่รวม ${d.Qex?fmtN(d.Qex)+' คน':'ไม่มี (CM≤0)'}`;
  updateSums();
}
function buildCostOpts(type,sel){
  const presets=type==='TFC'?TFC_PRESETS:TVC_PRESETS;
  let o='<option value="">-- เลือกรายการ --</option>';
  presets.forEach(l=>{o+=`<option value="${l}" ${l===sel?'selected':''}>${l}</option>`;});
  o+='<option value="__custom__">— กรอกเอง —</option>';return o;
}
function onCostSelChange(sel){
  const row=sel.closest('.cost-row');if(!row)return;
  const custom=row.querySelector('.cost-custom');
  if(sel.value==='__custom__'){custom.style.display='';custom.focus();}else{custom.style.display='none';}
  updateSums();
}
function addRow(containerId,type,label='',val=''){
  const d=document.createElement('div');d.className='cost-row';
  d.innerHTML=`<select class="cost-sel" onchange="onCostSelChange(this)">${buildCostOpts(type,label)}</select>
    <input type="text" class="cost-custom" placeholder="ชื่อรายการ (กรอกเอง)" oninput="updateSums()">
    <input type="number" value="${val||''}" placeholder="0" class="cost-amt" oninput="updateSums()">
    <button class="btn-del" onclick="this.closest('.cost-row').remove();updateSums()" title="ลบ">×</button>`;
  document.getElementById(containerId).appendChild(d);updateSums();
}
function getSum(id){let s=0;document.querySelectorAll('#'+id+' input[type=number]').forEach(i=>s+=parseFloat(i.value)||0);return s;}
function updateSums(){
  const ts=getSum('tfc-items'),vs=getSum('tvc-items');
  const a=document.getElementById('tfc-sum'),b=document.getElementById('tvc-sum');
  if(a)a.textContent=fmtB(ts);if(b)b.textContent=fmtB(vs);updatePre();
}
function updatePre(){
  const num=id=>parseFloat((document.getElementById(id)||{}).value)||0;
  const Q=num('inp-q'),ST=num('inp-st'),OWN=num('inp-own'),TR=ST+OWN;
  const trH=document.getElementById('inp-tr');if(trH)trH.value=TR;
  const TFC=getSum('tfc-items'),TVC=getSum('tvc-items'),TC=TFC+TVC,AVC=Q>0?TVC/Q:0;
  const f=v=>v>0?fmtB(v):'—',set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('pre-q',Q>0?fmtN(Q):'—');set('pre-tr',f(TR));set('pre-tc',f(TC));set('pre-tfc',f(TFC));set('pre-tvc',f(TVC));
  set('pre-avc',f(AVC));set('pre-rin',f(Q>0?TR/Q:0));set('pre-rex',f(Q>0?OWN/Q:0));
}
function calcInp(){
  const num=id=>parseFloat((document.getElementById(id)||{}).value)||0;
  const name=document.getElementById('inp-fac-sel').value||document.getElementById('inp-name').value||'ไม่ระบุชื่อ';
  const Q=num('inp-q'),ST=num('inp-st'),OWN=num('inp-own'),TR=ST+OWN;
  const TFC=getSum('tfc-items'),TVC=getSum('tvc-items'),TC=TFC+TVC,AVC=Q>0?TVC/Q:0;
  if(Q<=0||TR<=0||TC<=0){document.getElementById('inp-result').innerHTML='<div class="ins" style="margin:0;border-left-color:var(--gold2)"><b>⚠ กรุณากรอก จำนวนนิสิต, งบประมาณ และต้นทุน ให้ครบก่อนคำนวณ</b></div>';document.getElementById('btn-save').style.display='none';return;}
  const calc=rev=>{const R=Q>0?rev/Q:0,CM=R-AVC;const Qs=CM>0?CEILq(TFC/CM):(R>0?CEILq(TC/R):null);return {R,CM,Qs,full:CM<=0,profit:rev-TC,isOk:Qs?Q>=Qs:false};};
  const A=calc(TR),B=calc(OWN);
  _lastInp={name,Q,ST,OWN,TR,TFC,TVC,TC,AVC,A,B};
  const box=(t,c,m)=>`<div style="border:1.5px solid ${c};border-radius:10px;padding:12px 14px;background:${m.isOk?'var(--green3)':'var(--red3)'}">
    <div style="font-size:10px;font-weight:800;color:${c};text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">${t}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11.5px">
      <div>R/หัว: <b>${fmtB(m.R)}</b></div><div>CM/หัว: <b style="color:${m.CM>0?'var(--green)':'var(--red)'}">${fmtB(m.CM)}</b></div>
      <div>Q*: <b style="color:var(--red)">${m.Qs?fmtN(m.Qs)+' คน':'—'}</b>${m.full?' <span style="font-size:8px;font-weight:800;padding:1px 4px;border-radius:6px;background:var(--gold4);color:var(--gold)">TC/R</span>':''}</div>
      <div>ส่วนเกิน: <b style="color:${m.profit>=0?'var(--green)':'var(--red)'}">${m.profit>=0?'+':'−'}${MM(Math.abs(m.profit),2)} ล.</b></div></div>
    <div style="margin-top:8px;font-size:11px;font-weight:700;color:${m.isOk?'var(--green)':'var(--red)'}">${!m.Qs?'⚠ คำนวณไม่ได้':(m.full?'⚠ CM≤0 · ใช้ TC/R · ':'')+(m.isOk?'✓ เกินจุดคุ้มทุน +'+fmtN(Q-m.Qs)+' คน':'⚠ ขาดอีก '+fmtN(m.Qs-Q)+' คน')}</div></div>`;
  document.getElementById('inp-result').innerHTML=`<div style="font-size:14px;font-weight:700;color:var(--navy);margin-bottom:4px">${name}</div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:11px">นิสิต ${fmtN(Q)} คน · TFC ${MM(TFC,2)} ล. · TVC ${MM(TVC,2)} ล. · AVC ${fmtB(AVC)} บ./คน</div>
    <div style="display:flex;flex-direction:column;gap:9px">${box('กรณีรวมเงินแผ่นดิน','var(--navy2)',A)}${box('กรณีไม่รวมเงินแผ่นดิน','var(--gold)',B)}</div>`;
  document.getElementById('btn-save').style.display='block';
}
function saveInp(){if(!_lastInp)return;inpList.push({..._lastInp});renderInpList();}
function renderInpList(){
  const el=document.getElementById('inp-saved');if(!el)return;
  if(!inpList.length){el.innerHTML='<div style="padding:16px;text-align:center;color:var(--text4);font-size:12px">ยังไม่มีรายการ</div>';return;}
  el.innerHTML='<div style="overflow-x:auto"><table class="tbl" style="min-width:720px"><thead><tr><th>#</th><th>ชื่อ</th><th class="num">Q</th><th class="num">TFC(ล.)</th><th class="num">AVC/หัว</th><th class="num">Q* รวมแผ่นดิน</th><th class="num">Q* ไม่รวม</th><th class="num">สถานะ</th></tr></thead><tbody>'
    +inpList.map((f,i)=>{const A=f.A||{},B=f.B||{},okA=A.Qs&&f.Q>=A.Qs,okB=B.Qs&&f.Q>=B.Qs;
      return `<tr><td>${i+1}</td><td style="font-weight:600;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${f.name}">${f.name}</td><td class="num">${fmtN(f.Q)}</td><td class="num">${MM(f.TFC,2)}</td><td class="num" style="color:var(--gold)">${fmtB(f.AVC)}</td><td class="num ${okA?'pos':'neg'}">${A.Qs?fmtN(A.Qs):'—'}</td><td class="num ${okB?'pos':'neg'}">${B.Qs?fmtN(B.Qs):'—'}</td><td style="text-align:right"><span class="st-badge ${okA?'st-ok':'st-loss'}" style="display:inline-block">${okA?'✓ คุ้ม':'⚠ ไม่คุ้ม'}</span></td></tr>`;}).join('')
    +'</tbody></table></div>';
}
// ---- program self-calc ----
/* ---- เริ่มทำงาน ---- */
window.renderPage = ()=>{updatePre();renderInpList();};
initInpFac();
renderInpList();
updatePre();
