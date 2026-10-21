#!/usr/bin/env python3
"""Hook `ruff-base`: mantém `ruff-base.toml` do projeto igual ao `ruff/base.toml` da tag.

O `extend` do Ruff só lê arquivo local, então o padrão chega ao projeto como cópia. Este hook roda
da cópia deste repo que o pre-commit baixou no `rev` declarado: a versão do padrão fica só nesse
`rev`. Como um formatter, reescreve a cópia quando ela diverge (ou não existe) e sai com 1; a
segunda rodada passa. Python stdlib, sem dependências.
"""

from pathlib import Path
import sys

BASE = Path(__file__).resolve().parent / "base.toml"
TARGET = Path("ruff-base.toml")
HEADER = (
    "# GERADO pelo hook `ruff-base` de github.com/welt-studio/lint-configs (ruff/base.toml).\n"
    "# NÃO EDITE: o hook desfaz qualquer mudança. A versão do padrão é o `rev` desse hook no\n"
    "# .pre-commit-config.yaml; regra nova entra no lint-configs, para todos os projetos.\n\n"
)


def main() -> int:
    expected = HEADER + BASE.read_text(encoding="utf-8")
    current = TARGET.read_text(encoding="utf-8") if TARGET.exists() else None
    if current == expected:
        return 0
    TARGET.write_text(expected, encoding="utf-8", newline="\n")
    action = "criado" if current is None else "restaurado"
    print(f"ruff-base: {TARGET} {action} a partir do padrão (lint-configs). Adicione-o ao commit.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
