/**
 * Configuração ESLint padrão da Welt Studio para os frontends em TypeScript.
 *
 * Uso (`eslint.config.mjs` do projeto):
 *
 *   import { weltConfig } from "@welt-studio/eslint-config";
 *   export default [
 *     ...weltConfig({ tsconfigRootDir: import.meta.dirname, files: ["src/**\/*.{ts,tsx}"], query: true }),
 *     // complementos do projeto (plugins e regras próprias), nunca limites diferentes
 *   ];
 */
import js from "@eslint/js";
import commentConfigs from "@eslint-community/eslint-plugin-eslint-comments/configs";
import eslintReact from "@eslint-react/eslint-plugin";
import pluginQuery from "@tanstack/eslint-plugin-query";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

import {
  bestPracticesRules,
  complexityRules,
  disableDirectiveRules,
  ignores,
  testFiles,
  testRelaxedRules,
  typescriptRules,
} from "./shared-rules.mjs";

export {
  bestPracticesRules,
  complexityRules,
  disableDirectiveRules,
  ignores,
  testFiles,
  testRelaxedRules,
  typescriptRules,
};

const hookRules = reactHooks.configs.flat["recommended-latest"];
const hookRuleNames = new Set(Object.keys(hookRules.rules).map((rule) => rule.split("/")[1]));

// O `@eslint-react` reimplementa regras do plugin oficial de hooks. Fica a versão oficial, que é a
// fonte das regras do React Compiler; as gêmeas do `@eslint-react` saem para não reportar em dobro.
const eslintReactWithoutHookTwins = (() => {
  const config = eslintReact.configs["recommended-type-checked"];
  const rules = Object.fromEntries(
    Object.entries(config.rules).filter(([rule]) => !hookRuleNames.has(rule.split("/")[1])),
  );
  return { ...config, rules };
})();

const isWarn = (level) => level === "warn" || level === 1;

// Aviso não existe no padrão: os projetos rodam com `--max-warnings=0`, então todo aviso já reprova.
// Cada regra é erro ou está desligada, sem meio-termo que pareça opcional.
function warningsAsErrors(config) {
  if (!config.rules) {
    return config;
  }
  const rules = Object.fromEntries(
    Object.entries(config.rules).map(([rule, value]) => {
      if (isWarn(value)) {
        return [rule, "error"];
      }
      if (Array.isArray(value) && isWarn(value[0])) {
        return [rule, ["error", ...value.slice(1)]];
      }
      return [rule, value];
    }),
  );
  return { ...config, rules };
}

/**
 * @param {object} options
 * @param {string} options.tsconfigRootDir pasta do `tsconfig.json` (em geral `import.meta.dirname`)
 * @param {string[]} [options.files] arquivos lintados com as regras de TS e React
 * @param {boolean} [options.react] liga React (`@eslint-react`), React Hooks e acessibilidade
 *   (padrão: true)
 * @param {boolean} [options.query] liga as regras do TanStack Query (padrão: false)
 * @param {string[]} [options.ignores] ignores do projeto, somados aos comuns
 */
export function weltConfig({
  tsconfigRootDir,
  files = ["**/*.{ts,tsx}"],
  react = true,
  query = false,
  ignores: projectIgnores = [],
}) {
  const scoped = (configs) => configs.map((config) => ({ ...config, files }));

  const configs = [
    { name: "welt/ignores", ignores: [...ignores, ...projectIgnores] },
    {
      name: "welt/linter-options",
      linterOptions: {
        reportUnusedDisableDirectives: "error",
        reportUnusedInlineConfigs: "error",
      },
    },
    { ...js.configs.recommended, files },
    ...scoped(tseslint.configs.strictTypeChecked),
    ...scoped(tseslint.configs.stylisticTypeChecked),
    {
      name: "welt/type-info",
      files,
      languageOptions: { parserOptions: { projectService: true, tsconfigRootDir } },
    },
    ...(react
      ? [
          { ...eslintReactWithoutHookTwins, files },
          { ...hookRules, files },
          { ...jsxA11y.configs.recommended, files },
        ]
      : []),
    ...(query ? scoped(pluginQuery.configs["flat/recommended"]) : []),
    { ...commentConfigs.recommended, files },
    {
      name: "welt/rules",
      files,
      rules: {
        ...typescriptRules,
        ...complexityRules,
        ...bestPracticesRules,
        ...disableDirectiveRules,
      },
    },
    { name: "welt/tests", files: testFiles, rules: testRelaxedRules },
    // Prettier por último: formata como regra e desliga o que conflita com ele.
    { ...prettierRecommended, files },
    // O `eslint-config-prettier` desliga `curly`, mas na forma `all` ela não conflita com o Prettier
    // (é uma das "special rules" dele). Sem religar aqui, o `curly` do padrão nunca rodaria.
    { name: "welt/curly-after-prettier", files, rules: { curly: bestPracticesRules.curly } },
  ];

  return configs.map(warningsAsErrors);
}
