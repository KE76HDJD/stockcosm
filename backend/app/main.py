import logging
import time
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from contextlib import asynccontextmanager
from sqlalchemy import text
from app.database import engine, Base, AsyncSessionLocal
from app.config import get_settings
from app.middleware import SecurityHeadersMiddleware
from app.routers import auth, produits, ventes, dashboard, assistant, admin


settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("stockcosm")
logging.getLogger("stockcosm.audit").setLevel(logging.INFO)

FRONTEND_DIR = Path(__file__).parent.parent / "static"


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
    path = request.url.path
    if path.startswith("/api") or path.startswith("/health") or path.startswith("/assets/") or path.startswith("/uploads/"):
        return JSONResponse(status_code=404, content={"detail": "Ressource introuvable"})
    if FRONTEND_DIR.exists():
        index_file = FRONTEND_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
    return JSONResponse(status_code=404, content={"detail": "Ressource introuvable"})


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    logger.error(f"500 {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Erreur interne du serveur"})


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled {request.method} {request.url.path}: {exc}", exc_info=True)
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


@app.get("/health")
async def health_check():
    db_ok = False
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            db_ok = True
    except Exception as e:
        logger.warning(f"Health check DB failed: {e}")
    return {
        "status": "healthy" if db_ok else "degraded",
        "service": "gestion-stock-cosmetiques",
        "database": "ok" if db_ok else "error",
    }


import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=os.path.dirname(settings.UPLOAD_DIR)), name="uploads")

if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="frontend-assets")
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=False), name="frontend-static")
