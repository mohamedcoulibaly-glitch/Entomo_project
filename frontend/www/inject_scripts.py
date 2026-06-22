"""
inject_scripts.py
Injecte les balises <script> dans toutes les pages HTML du dossier www/pages/
"""
import os, re

PAGES_DIR = os.path.join(os.path.dirname(__file__), 'pages')
JS_DIR    = '../js'   # chemin relatif depuis pages/

# Mappage page -> fichiers JS spécifiques (en plus de core.js + pages-generiques.js)
PAGE_SCRIPTS = {
    'gestion-utilisateurs.html' : ['gestion-utilisateurs.js'],
    'dashboard-entomo.html'     : ['dashboard-entomo.js'],
    'dashboard-entomo-region5.html': ['dashboard-entomo.js'],
    'gestion-captures.html'     : ['gestion-captures.js'],
    'gestion-sites.html'        : ['gestion-sites.js'],
    'gestion-roles.html'        : ['gestion-roles.js'],
    'dashboard-pipelines-1.html': ['dashboard-pipelines.js'],
    'dashboard-pipelines-4.html': ['dashboard-pipelines.js'],
    'config-dhis2.html'         : ['config-dhis2.js'],
    'generateur-rapports.html'  : ['generateur-rapports.js'],
    'catalogue-modeles.html'    : ['catalogue-modeles.js'],
    'gestion-datasets.html'     : ['gestion-datasets.js'],
    'surveillance-audio.html'   : ['surveillance-audio.js'],
    'analyse-donnees.html'      : ['analyse-donnees.js'],
    'gestion-modeles-visuels.html': ['gestion-modeles-visuels.js'],
    'gestion-hors-ligne.html'   : ['gestion-hors-ligne.js'],
    'validation-dhis2.html'     : ['validation-dhis2.js'],
    'statut-sync.html'          : ['statut-sync.js'],
    'param-sync.html'           : ['param-sync.js'],
    'param-langues.html'        : ['param-langues.js'],
    'config-modeles-risque.html': ['config-modeles-risque.js'],
    'dashboard-utilisateurs.html': ['dashboard-utilisateurs.js'],
    'dashboard-rapports-oms.html': ['dashboard-rapports-oms.js'],
    'dashboard-sync-dhis2.html' : ['dashboard-sync-dhis2.js'],
}

COMMON_SCRIPTS = ['api.js', 'core.js', 'pages-generiques.js']

def build_script_tags(page_name):
    scripts = COMMON_SCRIPTS[:]
    if page_name in PAGE_SCRIPTS:
        scripts += PAGE_SCRIPTS[page_name]
    tags = [f'    <script src="{JS_DIR}/{s}"></script>' for s in scripts]
    return '\n'.join(tags)

def inject(html_path, page_name):
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Supprimer les injections existantes pour éviter les doublons
    content = re.sub(
        r'\n\s*<!-- Ento-App Scripts -->.*?<!-- /Ento-App Scripts -->',
        '', content, flags=re.DOTALL
    )

    # Aussi supprimer les scripts déjà injectés individuellement
    content = re.sub(
        r'\n\s*<script src="\.\./js/(api|core|pages-generiques|gestion-utilisateurs|dashboard-entomo|gestion-captures|gestion-sites|gestion-roles|dashboard-pipelines|config-dhis2|generateur-rapports|catalogue-modeles|gestion-datasets|surveillance-audio|analyse-donnees|gestion-modeles-visuels|gestion-hors-ligne|validation-dhis2|statut-sync|param-sync|param-langues|config-modeles-risque|dashboard-utilisateurs|dashboard-rapports-oms|dashboard-sync-dhis2)\.js"></script>',
        '', content
    )

    tags = build_script_tags(page_name)
    block = f'\n    <!-- Ento-App Scripts -->\n{tags}\n    <!-- /Ento-App Scripts -->'

    if '</body>' in content:
        content = content.replace('</body>', f'{block}\n</body>')
    else:
        content += block

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'  ✓ {page_name}')

if __name__ == '__main__':
    print('Injection des scripts dans les pages HTML...\n')
    for fname in os.listdir(PAGES_DIR):
        if fname.endswith('.html'):
            inject(os.path.join(PAGES_DIR, fname), fname)

    # Injecter aussi dans index.html (un niveau au-dessus)
    index_path = os.path.join(os.path.dirname(__file__), 'index.html')
    if os.path.exists(index_path):
        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Pour index.html, le chemin JS est ./js/
        content = re.sub(
            r'\n\s*<!-- Ento-App Scripts -->.*?<!-- /Ento-App Scripts -->',
            '', content, flags=re.DOTALL
        )
        block = '\n    <!-- Ento-App Scripts -->\n    <script src="./js/api.js"></script>\n    <script src="./js/core.js"></script>\n    <!-- /Ento-App Scripts -->'
        if '</body>' in content:
            content = content.replace('</body>', f'{block}\n</body>')
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('  ✓ index.html')

    print('\nTerminé !')
