// MUI Imports
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';

// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css';

// Type Imports
import type { ChildrenType } from '@core/types';

// Component Imports
import ErrorReporter from '@components/ErrorReporter';

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers';

// Font Imports
import { fontVariables } from '@core/theme/fonts';

// Style Imports
import '@/app/globals.css';

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css';

export const metadata = {
  title: 'MSU-BEPS',
  description: 'เทมเพลตเริ่มต้นสำหรับระบบงาน มหาวิทยาลัยมหาสารคาม (Next.js + MUI)',
};

const RootLayout = async (props: ChildrenType) => {
  const { children } = props;

  // Type guard to ensure lang is a valid Locale

  // Vars

  const systemMode = await getSystemMode();
  const direction = 'ltr';

  return (
    <html id="__next" lang="th" dir={direction} suppressHydrationWarning>
      <body className={`${fontVariables} flex is-full min-bs-full flex-auto flex-col`}>
        <InitColorSchemeScript attribute="data" defaultMode={systemMode} />
        <ErrorReporter />
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
