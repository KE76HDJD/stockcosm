from pydantic import BaseModel, Field
from datetime import datetime

MAX_QUANTITY = 1_000_000


class MouvementResponse(BaseModel):
    id: str
    produit_id: str
    produit_nom: str | None = None
    vente_id: str | None
    type: str
    type_label: str
    quantity: int
    stock_before: int
    stock_after: int
    user_nom: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class EntreeCreate(BaseModel):
    produit_id: str
    quantity: int = Field(gt=0, le=MAX_QUANTITY, description="La quantité doit être entre 1 et 1 000 000")


class SortieCreate(BaseModel):
    produit_id: str
    quantity: int = Field(gt=0, le=MAX_QUANTITY, description="La quantité doit être entre 1 et 1 000 000")
    raison: str | None = None


class AjustementCreate(BaseModel):
    produit_id: str
    nouvelle_quantite: int = Field(ge=0, le=MAX_QUANTITY, description="La quantité doit être entre 0 et 1 000 000")
    raison: str | None = None
