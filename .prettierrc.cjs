/** @type {import('prettier').Config} */
module.exports = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  jsxSingleQuote: false,
  plugins: [],
  // NOTE: import ordering is enforced by ESLint's simple-import-sort plugin,
  // not by prettier — the old prettier-plugin-import-sort was unmaintained and
  // its options were silently ignored (prettier warned "unknown option").
};
