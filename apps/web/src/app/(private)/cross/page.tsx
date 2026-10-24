// Next Imports
import { notFound } from 'next/navigation';

// Config Imports
import { SHOW_CURRENT_YEAR_PAGES } from '@/configs/accessControl';

// W5 — Cross Analysis & Heatmap
import CrossAnalysisView from '@/views/cross/CrossAnalysisView';

const CrossPage = () => {
  if (!SHOW_CURRENT_YEAR_PAGES) notFound();

  return <CrossAnalysisView />;
};

export default CrossPage;
