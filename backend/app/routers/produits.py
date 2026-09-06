from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.produit import (
    CategorieCreate,
    CategorieResponse,
    ProduitCreate,
    ProduitUpdate,
    ProduitResponse,
    ProduitStockResponse,
)
from app.services.categorie_service import CategorieService
from app.services.stock_service import StockService, MOUVEMENT_LABELS
from app.models.utilisateur import Utilisateur
from app.models.produit import Produit
from app.models.categorie import Categorie
from app.dependencies import get_current_user, require_role
from sqlalchemy import select, func

router = APIRouter(prefix="/api", tags=["Produits"])


@router.get("/categories")
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    return await CategorieService.list_all(db)


@router.post("/categories", response_model=CategorieResponse)
async def create_categorie(
    request: CategorieCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(require_role("ADMIN")),
):
    cat = await CategorieService.create(db, request.name)
    await db.commit()
    return CategorieResponse(id=cat.id, name=cat.name, product_count=0, created_at=cat.created_at)


@router.get("/categories/{categorie_id}/produits")
async def get_produits_by_categorie(
    categorie_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    cat = await CategorieService.get_by_id(db, categorie_id)
    if cat is None:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")
    produits = await CategorieService.get_produits_by_categorie(db, categorie_id)
    return {"categorie": cat.name, "produits": produits}


@router.get("/produits", response_model=list[ProduitResponse])
async def list_produits(
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    query = (
        select(Produit, Categorie.name.label("categorie_nom"))
        .join(Categorie, Produit.categorie_id == Categorie.id)
    )
    if search:
        query = query.where(Produit.name.ilike(f"%{search}%"))
    query = query.order_by(Produit.name)
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    return [
        ProduitResponse(
            id=p.id,
            name=p.name,
            categorie_id=p.categorie_id,
            categorie_nom=c,
            stock_quantity=p.stock_quantity,
            alert_threshold=p.alert_threshold,
            status=p.status,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p, c in rows
    ]


@router.post("/produits", response_model=ProduitResponse)
async def create_produit(
    request: ProduitCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    produit = Produit(
        name=request.name,
        categorie_id=request.categorie_id,
        stock_quantity=0,
        alert_threshold=request.alert_threshold,
    )
    db.add(produit)
    await db.flush()
    await db.commit()

    result = await db.execute(
        select(Categorie.name).where(Categorie.id == request.categorie_id)
    )
    cat_nom = result.scalar()

    return ProduitResponse(
        id=produit.id,
        name=produit.name,
        categorie_id=produit.categorie_id,
        categorie_nom=cat_nom,
        stock_quantity=produit.stock_quantity,
        alert_threshold=produit.alert_threshold,
        status=produit.status,
        created_at=produit.created_at,
        updated_at=produit.updated_at,
    )


# IMPORTANT: Routes spécifiques AVANT la route catch-all /{produit_id}
@router.get("/produits/{produit_id}/stock", response_model=ProduitStockResponse)
async def get_stock_produit(
    produit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    result = await db.execute(
        select(Produit).where(Produit.id == produit_id)
    )
    produit = result.scalar_one_or_none()
    if produit is None:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    stock_reel = await StockService.get_stock_reel(db, produit_id)

    if produit.stock_quantity == 0:
        statut = "rupture"
    elif produit.stock_quantity <= produit.alert_threshold:
        statut = "faible"
    else:
        statut = "normal"

    return ProduitStockResponse(
        produit_id=produit.id,
        produit_nom=produit.name,
        stock_actuel=produit.stock_quantity,
        stock_reel=stock_reel,
        alert_threshold=produit.alert_threshold,
        statut=statut,
    )


@router.get("/produits/{produit_id}/mouvements")
async def get_mouvements_produit(
    produit_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    from app.models.mouvement import MouvementStock
    from app.models.utilisateur import Utilisateur as UserModel

    count_query = select(func.count(MouvementStock.id)).where(MouvementStock.produit_id == produit_id)
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    offset = (page - 1) * limit
    query = (
        select(MouvementStock, UserModel.username.label("user_nom"))
        .join(UserModel, MouvementStock.user_id == UserModel.id)
        .where(MouvementStock.produit_id == produit_id)
        .order_by(MouvementStock.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.all()

    return {
        "mouvements": [
            {
                "id": m.id,
                "type": m.type,
                "type_label": MOUVEMENT_LABELS.get(m.type, m.type),
                "quantity": m.quantity,
                "stock_before": m.stock_before,
                "stock_after": m.stock_after,
                "user_nom": u_nom,
                "created_at": m.created_at.isoformat(),
            }
            for m, u_nom in rows
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.patch("/produits/{produit_id}/archive")
async def archive_produit(
    produit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(require_role("ADMIN")),
):
    result = await db.execute(
        select(Produit).where(Produit.id == produit_id)
    )
    produit = result.scalar_one_or_none()
    if produit is None:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    produit.status = "INACTIVE"
    await db.flush()
    await db.commit()
    return {"message": "Produit archivé avec succès"}


# Route catch-all /{produit_id} en DERNIER
@router.get("/produits/{produit_id}", response_model=ProduitResponse)
async def get_produit(
    produit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    result = await db.execute(
        select(Produit, Categorie.name.label("categorie_nom"))
        .join(Categorie, Produit.categorie_id == Categorie.id)
        .where(Produit.id == produit_id)
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    p, c = row
    return ProduitResponse(
        id=p.id,
        name=p.name,
        categorie_id=p.categorie_id,
        categorie_nom=c,
        stock_quantity=p.stock_quantity,
        alert_threshold=p.alert_threshold,
        status=p.status,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.put("/produits/{produit_id}", response_model=ProduitResponse)
async def update_produit(
    produit_id: str,
    request: ProduitUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    result = await db.execute(
        select(Produit).where(Produit.id == produit_id)
    )
    produit = result.scalar_one_or_none()
    if produit is None:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    if request.name is not None:
        produit.name = request.name
    if request.categorie_id is not None:
        produit.categorie_id = request.categorie_id
    if request.alert_threshold is not None:
        produit.alert_threshold = request.alert_threshold
    if request.status is not None:
        produit.status = request.status

    await db.flush()
    await db.commit()

    result = await db.execute(
        select(Categorie.name).where(Categorie.id == produit.categorie_id)
    )
    cat_nom = result.scalar()

    return ProduitResponse(
        id=produit.id,
        name=produit.name,
        categorie_id=produit.categorie_id,
        categorie_nom=cat_nom,
        stock_quantity=produit.stock_quantity,
        alert_threshold=produit.alert_threshold,
        status=produit.status,
        created_at=produit.created_at,
        updated_at=produit.updated_at,
    )
