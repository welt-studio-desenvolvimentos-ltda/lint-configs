/**
 * Configuração ESLint padrão da Welt Studio para os frontends em TypeScript.
 *
 * O padrão é um só para todos os projetos: o pacote exporta apenas `weltConfig`. O projeto só
 * declara onde estão os arquivos e o que ele é (framework, TanStack Query, traduzido); regra
 * exclusiva de projeto não existe. Mudar o padrão é mudar este pacote e publicar uma versão.
 *
 *   import { weltConfig } from "@welt-studio/eslint-config";
 *   export default weltConfig({
 *     tsconfigRootDir: import.meta.dirname,
 *     files: ["src/**\/*.{ts,tsx}"],
 *     framework: "vite",
 *     query: true,
 *   });
 */
import js from "@eslint/js";
import commentConfigs from "@eslint-community/eslint-plugin-eslint-comments/configs";
import eslintReact from "@eslint-react/eslint-plugin";
import pluginQuery from "@tanstack/eslint-plugin-query";
import i18next from "eslint-plugin-i18next";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

// Tamanho e complexidade. Valores medidos nos projetos: abaixo deles a regra vira ruído.
const complexityRules = {
  complexity: ["error", { max: 12 }],
  "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
  "max-params": ["error", 5],
  "max-depth": ["error", 4],
  "max-nested-callbacks": ["error", 3],
  "max-statements": ["error", 30],
  "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
};

// Arquivos de teste dos projetos.
const testFiles = ["**/*.{test,spec}.{ts,tsx}", "**/__tests__/**", "**/test/**", "**/e2e/**"];

// Nos testes, tamanho não é defeito: `describe` → `describe` → `it` → callback já são 4 níveis, e
// o `describe` cresce com o número de casos. O resto do padrão continua valendo — em especial as
// regras com tipo, que pegam `expect(...).rejects` sem `await` (teste que passa sem testar nada).
const testRelaxedRules = {
  "max-lines-per-function": "off",
  "max-statements": "off",
  "max-nested-callbacks": "off",
  "max-lines": "off",
};

// Boas práticas de JS que o `recommended` não liga. As de promise ficam com as versões com tipo do
// typescript-eslint (`require-await`, `prefer-promise-reject-errors`), que o `strictTypeChecked`
// já traz.
const bestPracticesRules = {
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

// Comentários: espaço depois de `//`, frase começando em maiúscula e nenhuma pendência no código —
// TODO/FIXME/HACK vão para o débito técnico, o parking lot ou o roadmap, onde alguém os vê.
//
// `capitalized-comments` não mexe em comentário que começa com nome de código (`hydrateRoot`,
// `user_id`, `api.get`): o `--fix` do pre-commit o trocaria por `HydrateRoot`, que é outro nome.
// `no-warning-comments` casa o marcador (`TODO:`, `TODO(`), não a palavra "todo" do português.
const CODE_IDENTIFIER = "[a-z][\\w$]*[A-Z0-9_.][\\w$.]*";
const commentRules = {
  "capitalized-comments": [
    "error",
    "always",
    {
      ignorePattern: `pragma|ignore|prettier-ignore|webpack\\w+:|c8|eslint|ts-|${CODE_IDENTIFIER}`,
      ignoreInlineComments: true,
      ignoreConsecutiveComments: true,
    },
  ],
  "spaced-comment": ["error", "always", { markers: ["/"] }],
  "no-warning-comments": [
    "error",
    { terms: ["todo:", "todo(", "fixme", "hack:", "xxx:"], location: "anywhere" },
  ],
};

const typescriptRules = {
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
  ],
  "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
};

// Desligar regra é exceção: nunca o arquivo inteiro, nunca sem dizer quais regras, nunca sem motivo
// (`// eslint-disable-next-line regra -- motivo`). Diretiva que não desliga nada é erro pelo
// `linterOptions` abaixo.
const disableDirectiveRules = {
  "@eslint-community/eslint-comments/no-unlimited-disable": "error",
  "@eslint-community/eslint-comments/disable-enable-pair": ["error", { allowWholeFile: false }],
  "@eslint-community/eslint-comments/require-description": "error",
};

// O prefixo `**/` é obrigatório: no flat config os padrões são relativos à raiz da config e `*` não
// atravessa `/`. Sem ele, `*.min.js` só pega minificado na raiz e `dist/**` só o `dist` de primeiro
// nível — foi assim que um `eslint --fix` reescreveu um UMD minificado de terceiro no pg-studio.
const commonIgnores = [
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

// Regras que não dependem de tipo: valem nos arquivos com tipo e nos que estão fora do `tsconfig`.
const untypedStandardRules = {
  ...complexityRules,
  ...bestPracticesRules,
  ...commentRules,
  ...disableDirectiveRules,
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

// Configs de ferramenta (`vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`): estão no
// `tsconfig`, mas rodam no Node, não no app. Ficam fora do que o `framework` liga.
const toolConfigFiles = ["**/*.config.{ts,mts,cts}"];

// App Vite: o código do app roda no navegador, e o Fast Refresh exige que arquivo de componente só
// exporte componente (senão o HMR recarrega a página).
function frameworkConfigs(framework, files) {
  if (framework !== "vite") {
    return [];
  }
  return [
    {
      name: "welt/app-globals",
      files,
      ignores: toolConfigFiles,
      languageOptions: { globals: globals.browser },
    },
    { ...reactRefresh.configs.vite, files, ignores: toolConfigFiles },
  ];
}

// Atributos que são código, não texto de tela: rota, id de teste, nome de ícone, classe, cor, valor
// de formulário, SVG. Todo o resto é cobrado — prop de componente nova (`badge`, `unit`, `detail`)
// é texto até prova em contrário, porque erro a mais aparece e erro a menos passa calado. Os
// padrões casam o nome inteiro; os `aria-*` que o leitor de tela lê continuam cobrados.
const codeAttributes = [
  // Os do próprio plugin (o `exclude` da opção substitui o padrão dele).
  "className",
  "styleName",
  "style",
  "type",
  "key",
  "id",
  "width",
  "height",
  "\\w*(ClassName|Class|Color|Icon|Id)",
  "classNames",
  "data-[\\w-]+",
  "testId",
  "aria-(?!label$|description$|roledescription$|valuetext$|placeholder$)[\\w-]+",
  "role",
  // `action` fica cobrado: em componente é rótulo de botão (`action="Ver vendas"`), e o `action` do
  // `<form>` no React 19 é função.
  "(href|to|src|srcSet)",
  "[a-z]\\w*(To|Href|Url|Path|Src)",
  // `value` fica cobrado: no `<SelectItem>` é código, mas em componente de exibição
  // (`<Metric value="3 Models">`) é texto de tela.
  "(htmlFor|form|name|accept|autoComplete|inputMode|pattern|rel|target|method)",
  "(icon|layoutId|variant|size|side|align|orientation|mode|slot|as|lang|dir|loading|decoding|sizes)",
  "(viewBox|d|fill|stroke|xmlns|transform|points|cx|cy|r|x|y|x1|x2|y1|y2|clipPath|mask)",
  "(fill|stroke|clip|font|text)[A-Z]\\w*",
];

// Chamadas cujos argumentos são código: classes (`cn`, `clsx`, `cva`, `twMerge`), locale e formato
// (`toLocaleString("pt-BR")`, `new Intl.DateTimeFormat(...)`). Os primeiros itens são o padrão do
// plugin (a opção substitui a lista dele).
const codeCallees = [
  "i18n(ext)?",
  "t",
  "require",
  "addEventListener",
  "removeEventListener",
  "postMessage",
  "getElementById",
  "dispatch",
  "commit",
  "includes",
  "indexOf",
  "endsWith",
  "startsWith",
  "(cn|clsx|cva|twMerge)",
  "toLocale\\w*String",
  "Intl\\.\\w+",
];

// Objeto dentro do JSX segue a mesma lista dos atributos: `transition={{ type: "spring" }}` e
// `toastOptions={{ classNames: { … } }}` são código; `{ label: "Valor" }` é texto. O primeiro padrão
// é o do plugin (chave em CAIXA_ALTA).
const codeObjectProperties = ["[A-Z_-]+", ...codeAttributes];

// Toast é texto visível fora do JSX, que a regra do i18next (no modo só-JSX) não vê: `toast("…")`,
// `toast.error("…")` e `description`/`title` nas opções dele. Casa só as chamadas que mostram
// mensagem — `toast.dismiss("upload-id")` recebe um id, não texto.
const TOAST_CALL =
  'CallExpression:matches([callee.name="toast"], [callee.object.name="toast"][callee.property.name=/^(success|error|info|warning|loading|message)$/])';
const TOAST_MESSAGE = "Texto do toast vem do catálogo de mensagens (t(...)), não escrito direto.";
const toastLiteralRule = [
  "error",
  ...[
    `${TOAST_CALL} > Literal[value=/\\S/]`,
    `${TOAST_CALL} > TemplateLiteral`,
    `${TOAST_CALL} > ObjectExpression > Property[key.name=/^(title|description)$/] > :matches(Literal[value=/\\S/], TemplateLiteral)`,
    // `toast.promise(p, { loading: "…", success: "…", error: "…" })`
    'CallExpression[callee.object.name="toast"][callee.property.name="promise"] > ObjectExpression > Property[key.name=/^(loading|success|error|description)$/] > :matches(Literal[value=/\\S/], TemplateLiteral)',
  ].map((selector) => ({ selector, message: TOAST_MESSAGE })),
];

// Texto visível escrito direto no JSX (entre tags ou em atributo visível) ou num toast, num produto
// traduzido: sai do catálogo de mensagens. Só procura o literal, então vale para qualquer biblioteca
// de tradução — o padrão dos projetos traduzidos é o `i18next`. Teste escreve o texto esperado
// direto, então fica de fora.
const i18nConfigs = (files) => [
  {
    name: "welt/i18n",
    files,
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-only",
          "jsx-attributes": { exclude: codeAttributes },
          "object-properties": { exclude: codeObjectProperties },
          callees: { exclude: codeCallees },
        },
      ],
      "no-restricted-syntax": toastLiteralRule,
    },
  },
  {
    name: "welt/i18n-tests",
    files: testFiles,
    rules: { "i18next/no-literal-string": "off", "no-restricted-syntax": "off" },
  },
];

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
 * @param {string[]} [options.files] arquivos lintados com tipo (regras de TS e React)
 * @param {string[]} [options.untypedFiles] arquivos fora de qualquer `tsconfig` (scripts, configs de
 *   ferramenta, regras próprias em `.mjs`): recebem o padrão sem as regras que exigem tipo, com os
 *   globais do Node
 * @param {boolean} [options.react] liga React (`@eslint-react`), React Hooks e acessibilidade
 *   (padrão: true)
 * @param {"vite"} [options.framework] app Vite: no código do app, globais do navegador e Fast
 *   Refresh; as configs de ferramenta (`*.config.ts`) ficam com os do Node. Sem ele, os arquivos
 *   com tipo recebem os globais do Node (pacote ou biblioteca)
 * @param {boolean} [options.query] liga as regras do TanStack Query (padrão: false)
 * @param {boolean} [options.i18n] produto traduzido: texto visível no JSX só pelo catálogo
 *   (padrão: false)
 * @param {string[]} [options.ignores] ignores do projeto (código gerado ou de terceiros), somados aos
 *   comuns
 */
export function weltConfig({
  tsconfigRootDir,
  files = ["**/*.{ts,tsx}"],
  untypedFiles = ["**/*.{js,jsx,mjs,cjs}"],
  react = true,
  framework,
  query = false,
  i18n = false,
  ignores = [],
}) {
  const scoped = (configs) => configs.map((config) => ({ ...config, files }));
  const formatted = [...files, ...untypedFiles];
  // Config de ferramenta que está entre os arquivos com tipo: no flat config, um array dentro de
  // `files` exige que todos os padrões dele casem.
  const typedToolConfigs = files.flatMap((pattern) =>
    toolConfigFiles.map((toolConfig) => [pattern, toolConfig]),
  );

  const configs = [
    { name: "welt/ignores", ignores: [...commonIgnores, ...ignores] },
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
    // Globais do Node em pacote e biblioteca; no app Vite, só nas configs de ferramenta (o código do
    // app recebe os do navegador em `frameworkConfigs`). Os globais de configs diferentes se somam,
    // por isso cada arquivo recebe um conjunto só.
    {
      name: "welt/node-globals",
      files: framework === "vite" ? typedToolConfigs : files,
      languageOptions: { globals: globals.node },
    },
    ...(react
      ? [
          { ...eslintReactWithoutHookTwins, files },
          { ...hookRules, files },
          { ...jsxA11y.configs.recommended, files },
        ]
      : []),
    ...frameworkConfigs(framework, files),
    ...(query ? scoped(pluginQuery.configs["flat/recommended"]) : []),
    ...(i18n ? i18nConfigs(files) : []),
    { name: "welt/rules", files, rules: { ...typescriptRules, ...untypedStandardRules } },
    // Fora do `tsconfig` não há informação de tipo: o TS entra com o `recommended` sem tipo, e o resto
    // do padrão vale igual. Nesses arquivos roda Node (scripts, configs de ferramenta).
    ...tseslint.configs.recommended.map((config) => ({ ...config, files: untypedFiles })),
    {
      name: "welt/untyped",
      files: untypedFiles,
      // `tsconfigRootDir` mesmo sem tipo: num monorepo com várias configs no mesmo processo, o
      // parser do TS recusa adivinhar a raiz ("multiple candidate TSConfigRootDirs").
      languageOptions: { globals: globals.node, parserOptions: { tsconfigRootDir } },
      rules: untypedStandardRules,
    },
    { name: "welt/tests", files: testFiles, rules: testRelaxedRules },
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
