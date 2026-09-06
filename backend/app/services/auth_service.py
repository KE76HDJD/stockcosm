from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.utilisateur import Utilisateur
from app.utils.security import verify_password
from app.utils.jwt import create_token


class AuthService:
    @staticmethod
    async def find_user(db: AsyncSession, username: str) -> Utilisateur | None:
        result = await db.execute(
            select(Utilisateur).where(Utilisateur.username == username)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def login(
        db: AsyncSession, username: str, password: str
    ) -> dict | None:
        user = await AuthService.find_user(db, username)
        if user is None or not user.is_active:
            return None
        if not verify_password(password, user.password_hash):
            return None

        token = create_token(user.id, user.role)
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": user.role,
            "username": user.username,
        }
