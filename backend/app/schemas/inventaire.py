from pydantic import BaseModel
from datetime import date


class LigneInventaire(BaseModel):
    produit_id: str
    produit_nom: str
    categorie_nom: str
    stock_ouverture: int
    entrees: int
    sorties: int
    retours: int
    stock_cloture: int
    alert_threshold: int
    statut: str


class InventaireResponse(BaseModel):
    date: date
    genere_a: str
    lignes: list[LigneInventaire]
    total_sorties: int
