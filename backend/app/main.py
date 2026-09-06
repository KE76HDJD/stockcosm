import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.database import engine, Base
from app.config import get_settings
from app.middleware import SecurityHeadersMiddleware
from app.routers import auth, produits, ventes, dashboard, assistant, admin


settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logging.getLogger("stockcosm.audit").setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Gestion de Stock - Cosmétiques",
    description="Application interne de gestion de stock pour produits cosmétiques",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(SecurityHeadersMiddleware)


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "Ressource introuvable"})


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    return JSONResponse(status_code=500, content={"detail": "Erreur interne du serveur"})


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Une erreur inattendue est survenue"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(produits.router)
app.include_router(ventes.router)
app.include_router(dashboard.router)
app.include_router(assistant.router)
app.include_router(admin.router)

import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=os.path.dirname(settings.UPLOAD_DIR)), name="uploads")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "gestion-stock-cosmetiques"}
