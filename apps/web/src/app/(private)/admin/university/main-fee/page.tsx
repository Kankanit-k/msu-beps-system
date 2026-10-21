// University-admin page. Lives under /admin/university/... (universityAdmin tier).
// Access is enforced in src/middleware.ts via src/configs/accessControl.ts.
import PerHeadRateView from '@views/per-head-rates/PerHeadRateView';

/** ตั้งค่าอัตราค่าธรรมเนียมรายการหลักรายปี — เสนอแล้วต้องอนุมัติก่อนมีผล */
const MainFeePage = () => (
  <PerHeadRateView
    rateKey="mainFee"
    title="ค่าธรรมเนียมรายการหลัก"
    desc="ค่าธรรมเนียมรายการหลักตามรายหัวนิสิต (บาท/คน/ภาค) — นับเป็นต้นทุนผันแปรของหลักสูตร (ชีตแท็บ 4 แถว 38)"
    usedIn={
      <>
        มีผลเฉพาะเมื่อ<b>เปิดหลักสูตรใหม่แบบกรอกต้นทุนเอง</b> (ไม่มีหลักสูตรอ้างอิง) · หลักสูตรที่มีอยู่แล้วใช้ยอดจริงต่อหัวของหลักสูตรตามชีต
        เพราะในชีตยอดนี้รวมจากข้อมูลนิสิตจริง ไม่ใช่อัตราเดียว
      </>
    }
  />
);

export default MainFeePage;
