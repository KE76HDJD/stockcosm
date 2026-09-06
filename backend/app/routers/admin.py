from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.database import get_db
from app.models.utilisateur import Utilisateur
from app.dependencies import get_current_user, require_role
from app.services.backup_service import BackupService

router = APIRouter(prefix="/api/admin", tags=["Administration - Backups"])


class ResetRequest(BaseModel):
    confirm: str


class RestoreRequest(BaseModel):
    filename: str


@router.get("/backups")
async def list_backups(
    current_user: Utilisateur = Depends(require_role("ADMIN")),
):
    return BackupService.list_backups()


@router.post("/backups")
async def create_backup(
    current_user: Utilisateur = Depends(require_role("ADMIN")),
):
    try:
        return BackupService.create_backup(reason="manual")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/backups/restore")
async def restore_backup(
    body: RestoreRequest,
    current_user: Utilisateur = Depends(require_role("ADMIN")),
):
    try:
        return BackupService.restore_backup(body.filename)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/backups/{filename}")
async def delete_backup(
    filename: str,
    current_user: Utilisateur = Depends(require_role("ADMIN")),
):
    try:
        return BackupService.delete_backup(filename)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/reset-data")
async def reset_data(
    body: ResetRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(require_role("ADMIN")),
):
    if body.confirm != "SUPPRIMER_TOUT":
        raise HTTPException(
            status_code=400,
            detail="Confirmation requise. Envoyez confirm: \"SUPPRIMER_TOUT\"",
        )

    try:
        backup = BackupService.create_backup(reason="pre-reset")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Échec du backup avant suppression: {e}",
        )

    from sqlalchemy import text
    await db.execute(text("DELETE FROM mouvements_stock"))
    await db.execute(text("DELETE FROM ventes_lignes"))
    await db.execute(text("DELETE FROM ventes"))
    await db.execute(text("DELETE FROM produits"))
    await db.execute(text("DELETE FROM categories"))
    await db.commit()

    return {
        "message": "Données supprimées",
        "backup_created": backup["filename"],
        "backup_size": backup["size_bytes"],
    }


@router.post("/seed")
async def run_seed(
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(require_role("ADMIN")),
):
    import uuid
    from app.models.categorie import Categorie
    from app.models.produit import Produit
    from sqlalchemy import select

    CATEGORIES_AND_PRODUCTS = {
        "Savons": [
            "Savon noir miracle", "Savon noir très blanchissant", "Petit savon noir",
            "Savon activateur d'éclair", "Savon gommant", "Savon métisse",
            "Savon extra blanchissant", "Savon yovo yovo", "Savon anti-vieillissement",
            "Vrai savon", "Savon cocktail", "Savon visage",
        ],
        "Laits et Teints": [
            "Teint métisse — étiquette jaune", "Teint métisse — étiquette blanche",
            "Lait cocktail crémeux", "Lait métisse",
        ],
        "Beurres": ["Beurre réactivateur", "Beurre éclair doré"],
        "Gels Douche": ["Gel douche métisse", "Gel douche anti-vieillissement", "Gel douche rose"],
        "Huiles": ["Huile HD", "Huile clarifiante"],
        "Crèmes Visage": ["Crème visage petite", "Crème visage", "Crème visage mamie"],
        "Pommades": ["Pommade de cheveux"],
    }

    result = await db.execute(select(Categorie))
    existing_cats = {c.name: c.id for c in result.scalars().all()}

    total_produits = 0
    total_cats = 0
    for cat_name, produits_list in CATEGORIES_AND_PRODUCTS.items():
        if cat_name in existing_cats:
            cat_id = existing_cats[cat_name]
        else:
            cat = Categorie(id=str(uuid.uuid4()), name=cat_name)
            db.add(cat)
            await db.flush()
            cat_id = cat.id
            total_cats += 1

        result = await db.execute(select(Produit).where(Produit.categorie_id == cat_id))
        existing_prods = {p.name for p in result.scalars().all()}

        for prod_name in produits_list:
            if prod_name not in existing_prods:
                produit = Produit(
                    id=str(uuid.uuid4()),
                    name=prod_name,
                    categorie_id=cat_id,
                    stock_quantity=0,
                    alert_threshold=10,
                )
                db.add(produit)
                total_produits += 1

    await db.commit()
    return {"message": f"Seed terminé : {total_cats} nouvelles catégories, {total_produits} nouveaux produits"}
