from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, date
from app.models.vente import Vente, VenteLigne
from app.models.produit import Produit
from app.services.stock_service import StockService
from fastapi import HTTPException


class VenteService:
    @staticmethod
    async def creer_vente(
        db: AsyncSession,
        user_id: str,
        type_vente: str,
        lignes: list[dict],
        notes: str | None = None,
    ) -> Vente:
        if not lignes:
            raise HTTPException(
                status_code=400, detail="Au moins une ligne requise"
            )

        vente = Vente(
            user_id=user_id,
            type=type_vente,
            notes=notes,
        )
        db.add(vente)
        await db.flush()

        for ligne in lignes:
            ligne_vente = VenteLigne(
                vente_id=vente.id,
                produit_id=ligne["produit_id"],
                quantity=ligne["quantity"],
            )
            db.add(ligne_vente)

            try:
                await StockService.creer_mouvement(
                    db=db,
                    produit_id=ligne["produit_id"],
                    type_mouvement="OUT",
                    quantite=ligne["quantity"],
                    user_id=user_id,
                    vente_id=vente.id,
                )
            except ValueError as e:
                raise HTTPException(status_code=409, detail=str(e))

        await db.flush()
        return vente

    @staticmethod
    async def annuler_vente(
        db: AsyncSession,
        vente_id: str,
        admin_id: str,
    ) -> dict:
        result = await db.execute(
            select(Vente).where(Vente.id == vente_id)
        )
        vente = result.scalar_one_or_none()
        if vente is None:
            raise HTTPException(status_code=404, detail="Vente introuvable")
        if vente.status == "CANCELLED":
            raise HTTPException(
                status_code=409, detail="Cette vente est déjà annulée"
            )

        vente.status = "CANCELLED"

        result = await db.execute(
            select(VenteLigne).where(VenteLigne.vente_id == vente_id)
        )
        lignes = list(result.scalars().all())

        for ligne in lignes:
            await StockService.creer_mouvement(
                db=db,
                produit_id=ligne.produit_id,
                type_mouvement="RETURN",
                quantite=ligne.quantity,
                user_id=admin_id,
                vente_id=vente.id,
            )

        await db.flush()
        return {
            "message": "Vente annulée avec succès",
            "vente_id": vente.id,
        }

    @staticmethod
    async def list_ventes(
        db: AsyncSession,
        date_from: date | None = None,
        date_to: date | None = None,
        user_id: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> dict:
        query = select(Vente)
        count_query = select(func.count(Vente.id))

        if date_from:
            query = query.where(
                Vente.created_at >= datetime.combine(
                    date_from, datetime.min.time()
                )
            )
            count_query = count_query.where(
                Vente.created_at >= datetime.combine(
                    date_from, datetime.min.time()
                )
            )
        if date_to:
            query = query.where(
                Vente.created_at <= datetime.combine(
                    date_to, datetime.max.time()
                )
            )
            count_query = count_query.where(
                Vente.created_at <= datetime.combine(
                    date_to, datetime.max.time()
                )
            )
        if user_id:
            query = query.where(Vente.user_id == user_id)
            count_query = count_query.where(Vente.user_id == user_id)

        total_result = await db.execute(count_query)
        total = total_result.scalar()

        offset = (page - 1) * limit
        query = query.order_by(Vente.created_at.desc()).offset(offset).limit(limit)
        result = await db.execute(query)
        ventes = list(result.scalars().all())

        return {
            "ventes": ventes,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit if total > 0 else 0,
        }

    @staticmethod
    async def get_vente_by_id(
        db: AsyncSession, vente_id: str
    ) -> Vente | None:
        result = await db.execute(
            select(Vente).where(Vente.id == vente_id)
        )
        return result.scalar_one_or_none()
