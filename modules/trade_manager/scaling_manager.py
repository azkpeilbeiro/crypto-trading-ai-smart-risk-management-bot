from dataclasses import dataclass
from typing import Optional


@dataclass
class ScalingPlan:
    add_size: float = 0.0
    reduce_size: float = 0.0
    reason: Optional[str] = None


def plan_scaling(
    current_size: float,
    target_size: float,
    risk_level: str,
) -> ScalingPlan:
    """
    Decide whether to scale in or out based on risk level.
    """
    if risk_level == "HIGH" and current_size > target_size:
        return ScalingPlan(reduce_size=current_size - target_size, reason="High risk - scale out")
    if risk_level == "LOW" and current_size < target_size:
        return ScalingPlan(add_size=target_size - current_size, reason="Low risk - scale in")
    return ScalingPlan(reason="No scaling change")

