# Lint Configs

Configurações de lint da Welt Studio, declaradas uma vez para todos os projetos.

## ESLint: `@welt-studio-desenvolvimentos-ltda/eslint-config`

Pacote em `eslint/`, instalado por tag do git (o repositório é público, então nenhum ambiente
precisa de token: máquina, CI e build Docker baixam como qualquer pacote):

```json
"@welt-studio-desenvolvimentos-ltda/eslint-config": "github:welt-studio-desenvolvimentos-ltda/lint-configs#eslint-v1.0.0&path:/eslint"
```

O lockfile guarda o commit exato da tag. Atualizar um projeto é trocar a tag e rodar `pnpm install`.

```javascript
// eslint.config.mjs
import { weltConfig } from "@welt-studio-desenvolvimentos-ltda/eslint-config";

export default [
  ...weltConfig({
    tsconfigRootDir: import.meta.dirname,
    files: ["src/**/*.{ts,tsx}"],
    query: true, // projetos com TanStack Query
  }),
  // overrides do projeto
];
```

`weltConfig` aplica:

| Bloco | O que pega |
|---|---|
| `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` | promise sem `await`/`catch`, `async` onde se espera retorno síncrono, `any` vazando, condição sempre verdadeira |
| `@eslint-react/eslint-plugin` (`recommended-type-checked`) | key ausente ou instável, contexto recriado a cada render, API do React usada errado (substitui o `eslint-plugin-react`, parado no ESLint 9) |
| `eslint-plugin-react-hooks` (`recommended-latest`) | regras dos hooks e do React Compiler |
| `eslint-plugin-jsx-a11y-x` (`recommended`) | acessibilidade (fork do `jsx-a11y` que suporta ESLint 10) |
| `@tanstack/eslint-plugin-query` (`query: true`) | chave de query incompleta, `QueryClient` instável |
| `eslint-comments` + `linterOptions` | `eslint-disable` de arquivo inteiro, sem regra ou sem motivo (`-- motivo`), e diretiva que não desliga nada |
| `shared-rules.mjs` | tamanho e complexidade (`complexity` 12, função 80 linhas, arquivo 400), boas práticas, ignores comuns |

As regras também saem soltas (`complexityRules`, `bestPracticesRules`, `typescriptRules`,
`disableDirectiveRules`, `ignores`) para o projeto reaplicar num override.

`eslint` (10), `@eslint/js` (10), `typescript` (6) e `typescript-eslint` são `peerDependencies`: a
versão é a do projeto, e o padrão exige essas majors. Os plugins vêm com o pacote, em versão fixa.

### Publicar uma versão

1. Mudar `eslint/`, subir `version` no `eslint/package.json`.
2. Commit e tag `eslint-vX.Y.Z` no mesmo commit, push da tag.
3. Em cada projeto, trocar a tag na dependência e rodar `pnpm install`.

## Ruff e Pyright

`ruff/base.toml` e `pyright/pyrightconfig.json` são referência; os projetos Python ainda mantêm a
própria configuração.
