// University-admin page. Lives under /admin/university/... (universityAdmin tier).
// Access is enforced in src/middleware.ts via src/configs/accessControl.ts.
import PerHeadRateView from '@views/per-head-rates/PerHeadRateView';

/** ตั้งค่าอัตราหักสมทบมหาวิทยาลัยรายปี — เสนอแล้วต้องอนุมัติก่อนมีผล */
const UniSharePage = () => (
  <PerHeadRateView
    rateKey="uniShare"
    title="ค่าธรรมเนียมหักสมทบ"
    desc="เงินที่หักสมทบเข้ามหาวิทยาลัยตามรายหัวนิสิต (บาท/คน/ภาค) — นับเป็นต้นทุนผันแปรของหลักสูตร = อัตรา × จำนวนนิสิต × 2 ภาค (ชีตแท็บ 4 แถว 39)"
    usedIn={
      <>
        มีผลกับหน้า <b>จุดคุ้มทุนรายหลักสูตร</b> (ปรับปรุงหลักสูตรเดิม · เปิดหลักสูตรใหม่) — คอลัมน์ที่แก้ได้ใช้อัตรานี้
        · คอลัมน์อ้างอิงและหน้ารายงานยังเป็นตัวเลขตามชีตปี 2568
      </>
    }
  />
);

export default UniSharePage;
