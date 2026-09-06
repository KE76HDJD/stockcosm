import pyotp
import qrcode
import qrcode.image.svg
import base64
from io import BytesIO
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.utilisateur import Utilisateur
from app.utils.security import hash_password, verify_password


class UserService:
    @staticmethod
    async def create(
        db: AsyncSession, username: str, password: str, role: str = "ASSISTANT"
    ) -> Utilisateur:
        user = Utilisateur(
            username=username,
            password_hash=hash_password(password),
            role=role,
        )
        db.add(user)
        await db.flush()
        return user

    @staticmethod
    async def list_all(db: AsyncSession) -> list[Utilisateur]:
        result = await db.execute(select(Utilisateur))
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: str) -> Utilisateur | None:
        result = await db.execute(
            select(Utilisateur).where(Utilisateur.id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update(
        db: AsyncSession,
        user_id: str,
        username: str | None = None,
        role: str | None = None,
        is_active: bool | None = None,
    ) -> Utilisateur | None:
        user = await UserService.get_by_id(db, user_id)
        if user is None:
            return None
        if username is not None:
            user.username = username
        if role is not None:
            user.role = role
        if is_active is not None:
            user.is_active = is_active
        await db.flush()
        return user

    @staticmethod
    async def update_profile(
        db: AsyncSession,
        user_id: str,
        username: str,
    ) -> Utilisateur | None:
        user = await UserService.get_by_id(db, user_id)
        if user is None:
            return None
        existing = await db.execute(
            select(Utilisateur).where(Utilisateur.username == username, Utilisateur.id != user_id)
        )
        if existing.scalar_one_or_none():
            raise ValueError("Ce nom d'utilisateur est déjà pris")
        user.username = username
        await db.flush()
        return user

    @staticmethod
    async def change_password(
        db: AsyncSession,
        user_id: str,
        current_password: str,
        new_password: str,
    ) -> bool:
        user = await UserService.get_by_id(db, user_id)
        if user is None:
            return False
        if not verify_password(current_password, user.password_hash):
            raise ValueError("Le mot de passe actuel est incorrect")
        user.password_hash = hash_password(new_password)
        await db.flush()
        return True

    @staticmethod
    async def update_photo(
        db: AsyncSession,
        user_id: str,
        photo_path: str,
    ) -> Utilisateur | None:
        user = await UserService.get_by_id(db, user_id)
        if user is None:
            return None
        user.profile_photo = photo_path
        await db.flush()
        return user

    @staticmethod
    def generate_2fa_secret(username: str, issuer: str) -> tuple[str, str]:
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        otpauth_url = totp.provisioning_uri(name=username, issuer_name=issuer)
        return secret, otpauth_url

    @staticmethod
    def generate_qr_base64(otpauth_url: str) -> str:
        img = qrcode.make(otpauth_url)
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        return base64.b64encode(buffer.read()).decode()

    @staticmethod
    def verify_2fa_code(secret: str, code: str) -> bool:
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)

    @staticmethod
    async def setup_2fa(
        db: AsyncSession,
        user_id: str,
        issuer: str,
    ) -> dict | None:
        user = await UserService.get_by_id(db, user_id)
        if user is None:
            return None
        secret, otpauth_url = UserService.generate_2fa_secret(user.username, issuer)
        qr_base64 = UserService.generate_qr_base64(otpauth_url)
        user.two_factor_secret = secret
        await db.flush()
        return {"secret": secret, "otpauth_url": otpauth_url, "qr_code_base64": qr_base64}

    @staticmethod
    async def verify_and_enable_2fa(
        db: AsyncSession,
        user_id: str,
        code: str,
    ) -> bool:
        user = await UserService.get_by_id(db, user_id)
        if user is None or not user.two_factor_secret:
            return False
        if not UserService.verify_2fa_code(user.two_factor_secret, code):
            return False
        user.two_factor_enabled = True
        await db.flush()
        return True

    @staticmethod
    async def disable_2fa(
        db: AsyncSession,
        user_id: str,
        code: str,
    ) -> bool:
        user = await UserService.get_by_id(db, user_id)
        if user is None or not user.two_factor_secret:
            return False
        if not UserService.verify_2fa_code(user.two_factor_secret, code):
            return False
        user.two_factor_enabled = False
        user.two_factor_secret = None
        await db.flush()
        return True
