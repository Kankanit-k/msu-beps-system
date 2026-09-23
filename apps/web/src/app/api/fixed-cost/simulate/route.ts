// Next Imports
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth Imports
import { getServerSession } from 'next-auth';

// Calc Imports
import { defaultCandidates, simulateFixedCostMethods } from '@beps/calc-engine';
import { fixedCostSimulateRequestSchema } from '@beps/shared-types';

import { authOptions } from '@/libs/ErpAuth';

/**
 * จำลองเทียบวิธีจัดสรรต้นทุนคงที่ — ขั้นที่ 3 ของ FIXED-COST-WORKFLOW.md
 *
 * เป็นการคำนวณล้วน **ไม่เขียนฐานข้อมูลและไม่สร้าง allocation run**
 * คณะจึงกดดูผลของทั้ง 3 วิธีได้อิสระก่อนตัดสินใจเสนอขออนุมัติ
 *
 * ตัวเลขที่คืนจากที่นี่ต้องตรงกับที่ได้ตอนรันจริง เพราะใช้ฟังก์ชันชุดเดียวกัน
 * (`packages/calc-engine`) กับที่ฝั่ง SQL พอร์ตไว้ใน db/02_functions.sql
 */
export const runtime = 'nodejs';

/** เพดานขนาดคำขอ — คำขอจริงของคณะใหญ่สุดยังไม่ถึง 100 KB */
const MAX_BODY_BYTES = 512 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  // route handler ของ App Router ไม่มีเพดาน body ให้โดยปริยาย (ต่างจาก Pages API)
  // และผลลัพธ์โตกว่า input ราว 3 เท่า จึงต้องกันไว้เองก่อนอ่านทั้งก้อนเข้าหน่วยความจำ
  const declaredLength = Number(req.headers.get('content-length') ?? '0');

  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'payload too large' }, { status: 413 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const parsed = fixedCostSimulateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid payload', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { pool, programs, revenueMode, customPolicy } = parsed.data;

  const result = simulateFixedCostMethods({
    pool,
    programs,
    revenueMode,
    candidates: defaultCandidates(customPolicy),
  });

  return NextResponse.json({ ok: true, result });
}
