'use client';

/**
 * ปันต้นทุนคงที่ส่วนกลางคณะใหม่ทั้งคณะ ตามวิธีที่คณะล็อกไว้ (facultyAllocation.ts — เหมือน W7 กรณีปรับปรุง)
 * ใช้ร่วมกันระหว่าง /scenario/program2 กับห้องจำลองแผนรับนิสิต เพื่อให้ TFC ของหลักสูตรเดียวกันตรงกันทุกหน้า
 */

import { useMemo } from 'react';

import { MOCK_RUN } from '@components/PageHeaderBar';
import type { ProgRow } from '@/data/mockup';
import { facultyRows, poolAmountOf } from '@views/fixed-cost-policy/data';
import { useFacultyLock } from '@views/fixed-cost-lock/lockStore';

import {
  allocateFaculty,
  allocBuckets,
  DEFAULT_ALLOC_CHOICE,
  policyOf,
  shareOf,
  type FacultyScenario,
} from './facultyAllocation';
import { embeddedShareOf } from './newProgramCalc';
import { progOptionLabel } from './programData';

/** ส่วนแบ่งส่วนกลางคณะ (งบสำนักงาน + ค่าเสื่อม) ที่ชีตแท็บ 3 ปันไว้ */
const sheetShareOf = poolAmountOf('ALL');

/**
 * @param q จำนวนนิสิตของ refProg หลังปรับ — วิธีปันตามหัวนิสิตทำให้ TFC ขยับตาม q
 */
export function useFacultyAllocation(fac: string | null, refProg: ProgRow | null, q: number) {
  const { lock, ready: lockReady } = useFacultyLock(MOCK_RUN.budgetYear, fac);
  const alloc = lock?.choice ?? DEFAULT_ALLOC_CHOICE;

  const facRows = useMemo(() => (fac ? facultyRows(fac) : []), [fac]);
  const facPrograms = useMemo(
    () =>
      facRows.map(({ p, id }) => ({
        id,
        label: progOptionLabel(p),
        educationLevel: p.lvl,
        q: p.Q,
        sheetShare: sheetShareOf(p),
      })),
    [facRows],
  );
  const facPool = facPrograms.reduce((a, p) => a + p.sheetShare, 0);
  const refId = facRows.find((r) => r.p === refProg)?.id ?? null;
  /** null = นิสิตจริงตามชีต · ตัวเลข = แทนนิสิตของหลักสูตรนี้ด้วยค่านั้น */
  const scenarioAt = (qq: number | null): FacultyScenario | null =>
    refId && refProg
      ? {
          pool: facPool,
          programs: facPrograms,
          embedded: { id: refId, amount: embeddedShareOf(refProg) },
          ...(qq !== null ? { qOverride: { id: refId, q: qq } } : {}),
        }
      : null;
  const afterScenario = scenarioAt(q);
  const buckets = afterScenario ? allocBuckets(afterScenario, alloc.bucketLevel) : [];
  const policy = lock ? policyOf(alloc, buckets) : null;
  const outcomeAt = (qq: number | null) => {
    const sc = scenarioAt(qq);

    return sc ? allocateFaculty(sc, policy) : null;
  };
  const afterOutcome = outcomeAt(q);
  const adjFrom = (o: ReturnType<typeof outcomeAt>) =>
    o && refId ? (shareOf(o, refId)?.adj ?? 0) : 0;
  /** ส่วนที่ต้องบวกเข้า TFC — 0 เมื่อตามชีต หรือนโยบายยังไม่ผ่านการตรวจ */
  const adjOf = (after: boolean) => adjFrom(after ? afterOutcome : outcomeAt(null));
  /** ส่วนปรับ TFC เมื่อหลักสูตรนี้รับ qq คน — วิธีปันตามหัวนิสิตทำให้ TFC ขยับตามจำนวนรับ */
  const adjAt = (qq: number) => adjFrom(qq === q ? afterOutcome : outcomeAt(qq));

  return { lock, lockReady, facRows, facPool, refId, buckets, afterOutcome, adjOf, adjAt };
}
