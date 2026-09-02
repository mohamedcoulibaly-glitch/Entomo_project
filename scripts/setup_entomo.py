#!/usr/bin/env python3
"""Script de mise en place Entomo — exécute toutes les étapes d'initialisation."""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"


def run(cmd, cwd, desc):
    print(f"\n{'='*60}\n▶ {desc}\n{'='*60}")
    result = subprocess.run(cmd, cwd=cwd, shell=isinstance(cmd, str))
    if result.returncode != 0:
        print(f"❌ Échec: {desc}")
        sys.exit(result.returncode)
    print(f"✅ {desc}")


def main():
    print("🚀 Mise en place Entomo — initialisation complète\n")

    # 1. Dépendances frontend (skip si déjà installées)
    try:
        import fastapi  # noqa: F401
        print("✅ Dépendances Python déjà installées")
    except ImportError:
        run([sys.executable, "-m", "pip", "install", "-q", "-r", str(BACKEND / "requirements.txt")],
            BACKEND, "Dépendances Python backend")

    if (FRONTEND / "package.json").is_file():
        run("npm install", FRONTEND, "Dépendances npm frontend (Chart.js, Leaflet)")

    # 2. Dataset ML terrain
    run([sys.executable, "data/ml_terrain/generate_expert_labels.py"],
        BACKEND, "Génération annotations experts entomologistes")

    run([sys.executable, "-c",
         "from app.services.terrain_dataset import ensure_terrain_audio_files; "
         "n=ensure_terrain_audio_files(); print(f'Fichiers audio terrain: {n} créés')"],
        BACKEND, "Génération fichiers audio terrain (200 WAV)")

    # 3. Modèles ML ONNX
    run([sys.executable, "-c",
         "import os; os.environ['TESTING']='0'; "
         "from app.db.session import SessionLocal; "
         "from app.services.ml_training import ensure_default_models; "
         "db=SessionLocal(); ensure_default_models(db); db.close(); "
         "print('Modèles ONNX générés')"],
        BACKEND, "Entraînement modèles ML (dataset terrain)")

    # 4. Seed base de données
    run([sys.executable, "seed.py"], BACKEND, "Seed base de données")

    # 5. Injection scripts frontend
    run([sys.executable, "inject_scripts.py"],
        FRONTEND / "www", "Injection scripts analytics (Chart.js, Leaflet)")

    # 6. Tests
    run([sys.executable, "-m", "pytest", "tests/test_terrain_dataset.py",
         "tests/test_dashboard_analytics.py", "tests/test_dashboard.py", "-q"],
        BACKEND, "Tests analytics + terrain dataset")

    # 7. Vérifier GeoJSON officiel
    geojson = FRONTEND / "www" / "data" / "senegal-regions-official.geojson"
    if geojson.is_file():
        size_kb = geojson.stat().st_size // 1024
        print(f"\n✅ GeoJSON officiel Sénégal: {size_kb} KB ({geojson})")
    else:
        print("\n⚠️  GeoJSON officiel absent — télécharger depuis geoBoundaries/HDX")

    print("\n" + "="*60)
    print("✅ Mise en place terminée !")
    print("="*60)
    print("\nDémarrer l'application :")
    print(f"  python {ROOT / 'start.py'}")
    print("\nTests DHIS2 Play E2E (optionnel) :")
    print("  set DHIS2_PLAY_URL=https://play.im.dhis2.org/stable-2-40-12/")
    print("  pytest tests/test_dhis2_play_e2e.py -v -m dhis2_e2e")
    print("\nIdentifiants : admin / Admin@2024")


if __name__ == "__main__":
    main()
