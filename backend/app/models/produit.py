import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, Enum as SAEnum, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum


class ProduitStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class Produit(Base):
    __tablename__ = "produits"
    __table_args__ = (
        Index("idx_produits_categorie_id", "categorie_id"),
        Index("idx_produits_status", "status"),
        CheckConstraint("stock_quantity >= 0", name="chk_stock_non_negatif"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    categorie_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("categories.id"), nullable=False
    )
    stock_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    alert_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    status: Mapped[str] = mapped_column(
        SAEnum("ACTIVE", "INACTIVE", name="produit_status"),
        nullable=False,
        default="ACTIVE",
    )
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )
