/*
 * Project fonts — ตามธีม MSU-KPI (erp.msu.ac.th/kpi)
 *
 *  - ทั้งเนื้อหาและหัวข้อ ..... Google Sans (Thai + Latin) → สำรองด้วย IBM Plex Sans Thai
 *
 * Self-hosted via `next/font/google` (no external <link> needed).
 * To change a font, swap the import + loader below and keep the exported
 * family strings — everything else (theme, layout) reads from these.
 */

// Next Imports
import { Google_Sans, IBM_Plex_Sans_Thai } from 'next/font/google';

// Google Sans is a variable font (wght 400–700) → omit `weight` to load the full range.
export const mainFont = Google_Sans({
  subsets: ['thai', 'latin'],
  variable: '--font-main',
  display: 'swap',
  fallback: ['sans-serif'],
});

export const thaiFallbackFont = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-thai-fallback',
  display: 'swap',
  fallback: ['sans-serif'],
});

// Font-family stacks consumed by the MUI theme (see `@core/theme`).
export const bodyFontFamily = `var(--font-main), var(--font-thai-fallback), 'Google Sans', 'IBM Plex Sans Thai', sans-serif`;
export const headingFontFamily = bodyFontFamily;

// CSS-variable classNames to attach to <body> so the @font-face rules load.
export const fontVariables = `${mainFont.variable} ${thaiFallbackFont.variable}`;
