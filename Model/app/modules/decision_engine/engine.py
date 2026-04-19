from app.modules.decision_engine.schemas import (
    EvaluateRequest,
    RecommendationOutput,
    RecommendationType,
    ConfidenceLevel,
    SubBlockInput,
    DssAction,
)
from app.modules.decision_engine.scorer import score_and_rank


async def evaluate_field(request: EvaluateRequest) -> list[RecommendationOutput]:
    """
    Rule-based decision engine untuk Smart AWD.
    Evaluasi setiap sub-block independen, kemudian rank secara global per field.
    """
    raw_recommendations: list[RecommendationOutput] = []

    for sub_block in request.sub_blocks:
        rec = _evaluate_sub_block(sub_block, request)
        raw_recommendations.append(rec)

    # Rank semua rekomendasi per field
    ranked = score_and_rank(raw_recommendations)
    return ranked


def _evaluate_sub_block(
    sub_block: SubBlockInput,
    request: EvaluateRequest,
) -> RecommendationOutput:
    """Evaluasi satu sub-block dan kembalikan rekomendasi mentah."""

    rule = sub_block.rule_profile

    # ── 1. Cek weather warnings yang override DSS ────────────────────────────
    for warning in request.active_warnings:
        if warning.dss_action == DssAction.DELAY_IRRIGATION:
            return _build_recommendation(
                sub_block=sub_block,
                rec_type=RecommendationType.OBSERVE,
                template_code="SKIP_RAINFALL_WARNING",
                command_text="Tunda irigasi — ada peringatan cuaca aktif.",
                reason=f"Peringatan cuaca aktif: {warning.warning_type} ({warning.warning_level}). DSS menunda rekomendasi irigasi.",
                confidence=ConfidenceLevel.HIGH,
                priority_score=0.1,
            )
        if warning.dss_action == DssAction.SKIP_CYCLE:
            return _build_recommendation(
                sub_block=sub_block,
                rec_type=RecommendationType.SKIP_AWD_EVENT,
                template_code="SKIP_WARNING_CRITICAL",
                command_text="Lewati siklus AWD — peringatan kritis aktif.",
                reason=f"Peringatan cuaca kritis: {warning.warning_type}. Skip decision cycle.",
                confidence=ConfidenceLevel.HIGH,
                priority_score=0.05,
            )

    # ── 2. Jika tidak ada rule profile → observe saja ───────────────────────
    if rule is None:
        return _build_recommendation(
            sub_block=sub_block,
            rec_type=RecommendationType.OBSERVE,
            template_code="NO_RULE_PROFILE",
            command_text="Pantau kondisi sawah — tidak ada rule profile aktif.",
            reason="Tidak ada rule profile yang dikonfigurasi untuk bucket/fase ini.",
            confidence=ConfidenceLevel.LOW,
            priority_score=0.1,
        )

    # ── 3. Cek data tersedia ────────────────────────────────────────────────
    wl = sub_block.state.water_level_cm
    if wl is None or sub_block.state.state_source.value == "no_data":
        return _build_recommendation(
            sub_block=sub_block,
            rec_type=RecommendationType.OBSERVE,
            template_code="NO_DATA",
            command_text="Periksa sensor — tidak ada data level air.",
            reason="Tidak ada data level air yang tersedia. Periksa koneksi sensor.",
            confidence=ConfidenceLevel.LOW,
            priority_score=0.2,
        )

    # ── 4. Cek prakiraan hujan → tunda irigasi jika > threshold ────────────
    weather = request.weather
    if (
        weather.precipitation_mm is not None
        and weather.precipitation_mm > rule.rain_delay_mm
    ):
        return _build_recommendation(
            sub_block=sub_block,
            rec_type=RecommendationType.OBSERVE,
            template_code="SKIP_RAIN_FORECAST",
            command_text=f"Tunda irigasi — prakiraan hujan {weather.precipitation_mm:.1f} mm.",
            reason=f"Prakiraan hujan {weather.precipitation_mm:.1f} mm melebihi threshold {rule.rain_delay_mm:.0f} mm.",
            confidence=ConfidenceLevel.HIGH,
            priority_score=0.15,
        )

    # ── 5. Evaluasi level air vs threshold ──────────────────────────────────

    # Level kritis — drought alert
    if rule.drought_alert_cm is not None and wl <= rule.drought_alert_cm:
        return _build_recommendation(
            sub_block=sub_block,
            rec_type=RecommendationType.IRRIGATE,
            template_code="IRRIGATE_CRITICAL",
            command_text=f"🚨 SEGERA irigasi — level air kritis ({wl:.1f} cm).",
            reason=f"Level air {wl:.1f} cm melewati batas kritis {rule.drought_alert_cm:.1f} cm. Irigasi mendesak.",
            confidence=ConfidenceLevel.HIGH,
            priority_score=_calc_priority(wl, rule.awd_lower_threshold_cm, boost=2.0),
        )

    # Di bawah threshold AWD → irigasi
    if wl <= rule.awd_lower_threshold_cm:
        return _build_recommendation(
            sub_block=sub_block,
            rec_type=RecommendationType.IRRIGATE,
            template_code="IRRIGATE_THRESHOLD",
            command_text=f"Segera irigasi Kotak {sub_block.code or sub_block.id[:8]} — level air {wl:.1f} cm.",
            reason=f"Level air {wl:.1f} cm melewati threshold irigasi {rule.awd_lower_threshold_cm:.1f} cm.",
            confidence=ConfidenceLevel.HIGH,
            priority_score=_calc_priority(wl, rule.awd_lower_threshold_cm, boost=1.0),
        )

    # Di atas target → drain
    if wl >= rule.awd_upper_target_cm:
        return _build_recommendation(
            sub_block=sub_block,
            rec_type=RecommendationType.DRAIN,
            template_code="DRAIN_EXCESS",
            command_text=f"Kurangi air Kotak {sub_block.code or sub_block.id[:8]} — genangan {wl:.1f} cm.",
            reason=f"Level air {wl:.1f} cm melebihi target maksimum {rule.awd_upper_target_cm:.1f} cm.",
            confidence=ConfidenceLevel.MEDIUM,
            priority_score=0.5,
        )

    # Di antara threshold → maintain / AWD dry period
    return _build_recommendation(
        sub_block=sub_block,
        rec_type=RecommendationType.MAINTAIN_DRY,
        template_code="MAINTAIN_AWD_DRY",
        command_text=f"Pertahankan kondisi saat ini ({wl:.1f} cm) — AWD dry period.",
        reason=f"Level air {wl:.1f} cm dalam rentang AWD ({rule.awd_lower_threshold_cm:.1f} – {rule.awd_upper_target_cm:.1f} cm).",
        confidence=ConfidenceLevel.HIGH,
        priority_score=0.3,
    )


def _calc_priority(current_cm: float, threshold_cm: float, boost: float = 1.0) -> float:
    """Hitung priority score berdasarkan deficit dari threshold. Makin jauh makin tinggi."""
    deficit = abs(current_cm - threshold_cm)
    # Normalisasi: 0–30 cm deficit → 0.5–1.0 score
    score = min(0.5 + (deficit / 30.0) * 0.5, 1.0)
    return score * boost


def _build_recommendation(
    sub_block: SubBlockInput,
    rec_type: RecommendationType,
    template_code: str,
    command_text: str,
    reason: str,
    confidence: ConfidenceLevel,
    priority_score: float,
) -> RecommendationOutput:
    """Helper: buat RecommendationOutput dengan nilai default."""
    return RecommendationOutput(
        sub_block_id=sub_block.id,
        recommendation_type=rec_type,
        priority_rank=0,              # akan diisi oleh scorer
        priority_score=priority_score,
        command_template_code=template_code,
        command_text=command_text,
        reason_summary=reason,
        confidence_level=confidence,
    )
