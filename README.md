# Lint Configs

Configurações compartilhadas de ESLint e Ruff para todos os projetos.

## Estrutura

- `eslint/shared-rules.mjs` - Regras ESLint (complexidade, best practices, TypeScript)
- `ruff/base.toml` - Configuração Ruff (segurança, bugs, complexidade)

## Como usar

### ESLint

```javascript
// eslint.config.mjs
import {
  complexityRules,
  bestPracticesRules,
  typescriptRules,
  ignores
} from '../lint-configs/eslint/shared-rules.mjs';

export default defineConfig([
  globalIgnores(ignores),
  {
    rules: {
      ...typescriptRules,
      ...complexityRules,
      ...bestPracticesRules,
    },
  },
]);
```

### Ruff

```toml
# ruff.toml
extend = "../lint-configs/ruff/base.toml"
```

## Versionamento

Este repo é versionado com git. Para atualizar configs em todos os projetos:

```bash
cd /home/haseu/projects/lint-configs
# Fazer mudanças
git add .
git commit -m "feat: add new rule"
git push  # (opcional - se tiver remote)
```

Mudanças se propagam automaticamente para todos os projetos que importam daqui.

## Projetos usando estas configs

- welt-studio
- (adicionar outros projetos aqui)

## Regras Incluídas

### ESLint

**Complexidade** (substituem solid-principles.md):
- `complexity`: max 10
- `max-lines-per-function`: max 50 linhas
- `max-params`: max 5 parâmetros
- `max-depth`: max 4 níveis de nesting
- `max-nested-callbacks`: max 3 callbacks aninhados
- `max-statements`: max 30 statements por função
- `max-lines`: max 300 linhas por arquivo

**Best Practices**:
- `no-nested-ternary`: proíbe ternários aninhados
- `prefer-const`: força uso de const
- `no-var`: proíbe var
- `eqeqeq`: força `===`
- `curly`: força chaves em if/else
- `no-console`: avisa sobre console.log

**TypeScript**:
- `no-unused-vars`: ignora variáveis com `_` prefix
- `no-explicit-any`: avisa sobre `any`

### Ruff

**Categorias ativadas**:
- `E/W`: pycodestyle errors/warnings
- `F`: pyflakes
- `I`: isort (import sorting)
- `N`: pep8-naming
- `UP`: pyupgrade (modernize code)
- `S`: bandit (security)
- `B`: bugbear (common bugs)
- `A`: builtins (shadowing)
- `C4`: comprehensions
- `C90`: mccabe complexity (max 10)
- `RET`: return statements
- `SIM`: simplify
- `ARG`: unused arguments
- `PLR`: pylint refactoring

**Limites de complexidade**:
- max-args: 5
- max-branches: 12
- max-returns: 6
- max-statements: 50
