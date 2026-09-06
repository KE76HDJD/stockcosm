import asyncio
import uuid
from app.database import AsyncSessionLocal, engine, Base
from app.models.utilisateur import Utilisateur
from app.models.categorie import Categorie
from app.models.produit import Produit
from app.utils.security import hash_password


CATEGORIES_AND_PRODUCTS = {
    "Savons": [
        "Savon noir miracle",
        "Savon noir très blanchissant",
        "Petit savon noir",
        "Savon activateur d'éclair",
        "Savon gommant",
        "Savon métisse",
        "Savon extra blanchissant",
        "Savon yovo yovo",
        "Savon anti-vieillissement",
        "Vrai savon",
        "Savon cocktail",
        "Savon visage",
    ],
    "Laits et Teints": [
        "Teint métisse — étiquette jaune",
        "Teint métisse — étiquette blanche",
        "Lait cocktail crémeux",
        "Lait métisse",
    ],
    "Beurres": [
        "Beurre réactivateur",
        "Beurre éclair doré",
    ],
    "Gels Douche": [
        "Gel douche métisse",
        "Gel douche anti-vieillissement",
        "Gel douche rose",
    ],
    "Huiles": [
        "Huile HD",
        "Huile clarifiante",
    ],
    "Crèmes Visage": [
        "Crème visage petite",
        "Crème visage",
        "Crème visage mamie",
    ],
    "Pommades": [
        "Pommade de cheveux",
    ],
}


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select

        # 1. Créer les catégories et produits manquants
        from sqlalchemy import select
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

            # Vérifier les produits existants dans cette catégorie
            result = await db.execute(
                select(Produit).where(Produit.categorie_id == cat_id)
            )
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
        print(f"Seed terminé : {total_cats} nouvelles catégories, {total_produits} nouveaux produits")


if __name__ == "__main__":
    asyncio.run(seed())
