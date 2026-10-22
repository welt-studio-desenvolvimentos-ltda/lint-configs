"""Hook `versions`: reprova o projeto cuja versão de ferramenta diverge da tabela `versions.toml`.

Roda na raiz do projeto (o pre-commit chama assim) e olha os arquivos que o git conhece, versionados
ou novos, fora os ignorados. Cada regra devolve mensagens `caminho: problema`; qualquer mensagem
reprova. `--exclude <glob>` tira pastas de referência vendorizadas (código de terceiros que não é
do projeto), como o `extend-exclude` do Ruff.
"""

import argparse
import fnmatch
import json
import re
import subprocess
import sys
import tomllib
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any

import yaml

TABLE = Path(__file__).resolve().parent / "versions.toml"
LINT_CONFIGS_REPO = "https://github.com/welt-studio/lint-configs"
DEP_FIELDS = ("dependencies", "devDependencies", "optionalDependencies")
NPM_ECOSYSTEMS = {"npm"}
PYTHON_ECOSYSTEMS = {"uv", "pip"}
# O Ruff é governado pelo `required-version` do `ruff-base.toml`: o Dependabot também não o sobe.
PYTHON_EXTRA_IGNORES = ("ruff",)
DOCKER_IMAGES = {"python": "python", "node": "node", "ghcr.io/pnpm/pnpm": "pnpm"}
REQUIREMENT = re.compile(r"^\s*([A-Za-z0-9_.-]+)(\[[^\]]*\])?\s*(.*)$")
USES = re.compile(r"^\s*-?\s*uses:\s*['\"]?([^\s'\"#]+)")
UVX_PRE_COMMIT = re.compile(r"pre-commit@([0-9][0-9.]*)")
LITERAL_RUNTIME = re.compile(r"^\s*(node-version|python-version):\s*['\"]?\d")
FROM_LINE = re.compile(r"^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)", re.IGNORECASE)
ARG_LINE = re.compile(r"^\s*ARG\s+(\w+)=(\S+)", re.IGNORECASE)


@dataclass(frozen=True)
class Table:
    """A tabela de versões, já lida."""

    runtimes: dict[str, str]
    npm: dict[str, str]
    python: dict[str, str]
    pre_commit_version: str
    pre_commit_repos: dict[str, str]
    actions: dict[str, dict[str, str]]
    release_age_days: int

    @classmethod
    def load(cls, path: Path = TABLE) -> "Table":
        data = tomllib.loads(path.read_text(encoding="utf-8"))
        pre_commit = data["pre-commit"]
        return cls(
            runtimes=data["runtimes"],
            npm=data["npm"],
            python=data["python"],
            pre_commit_version=pre_commit["version"],
            pre_commit_repos=pre_commit["repos"],
            actions=data["actions"],
            release_age_days=data["supply-chain"]["minimum-release-age-days"],
        )

    @property
    def python_minor(self) -> str:
        return ".".join(self.runtimes["python"].split(".")[:2])


def project_files(root: Path, excludes: list[str]) -> list[PurePosixPath]:
    """Arquivos que o git conhece (versionados e novos), sem os ignorados nem os excluídos."""
    out = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=root,
        capture_output=True,
        check=True,
    ).stdout.decode()
    paths = sorted({PurePosixPath(p) for p in out.split("\0") if p})
    return [
        p
        for p in paths
        if (root / p).is_file() and not any(fnmatch.fnmatch(str(p), g) for g in excludes)
    ]


def read_yaml(path: Path) -> Any:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def check_pnpm_workspace(root: Path, ws: PurePosixPath, files: list[PurePosixPath], t: Table) -> list[str]:
    """Raiz de um workspace pnpm: gerenciador, Node, trava de idade e o `catalog`."""
    errors: list[str] = []
    base = ws.parent
    manifest_path = base / "package.json"
    if not (root / manifest_path).is_file():
        return [f"{ws}: workspace sem package.json ao lado"]
    manifest = json.loads((root / manifest_path).read_text(encoding="utf-8"))

    pm = str(manifest.get("packageManager", ""))
    if pm.split("+")[0] != f"pnpm@{t.runtimes['pnpm']}":
        errors.append(f"{manifest_path}: packageManager deve ser pnpm@{t.runtimes['pnpm']} (está {pm or 'ausente'})")

    runtime = (manifest.get("devEngines") or {}).get("runtime")
    runtimes = runtime if isinstance(runtime, list) else [runtime] if runtime else []
    node = next((r for r in runtimes if isinstance(r, dict) and r.get("name") == "node"), None)
    if not node or node.get("version") != t.runtimes["node"]:
        found = node.get("version") if node else "ausente"
        errors.append(f"{manifest_path}: devEngines.runtime node deve ser {t.runtimes['node']} (está {found})")

    workspace = read_yaml(root / ws)
    minutes = t.release_age_days * 1440
    if workspace.get("minimumReleaseAge") != minutes:
        errors.append(
            f"{ws}: minimumReleaseAge deve ser {minutes} ({t.release_age_days} dias; está "
            f"{workspace.get('minimumReleaseAge', 'ausente')})"
        )
    if workspace.get("minimumReleaseAgeStrict") is False:
        errors.append(f"{ws}: minimumReleaseAgeStrict: false desliga o modo estrito; remova a linha")

    catalog = workspace.get("catalog") or {}
    used: set[str] = set()
    for p in files:
        if p.name != "package.json" or not _inside(p, base):
            continue
        pkg = json.loads((root / p).read_text(encoding="utf-8"))
        for field in DEP_FIELDS:
            for name, spec in (pkg.get(field) or {}).items():
                if name not in t.npm:
                    continue
                used.add(name)
                if spec not in ("catalog:", "catalog:default"):
                    errors.append(f"{p}: {field}.{name} deve ser `catalog:` (está {spec!r})")
    for name in sorted(used):
        if str(catalog.get(name)) != t.npm[name]:
            errors.append(f"{ws}: catalog.{name} deve ser {t.npm[name]} (está {catalog.get(name, 'ausente')})")
    return errors


def _inside(path: PurePosixPath, base: PurePosixPath) -> bool:
    return base == PurePosixPath(".") or base in path.parents


def check_pyproject(root: Path, path: PurePosixPath, t: Table) -> list[str]:
    """Pacote Python: Python, uv e os pins exatos das ferramentas de teste e tipo."""
    data = tomllib.loads((root / path).read_text(encoding="utf-8"))
    project = data.get("project")
    if not project:
        return []
    errors: list[str] = []
    want_python = f"=={t.python_minor}.*"
    if project.get("requires-python") != want_python:
        errors.append(f"{path}: requires-python deve ser {want_python!r} (está {project.get('requires-python')!r})")
    uv = (data.get("tool") or {}).get("uv") or {}
    want_uv = f"=={t.runtimes['uv']}"
    if uv.get("required-version") != want_uv:
        errors.append(f"{path}: [tool.uv] required-version deve ser {want_uv!r} (está {uv.get('required-version')!r})")

    requirements = list(project.get("dependencies") or [])
    for group in (project.get("optional-dependencies") or {}).values():
        requirements += group
    for group in (data.get("dependency-groups") or {}).values():
        requirements += [r for r in group if isinstance(r, str)]
    for req in requirements:
        match = REQUIREMENT.match(req)
        if not match:
            continue
        name = match.group(1).lower().replace("_", "-")
        if name in t.python and match.group(3).replace(" ", "") != f"=={t.python[name]}":
            errors.append(f"{path}: {name} deve ser =={t.python[name]} (está {req!r})")

    version_file = path.parent / ".python-version"
    current = (root / version_file).read_text(encoding="utf-8").strip() if (root / version_file).is_file() else None
    if current != t.runtimes["python"]:
        errors.append(f"{version_file}: deve conter {t.runtimes['python']} (está {current or 'ausente'})")
    return errors


def check_requirements(root: Path, path: PurePosixPath, t: Table) -> list[str]:
    """`requirements*.txt`: ferramenta governada listada ali também fica no pin da tabela."""
    errors: list[str] = []
    for line in (root / path).read_text(encoding="utf-8").splitlines():
        match = REQUIREMENT.match(line.split("#")[0])
        if not match or not match.group(1):
            continue
        name = match.group(1).lower().replace("_", "-")
        if name in t.python and match.group(3).replace(" ", "") != f"=={t.python[name]}":
            errors.append(f"{path}: {name} deve ser =={t.python[name]} (está {line.strip()!r})")
    return errors


def check_pre_commit(root: Path, path: PurePosixPath, t: Table) -> list[str]:
    """Hooks remotos permitidos, cada um no `rev` da tabela, e o Python dos hooks."""
    config = read_yaml(root / path)
    errors: list[str] = []
    for repo in config.get("repos") or []:
        url = repo.get("repo")
        if url in ("local", "meta", LINT_CONFIGS_REPO):
            continue
        if url not in t.pre_commit_repos:
            errors.append(f"{path}: hook remoto {url} fora da tabela de versões (lint-configs)")
        elif repo.get("rev") != t.pre_commit_repos[url]:
            errors.append(f"{path}: {url} deve estar no rev {t.pre_commit_repos[url]} (está {repo.get('rev')})")
    languages = config.get("default_language_version") or {}
    if "node" in languages:
        errors.append(f"{path}: default_language_version.node sai (os hooks usam o Node do devEngines)")
    if "python" in languages and languages["python"] != f"python{t.python_minor}":
        errors.append(f"{path}: default_language_version.python deve ser python{t.python_minor} (está {languages['python']})")
    return errors


def check_workflow(root: Path, path: PurePosixPath, t: Table) -> list[str]:
    """Actions só da tabela e fixadas no SHA dela; runtime nunca escrito como número no YAML."""
    errors: list[str] = []
    for number, line in enumerate((root / path).read_text(encoding="utf-8").splitlines(), 1):
        where = f"{path}:{number}"
        uses = USES.match(line)
        if uses and not uses.group(1).startswith(("./", "docker://")):
            action, _, ref = uses.group(1).partition("@")
            key = "/".join(action.split("/")[:2])
            pinned = t.actions.get(key)
            if pinned is None:
                errors.append(f"{where}: action {key} fora da tabela de versões (lint-configs)")
            elif ref != pinned["sha"]:
                errors.append(f"{where}: {key} deve ser @{pinned['sha']} # {pinned['version']} (está @{ref})")
        for found in UVX_PRE_COMMIT.findall(line):
            if found != t.pre_commit_version:
                errors.append(f"{where}: pre-commit@{found} deve ser pre-commit@{t.pre_commit_version}")
        if LITERAL_RUNTIME.match(line):
            errors.append(
                f"{where}: versão de runtime escrita no workflow; o Node vem do devEngines (pnpm/setup) "
                "e o Python do .python-version (uv)"
            )
    return errors


def check_dependabot(root: Path, path: PurePosixPath, t: Table) -> list[str]:
    """Cooldown igual à trava do pnpm e as ferramentas governadas fora do robô."""
    errors: list[str] = []
    governed = {
        "npm": set(t.npm),
        "python": set(t.python) | set(PYTHON_EXTRA_IGNORES),
        "github-actions": set(t.actions),
        "docker": set(DOCKER_IMAGES),
    }
    for update in read_yaml(root / path).get("updates") or []:
        ecosystem = update.get("package-ecosystem")
        label = f"{path}: {ecosystem} em {update.get('directory') or update.get('directories')}"
        days = (update.get("cooldown") or {}).get("default-days")
        if days != t.release_age_days:
            errors.append(f"{label}: cooldown.default-days deve ser {t.release_age_days} (está {days})")
        kind = "npm" if ecosystem in NPM_ECOSYSTEMS else "python" if ecosystem in PYTHON_ECOSYSTEMS else ecosystem
        ignored = {i.get("dependency-name") for i in update.get("ignore") or []}
        missing = sorted(governed.get(kind, set()) - ignored)
        if missing:
            errors.append(f"{label}: ignore deve listar as ferramentas da tabela: faltam {', '.join(missing)}")
    return errors


def check_dockerfile(root: Path, path: PurePosixPath, t: Table) -> list[str]:
    """Imagem base de Python, Node e pnpm na versão exata da tabela."""
    errors: list[str] = []
    args: dict[str, str] = {}
    for number, line in enumerate((root / path).read_text(encoding="utf-8").splitlines(), 1):
        if arg := ARG_LINE.match(line):
            args[arg.group(1)] = arg.group(2)
            continue
        found = FROM_LINE.match(line)
        if not found:
            continue
        image, _, tag = found.group(1).partition(":")
        runtime = DOCKER_IMAGES.get(image)
        if runtime is None:
            continue
        tag = re.sub(r"\$\{?(\w+)\}?", lambda m: args.get(m.group(1), m.group(0)), tag.split("@")[0])
        want = t.runtimes[runtime]
        if tag != want and not tag.startswith(f"{want}-"):
            errors.append(f"{path}:{number}: {image} deve estar na versão {want} (está {tag or 'sem tag'})")
    return errors


def check(root: Path, excludes: list[str], t: Table) -> list[str]:
    files = project_files(root, excludes)
    errors: list[str] = []
    for p in files:
        if p.name == "pnpm-workspace.yaml":
            errors += check_pnpm_workspace(root, p, files, t)
        elif p.name == "pyproject.toml":
            errors += check_pyproject(root, p, t)
        elif p.name.startswith("requirements") and p.suffix == ".txt":
            errors += check_requirements(root, p, t)
        elif str(p) == ".pre-commit-config.yaml":
            errors += check_pre_commit(root, p, t)
        elif str(p).startswith(".github/workflows/") and p.suffix in (".yml", ".yaml"):
            errors += check_workflow(root, p, t)
        elif str(p).startswith(".github/actions/") and p.name in ("action.yml", "action.yaml"):
            errors += check_workflow(root, p, t)
        elif str(p) in (".github/dependabot.yml", ".github/dependabot.yaml"):
            errors += check_dependabot(root, p, t)
        elif p.name.startswith("Dockerfile"):
            errors += check_dockerfile(root, p, t)
    if not any(str(p) in (".github/dependabot.yml", ".github/dependabot.yaml") for p in files):
        errors.append(".github/dependabot.yml: ausente (todo projeto tem o Dependabot, com o cooldown da tabela)")
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exclude", action="append", default=[], help="glob de caminho a ignorar")
    args = parser.parse_args(argv)
    errors = check(Path.cwd(), args.exclude, Table.load())
    for error in errors:
        print(error)
    if errors:
        print(f"\nversions: {len(errors)} divergência(s) da tabela do lint-configs (versions/versions.toml).")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
