"""E2E — création capture avec section médias et cartographie Leaflet."""


def _login(page, base_url):
    page.goto(f"{base_url}/login.html")
    page.wait_for_function("() => !document.getElementById('global-loader')", timeout=15000)
    page.locator("#login-username").fill("admin")
    page.locator("#login-password").fill("Admin@2024")
    page.locator("#login-btn").click()
    page.wait_for_url(f"{base_url}/index.html", timeout=10000)


def test_nouvelle_capture_has_media_section(page, base_url):
    _login(page, base_url)
    page.goto(f"{base_url}/pages/nouvelle-capture.html")
    page.wait_for_selector("#entity-form", timeout=15000)
    page.wait_for_selector("#capture-media-section", timeout=15000)
    assert page.locator("#capture-image-file").count() == 1
    assert page.locator("#capture-audio-record").count() == 1


def test_cartographie_loads_leaflet(page, base_url):
    _login(page, base_url)
    page.goto(f"{base_url}/pages/cartographie.html")
    page.wait_for_selector("#map-container", timeout=15000)
    page.wait_for_timeout(2500)
    assert page.locator(".leaflet-container").count() > 0


def test_gestion_captures_loads_after_login(page, base_url):
    _login(page, base_url)
    page.goto(f"{base_url}/pages/gestion-captures.html")
    page.wait_for_function("() => typeof apiCaptures !== 'undefined'")
    assert "gestion-captures" in page.url
