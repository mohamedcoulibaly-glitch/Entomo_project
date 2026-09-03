"""Lance le backend, exécute le seed, puis lance le frontend."""

import subprocess, sys, time, urllib.request, urllib.error, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent
BACKEND_PORT = 8765
FRONTEND_PORT = 8766
BACKEND_DIR = ROOT / "backend"
FRONTEND_WWW = ROOT / "frontend" / "www"

procs = []

try:
    # ── Backend ────────────────────────────────────────────────────────────────
    p = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(BACKEND_PORT)],
        cwd=BACKEND_DIR, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    procs.append(("Backend", p))

    # Attendre que le backend soit prêt
    for _ in range(30):
        try:
            r = urllib.request.urlopen(f"http://127.0.0.1:{BACKEND_PORT}/health", timeout=2)
            if r.status == 200:
                break
        except Exception:
            pass
        time.sleep(1)
    else:
        raise RuntimeError("Le backend n'a pas demarre a temps")

    # ── Seed ───────────────────────────────────────────────────────────────────
    subprocess.run([sys.executable, "seed.py"], cwd=BACKEND_DIR, capture_output=True)

    # ── Frontend ───────────────────────────────────────────────────────────────
    p = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(FRONTEND_PORT), "--directory", str(FRONTEND_WWW)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    procs.append(("Frontend", p))

    print(f"Backend  : http://127.0.0.1:{BACKEND_PORT}")
    print(f"Frontend : http://127.0.0.1:{FRONTEND_PORT}")
    print("Identifiants : admin / Admin@2024  ou  labo1 / Labo@2024")
    print("Ctrl+C pour arreter.")

    while True:
        time.sleep(1)

except KeyboardInterrupt:
    print("\nArret...")
finally:
    for _, p in procs:
        p.kill()
        p.wait()
