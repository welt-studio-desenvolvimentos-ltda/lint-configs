# Lint Configs

Configurações de lint da Welt Studio, declaradas uma vez para todos os projetos.

## ESLint: `@welt-studio/eslint-config`

Pacote em `eslint/`, instalado por tag do git (o repositório é público, então nenhum ambiente
precisa de token: máquina, CI e build Docker baixam como qualquer pacote):

```json
"@welt-studio/eslint-config": "github:welt-studio/lint-configs#eslint-v1.0.2&path:/eslint"
```

O lockfile guarda o commit exato da tag. Atualizar um projeto é trocar a tag e rodar `pnpm install`.

```javascript
// eslint.config.mjs
import { weltConfig } from "@welt-studio/eslint-config";
import reactRefresh from "eslint-plugin-react-refresh";

export default weltConfig({
  tsconfigRootDir: import.meta.dirname,
  files: ["src/**/*.{ts,tsx}"], // com tipo
  untypedFiles: ["**/*.{js,mjs,cjs}", "vite.config.ts"], // fora de qualquer tsconfig
  query: true, // projetos com TanStack Query
  // complementos do projeto: plugins e regras que só existem ali (i18n, Next, react-refresh)
  extend: [
    {
      files: ["src/**/*.tsx"],
      plugins: { "react-refresh": reactRefresh },
      rules: { "react-refresh/only-export-components": "error" },
    },
  ],
});
```

**O padrão é o mesmo em todos os projetos.** O projeto acrescenta o que só existe nele (plugin de
framework, regra própria) por `extend`, mas não muda limite nem desliga regra do padrão. Mudar o
padrão é mudar este pacote e publicar uma versão. O que entra por `extend` passa pela mesma
conversão de aviso em erro e fica antes do Prettier.

`files` e `untypedFiles` não podem se sobrepor: um arquivo é lintado com tipo (está num `tsconfig`)
ou sem tipo (scripts, configs de ferramenta, regras próprias em `.mjs`). Os sem tipo recebem o
padrão inteiro menos as regras que exigem tipo, com os globais do Node.

`weltConfig` aplica, nesta ordem:

| Bloco | O que pega |
|---|---|
| `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` | promise sem `await`/`catch`, `async` onde se espera retorno síncrono, `any` vazando, condição sempre verdadeira |
| `@eslint-react/eslint-plugin` (`recommended-type-checked`) | key ausente ou instável, contexto recriado a cada render, API do React usada errado (substitui o `eslint-plugin-react`, parado no ESLint 9). As regras que repetem as do plugin de hooks ficam só lá |
| `eslint-plugin-react-hooks` (`recommended-latest`) | regras dos hooks e do React Compiler |
| `eslint-plugin-jsx-a11y-x` (`recommended`) | acessibilidade (fork do `jsx-a11y` que suporta ESLint 10) |
| `@tanstack/eslint-plugin-query` (`query: true`) | chave de query incompleta, `QueryClient` instável |
| `eslint-comments` + `linterOptions` | `eslint-disable` de arquivo inteiro, sem regra ou sem motivo (`-- motivo`), e diretiva que não desliga nada |
| `shared-rules.mjs` | `complexity` 12, função 80 linhas, arquivo 400, `max-statements` 30, `max-params` 5, `max-depth` 4, `max-nested-callbacks` 3, boas práticas, ignores comuns |
| Comentários | espaço depois de `//`, frase em maiúscula, nenhum TODO/FIXME/HACK no código (vão para o débito técnico, parking lot ou roadmap) |
| Testes (`*.test.*`, `*.spec.*`, `__tests__/`, `test/`, `e2e/`) | sem limites de tamanho; o resto do padrão vale |
| Prettier (`eslint-plugin-prettier`) | formatação como regra, por último; `curly` religado depois dele |

**Não há aviso:** toda regra é erro ou está desligada (os projetos rodam com `--max-warnings=0`, e
um aviso já reprovaria).

As regras também saem soltas (`complexityRules`, `bestPracticesRules`, `commentRules`,
`typescriptRules`, `disableDirectiveRules`, `testRelaxedRules`, `testFiles`, `ignores`), também por
`@welt-studio/eslint-config/rules`. O pacote traz tipos (`index.d.ts`).

`eslint` (10), `@eslint/js` (10), `typescript` (6), `typescript-eslint` e `prettier` (3) são
`peerDependencies`: a versão é a do projeto, e o padrão exige essas majors. Os plugins vêm com o
pacote, em versão fixa — o projeto não declara nem registra nenhum deles.

### Publicar uma versão

1. Mudar `eslint/`, subir `version` no `eslint/package.json`.
2. Commit e tag `eslint-vX.Y.Z` no mesmo commit, push da tag.
3. Em cada projeto, trocar a tag na dependência e rodar `pnpm install`.

## Ruff e Pyright

`ruff/base.toml` e `pyright/pyrightconfig.json` são referência; os projetos Python ainda mantêm a
própria configuração.
