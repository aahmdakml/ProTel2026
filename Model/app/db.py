import asyncpg
from asyncpg import Pool
from app.config import get_settings

_pool: Pool | None = None


async def get_pool() -> Pool:
    """Kembalikan connection pool. Buat baru jika belum ada."""
    global _pool
    if _pool is None:
        settings = get_settings()
        _pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=2,
            max_size=8,
            command_timeout=30,
        )
    return _pool


async def close_pool() -> None:
    """Tutup pool saat shutdown."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
