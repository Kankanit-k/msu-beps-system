import { describe, expect, it } from 'vitest';
import { perHead } from './per-head';

describe('perHead', () => {
  it('หารยอดรวมด้วยจำนวนนิสิตได้ถูกต้อง', () => {
    expect(perHead(1_000_000, 40)).toBe(25_000);
  });

  it('คืน null เมื่อไม่มีนิสิต — ไม่ใช่ 0 เหมือน prototype เดิม', () => {
    expect(perHead(1_000_000, 0)).toBeNull();
  });

  it('คืน null เมื่อจำนวนนิสิตติดลบ', () => {
    expect(perHead(1_000_000, -5)).toBeNull();
  });

  it('คืน null เมื่อ input ไม่ใช่จำนวนที่ใช้ได้', () => {
    expect(perHead(Number.NaN, 10)).toBeNull();
    expect(perHead(1_000, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('รองรับยอดรวมเป็น 0 (มีนิสิตแต่ไม่มีต้นทุน)', () => {
    expect(perHead(0, 100)).toBe(0);
  });

  it('ตรงกับตัวเลขจริงของคณะการบัญชีฯ จากไฟล์ prototype 03June26', () => {
    // FAC_DATA["คณะการบัญชีและการจัดการ"]: TR=394,783,965.00  Q=10,276
    const r = perHead(394_783_965, 10_276);
    expect(r).not.toBeNull();
    expect(r as number).toBeCloseTo(38_418.06, 2);
  });
});
