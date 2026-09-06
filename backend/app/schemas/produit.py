from pydantic import BaseModel
from datetime import datetime


class CategorieCreate(BaseModel):
    name: str


class CategorieResponse(BaseModel):
    id: str
    name: str
    product_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ProduitCreate(BaseModel):
    name: str
    categorie_id: str
    alert_threshold: int = 10


class ProduitUpdate(BaseModel):
    name: str | None = None
    categorie_id: str | None = None
    alert_threshold: int | None = None
    status: str | None = None


class ProduitResponse(BaseModel):
    id: str
    name: str
    categorie_id: str
    categorie_nom: str | None = None
    stock_quantity: int
    alert_threshold: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProduitStockResponse(BaseModel):
    produit_id: str
    produit_nom: str
    stock_actuel: int
    stock_reel: int
    alert_threshold: int
    statut: str
