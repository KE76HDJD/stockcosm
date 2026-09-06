from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text
from datetime import date, datetime, timedelta
from io import BytesIO
from app.database import get_db
from app.schemas.inventaire import InventaireResponse, LigneInventaire
from app.services.inventaire_service import InventaireService
from app.services.alerte_service import AlerteService
from app.services.stock_service import StockService
from app.models.utilisateur import Utilisateur
from app.models.produit import Produit
from app.models.categorie import Categorie
from app.models.mouvement import MouvementStock
from app.models.vente import Vente
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api", tags=["Inventaire & Dashboard"])


@router.get("/inventaire/quotidien")
async def get_inventaire_quotidien(
    date_jour: date | None = None,
    format: str = Query(default="json"),
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    if date_jour is None:
        date_jour = date.today()
    lignes = await InventaireService.calculer_inventaire(db, date_jour)
    total_sorties = sum(l["sorties"] for l in lignes)

    if format == "pdf":
        return await generer_pdf_inventaire(date_jour, lignes, total_sorties)

    return InventaireResponse(
        date=date_jour,
        genere_a=datetime.now().strftime("%H:%M:%S"),
        lignes=[LigneInventaire(**l) for l in lignes],
        total_sorties=total_sorties,
    )


async def generer_pdf_inventaire(
    date_jour: date, lignes: list[dict], total_sorties: int
):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate,
        Table,
        TableStyle,
        Paragraph,
        Spacer,
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    # Filtrer : uniquement les produits avec de l'activité
    lignes_actives = [
        l for l in lignes
        if l["entrees"] > 0 or l["sorties"] > 0 or l["retours"] > 0
    ]

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CustomTitle", parent=styles["Heading1"], fontSize=16, spaceAfter=10
    )
    subtitle_style = ParagraphStyle(
        "CustomSubtitle", parent=styles["Normal"], fontSize=10, spaceAfter=20
    )
    empty_style = ParagraphStyle(
        "EmptyNote", parent=styles["Normal"], fontSize=10, textColor=colors.grey, spaceAfter=10
    )

    elements = []

    elements.append(Paragraph("INVENTAIRE QUOTIDIEN", title_style))
    elements.append(
        Paragraph(
            f"Date : {date_jour.strftime('%d/%m/%Y')} | Généré à {datetime.now().strftime('%H:%M')}",
            subtitle_style,
        )
    )
    elements.append(Spacer(1, 10))

    if not lignes_actives:
        elements.append(Paragraph("Aucun mouvement enregistré pour cette journée.", empty_style))
    else:
        # Grouper par catégorie
        categories = {}
        for l in lignes_actives:
            cat = l["categorie_nom"]
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(l)

        for cat_name, cat_lignes in categories.items():
            elements.append(Paragraph(f"<b>{cat_name}</b>", styles["Heading2"]))
            elements.append(Spacer(1, 5))

            data = [["Produit", "Entrées", "Sorties", "Retours", "Stock"]]
            for l in cat_lignes:
                data.append(
                    [
                        l["produit_nom"],
                        str(l["entrees"]) if l["entrees"] > 0 else "-",
                        str(l["sorties"]) if l["sorties"] > 0 else "-",
                        str(l["retours"]) if l["retours"] > 0 else "-",
                        str(l["stock_cloture"]),
                    ]
                )

            table = Table(data, colWidths=[180, 70, 70, 70, 70])
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("ALIGN", (0, 0), (0, -1), "LEFT"),
                        ("FONTSIZE", (0, 0), (-1, 0), 9),
                        ("FONTSIZE", (0, 1), (-1, -1), 8),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                        ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                    ]
                )
            )
            elements.append(table)
            elements.append(Spacer(1, 15))

    elements.append(Spacer(1, 20))
    elements.append(
        Paragraph(
            f"<b>Total sorties du jour : {total_sorties}</b>",
            styles["Normal"],
        )
    )

    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="inventaire_{date_jour}.pdf"'
        },
    )


@router.get("/dashboard/alertes")
async def get_alertes(
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    return await AlerteService.get_alertes(db)


@router.get("/dashboard/rupture")
async def get_rupture(
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    return await AlerteService.get_produits_en_risque(db)


@router.get("/dashboard/resume")
async def get_resume(
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    today = date.today()
    debut_journee = datetime.combine(today, datetime.min.time())
    fin_journee = datetime.combine(today + timedelta(days=1), datetime.min.time())

    # Nombre total de produits actifs
    result = await db.execute(
        select(func.count(Produit.id)).where(Produit.status == "ACTIVE")
    )
    total_produits = result.scalar()

    # Entrées du jour (IN)
    result = await db.execute(
        select(func.coalesce(func.sum(MouvementStock.quantity), 0)).where(
            and_(
                MouvementStock.type == "IN",
                MouvementStock.created_at >= debut_journee,
                MouvementStock.created_at < fin_journee,
            )
        )
    )
    entrees_du_jour = result.scalar()

    # Unités vendues du jour (OUT uniquement)
    result = await db.execute(
        select(func.coalesce(func.sum(MouvementStock.quantity), 0)).where(
            and_(
                MouvementStock.type == "OUT",
                MouvementStock.created_at >= debut_journee,
                MouvementStock.created_at < fin_journee,
            )
        )
    )
    unites_vendues_du_jour = result.scalar()

    # Ventes du jour (nombre de ventes ACTIVE)
    result = await db.execute(
        select(func.count(Vente.id)).where(
            and_(
                Vente.status == "ACTIVE",
                Vente.created_at >= debut_journee,
                Vente.created_at < fin_journee,
            )
        )
    )
    ventes_du_jour = result.scalar()

    # Produits à surveiller
    alertes = await AlerteService.get_alertes(db)

    # Derniers mouvements
    derniers_mouvements = await StockService.mouvements_recents(db, limit=10)

    # Stock par catégorie
    result = await db.execute(
        select(
            Categorie.id,
            Categorie.name,
            func.coalesce(func.sum(Produit.stock_quantity), 0).label("total_stock"),
            func.count(Produit.id).filter(Produit.status == "ACTIVE").label("product_count"),
        )
        .outerjoin(Produit, Categorie.id == Produit.categorie_id)
        .group_by(Categorie.id, Categorie.name)
        .order_by(Categorie.name)
    )
    stock_par_categorie = [
        {"id": str(row[0]), "name": row[1], "total_stock": row[2], "product_count": row[3]}
        for row in result.all()
    ]

    total_stock_general = sum(cat["total_stock"] for cat in stock_par_categorie)

    return {
        "total_produits_disponibles": total_produits,
        "total_stock_general": total_stock_general,
        "entrees_du_jour": entrees_du_jour,
        "unites_vendues_du_jour": unites_vendues_du_jour,
        "ventes_du_jour": ventes_du_jour,
        "produits_en_alerte": len(alertes),
        "produits_a_surveiller": alertes,
        "derniers_mouvements": derniers_mouvements,
        "stock_par_categorie": stock_par_categorie,
    }


@router.get("/dashboard/categories")
async def get_categories_resume(
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    result = await db.execute(
        select(
            Categorie,
            func.coalesce(
                func.count(Produit.id).filter(Produit.status == "ACTIVE"), 0
            ).label("count"),
        )
        .outerjoin(Produit, Categorie.id == Produit.categorie_id)
        .group_by(Categorie.id)
        .order_by(Categorie.name)
    )
    return [{"id": cat.id, "name": cat.name, "count": count} for cat, count in result.all()]


@router.get("/dashboard/categories/{categorie_id}/produits")
async def get_produits_by_categorie_dashboard(
    categorie_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    cat_result = await db.execute(
        select(Categorie).where(Categorie.id == categorie_id)
    )
    cat = cat_result.scalar_one_or_none()
    if cat is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Catégorie introuvable")

    result = await db.execute(
        select(Produit)
        .where(Produit.categorie_id == categorie_id, Produit.status == "ACTIVE")
        .order_by(Produit.name)
    )
    produits = result.scalars().all()
    return {
        "categorie": cat.name,
        "produits": [
            {
                "id": p.id,
                "name": p.name,
                "stock_quantity": p.stock_quantity,
                "alert_threshold": p.alert_threshold,
                "statut": "rupture" if p.stock_quantity == 0
                else "faible" if p.stock_quantity <= p.alert_threshold
                else "normal",
            }
            for p in produits
        ],
    }


@router.get("/dashboard/utilisateurs")
async def list_utilisateurs(
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    from app.models.utilisateur import Utilisateur as UserModel
    result = await db.execute(select(UserModel).order_by(UserModel.created_at))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("/dashboard/utilisateurs")
async def create_utilisateur(
    username: str,
    password: str,
    role: str = "ASSISTANT",
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(require_role("ADMIN")),
):
    from app.models.utilisateur import Utilisateur as UserModel
    from app.utils.security import hash_password
    user = UserModel(
        username=username,
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)
    await db.flush()
    await db.commit()
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.get("/stats/jour")
async def stats_jour(
    date_jour: date | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    if date_jour is None:
        date_jour = date.today()
    return await InventaireService.stats_jour(db, date_jour)


@router.get("/stats/mois")
async def stats_mois(
    year: int | None = None,
    month: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    if year is None:
        year = datetime.now().year
    if month is None:
        month = datetime.now().month
    return await InventaireService.stats_mois(db, year, month)
