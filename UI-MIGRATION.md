# บันทึกการย้าย mockup → หน้าจริง (apps/web)

> เริ่มบันทึก 2026-09-22 · ใช้ดูว่าหน้าไหนปรับเข้าชุดแล้ว และหน้าใหม่ต้องประกอบจากอะไร
> ต้นทางคือ `mockup/W*.html` + `mockup/assets/page-*.js` ซึ่งถือเป็น spec ของหน้าจอ

## แพทเทิร์นกลางของหน้า (ใช้ซ้ำทุกหน้า)

| ชิ้นส่วน                      | ใช้ทำอะไร                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `@components/PageHeaderBar`   | หัวหน้าจอ: ชื่อ + ชิปรหัสจอ + ปีงบประมาณ + Run + สวิตช์ฐานรายได้ + ชิปสรุป + ผู้อนุมัติ |
| `@components/DataCaveatNotes` | แถบเตือนข้อจำกัดข้อมูล + แถบ "ข้อมูลตัวอย่าง" (ตรงกับ `dataCaveat()` ของ mockup)        |
| `@components/NoteBar`         | แถบหมายเหตุเตี้ยบรรทัดเดียว — ใช้แทน `<Alert>` สำหรับข้อความกำกับข้อมูล                 |
| `@components/KpiCard`         | การ์ด KPI เส้นสีขอบบน (`.kpi.cn/.cg/.co/.cr` ของ mockup)                                |
| `@components/ChartBits`       | `DotTitle` (จุดสีหน้าชื่อการ์ด) · `LegendItem` (ป้ายสีเหนือกราฟ แทน legend ของ Apex)    |
| `@views/breakeven/calc`       | สูตร/ตัวจัดรูปแบบตัวเลขทั้งหมด (`computeBreakEven`, `fmtInt`, `fmtMillion`, …)          |

โครงหน้าจอมาตรฐาน: `<Box>` → `PageHeaderBar` → `DataCaveatNotes` → `NoteBar` (คำอธิบายโหมด) →
`<Grid container>` ของ KPI → การ์ดกราฟ/ตาราง

`MOCK_RUN` (ปีงบประมาณ · Run #1042 · ผู้อนุมัติ) อยู่ใน `PageHeaderBar` — เป็นข้อมูลแสดงผลอย่างเดียว
เพราะยังไม่มี backend ของรอบคำนวณ/การอนุมัติ เมื่อมี API แล้วให้แก้ที่ไฟล์เดียวนี้

## สถานะรายหน้า

- [x] W1 ภาพรวมมหาวิทยาลัย — `views/overview/Overview.tsx`
- [x] W4 รายได้รายคณะ — `views/revenue/RevenueView.tsx`
- [x] W4 โครงสร้างต้นทุน — `views/cost/CostView.tsx`
- [x] W4 รายได้ vs ต้นทุนต่อหัว — `views/perhead/PerheadView.tsx`
- [x] W2 คณะ · ระดับ · หลักสูตร — `views/breakeven/BreakEvenDrill.tsx`
- [x] W3 กราฟจุดคุ้มทุน — `views/breakeven/BreakEvenChart.tsx`
      (KPI ใช้ `KpiCard` · ปิด legend ของ Apex แล้ววาง `LegendItem` เองเหนือกราฟ —
      เพิ่มป้าย "จุดคุ้มทุน (Q*)/จุดปัจจุบัน" ที่ mockup ไม่มี เพราะสองจุดนี้ไม่มีอะไรอธิบายเลยถ้าไม่มีป้าย)
- [x] W5 Cross Analysis — `views/cross/CrossAnalysisView.tsx`
      (จุดสีหัวการ์ดครบทุกใบ · ป้ายสเกลสี heatmap อ่านค่าไล่สีจาก `HEAT_SCALE_GRADIENT`
      ใน `heatmapMetrics.ts` ที่เดียวกับสีในตาราง)
- [x] W6 จุดคุ้มทุนรายคณะ — `views/scenario-faculty/ScenarioFacultyView.tsx`
      (หน้านี้กรอกตัวเลขเอง ไม่ได้อ่านจากรอบคำนวณ จึงส่ง `limitations={false}` ให้ `DataCaveatNotes`
      ให้ขึ้นเฉพาะแถบ "ข้อมูลตัวอย่าง" เหมือน mockup)
- [x] W7 จุดคุ้มทุนรายหลักสูตร — `views/scenario-program/ScenarioProgramView.tsx`
      (สวิตช์ฐานรายได้อยู่บน `PageHeaderBar` ที่เดียว ไม่ต้องมีปุ่มสลับในเนื้อหน้าอีก ·
      ประเภทหลักสูตรเป็นดรอปดาวน์ตาม mockup · มีแถบอ้างอิงตัวเลขระบบ `ProgramRefNote` (#pg-ref-note))
- [x] แผนการรับนิสิต (ไม่มีรหัสจอใน SA.md — ส่วนต่อขยายของ W7) —
      `views/scenario-program/AdmissionPlanView.tsx` (`code` ของ `PageHeaderBar` จึงเป็น optional)
- [ ] W8–W19 ทะเบียนข้อมูลหลัก · ปันส่วนต้นทุน · ผู้ใช้งาน

## ข้อควรรู้เวลาตรวจงาน

- กราฟ ApexCharts มีแอนิเมชันตอนโหลด — สกรีนช็อตแบบ headless อาจจับภาพก่อนแท่งสุดท้ายวาดเสร็จ
  ตรวจจำนวนแท่งจริงด้วยการนับ `apexcharts-bar-area` ใน DOM แทนการดูภาพอย่างเดียว
- อย่ารัน `pnpm format` (prettier ทั้งรีโป) ระหว่างแก้ไม่กี่ไฟล์ — ให้รัน `npx prettier --write <ไฟล์>` เฉพาะที่แก้
