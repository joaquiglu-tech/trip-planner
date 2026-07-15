import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", ".claude"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // These are new/strict eslint-plugin-react-hooks v7 + react-refresh rules
      // that flag working, behavior-sensitive patterns in this existing codebase
      // (effect-driven state sync, latest-value refs, mixed component/util exports).
      // Kept as warnings — surfaced for review via /code-review, not blocking lint.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-refresh/only-export-components": "warn",
    },
  },
]);
