"""
Tests E2E complets pour le frontend Entomo-App Afrique.
Couvre : navigation, authentification, UI, formulaires, liens.
"""

import re
from pathlib import Path


# ─── Page d'accueil ──────────────────────────────────────────────────────────

def test_homepage_loads(page, base_url):
    page.goto(f"{base_url}/")
    assert "Ento" in page.title()
    h1 = page.locator("h1")
    assert h1.count() > 0


def test_homepage_has_login_link(page, base_url):
    page.goto(f"{base_url}/")
    # Should have a login link or button
    login_links = page.locator('a[href*="login"]')
    assert login_links.count() > 0


def test_homepage_nav_links_exist(page, base_url):
    page.goto(f"{base_url}/")
    nav = page.locator("nav a, header a, .nav-link, [class*='nav'] a")
    # Should have at least one navigation link
    count = nav.count()
    # Also check sidebar links
    sidebar_links = page.locator("aside a, .sidebar a, [class*='sidebar'] a")
    assert count + sidebar_links.count() > 0


# ─── Page de login ───────────────────────────────────────────────────────────

def test_login_page_loads(page, base_url):
    page.goto(f"{base_url}/login.html")
    assert "Connexion" in page.title()
    assert page.locator("#login-form").is_visible()


def test_login_form_elements(page, base_url):
    page.goto(f"{base_url}/login.html")
    assert page.locator("#login-username").is_visible()
    assert page.locator("#login-password").is_visible()
    assert page.locator("#login-btn").is_visible()
    assert page.locator("#login-btn").locator("text=Se connecter").is_visible()


def test_login_form_empty_submission(page, base_url):
    """Test that empty form shows an error."""
    page.goto(f"{base_url}/login.html")
    page.locator("#login-username").fill("")
    page.locator("#login-password").fill("")
    page.locator("#login-btn").click()
    # Expect error message
    error_el = page.locator("#login-error")
    assert error_el.is_visible()


def test_login_backend_unavailable(page, base_url):
    """Test login with wrong credentials gives error (backend is running but wrong creds)."""
    page.goto(f"{base_url}/login.html")
    page.locator("#login-username").fill("nonexistent")
    page.locator("#login-password").fill("wrongpassword")
    page.locator("#login-btn").click()
    # Should show error message
    error_el = page.locator("#login-error")
    # Wait for error to appear (async)
    page.wait_for_timeout(2000)
    assert error_el.is_visible()


def test_login_page_has_creds_hint(page, base_url):
    """Page should display demo credentials hint."""
    page.goto(f"{base_url}/login.html")
    body = page.locator("body").inner_text()
    assert "admin" in body
    assert "Admin@2024" in body or "Admin@" in body


def test_login_form_structure(page, base_url):
    """Verify input field attributes."""
    page.goto(f"{base_url}/login.html")
    username_input = page.locator("#login-username")
    assert username_input.get_attribute("type") == "text"
    password_input = page.locator("#login-password")
    assert password_input.get_attribute("type") == "password"
    submit_btn = page.locator("#login-btn")
    assert submit_btn.get_attribute("type") == "submit"


# ─── Navigation et liens ─────────────────────────────────────────────────────

def test_back_to_home_link_on_login(page, base_url):
    """Login page should have a link back to home."""
    page.goto(f"{base_url}/login.html")
    home_link = page.locator('a[href*="index.html"], a[href="./"]')
    assert home_link.count() > 0


def test_favicon_or_logo_present(page, base_url):
    page.goto(f"{base_url}/")
    # Check for SVG or img elements
    images = page.locator("img, svg")
    assert images.count() > 0


def test_page_title_not_empty(page, base_url):
    """All pages should have a non-empty title."""
    pages_to_check = ["", "login.html"]
    for p in pages_to_check:
        url = f"{base_url}/{p}" if p else base_url
        page.goto(url)
        title = page.title()
        assert title and len(title) > 0, f"Page {p} has empty title"


# ─── Vérifications de l'accessibilité et de la présence du contenu ──────────

def test_meta_viewport_present(page, base_url):
    """Page should have responsive viewport meta tag."""
    page.goto(f"{base_url}/")
    viewport = page.locator('meta[name="viewport"]')
    assert viewport.count() > 0


def test_google_fonts_loaded(page, base_url):
    """Page should reference Google Fonts."""
    page.goto(f"{base_url}/")
    fonts_link = page.locator('link[href*="fonts.googleapis.com"]')
    assert fonts_link.count() > 0


def test_tailwind_css_loaded(page, base_url):
    """Page should reference local Tailwind CSS."""
    page.goto(f"{base_url}/")
    tailwind = page.locator('link[href*="tailwind.min.css"], script[src*="tailwindcss"]')
    assert tailwind.count() > 0


def test_material_icons_loaded(page, base_url):
    """Page should reference Material Symbols/Icons."""
    page.goto(f"{base_url}/")
    icons = page.locator('link[href*="Material+Symbols"], link[href*="material"]')
    assert icons.count() > 0


def test_api_js_loaded(page, base_url):
    """Page should load api.js."""
    page.goto(f"{base_url}/")
    api_js = page.locator('script[src*="api.js"]')
    assert api_js.count() > 0


def test_core_js_loaded(page, base_url):
    """Page should load core.js."""
    page.goto(f"{base_url}/")
    core_js = page.locator('script[src*="core.js"]')
    assert core_js.count() > 0


def test_js_api_base_configured(page, base_url):
    """Check that the API_BASE is properly defined in api.js."""
    page.goto(f"{base_url}/")
    has_api_base = page.evaluate("typeof API_BASE !== 'undefined'")
    assert has_api_base is True


def test_auth_object_exists(page, base_url):
    """Auth object should be available after loading api.js."""
    page.goto(f"{base_url}/")
    has_auth = page.evaluate("typeof Auth !== 'undefined'")
    assert has_auth is True


# ─── Tests des pages fonctionnelles ─────────────────────────────────────────

def test_dashboard_page_exists(page, base_url):
    """Check that dashboard pages exist and are accessible."""
    pages_to_check = [
        "pages/dashboard-entomo.html",
    ]
    for p in pages_to_check:
        response = page.goto(f"{base_url}/{p}")
        assert response.status == 200, f"Page {p} returned {response.status}"


def test_management_pages_exist(page, base_url):
    """Check that management pages exist."""
    pages_to_check = [
        "pages/gestion-captures.html",
        "pages/gestion-sites.html",
        "pages/gestion-utilisateurs.html",
        "pages/gestion-datasets.html",
    ]
    for p in pages_to_check:
        response = page.goto(f"{base_url}/{p}")
        assert response.status == 200, f"Page {p} returned {response.status}"


def test_config_pages_exist(page, base_url):
    """Check that configuration pages exist."""
    pages_to_check = [
        "pages/catalogue-modeles.html",
        "pages/param-sync.html",
        "pages/gestion-roles.html",
    ]
    for p in pages_to_check:
        response = page.goto(f"{base_url}/{p}")
        assert response.status == 200, f"Page {p} returned {response.status}"


def test_report_pages_exist(page, base_url):
    """Check that report pages exist."""
    pages_to_check = [
        "pages/generateur-rapports.html",
    ]
    for p in pages_to_check:
        response = page.goto(f"{base_url}/{p}")
        assert response.status == 200, f"Page {p} returned {response.status}"


# ─── Tests d'intégration UI (backend running) ────────────────────────────────

def test_login_success_redirects(page, base_url):
    """Successful login should redirect to index."""
    page.goto(f"{base_url}/login.html")
    page.locator("#login-username").fill("admin")
    page.locator("#login-password").fill("Admin@2024")
    page.locator("#login-btn").click()
    # Should redirect after successful login
    page.wait_for_url(f"{base_url}/index.html", timeout=5000)


def test_login_sets_token(page, base_url, api_url):
    """After login, token should be in localStorage."""
    page.goto(f"{base_url}/login.html")

    # Add a console listener for debugging
    console_log = []
    page.on("console", lambda msg: console_log.append(f"[{msg.type}] {msg.text}"))

    page.locator("#login-username").fill("admin")
    page.locator("#login-password").fill("Admin@2024")

    # Log network requests
    reqs = []
    page.on("request", lambda req: reqs.append(f"{req.method} {req.url}"))
    page.on("response", lambda resp: reqs.append(f"{resp.status} {resp.url}"))

    page.locator("#login-btn").click()

    # Wait for redirect
    page.wait_for_url(f"{base_url}/index.html", timeout=10000)
    page.wait_for_timeout(500)

    token = page.evaluate("localStorage.getItem('entomo_token')")
    user = page.evaluate("localStorage.getItem('entomo_user')")

    # Print debug info
    api_log = [l for l in console_log if "/api/v1" in l or "token" in l.lower() or "error" in l.lower()]
    api_reqs = [r for r in reqs if "8765" in r or "auth" in r.lower() or "health" in r.lower()]
    print(f"\n[DEBUG] Token: {repr(token)}")
    print(f"[DEBUG] User: {repr(user)}")
    print(f"[DEBUG] API logs ({len(api_log)}):")
    for l in api_log[:10]:
        print(f"  {l}")
    print(f"[DEBUG] API reqs/resps ({len(api_reqs)}):")
    for r in api_reqs[:10]:
        print(f"  {r}")
    if console_log:
        print(f"[DEBUG] All console ({len(console_log)}):")
        for l in console_log[:20]:
            print(f"  {l}")

    assert token is not None, (
        f"Token is None. User: {repr(user)}. "
        f"HTTP events: {api_reqs[:6]}. "
        f"Console: {[l for l in console_log[:10]]}"
    )
    assert len(token) > 0


def test_logout_clears_session(page, base_url):
    """Logout should remove token and user from localStorage."""
    page.goto(f"{base_url}/login.html")
    page.locator("#login-username").fill("admin")
    page.locator("#login-password").fill("Admin@2024")
    page.locator("#login-btn").click()
    page.wait_for_url(f"{base_url}/index.html", timeout=5000)
    # Click on avatar to open session menu, then click logout
    avatar = page.locator("header .rounded-full, header [class*='avatar'], header .w-14")
    if avatar.count() > 0:
        avatar.first.click()
        page.wait_for_timeout(500)
        logout_btn = page.locator("#sm-logout, button:has-text('Se déconnecter')")
        if logout_btn.count() > 0:
            logout_btn.first.click()
            page.wait_for_timeout(1000)
            token = page.evaluate("localStorage.getItem('entomo_token')")
            assert token is None


def test_logged_in_user_info_displayed(page, base_url):
    """After login, user info should be shown."""
    page.goto(f"{base_url}/login.html")
    page.locator("#login-username").fill("admin")
    page.locator("#login-password").fill("Admin@2024")
    page.locator("#login-btn").click()
    page.wait_for_url(f"{base_url}/index.html", timeout=5000)
    user = page.evaluate("localStorage.getItem('entomo_user')")
    assert user is not None
    user_data = page.evaluate("JSON.parse(localStorage.getItem('entomo_user'))")
    assert user_data["username"] == "admin"


# ─── Vérifications de l'état de l'API ───────────────────────────────────────-

def test_api_status_badge_appears(page, base_url):
    """API status badge should appear on the page."""
    page.goto(f"{base_url}/")
    # Wait for the health check to run
    page.wait_for_timeout(3000)
    badge = page.locator("#api-status-badge")
    assert badge.is_visible()


def test_theme_toggle_exists(page, base_url):
    """Theme toggle button should exist."""
    page.goto(f"{base_url}/")
    theme_btn = page.locator("#theme-toggle, button:has(#theme-icon)")
    assert theme_btn.count() > 0


def test_notification_bell_exists(page, base_url):
    """Notification bell should exist."""
    page.goto(f"{base_url}/")
    notif_bell = page.locator("button:has(span:has-text('notifications')), #notification-bell")
    assert notif_bell.count() > 0


# ─── Vérifications des liens externes ────────────────────────────────────────

def test_no_broken_links_on_homepage(page, base_url):
    """Check that all internal links on homepage are not broken."""
    page.goto(f"{base_url}/")
    links = page.locator("a[href]")
    count = links.count()
    broken = 0
    for i in range(min(count, 20)):
        href = links.nth(i).get_attribute("href")
        if href and not href.startswith("http") and not href.startswith("#") and not href.startswith("mailto"):
            if not href.startswith("/"):
                href = f"{base_url}/{href.lstrip('./')}"
            try:
                resp = page.request.get(href)
                if resp.status >= 400:
                    broken += 1
            except Exception:
                broken += 1
    assert broken == 0, f"Found {broken} broken links"


def test_all_application_pages_load_without_runtime_errors(page, base_url):
    """Charge chaque écran avec une vraie session et détecte les scripts cassés."""
    page.goto(f"{base_url}/login.html")
    page.locator("#login-username").fill("admin")
    page.locator("#login-password").fill("Admin@2024")
    page.locator("#login-btn").click()
    page.wait_for_url(f"{base_url}/index.html", timeout=10000)

    page_errors = []
    failed_scripts = []
    current_page = {"name": "index.html"}

    page.on(
        "pageerror",
        lambda error: page_errors.append(f"{current_page['name']}: {error}"),
    )
    page.on(
        "response",
        lambda response: failed_scripts.append(
            f"{current_page['name']}: {response.status} {response.url}"
        )
        if response.status >= 400
        and (response.url.endswith(".js") or response.url.endswith(".html"))
        else None,
    )

    pages_dir = Path(__file__).resolve().parents[1] / "www" / "pages"
    for page_file in sorted(pages_dir.glob("*.html")):
        if page_file.name == "404.html":
            continue
        current_page["name"] = page_file.name
        response = page.goto(f"{base_url}/pages/{page_file.name}")
        assert response.status == 200, page_file.name
        page.wait_for_timeout(150)

    assert not failed_scripts, "Ressources applicatives manquantes:\n" + "\n".join(failed_scripts)
    assert not page_errors, "Erreurs JavaScript:\n" + "\n".join(page_errors)


def _login(page, base_url):
    page.goto(f"{base_url}/login.html")
    page.locator("#login-username").fill("admin")
    page.locator("#login-password").fill("Admin@2024")
    page.locator("#login-btn").click()
    page.wait_for_url(f"{base_url}/index.html", timeout=10000)


def test_no_placeholder_links_remain():
    """Une ancre vide ne doit jamais servir de bouton factice."""
    www = Path(__file__).resolve().parents[1] / "www"
    offenders = []
    for html_file in [www / "index.html", www / "login.html", *sorted((www / "pages").glob("*.html"))]:
        if re.search(r'href=["\']#["\']', html_file.read_text(encoding="utf-8")):
            offenders.append(html_file.name)
    assert not offenders, f"Ancres factices restantes: {offenders}"


def test_audited_controls_are_wired_to_javascript():
    """Les contrôles identifiés pendant l'audit doivent conserver leur contrat HTML/JS."""
    www = Path(__file__).resolve().parents[1] / "www"
    contracts = {
        "alertes": ["btn-marquer-tout-lu", "filter-toutes", "filter-non-lues", "filter-alertes", "filter-info", "filter-warning"],
        "audit-logs": ["btn-exporter-csv", "btn-filtrer", "filter-action", "filter-date-debut"],
        "campagnes": ["btn-creer-campagne", "filter-planifiees", "filter-en-cours", "filter-terminees"],
        "interventions": ["btn-creer-intervention", "filter-site", "filter-type", "filter-statut"],
        "details-capture": ["btn-valider-capture", "btn-corriger-espece", "btn-rejeter-capture", "btn-telecharger-image", "btn-ajouter-note"],
        "details-site": ["btn-modifier-site", "btn-ajouter-activite", "btn-voir-captures", "btn-toutes-captures-site"],
        "cartographie": ["btn-centrer-region", "btn-legende", "btn-exporter-carte", "map-add-site", "map-fullscreen", "map-print"],
        "aide": ["btn-contacter-support", "btn-guide-pdf", "search-aide"],
        "profil": ["btn-changer-photo", "btn-enregistrer-profil", "btn-enregistrer-password"],
    }
    missing = []
    for page_name, identifiers in contracts.items():
        html = (www / "pages" / f"{page_name}.html").read_text(encoding="utf-8")
        javascript = (www / "js" / f"{page_name}.js").read_text(encoding="utf-8")
        for identifier in identifiers:
            if f'id="{identifier}"' not in html or identifier not in javascript:
                missing.append(f"{page_name}:{identifier}")
    assert not missing, f"Contrats d'interaction manquants: {missing}"


def test_campaign_and_intervention_forms_persist(page, base_url):
    _login(page, base_url)

    campaign_name = "Campagne E2E complète"
    page.goto(f"{base_url}/pages/campagnes.html")
    page.locator("#camp-titre").fill(campaign_name)
    page.locator("#camp-date-debut").fill("2026-07-10")
    page.locator("#camp-date-fin").fill("2026-07-20")
    page.locator("#btn-creer-campagne").click()
    page.wait_for_function("name => apiCampagnes.list().then(items => items.some(item => item.nom === name))", arg=campaign_name)

    intervention_name = "Intervention E2E complète"
    page.goto(f"{base_url}/pages/interventions.html")
    page.wait_for_function("() => document.querySelectorAll('#interv-site option').length > 1")
    page.locator("#interv-titre").fill(intervention_name)
    page.locator("#interv-site").select_option(index=1)
    page.locator("#interv-date").fill("2026-07-12")
    page.locator("#btn-creer-intervention").click()
    page.wait_for_function("name => apiInterventions.list().then(items => items.some(item => item.titre === name))", arg=intervention_name)


def test_site_activity_and_notification_actions_persist(page, base_url):
    _login(page, base_url)
    page.goto(f"{base_url}/pages/details-site.html?id=1")
    page.locator("#btn-ajouter-activite").click()
    page.locator("#f-titre").fill("Visite E2E")
    page.locator("#f-description").fill("Contrôle fonctionnel complet")
    page.locator("#modal-confirm").click()
    page.wait_for_function("() => apiSites.activites(1).then(items => items.some(item => item.type_activite === 'Visite E2E'))")

    page.goto(f"{base_url}/pages/alertes.html")
    page.wait_for_function("() => document.querySelectorAll('#notifications-list [data-id]').length > 0")
    page.locator("#btn-marquer-tout-lu").click()
    page.wait_for_function("() => apiNotifications.unreadCount().then(result => result.count === 0)")


def test_assistance_ticket_form_persists_to_backend(page, base_url):
    _login(page, base_url)
    page.goto(f"{base_url}/pages/aide.html")
    page.locator("#btn-contacter-support").click()
    page.locator("#support-subject").fill("Assistance E2E configuration")
    page.locator("#support-category").select_option("configuration")
    page.locator("#support-priority").select_option("haute")
    page.locator("#support-message").fill("Le test vérifie la persistance complète de la demande d'assistance.")
    page.locator("#modal-confirm").click()
    page.wait_for_function("() => apiSupport.listTickets().then(items => items.some(item => item.sujet === 'Assistance E2E configuration'))")
    assert page.locator("#support-ticket-list").get_by_text("Assistance E2E configuration").is_visible()


def test_configuration_pages_use_persisted_dynamic_data(page, base_url):
    _login(page, base_url)

    page.goto(f"{base_url}/pages/config-dhis2.html")
    page.wait_for_function("() => document.querySelector('#dhis2-url').value.length > 0")
    assert page.locator("#dhis2-mappings-body").is_visible()
    page.locator("#btn-save-dhis2").click()
    page.wait_for_function("() => apiDhis2.getConfig().then(items => items.length > 0)")

    page.goto(f"{base_url}/pages/param-langues.html")
    page.wait_for_function("() => document.querySelectorAll('#languages-table-body tr[data-id]').length > 0")
    assert page.locator("#languages-table-body .lang-view").count() > 0

    page.goto(f"{base_url}/pages/param-sync.html")
    page.wait_for_function("() => typeof apiSync !== 'undefined' && document.querySelector('#sync-connection-label').textContent !== 'Vérification de la connexion...'")
    env = page.locator("#env-data")
    env.check()
    page.wait_for_function("() => apiSync.settings().then(settings => settings.data_types.includes('env-data'))")
