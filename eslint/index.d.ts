import type { Linter } from "eslint";

export interface WeltConfigOptions {
  /** Pasta do `tsconfig.json` (em geral `import.meta.dirname`). */
  tsconfigRootDir: string;
  /** Arquivos lintados com as regras de TS e React. Padrão: `["**\/*.{ts,tsx}"]`. */
  files?: string[];
  /** Liga React (`@eslint-react`), React Hooks e acessibilidade. Padrão: `true`. */
  react?: boolean;
  /** Liga as regras do TanStack Query. Padrão: `false`. */
  query?: boolean;
  /** Ignores do projeto, somados aos comuns. */
  ignores?: string[];
}

export function weltConfig(options: WeltConfigOptions): Linter.Config[];

export const complexityRules: Linter.RulesRecord;
export const bestPracticesRules: Linter.RulesRecord;
export const typescriptRules: Linter.RulesRecord;
export const disableDirectiveRules: Linter.RulesRecord;
export const testRelaxedRules: Linter.RulesRecord;
export const testFiles: string[];
export const ignores: string[];
