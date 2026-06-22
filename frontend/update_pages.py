import os
from pathlib import Path

pages_dir = Path("www/pages")

sidebar_template = '''
        <!-- Sidebar -->
        <aside class="w-64 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark p-4 overflow-y-auto">
            <div class="flex items-center gap-3 mb-8">
                <div class="size-6 text-brand-primary">
                    <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <g clip-path="url(#clip0_6_543)">
                            <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor"></path>
                            <path clip-rule="evenodd" d="M7.24189 26.4066C7.31369 26.4411 7.64204 26.5637 8.52504 26.3738C9.59462 26.1438 11.0343 25.5311 12.7183 24.4963C14.7583 23.2426 17.0256 21.4503 19.238 19.238C21.4503 17.0256 23.2426 14.7583 24.4963 12.7183C25.5311 11.0343 26.1438 9.59463 26.3738 8.52504C26.5637 7.64204 26.4411 7.31369 26.4066 7.24189C26.345 7.21246 26.143 7.14535 25.6664 7.1918C24.9745 7.25925 23.9954 7.5498 22.7699 8.14278C20.3369 9.32007 17.3369 11.4915 14.4142 14.4142C11.4915 17.3369 9.32007 20.3369 8.14278 22.7699C7.5498 23.9954 7.25925 24.9745 7.1918 25.6664C7.14534 26.143 7.21246 26.345 7.24189 26.4066ZM29.9001 10.7285C29.4519 12.0322 28.7617 13.4172 27.9042 14.8126C26.465 17.1544 24.4686 19.6641 22.0664 22.0664C19.6641 24.4686 17.1544 26.465 14.8126 27.9042C13.4172 28.7617 12.0322 29.4519 10.7285 29.9001L21.5754 40.747C21.6001 40.7606 21.8995 40.931 22.8729 40.7217C23.9424 40.4916 25.3821 39.879 27.0661 38.8441C29.1062 37.5904 31.3734 35.7982 33.5858 33.5858C35.7982 31.3734 37.5904 29.1062 38.8441 27.0661C39.879 25.3821 40.4916 23.9425 40.7216 22.8729C40.931 21.8995 40.7606 21.6001 40.747 21.5754L29.9001 10.7285ZM29.2403 4.41187L43.5881 18.7597C44.9757 20.1473 44.9743 22.1235 44.6322 23.7139C44.2714 25.3919 43.4158 27.2666 42.252 29.1604C40.8128 31.5022 38.8165 34.012 36.4142 36.4142C34.012 38.8165 31.5022 40.8128 29.1604 42.252C27.2666 43.4158 25.3919 44.2714 23.7139 44.6322C22.1235 44.9743 20.1473 44.9757 18.7597 43.5881L4.41187 29.2403C3.29027 28.1187 3.08209 26.5973 3.21067 25.2783C3.34099 23.9415 3.8369 22.4852 4.54214 21.0277C5.96129 18.0948 8.43335 14.7382 11.5858 11.5858C14.7382 8.43335 18.0948 5.9613 21.0277 4.54214C22.4852 3.8369 23.9415 3.34099 25.2783 3.21067C26.5973 3.08209 28.1187 3.29028 29.2403 4.41187Z" fill="currentColor" fill-rule="evenodd"></path>
                        </g>
                        <defs><clipPath id="clip0_6_543"><rect fill="white" height="48" width="48"></rect></clipPath></defs>
                    </svg>
                </div>
                <div class="flex flex-col">
                    <h1 class="text-gray-900 dark:text-white text-base font-bold leading-normal">Ento-App Afrique</h1>
                    <p class="text-gray-500 dark:text-gray-400 text-xs font-normal leading-normal">Plateforme Complète</p>
                </div>
            </div>

            <nav class="flex flex-col gap-1 flex-1">
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tableaux de Bord</p>
                <a href="../index.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">home</span>
                    <span class="text-sm">Accueil</span>
                </a>
                <a href="dashboard-entomo.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">dashboard</span>
                    <span class="text-sm">Surveillance Entomologique</span>
                </a>
                <a href="dashboard-entomo-region5.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">location_on</span>
                    <span class="text-sm">Région Médicale 5</span>
                </a>
                <a href="dashboard-pipelines-1.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">account_tree</span>
                    <span class="text-sm">Pipelines ML 1</span>
                </a>
                <a href="dashboard-pipelines-4.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">hub</span>
                    <span class="text-sm">Pipelines ML 4</span>
                </a>
                <a href="dashboard-utilisateurs.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">group</span>
                    <span class="text-sm">Activité Utilisateurs</span>
                </a>
                <a href="dashboard-rapports-oms.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">description</span>
                    <span class="text-sm">Rapports OMS</span>
                </a>
                <a href="dashboard-sync-dhis2.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">sync_alt</span>
                    <span class="text-sm">Sync DHIS2</span>
                </a>

                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-4 mb-2">Gestion</p>
                <a href="gestion-captures.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">science</span>
                    <span class="text-sm">Captures (Laboratoire)</span>
                </a>
                <a href="gestion-sites.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">place</span>
                    <span class="text-sm">Sites Sentinelles</span>
                </a>
                <a href="gestion-utilisateurs.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">person</span>
                    <span class="text-sm">Utilisateurs</span>
                </a>
                <a href="gestion-roles.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">admin_panel_settings</span>
                    <span class="text-sm">Rôles & Permissions</span>
                </a>
                <a href="gestion-datasets.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">folder</span>
                    <span class="text-sm">Datasets & Annotations</span>
                </a>
                <a href="gestion-modeles-visuels.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">image</span>
                    <span class="text-sm">Modèles Visuels</span>
                </a>
                <a href="gestion-hors-ligne.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">offline_bolt</span>
                    <span class="text-sm">Données Hors Ligne</span>
                </a>

                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-4 mb-2">Modèles ML</p>
                <a href="catalogue-modeles.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">memory</span>
                    <span class="text-sm">Catalogue Modèles</span>
                </a>
                <a href="surveillance-audio.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">mic</span>
                    <span class="text-sm">Surveillance Audio</span>
                </a>

                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-4 mb-2">Rapports & Analyse</p>
                <a href="generateur-rapports.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">summarize</span>
                    <span class="text-sm">Générateur Rapports</span>
                </a>
                <a href="analyse-donnees.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">analytics</span>
                    <span class="text-sm">Analyse Données</span>
                </a>

                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-4 mb-2">Configuration</p>
                <a href="config-indicateurs.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">insights</span>
                    <span class="text-sm">Indicateurs Rapports</span>
                </a>
                <a href="config-dhis2.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">settings_ethernet</span>
                    <span class="text-sm">Intégration DHIS2</span>
                </a>
                <a href="config-modeles-risque.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">risk_alert</span>
                    <span class="text-sm">Modèles Risque</span>
                </a>
                <a href="param-sync.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">sync</span>
                    <span class="text-sm">Paramètres Sync</span>
                </a>
                <a href="param-langues.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">language</span>
                    <span class="text-sm">Langues</span>
                </a>
                <a href="statut-sync.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">check_circle</span>
                    <span class="text-sm">Statut Sync Globale</span>
                </a>
                <a href="validation-dhis2.html" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span class="material-symbols-outlined">verified</span>
                    <span class="text-sm">Validation DHIS2</span>
                </a>
            </nav>
        </aside>
'''

header_template = '''
            <header class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 sm:px-10 py-3 bg-white dark:bg-background-dark">
                <div class="flex items-center gap-4">
                    <button class="md:hidden flex items-center justify-center rounded-lg h-10 w-10 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        <span class="material-symbols-outlined">menu</span>
                    </button>
                    <h2 class="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] hidden sm:block">__PAGE_TITLE__</h2>
                </div>
                <div class="flex items-center gap-2">
                    <button class="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-[#f0f2f4] dark:bg-gray-700 text-[#111418] dark:text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5">
                        <span class="material-symbols-outlined text-xl">language</span>
                    </button>
                    <button class="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-[#f0f2f4] dark:bg-gray-700 text-[#111418] dark:text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5">
                        <span class="material-symbols-outlined text-xl">notifications</span>
                    </button>
                    <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" data-alt="Avatar de l'utilisateur" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuCf4ReoO6DzV9WU-ZhB6goMwdc2JDmBKPIoG2wN42ZesgRlTndCYQd5Y4Q17BXkh-PT52vUi6nUrrgMXPRTv4W1NC1O-LyvBC0xSiOXwz4xygtxx5sZFITOUmL7IoPwQN_P6imrOlzhNEAsmIT3gH3Hi0LhvKCJNtywqPtozvTgNHut3Vb-HCF2otQEsEWNGmh9_cMer8QaFRYhqdLiMZA-XaV7T0-wPYENp_TzGXxiwr-0fQsLdjhjnXPuLk9tB-xqFuoN9iXNPg");'></div>
                </div>
            </header>
'''

def update_html_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract page title
    import re
    title_match = re.search(r'<title>(.*?)</title>', content)
    page_title = title_match.group(1) if title_match else "Page"
    
    # Find body content
    body_start = content.find('<body')
    if body_start == -1:
        return
    
    body_end = content.find('</body>')
    if body_end == -1:
        return
    
    # Extract old body content
    old_body = content[body_start:body_end + 7]
    
    # Create new body structure
    new_body = f'''<body class="font-display bg-background-light dark:bg-background-dark text-[#111418] dark:text-gray-200">
    <div class="flex h-screen w-full">
{sidebar_template}
        <main class="flex-1 flex flex-col overflow-y-auto">
{header_template.replace('__PAGE_TITLE__', page_title)}
'''
    
    # Find the main content - look for the first main or div after header
    # We'll extract everything between the old body and the closing body tag,
    # then wrap it properly
    
    # Let's try to extract the main content area
    # First, find the first element after body
    start_idx = content.find('>', body_start) + 1
    
    # Extract everything inside body
    inside_body = content[start_idx:body_end].strip()
    
    # Now, add the inside_body into our new structure, and close everything
    final_content = content[:body_start] + new_body + '''
            <div class="flex-1 px-4 sm:px-6 lg:px-10 py-8 overflow-y-auto">
''' + inside_body + '''
            </div>
        </main>
    </div>
</body>'''
    
    # Replace old body with new structure
    final_html = content.replace(old_body, final_content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(final_html)
    
    print(f"Updated: {file_path}")

# Process all HTML files in pages directory
for file in pages_dir.glob("*.html"):
    update_html_file(file)

print("\n✅ All pages updated successfully!")
