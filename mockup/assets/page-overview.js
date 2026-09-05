/* ==========================================================================
   MSU-BEPS — W1 ภาพรวมมหาวิทยาลัย
   ยกมาจาก prototype v8-1 โดยไม่แก้สูตร · ต้องโหลดหลัง core.js
   ========================================================================== */

/* ============ OVERVIEW ============ */
function renderOverview(){
  const U=RAW.UNI, F=RAW.FACS;
  document.getElementById('ov-note').textContent=noteTxt();
  document.getElementById('k-tr-l').textContent=BM==='in'?'รายได้รวม (TR)':'รายได้เงินรายได้';
  document.getElementById('k-q').textContent=fmtN(U.Q);
  document.getElementById('k-tr').textContent=fmtM(TRc(U));
  document.getElementById('k-tc').textContent=fmtM(U.TC);
  const p=profit(U);
  document.getElementById('k-prof').textContent=(p>=0?'+':'−')+fmtM(Math.abs(p));
  document.getElementById('k-prof').style.color=p>=0?'var(--green)':'var(--red)';
  document.getElementById('k-prof-s').textContent='ล้านบาท · '+(p/TRc(U)*100).toFixed(1)+'% ของรายได้';
  document.getElementById('k-r').textContent=fmtB(R(U));
  document.getElementById('k-qs').textContent=Qs(U)?fmtN(Qs(U)):'—';
  document.getElementById('k-qs-s').textContent=Qs(U)?('คน · จริง '+fmtN(U.Q)+' คน'):'R ≤ AVC';
  document.getElementById('lg-tr').textContent=BM==='in'?'รายได้รวม (TR)':'เงินรายได้';

  // main bar
  const labels=F.map(f=>short(f.name));
  mk('ov-main',{type:'bar',data:{labels,datasets:[
    {label:'TR',data:F.map(f=>M(TRc(f))),backgroundColor:C.navy,borderRadius:4,barPercentage:.82,categoryPercentage:.9},
    {label:'TC',data:F.map(f=>M(f.TC)),backgroundColor:C.red,borderRadius:4,barPercentage:.82,categoryPercentage:.9}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.x.toLocaleString('th-TH',{maximumFractionDigits:1})+' ลบ.'}}},
      scales:{x:{grid:{color:C.grid},ticks:{callback:v=>v+''}},y:{grid:{display:false},ticks:{font:{size:9.5}}}}}});

  // donut
  mk('ov-donut',{type:'doughnut',data:{labels:['ต้นทุนคงที่ (TFC)','ต้นทุนผันแปร (TVC)'],datasets:[{data:[M(U.TFC),M(U.TVC)],backgroundColor:[C.navy,C.gold],borderColor:'#fff',borderWidth:3}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.label+': '+c.parsed.toLocaleString('th-TH',{maximumFractionDigits:1})+' ลบ. ('+(c.parsed/M(U.TC)*100).toFixed(0)+'%)'}}}}});
  document.getElementById('ov-cost-list').innerHTML=
    row2('ต้นทุนคงที่ (TFC)',fmtM(U.TFC)+' ลบ.',(U.TFC/U.TC*100).toFixed(0)+'%',C.navy)+
    row2('ต้นทุนผันแปร (TVC)',fmtM(U.TVC)+' ลบ.',(U.TVC/U.TC*100).toFixed(0)+'%',C.gold)+
    row2('ค่าเสื่อมราคา (ในTFC)',fmtM(U.dep)+' ลบ.',(U.dep/U.TC*100).toFixed(0)+'%',C.green);

  // top / bottom
  const sorted=[...F].sort((a,b)=>profit(b)-profit(a));
  const top=sorted.filter(f=>profit(f)>0).slice(0,6);
  const bot=sorted.filter(f=>profit(f)<0).reverse().slice(0,6);
  document.getElementById('ov-top').innerHTML=top.map((f,i)=>trRow(i+1,short(f.name),'+'+fmtM(profit(f)),(Qs(f)?fmtN(Qs(f)):'—')+' / '+fmtN(f.Q),'pos')).join('')||emptyRow();
  document.getElementById('ov-bot').innerHTML=bot.map((f,i)=>trRow(i+1,short(f.name),'−'+fmtM(Math.abs(profit(f))),(Qs(f)?fmtN(Qs(f)):'—')+' / '+fmtN(f.Q),'neg')).join('')||emptyRow();

  // insights
  const nLoss=F.filter(f=>profit(f)<0).length;
  const best=sorted[0], worst=sorted[sorted.length-1];
  const progLoss=RAW.PROGS.filter(x=>status(x)!=='ok').length;
  document.getElementById('ov-ins').innerHTML=[
    `ทั้งมหาวิทยาลัยมีนิสิต <b>${fmtN(U.Q)}</b> คน ${p>=0?'มีส่วนเกิน':'ขาดทุนสุทธิ'} <b>${fmtM(Math.abs(p))} ลบ.</b> (${(p/TRc(U)*100).toFixed(1)}% ของรายได้) จุดคุ้มทุนรวมอยู่ที่ <b>${Qs(U)?fmtN(Qs(U))+' คน':'—'}</b>`,
    `คณะที่ทำส่วนเกินสูงสุดคือ <b>${short(best.name)}</b> (+${fmtM(profit(best))} ลบ.) ขณะที่ <b>${short(worst.name)}</b> ขาดทุนมากสุด (${fmtM(profit(worst))} ลบ.)`,
    `มี <b>${nLoss} คณะ</b> จาก 20 ที่ยังไม่คุ้มทุนในโหมดนี้ และ <b>${progLoss} หลักสูตร</b> จาก 230 ที่ Q ยังต่ำกว่าจุดคุ้มทุน`,
    `ต้นทุนคงที่คิดเป็น <b>${(U.TFC/U.TC*100).toFixed(0)}%</b> ของต้นทุนรวม สะท้อนภาระโครงสร้างที่ต้องกระจายไปยังจำนวนนิสิตให้มากพอ`
  ].map(t=>`<li>${t}</li>`).join('');
}


/* ---- เริ่มทำงาน ---- */
window.renderPage = renderOverview;
renderOverview();
