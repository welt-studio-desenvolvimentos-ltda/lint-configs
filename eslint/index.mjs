/**
 * Configuração ESLint padrão da Welt Studio para os frontends em TypeScript.
 *
 * Uso (`eslint.config.mjs` do projeto):
 *
 *   import { weltConfig } from "@welt-studio-desenvolvimentos-ltda/eslint-config";
 *   export default [
 *     ...weltConfig({ tsconfigRootDir: import.meta.dirname, files: ["src/**\/*.{ts,tsx}"], query: true }),
 *     // overrides do projeto
 *   ];
 */
import js from "@eslint/js";
import commentConfigs from "@eslint-community/eslint-plugin-eslint-comments/configs";
import eslintReact from "@eslint-react/eslint-plugin";
import pluginQuery from "@tanstack/eslint-plugin-query";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

import {
  bestPracticesRules,
  complexityRules,
  disableDirectiveRules,
  ignores,
  typescriptRules,
} from "./shared-rules.mjs";

export {
  bestPracticesRules,
  complexityRules,
  disableDirectiveRules,
  ignores,
  typescriptRules,
};

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

  return [
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
          { ...eslintReact.configs["recommended-type-checked"], files },
          // As regras de hooks ficam com o plugin oficial, logo abaixo; esta tira as do
          // `@eslint-react` que repetiriam as dele.
          { ...eslintReact.configs["disable-conflict-eslint-plugin-react-hooks"], files },
          { ...reactHooks.configs.flat["recommended-latest"], files },
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
  ];
}
