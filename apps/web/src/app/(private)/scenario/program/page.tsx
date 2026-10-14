// W7 — แยกเป็นเมนูย่อย: ปรับปรุงหลักสูตรเดิม (/improve) · เปิดหลักสูตรใหม่ (/new)
import { redirect } from 'next/navigation';

const ScenarioProgramPage = () => {
  redirect('/scenario/program/improve');
};

export default ScenarioProgramPage;
