// Component Imports
import SectionLanding from '@components/SectionLanding';

// หน้าแรกหมวดทะเบียน & ระบบ (Landing — ข้อ 1.8) · การ์ดดึงจากเมนูซ้ายมือ กรองตามสิทธิ์
const LandingPage = () => {
  return <SectionLanding href="/admin/university" />;
};

export default LandingPage;
