#!/usr/bin/env python3
"""Audit sécurité basique (OWASP) — secrets, permissions, configuration."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
FRONTEND_WWW = ROOT / "frontend" / "www"

SECRET_PATTERNS = [
    re.compile(r"password\s*=\s*['\"][^'\"]{3,}['\"]", re.I),
    re.compile(r"api[_-]?key\s*=\s*['\"][A-Za-z0-9_\-]{16,}['\"]", re.I),
    re.compile(r"BEGIN (RSA |OPENSSH )?PRIVATE KEY"),
]

IGNORED_DIRS = {".git", "node_modules", ".pytest_cache", "__pycache__", "venv", ".venv"}
IGNORED_FILES = {".env", ".env.example", "security_audit.py", "seed.py", "conftest.py"}


def iter_source_files():
    for base in (BACKEND, FRONTEND_WWW):
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            if any(part in IGNORED_DIRS for part in path.parts):
                continue
            if path.name in IGNORED_FILES:
                continue
            if path.suffix.lower() in {".py", ".js", ".html", ".json", ".yml", ".yaml", ".env"}:
                yield path


def scan_secrets() -> list[str]:
    findings = []
    for path in iter_source_files():
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for pattern in SECRET_PATTERNS:
            if pattern.search(text):
                findings.append(f"Secret potentiel dans {path.relative_to(ROOT)}")
                break
    return findings


def scan_env_example() -> list[str]:
    findings = []
    env_example = ROOT / ".env.example"
    if not env_example.is_file():
        findings.append(".env.example manquant à la racine du projet")
    gitignore = ROOT / ".gitignore"
    if gitignore.is_file():
        content = gitignore.read_text(encoding="utf-8")
        if ".env" not in content:
            findings.append(".gitignore ne contient pas .env")
    return findings


def scan_route_permissions() -> list[str]:
    findings = []
    route_file = BACKEND / "app" / "core" / "route_permissions.py"
    init_file = BACKEND / "app" / "api" / "v1" / "__init__.py"
    if not route_file.is_file() or not init_file.is_file():
        findings.append("Fichiers RBAC introuvables")
        return findings
    rules_text = route_file.read_text(encoding="utf-8")
    if "ROUTE_PERMISSION_RULES" not in rules_text:
        findings.append("ROUTE_PERMISSION_RULES absent")
    if "enforce_route_access" not in init_file.read_text(encoding="utf-8"):
        findings.append("enforce_route_access non branché sur le routeur API")
    return findings


def main() -> int:
    findings = []
    findings.extend(scan_secrets())
    findings.extend(scan_env_example())
    findings.extend(scan_route_permissions())

    if findings:
        print("AUDIT SÉCURITÉ — anomalies détectées:")
        for item in findings:
            print(f"  - {item}")
        return 1

    print("AUDIT SÉCURITÉ — OK (aucune anomalie critique détectée)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
