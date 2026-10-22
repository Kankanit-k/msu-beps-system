// Next Imports
import { notFound } from 'next/navigation';

// Config Imports
import { SHOW_COST_PAGE } from '@/configs/accessControl';

// View Imports
import CostView from '@/views/cost/CostView';

const CostPage = () => {
  if (!SHOW_COST_PAGE) notFound();

  return <CostView />;
};

export default CostPage;
