from app.modules.decision_engine.schemas import RecommendationOutput, RecommendationType


# Priority order untuk sorting (lower index = more urgent)
_TYPE_PRIORITY: dict[RecommendationType, int] = {
    RecommendationType.IRRIGATE:        0,  # paling urgent
    RecommendationType.DRAIN:           1,
    RecommendationType.MAINTAIN_WET:    2,
    RecommendationType.MAINTAIN_DRY:    3,
    RecommendationType.OBSERVE:         4,
    RecommendationType.SKIP_AWD_EVENT:  5,  # paling rendah
}


def score_and_rank(
    recommendations: list[RecommendationOutput],
) -> list[RecommendationOutput]:
    """
    Sort dan assign priority_rank ke semua rekomendasi.

    Sorting criteria (berurutan):
    1. recommendation_type priority (irrigate > drain > ... > skip)
    2. priority_score descending (score lebih tinggi = lebih mendesak)
    """
    sorted_recs = sorted(
        recommendations,
        key=lambda r: (
            _TYPE_PRIORITY.get(r.recommendation_type, 99),
            -r.priority_score,
        ),
    )

    # Assign rank (1-based)
    for rank, rec in enumerate(sorted_recs, start=1):
        rec.priority_rank = rank

    return sorted_recs
