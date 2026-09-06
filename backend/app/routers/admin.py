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
