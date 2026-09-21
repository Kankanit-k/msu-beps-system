'use client';

/**
 * สถานะร่วมของหน้า "แผนการรับนิสิต"
 *
 * การ์ดสามใบ (แตกยอดจาก Q*, คำนวณแยกรายกลุ่ม, เทียบแผน) ต้องใช้สัดส่วน/อัตรา/รายการแผน
 * ชุดเดียวกัน จึงยกสถานะขึ้นมาไว้ที่นี่ แทนที่จะให้แต่ละการ์ดเก็บของตัวเองแล้วไม่ตรงกัน
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { RevenueMode, StudentSegmentInput } from '@beps/calc-engine';
import { calcSegmentedBreakEven } from '@beps/calc-engine';

import type {
  AdmissionMix,
  AdmissionPlan,
  CategoryKey,
  SegmentKey,
  SegmentedInputs,
} from './admissionPlanStore';
import {
  CATEGORY_KEYS,
  EMPTY_MIX,
  EMPTY_SEGMENTED,
  SEGMENT_LABELS,
  clearDraft,
  loadDraft,
  loadPlans,
  saveDraft,
  savePlans,
} from './admissionPlanStore';

/** ยังไม่ได้แตะอะไรเลย = ไม่ต้องเซฟ draft และไม่มีอะไรให้ล้าง */
export const isPristine = (mix: AdmissionMix, segmented: SegmentedInputs) =>
  CATEGORY_KEYS.every((k) => !mix.enabled[k] && !mix.pct[k]) &&
  segmented.tfc === 0 &&
  Object.values(segmented.rates).every((r) => !r.fee && !r.gov && !r.avc);

export const useAdmissionPlan = (
  programName: string,
  qStar: number | null,
  revenueMode: RevenueMode = 'with_government',
) => {
  const [mix, setMix] = useState<AdmissionMix>(EMPTY_MIX);
  const [segmented, setSegmented] = useState<SegmentedInputs>(EMPTY_SEGMENTED);
  const [plans, setPlans] = useState<AdmissionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<AdmissionPlan | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** true จนกว่าจะอ่านรายการแผนเสร็จ — หน้าจอต้องขึ้น skeleton ไม่ใช่ "ยังไม่มีแผน" ที่ผิดความจริง */
  const [loadingPlans, setLoadingPlans] = useState(true);

  /** หลักสูตรที่โหลด draft มาแล้ว — กันเอฟเฟกต์เซฟทับ draft ของหลักสูตรใหม่ด้วยค่าเก่า */
  const [draftKey, setDraftKey] = useState<string | null>(null);

  // localStorage อ่านได้หลัง mount เท่านั้น (และจะเป็นการเรียก API เมื่อย้ายขึ้นเซิร์ฟเวอร์)
  useEffect(() => {
    let alive = true;

    void loadPlans().then((p) => {
      if (!alive) return;

      setPlans(p);
      setLoadingPlans(false);
    });

    return () => {
      alive = false;
    };
  }, []);

  // สลับหลักสูตร = โหลด draft ของหลักสูตรนั้น (ไม่มีก็เริ่มจากว่าง)
  useEffect(() => {
    let alive = true;

    void loadDraft(programName).then((draft) => {
      if (!alive) return;

      setMix(draft?.mix ?? EMPTY_MIX);
      setSegmented(draft?.segmented ?? EMPTY_SEGMENTED);
      setSelectedPlan(null);
      setDraftKey(programName);
    });

    return () => {
      alive = false;
    };
  }, [programName]);

  useEffect(() => {
    if (draftKey !== programName) return;

    void (isPristine(mix, segmented)
      ? clearDraft(programName)
      : saveDraft(programName, { mix, segmented }));
  }, [mix, segmented, programName, draftKey]);

  const pristine = isPristine(mix, segmented);

  const setCategoryPct = useCallback((key: CategoryKey, value: number) => {
    const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;

    setMix((prev) => ({ ...prev, pct: { ...prev.pct, [key]: clamped } }));
  }, []);

  const toggleCategory = useCallback((key: CategoryKey, on: boolean) => {
    setMix((prev) => ({
      enabled: { ...prev.enabled, [key]: on },
      pct: on ? prev.pct : { ...prev.pct, [key]: 0 },
    }));
  }, []);

  /** สัดส่วนที่ใช้งานจริง — นิสิตไทยภาคปกติเป็นส่วนที่เหลือเสมอ */
  const shares = useMemo(() => {
    const activeKeys = CATEGORY_KEYS.filter((k) => mix.enabled[k]);
    const otherTotal = activeKeys.reduce((sum, k) => sum + (mix.pct[k] || 0), 0);

    return {
      activeKeys,
      otherTotal,
      thaiRegularPct: Math.max(0, 100 - otherTotal),
      overAllocated: otherTotal > 100,
    };
  }, [mix]);

  /** กลุ่มที่มีสัดส่วนจริง — ไทยภาคปกติเป็นส่วนที่เหลือเสมอจึงติดมาทุกครั้ง */
  const activeSegments = useMemo<{ key: SegmentKey; share: number }[]>(
    () => [
      { key: 'thaiRegular', share: shares.thaiRegularPct },
      ...shares.activeKeys.map((k) => ({ key: k, share: mix.pct[k] || 0 })),
    ],
    [shares, mix.pct],
  );

  const segmentedResult = useMemo(() => {
    const segs: StudentSegmentInput[] = activeSegments.map(({ key, share }) => ({
      key,
      label: SEGMENT_LABELS[key],
      share,
      feePerHead: segmented.rates[key].fee,
      governmentPerHead: segmented.rates[key].gov,
      avc: segmented.rates[key].avc,
    }));

    return calcSegmentedBreakEven({
      segments: segs,
      tfc: segmented.tfc,
      revenueMode,
      qPlanned: qStar ?? undefined,
    });
  }, [activeSegments, segmented, revenueMode, qStar]);

  const savePlan = useCallback(
    (name: string) => {
      if (!name.trim() || !qStar) return;

      const plan: AdmissionPlan = {
        id: Date.now(),
        name: name.trim(),
        programName,
        qStar,
        savedAt: new Date().toLocaleString('th-TH'),
        enabled: { ...mix.enabled },
        pct: { ...mix.pct },
        segmented: { tfc: segmented.tfc, rates: { ...segmented.rates } },
        segmentedQStar: segmentedResult.qStar,
      };

      setPlans((prev) => {
        const next = [plan, ...prev];

        void savePlans(next);

        return next;
      });
      setSelectedPlan(plan);
      setToast(`บันทึกแผน "${plan.name}" แล้ว`);
    },
    [mix, segmented, segmentedResult, programName, qStar],
  );

  const applyPlan = useCallback(
    (plan: AdmissionPlan | null) => {
      setSelectedPlan(plan);

      if (!plan) return;

      setMix({ enabled: { ...plan.enabled }, pct: { ...plan.pct } });
      if (plan.segmented)
        setSegmented({ tfc: plan.segmented.tfc, rates: { ...plan.segmented.rates } });

      setToast(
        plan.programName === programName
          ? `โหลดแผน "${plan.name}" แล้ว`
          : `โหลดแผน "${plan.name}" (บันทึกไว้จากหลักสูตร ${plan.programName}) — ตรวจสอบสัดส่วนอีกครั้ง`,
      );
    },
    [programName],
  );

  const deletePlan = useCallback((plan: AdmissionPlan) => {
    setPlans((prev) => {
      const next = prev.filter((p) => p.id !== plan.id);

      void savePlans(next);

      return next;
    });
    setSelectedPlan((cur) => (cur?.id === plan.id ? null : cur));
    setToast(`ลบแผน "${plan.name}" แล้ว`);
  }, []);

  const clearAll = useCallback(() => {
    setMix(EMPTY_MIX);
    setSegmented(EMPTY_SEGMENTED);
    setSelectedPlan(null);
    void clearDraft(programName);
    setToast('ล้างค่าที่กรอกไว้แล้ว');
  }, [programName]);

  return {
    mix,
    segmented,
    activeSegments,
    segmentedResult,
    setSegmented,
    plans,
    loadingPlans,
    selectedPlan,
    pristine,
    shares,
    toast,
    setToast,
    setCategoryPct,
    toggleCategory,
    savePlan,
    applyPlan,
    deletePlan,
    clearAll,
  };
};

export type AdmissionPlanState = ReturnType<typeof useAdmissionPlan>;
