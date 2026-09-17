import { describe, expect, it } from 'vitest';
import {
  approvalStatusSchema,
  costTypeSchema,
  revenueModeSchema,
  roleNameSchema,
} from './enums';

describe('enum schemas', () => {
  it('รับค่าที่ถูกต้อง', () => {
    expect(revenueModeSchema.parse('with_government')).toBe('with_government');
    expect(costTypeSchema.parse('TVC')).toBe('TVC');
    expect(roleNameSchema.parse('faculty_officer')).toBe('faculty_officer');
  });

  it('ปฏิเสธค่าที่ไม่รู้จัก', () => {
    expect(revenueModeSchema.safeParse('รวมเงินแผ่นดิน').success).toBe(false);
    expect(costTypeSchema.safeParse('tvc').success).toBe(false);
    expect(roleNameSchema.safeParse('superadmin').success).toBe(false);
  });

  it('workflow อนุมัติมี 4 สถานะตามที่ยืนยันไว้ (2 ขั้น)', () => {
    expect(approvalStatusSchema.options).toEqual(['draft', 'pending', 'approved', 'rejected']);
  });
});
