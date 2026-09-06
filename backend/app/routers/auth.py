import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import (
    LoginRequest, TokenResponse, UserResponse, UserCreate, UserUpdate,
    ProfileUpdate, PasswordChangeRequest, TwoFactorVerifyRequest,
    TwoFactorLoginResponse,
)
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.dependencies import get_current_user, require_role
from app.models.utilisateur import Utilisateur
from app.config import get_settings
from app.utils.jwt import create_token, create_refresh_token, verify_token
from app.utils.rate_limiter import login_limiter
from app.utils.audit import log_login, log_user_management

router = APIRouter(prefix="/api/auth", tags=["Authentification"])

settings = get_settings()
UPLOAD_DIR = settings.UPLOAD_DIR


def _set_refresh_cookie(response: Response, token: str):
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.JWT_REFRESH_DAYS * 24 * 3600,
        path="/api/auth",
    )


def _set_access_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.JWT_ACCESS_MINUTES * 60,
        path="/",
    )


def _clear_cookies(response: Response):
    response.delete_cookie("refresh_token", path="/api/auth")
    response.delete_cookie("access_token", path="/")


@router.post("/login")
async def login(request: LoginRequest, req: Request, response: Response, db: AsyncSession = Depends(get_db)):
    login_limiter.check(req, identifier=f"login:{request.username}")

    user = await AuthService.find_user(db, request.username)
    if user is None:
        login_limiter.record_failure(req, identifier=f"login:{request.username}")
        log_login("unknown", False, f"username={request.username} user_not_found")
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    if not user.is_active:
        log_login(user.id, False, "account_disabled")
        raise HTTPException(status_code=401, detail="Compte désactivé")
    from app.utils.security import verify_password
    if not verify_password(request.password, user.password_hash):
        login_limiter.record_failure(req, identifier=f"login:{request.username}")
        log_login(user.id, False, "wrong_password")
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    login_limiter.reset(req, identifier=f"login:{request.username}")
    log_login(user.id, True, f"role={user.role}")

    if user.two_factor_enabled:
        temp_token = create_token(user.id, user.role, expiry_minutes=5)
        return TwoFactorLoginResponse(temp_token=temp_token, two_factor_required=True)

    access_token = create_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    _set_access_cookie(response, access_token)
    _set_refresh_cookie(response, refresh_token)

    return TokenResponse(access_token=access_token, role=user.role, username=user.username)


@router.post("/login/2fa")
async def login_2fa(
    body: TwoFactorVerifyRequest,
    temp_token: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    payload = verify_token(temp_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Token expiré, reconnectez-vous")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token invalide")

    user = await UserService.get_by_id(db, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    if not user.two_factor_secret:
        raise HTTPException(status_code=400, detail="2FA non configuré")

    if not UserService.verify_2fa_code(user.two_factor_secret, body.code):
        raise HTTPException(status_code=401, detail="Code de vérification incorrect")

    access_token = create_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    _set_access_cookie(response, access_token)
    _set_refresh_cookie(response, refresh_token)

    return TokenResponse(access_token=access_token, role=user.role, username=user.username)


@router.post("/refresh")
async def refresh_token(req: Request, response: Response, db: AsyncSession = Depends(get_db)):
    refresh_tok = req.cookies.get("refresh_token")
    if not refresh_tok:
        raise HTTPException(status_code=401, detail="Refresh token manquant")

    payload = verify_token(refresh_tok)
    if payload is None or payload.get("type") != "refresh":
        _clear_cookies(response)
        raise HTTPException(status_code=401, detail="Refresh token invalide")

    user_id = payload.get("sub")
    user = await UserService.get_by_id(db, user_id)
    if user is None or not user.is_active:
        _clear_cookies(response)
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    new_access = create_token(user.id, user.role)
    new_refresh = create_refresh_token(user.id)

    _set_access_cookie(response, new_access)
    _set_refresh_cookie(response, new_refresh)

    return {"access_token": new_access, "role": user.role, "username": user.username}


@router.post("/logout")
async def logout(response: Response):
    _clear_cookies(response)
    return {"message": "Déconnexion réussie"}


@router.get("/me", response_model=UserResponse)
async def me(current_user: Utilisateur = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_profile(
    body: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    try:
        user = await UserService.update_profile(db, current_user.id, body.username)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if user is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    await db.commit()
    return user


@router.put("/me/password")
async def change_password(
    body: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    try:
        await UserService.change_password(db, current_user.id, body.current_password, body.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return {"message": "Mot de passe modifié avec succès"}


@router.post("/me/photo")
async def upload_photo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Format non supporté (JPEG, PNG, WebP)")

    raw_ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    if raw_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Extension non autorisée")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{current_user.id}.{raw_ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 5MB)")

    with open(filepath, "wb") as f:
        f.write(content)

    photo_url = f"/uploads/profile_photos/{filename}"
    user = await UserService.update_photo(db, current_user.id, photo_url)
    if user is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    await db.commit()
    return {"photo_url": photo_url}


@router.get("/2fa/setup")
async def setup_2fa(
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    if current_user.two_factor_enabled:
        raise HTTPException(status_code=400, detail="2FA déjà activé")
    settings = get_settings()
    result = await UserService.setup_2fa(db, current_user.id, settings.TOTP_ISSUER)
    if result is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return result


@router.post("/2fa/verify")
async def verify_2fa_enable(
    body: TwoFactorVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    success = await UserService.verify_and_enable_2fa(db, current_user.id, body.code)
    if not success:
        raise HTTPException(status_code=400, detail="Code incorrect")
    await db.commit()
    return {"message": "2FA activé avec succès"}


@router.post("/2fa/disable")
async def disable_2fa(
    body: TwoFactorVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    success = await UserService.disable_2fa(db, current_user.id, body.code)
    if not success:
        raise HTTPException(status_code=400, detail="Code incorrect")
    await db.commit()
    return {"message": "2FA désactivé avec succès"}


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(require_role("ADMIN", "ASSISTANT")),
):
    return await UserService.list_all(db)


@router.post("/users", response_model=UserResponse)
async def create_user(
    request: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(require_role("ADMIN", "ASSISTANT")),
):
    user = await UserService.create(db, request.username, request.password, request.role)
    await db.commit()
    log_user_management("USER_CREATE", current_user.id, request.username, f"role={request.role}")
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    request: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(require_role("ADMIN")),
):
    user = await UserService.update(
        db, user_id, request.username, request.role, request.is_active
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    await db.commit()
    log_user_management("USER_UPDATE", current_user.id, user_id, f"username={request.username} role={request.role} active={request.is_active}")
    return user


@router.get("/setup-status")
async def setup_status(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select, func
    result = await db.execute(select(func.count()).select_from(Utilisateur))
    count = result.scalar()
    return {"needs_setup": count == 0}


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "ASSISTANT"


@router.post("/register")
async def register_user(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if request.role not in ("ADMIN", "ASSISTANT"):
        raise HTTPException(status_code=400, detail="Rôle invalide")
    if len(request.username) < 2:
        raise HTTPException(status_code=400, detail="Le nom doit faire au moins 2 caractères")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit faire au moins 6 caractères")

    existing = await AuthService.find_user(db, request.username)
    if existing:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur existe déjà")

    if request.role == "ADMIN":
        from sqlalchemy import select, func
        result = await db.execute(select(func.count()).select_from(Utilisateur))
        count = result.scalar()
        if count > 0:
            raise HTTPException(status_code=400, detail="Un administrateur existe déjà. Seul un admin peut créer un autre admin.")

    user = await UserService.create(db, request.username, request.password, request.role)
    await db.commit()
    log_user_management("USER_REGISTER", user.id, request.username, f"Auto-inscription role={request.role}")
    return {"message": "Compte créé avec succès", "username": user.username, "role": user.role}
