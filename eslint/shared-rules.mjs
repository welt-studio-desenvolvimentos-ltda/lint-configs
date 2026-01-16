/**
 * Configurações ESLint compartilhadas entre todos os projetos
 * Localização: /home/haseu/projects/lint-configs/eslint/shared-rules.mjs
 */

// Regras de complexidade (substituem solid-principles.md)
export const complexityRules = {
  complexity: ["error", { max: 10 }],
  "max-lines-per-function": [
    "error",
    { max: 50, skipBlankLines: true, skipComments: true },
  ],
  "max-params": ["error", 5],
  "max-depth": ["error", 4],
  "max-nested-callbacks": ["error", 3],
  "max-statements": ["error", 30],
  "max-lines": [
    "error",
    { max: 300, skipBlankLines: true, skipComments: true },
  ],
};

// Best practices
export const bestPracticesRules = {
  "no-nested-ternary": "error",
  "prefer-const": "error",
  "no-var": "error",
  eqeqeq: ["error", "always"],
  curly: ["error", "all"],
  "no-console": "warn",
};

// TypeScript rules padrão
export const typescriptRules = {
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
    },
  ],
  "@typescript-eslint/no-explicit-any": "warn",
};

// Ignores comuns
export const ignores = [
  "node_modules/**",
  "dist/**",
  "build/**",
  "coverage/**",
  "*.min.js",
  ".env*",
  ".next/**",
  "out/**",
];
