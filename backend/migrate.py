"""
Migration DB :
1. Supprimer tables kits et kit_compositions (entités obsolètes)
2. Supprimer colonnes price de produits
3. Supprimer total_amount de ventes, unit_price/subtotal de ventes_lignes
4. Ajouter stock_before/stock_after à mouvements_stock
5. Étendre l'enum mouvement_type avec AUTRE_SORTIE et AJUSTEMENT
"""
import asyncio
from sqlalchemy import text
from app.database import engine


async def migrate():
    async with engine.begin() as conn:
        # 0. Supprimer les tables kits (entité obsolète)
        try:
            await conn.execute(text("DROP TABLE IF EXISTS kit_compositions CASCADE"))
            print("  ✓ Table 'kit_compositions' supprimée")
        except Exception as e:
            print(f"  - kit_compositions déjà supprimé ou erreur: {e}")

        try:
            await conn.execute(text("DROP TABLE IF EXISTS kits CASCADE"))
            print("  ✓ Table 'kits' supprimée")
        except Exception as e:
            print(f"  - kits déjà supprimé ou erreur: {e}")

        try:
            await conn.execute(text("DROP TYPE IF EXISTS kit_status CASCADE"))
            print("  ✓ Type 'kit_status' supprimé")
        except Exception as e:
            print(f"  - kit_status déjà supprimé ou erreur: {e}")

        # 1. Supprimer colonnes prix de produits
        try:
            await conn.execute(text("ALTER TABLE produits DROP COLUMN price"))
            print("  ✓ Colonne 'price' supprimée de 'produits'")
        except Exception as e:
            print(f"  - produits.price déjà supprimé ou erreur: {e}")

        # 2. Supprimer colonnes prix de ventes
        try:
            await conn.execute(text("ALTER TABLE ventes DROP COLUMN total_amount"))
            print("  ✓ Colonne 'total_amount' supprimée de 'ventes'")
        except Exception as e:
            print(f"  - ventes.total_amount déjà supprimé ou erreur: {e}")

        # 3. Supprimer colonnes prix de ventes_lignes
        try:
            await conn.execute(text("ALTER TABLE ventes_lignes DROP COLUMN unit_price"))
            print("  ✓ Colonne 'unit_price' supprimée de 'ventes_lignes'")
        except Exception as e:
            print(f"  - ventes_lignes.unit_price déjà supprimé ou erreur: {e}")

        try:
            await conn.execute(text("ALTER TABLE ventes_lignes DROP COLUMN subtotal"))
            print("  ✓ Colonne 'subtotal' supprimée de 'ventes_lignes'")
        except Exception as e:
            print(f"  - ventes_lignes.subtotal déjà supprimé ou erreur: {e}")

        # 4. Ajouter stock_before et stock_after à mouvements_stock
        try:
            await conn.execute(text("ALTER TABLE mouvements_stock ADD COLUMN stock_before INTEGER NOT NULL DEFAULT 0"))
            print("  ✓ Colonne 'stock_before' ajoutée à 'mouvements_stock'")
        except Exception as e:
            print(f"  - mouvements_stock.stock_before déjà présent ou erreur: {e}")

        try:
            await conn.execute(text("ALTER TABLE mouvements_stock ADD COLUMN stock_after INTEGER NOT NULL DEFAULT 0"))
            print("  ✓ Colonne 'stock_after' ajoutée à 'mouvements_stock'")
        except Exception as e:
            print(f"  - mouvements_stock.stock_after déjà présent ou erreur: {e}")

        # 5. Étendre l'enum mouvement_type
        try:
            await conn.execute(text("ALTER TYPE mouvement_type ADD VALUE 'AUTRE_SORTIE'"))
            print("  ✓ Valeur 'AUTRE_SORTIE' ajoutée à l'enum mouvement_type")
        except Exception as e:
            print(f"  - AUTRE_SORTIE déjà dans l'enum ou erreur: {e}")

        try:
            await conn.execute(text("ALTER TYPE mouvement_type ADD VALUE 'AJUSTEMENT'"))
            print("  ✓ Valeur 'AJUSTEMENT' ajoutée à l'enum mouvement_type")
        except Exception as e:
            print(f"  - AJUSTEMENT déjà dans l'enum ou erreur: {e}")

    print("\nMigration terminée !")


if __name__ == "__main__":
    asyncio.run(migrate())
