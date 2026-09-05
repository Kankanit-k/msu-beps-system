/* ==========================================================================
   MSU-BEPS — W4 โครงสร้างต้นทุน
   ยกมาจาก prototype v8-1 โดยไม่แก้สูตร · ต้องโหลดหลัง core.js
   ========================================================================== */

/* ============ COST ============ */
function renderCost(){
  const U=RAW.UNI,F=RAW.FACS;
  document.getElementById('ck1').textContent=fmtM(U.TC);
  document.getElementById('ck2').textContent=fmtM(U.TFC);
  document.getElementById('ck2s').textContent='ล้านบาท · '+(U.TFC/U.TC*100).toFixed(0)+'% ของ TC';
  document.getElementById('ck3').textContent=fmtM(U.TVC);
  document.getElementById('ck3s').textContent='ล้านบาท · '+(U.TVC/U.TC*100).toFixed(0)+'% ของ TC';
  document.getElementById('ck4').textContent=fmtB(U.AVC);
  const labels=F.map(f=>short(f.name));
  mk('cost-main',{type:'bar',data:{labels,datasets:[
    {label:'TFC',data:F.map(f=>M(f.TFC)),backgroundColor:C.navy,borderRadius:3,stack:'s'},
    {label:'TVC',data:F.map(f=>M(f.TVC)),backgroundColor:C.gold,borderRadius:3,stack:'s'}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.x.toLocaleString('th-TH',{maximumFractionDigits:1})+' ลบ.'}}},
      scales:{x:{stacked:true,grid:{color:C.grid}},y:{stacked:true,grid:{display:false},ticks:{font:{size:9.5}}}}}});
  const prog=U.tfcProg,off=U.tfcOffice,dep=U.dep;
  mk('cost-donut',{type:'doughnut',data:{labels:['ต้นทุนหลักสูตร','ปันส่วนสำนักงาน','ค่าเสื่อมราคา'],datasets:[{data:[M(prog),M(off),M(dep)],backgroundColor:[C.navy,C.gold,C.green],borderColor:'#fff',borderWidth:3}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.label+': '+c.parsed.toLocaleString('th-TH',{maximumFractionDigits:1})+' ลบ.'}}}}});
  document.getElementById('cost-list').innerHTML=
    row2('ต้นทุนหลักสูตร (ตรง)',fmtM(prog)+' ลบ.',(prog/U.TFC*100).toFixed(0)+'%',C.navy)+
    row2('ปันส่วนสำนักงานเลขาฯ',fmtM(off)+' ลบ.',(off/U.TFC*100).toFixed(0)+'%',C.gold)+
    row2('ค่าเสื่อมราคา',fmtM(dep)+' ลบ.',(dep/U.TFC*100).toFixed(0)+'%',C.green);
}


/* ---- เริ่มทำงาน ---- */
window.renderPage = renderCost;
renderCost();
