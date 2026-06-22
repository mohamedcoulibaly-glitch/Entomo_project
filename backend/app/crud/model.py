from typing import List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.model import MLModel, RiskModel, ModelPipeline


class CRUDMLModel(CRUDBase):
    def get_deployes(self, db: Session) -> List[MLModel]:
        return db.query(MLModel).filter(MLModel.deploye == True).all()

    def get_actifs(self, db: Session) -> List[MLModel]:
        return db.query(MLModel).filter(MLModel.actif == True).all()

    def deployer(self, db: Session, *, model_id: int, deploye: bool) -> MLModel:
        model = self.get(db, id=model_id)
        if model:
            model.deploye = deploye
            db.commit()
            db.refresh(model)
        return model


class CRUDRiskModel(CRUDBase):
    def get_actifs(self, db: Session) -> List[RiskModel]:
        return db.query(RiskModel).filter(RiskModel.actif == True).all()

    def get_deployes(self, db: Session) -> List[RiskModel]:
        return db.query(RiskModel).filter(RiskModel.deploye == True).all()


class CRUDModelPipeline(CRUDBase):
    def get_by_model(self, db: Session, *, model_id: int) -> List[ModelPipeline]:
        return db.query(ModelPipeline).filter(ModelPipeline.ml_model_id == model_id).all()

    def get_en_cours(self, db: Session) -> List[ModelPipeline]:
        return db.query(ModelPipeline).filter(ModelPipeline.statut == "en_cours").all()


crud_ml_model = CRUDMLModel(MLModel)
crud_risk_model = CRUDRiskModel(RiskModel)
crud_pipeline = CRUDModelPipeline(ModelPipeline)
