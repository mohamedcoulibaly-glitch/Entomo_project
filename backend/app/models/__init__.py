from app.db.session import Base  # noqa: F401 — expose Base for Alembic

from app.models.base import BaseModel  # noqa: F401
from app.models.role import Role, Permission  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.site import SiteSentinelle, SiteActivite  # noqa: F401
from app.models.capture import Capture  # noqa: F401
from app.models.dataset import Dataset, Annotation  # noqa: F401
from app.models.model import MLModel, RiskModel, ModelPipeline  # noqa: F401
from app.models.dhis2 import DHIS2Config, DHIS2Mapping, DHIS2Sync  # noqa: F401
from app.models.report import Rapport, RapportProgramme  # noqa: F401
from app.models.indicateur import Indicateur  # noqa: F401
from app.models.langue import Langue  # noqa: F401
from app.models.intervention import Intervention  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.campagne import Campagne  # noqa: F401
from app.models.reference import ReferenceData  # noqa: F401
from app.models.data_import import DataImport  # noqa: F401
from app.models.sync_preference import SyncPreference  # noqa: F401
from app.models.support import SupportTicket  # noqa: F401
from app.models.offline_queue import OfflineQueueItem  # noqa: F401
