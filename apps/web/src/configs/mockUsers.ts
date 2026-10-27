/**
 * บัญชีจำลองสำหรับช่วงพัฒนา — ใช้กับ provider "mock" ใน src/libs/ErpAuth.ts
 *
 * ⚠️ ส่งต่อ Backend: แทนไฟล์นี้ด้วยตาราง app_user (role + org_unit) แล้วเปลี่ยน `authorize`
 *    ของ provider "mock" ให้ตรวจกับฐานข้อมูล/ERP — ฝั่งหน้าเว็บอ่านแค่ `role` + `scope` จาก session
 *    ไม่ต้องแก้ส่วนอื่น · บัญชีทดสอบใช้โดเมน @beps.test (ไม่ใช่อีเมลจริง)
 */
import type { AppRole, RoleScope } from './accessControl';

export interface MockUser {
  email: string;
  name: string;
  role: AppRole;
  scope: RoleScope;
  avatar?: string;
}

/** รหัสผ่านร่วมของทุกบัญชีจำลอง */
export const MOCK_PASSWORD = 'beps1234';

const ALL: RoleScope = { faculty: null, program: null };
const TECH = 'คณะเทคโนโลยี';

export const MOCK_USERS: MockUser[] = [
  // ผู้พัฒนาระบบ — เจ้าหน้าที่ระดับมหาวิทยาลัย
  {
    email: 'kankanit.k@msu.ac.th',
    name: 'กันต์กนิษฐ์ กองทอง',
    role: 'universityAdmin',
    scope: ALL,
    avatar: '/images/developers/kankanit.jpg',
  },
  { email: 'sirima.s@msu.ac.th', name: 'เอื้อง', role: 'universityAdmin', scope: ALL },
  { email: 'thanadol.s@msu.ac.th', name: 'thanadol.s', role: 'universityAdmin', scope: ALL },

  // บัญชีทดสอบ 5 สิทธิ์
  {
    email: 'exec@beps.test',
    name: 'ผู้บริหารมหาวิทยาลัย (ทดสอบ)',
    role: 'universityExec',
    scope: ALL,
  },
  {
    email: 'plan@beps.test',
    name: 'เจ้าหน้าที่กองแผนงาน (ทดสอบ)',
    role: 'universityAdmin',
    scope: ALL,
  },
  {
    email: 'dean.tech@beps.test',
    name: 'ผู้บริหารคณะเทคโนโลยี (ทดสอบ)',
    role: 'facultyExec',
    scope: { faculty: TECH, program: null },
  },
  {
    email: 'dean.it@beps.test',
    name: 'ผู้บริหารคณะวิทยาการสารสนเทศ (ทดสอบ)',
    role: 'facultyExec',
    scope: { faculty: 'คณะวิทยาการสารสนเทศ', program: null },
  },
  {
    email: 'staff.tech@beps.test',
    name: 'เจ้าหน้าที่คณะเทคโนโลยี (ทดสอบ)',
    role: 'deptAdmin',
    scope: { faculty: TECH, program: null },
  },
  {
    email: 'staff.hum@beps.test',
    name: 'เจ้าหน้าที่คณะมนุษยศาสตร์และสังคมศาสตร์ (ทดสอบ)',
    role: 'deptAdmin',
    scope: { faculty: 'คณะมนุษยศาสตร์และสังคมศาสตร์', program: null },
  },
  {
    email: 'staff.env@beps.test',
    name: 'เจ้าหน้าที่คณะสิ่งแวดล้อมและทรัพยากรศาสตร์ (ทดสอบ)',
    role: 'deptAdmin',
    scope: { faculty: 'คณะสิ่งแวดล้อมและทรัพยากรศาสตร์', program: null },
  },
  {
    email: 'lecturer.tech@beps.test',
    name: 'อาจารย์หลักสูตรสัตวศาสตร์ (ทดสอบ)',
    role: 'lecturer',
    // คีย์หลักสูตร = fac|lvl|prog|deg (เหมือน refKey ของหน้าคำนวณ)
    scope: { faculty: TECH, program: `${TECH}|ปริญญาตรี|สัตวศาสตร์|วท.บ. สัตวศาสตร์` },
  },
];

export const findMockUser = (email: string, password: string): MockUser | null => {
  const u = MOCK_USERS.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());

  return u && password === MOCK_PASSWORD ? u : null;
};
