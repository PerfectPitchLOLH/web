// @ts-check

import prettierConfig from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import unusedImports from 'eslint-plugin-unused-imports'
import tseslint from 'typescript-eslint'

const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      '.output/**',
      'dist/**',
      'next-env.d.ts',
      'src/generated/**',
      'src/components/ui/**',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
      'tailwind.config.js',
      'prettier.config.js',
      'prisma/**',
      'scripts/**',
      'vitest.config.ts',
    ],
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      'import/order': 'off',
      'sort-imports': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      'no-console': 'off',

      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',

      'prefer-const': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: [
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
  },
  {
    files: [
      'src/app/api/cron/**/*.ts',
      'src/app/api/webhooks/**/*.ts',
      'src/server/shared/utils/audit.logger.ts',
      'src/server/shared/middleware/rate-limit.middleware.ts',
      'src/server/lib/auth.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  prettierConfig,
]

export default eslintConfig
