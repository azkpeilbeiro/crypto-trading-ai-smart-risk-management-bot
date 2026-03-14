from enum import Enum


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


def compute_risk_score(
    leverage: float | None,
    position_size_pct: float,
    volatility_score: float | None = None,
) -> RiskLevel:
    """
    Very simple heuristic risk scoring.
    """
    score = 0.0

    if leverage:
        score += leverage / 10.0

    score += position_size_pct / 5.0

    if volatility_score:
        score += volatility_score

    if score < 2.0:
        return RiskLevel.LOW
    if score < 4.0:
        return RiskLevel.MEDIUM
    return RiskLevel.HIGH

