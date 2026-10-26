// W6 — คำนวณจุดคุ้มทุนรายคณะ (Scenario Calculator) · ปิดไว้จนกว่าที่ประชุมจะลงมติ (SHOW_SCENARIO_FACULTY)
import { notFound } from 'next/navigation';

import ScenarioFacultyView from '@/views/scenario-faculty/ScenarioFacultyView';

import { SHOW_SCENARIO_FACULTY } from '@/configs/accessControl';

const ScenarioFacultyPage = () => {
  if (!SHOW_SCENARIO_FACULTY) notFound();

  return <ScenarioFacultyView />;
};

export default ScenarioFacultyPage;
