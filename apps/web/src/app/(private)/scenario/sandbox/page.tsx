import { notFound } from 'next/navigation';

import AdmissionSandboxView from '@/views/scenario-program/AdmissionSandboxView';

import { SHOW_SCENARIO_SANDBOX } from '@/configs/accessControl';

const SandboxPage = () => {
  if (!SHOW_SCENARIO_SANDBOX) notFound();

  return <AdmissionSandboxView />;
};

export default SandboxPage;
