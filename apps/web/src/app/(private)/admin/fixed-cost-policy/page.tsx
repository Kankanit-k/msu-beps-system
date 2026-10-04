// Next Imports
import { notFound } from 'next/navigation';

// Component Imports
import FixedCostPolicyView from '@views/fixed-cost-policy/FixedCostPolicyView';

import { SHOW_FIXED_COST_POLICY } from '@/configs/accessControl';

const FixedCostPolicyPage = () => {
  if (!SHOW_FIXED_COST_POLICY) notFound();

  return <FixedCostPolicyView />;
};

export default FixedCostPolicyPage;
