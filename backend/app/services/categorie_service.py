from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.categorie import Categorie
from app.models.produit import Produit


class CategorieService:
    @staticmethod
    async def create(db: AsyncSession, name: str) -> Categorie:
        cat = Categorie(name=name)
        db.add(cat)
        await db.flush()
        return cat

    @staticmethod
    async def list_all(db: AsyncSession) -> list[dict]:
        """Liste toutes les catégories avec le compteur de produits."""
        result = await db.execute(
            select(
                Categorie,
                func.coalesce(
                    func.count(Produit.id).filter(Produit.status == "ACTIVE"), 0
                ).label("product_count"),
            )
            .outerjoin(Produit, Categorie.id == Produit.categorie_id)
            .group_by(Categorie.id)
            .order_by(Categorie.name)
        )
        rows = result.all()
        return [
            {
                "id": cat.id,
                "name": cat.name,
                "product_count": count,
                "created_at": cat.created_at,
            }
            for cat, count in rows
        ]

    @staticmethod
    async def get_by_id(db: AsyncSession, cat_id: str) -> Categorie | None:
        result = await db.execute(
            select(Categorie).where(Categorie.id == cat_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_produits_by_categorie(
        db: AsyncSession, cat_id: str
    ) -> list[dict]:
        """Retourne les produits actifs d'une catégorie."""
        result = await db.execute(
            select(Produit)
            .where(Produit.categorie_id == cat_id, Produit.status == "ACTIVE")
            .order_by(Produit.name)
        )
        produits = result.scalars().all()
        return [
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
        ]
