import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, ForeignKey, Enum as SAEnum, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum


class VenteType(str, enum.Enum):
    SIMPLE = "SIMPLE"
    KIT = "KIT"


class VenteStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"


class Vente(Base):
    __tablename__ = "ventes"
    __table_args__ = (
        Index("idx_ventes_user_id", "user_id"),
        Index("idx_ventes_created_at", "created_at"),
        Index("idx_ventes_status", "status"),
        Index("idx_ventes_date_status", "created_at", "status"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("utilisateurs.id"), nullable=False
    )
    type: Mapped[str] = mapped_column(
        SAEnum("SIMPLE", "KIT", name="vente_type"),
        nullable=False,
        default="SIMPLE",
    )
    status: Mapped[str] = mapped_column(
        SAEnum("ACTIVE", "CANCELLED", name="vente_status"),
        nullable=False,
        default="ACTIVE",
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class VenteLigne(Base):
    __tablename__ = "ventes_lignes"
    __table_args__ = (
        Index("idx_ventes_lignes_vente_id", "vente_id"),
        Index("idx_ventes_lignes_produit_id", "produit_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    vente_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ventes.id", ondelete="CASCADE"), nullable=False
    )
    produit_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("produits.id"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
