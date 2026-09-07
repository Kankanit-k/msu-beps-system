/* ==========================================================================
   MSU-BEPS — W3 กราฟจุดคุ้มทุน
   ยกมาจาก prototype v8-1 โดยไม่แก้สูตร · ต้องโหลดหลัง core.js
   ========================================================================== */

/* ============ BE CHART ============ */
const LVL_ORDER=['ปริญญาตรี','ประกาศนียบัตร','ป.บัณฑิต','ปริญญาโท','ปริญญาเอก'];
const _li=x=>{const i=LVL_ORDER.indexOf(x);return i<0?99:i;};
function jsAgg(rows){
  const s=k=>rows.reduce((a,p)=>a+F0(p[k]),0);
  const Q=s('Q'),own=s('own'),TR=s('TR'),TFC=s('TFC'),TVC=s('TVC');
  const Rin=Q?TR/Q:0,Rex=Q?own/Q:0,AVC=Q?TVC/Q:0,CMi=Rin-AVC,CMe=Rex-AVC;
  return {Q,st:s('st'),own,TR,TFC,TVC,TC:TFC+TVC,Rin,Rex,AVC,
    Qin:CMi>0?Math.ceil(TFC/CMi-1e-9):null,Qex:CMe>0?Math.ceil(TFC/CMe-1e-9):null,
    tfcProg:s('tfcProg'),tfcOffice:s('tfcOffice'),dep:s('dep'),n:rows.length};
}
/* const el(...) ย้ายไปอยู่ใน core.js แล้ว */
function facLevels(fac){return [...new Set(RAW.PROGS.filter(p=>p.fac===fac).map(p=>p.lvl))].sort((a,b)=>_li(a)-_li(b));}
function progIdxOf(fac,lvl){return RAW.PROGS.map((p,i)=>[p,i]).filter(([p])=>p.fac===fac&&p.lvl===lvl);}
function chEntities(){
  const mode=el('ch-level').value, fSel=el('ch-fac'), lSel=el('ch-lvl'), pSel=el('ch-prog');
  fSel.style.display=(mode==='fac'||mode==='dep'||mode==='prog')?'':'none';
  lSel.style.display=(mode==='dep'||mode==='prog')?'':'none';
  pSel.style.display=(mode==='prog')?'':'none';
  // faculties
  if(!fSel.options.length) fSel.innerHTML=RAW.FACS.map((f,i)=>`<option value="${i}">${f.name}</option>`).join('');
  const fac=RAW.FACS[+fSel.value||0].name;
  // levels for this faculty
  if(mode==='dep'||mode==='prog'){
    const lvls=facLevels(fac), keep=lSel.value;
    lSel.innerHTML=lvls.map(l=>`<option value="${l}">${l}</option>`).join('');
    if(lvls.includes(keep)) lSel.value=keep;
  }
  // programs for this faculty+level
  if(mode==='prog'){
    const lvl=lSel.value||facLevels(fac)[0];
    const list=progIdxOf(fac,lvl), keep=pSel.value;
    pSel.innerHTML=list.map(([p,i])=>`<option value="${i}">${p.prog}</option>`).join('');
    if(list.some(([,i])=>String(i)===keep)) pSel.value=keep;
  }
}
el('ch-level').onchange=()=>{chEntities();renderChart();};
el('ch-fac').onchange=()=>{chEntities();renderChart();};
el('ch-lvl').onchange=()=>{chEntities();renderChart();};
el('ch-prog').onchange=renderChart;
function curEntity(){
  const mode=el('ch-level').value;
  if(mode==='uni')return {o:RAW.UNI,name:'มหาวิทยาลัยมหาสารคาม (รวมทุกคณะ)'};
  const fac=RAW.FACS[+el('ch-fac').value||0];
  if(mode==='fac')return {o:fac,name:fac.name};
  const lvl=el('ch-lvl').value||facLevels(fac.name)[0];
  if(mode==='dep'){const rows=RAW.PROGS.filter(p=>p.fac===fac.name&&p.lvl===lvl);return {o:jsAgg(rows),name:fac.name+' — '+lvl+' (รวม '+rows.length+' หลักสูตร)'};}
  const o=RAW.PROGS[+el('ch-prog').value||0];
  return {o,name:fac.name+' — '+o.prog+' ('+o.lvl+')'};
}
function renderChart(){
  if(!document.getElementById('ch-fac').options.length)chEntities();
  const {o,name}=curEntity();
  const tfc=F0(o.TFC),avc=AVC(o),r=R(o),q=F0(o.Q),qs=Qs(o);
  const xmax=Math.max(q,qs||0)*1.35||100;
  const pts=n=>[{x:0,y:tfc/1e6},{x:xmax,y:(tfc+avc*xmax)/1e6}];
  const trpts=[{x:0,y:0},{x:xmax,y:r*xmax/1e6}];
  const beX=qs||null;
  mk('ch-be',{type:'line',data:{datasets:[
    {label:'TR',data:trpts,borderColor:C.navy,backgroundColor:'rgba(109,76,255,.06)',borderWidth:2.5,pointRadius:0,fill:false,tension:0},
    {label:'TC',data:[{x:0,y:tfc/1e6},{x:xmax,y:(tfc+avc*xmax)/1e6}],borderColor:C.red,borderWidth:2.5,pointRadius:0,fill:false},
    {label:'TFC',data:[{x:0,y:tfc/1e6},{x:xmax,y:tfc/1e6}],borderColor:C.gold,borderWidth:1.5,borderDash:[6,4],pointRadius:0}
  ]},options:{responsive:true,maintainAspectRatio:false,parsing:false,interaction:{mode:'nearest',intersect:false},
    plugins:{legend:{display:false},tooltip:{callbacks:{title:c=>'นิสิต '+fmtN(c[0].parsed.x)+' คน',label:c=>c.dataset.label+': '+c.parsed.y.toLocaleString('th-TH',{maximumFractionDigits:1})+' ลบ.'}},
      annotation:false},
    scales:{x:{type:'linear',min:0,max:xmax,title:{display:true,text:'จำนวนนิสิต (คน)'},grid:{color:C.grid}},
      y:{title:{display:true,text:'มูลค่า (ล้านบาท)'},grid:{color:C.grid}}}}});
  // draw BE + actual markers via after render overlay using a simple plugin-less approach: add points datasets
  if(beX){
    const ch=charts['ch-be'];
    ch.data.datasets.push({label:'จุดคุ้มทุน',data:[{x:beX,y:r*beX/1e6}],borderColor:C.green,backgroundColor:C.green,pointRadius:6,pointStyle:'rectRot',showLine:false});
    ch.data.datasets.push({label:'ปัจจุบัน',data:[{x:q,y:r*q/1e6}],borderColor:C.navyD,backgroundColor:'#fff',pointRadius:6,pointBorderWidth:2,showLine:false});
    ch.update();
  }
  // kpis
  const s=status(o),sur=profit(o);
  document.getElementById('ch-kpis').innerHTML=[
    ['นิสิตปัจจุบัน (Q)',fmtN(o.Q)+' คน','cn'],
    ['จุดคุ้มทุน (Q*)',qs?fmtN(qs)+' คน':'ไม่มี','cr'],
    ['รายได้/หัว (R)',fmtB(r)+' บาท','co'],
    ['ต้นทุนผันแปร/หัว (AVC)',fmtB(avc)+' บาท','co'],
    ['กำไรส่วนเกิน/หัว (R−AVC)',fmtB(r-avc)+' บาท','cg'],
    ['ส่วนเกิน/ขาดทุน',(sur>=0?'+':'−')+fmtM(Math.abs(sur))+' ลบ.',sur>=0?'cg':'cr']
  ].map(k=>`<div class="kpi ${k[2]}"><div class="kpi-label">${k[0]}</div><div class="kpi-val num" style="font-size:19px">${k[1]}</div></div>`).join('');
  // summary
  const need=qs&&o.Q<qs?qs-o.Q:0;
  document.getElementById('ch-summary').innerHTML=`
    <div style="font-size:14px;font-weight:700;margin-bottom:6px">${name}</div>
    <div style="font-size:12px;color:var(--text2);line-height:1.8">
    หน่วยนี้มีนิสิต <b>${fmtN(o.Q)}</b> คน ต้นทุนคงที่ (TFC) <b>${fmtM(o.TFC)}</b> ลบ. ต้นทุนผันแปรต่อหัว (AVC) <b>${fmtB(avc)}</b> บาท และรายได้ต่อหัว (R) <b>${fmtB(r)}</b> บาท<br><br>
    ${s==='no'?`<span class="st-badge st-no" style="display:inline-block">R ≤ AVC</span> รายรับต่อหัวต่ำกว่าต้นทุนผันแปรต่อหัว จึงไม่มีจุดคุ้มทุน ณ ระดับราคาปัจจุบัน ต้องปรับค่าธรรมเนียมหรือลดต้นทุนผันแปร`:
      s==='ok'?`<span class="st-badge st-ok" style="display:inline-block">คุ้มทุนแล้ว</span> จำนวนนิสิตปัจจุบัน (${fmtN(o.Q)}) มากกว่าจุดคุ้มทุน (${fmtN(qs)}) อยู่ <b>${fmtN(o.Q-qs)}</b> คน สร้างส่วนเกิน <b class="pos">${fmtM(sur)}</b> ลบ.`:
      `<span class="st-badge st-loss" style="display:inline-block">ยังไม่คุ้มทุน</span> ต้องเพิ่มนิสิตอีก <b>${fmtN(need)}</b> คน (จาก ${fmtN(o.Q)} เป็น ${fmtN(qs)}) หรือลดต้นทุน/เพิ่มค่าธรรมเนียม จึงจะถึงจุดคุ้มทุน`}
    </div>`;
  chRecommend(o,name,r,avc,qs,sur,s);
}
function chRecommend(o,name,r,avc,qs,sur,s){
  const ATCe=o.Q?F0(o.TC)/o.Q:0, UNIatc=RAW.UNI.TC/RAW.UNI.Q, CM=r-avc;
  const rex=F0(o.Rex), qex=o.Qex, exNoBE=rex<=avc, exOk=(rex>avc)&&qex&&o.Q>=qex;
  const stateShare=(F0(o.st)+F0(o.own))?F0(o.st)/(F0(o.st)+F0(o.own)):0;
  const fcr=r>0?Math.ceil(F0(o.TC)/r):0;
  const mos=qs&&o.Q>qs?o.Q-qs:0;
  // ---- program administrators (tactical) ----
  const P=[];
  if(s==='no'){
    P.push({t:'crit',h:`ราคาต่อหัว (R <b>${fmtB(r)}</b>) ต่ำกว่าต้นทุนผันแปรต่อหัว (AVC <b>${fmtB(avc)}</b>) — <b>รับนิสิตเพิ่มยิ่งขาดทุน</b> ควรชะลอการขยายจนกว่าจะปรับโครงสร้างราคา/ต้นทุน`});
    P.push({t:'warn',h:`ตั้งเป้าให้ <b>R > AVC</b>: ทบทวนอัตราค่าธรรมเนียม หรือลดต้นทุนผันแปรต่อหัว (ค่าตอบแทนผู้สอน · ค่าวัสดุ · สาธารณูปโภค) ให้ต่ำกว่า ${fmtB(r)} บ./คน`});
    P.push({t:'info',h:`แนวทาง Full-Cost Recovery: ต้องมีนิสิตราว <b>${fmtN(fcr)} คน</b> ค่าเทอมรวมจึงครอบคลุมต้นทุน (ปัจจุบัน ${fmtN(o.Q)} คน) — พิจารณา<b>ควบรวม/ร่วมสอน</b>กับหลักสูตรใกล้เคียงเพื่อเฉลี่ยต้นทุนคงที่`});
  }else if(s==='loss'){
    P.push({t:'warn',h:`เพิ่มการรับเข้าอีก <b>${fmtN(qs-o.Q)} คน</b> (เป็น ${fmtN(qs)} คน) เพื่อถึงจุดคุ้มทุน — นิสิตแต่ละคนสมทบกำไรส่วนเกิน <b>${fmtB(CM)}</b> บ. เข้าไปชดเชยต้นทุนคงที่`});
    P.push({t:'info',h:`หรือเพิ่ม <b>CM ต่อหัว</b> ด้วยการขึ้นค่าธรรมเนียม/เพิ่มรายได้เสริม หรือลด AVC และ<b>ลดต้นทุนคงที่</b> (TFC ${fmtM(o.TFC)} ลบ.) โดยใช้ห้องเรียน/อาจารย์/ครุภัณฑ์ร่วมกับหลักสูตรอื่น`});
    P.push({t:'info',h:`เร่งการตลาดเชิงรุกในกลุ่มเป้าหมาย และรักษาอัตราคงอยู่ (retention) ไม่ให้จำนวนนิสิตหลุดต่ำลงไปอีก`});
  }else{
    P.push({t:'ok',h:`คุ้มทุนแล้ว มี <b>Margin of Safety ${fmtN(mos)} คน</b> (${o.Q?((mos/o.Q)*100).toFixed(0):0}% ของนิสิตปัจจุบัน) — ยังรองรับความเสี่ยงจำนวนนิสิตลดได้ระดับหนึ่ง`});
    P.push({t:'info',h:`นำส่วนเกิน <b>${fmtM(sur)} ลบ.</b> ไปพัฒนาคุณภาพหลักสูตร งานวิจัย หรือทุนนิสิต เพื่อรักษาความสามารถในการแข่งขันและดึงดูดผู้เรียน`});
    P.push({t:'warn',h:`ระวังการเพิ่มต้นทุนคงที่ (อัตรากำลัง/ครุภัณฑ์) ที่จะดันจุดคุ้มทุนสูงขึ้น — ประเมินความคุ้มค่าก่อนลงทุนเพิ่ม`});
  }
  if(BM==='in' && (exNoBE || !exOk))
    P.push({t:'crit',h:`โหมด "ไม่รวมเงินแผ่นดิน": หน่วยนี้${exNoBE?'<b>ยังไม่มีจุดคุ้มทุน</b>':'ต้องการ <b>'+fmtN(qex)+' คน</b>'} — สะท้อนการ<b>พึ่งพางบแผ่นดินสูง</b> ควรวางแผนเพิ่มรายได้ค่าธรรมเนียม/แหล่งทุนภายนอก`});
  // ---- faculty / university administrators (strategic) ----
  const E=[];
  E.push({t:stateShare>=0.4?'warn':'info',h:`พึ่งพางบประมาณเงินแผ่นดิน <b>${(stateShare*100).toFixed(0)}%</b> ของรายได้ — ${stateShare>=0.5?'สัดส่วนสูงมาก ควรเร่งกระจายความเสี่ยงด้านรายได้':stateShare>=0.4?'สัดส่วนค่อนข้างสูง ควรติดตามใกล้ชิด':'อยู่ในระดับบริหารจัดการได้'}`});
  if(s==='ok'&&sur>0)
    E.push({t:'ok',h:`เป็นหน่วยที่<b>สร้างส่วนเกิน (+${fmtM(sur)} ลบ.)</b> — พิจารณาให้ช่วยอุ้มหลักสูตรเชิงยุทธศาสตร์ที่จำเป็นแต่ยังไม่คุ้มทุน (<b>cross-subsidy</b>) โดยกำหนดเพดานและตัวชี้วัดชัดเจน`});
  else
    E.push({t:'crit',h:`หน่วยนี้<b>ขาดทุน (${fmtM(sur)} ลบ.)</b> — ระดับคณะ/มหาวิทยาลัยควรตัดสินใจเชิงพอร์ต: สนับสนุนต่อ (หากเป็นพันธกิจ/ยุทธศาสตร์), ปรับโครงสร้าง หรือควบรวม โดยคำนึงต้นทุนคงที่ที่จมอยู่`});
  E.push({t:'info',h:`ต้นทุนต่อหัว <b>${fmtB(ATCe)}</b> บ. ${ATCe>UNIatc?'<b>สูงกว่า</b>':'ต่ำกว่า'}ค่าเฉลี่ยมหาวิทยาลัย (${fmtB(UNIatc)}) — ${o.Q<800?'หน่วยขนาดเล็กทำให้ต้นทุนคงที่เฉลี่ยต่อหัวสูง ควรใช้ทรัพยากร/รวมชั้นเรียนข้ามหลักสูตร':'ขนาดอยู่ในเกณฑ์ที่ได้ประโยชน์จากการประหยัดต่อขนาด'}`});
  E.push({t:'info',h:`ภาพรวม มมส. มีต้นทุนคงที่ ~<b>62%</b> ของต้นทุนรวม — การเติมนิสิตในหลักสูตรที่ยังมีที่ว่างช่วยลดต้นทุนต่อหัวทั้งระบบ (economies of scale) ควรจัดสรรโควตารับเข้าไปยังหลักสูตรที่มี CM เป็นบวกและยังไม่เต็ม`});
  E.push({t:'warn',h:`ใช้ตัวเลข "<b>ไม่รวมเงินแผ่นดิน</b>" เป็นเกณฑ์ความยั่งยืนระยะยาว และเตรียมแผนรองรับกรณีถูกปรับลดงบอุดหนุน (ทั้งมหาวิทยาลัยมีส่วนเกิน ${fmtM(F0(RAW.UNI.TR)-F0(RAW.UNI.TC))} ลบ. เมื่อรวมเงินแผ่นดิน แต่ขาดทุนหากตัดงบส่วนนี้)`});
  renderInsights('ch-rec-prog',P);
  renderInsights('ch-rec-exec',E);
}


/* ---- เริ่มทำงาน ---- */
window.renderPage = ()=>{chEntities();renderChart();};
chEntities();
renderChart();
