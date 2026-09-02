"""Registre central des permissions requises par route API."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

# None = route publique, "AUTH" = authentification sans permission spécifique
PUBLIC = None
AUTH_ONLY = "AUTH"


@dataclass(frozen=True)
class RoutePermissionRule:
    pattern: re.Pattern[str]
    methods: frozenset[str]
    permission: Optional[str]


def _rule(path: str, methods: set[str], permission: Optional[str]) -> RoutePermissionRule:
    return RoutePermissionRule(
        pattern=re.compile(path),
        methods=frozenset(methods),
        permission=permission,
    )


ROUTE_PERMISSION_RULES: tuple[RoutePermissionRule, ...] = (
    # Public
    _rule(r"^/api/v1/auth/login$", {"POST"}, PUBLIC),
    _rule(r"^/api/v1/reference/enrichi$", {"GET"}, PUBLIC),
    _rule(r"^/health$", {"GET"}, PUBLIC),
    _rule(r"^/health/live$", {"GET"}, PUBLIC),
    _rule(r"^/health/ready$", {"GET"}, PUBLIC),
    _rule(r"^/health/dhis2$", {"GET"}, PUBLIC),
    _rule(r"^/$", {"GET"}, PUBLIC),
    _rule(r"^/api/v1/reference/[^/]+$", {"GET"}, PUBLIC),
    _rule(r"^/api/v1/reference/[^/]+/[^/]+$", {"GET"}, PUBLIC),
    # Auth — profil utilisateur
    _rule(r"^/api/v1/auth/me$", {"GET", "PUT"}, AUTH_ONLY),
    _rule(r"^/api/v1/auth/me/password$", {"POST"}, AUTH_ONLY),
    _rule(r"^/api/v1/auth/check-session$", {"GET"}, AUTH_ONLY),
    _rule(r"^/api/v1/auth/me/stats$", {"GET"}, AUTH_ONLY),
    _rule(r"^/api/v1/auth/me/activity$", {"GET"}, AUTH_ONLY),
    _rule(r"^/api/v1/auth/me/preferences$", {"GET", "PUT"}, AUTH_ONLY),
    _rule(r"^/api/v1/auth/logout-all$", {"POST"}, AUTH_ONLY),
    # Captures
    _rule(r"^/api/v1/captures/?$", {"GET"}, "captures:voir"),
    _rule(r"^/api/v1/captures/?$", {"POST"}, "captures:creer"),
    _rule(r"^/api/v1/captures/export$", {"GET"}, "captures:exporter"),
    _rule(r"^/api/v1/captures/stats-audio$", {"GET"}, "captures:voir"),
    _rule(r"^/api/v1/captures/a-valider$", {"GET"}, "captures:valider"),
    _rule(r"^/api/v1/captures/\d+$", {"GET"}, "captures:voir"),
    _rule(r"^/api/v1/captures/\d+$", {"PUT"}, "captures:modifier"),
    _rule(r"^/api/v1/captures/\d+$", {"DELETE"}, "captures:supprimer"),
    _rule(r"^/api/v1/captures/\d+/analyser$", {"POST"}, "captures:modifier"),
    _rule(r"^/api/v1/captures/\d+/analyser-image$", {"POST"}, "captures:modifier"),
    _rule(r"^/api/v1/captures/\d+/valider$", {"POST"}, "captures:valider"),
    _rule(r"^/api/v1/captures/\d+/upload-image$", {"POST"}, "captures:modifier"),
    _rule(r"^/api/v1/captures/\d+/upload-audio$", {"POST"}, "captures:modifier"),
    # Sites
    _rule(r"^/api/v1/sites/?$", {"GET"}, "sites:voir"),
    _rule(r"^/api/v1/sites/?$", {"POST"}, "sites:creer"),
    _rule(r"^/api/v1/sites/\d+$", {"GET"}, "sites:voir"),
    _rule(r"^/api/v1/sites/\d+$", {"PUT"}, "sites:modifier"),
    _rule(r"^/api/v1/sites/\d+$", {"DELETE"}, "sites:supprimer"),
    _rule(r"^/api/v1/sites/\d+/activites$", {"GET", "POST"}, "sites:modifier"),
    # Users
    _rule(r"^/api/v1/users/?$", {"GET"}, "users:voir"),
    _rule(r"^/api/v1/users/?$", {"POST"}, "admin"),
    _rule(r"^/api/v1/users/\d+$", {"GET"}, "users:voir"),
    _rule(r"^/api/v1/users/\d+$", {"PUT"}, AUTH_ONLY),
    _rule(r"^/api/v1/users/\d+$", {"DELETE"}, "admin"),
    # Roles
    _rule(r"^/api/v1/roles", {"GET", "POST", "PUT", "DELETE"}, "roles:voir"),
    # Datasets
    _rule(r"^/api/v1/datasets", {"GET"}, "datasets:gestion"),
    _rule(r"^/api/v1/datasets", {"POST", "PUT", "DELETE"}, "datasets:gestion"),
    # Modèles ML
    _rule(r"^/api/v1/modeles", {"GET", "POST", "PUT", "DELETE"}, "modeles:gestion"),
    # DHIS2
    _rule(r"^/api/v1/dhis2/sync/capture/\d+$", {"POST"}, "dhis2:gestion"),
    _rule(r"^/api/v1/dhis2", {"GET", "POST", "PUT", "DELETE"}, "dhis2:gestion"),
    # Rapports
    _rule(r"^/api/v1/rapports", {"GET"}, "rapports:voir"),
    _rule(r"^/api/v1/rapports", {"POST", "PUT", "DELETE"}, "rapports:creer"),
    # Dashboard
    _rule(r"^/api/v1/dashboard", {"GET"}, "dashboard:voir"),
    # Indicateurs
    _rule(r"^/api/v1/indicateurs", {"GET", "POST", "PUT", "DELETE"}, "indicateurs:gestion"),
    # Langues
    _rule(r"^/api/v1/langues", {"GET", "POST", "PUT", "DELETE"}, "langues:gestion"),
    # Sync
    _rule(r"^/api/v1/sync", {"GET", "POST", "PUT", "DELETE"}, "sync:gestion"),
    # Interventions
    _rule(r"^/api/v1/interventions", {"GET", "POST", "PUT", "DELETE"}, "interventions:gestion"),
    # Notifications
    _rule(r"^/api/v1/notifications", {"GET", "POST"}, AUTH_ONLY),
    # Audit
    _rule(r"^/api/v1/audit", {"GET"}, "audit:voir"),
    # Campagnes
    _rule(r"^/api/v1/campagnes", {"GET", "POST", "PUT", "DELETE"}, "campagnes:gestion"),
    # Référence (écriture)
    _rule(r"^/api/v1/reference/?$", {"POST"}, "reference:gestion"),
    _rule(r"^/api/v1/reference/[^/]+/[^/]+$", {"PUT", "DELETE"}, "reference:gestion"),
    # Import
    _rule(r"^/api/v1/import", {"GET", "POST"}, "datasets:gestion"),
    # Cartographie
    _rule(r"^/api/v1/cartographie", {"GET"}, "sites:voir"),
    # Support
    _rule(r"^/api/v1/support", {"GET", "POST", "PUT"}, AUTH_ONLY),
    # Assistant
    _rule(r"^/api/v1/assistant", {"GET", "POST"}, "dashboard:voir"),
)


def resolve_route_permission(method: str, path: str) -> Optional[str]:
    """Retourne la permission requise, AUTH_ONLY, ou PUBLIC (None)."""
    normalized = path.rstrip("/") or "/"
    if normalized.endswith("/") and normalized != "/":
        normalized = normalized.rstrip("/")
    upper_method = method.upper()

    for rule in ROUTE_PERMISSION_RULES:
        if upper_method in rule.methods and rule.pattern.match(normalized):
            return rule.permission

    # Par défaut : authentification requise pour toute route API non listée
    if normalized.startswith("/api/v1/"):
        return AUTH_ONLY
    return PUBLIC
