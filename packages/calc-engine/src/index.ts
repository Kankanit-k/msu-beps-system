/**
 * จุดเข้าเดียวของเครื่องคำนวณ — ทุกที่ต้อง import จาก '@beps/calc-engine' เท่านั้น
 *
 * **ห้ามเติมนามสกุล .js ใน import ภายในแพ็กเกจนี้** แพ็กเกจถูกใช้เป็น TypeScript ดิบ
 * (package.json ชี้ main/exports มาที่ src/index.ts) แล้ว Turbopack ของ apps/web
 * ไม่แปลง './policy.js' กลับเป็น policy.ts ให้ — หน้าจอที่ import จะพังด้วย
 * "Module not found" ทั้งที่ tsc กับ vitest ผ่าน ทั้ง repo ตั้ง moduleResolution: Bundler
 * (tsconfig.base.json) อยู่แล้ว การละนามสกุลจึงถูกต้องตามการตั้งค่าที่ใช้จริง
 */
export * from './types';
export * from './policy';
export { perHead } from './per-head';
export { calcQStar, applyQStarRounding } from './qstar';
export type { QStarOutcome } from './qstar';
export { calcBreakEven, calcBreakEvenBothModes, totalRevenue } from './break-even';
export { aggregateBreakEven } from './aggregate';
export type { AggregateBreakEvenResult } from './aggregate';
