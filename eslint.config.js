import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Every screen loads data with the same pattern: a useCallback loader
      // (which flips loading/error state) invoked from useEffect. That is a
      // deliberate data-fetching pattern, not a cascading-render bug, so the
      // compiler-era heuristic is disabled for it.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Context files intentionally export a provider component together with
    // its hook (useAuth / useLanguage) — the standard React context pattern.
    files: ['src/contexts/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Test helpers export utilities, not components; HMR is irrelevant there.
    files: ['src/test/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
