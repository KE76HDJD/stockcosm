from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case
from datetime import datetime, timedelta
from app.models.produit import Produit
from app.models.mouvement import MouvementStock


class AlerteService:
    @staticmethod
    async def get_alertes(db: AsyncSession) -> list[dict]:
        """Produits dont le stock <= seuil."""
        result = await db.execute(
            select(Produit)
            .where(
                and_(
                    Produit.status == "ACTIVE",
                    Produit.stock_quantity <= Produit.alert_threshold,
                )
            )
            .order_by(Produit.stock_quantity.asc())
        )
        produits = result.scalars().all()

        alertes = []
        for p in produits:
            if p.stock_quantity == 0:
                statut = "rupture"
            else:
                statut = "faible"
            alertes.append(
                {
                    "produit_id": p.id,
                    "produit_nom": p.name,
                    "stock_actuel": p.stock_quantity,
                    "seuil_alerte": p.alert_threshold,
                    "statut": statut,
                }
            )
        return alertes

    @staticmethod
    async def estimer_jours_avant_rupture(
        db: AsyncSession, produit_id: str
    ) -> int | None:
        """Moyenne mobile 7 jours: stock / moyenne sorties journalières."""
        result = await db.execute(
            select(Produit).where(Produit.id == produit_id)
        )
        produit = result.scalar_one_or_none()
        if produit is None or produit.stock_quantity == 0:
            return None

        il_y_a_7_jours = datetime.utcnow() - timedelta(days=7)
        result = await db.execute(
            select(
                func.coalesce(
                    func.sum(
                        case(
                            (MouvementStock.type == "OUT", MouvementStock.quantity),
                            (MouvementStock.type == "AUTRE_SORTIE", MouvementStock.quantity),
                            else_=0,
                        )
                    ),
                    0,
                )
            ).where(
                and_(
                    MouvementStock.produit_id == produit_id,
                    MouvementStock.created_at >= il_y_a_7_jours,
                )
            )
        )
        sorties_7_jours = result.scalar()

        if sorties_7_jours == 0:
            return None

        moyenne_journaliere = sorties_7_jours / 7
        jours = produit.stock_quantity / moyenne_journaliere
        return int(jours) + 1

    @staticmethod
    async def get_produits_en_risque(
        db: AsyncSession, jours_seuil: int = 7
    ) -> list[dict]:
        """Produits dont l'estimation de rupture est <= jours_seuil."""
        result = await db.execute(
            select(Produit).where(Produit.status == "ACTIVE")
        )
        produits = result.scalars().all()

        en_risque = []
        for p in produits:
            jours = await AlerteService.estimer_jours_avant_rupture(db, p.id)
            if jours is not None and jours <= jours_seuil:
                statut = "critique" if jours <= 3 else "faible"
                en_risque.append(
                    {
                        "produit_id": p.id,
                        "produit_nom": p.name,
                        "stock_actuel": p.stock_quantity,
                        "jours_estimes": jours,
                        "statut": statut,
                    }
                )

        return sorted(en_risque, key=lambda x: x["jours_estimes"])
