from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, text, update
from datetime import datetime, date
from app.models.produit import Produit
from app.models.mouvement import MouvementStock
from app.models.utilisateur import Utilisateur


MOUVEMENT_LABELS = {
    "IN": "Ajout au stock",
    "OUT": "Vente",
    "RETURN": "Retour",
    "AUTRE_SORTIE": "Autre sortie",
    "AJUSTEMENT": "Ajustement",
}


class StockService:
    @staticmethod
    async def get_stock_actuel(db: AsyncSession, produit_id: str) -> int:
        result = await db.execute(
            select(Produit).where(Produit.id == produit_id)
        )
        produit = result.scalar_one_or_none()
        if produit is None:
            return 0
        return produit.stock_quantity

    @staticmethod
    async def get_stock_actuel_for_update(db: AsyncSession, produit_id: str) -> int:
        result = await db.execute(
            select(Produit)
            .where(Produit.id == produit_id)
            .with_for_update()
        )
        produit = result.scalar_one_or_none()
        if produit is None:
            return 0
        return produit.stock_quantity

    @staticmethod
    async def get_stock_reel(db: AsyncSession, produit_id: str) -> int:
        result = await db.execute(
            select(
                func.coalesce(
                    func.sum(
                        case(
                            (MouvementStock.type == "IN", MouvementStock.quantity),
                            (MouvementStock.type == "RETURN", MouvementStock.quantity),
                            else_=-MouvementStock.quantity,
                        )
                    ),
                    0,
                )
            ).where(MouvementStock.produit_id == produit_id)
        )
        return result.scalar()

    @staticmethod
    async def verifier_stock_suffisant(
        db: AsyncSession, produit_id: str, quantite_demandee: int
    ) -> bool:
        stock = await StockService.get_stock_actuel(db, produit_id)
        return stock >= quantite_demandee

    @staticmethod
    async def _atomic_decrement(
        db: AsyncSession, produit_id: str, quantite: int
    ) -> int:
        result = await db.execute(
            text(
                "UPDATE produits SET stock_quantity = stock_quantity - :qty, "
                "updated_at = now() "
                "WHERE id = :pid AND stock_quantity >= :qty "
                "RETURNING stock_quantity"
            ),
            {"qty": quantite, "pid": produit_id},
        )
        row = result.fetchone()
        if row is None:
            return -1
        return row[0]

    @staticmethod
    async def _atomic_increment(
        db: AsyncSession, produit_id: str, quantite: int
    ) -> int:
        result = await db.execute(
            text(
                "UPDATE produits SET stock_quantity = stock_quantity + :qty, "
                "updated_at = now() "
                "WHERE id = :pid "
                "RETURNING stock_quantity"
            ),
            {"qty": quantite, "pid": produit_id},
        )
        row = result.fetchone()
        return row[0] if row else -1

    @staticmethod
    async def _atomic_set(
        db: AsyncSession, produit_id: str, nouvelle_quantite: int
    ) -> int:
        result = await db.execute(
            text(
                "UPDATE produits SET stock_quantity = :qty, "
                "updated_at = now() "
                "WHERE id = :pid "
                "RETURNING stock_quantity"
            ),
            {"qty": nouvelle_quantite, "pid": produit_id},
        )
        row = result.fetchone()
        return row[0] if row else -1

    @staticmethod
    async def creer_mouvement(
        db: AsyncSession,
        produit_id: str,
        type_mouvement: str,
        quantite: int,
        user_id: str,
        vente_id: str | None = None,
    ) -> MouvementStock:
        if type_mouvement in ("OUT", "AUTRE_SORTIE"):
            new_stock = await StockService._atomic_decrement(db, produit_id, quantite)
            if new_stock < 0:
                result = await db.execute(
                    select(Produit).where(Produit.id == produit_id)
                )
                produit = result.scalar_one()
                raise ValueError(
                    f"Stock insuffisant pour '{produit.name}': "
                    f"demandé {quantite}, disponible {produit.stock_quantity}"
                )
            stock_before = new_stock + quantite
            stock_after = new_stock
        elif type_mouvement in ("IN", "RETURN"):
            new_stock = await StockService._atomic_increment(db, produit_id, quantite)
            stock_before = new_stock - quantite
            stock_after = new_stock
        elif type_mouvement == "AJUSTEMENT":
            new_stock = await StockService._atomic_set(db, produit_id, quantite)
            stock_before = quantite
            stock_after = new_stock
        else:
            raise ValueError(f"Type de mouvement inconnu: {type_mouvement}")

        mouvement = MouvementStock(
            produit_id=produit_id,
            type=type_mouvement,
            quantity=quantite,
            stock_before=stock_before,
            stock_after=stock_after,
            user_id=user_id,
            vente_id=vente_id,
        )
        db.add(mouvement)
        await db.flush()
        return mouvement

    @staticmethod
    async def historique_mouvements(
        db: AsyncSession,
        produit_id: str,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[MouvementStock]:
        query = select(MouvementStock).where(
            MouvementStock.produit_id == produit_id
        )
        if date_from:
            query = query.where(
                MouvementStock.created_at >= datetime.combine(
                    date_from, datetime.min.time()
                )
            )
        if date_to:
            query = query.where(
                MouvementStock.created_at <= datetime.combine(
                    date_to, datetime.max.time()
                )
            )
        query = query.order_by(MouvementStock.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def mouvements_recents(
        db: AsyncSession,
        limit: int = 10,
    ) -> list[dict]:
        query = (
            select(MouvementStock, Produit.name.label("produit_nom"), Utilisateur.username.label("user_nom"))
            .join(Produit, MouvementStock.produit_id == Produit.id)
            .join(Utilisateur, MouvementStock.user_id == Utilisateur.id)
            .order_by(MouvementStock.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        rows = result.all()
        return [
            {
                "id": m.id,
                "produit_nom": p_nom,
                "type": m.type,
                "type_label": MOUVEMENT_LABELS.get(m.type, m.type),
                "quantity": m.quantity,
                "stock_before": m.stock_before,
                "stock_after": m.stock_after,
                "user_nom": u_nom,
                "created_at": m.created_at.isoformat(),
            }
            for m, p_nom, u_nom in rows
        ]

    @staticmethod
    async def list_mouvements(
        db: AsyncSession,
        produit_id: str | None = None,
        type_mouvement: str | None = None,
        user_id: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        page: int = 1,
        limit: int = 50,
    ) -> dict:
        query = (
            select(MouvementStock, Produit.name.label("produit_nom"), Utilisateur.username.label("user_nom"))
            .join(Produit, MouvementStock.produit_id == Produit.id)
            .join(Utilisateur, MouvementStock.user_id == Utilisateur.id)
        )
        count_query = select(func.count(MouvementStock.id))

        if produit_id:
            query = query.where(MouvementStock.produit_id == produit_id)
            count_query = count_query.where(MouvementStock.produit_id == produit_id)
        if type_mouvement:
            query = query.where(MouvementStock.type == type_mouvement)
            count_query = count_query.where(MouvementStock.type == type_mouvement)
        if user_id:
            query = query.where(MouvementStock.user_id == user_id)
            count_query = count_query.where(MouvementStock.user_id == user_id)
        if date_from:
            dt_from = datetime.combine(date_from, datetime.min.time())
            query = query.where(MouvementStock.created_at >= dt_from)
            count_query = count_query.where(MouvementStock.created_at >= dt_from)
        if date_to:
            dt_to = datetime.combine(date_to, datetime.max.time())
            query = query.where(MouvementStock.created_at <= dt_to)
            count_query = count_query.where(MouvementStock.created_at <= dt_to)

        total_result = await db.execute(count_query)
        total = total_result.scalar()

        offset = (page - 1) * limit
        query = query.order_by(MouvementStock.created_at.desc()).offset(offset).limit(limit)
        result = await db.execute(query)
        rows = result.all()

        return {
            "mouvements": [
                {
                    "id": m.id,
                    "produit_id": m.produit_id,
                    "produit_nom": p_nom,
                    "vente_id": m.vente_id,
                    "type": m.type,
                    "type_label": MOUVEMENT_LABELS.get(m.type, m.type),
                    "quantity": m.quantity,
                    "stock_before": m.stock_before,
                    "stock_after": m.stock_after,
                    "user_nom": u_nom,
                    "created_at": m.created_at.isoformat(),
                }
                for m, p_nom, u_nom in rows
            ],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit if total > 0 else 0,
        }

    @staticmethod
    async def entrer_stock(
        db: AsyncSession,
        produit_id: str,
        quantite: int,
        user_id: str,
    ) -> MouvementStock:
        return await StockService.creer_mouvement(
            db=db,
            produit_id=produit_id,
            type_mouvement="IN",
            quantite=quantite,
            user_id=user_id,
        )

    @staticmethod
    async def sortir_stock(
        db: AsyncSession,
        produit_id: str,
        quantite: int,
        user_id: str,
        raison: str | None = None,
    ) -> MouvementStock:
        return await StockService.creer_mouvement(
            db=db,
            produit_id=produit_id,
            type_mouvement="AUTRE_SORTIE",
            quantite=quantite,
            user_id=user_id,
        )

    @staticmethod
    async def ajuster_stock(
        db: AsyncSession,
        produit_id: str,
        nouvelle_quantite: int,
        user_id: str,
        raison: str | None = None,
    ) -> MouvementStock:
        return await StockService.creer_mouvement(
            db=db,
            produit_id=produit_id,
            type_mouvement="AJUSTEMENT",
            quantite=nouvelle_quantite,
            user_id=user_id,
        )
