/**
 * Configuração ESLint padrão da Welt Studio para os frontends em TypeScript.
 *
 * Uso (`eslint.config.mjs` do projeto):
 *
 *   import { weltConfig } from "@welt-studio/eslint-config";
 *   export default weltConfig({
 *     tsconfigRootDir: import.meta.dirname,
 *     files: ["src/**\/*.{ts,tsx}"],
 *     query: true,
 *     // complementos do projeto (plugins e regras que só existem ali), nunca limites diferentes
 *     extend: [{ files: ["src/**\/*.tsx"], plugins: { ... }, rules: { ... } }],
 *   });
 */
import js from "@eslint/js";
import commentConfigs from "@eslint-community/eslint-plugin-eslint-comments/configs";
import eslintReact from "@eslint-react/eslint-plugin";
import pluginQuery from "@tanstack/eslint-plugin-query";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

import {
  bestPracticesRules,
  commentRules,
  complexityRules,
  disableDirectiveRules,
  ignores,
  testFiles,
  testRelaxedRules,
  typescriptRules,
} from "./shared-rules.mjs";

export {
  bestPracticesRules,
  commentRules,
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
// Cada regra é erro ou está desligada, sem meio-termo que pareça opcional — inclusive nas que o
// projeto acrescenta por `extend`.
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

// Regras que não dependem de tipo: valem nos arquivos com tipo e nos que estão fora do `tsconfig`.
const untypedStandardRules = {
  ...complexityRules,
  ...bestPracticesRules,
  ...commentRules,
  ...disableDirectiveRules,
};

/**
 * @param {object} options
 * @param {string} options.tsconfigRootDir pasta do `tsconfig.json` (em geral `import.meta.dirname`)
 * @param {string[]} [options.files] arquivos lintados com tipo (regras de TS e React)
 * @param {string[]} [options.untypedFiles] arquivos fora de qualquer `tsconfig` (scripts, configs de
 *   ferramenta, regras próprias em `.mjs`): recebem o padrão sem as regras que exigem tipo, com os
 *   globais do Node
 * @param {boolean} [options.react] liga React (`@eslint-react`), React Hooks e acessibilidade
 *   (padrão: true)
 * @param {boolean} [options.query] liga as regras do TanStack Query (padrão: false)
 * @param {string[]} [options.ignores] ignores do projeto, somados aos comuns
 * @param {object[]} [options.extend] complementos do projeto: plugins e regras que só existem ali,
 *   aplicados depois do padrão e antes do Prettier, com aviso convertido em erro
 */
export function weltConfig({
  tsconfigRootDir,
  files = ["**/*.{ts,tsx}"],
  untypedFiles = ["**/*.{js,mjs,cjs}"],
  react = true,
  query = false,
  ignores: projectIgnores = [],
  extend = [],
}) {
  const scoped = (configs) => configs.map((config) => ({ ...config, files }));
  const formatted = [...files, ...untypedFiles];

  const configs = [
    { name: "welt/ignores", ignores: [...ignores, ...projectIgnores] },
    {
      name: "welt/linter-options",
      linterOptions: {
        reportUnusedDisableDirectives: "error",
        reportUnusedInlineConfigs: "error",
      },
    },
    { ...js.configs.recommended, files: formatted },
    { ...commentConfigs.recommended, files: formatted },
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
    { name: "welt/rules", files, rules: { ...typescriptRules, ...untypedStandardRules } },
    // Fora do `tsconfig` não há informação de tipo: o TS entra com o `recommended` sem tipo, e o resto
    // do padrão vale igual. Nesses arquivos roda Node (scripts, configs de ferramenta).
    ...tseslint.configs.recommended.map((config) => ({ ...config, files: untypedFiles })),
    {
      name: "welt/untyped",
      files: untypedFiles,
      languageOptions: { globals: globals.node },
      rules: untypedStandardRules,
    },
    { name: "welt/tests", files: testFiles, rules: testRelaxedRules },
    ...extend,
    // Prettier por último: formata como regra e desliga o que conflita com ele.
    { ...prettierRecommended, files: formatted },
    // O `eslint-config-prettier` desliga `curly`, mas na forma `all` ela não conflita com o Prettier
    // (é uma das "special rules" dele). Sem religar aqui, o `curly` do padrão nunca rodaria.
    {
      name: "welt/curly-after-prettier",
      files: formatted,
      rules: { curly: bestPracticesRules.curly },
    },
  ];

  return configs.map(warningsAsErrors);
}
