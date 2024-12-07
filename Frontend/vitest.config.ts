import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'e2e-tests/**/*.test.ts',
      'e2e-tests/**/*.test.tsx',
    ],
    globals: true,
    setupFiles: './vitest.setup.ts', // Optional: Use for global setup

    coverage: {
      reporter: ['text', 'text-summary', 'json', 'html'],
      reportsDirectory: './test-reports',
      include: ['src'],
      exclude: [
        'tests/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/.idea/**',
        '**/.git/**',
        '**/.cache/**',
        '**/lib/**',
        '**/*.css',
        '**/*.json',
        '**/*.md',
        '**/*.yml',
        '**/*.config.js',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/src/main.tsx',
      ],
      thresholds: {
        statements: 90,
        functions: 100,
        lines: 90,
      },
      ignoreEmptyLines: true,
      reportOnFailure: true,
    },
    hookTimeout: 30000,
  },
});
