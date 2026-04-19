from pydantic import BaseModel
from typing import Any


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str
    database: str


class ApiResponse(BaseModel):
    success: bool
    data: Any | None = None
    error: dict | None = None
