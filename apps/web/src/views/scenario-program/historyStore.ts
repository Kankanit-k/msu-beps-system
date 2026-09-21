/**
 * เก็บประวัติการคำนวณจุดคุ้มทุนรายหลักสูตรไว้ใน localStorage
 *
 * ยังไม่มี API บันทึกผลการคำนวณฝั่งเซิร์ฟเวอร์ — แต่หน้า "แผนการรับนิสิต" (/scenario/admission-plan)
 * ต้องหยิบ Q* ที่คำนวณไว้จากหน้า /scenario/program ข้ามหน้ามาใช้ จึงพักไว้ที่เครื่องผู้ใช้ก่อน
 * เมื่อเชื่อม apps/api แล้วให้เปลี่ยนสองฟังก์ชันนี้ไปอ่าน/เขียน API แทน
 */

import type { ProgramHistoryEntry } from './types';

const STORAGE_KEY = 'beps.scenario-program.history';

/** เก็บเท่าที่พอใช้เลือกย้อนหลัง — กัน localStorage บวม */
const MAX_ENTRIES = 50;

export const loadHistory = (): ProgramHistoryEntry[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as ProgramHistoryEntry[]) : [];
  } catch {
    // ข้อมูลเสีย/โหมดส่วนตัว — ถือว่าไม่มีประวัติ ดีกว่าทำหน้าพัง
    return [];
  }
};

export const saveHistory = (entries: ProgramHistoryEntry[]) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // เต็มหรือถูกบล็อก — ประวัติในหน้าปัจจุบันยังใช้ได้ตามปกติ
  }
};
