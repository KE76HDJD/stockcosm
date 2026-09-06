from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date
from app.database import get_db
from app.schemas.vente import (
    VenteCreate,
    VenteResponse,
    VenteLigneResponse,
    VenteAnnulationResponse,
)
from app.schemas.mouvement import EntreeCreate, SortieCreate, AjustementCreate
from app.services.vente_service import VenteService
from app.services.stock_service import StockService, MOUVEMENT_LABELS
from app.models.utilisateur import Utilisateur
from app.utils.audit import log_sale, log_stock_change
from app.models.vente import VenteLigne
from app.models.produit import Produit
from app.models.mouvement import MouvementStock
from app.dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["Ventes & Stock"])


def _mouvement_response(m, prod_nom, user_nom) -> dict:
    return {
        "id": m.id,
        "produit_id": m.produit_id,
        "produit_nom": prod_nom,
        "vente_id": m.vente_id,
        "type": m.type,
        "type_label": MOUVEMENT_LABELS.get(m.type, m.type),
        "quantity": m.quantity,
        "stock_before": m.stock_before,
        "stock_after": m.stock_after,
        "user_nom": user_nom,
        "created_at": m.created_at,
    }


def _vente_response(vente, user_nom, lignes) -> VenteResponse:
    return VenteResponse(
        id=vente.id,
        user_id=vente.user_id,
        user_nom=user_nom,
        type=vente.type,
        status=vente.status,
        notes=vente.notes,
        lignes=lignes,
        created_at=vente.created_at,
    )


async def _get_lignes_with_noms(db: AsyncSession, vente_id: str) -> list[VenteLigneResponse]:
    result = await db.execute(
        select(VenteLigne, Produit.name.label("produit_nom"))
        .join(Produit, VenteLigne.produit_id == Produit.id)
        .where(VenteLigne.vente_id == vente_id)
    )
    return [
        VenteLigneResponse(
            id=ligne.id,
            produit_id=ligne.produit_id,
            produit_nom=pnom,
            quantity=ligne.quantity,
        )
        for ligne, pnom in result.all()
    ]


# ─── VENTES ────────────────────────────────────────────

@router.post("/ventes", response_model=VenteResponse)
async def create_vente(
    request: VenteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    if not request.lignes:
        raise HTTPException(
            status_code=400,
            detail="Au moins une ligne requise",
        )

    lignes_dict = [l.model_dump() for l in request.lignes]
    vente = await VenteService.creer_vente(
        db=db,
        user_id=current_user.id,
        type_vente=request.type,
        lignes=lignes_dict,
        notes=request.notes,
    )

    await db.commit()

    ligne_responses = await _get_lignes_with_noms(db, vente.id)
    log_sale("VENTE_CREATE", current_user.id, vente.id, f"type={request.type} lignes={len(request.lignes)}")
    return _vente_response(vente, current_user.username, ligne_responses)


@router.get("/ventes", response_model=dict)
async def list_ventes(
    date_from: date | None = None,
    date_to: date | None = None,
    user_id: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    result = await VenteService.list_ventes(
        db, date_from, date_to, user_id, page, limit
    )

    ventes = result["ventes"]
    if not ventes:
        return {
            "ventes": [],
            "total": result["total"],
            "page": result["page"],
            "limit": result["limit"],
            "pages": result["pages"],
        }

    vente_ids = [v.id for v in ventes]

    lignes_result = await db.execute(
        select(VenteLigne, Produit.name.label("produit_nom"))
        .join(Produit, VenteLigne.produit_id == Produit.id)
        .where(VenteLigne.vente_id.in_(vente_ids))
    )
    lignes_rows = lignes_result.all()

    lignes_by_vente: dict[str, list] = {}
    for ligne, pnom in lignes_rows:
        lignes_by_vente.setdefault(ligne.vente_id, []).append(
            VenteLigneResponse(
                id=ligne.id,
                produit_id=ligne.produit_id,
                produit_nom=pnom,
                quantity=ligne.quantity,
            )
        )

    user_ids = list({v.user_id for v in ventes})
    users_result = await db.execute(
        select(Utilisateur.id, Utilisateur.username).where(Utilisateur.id.in_(user_ids))
    )
    user_map = {uid: uname for uid, uname in users_result.all()}

    ventes_response = [
        _vente_response(v, user_map.get(v.user_id, ""), lignes_by_vente.get(v.id, []))
        for v in ventes
    ]

    return {
        "ventes": ventes_response,
        "total": result["total"],
        "page": result["page"],
        "limit": result["limit"],
        "pages": result["pages"],
    }


@router.get("/ventes/{vente_id}", response_model=VenteResponse)
async def get_vente(
    vente_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    vente = await VenteService.get_vente_by_id(db, vente_id)
    if vente is None:
        raise HTTPException(status_code=404, detail="Vente introuvable")

    ligne_responses = await _get_lignes_with_noms(db, vente.id)

    user_result = await db.execute(
        select(Utilisateur.username).where(Utilisateur.id == vente.user_id)
    )
    user_nom = user_result.scalar()

    return _vente_response(vente, user_nom, ligne_responses)


@router.post("/ventes/{vente_id}/annuler", response_model=VenteAnnulationResponse)
async def annuler_vente(
    vente_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    result = await VenteService.annuler_vente(db, vente_id, current_user.id)
    await db.commit()
    log_sale("VENTE_CANCEL", current_user.id, vente_id)
    return VenteAnnulationResponse(**result)


# ─── ENTRÉES DE STOCK ──────────────────────────────────

@router.post("/entrees")
async def create_entree(
    request: EntreeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    mouvement = await StockService.entrer_stock(
        db=db,
        produit_id=request.produit_id,
        quantite=request.quantity,
        user_id=current_user.id,
    )
    await db.commit()

    prod_result = await db.execute(
        select(Produit.name).where(Produit.id == mouvement.produit_id)
    )
    prod_nom = prod_result.scalar()

    log_stock_change("STOCK_ENTRY", current_user.id, request.produit_id, f"qty={request.quantity}")
    return _mouvement_response(mouvement, prod_nom, current_user.username)
    result = await db.execute(
        select(MouvementStock, Produit.name.label("produit_nom"), Utilisateur.username.label("user_nom"))
        .join(Produit, MouvementStock.produit_id == Produit.id)
        .join(Utilisateur, MouvementStock.user_id == Utilisateur.id)
        .where(MouvementStock.type == "IN")
        .order_by(MouvementStock.created_at.desc())
        .limit(100)
    )
    rows = result.all()

    return [_mouvement_response(m, pnom, unom) for m, pnom, unom in rows]


# ─── SORTIES DE STOCK ──────────────────────────────────

@router.post("/sorties")
async def create_sortie(
    request: SortieCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    try:
        mouvement = await StockService.sortir_stock(
            db=db,
            produit_id=request.produit_id,
            quantite=request.quantity,
            user_id=current_user.id,
            raison=request.raison,
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    await db.commit()

    prod_result = await db.execute(
        select(Produit.name).where(Produit.id == mouvement.produit_id)
    )
    prod_nom = prod_result.scalar()

    log_stock_change("STOCK_EXIT", current_user.id, request.produit_id, f"qty={request.quantity} raison={request.raison}")
    return _mouvement_response(mouvement, prod_nom, current_user.username)


# ─── AJUSTEMENTS ───────────────────────────────────────

@router.post("/ajustements")
async def create_ajustement(
    request: AjustementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    mouvement = await StockService.ajuster_stock(
        db=db,
        produit_id=request.produit_id,
        nouvelle_quantite=request.nouvelle_quantite,
        user_id=current_user.id,
        raison=request.raison,
    )
    await db.commit()

    prod_result = await db.execute(
        select(Produit.name).where(Produit.id == mouvement.produit_id)
    )
    prod_nom = prod_result.scalar()

    log_stock_change("STOCK_ADJUST", current_user.id, request.produit_id, f"new_qty={request.nouvelle_quantite}")
    return _mouvement_response(mouvement, prod_nom, current_user.username)


# ─── MOUVEMENTS GLOBAL ─────────────────────────────────

@router.get("/mouvements")
async def list_mouvements(
    produit_id: str | None = None,
    type: str | None = None,
    user_id: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    return await StockService.list_mouvements(
        db,
        produit_id=produit_id,
        type_mouvement=type,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
        page=page,
        limit=limit,
    )
