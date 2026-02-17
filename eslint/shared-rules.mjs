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
  // Adicionadas do comichub
  "array-callback-return": "error",
  "no-async-promise-executor": "error",
  "no-promise-executor-return": "error",
  "require-await": "error",
  "prefer-promise-reject-errors": "error",
  "no-new-func": "error",
  "no-script-url": "error",
  "no-unsafe-optional-chaining": "error",
  "prefer-object-has-own": "error",
  "prefer-object-spread": "error",
  "prefer-template": "error",
  "no-useless-concat": "error",
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

// Code quality (do comichub)
export const codeQualityRules = {
  "capitalized-comments": [
    "warn",
    "always",
    {
      ignorePattern: "pragma|ignore|prettier-ignore|webpack\\w+:|c8",
      ignoreInlineComments: true,
    },
  ],
  "spaced-comment": ["error", "always", { markers: ["/"] }],
  "no-warning-comments": [
    "warn",
    { terms: ["todo", "fixme", "hack"], location: "start" },
  ],
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
