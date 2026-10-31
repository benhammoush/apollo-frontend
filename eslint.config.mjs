/**
 * @file Enforces correctness across the app and documentation on release tooling.
 */
import parser from '@typescript-eslint/parser'
import typescript from '@typescript-eslint/eslint-plugin'
import jsdoc from 'eslint-plugin-jsdoc'
import hooks from 'eslint-plugin-react-hooks'

/** Documentation adoption is scoped to release tooling; legacy product code is unchanged. */
export const documentedFiles = [
  '*.mjs',
  'tests/**/*.mjs',
  'scripts/check-*.mjs',
  'scripts/notices.mjs',
  'scripts/ci-deploy.mjs',
  'scripts/delivery-policy.mjs',
]

export default [
  { ignores: ['node_modules/**', 'dist/**', 'test-results/**', 'playwright-report/**'] },
  {
    files: ['**/*.{ts,tsx,mjs}'],
    languageOptions: {
      parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': hooks, '@typescript-eslint': typescript },
    linterOptions: { reportUnusedDisableDirectives: false },
    rules: {
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-dupe-args': 'error',
      'no-duplicate-case': 'error',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
  {
    files: documentedFiles,
    plugins: { jsdoc },
    settings: { jsdoc: { mode: 'typescript' } },
    rules: {
      'jsdoc/check-types': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/require-description': 'error',
      'jsdoc/require-file-overview': [
        'error',
        { tags: { file: { mustExist: true, preventDuplicates: true } } },
      ],
      'jsdoc/require-jsdoc': [
        'error',
        {
          enableFixer: false,
          require: { FunctionDeclaration: true, ClassDeclaration: true, MethodDefinition: true },
          contexts: [
            'VariableDeclarator > ArrowFunctionExpression',
            'VariableDeclarator > FunctionExpression',
          ],
        },
      ],
    },
  },
  // Tests deliberately call hook harnesses; Playwright's use callback is not React.use.
  {
    files: ['scripts/test-*.mjs', 'tests/**/*.mjs'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
]
