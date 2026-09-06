from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case
from datetime import datetime, date, timedelta
from app.models.produit import Produit
from app.models.categorie import Categorie
from app.models.mouvement import MouvementStock
from app.models.vente import Vente, VenteLigne


class InventaireService:
    @staticmethod
    async def calculer_inventaire(
        db: AsyncSession, date_jour: date
    ) -> list[dict]:
        """Inventaire complet pour une date donnée — requêtes batch (3 queries fixes)."""
        debut_journee = datetime.combine(date_jour, datetime.min.time())
        fin_journee = datetime.combine(date_jour + timedelta(days=1), datetime.min.time())

        # 1. Récupérer tous les produits actifs avec leur catégorie
        result = await db.execute(
            select(Produit, Categorie.name.label("categorie_nom"))
            .join(Categorie, Produit.categorie_id == Categorie.id)
            .where(Produit.status == "ACTIVE")
            .order_by(Categorie.name, Produit.name)
        )
        produits = result.all()

        if not produits:
            return []

        # 2. Batch query : ouverture pour TOUS les produits (somme des mouvements AVANT la date)
        ouvertures_result = await db.execute(
            select(
                MouvementStock.produit_id,
                func.coalesce(
                    func.sum(
                        case(
                            (MouvementStock.type == "IN", MouvementStock.quantity),
                            (MouvementStock.type == "RETURN", MouvementStock.quantity),
                            else_=-MouvementStock.quantity,
                        )
                    ),
                    0,
                ).label("ouverture"),
            )
            .where(MouvementStock.created_at < debut_journee)
            .group_by(MouvementStock.produit_id)
        )
        ouvertures = {row[0]: row[1] for row in ouvertures_result.all()}

        # 3. Batch query : mouvements du jour pour TOUS les produits
        mouvements_result = await db.execute(
            select(
                MouvementStock.produit_id,
                MouvementStock.type,
                func.coalesce(func.sum(MouvementStock.quantity), 0).label("total"),
            )
            .where(
                and_(
                    MouvementStock.created_at >= debut_journee,
                    MouvementStock.created_at < fin_journee,
                )
            )
            .group_by(MouvementStock.produit_id, MouvementStock.type)
        )
        mouvements_du_jour: dict[str, dict[str, int]] = {}
        for produit_id, type_mvt, total in mouvements_result.all():
            if produit_id not in mouvements_du_jour:
                mouvements_du_jour[produit_id] = {}
            mouvements_du_jour[produit_id][type_mvt] = total

        # 4. Assembler l'inventaire (aucune requête DB supplémentaire)
        inventaire = []
        for produit, categorie_nom in produits:
            ouverture = ouvertures.get(produit.id, 0)
            mouvs = mouvements_du_jour.get(produit.id, {})
            entrees = mouvs.get("IN", 0)
            sorties = mouvs.get("OUT", 0) + mouvs.get("AUTRE_SORTIE", 0)
            retours = mouvs.get("RETURN", 0)
            cloture = ouverture + entrees - sorties + retours

            if cloture == 0:
                statut = "rupture"
            elif cloture <= produit.alert_threshold:
                statut = "faible"
            else:
                statut = "normal"

            inventaire.append(
                {
                    "produit_id": produit.id,
                    "produit_nom": produit.name,
                    "categorie_nom": categorie_nom,
                    "stock_ouverture": ouverture,
                    "entrees": entrees,
                    "sorties": sorties,
                    "retours": retours,
                    "stock_cloture": cloture,
                    "alert_threshold": produit.alert_threshold,
                    "statut": statut,
                }
            )

        return inventaire

    @staticmethod
    async def stats_jour(db: AsyncSession, date_jour: date) -> dict:
        """Stats pour un jour donné."""
        debut = datetime.combine(date_jour, datetime.min.time())
        fin = datetime.combine(date_jour + timedelta(days=1), datetime.min.time())

        result = await db.execute(
            select(func.count(Vente.id)).where(
                and_(
                    Vente.created_at >= debut,
                    Vente.created_at < fin,
                    Vente.status == "ACTIVE",
                )
            )
        )
        total_ventes = result.scalar()

        result = await db.execute(
            select(
                Produit.name,
                func.sum(VenteLigne.quantity).label("quantite"),
            )
            .join(Vente, VenteLigne.vente_id == Vente.id)
            .join(Produit, VenteLigne.produit_id == Produit.id)
            .where(
                and_(
                    Vente.created_at >= debut,
                    Vente.created_at < fin,
                    Vente.status == "ACTIVE",
                )
            )
            .group_by(Produit.name)
            .order_by(func.sum(VenteLigne.quantity).desc())
        )
        par_produit = [
            {"produit": r[0], "quantite": r[1]}
            for r in result.all()
        ]

        return {
            "date": date_jour.isoformat(),
            "total_ventes": total_ventes,
            "par_produit": par_produit,
        }

    @staticmethod
    async def stats_mois(
        db: AsyncSession, year: int, month: int
    ) -> dict:
        """Stats pour un mois donné."""
        debut = datetime(year, month, 1)
        if month == 12:
            fin = datetime(year + 1, 1, 1)
        else:
            fin = datetime(year, month + 1, 1)

        result = await db.execute(
            select(func.count(Vente.id)).where(
                and_(
                    Vente.created_at >= debut,
                    Vente.created_at < fin,
                    Vente.status == "ACTIVE",
                )
            )
        )
        total_ventes = result.scalar()

        result = await db.execute(
            select(
                Produit.name,
                func.sum(VenteLigne.quantity).label("quantite"),
            )
            .join(Vente, VenteLigne.vente_id == Vente.id)
            .join(Produit, VenteLigne.produit_id == Produit.id)
            .where(
                and_(
                    Vente.created_at >= debut,
                    Vente.created_at < fin,
                    Vente.status == "ACTIVE",
                )
            )
            .group_by(Produit.name)
            .order_by(func.sum(VenteLigne.quantity).desc())
            .limit(10)
        )
        top_produits = [
            {"produit": r[0], "quantite": r[1]}
            for r in result.all()
        ]

        return {
            "periode": f"{year}-{month:02d}",
            "total_ventes": total_ventes,
            "top_produits": top_produits,
        }
