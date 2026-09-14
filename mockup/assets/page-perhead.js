/* ==========================================================================
   MSU-BEPS — W4 รายได้ vs ต้นทุนต่อหัว
   ยกมาจาก prototype v8-1 โดยไม่แก้สูตร · ต้องโหลดหลัง core.js
   ========================================================================== */

/* ============ PER-HEAD ============ */
function renderPerhead(){
  const F=RAW.FACS, U=RAW.UNI;
  const D=F.map(f=>({...f,R:R(f),ATC:ATC(f),AVC:AVC(f),CM:R(f)-AVC(f),diff:R(f)-ATC(f)}));
  const G=D.filter(d=>d.Q>=OUTLIER_MIN_Q);
  const nEx=D.length-G.length;
  const Ru=R(U),ATCu=ATC(U),diff=Ru-ATCu,nOk=D.filter(d=>d.diff>=0).length;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  document.getElementById('ph-note').innerHTML=`<b>ATC (ต้นทุนรวม/หัว) และ AVC ไม่เปลี่ยนตามโหมด</b> — เปลี่ยนเฉพาะ <b>R</b> · โหมด: <b>${BM==='in'?'รวมเงินแผ่นดิน':'ไม่รวมเงินแผ่นดิน'}</b> → R เฉลี่ย ${fmtB(Ru)} เทียบ ATC ${fmtB(ATCu)} บ./คน`;
  set('ph-k1',fmtB(Ru));set('ph-k2',fmtB(ATCu));
  set('ph-k3',(diff>=0?'+':'−')+fmtB(Math.abs(diff)));
  const k3=document.getElementById('ph-k3');k3.style.color=diff>=0?'var(--green2)':'var(--red2)';
  const k3p=k3.closest('.kpi');k3p.classList.toggle('cg',diff>=0);k3p.classList.toggle('cr',diff<0);
  set('ph-k3s',diff>=0?'บาท/คน · กำไรต่อหัว':'บาท/คน · ขาดทุนต่อหัว');
  set('ph-k4',nOk+'/'+F.length);
  set('ph-legr',BM==='in'?'รายได้/หัว (R)':'รายได้/หัว (ไม่รวมแผ่นดิน)');
  set('ph-thr',BM==='in'?'R/หัว':'R/หัว (ไม่รวมแผ่นดิน)');
  document.getElementById('ph-ex').textContent=nEx>0?`กราฟไม่รวม ${nEx} หน่วยที่นิสิต < ${OUTLIER_MIN_Q} คน (ATC สูงผิดปกติ) — ดูในตารางด้านล่าง`:'';
  // main grouped bar
  mk('ph-main',{type:'bar',data:{labels:G.map((_,i)=>i+1),datasets:[
    {label:'R',data:G.map(d=>Math.round(d.R)),backgroundColor:C.green,borderRadius:3},
    {label:'ATC',data:G.map(d=>Math.round(d.ATC)),backgroundColor:C.gold,borderRadius:3},
    {label:'AVC',data:G.map(d=>Math.round(d.AVC)),backgroundColor:C.navy,borderRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},
      tooltip:{callbacks:{title:it=>'ลำดับ '+(it[0].dataIndex+1)+' — '+short(G[it[0].dataIndex].name),
        label:c=>({0:'R',1:'ATC',2:'AVC'}[c.datasetIndex]||'')+': '+fmtB(c.parsed.y)+' บ./คน',
        afterBody:it=>{const d=G[it[0].dataIndex];return ['','นิสิต '+fmtN(d.Q)+' คน',(d.diff>=0?'✓ กำไรต่อหัว +':'⚠ ขาดทุนต่อหัว −')+fmtB(Math.abs(d.diff))+' บ.'];}}}},
      scales:{x:{grid:{color:C.grid},title:{display:true,text:'ลำดับคณะ'},ticks:{autoSkip:false,maxRotation:0}},
        y:{grid:{color:C.grid},beginAtZero:true,title:{display:true,text:'บาท/คน'},ticks:{callback:v=>(v/1000).toFixed(0)+'k'}}}}});
  // scatter R vs ATC
  const maxV=Math.max(...G.map(d=>Math.max(d.R,d.ATC)))*1.08,maxQ=Math.max(...G.map(d=>d.Q));
  mk('ph-scatter',{type:'bubble',data:{datasets:[
    ...G.map(d=>({label:d.name,data:[{x:Math.round(d.ATC),y:Math.round(d.R),r:Math.max(4,Math.sqrt(d.Q/maxQ)*18)}],
      backgroundColor:d.diff>=0?'rgba(12,166,120,.55)':'rgba(230,73,128,.55)',borderColor:d.diff>=0?C.green:C.red,borderWidth:1.5})),
    {label:'เส้นคุ้มทุน (R = ATC)',type:'line',data:[{x:0,y:0},{x:maxV,y:maxV}],borderColor:'#9b95a6',borderWidth:1.5,borderDash:[6,4],pointRadius:0,fill:false}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},
      tooltip:{callbacks:{label:c=>{if(c.dataset.type==='line')return null;const d=G.find(x=>x.name===c.dataset.label);if(!d)return c.dataset.label;return [short(d.name),'R='+fmtB(d.R)+' | ATC='+fmtB(d.ATC),(d.diff>=0?'✓ +':'⚠ −')+fmtB(Math.abs(d.diff))+' บ./คน · '+fmtN(d.Q)+' คน'];}}}},
      scales:{x:{min:0,max:maxV,grid:{color:C.grid},title:{display:true,text:'ต้นทุน/หัว ATC (บาท) →'},ticks:{callback:v=>(v/1000).toFixed(0)+'k'}},
        y:{min:0,max:maxV,grid:{color:C.grid},title:{display:true,text:'รายได้/หัว R (บาท) →'},ticks:{callback:v=>(v/1000).toFixed(0)+'k'}}}}});
  // top cost bars
  const pTop=[...D].filter(d=>d.Q>50).sort((a,b)=>b.ATC-a.ATC).slice(0,8);
  const bCols=['#ff4c51','#f03e3e','#ffb400','#ffc333','#6d4cff','#8b6fff','#56ca00','#5938e0'];
  const mc=pTop.length?pTop[0].ATC||1:1;
  document.getElementById('ph-topbar').innerHTML=pTop.map((d,i)=>`<div class="bar-item"><div class="bar-row"><span class="bar-name" title="${d.name}">${short(d.name)}</span><span class="bar-val" style="color:${bCols[i]};font-size:12px">${fmtB(d.ATC)} <span style="font-size:9px;color:var(--text4)">${(d.ATC/ATCu).toFixed(1)}×</span></span></div><div class="bar-track"><div class="bar-fill" style="background:${bCols[i]};width:${(d.ATC/mc*100).toFixed(0)}%"></div></div></div>`).join('');
  // table (filterable)
  _phSorted=[...D].sort((a,b)=>b.diff-a.diff);
  renderPhTable();
  // insights
  const bad=D.filter(d=>d.diff<0).sort((a,b)=>a.diff-b.diff),good=D.filter(d=>d.diff>=0).sort((a,b)=>b.diff-a.diff);
  const I=[];
  I.push(diff>=0?{t:'ok',h:`เฉลี่ยทั้งมหาวิทยาลัย <b>รายได้/หัว ${fmtB(Ru)} บ.</b> สูงกว่า <b>ต้นทุน/หัว ${fmtB(ATCu)} บ.</b> อยู่ <b>+${fmtB(diff)} บ./คน</b>`}
    :{t:'crit',h:`เฉลี่ยทั้งมหาวิทยาลัย <b>ขาดทุน ${fmtB(Math.abs(diff))} บ./คน</b> — รายได้/หัว ${fmtB(Ru)} ต่ำกว่าต้นทุน/หัว ${fmtB(ATCu)} บ.`});
  if(bad.length)I.push({t:bad.length>=10?'crit':'warn',h:`<b>${bad.length}/${D.length} คณะมีต้นทุน/หัว สูงกว่ารายได้/หัว</b> — ขาดทุนต่อหัวมากสุด: ${bad.slice(0,3).map(d=>`${short(d.name)} (−${fmtB(Math.abs(d.diff))})`).join(', ')}`});
  if(good.length)I.push({t:'ok',h:`คุ้มค่าที่สุดต่อหัว: <b>${short(good[0].name)} +${fmtB(good[0].diff)} บ./คน</b> (R ${fmtB(good[0].R)} · ATC ${fmtB(good[0].ATC)})`});
  const big=D.filter(d=>d.Q>=3000),small=D.filter(d=>d.Q<1000&&d.Q>=OUTLIER_MIN_Q);
  const med=a=>{if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y),h=Math.floor(b.length/2);return b.length%2?b[h]:(b[h-1]+b[h])/2;};
  if(big.length&&small.length){const ab=med(big.map(d=>d.ATC)),as=med(small.map(d=>d.ATC));if(as>ab)I.push({t:'info',h:`<b>Economies of Scale</b>: คณะใหญ่ (≥3,000 คน) ต้นทุน/หัวมัธยฐาน <b>${fmtB(ab)}</b> · คณะเล็ก (<1,000) <b>${fmtB(as)}</b> — สูงกว่า <b>${(as/ab).toFixed(1)}×</b> เพราะต้นทุนคงที่กระจายบนนิสิตน้อย`});}
  D.filter(d=>d.Q<OUTLIER_MIN_Q).forEach(f=>I.push({t:'crit',h:`<b>${f.name}</b> มีนิสิตเพียง <b>${fmtN(f.Q)} คน</b> แต่ต้นทุนรวม ${fmtM(f.TC)} ลบ. → ต้นทุน/หัว ${fmtB(f.ATC)} บ. (${(f.ATC/ATCu).toFixed(0)}× ค่าเฉลี่ย) — เป็นหน่วยวิจัย จึงกันออกจากกราฟ`}));
  renderInsights('ph-ins',I);
}
let _phSorted=[],phSearch='',phFilter='all';
function phTableHL(s){
  if(!phSearch)return s;
  const i=s.toLowerCase().indexOf(phSearch);
  if(i<0)return s;
  return s.slice(0,i)+'<mark>'+s.slice(i,i+phSearch.length)+'</mark>'+s.slice(i+phSearch.length);
}
function phTextHit(d){
  if(!phSearch)return true;
  const stWord=d.diff>=0?'คุ้ม':'ขาด';
  return d.name.toLowerCase().includes(phSearch)||stWord.includes(phSearch);
}
function renderPhTable(){
  const body=document.getElementById('ph-tbl');
  const rows=_phSorted.map((d,i)=>({d,rank:i+1}))
    .filter(x=>phTextHit(x.d))
    .filter(x=>phFilter==='all'||(phFilter==='ok'?x.d.diff>=0:x.d.diff<0));
  if(!rows.length){body.innerHTML=`<tr><td colspan="9" class="be-empty" style="padding:26px">🔍 ไม่พบคณะที่ตรงกับเงื่อนไขที่เลือก</td></tr>`;return;}
  body.innerHTML=rows.map(({d,rank})=>{
    const ok=d.diff>=0;
    return `<tr><td><span class="rank ${rank<=3?'r'+rank:''}">${rank}</span></td><td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600" title="${d.name}">${phTableHL(d.name)}</td>
      <td class="num">${fmtN(d.Q)}</td><td class="num" style="color:var(--green2)">${fmtB(d.R)}</td><td class="num" style="color:var(--gold)">${fmtB(d.ATC)}</td>
      <td class="num" style="color:var(--navy2)">${fmtB(d.AVC)}</td><td class="num ${d.CM>0?'pos':'neg'}">${d.CM>0?'+':'−'}${fmtB(Math.abs(d.CM))}</td>
      <td class="num ${ok?'pos':'neg'}" style="font-weight:700">${ok?'+':'−'}${fmtB(Math.abs(d.diff))}</td>
      <td style="text-align:right"><span class="st-badge ${ok?'st-ok':'st-loss'}" style="display:inline-block">${ok?'✓ คุ้ม':'⚠ ขาด'}</span></td></tr>`;}).join('');
}
(function initPhSearch(){
  const inp=document.getElementById('ph-search'),wrap=inp.closest('.be-search-wrap'),clr=document.getElementById('ph-search-clear');
  inp.addEventListener('input',()=>{phSearch=inp.value.trim().toLowerCase();wrap.classList.toggle('has-val',!!inp.value);renderPhTable();});
  clr.onclick=()=>{inp.value='';phSearch='';wrap.classList.remove('has-val');renderPhTable();inp.focus();};
  const QF=[['all','ทั้งหมด'],['ok','✓ คุ้ม'],['loss','⚠ ขาด']];
  document.getElementById('ph-quick').innerHTML=QF.map(q=>`<button class="be-qbtn${q[0]==='all'?' on':''}" data-f="${q[0]}">${q[1]}</button>`).join('');
  document.querySelectorAll('#ph-quick .be-qbtn').forEach(btn=>btn.onclick=()=>{
    phFilter=btn.dataset.f;
    document.querySelectorAll('#ph-quick .be-qbtn').forEach(x=>x.classList.toggle('on',x===btn));
    renderPhTable();
  });
})();


/* ---- เริ่มทำงาน ---- */
window.renderPage = renderPerhead;
renderPerhead();
