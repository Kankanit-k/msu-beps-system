// Next Imports
import { notFound } from 'next/navigation';

// Config Imports
import { SHOW_CURRENT_YEAR_PAGES } from '@/configs/accessControl';

// Component Imports
import BreakEvenChart from '@views/breakeven/BreakEvenChart';

const BreakEvenChartPage = () => {
  if (!SHOW_CURRENT_YEAR_PAGES) notFound();

  return <BreakEvenChart />;
};

export default BreakEvenChartPage;
