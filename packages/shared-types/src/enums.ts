/**
 * Zod schema ของค่า enum ที่ frontend และ backend ใช้ร่วมกัน
 *
 * ค่าทั้งหมดมาจาก ER Diagram ใน SA.md หัวข้อ 5 — เก็บไว้ที่นี่ที่เดียว
 * เพื่อกันปัญหา "schema สองฝั่งไม่ตรงกัน"
 */
import { z } from 'zod';

/** ฐานรายได้ 2 กรณี — สูตร 5a/5b */
export const revenueModeSchema = z.enum(['with_government', 'without_government']);
export type RevenueMode = z.infer<typeof revenueModeSchema>;

/** ระดับหน่วยวิเคราะห์ */
export const scopeLevelSchema = z.enum(['program', 'education_level', 'faculty', 'university']);
export type ScopeLevel = z.infer<typeof scopeLevelSchema>;

/** ระดับการศึกษา — ใช้แทน "ภาควิชา" ตาม SA.md หัวข้อ 7.2 */
export const educationLevelSchema = z.enum(['ปริญญาตรี', 'ป.บัณฑิต', 'ปริญญาโท', 'ปริญญาเอก']);
export type EducationLevel = z.infer<typeof educationLevelSchema>;

/** ประเภทนิสิต และสัญชาติ — ใช้แยกอัตราค่าธรรมเนียม (FR-11) */
export const studentGroupSchema = z.enum(['ภาคปกติ', 'ภาคพิเศษ']);
export type StudentGroup = z.infer<typeof studentGroupSchema>;

export const nationalitySchema = z.enum(['ไทย', 'ต่างชาติ']);
export type Nationality = z.infer<typeof nationalitySchema>;

/** ประเภทต้นทุน — flag ที่ระดับรายการย่อย ไม่ใช่ระดับหมวดงบ (SA.md หัวข้อ 5.1) */
export const costTypeSchema = z.enum(['TFC', 'TVC']);
export type CostType = z.infer<typeof costTypeSchema>;

/** วิธีปันส่วนต้นทุน (FR-8) */
export const allocationMethodSchema = z.enum(['รายหัวนิสิต', 'รายหลักสูตร', 'ก้อนรวม']);
export type AllocationMethod = z.infer<typeof allocationMethodSchema>;

/** หมวดงบประมาณ — หมวด 10 งบแผ่นดิน / หมวด 20 เงินรายได้ (FR-4) */
export const budgetCategorySchema = z.enum(['10_งบแผ่นดิน', '20_เงินรายได้']);
export type BudgetCategory = z.infer<typeof budgetCategorySchema>;

/** สถานะอนุมัติค่าธรรมเนียม — workflow 2 ขั้น (ยืนยันแล้ว SA.md หัวข้อ 13) */
export const approvalStatusSchema = z.enum(['draft', 'pending', 'approved', 'rejected']);
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

export const approvalActionSchema = z.enum(['submit', 'approve', 'reject']);
export type ApprovalAction = z.infer<typeof approvalActionSchema>;

/** ที่มาของข้อมูล — ระยะแรกเป็น manual ทั้งหมด (SA.md หัวข้อ 13 ข้อ 1) */
export const dataSourceSchema = z.enum(['api', 'manual']);
export type DataSource = z.infer<typeof dataSourceSchema>;

/** Role ผู้ใช้ — 4 ระดับตาม wireframe W0 */
export const roleNameSchema = z.enum(['admin', 'budget_office', 'faculty_officer', 'viewer']);
export type RoleName = z.infer<typeof roleNameSchema>;
