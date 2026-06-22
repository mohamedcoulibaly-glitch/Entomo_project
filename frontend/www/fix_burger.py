"""
fix_burger.py
Ajoute id="mobile-menu-btn" aux boutons burger (md:hidden) dans toutes les pages HTML
"""
import os, re

PAGES_DIR = os.path.join(os.path.dirname(__file__), 'pages')
PATTERN   = re.compile(r'(<button\s)(class="[^"]*md:hidden[^"]*")', re.IGNORECASE)
FIXED     = 0

def fix_file(path):
    global FIXED
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'mobile-menu-btn' in content:
        return  # déjà corrigé
    if 'md:hidden' not in content:
        return  # pas de bouton burger
    new_content = PATTERN.sub(r'\1id="mobile-menu-btn" \2', content)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'  fixed: {os.path.basename(path)}')
        FIXED += 1

for fname in os.listdir(PAGES_DIR):
    if fname.endswith('.html'):
        fix_file(os.path.join(PAGES_DIR, fname))

index_path = os.path.join(os.path.dirname(__file__), 'index.html')
if os.path.exists(index_path):
    fix_file(index_path)

print(f'\nTotal: {FIXED} fichiers corrigés')
