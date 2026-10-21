import type { Linter } from "eslint";

export interface WeltConfigOptions {
  /** Pasta do `tsconfig.json` (em geral `import.meta.dirname`). */
  tsconfigRootDir: string;
  /** Arquivos lintados com tipo (regras de TS e React). Padrão: `["**\/*.{ts,tsx}"]`. */
  files?: string[];
  /**
   * Arquivos fora de qualquer `tsconfig` (scripts, configs de ferramenta, regras próprias em `.mjs`):
   * recebem o padrão sem as regras que exigem tipo, com os globais do Node. Não podem casar com
   * `files`. Padrão: `["**\/*.{js,mjs,cjs}"]`.
   */
  untypedFiles?: string[];
  /** Liga React (`@eslint-react`), React Hooks e acessibilidade. Padrão: `true`. */
  react?: boolean;
  /** Liga as regras do TanStack Query. Padrão: `false`. */
  query?: boolean;
  /** Ignores do projeto, somados aos comuns. */
  ignores?: string[];
  /**
   * Complementos do projeto (plugins e regras que só existem ali), aplicados depois do padrão e antes
   * do Prettier, com aviso convertido em erro. Nunca para mudar limite ou desligar regra do padrão.
   */
  extend?: Linter.Config[];
}

export function weltConfig(options: WeltConfigOptions): Linter.Config[];

export const complexityRules: Linter.RulesRecord;
export const bestPracticesRules: Linter.RulesRecord;
export const commentRules: Linter.RulesRecord;
export const typescriptRules: Linter.RulesRecord;
export const disableDirectiveRules: Linter.RulesRecord;
export const testRelaxedRules: Linter.RulesRecord;
export const testFiles: string[];
export const ignores: string[];
