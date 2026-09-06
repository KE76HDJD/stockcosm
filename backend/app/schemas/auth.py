from pydantic import BaseModel, Field
from datetime import datetime


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


class TwoFactorLoginResponse(BaseModel):
    temp_token: str
    two_factor_required: bool = True


class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    is_active: bool
    created_at: datetime
    two_factor_enabled: bool = False
    profile_photo: str | None = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "ASSISTANT"


class UserUpdate(BaseModel):
    username: str | None = None
    role: str | None = None
    is_active: bool | None = None


class ProfileUpdate(BaseModel):
    username: str = Field(min_length=2, max_length=50)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class TwoFactorSetupResponse(BaseModel):
    secret: str
    otpauth_url: str
    qr_code_base64: str


class TwoFactorVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class TwoFactorTempToken(BaseModel):
    temp_token: str
