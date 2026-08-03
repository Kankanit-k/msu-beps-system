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
    // config files ไม่ต้องผูกกับ tsconfig ของ package
    files: ['*.mjs', '*.js', '*.config.*'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
