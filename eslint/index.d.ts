import type { Linter } from "eslint";

export interface WeltConfigOptions {
  /** Pasta do `tsconfig.json` (em geral `import.meta.dirname`). */
  tsconfigRootDir: string;
  /** Arquivos lintados com tipo (regras de TS e React). Padrão: `["**\/*.{ts,tsx}"]`. */
  files?: string[];
  /**
   * Arquivos fora de qualquer `tsconfig` (scripts, configs de ferramenta, `.mjs`): recebem o padrão
   * sem as regras que exigem tipo, com os globais do Node. Não podem casar com `files`.
   * Padrão: `["**\/*.{js,jsx,mjs,cjs}"]`.
   */
  untypedFiles?: string[];
  /** Liga React (`@eslint-react`), React Hooks e acessibilidade. Padrão: `true`. */
  react?: boolean;
  /**
   * App de navegador: globais do navegador, Fast Refresh e, no Next, as regras do Next. Sem ele, os
   * arquivos com tipo recebem só os globais do Node (pacote ou biblioteca).
   */
  framework?: "vite" | "next";
  /** Liga as regras do TanStack Query. Padrão: `false`. */
  query?: boolean;
  /** Produto traduzido: texto visível no JSX só pelo catálogo de mensagens. Padrão: `false`. */
  i18n?: boolean;
  /** Ignores do projeto (código gerado ou de terceiros), somados aos comuns. */
  ignores?: string[];
}

export function weltConfig(options: WeltConfigOptions): Linter.Config[];
