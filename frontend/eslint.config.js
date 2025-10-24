import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'
import importPlugin from 'eslint-plugin-import'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
          caseSensitive: true,
        },
      },
    },
    rules: {
      'import/no-unresolved': ['error', { caseSensitive: true }],
    },
  },
  // Playwright E2E test guardrails for maintainability and stability
  {
    files: ['e2e/real/**/*.{ts,tsx}'],
    rules: {
      // Disallow committing focused tests
      'no-restricted-properties': [
        'error',
        { object: 'it', property: 'only', message: 'Do not commit focused tests (it.only)' },
        { object: 'test', property: 'only', message: 'Do not commit focused tests (test.only)' },
        { object: 'describe', property: 'only', message: 'Do not commit focused suites (describe.only)' },
      ],
      // Disallow brittle timeouts in real E2E
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='page'][callee.property.name='waitForTimeout']",
          message: 'Avoid page.waitForTimeout in real E2E; use locator waits or expect.poll',
        },
        {
          selector: "CallExpression[callee.object.name='page'][callee.property.name='route']",
          message: 'Do not mock network in real E2E (page.route is disallowed) — use real backend data',
        },
        {
          selector: "CallExpression[callee.property.name='locator'] Literal[value=/^(\\.|#|xpath=|\\/\\/).*/]",
          message: 'Prefer data-testid selectors (getByTestId or [data-testid=...]) over raw CSS/XPath',
        },
      ],
      // Keep specs lean and readable
      'max-lines-per-function': ['warn', { max: 120, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['warn', { max: 3 }],
    },
  },
])
