/* ==========================================================================
   MSU-BEPS — W2 เจาะลึกจุดคุ้มทุน 3 ระดับ
   ยกมาจาก prototype v8-1 โดยไม่แก้สูตร · ต้องโหลดหลัง core.js
   ========================================================================== */

/* ============ BREAKEVEN DRILL ============ */
let expanded={fac:{},dep:{}};
let beSearch='',beFilter='all';
const beNorm=s=>(s||'').toString().toLowerCase();
function beProgHit(p){
  const t=beSearch;
  const txt=!t||beNorm(p.prog).includes(t)||beNorm(p.deg).includes(t)||beNorm(p.fac).includes(t)||beNorm(p.lvl).includes(t)||beNorm(p.grp).includes(t);
  const st=beFilter==='all'||status(p)===beFilter;
  return txt&&st;
}
function beFacText(name){ // does the faculty/level name itself match the text term
  return beSearch && beNorm(name).includes(beSearch);
}
function hl(s){
  if(!beSearch)return s;
  const i=beNorm(s).indexOf(beSearch);
  if(i<0)return s;
  return s.slice(0,i)+'<mark>'+s.slice(i,i+beSearch.length)+'</mark>'+s.slice(i+beSearch.length);
}
function renderBreakeven(){
  document.getElementById('be-note').textContent=noteTxt();
  const P=RAW.PROGS;
  const ok=P.filter(x=>status(x)==='ok').length;
  const no=P.filter(x=>status(x)==='no').length;
  const loss=P.filter(x=>status(x)==='loss').length;
  const sur=P.reduce((s,x)=>s+profit(x),0);
  document.getElementById('be-ok').textContent=fmtN(ok);
  document.getElementById('be-loss').textContent=fmtN(loss+no);
  document.getElementById('be-no').textContent=fmtN(no);
  document.getElementById('be-sur').textContent=(sur>=0?'+':'−')+fmtM(Math.abs(sur));
  document.getElementById('be-sur').className='kpi-val num '+(sur>=0?'pos':'neg');
  buildTree();
  // insights
  const byLoss=[...P].filter(x=>status(x)!=='ok').sort((a,b)=>profit(a)-profit(b)).slice(0,3);
  const gap=[...P].filter(x=>status(x)==='loss').sort((a,b)=>(Qs(b)-b.Q)-(Qs(a)-a.Q)).slice(0,1)[0];
  document.getElementById('be-ins').innerHTML=[
    `จาก 230 หลักสูตร มี <b>${fmtN(ok)}</b> หลักสูตรที่คุ้มทุนแล้ว, <b>${fmtN(loss)}</b> ยังไม่ถึงจุดคุ้มทุน และ <b>${fmtN(no)}</b> หลักสูตรที่ R ≤ AVC (ไม่มีจุดคุ้มทุน ณ ราคาปัจจุบัน)`,
    gap?`หลักสูตรที่ต้องเพิ่มนิสิตมากสุดเพื่อคุ้มทุน: <b>${gap.prog}</b> (${short(gap.fac)}) ปัจจุบัน ${fmtN(gap.Q)} คน ต้องการ ${fmtN(Qs(gap))} คน — ขาดอีก ${fmtN(Qs(gap)-gap.Q)} คน`:'',
    byLoss.length?`หลักสูตรขาดทุนสูงสุด: `+byLoss.map(x=>`<b>${x.prog}</b> (${fmtM(profit(x))} ลบ.)`).join(', '):''
  ].filter(Boolean).map(t=>`<li>${t}</li>`).join('');
}
function cellsFor(o){
  const s=status(o), sur=profit(o);
  const stTxt=s==='ok'?'คุ้มทุน':(s==='no'?'R≤AVC':'ยังไม่คุ้ม');
  const stCls=s==='ok'?'st-ok':(s==='no'?'st-no':'st-loss');
  return `<div class="num">${fmtN(o.Q)}</div>
    <div class="num">${Qs(o)?fmtN(Qs(o)):'—'}</div>
    <div class="num">${fmtB(R(o))}</div>
    <div class="num" style="color:var(--text3)">${fmtB(AVC(o))}</div>
    <div class="num">${fmtM(TRc(o))}</div>
    <div class="num ${sur>=0?'pos':'neg'}" style="font-weight:700">${sur>=0?'+':'−'}${fmtM(Math.abs(sur))}</div>
    <div class="st-badge ${stCls}">${stTxt}</div>`;
}
function buildTree(){
  const host=document.getElementById('be-tree');
  const F=RAW.FACS, D=RAW.DEPTS, P=RAW.PROGS;
  const filtering=!!beSearch||beFilter!=='all';
  let html='',shownProgs=0,shownFacs=0;
  F.forEach((f,fi)=>{
    const facProgs=P.filter(p=>p.fac===f.name);
    const hitProgs=filtering?facProgs.filter(beProgHit):facProgs;
    if(filtering && hitProgs.length===0) return;      // hide faculties with no match
    shownFacs++;
    const open=filtering?true:expanded.fac[f.name];    // auto-expand while filtering
    html+=`<div class="tree-row lvl-fac" data-fac="${fi}"><div class="tw-name"><span class="caret ${open?'open':''}">▶</span><span class="nm" title="${f.name}">${hl(f.name)}</span></div>${cellsFor(f)}</div>`;
    if(open){
      D.filter(d=>d.fac===f.name).forEach(d=>{
        const key=f.name+'||'+d.grp;
        const depProgs=facProgs.filter(p=>p.grp===d.grp);
        const depHits=filtering?depProgs.filter(beProgHit):depProgs;
        if(filtering && depHits.length===0) return;
        const dopen=filtering?true:expanded.dep[key];
        html+=`<div class="tree-row lvl-dep" data-dep="${key}"><div class="tw-name pad-1"><span class="caret ${dopen?'open':''}">▶</span><span class="nm">📚 ${hl(d.grp)} <span style="color:var(--text4);font-weight:400;font-size:10px">(${filtering?depHits.length+' / ':''}${d.n} หลักสูตร)</span></span></div>${cellsFor(d)}</div>`;
        if(dopen){
          depHits.forEach(p=>{
            shownProgs++;
            html+=`<div class="tree-row lvl-prog"><div class="tw-name pad-2"><span style="width:16px"></span><span class="nm" title="${p.prog} · ${p.deg||''}">${hl(p.prog)} <span style="color:var(--text4);font-size:10px">· ${hl(p.lvl)}</span></span></div>${cellsFor(p)}</div>`;
          });
        } else { shownProgs+=depHits.length; }
      });
    } else { shownProgs+=hitProgs.length; }
  });
  if(filtering && shownProgs===0)
    html=`<div class="be-empty">🔍 ไม่พบข้อมูลที่ตรงกับ "<b>${beSearch}</b>"${beFilter!=='all'?' ในตัวกรองที่เลือก':''} — ลองคำอื่นหรือกดล้างคำค้นหา</div>`;
  host.innerHTML=html;
  host.querySelectorAll('.lvl-fac').forEach(r=>r.onclick=()=>{if(filtering)return;const n=RAW.FACS[+r.dataset.fac].name;expanded.fac[n]=!expanded.fac[n];buildTree();});
  host.querySelectorAll('.lvl-dep').forEach(r=>r.onclick=e=>{e.stopPropagation();if(filtering)return;const k=r.dataset.dep;expanded.dep[k]=!expanded.dep[k];buildTree();});
  // count label
  const cnt=document.getElementById('be-count');
  if(cnt) cnt.textContent=filtering?`พบ ${fmtN(shownProgs)} หลักสูตร · ${fmtN(shownFacs)} คณะ`:'230 หลักสูตร · 20 คณะ';
}
document.getElementById('be-expand').onclick=()=>{RAW.FACS.forEach(f=>expanded.fac[f.name]=true);RAW.DEPTS.forEach(d=>expanded.dep[d.fac+'||'+d.grp]=true);buildTree();};
document.getElementById('be-collapse').onclick=()=>{expanded={fac:{},dep:{}};buildTree();};
(function initBeSearch(){
  const inp=document.getElementById('be-search'),wrap=inp.closest('.be-search-wrap'),clr=document.getElementById('be-search-clear');
  inp.addEventListener('input',()=>{beSearch=inp.value.trim().toLowerCase();wrap.classList.toggle('has-val',!!inp.value);buildTree();});
  clr.onclick=()=>{inp.value='';beSearch='';wrap.classList.remove('has-val');buildTree();inp.focus();};
  const QF=[['all','ทั้งหมด'],['ok','คุ้มทุน'],['loss','ยังไม่คุ้ม'],['no','R ≤ AVC']];
  document.getElementById('be-quick').innerHTML=QF.map(q=>`<button class="be-qbtn${q[0]==='all'?' on':''}" data-f="${q[0]}">${q[1]}</button>`).join('');
  document.querySelectorAll('#be-quick .be-qbtn').forEach(btn=>btn.onclick=()=>{
    beFilter=btn.dataset.f;
    document.querySelectorAll('#be-quick .be-qbtn').forEach(x=>x.classList.toggle('on',x===btn));
    buildTree();
  });
})();


/* ---- เริ่มทำงาน ---- */
window.renderPage = renderBreakeven;
renderBreakeven();
