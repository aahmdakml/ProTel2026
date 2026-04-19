import os
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from titiler.core.factory import TilerFactory
from titiler.core.errors import DEFAULT_STATUS_CODES, add_exception_handlers

from app.config import get_settings
from app.db import get_pool, close_pool
from app.modules.decision_engine.router import router as decision_router
from app.modules.cog_processor.router import router as cog_router

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
settings = get_settings()
logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# GDAL/Rasterio env vars untuk Cloudflare R2
# Harus diset sebelum import rasterio/GDAL
# ---------------------------------------------------------------------------
os.environ.setdefault("AWS_S3_ENDPOINT", settings.aws_s3_endpoint)
os.environ.setdefault("AWS_VIRTUAL_HOSTING", settings.aws_virtual_hosting)
os.environ.setdefault("AWS_REGION", settings.aws_region)
os.environ.setdefault("GDAL_CACHEMAX", "64")
os.environ.setdefault("CPL_VSIL_USE_TEMP_FILE_FOR_RANDOM_WRITE", "YES")
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")


# ---------------------------------------------------------------------------
# Lifespan: startup + shutdown hooks
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    logger.info(f"Starting Smart AWD Model Service [{settings.app_env}]...")
    await get_pool()           # Initialize DB connection pool
    logger.info("✓ Database pool ready")
    logger.info("✓ TiTiler mounted at /tiles")
    logger.info(f"🚀 Model Service ready on port {settings.port}")

    yield

    # Shutdown
    logger.info("Shutting down...")
    await close_pool()
    logger.info("Database pool closed. Goodbye.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Smart AWD Model Service",
    description="Decision engine + COG tile server untuk Smart AWD DSS",
    version="1.0.0",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS (hanya perbolehkan Server 1)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.server1_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# TiTiler — Cloud Optimized GeoTIFF tile server
# Serve COG dari Cloudflare R2 sebagai XYZ map tiles
#
# Frontend (OpenLayers) memanggil:
# GET /tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=s3://bucket/path/to/cog.tif
# ---------------------------------------------------------------------------
cog_tiler = TilerFactory(router_prefix="/tiles")
app.include_router(cog_tiler.router, prefix="/tiles", tags=["tiles"])
add_exception_handlers(app, DEFAULT_STATUS_CODES)

# ---------------------------------------------------------------------------
# Custom module routers
# ---------------------------------------------------------------------------
app.include_router(
    decision_router,
    prefix="/evaluate",
    tags=["decision-engine"],
)
app.include_router(
    cog_router,
    prefix="/cog",
    tags=["cog-processor"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["system"])
async def health_check() -> dict:
    from app.db import _pool
    return {
        "status": "ok",
        "service": "smart-awd-model-service",
        "version": "1.0.0",
        "environment": settings.app_env,
        "database": "connected" if _pool else "disconnected",
        "titiler": "mounted",
    }
