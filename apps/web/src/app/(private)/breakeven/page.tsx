// Next Imports
import { notFound } from 'next/navigation';

// Config Imports
import { SHOW_CURRENT_YEAR_PAGES } from '@/configs/accessControl';

// Component Imports
import BreakEvenDrill from '@views/breakeven/BreakEvenDrill';

const BreakEvenPage = () => {
  if (!SHOW_CURRENT_YEAR_PAGES) notFound();

  return <BreakEvenDrill />;
};

export default BreakEvenPage;
