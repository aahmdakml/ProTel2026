from fastapi import APIRouter
from datetime import datetime, timezone
from app.modules.decision_engine.schemas import EvaluateRequest, EvaluateResponse
from app.modules.decision_engine.engine import evaluate_field

router = APIRouter()


@router.post("/", response_model=EvaluateResponse, summary="Evaluate field — generate recommendations")
async def evaluate(request: EvaluateRequest) -> EvaluateResponse:
    """
    Menerima state semua sub-block + konteks cuaca + rule profiles,
    mengembalikan daftar rekomendasi irigasi yang sudah di-rank.

    Dipanggil oleh Server 1 (Express) setiap decision cycle.
    """
    recommendations = await evaluate_field(request)

    return EvaluateResponse(
        job_id=request.job_id,
        evaluated_at=datetime.now(timezone.utc).isoformat(),
        recommendations=recommendations,
    )
