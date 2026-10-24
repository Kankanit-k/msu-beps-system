// Next Imports
import { notFound } from 'next/navigation';

// Config Imports
import { SHOW_CURRENT_YEAR_PAGES } from '@/configs/accessControl';

// View Imports
import RevenueView from '@/views/revenue/RevenueView';

const RevenuePage = () => {
  if (!SHOW_CURRENT_YEAR_PAGES) notFound();

  return <RevenueView />;
};

export default RevenuePage;
