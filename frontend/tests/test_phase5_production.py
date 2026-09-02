"""Vérifications statiques Phase 5 — production, CI, runbooks."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_docker_compose_exists():
    compose = ROOT / "docker-compose.yml"
    assert compose.is_file()
    text = compose.read_text(encoding="utf-8")
    assert "postgres:16" in text
    assert "healthcheck" in text
    assert "frontend:" in text


def test_backend_dockerfile_exists():
    dockerfile = ROOT / "backend" / "Dockerfile"
    entrypoint = ROOT / "backend" / "docker-entrypoint.sh"
    assert dockerfile.is_file()
    assert entrypoint.is_file()
    assert "uvicorn" in entrypoint.read_text(encoding="utf-8")


def test_ci_workflow_exists():
    workflow = ROOT / ".github" / "workflows" / "ci.yml"
    assert workflow.is_file()
    text = workflow.read_text(encoding="utf-8")
    assert "pytest" in text
    assert "security_audit" in text


def test_env_example_exists():
    assert (ROOT / ".env.example").is_file()


def test_runbooks_exist():
    runbooks = ROOT / "docs" / "runbooks"
    assert (runbooks / "deployment.md").is_file()
    assert (runbooks / "incident-response.md").is_file()
    assert (runbooks / "backup-restore.md").is_file()


def test_health_endpoints_documented_in_api():
    main = (ROOT / "backend" / "main.py").read_text(encoding="utf-8")
    assert "/health/live" in main
    assert "/health/ready" in main
    assert "build_health_summary" in main


def test_security_audit_script_exists():
    script = ROOT / "backend" / "scripts" / "security_audit.py"
    assert script.is_file()
