// W7 (2) — ปรับปรุงหลักสูตรเดิมแบบหน้าเดียว (เทียบจุดคุ้มทุนปัจจุบันกับหลังปรับปรุง)
import { notFound } from 'next/navigation';

import QuickCalcView from '@/views/scenario-program/QuickCalcView';

import { SHOW_SCENARIO_PROGRAM2 } from '@/configs/accessControl';

const ScenarioProgram2Page = () => {
  if (!SHOW_SCENARIO_PROGRAM2) notFound();

  return <QuickCalcView />;
};

export default ScenarioProgram2Page;
