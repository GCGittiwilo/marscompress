import js from "@eslint/js";

export default [
  {
    ignores: [
      ".next/**",
      ".vinext/**",
      ".wrangler/**",
      "dist/**",
      "node_modules/**",
      "out/**",
      "**/*.ts",
      "**/*.tsx",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        console: "readonly",
        performance: "readonly",
        process: "readonly",
      },
    },
  },
];
