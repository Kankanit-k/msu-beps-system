import { redirect } from 'next/navigation';

import themeConfig from '@configs/themeConfig';

export default function RootPage() {
  redirect(themeConfig.homePageUrl);
}
