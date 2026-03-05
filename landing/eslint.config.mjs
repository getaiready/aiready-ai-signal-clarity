import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '.next/**',
      '.open-next/**',
      '.sst/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      react: {
        version: '19.2.4', // Explicitly set instead of 'detect' to avoid crash
      },
    },
  },
];
