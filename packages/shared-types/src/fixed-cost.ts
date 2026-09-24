/**
 * Schema ของนโยบายจัดสรรต้นทุนคงที่รายคณะ (มติที่ประชุม · FIXED-COST-WORKFLOW.md)
 *
 * ใช้ร่วมกันระหว่างหน้าจอ W20 กับ API — กันปัญหา "สองฝั่งตรวจไม่เหมือนกัน"
 * กติกาเชิงเนื้อหา (ผลรวม 100% · ทุกหลักสูตรต้องมีกลุ่ม · ฯลฯ) อยู่ใน calc-engine
 * ที่นี่ตรวจแค่รูปร่างข้อมูล เพราะกติกาเหล่านั้นต้องรู้จักรายชื่อหลักสูตรของงวดนั้นด้วย
 */
import { z } from 'zod';

import { revenueModeSchema } from './enums';

export const fixedCostMethodSchema = z.enum(['PER_HEAD_FTES', 'EQUAL_PROGRAM', 'CUSTOM_PCT']);
export type FixedCostMethod = z.infer<typeof fixedCostMethodSchema>;

export const fixedCostSubMethodSchema = z.enum(['PER_HEAD_FTES', 'EQUAL_PROGRAM']);
export const bucketLevelSchema = z.enum(['EDUCATION_LEVEL', 'PROGRAM']);

/** กลุ่มต้นทุนคงที่ที่นโยบายหนึ่งฉบับคุม — 'ALL' = ทั้งก้อน */
export const fixedCostPoolSchema = z.enum([
  'ALL',
  'SALARY',
  'DEPRECIATION',
  'OFFICE_OVERHEAD',
  'OTHER',
]);
export type FixedCostPool = z.infer<typeof fixedCostPoolSchema>;

export const fixedCostPolicyLineSchema = z.object({
  bucketKey: z.string().min(1),
  pct: z.number().min(0).max(100),
});

/** เพดานจำนวนกลุ่มต่อหนึ่งนโยบาย — คณะที่ใหญ่ที่สุดมีหลักสูตรไม่ถึงหลักร้อย */
const MAX_LINES = 500;

export const fixedCostPolicySchema = z
  .object({
    method: fixedCostMethodSchema,
    subMethod: fixedCostSubMethodSchema.optional(),
    bucketLevel: bucketLevelSchema.optional(),
    lines: z.array(fixedCostPolicyLineSchema).max(MAX_LINES).optional(),
  })
  // วิธีที่ 1/2 ไม่ต้องกรอกอะไรเพิ่ม — รับมาแล้วเงียบจะทำให้ผู้ใช้เข้าใจผิดว่าค่าที่กรอกมีผล
  .refine(
    (p) => p.method === 'CUSTOM_PCT' || (!p.lines?.length && !p.bucketLevel && !p.subMethod),
    {
      message: 'สัดส่วน ระดับกลุ่ม และวิธีแบ่งภายในกลุ่ม ใช้ได้เฉพาะวิธีกำหนดสัดส่วนเปอร์เซ็นต์เอง',
    },
  )
  .refine((p) => p.method !== 'CUSTOM_PCT' || (p.lines?.length ?? 0) > 0, {
    message: 'วิธีกำหนดสัดส่วนเองต้องมีอย่างน้อยหนึ่งกลุ่ม',
  })
  // ตรงกับ CHECK ของ DB: (method = 'CUSTOM_PCT') = (bucket_level IS NOT NULL)
  // ถ้าปล่อยผ่าน ผู้ใช้จะจำลองบนหน้าจอได้แต่บันทึกไม่ได้ ซึ่งอธิบายยากกว่าการปฏิเสธตั้งแต่ต้น
  .refine((p) => p.method !== 'CUSTOM_PCT' || p.bucketLevel !== undefined, {
    message: 'วิธีกำหนดสัดส่วนเองต้องระบุว่ากำหนดที่ระดับการศึกษาหรือรายหลักสูตร',
  })
  // ตรงกับ UNIQUE (policy_id, bucket_key) ของ DB — กลุ่มซ้ำทำให้สัดส่วนที่เห็นไม่ใช่สัดส่วนที่ได้
  .refine((p) => new Set(p.lines?.map((l) => l.bucketKey)).size === (p.lines?.length ?? 0), {
    message: 'มีกลุ่มที่ถูกกำหนดสัดส่วนซ้ำมากกว่าหนึ่งบรรทัด',
  });

export type FixedCostPolicyInput = z.infer<typeof fixedCostPolicySchema>;

export const fixedCostProgramSchema = z.object({
  programVersionId: z.string().min(1),
  label: z.string().optional(),
  educationLevel: z.string().optional(),
  ftes: z.number().min(0),
  q: z.number().min(0),
  governmentBudget: z.number(),
  incomeBudget: z.number(),
  tvc: z.number(),
  directFixedCost: z.number().optional(),
});

/** คำขอจำลองเทียบวิธี — ขั้นที่ 3 ของกระบวนการ (คณะต้องเห็นผลก่อนเลือก) */
export const fixedCostSimulateRequestSchema = z.object({
  pool: z.number(),
  revenueMode: revenueModeSchema.default('with_government'),
  // เพดานกันคำขอที่ใหญ่เกินจริง — ทั้งมหาวิทยาลัยมีราว 230 หลักสูตร การจำลองเป็นรายคณะ
  programs: z.array(fixedCostProgramSchema).min(1).max(1000),
  /** ไม่ส่งมา = เทียบ 2 วิธีมาตรฐาน · ส่งมา = เพิ่มวิธีกำหนดสัดส่วนเองเข้าไปเทียบด้วย */
  customPolicy: fixedCostPolicySchema.optional(),
});

export type FixedCostSimulateRequest = z.infer<typeof fixedCostSimulateRequestSchema>;
