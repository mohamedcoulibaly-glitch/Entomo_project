"""Assistant numérique basé sur le contexte métier réel de la plateforme."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.capture import Capture
from app.models.dhis2 import DHIS2Config, DHIS2Sync
from app.models.intervention import Intervention
from app.models.model import MLModel
from app.models.site import SiteSentinelle
from app.schemas.assistant import REFERENCE_DATA_STATIC
from app.services.assistant_llm import try_llm_reply


def build_assistant_context(db: Session) -> Dict[str, Any]:
    pending = db.query(func.count(Capture.id)).filter(Capture.statut == "a_valider").scalar() or 0
    validated = db.query(func.count(Capture.id)).filter(Capture.statut == "valide").scalar() or 0
    audio = db.query(func.count(Capture.id)).filter(Capture.methode_capture.ilike("%audio%")).scalar() or 0
    sites = db.query(func.count(SiteSentinelle.id)).filter(SiteSentinelle.actif.is_(True)).scalar() or 0
    interventions = db.query(func.count(Intervention.id)).filter(Intervention.statut == "realisee").scalar() or 0
    models = db.query(func.count(MLModel.id)).filter(MLModel.deploye.is_(True)).scalar() or 0
    dhis2 = db.query(DHIS2Config).filter(DHIS2Config.actif.is_(True)).first()
    last_sync = None
    if dhis2:
        last_sync = (
            db.query(DHIS2Sync)
            .filter(DHIS2Sync.config_id == dhis2.id)
            .order_by(DHIS2Sync.date_sync.desc())
            .first()
        )
    return {
        "captures_pending": pending,
        "captures_validated": validated,
        "captures_audio": audio,
        "sites_active": sites,
        "interventions_done": interventions,
        "models_deployed": models,
        "dhis2_configured": bool(dhis2),
        "dhis2_last_status": last_sync.statut if last_sync else None,
        "reference": REFERENCE_DATA_STATIC,
    }


def _format_species_help() -> str:
    species = REFERENCE_DATA_STATIC.get("especes", [])
    labels = ", ".join(item["label"] for item in species[:6])
    return f"Espèces suivies : {labels} et {max(len(species) - 6, 0)} autres."


def generate_assistant_reply(message: str, context: Dict[str, Any]) -> Dict[str, Any]:
    text = (message or "").strip()
    llm = try_llm_reply(text, context) if text else None
    if llm:
        return llm

    lower = text.lower()

    if not text:
        return {
            "reply": "Bonjour. Je suis l'assistant Entomo. Posez-moi une question sur les captures, la synchronisation DHIS2 ou les modèles ML.",
            "suggestions": ["Combien de captures à valider ?", "État DHIS2", "Modèles déployés"],
        }

    if re.search(r"(capture|échantillon|specimen)", lower):
        return {
            "reply": (
                f"Il y a actuellement {context['captures_pending']} capture(s) à valider, "
                f"{context['captures_validated']} validée(s), dont {context['captures_audio']} enregistrement(s) audio. "
                f"{_format_species_help()}"
            ),
            "suggestions": ["Ouvrir la validation DHIS2", "Lancer une analyse audio"],
        }

    if re.search(r"(dhis2|sync|synchron)", lower):
        if not context["dhis2_configured"]:
            return {
                "reply": "DHIS2 n'est pas encore configuré. Rendez-vous dans Configuration DHIS2 pour enregistrer l'URL, l'utilisateur et le mot de passe.",
                "suggestions": ["Configurer DHIS2"],
            }
        return {
            "reply": (
                f"DHIS2 est configuré. Dernier statut de synchronisation : "
                f"{context['dhis2_last_status'] or 'aucune synchronisation enregistrée'}."
            ),
            "suggestions": ["Lancer une synchronisation", "Voir le tableau de bord DHIS2"],
        }

    if re.search(r"(mod[eè]le|ml|pipeline|audio|classification)", lower):
        return {
            "reply": (
                f"{context['models_deployed']} modèle(s) ML sont déployés. "
                "Les pipelines d'entraînement sont disponibles dans Pipelines ML et l'analyse audio dans Surveillance Audio."
            ),
            "suggestions": ["Voir les pipelines ML", "Surveillance audio"],
        }

    if re.search(r"(site|sentinelle|r[eé]gion)", lower):
        return {
            "reply": f"{context['sites_active']} site(s) sentinelle actif(s) sont enregistrés dans la plateforme.",
            "suggestions": ["Gérer les sites sentinelles"],
        }

    if re.search(r"(intervention|larvicide|pulv)", lower):
        return {
            "reply": f"{context['interventions_done']} intervention(s) réalisée(s) sont enregistrées.",
            "suggestions": ["Voir les interventions"],
        }

    if re.search(r"(aide|help|comment)", lower):
        return {
            "reply": (
                "Je peux répondre sur les captures, DHIS2, les modèles ML, les sites et les interventions. "
                "Pour un ticket humain, utilisez la section Assistance de la page Aide."
            ),
            "suggestions": ["Captures à valider", "État DHIS2", "Modèles déployés"],
        }

    return {
        "reply": (
            "Je n'ai pas identifié un domaine précis dans votre question. "
            f"Pour vous orienter : {context['captures_pending']} capture(s) à valider, "
            f"{context['sites_active']} site(s) actifs, DHIS2 {'configuré' if context['dhis2_configured'] else 'non configuré'}."
        ),
        "suggestions": ["Combien de captures à valider ?", "État DHIS2", "Modèles déployés"],
    }
