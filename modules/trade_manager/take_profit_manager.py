from typing import Optional

from modules.risk_engine.volatility_adjustment import VolatilityContext, adjust_tp_sl


def compute_take_profit(
    entry_price: float,
    current_tp: Optional[float],
    vol_ctx: VolatilityContext,
    trend_strength: Optional[float] = None,
) -> Optional[float]:
    """
    Wrapper around volatility-based TP adjustment, also considering trend.
    """
    tp, _ = adjust_tp_sl(entry_price, current_tp, None, vol_ctx)

    if trend_strength and trend_strength > 1.0 and tp:
        tp = tp * (1.0 + 0.01 * min(trend_strength, 5.0))

    return tp

