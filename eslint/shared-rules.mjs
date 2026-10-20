/**
 * Regras ESLint da Welt Studio, declaradas uma vez para todos os projetos.
 *
 * `index.mjs` as aplica junto com os presets; os projetos só importam daqui o que precisam
 * reaplicar num override local.
 */

// Tamanho e complexidade. Valores medidos nos projetos: abaixo deles a regra vira ruído.
export const complexityRules = {
  complexity: ["error", { max: 12 }],
  "max-lines-per-function": [
    "error",
    { max: 80, skipBlankLines: true, skipComments: true },
  ],
  "max-params": ["error", 5],
  "max-depth": ["error", 4],
  "max-nested-callbacks": ["error", 3],
  "max-statements": ["error", 30],
  "max-lines": [
    "error",
    { max: 400, skipBlankLines: true, skipComments: true },
  ],
};

// Arquivos de teste dos projetos.
export const testFiles = [
  "**/*.{test,spec}.{ts,tsx}",
  "**/__tests__/**",
  "**/test/**",
  "**/e2e/**",
];

// Nos testes, tamanho não é defeito: `describe` → `describe` → `it` → callback já são 4 níveis, e
// o `describe` cresce com o número de casos. O resto do padrão continua valendo — em especial as
// regras com tipo, que pegam `expect(...).rejects` sem `await` (teste que passa sem testar nada).
export const testRelaxedRules = {
  "max-lines-per-function": "off",
  "max-statements": "off",
  "max-nested-callbacks": "off",
  "max-lines": "off",
};

// Boas práticas de JS que o `recommended` não liga. As de promise ficam com as versões com tipo do
// typescript-eslint (`require-await`, `prefer-promise-reject-errors`), que o `strictTypeChecked`
// já traz.
export const bestPracticesRules = {
  "no-nested-ternary": "error",
  "prefer-const": "error",
  "no-var": "error",
  eqeqeq: ["error", "always"],
  curly: ["error", "all"],
  "no-console": ["error", { allow: ["warn", "error"] }],
  "array-callback-return": "error",
  "no-async-promise-executor": "error",
  "no-promise-executor-return": "error",
  "no-new-func": "error",
  "no-script-url": "error",
  "no-unsafe-optional-chaining": "error",
  "prefer-object-has-own": "error",
  "prefer-object-spread": "error",
  "prefer-template": "error",
  "no-useless-concat": "error",
};

export const typescriptRules = {
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
  ],
  "@typescript-eslint/consistent-type-imports": [
    "error",
    { prefer: "type-imports" },
  ],
};

// Desligar regra é exceção: nunca o arquivo inteiro, nunca sem dizer quais regras, nunca sem motivo
// (`// eslint-disable-next-line regra -- motivo`). Diretiva que não desliga nada é erro pelo
// `linterOptions` em `index.mjs`.
export const disableDirectiveRules = {
  "@eslint-community/eslint-comments/no-unlimited-disable": "error",
  "@eslint-community/eslint-comments/disable-enable-pair": [
    "error",
    { allowWholeFile: false },
  ],
  "@eslint-community/eslint-comments/require-description": "error",
};

// O prefixo `**/` é obrigatório: no flat config os padrões são relativos à raiz da config e `*` não
// atravessa `/`. Sem ele, `*.min.js` só pega minificado na raiz e `dist/**` só o `dist` de primeiro
// nível — foi assim que um `eslint --fix` reescreveu um UMD minificado de terceiro no pg-studio.
export const ignores = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/*.min.js",
  "**/*.min.mjs",
  // Código de terceiros: entra no repo como está e não é nosso para arrumar.
  "**/vendor/**",
  ".env*",
  "**/.next/**",
  "**/out/**",
];
