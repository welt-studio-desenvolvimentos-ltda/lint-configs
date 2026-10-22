"""Testes do hook `versions`: um projeto alinhado passa, e cada divergência reprova sozinha.

Rodar: `uvx --with pyyaml==6.0.3 pytest@9.1.1 versions` na raiz do lint-configs.
"""

import json
import subprocess
from pathlib import Path

import pytest

from versions.check import DOCKER_IMAGES, Table, check, dependabot_image_name

T = Table.load()
MINOR = T.python_minor


def aligned_files() -> dict[str, str]:
    """Um projeto com frontend pnpm, pacote Python, CI, Dependabot e Docker, tudo na tabela."""
    checkout = T.actions["actions/checkout"]
    setup = T.actions["pnpm/setup"]
    npm_ignores = "".join(f"      - dependency-name: '{n}'\n" for n in T.npm)
    py_ignores = "".join(f"      - dependency-name: '{n}'\n" for n in [*T.python, "ruff"])
    action_ignores = "".join(f"      - dependency-name: '{n}'\n" for n in T.actions)
    image_ignores = "".join(f"      - dependency-name: '{dependabot_image_name(n)}'\n" for n in DOCKER_IMAGES)
    repos = "".join(f"  - repo: {url}\n    rev: {rev}\n    hooks: [{{id: x}}]\n" for url, rev in T.pre_commit_repos.items())
    return {
        "package.json": json.dumps(
            {
                "packageManager": f"pnpm@{T.runtimes['pnpm']}",
                "devEngines": {"runtime": {"name": "node", "version": T.runtimes["node"], "onFail": "download"}},
                "devDependencies": {"prettier": "catalog:", "react": "^19.3.0"},
            }
        ),
        "apps/web/package.json": json.dumps({"devDependencies": {"vite": "catalog:", "typescript": "catalog:"}}),
        "pnpm-workspace.yaml": (
            "packages: ['apps/*']\n"
            f"minimumReleaseAge: {T.release_age_days * 1440}\n"
            "catalog:\n"
            f"  prettier: {T.npm['prettier']}\n  vite: {T.npm['vite']}\n  typescript: {T.npm['typescript']}\n"
        ),
        "api/pyproject.toml": (
            "[project]\nname = 'api'\nversion = '0'\n"
            f"requires-python = '=={MINOR}.*'\n"
            "[dependency-groups]\n"
            f"dev = ['pytest=={T.python['pytest']}', 'pyright=={T.python['pyright']}', 'httpx>=0.27']\n"
            f"[tool.uv]\nrequired-version = '=={T.runtimes['uv']}'\n"
        ),
        "api/.python-version": T.runtimes["python"] + "\n",
        "api/Dockerfile": (
            f"ARG PY={T.runtimes['python']}\nFROM python:${{PY}}-slim AS base\n"
            f"COPY --from=ghcr.io/astral-sh/uv:{T.runtimes['uv']} /uv /bin/\nFROM base AS prod\n"
        ),
        ".pre-commit-config.yaml": (
            "repos:\n"
            "  - repo: https://github.com/welt-studio/lint-configs\n    rev: versions-v9\n    hooks: [{id: versions}]\n"
            f"{repos}"
            "  - repo: local\n    hooks: [{id: y}]\n"
            f"default_language_version:\n  python: python{MINOR}\n"
        ),
        ".github/workflows/ci.yml": (
            "jobs:\n  a:\n    steps:\n"
            f"      - uses: actions/checkout@{checkout['sha']} # {checkout['version']}\n"
            f"      - uses: pnpm/setup@{setup['sha']}\n"
            "      - uses: ./.github/actions/local\n"
            f"      - run: uvx pre-commit@{T.pre_commit_version} run --all-files\n"
        ),
        ".github/dependabot.yml": (
            "version: 2\nupdates:\n"
            f"  - package-ecosystem: npm\n    directory: /\n    cooldown: {{default-days: {T.release_age_days}}}\n    ignore:\n{npm_ignores}"
            f"  - package-ecosystem: uv\n    directory: /api\n    cooldown: {{default-days: {T.release_age_days}}}\n    ignore:\n{py_ignores}"
            f"  - package-ecosystem: github-actions\n    directory: /\n    cooldown: {{default-days: {T.release_age_days}}}\n    ignore:\n{action_ignores}"
            f"  - package-ecosystem: docker\n    directory: /api\n    cooldown: {{default-days: {T.release_age_days}}}\n    ignore:\n{image_ignores}"
        ),
        "_reference/old/package.json": json.dumps({"devDependencies": {"vite": "^7.1.9"}}),
    }


def make_project(tmp_path: Path, changes: dict[str, str | None] | None = None) -> Path:
    files = aligned_files() | (changes or {})
    for rel, content in files.items():
        if content is None:
            continue
        target = tmp_path / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    return tmp_path


def run(tmp_path: Path, changes: dict[str, str | None] | None = None) -> list[str]:
    return check(make_project(tmp_path, changes), ["_reference/**"], T)


def test_aligned_project_passes(tmp_path: Path) -> None:
    assert run(tmp_path) == []


def test_excluded_reference_folder_is_not_checked(tmp_path: Path) -> None:
    # A pasta vendorizada tem `vite: ^7.1.9`; só o --exclude a mantém fora.
    errors = check(make_project(tmp_path), [], T)
    assert any("_reference/old/package.json" in e for e in errors)


@pytest.mark.parametrize(
    ("changes", "expected"),
    [
        pytest.param(
            {"pnpm-workspace.yaml": aligned_files()["pnpm-workspace.yaml"].replace(T.npm["vite"], "8.0.0")},
            "catalog.vite deve ser",
            id="catalog-version",
        ),
        pytest.param(
            {"apps/web/package.json": json.dumps({"devDependencies": {"vite": "^8.3.0"}})},
            "devDependencies.vite deve ser `catalog:`",
            id="caret-instead-of-catalog",
        ),
        pytest.param(
            {"package.json": aligned_files()["package.json"].replace(T.runtimes["pnpm"], "11.9.0")},
            "packageManager deve ser",
            id="pnpm-version",
        ),
        pytest.param(
            {"package.json": aligned_files()["package.json"].replace(T.runtimes["node"], "24.0.0")},
            "devEngines.runtime node",
            id="node-version",
        ),
        pytest.param(
            {"pnpm-workspace.yaml": aligned_files()["pnpm-workspace.yaml"].replace("10080", "4320")},
            "minimumReleaseAge deve ser",
            id="release-age",
        ),
        pytest.param(
            {"api/pyproject.toml": aligned_files()["api/pyproject.toml"].replace(f"=={T.python['pytest']}", ">=8.3")},
            "pytest deve ser",
            id="python-pin",
        ),
        pytest.param(
            {"api/pyproject.toml": aligned_files()["api/pyproject.toml"].replace(f"=={MINOR}.*", ">=3.14")},
            "requires-python",
            id="requires-python",
        ),
        pytest.param({"api/.python-version": None}, ".python-version: deve conter", id="python-version-file"),
        pytest.param(
            {"api/Dockerfile": "FROM python:3.14-slim\n"},
            "python deve estar na versão",
            id="docker-image",
        ),
        pytest.param(
            {"api/Dockerfile": "FROM python:3.14.8-slim\nCOPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/\n"},
            "ghcr.io/astral-sh/uv deve estar na versão",
            id="uv-image-latest",
        ),
        pytest.param(
            {
                ".github/dependabot.yml": aligned_files()[".github/dependabot.yml"].replace(
                    "      - dependency-name: 'pnpm/pnpm'\n", "      - dependency-name: 'ghcr.io/pnpm/pnpm'\n"
                )
            },
            "faltam pnpm/pnpm",
            id="dependabot-image-name-without-registry",
        ),
        pytest.param(
            {
                ".github/dependabot.yml": aligned_files()[".github/dependabot.yml"].replace(
                    "      - dependency-name: 'pnpm/pnpm'\n",
                    "      - dependency-name: 'pnpm/pnpm'\n      - dependency-name: 'ghcr.io/pnpm/pnpm'\n",
                )
            },
            "ignore ghcr.io/pnpm/pnpm não casa com nada",
            id="dependabot-image-name-with-registry-left-over",
        ),
        pytest.param(
            {".pre-commit-config.yaml": aligned_files()[".pre-commit-config.yaml"].replace("v6.0.0", "v5.0.0")},
            "pre-commit-hooks deve estar no rev",
            id="hook-rev",
        ),
        pytest.param(
            {
                ".pre-commit-config.yaml": aligned_files()[".pre-commit-config.yaml"].replace(
                    "  - repo: local\n",
                    "  - repo: https://github.com/Yelp/detect-secrets\n    rev: v1.5.0\n    hooks: [{id: d}]\n"
                    "  - repo: local\n",
                )
            },
            "detect-secrets fora da tabela",
            id="unknown-hook-repo",
        ),
        pytest.param(
            {".pre-commit-config.yaml": aligned_files()[".pre-commit-config.yaml"] + "  node: 22.11.0\n"},
            "default_language_version.node sai",
            id="pre-commit-node",
        ),
        pytest.param(
            {
                ".github/workflows/ci.yml": aligned_files()[".github/workflows/ci.yml"].replace(
                    T.actions["actions/checkout"]["sha"], "v6"
                )
            },
            "actions/checkout deve ser @",
            id="action-by-tag",
        ),
        pytest.param(
            {".github/workflows/ci.yml": "steps:\n  - uses: actions/setup-node@abc\n"},
            "actions/setup-node fora da tabela",
            id="unknown-action",
        ),
        pytest.param(
            {".github/workflows/ci.yml": "steps:\n  - with:\n      node-version: 24\n"},
            "versão de runtime escrita no workflow",
            id="literal-node-version",
        ),
        pytest.param(
            {".github/workflows/ci.yml": "steps:\n  - run: uvx pre-commit@4.6.0 run\n"},
            "pre-commit@4.6.0 deve ser",
            id="pre-commit-version",
        ),
        pytest.param(
            {".github/dependabot.yml": aligned_files()[".github/dependabot.yml"].replace("default-days: 7", "default-days: 3", 1)},
            "cooldown.default-days deve ser",
            id="dependabot-cooldown",
        ),
        pytest.param(
            {".github/dependabot.yml": aligned_files()[".github/dependabot.yml"].replace("      - dependency-name: 'vitest'\n", "")},
            "faltam vitest",
            id="dependabot-ignore",
        ),
        pytest.param({".github/dependabot.yml": None}, "dependabot.yml: ausente", id="dependabot-missing"),
        pytest.param(
            {"requirements-dev.txt": "pytest==8.4.2\nhttpx>=0.27\n"},
            "requirements-dev.txt: pytest deve ser",
            id="requirements-pin",
        ),
    ],
)
def test_each_divergence_fails(tmp_path: Path, changes: dict[str, str | None], expected: str) -> None:
    errors = run(tmp_path, changes)
    assert any(expected in e for e in errors), errors
