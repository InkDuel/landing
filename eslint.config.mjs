import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next 16 removed `next lint` and ships flat configs: no FlatCompat needed.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Compiler guidance (react-hooks v6). The site does not use the
    // compiler and these patterns are deliberate (load on mount, refs that
    // mirror the latest locale); kept visible as warnings, not hidden, until
    // a refactor is worth its risk.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
