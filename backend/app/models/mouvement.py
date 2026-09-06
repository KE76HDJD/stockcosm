import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, Enum as SAEnum, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum


class MouvementType(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"
    RETURN = "RETURN"
    AUTRE_SORTIE = "AUTRE_SORTIE"
    AJUSTEMENT = "AJUSTEMENT"


class MouvementStock(Base):
    __tablename__ = "mouvements_stock"
    __table_args__ = (
        Index("idx_mouvements_stock_produit_id", "produit_id"),
        Index("idx_mouvements_stock_type", "type"),
        Index("idx_mouvements_stock_user_id", "user_id"),
        Index("idx_mouvements_stock_created_at", "created_at"),
        Index("idx_mouvements_produit_date", "produit_id", "created_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    produit_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("produits.id"), nullable=False
    )
    vente_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("ventes.id"), nullable=True
    )
    type: Mapped[str] = mapped_column(
        SAEnum("IN", "OUT", "RETURN", "AUTRE_SORTIE", "AJUSTEMENT", name="mouvement_type"),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_before: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stock_after: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("utilisateurs.id"), nullable=False
    )
