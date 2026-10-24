// Next Imports
import { notFound } from 'next/navigation';

// Config Imports
import { SHOW_CURRENT_YEAR_PAGES } from '@/configs/accessControl';

// View Imports
import PerheadView from '@/views/perhead/PerheadView';

const PerheadPage = () => {
  if (!SHOW_CURRENT_YEAR_PAGES) notFound();

  return <PerheadView />;
};

export default PerheadPage;
