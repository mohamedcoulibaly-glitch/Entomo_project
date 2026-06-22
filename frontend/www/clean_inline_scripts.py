"""
clean_inline_scripts.py
Supprime les blocs <script> inline redondants dans les pages HTML
(thème, nav active, mobile menu) qui sont désormais gérés par core.js
"""
import os, re

PAGES_DIR = os.path.join(os.path.dirname(__file__), 'pages')

# Pattern pour détecter un bloc <script> inline qui contient le code thème/nav
# On supprime uniquement les <script> qui contiennent themeToggle OU initActiveNav
# (ce ne sont pas les scripts injectés par inject_scripts.py)
SCRIPT_PATTERN = re.compile(
    r'\n?\s*<script>\s*(?:(?!Ento-App).)*?(?:themeToggle|theme-toggle|Highlight active|mobileMenuBtn|mobile-menu-btn).*?</script>',
    re.DOTALL | re.IGNORECASE
)

cleaned = 0

for fname in os.listdir(PAGES_DIR):
    if not fname.endswith('.html'):
        continue
    path = os.path.join(PAGES_DIR, fname)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = SCRIPT_PATTERN.sub('', content)
    
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'  cleaned: {fname}')
        cleaned += 1

# Traiter index.html aussi
index_path = os.path.join(os.path.dirname(__file__), 'index.html')
if os.path.exists(index_path):
    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = SCRIPT_PATTERN.sub('', content)
    if new_content != content:
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('  cleaned: index.html')
        cleaned += 1

print(f'\nTotal: {cleaned} fichiers nettoyés')
