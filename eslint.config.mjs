import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      // ไฟล์อ้างอิงจาก prototype เดิม — ไม่ lint (ดู SA.md หัวข้อ 16)
      'MSU-BEPS_*.html',
      'WIREFRAME.html',
      // mockup/ — vanilla JS ฝั่งเบราว์เซอร์ ไม่อยู่ใน tsconfig ของ package ใด
      // สูตรยกมาจาก prototype v8-1 ต้องคงต้นฉบับไว้เทียบ จึงไม่ lint เช่นเดียวกับที่ไม่ format
      // (ดู .prettierignore และ SA.md หัวข้อ 9)
      'mockup/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // ตัวเลขการเงินต้องไม่ถูกแปลงชนิดโดยไม่ตั้งใจ
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // config files ไม่ต้องผูกกับ tsconfig ของ package (รวมถึงไฟล์ config ใน apps/* ด้วย)
    files: ['**/*.mjs', '**/*.js', '**/*.config.*'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // ── apps/web: template ที่ vendor เข้ามา (Materio MUI, ~390 ไฟล์) ──
    // โค้ดชุดนี้ไม่ได้เขียนเพื่อผ่าน typescript-eslint แบบ type-checked ตั้งแต่ต้น
    // และอินเทอร์เฟซกับไลบรารีที่ type หลวม (next-auth, apexcharts, react-perfect-scrollbar,
    // DOM event.target แบบ any) การไล่แก้ no-unsafe-* / no-explicit-any ทั้งหมดให้ตรงกับ
    // ต้นฉบับ Materio ใช้เวลาไม่คุ้ม จึงปิดเฉพาะกฎกลุ่มนี้ไว้สำหรับ apps/web เท่านั้น —
    // แพ็กเกจอื่น (packages/*, apps/api ในอนาคต) ยังคงกฎเข้มเหมือนเดิม
    files: ['apps/web/**/*.ts', 'apps/web/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      // เช่น `isOpen && setIsOpen(false)` — สำนวนที่ใช้ทั่วทั้ง template
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
    },
  },
  prettier,
);
