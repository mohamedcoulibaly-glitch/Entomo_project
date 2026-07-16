import os, sys, subprocess, time, urllib.request, urllib.error
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright, Browser, Page

# Ports réservés aux tests : l'application de développement peut continuer à
# tourner sur 8765/8766 pendant l'exécution de la suite.
BACKEND_PORT = 8875
FRONTEND_PORT = 8876
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR.parent / "backend"
FRONTEND_WWW = BASE_DIR / "www"
BASE_URL = f"http://127.0.0.1:{FRONTEND_PORT}"
API_URL = f"http://127.0.0.1:{BACKEND_PORT}/api/v1"


@pytest.fixture(scope="session")
def browser():
    """Start backend + frontend servers, then launch Playwright browser."""
    # ── Start backend (uvicorn) ──────────────────────────────────────────────
    backend_env = os.environ.copy()
    backend_env["DATABASE_URL"] = "sqlite:///./e2e_test.db"
    try:
        os.remove(str(BACKEND_DIR / "e2e_test.db"))
    except FileNotFoundError:
        pass
    
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(BACKEND_PORT)],
        cwd=str(BACKEND_DIR),
        env=backend_env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Wait for backend to be ready
    for _ in range(30):
        try:
            r = urllib.request.urlopen(f"http://127.0.0.1:{BACKEND_PORT}/health", timeout=2)
            if r.status == 200:
                break
        except (urllib.error.URLError, ConnectionError):
            pass
        time.sleep(1)
    else:
        backend_proc.kill()
        raise RuntimeError("Backend did not start in time")

    # Seed if needed
    subprocess.run(
        [sys.executable, str(BACKEND_DIR / "seed.py")],
        cwd=str(BACKEND_DIR),
        env=backend_env,
        capture_output=True,
        check=True,
    )

    # ── Start frontend (http.server) ─────────────────────────────────────────
    frontend_proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(FRONTEND_PORT), "--directory", str(FRONTEND_WWW)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(1)

    # ── Launch Playwright browser ────────────────────────────────────────────
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser
        browser.close()

    # ── Cleanup ──────────────────────────────────────────────────────────────
    frontend_proc.kill()
    backend_proc.kill()
    backend_proc.wait()
    frontend_proc.wait()
    time.sleep(0.5)

    # Remove the isolated seeded DB; never touch the development database.
    try:
        os.remove(str(BACKEND_DIR / "e2e_test.db"))
    except FileNotFoundError:
        pass


@pytest.fixture
def page(browser: Browser) -> Page:
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    context.add_init_script(
        f"window.ENTOMO_API_BASE = 'http://127.0.0.1:{BACKEND_PORT}/api/v1';"
    )
    page = context.new_page()
    page.set_default_timeout(15000)
    yield page
    context.close()


@pytest.fixture
def api_url() -> str:
    return API_URL


@pytest.fixture
def base_url() -> str:
    return BASE_URL
