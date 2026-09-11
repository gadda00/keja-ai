import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * ESLint — correctness rules re-armed (audit F-15 / P1-1).
 *
 * History: the rebuild-era config disabled 26 rules including core
 * correctness sets, so the linter passed by construction. The correctness
 * set below is now ON and the CI gate treats warnings as failures. Stylistic
 * opinion stays out — only rules that catch real defects.
 */
const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // ---- correctness (re-armed) ----
    "no-unused-vars": "off", // TS's own check is stricter; see @typescript-eslint rule below
    "@typescript-eslint/no-unused-vars": ["warn", {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
    }],
    "no-unreachable": "warn",
    "no-redeclare": "warn",
    "no-useless-escape": "warn",
    "no-fallthrough": "warn",
    "no-case-declarations": "warn",
    "no-mixed-spaces-and-tabs": "warn",
    "no-irregular-whitespace": "warn",
    "no-debugger": "warn",

    // ---- React correctness (re-armed) ----
    "react-hooks/exhaustive-deps": "warn",
    "react-hooks/purity": "warn",
    "react/no-unescaped-entities": "off", // apostrophes in copy are intentional
    "react/prop-types": "off",            // TS types cover this

    // ---- pragmatic keeps ----
    "@typescript-eslint/no-explicit-any": "off",      // incremental tightening
    "@typescript-eslint/no-non-null-assertion": "off", // compare view has guarded asserts
    "@typescript-eslint/ban-ts-comment": "off",
    "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    "@next/next/no-img-element": "off",  // static export: plain <img> is the design
    "@next/next/no-html-link-for-pages": "off",
  },
}, {
  // CLI scripts: console.log IS the user interface — allow it there.
  files: ["scripts/**/*.mjs", "scripts/**/*.ts"],
  rules: {
    "no-console": "off",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", ".vercel/**", "build/**", "next-env.d.ts", "examples/**", "skills", "download/**", "scripts/keja-docs/**", "scripts/phase2_audit/**", "android/**", "ios/**"]
}];

export default eslintConfig;
