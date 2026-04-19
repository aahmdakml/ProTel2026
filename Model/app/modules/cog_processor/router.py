from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from app.modules.cog_processor.converter import convert_to_cog

router = APIRouter()


class CogConvertRequest(BaseModel):
    raw_key: str       # R2 object key untuk GeoTIFF asli
    output_key: str    # R2 object key untuk COG output
    field_id: str      # untuk logging


class CogConvertResponse(BaseModel):
    status: str
    output_key: str
    message: str


@router.post(
    "/convert",
    response_model=CogConvertResponse,
    summary="Convert GeoTIFF → Cloud Optimized GeoTIFF (COG)",
)
async def convert_cog(
    request: CogConvertRequest,
    background_tasks: BackgroundTasks,
) -> CogConvertResponse:
    """
    Trigger konversi GeoTIFF yang sudah di-upload ke R2 menjadi COG.
    Proses berjalan di background task.
    Server 1 harus polling /cog/status atau menerima callback untuk cek status.
    """
    if not request.raw_key or not request.output_key:
        raise HTTPException(status_code=422, detail="raw_key dan output_key wajib diisi")

    background_tasks.add_task(
        convert_to_cog,
        raw_key=request.raw_key,
        output_key=request.output_key,
        field_id=request.field_id,
    )

    return CogConvertResponse(
        status="processing",
        output_key=request.output_key,
        message="Konversi COG dimulai di background",
    )
