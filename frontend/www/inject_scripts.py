"""
inject_scripts.py — Injecte les balises <script> dans toutes les pages HTML.
"""
import os
import re

PAGES_DIR = os.path.join(os.path.dirname(__file__), "pages")
JS_DIR = "../js"

COMMON_SCRIPTS = ["config-boot.js", "api.js", "core.js", "i18n.js", "pages-generiques.js"]

VENDOR_SCRIPTS = {
    "cartographie.html": ["vendor/leaflet/leaflet.js"],
}

ANALYTICS_PAGES = {
    "dashboard-entomo.html",
    "dashboard-entomo-region5.html",
    "dashboard-rapports-oms.html",
    "dashboard-utilisateurs.html",
    "dashboard-sync-dhis2.html",
    "analyse-donnees.html",
}

ANALYTICS_SCRIPTS = [
    "vendor/chart.js/chart.umd.min.js",
    "vendor/leaflet/leaflet.js",
    "utils/analytics-charts.js",
    "utils/analytics-maps.js",
]

EXTRA_UTILS = {
    "nouvelle-capture.html": ["utils/audio-recorder.js"],
}

PAGE_SCRIPTS = {
    "404.html": ["404.js"],
    "aide.html": ["aide.js"],
    "alertes.html": ["alertes.js"],
    "analyse-donnees.html": ["analyse-donnees.js"],
    "assistant.html": ["assistant.js"],
    "audit-logs.html": ["audit-logs.js"],
    "campagnes.html": ["campagnes.js"],
    "cartographie.html": ["cartographie.js"],
    "catalogue-modeles.html": ["catalogue-modeles.js"],
    "centre-application.html": ["centre-application.js"],
    "config-dhis2.html": ["config-dhis2.js"],
    "config-indicateurs.html": ["config-indicateurs.js"],
    "config-modeles-risque.html": ["config-modeles-risque.js"],
    "dashboard-entomo.html": ["dashboard-entomo.js"],
    "dashboard-entomo-region5.html": ["dashboard-entomo-region5.js"],
    "dashboard-pipelines-1.html": ["dashboard-pipelines-1.js"],
    "dashboard-pipelines-4.html": ["dashboard-pipelines-4.js"],
    "dashboard-rapports-oms.html": ["dashboard-rapports-oms.js"],
    "dashboard-sync-dhis2.html": ["dashboard-sync-dhis2.js"],
    "dashboard-utilisateurs.html": ["dashboard-utilisateurs.js"],
    "details-capture.html": ["details-capture.js"],
    "details-dataset.html": ["details-dataset.js"],
    "details-gite.html": ["details-gite.js"],
    "details-modele.html": ["details-modele.js"],
    "details-pipeline.html": ["details-pipeline.js"],
    "details-rapport.html": ["details-rapport.js"],
    "details-site.html": ["details-site.js"],
    "generateur-rapports.html": ["generateur-rapports.js"],
    "gestion-captures.html": ["gestion-captures.js"],
    "gestion-datasets.html": ["gestion-datasets.js"],
    "gestion-hors-ligne.html": ["gestion-hors-ligne.js"],
    "gestion-modeles-visuels.html": ["gestion-modeles-visuels.js"],
    "gestion-roles.html": ["gestion-roles.js"],
    "gestion-sites.html": ["gestion-sites.js"],
    "gestion-utilisateurs.html": ["gestion-utilisateurs.js"],
    "import-donnees.html": ["import-donnees.js"],
    "interventions.html": ["interventions.js"],
    "param-langues.html": ["param-langues.js"],
    "param-sync.html": ["param-sync.js"],
    "parametres-compte.html": ["parametres-compte.js"],
    "profil.html": ["profil.js"],
    "statut-sync.html": ["statut-sync.js"],
    "surveillance-audio.html": [
        "utils/download.js",
        "utils/audio-waveform.js",
        "surveillance-audio.js",
    ],
    "validation-dhis2.html": ["validation-dhis2.js"],
}

CREATION_PAGES = {
    "nouveau-dataset.html",
    "nouveau-site.html",
    "nouvel-utilisateur.html",
    "nouvelle-campagne.html",
    "nouvelle-capture.html",
    "nouvelle-intervention.html",
}

INLINE_JS_RE = re.compile(
    r"\s*<script src=\"\.\./js/(?:utils/)?[\w-]+\.js\"></script>",
    re.MULTILINE,
)


def build_script_tags(page_name: str) -> str:
    scripts = list(COMMON_SCRIPTS)
    if page_name in ANALYTICS_PAGES:
        scripts.extend(ANALYTICS_SCRIPTS)
    elif page_name in VENDOR_SCRIPTS:
        scripts.extend(VENDOR_SCRIPTS[page_name])
    if page_name in EXTRA_UTILS:
        scripts.extend(EXTRA_UTILS[page_name])
    if page_name in PAGE_SCRIPTS:
        scripts.extend(PAGE_SCRIPTS[page_name])
    if page_name in CREATION_PAGES:
        scripts.append("creation-entite.js")
    lines = []
    for s in scripts:
        if s.startswith("vendor/"):
            lines.append(f"    <script src=\"../{s}\"></script>")
        else:
            lines.append(f"    <script src=\"{JS_DIR}/{s}\"></script>")
    return "\n".join(lines)


def strip_managed_scripts(content: str) -> str:
    content = re.sub(
        r"\n\s*<!-- Ento-App Scripts -->.*?<!-- /Ento-App Scripts -->",
        "",
        content,
        flags=re.DOTALL,
    )
  # Retire les scripts JS gérés (sauf tailwind-shim)
    content = INLINE_JS_RE.sub("", content)
    return content


def inject(html_path: str, page_name: str) -> None:
    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()

    content = strip_managed_scripts(content)
    block = f"\n    <!-- Ento-App Scripts -->\n{build_script_tags(page_name)}\n    <!-- /Ento-App Scripts -->"

    if "</body>" in content:
        content = content.replace("</body>", f"{block}\n</body>")
    else:
        content += block

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  ✓ {page_name}")


if __name__ == "__main__":
    print("Injection des scripts dans les pages HTML...\n")
    for fname in sorted(os.listdir(PAGES_DIR)):
        if fname.endswith(".html"):
            inject(os.path.join(PAGES_DIR, fname), fname)

    index_path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            content = f.read()
        content = strip_managed_scripts(content.replace("./js/", "../js/"))
        block = (
            "\n    <!-- Ento-App Scripts -->\n"
            "    <script src=\"./js/config-boot.js\"></script>\n"
            "    <script src=\"./js/api.js\"></script>\n"
            "    <script src=\"./js/core.js\"></script>\n"
            "    <script src=\"./js/i18n.js\"></script>\n"
            "    <!-- /Ento-App Scripts -->"
        )
        if "</body>" in content:
            content = content.replace("</body>", f"{block}\n</body>")
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("  ✓ index.html")

    login_path = os.path.join(os.path.dirname(__file__), "login.html")
    if os.path.exists(login_path):
        with open(login_path, "r", encoding="utf-8") as f:
            content = f.read()
        content = strip_managed_scripts(content)
        login_block = (
            "\n    <!-- Ento-App Scripts -->\n"
            "    <script src=\"js/config-boot.js\"></script>\n"
            "    <script src=\"js/api.js\"></script>\n"
            "    <script src=\"js/core.js\"></script>\n"
            "    <!-- /Ento-App Scripts -->"
        )
        if "config-boot.js" not in content:
            login_marker = "document.getElementById('login-form')"
            marker_idx = content.find(login_marker)
            if marker_idx != -1:
                script_start = content.rfind("<script>", 0, marker_idx)
                if script_start != -1:
                    content = content[:script_start] + login_block + "\n    " + content[script_start:]
                else:
                    content = content.replace("</body>", f"{login_block}\n</body>")
            elif "</body>" in content:
                content = content.replace("</body>", f"{login_block}\n</body>")
        with open(login_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("  ✓ login.html")

    print("\nTerminé !")
