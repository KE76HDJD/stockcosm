from pydantic import BaseModel
from datetime import datetime


class VenteLigneCreate(BaseModel):
    produit_id: str
    quantity: int


class VenteCreate(BaseModel):
    type: str = "SIMPLE"
    lignes: list[VenteLigneCreate] = []
    notes: str | None = None


class VenteLigneResponse(BaseModel):
    id: str
    produit_id: str
    produit_nom: str | None = None
    quantity: int

    class Config:
        from_attributes = True


class VenteResponse(BaseModel):
    id: str
    user_id: str
    user_nom: str | None = None
    type: str
    status: str
    notes: str | None
    lignes: list[VenteLigneResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class VenteAnnulationResponse(BaseModel):
    message: str
    vente_id: str
