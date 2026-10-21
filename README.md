# Lint Configs

Configurações de lint da Welt Studio, declaradas uma vez para todos os projetos.

## ESLint: `@welt-studio/eslint-config`

Pacote em `eslint/`, instalado por tag do git (o repositório é público, então nenhum ambiente
precisa de token: máquina, CI e build Docker baixam como qualquer pacote):

```json
"@welt-studio/eslint-config": "github:welt-studio/lint-configs#eslint-v4.0.1&path:/eslint"
```

O lockfile guarda o commit exato da tag. Atualizar um projeto é trocar a tag e rodar `pnpm install`.

```javascript
// eslint.config.mjs
import { weltConfig } from "@welt-studio/eslint-config";

export default weltConfig({
  tsconfigRootDir: import.meta.dirname,
  files: ["src/**/*.{ts,tsx}"], // com tipo (o que o tsconfig inclui)
  framework: "vite", // app Vite; sem ele, pacote/biblioteca (globais do Node)
  query: true, // usa TanStack Query
  i18n: true, // produto traduzido
});
```

**O padrão é o mesmo em todos os projetos, e não existe regra exclusiva de projeto.** O arquivo do
projeto só declara onde estão os arquivos e o que o projeto é (framework, TanStack Query,
traduzido); limite, regra e plugin vêm daqui. Precisou de uma regra nova? Ela entra neste pacote,
para todos, numa versão nova.

`files` e `untypedFiles` não podem se sobrepor: um arquivo é lintado com tipo (está num `tsconfig`)
ou sem tipo (scripts, configs de ferramenta, `.mjs`). Os sem tipo (padrão `**/*.{js,jsx,mjs,cjs}`)
recebem o padrão inteiro menos as regras que exigem tipo, com os globais do Node.

`weltConfig` aplica, nesta ordem:

| Bloco | O que pega |
|---|---|
| `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` | promise sem `await`/`catch`, `async` onde se espera retorno síncrono, `any` vazando, condição sempre verdadeira |
| `@eslint-react/eslint-plugin` (`recommended-type-checked`) | key ausente ou instável, contexto recriado a cada render, API do React usada errado (substitui o `eslint-plugin-react`, parado no ESLint 9). As regras que repetem as do plugin de hooks ficam só lá |
| `eslint-plugin-react-hooks` (`recommended-latest`) | regras dos hooks e do React Compiler |
| `eslint-plugin-jsx-a11y-x` (`recommended`) | acessibilidade (fork do `jsx-a11y` que suporta ESLint 10) |
| `framework: "vite"` | no código do app, globais do navegador e Fast Refresh (`eslint-plugin-react-refresh`); configs de ferramenta (`*.config.ts`) ficam com os globais do Node. Next não é suportado: os apps são Vite |
| `@tanstack/eslint-plugin-query` (`query: true`) | chave de query incompleta, `QueryClient` instável |
| `eslint-plugin-i18next` (`i18n: true`) | texto visível escrito direto no JSX (entre tags ou em qualquer atributo) ou num toast (`toast("…")`, `toast.error("…")`, `description`, `toast.promise`). Ficam de fora só os atributos e chaves de objeto que são código — rota (`href`, `to`), `data-*`, `testId`, ícone (`name`, `icon`), classe (`className`, `classNames`, `cn(...)`), cor, `aria-hidden`, SVG, `type` —, locale e formato (`toLocaleString`, `Intl.*`), `toast.dismiss(id)` e os testes. Prop nova é cobrada até entrar nessa lista: erro a mais aparece, erro a menos passa calado. Vale para qualquer biblioteca de tradução, e o padrão dos projetos traduzidos é o `i18next` |
| `eslint-comments` + `linterOptions` | `eslint-disable` de arquivo inteiro, sem regra ou sem motivo (`-- motivo`), e diretiva que não desliga nada |
| Tamanho, complexidade e boas práticas | `complexity` 12, função 80 linhas, arquivo 400, `max-statements` 30, `max-params` 5, `max-depth` 4, `max-nested-callbacks` 3, boas práticas, ignores comuns |
| Comentários | espaço depois de `//`, frase em maiúscula (menos quando começa com nome de código, como `hydrateRoot`), nenhum `TODO:`/`FIXME`/`HACK:` no código (vão para o débito técnico, parking lot ou roadmap) |
| Testes (`*.test.*`, `*.spec.*`, `__tests__/`, `test/`, `e2e/`) | sem limites de tamanho; o resto do padrão vale |
| Prettier (`eslint-plugin-prettier`) | formatação como regra, por último; `curly` religado depois dele |

**Não há aviso:** toda regra é erro ou está desligada (os projetos rodam com `--max-warnings=0`, e
um aviso já reprovaria).

O pacote exporta só `weltConfig` (com tipos em `index.d.ts`): não há regra solta para reaplicar,
porque reaplicar pedaço do padrão é montar uma versão parcial dele.

`eslint` (10), `@eslint/js` (10), `typescript` (6), `typescript-eslint` e `prettier` (3) são
`peerDependencies`: a versão é a do projeto, e o padrão exige essas majors. Os plugins vêm com o
pacote, em versão fixa — o projeto não declara nem registra nenhum deles.

### Publicar uma versão

1. Mudar `eslint/`, subir `version` no `eslint/package.json`.
2. Commit e tag `eslint-vX.Y.Z` no mesmo commit, push da tag.
3. Em cada projeto, trocar a tag na dependência e rodar `pnpm install`.

## Ruff: `ruff/base.toml` pelo hook `ruff-base`

O `extend` do Ruff só lê arquivo local (sem URL nem pacote), então o padrão chega ao projeto como
cópia, mantida por um hook de pre-commit deste repo:

```yaml
# .pre-commit-config.yaml
- repo: https://github.com/welt-studio/lint-configs
  rev: ruff-v1.0.1
  hooks:
    - id: ruff-base
```

O hook escreve `ruff-base.toml` na raiz do projeto, igual ao `ruff/base.toml` do `rev`. Se a cópia
diverge (editada à mão, ou o `rev` mudou), ele a reescreve e reprova o commit uma vez, como um
formatter. A versão do padrão fica só no `rev`.

```toml
# <pacote>/ruff.toml
extend = "../../ruff-base.toml" # caminho até a raiz do projeto

[lint.isort]
known-first-party = ["app"]
```

**O padrão é o mesmo em todos os projetos.** O `ruff.toml` do pacote só declara fatos do projeto:
`known-first-party` e, em `extend-exclude`, código gerado ou de terceiros. Regra, limite e exceção
vêm do base; precisou de regra nova, ela entra aqui, para todos, numa tag nova.

| Bloco | O que fixa |
|---|---|
| `required-version` | a versão do Ruff (a do `uv.lock` do projeto tem de bater; outra reprova) |
| `select` explícito (sem `ALL`) | a união das famílias que os projetos usavam: pycodestyle, pyflakes, isort, naming, pyupgrade, bandit, bugbear, pylint, async, timezone, pathlib, Ruff, tryceratops, anotações, `TC`, FastAPI, Django, `noqa` sem código (`PGH004`) e sem uso (`RUF100`). Sem `FA`: `from __future__ import annotations` é proibido (Python 3.14, PEP 649) |
| Limites | complexidade 12 (igual ao ESLint), `max-args` 5, `max-branches` 12, `max-returns` 6, `max-statements` 50 |
| Runtime | Pydantic e rotas do FastAPI leem anotações em runtime: seus imports não vão para `TYPE_CHECKING` |
| Exceções padrão | testes (assert, número mágico, fixture, tamanho); models do ORM (`TC001`–`TC003`, que o SQLAlchemy lê em runtime); migrations geradas |
| `[format]` | aspas duplas, espaço, `lf` |

Os hooks `ruff` e `ruff-format` do projeto são locais (`uv run --project <pacote> ruff ...`), para
a versão do Ruff morar só no `uv.lock`.

### Publicar uma versão do Ruff

1. Mudar `ruff/base.toml` (e o `required-version`, se a versão do Ruff mudar).
2. Commit e tag `ruff-vX.Y.Z` no mesmo commit, push da tag.
3. Em cada projeto, trocar o `rev` do hook `ruff-base` e rodar o pre-commit (e o `uv lock` com o
   Ruff novo, se o `required-version` mudou).

## Pyright

`pyright/pyrightconfig.json` é referência; os projetos ainda mantêm a própria configuração.
