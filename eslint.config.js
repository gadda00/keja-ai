/**
 * ESLint 9 flat config — migrated from .eslintrc.cjs (which ESLint 9 could not
 * read). Calibrated against the current codebase so `npm run lint:eslint`
 * actually runs and passes clean; stricter rules were kept where they add
 * safety and relaxed where the legacy config had them off or the codebase
 * predates the rule.
 */
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import unusedImports from 'eslint-plugin-unused-imports'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'public/**', 'scripts/**', '*.config.js', 'vite.config.*', 'vitest.config.*'],
  },

  // Base JS + TS (type-unaware for speed, type-aware rules added below)
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React + hooks + a11y
  {
    files: ['src/**/*.{ts,tsx}'],
    ...react.configs.flat.recommended,
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'ignore' }],
      'react/jsx-fragments': ['error', 'syntax'],
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-duplicate-props': ['error', { ignoreCase: true }],
      'react/jsx-no-leaked-render': ['error', { validStrategies: ['ternary', 'coerce'] }],
      'react/jsx-no-script-url': 'error',
      'react/jsx-no-target-blank': ['error', { enforceDynamicLinks: 'always' }],
      'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
      'react/jsx-pascal-case': ['error', { allowAllCaps: true }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ...jsxA11y.flatConfigs.recommended,
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      'jsx-a11y/anchor-is-valid': ['error', { aspects: ['invalidHref', 'preferButton'] }],
      'jsx-a11y/label-has-associated-control': ['error', { required: { some: ['nesting', 'id'] } }],
    },
  },

  // Type-aware rules on src only
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-restricted-imports': ['error', { paths: [{ name: 'react', importNames: ['default'], message: 'Use named imports from React.' }] }],
    },
  },

  // Unused imports + import sorting
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'unused-imports': unusedImports,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['warn', { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' }],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  // General correctness rules from the legacy config
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-else-return': ['error', { allowElseIf: false }],
      'no-empty-function': ['error', { allow: ['arrowFunctions', 'functions', 'methods'] }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-param-reassign': ['error', { props: true, ignorePropertyModificationsFor: ['acc', 'accumulator', 'e', 'ctx', 'req', 'request', 'res', 'response', '$event'] }],
      'no-return-await': 'error',
      'no-throw-literal': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'prefer-const': ['error', { destructuring: 'all', ignoreReadBeforeAssign: true }],
      'prefer-destructuring': ['error', { VariableDeclarator: { array: false, object: true }, AssignmentExpression: { array: true, object: true } }],
      'prefer-exponentiation-operator': 'error',
      'prefer-object-has-own': 'error',
      'prefer-object-spread': 'error',
      'prefer-promise-reject-errors': ['error', { allowEmptyReject: true }],
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'symbol-description': 'error',
      yoda: ['error', 'never'],
    },
  },

  // Tests: non-null assertions are idiomatic in vitest expect blocks
  {
    files: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Prettier last
  prettierRecommended,
)
