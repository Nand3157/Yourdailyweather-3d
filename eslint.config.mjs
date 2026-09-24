import js from "@eslint/js";

/**
 * Minimal flat config. Deliberately JS-only: eslint-config-next pulls
 * typescript-eslint, which does not support this project's TypeScript 7
 * (tsc is the type gate; see package.json scripts).
 */
export default [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", ".freebuff/**", "public/sw.js"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,jsx}"],
    languageOptions: {
      parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        caches: "readonly",
        Response: "readonly",
        fetch: "readonly",
        console: "readonly",
        process: "readonly",
        performance: "readonly",
        location: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];
