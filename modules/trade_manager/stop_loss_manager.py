from typing import Optional

from modules.risk_engine.volatility_adjustment import VolatilityContext, adjust_tp_sl


def compute_stop_loss(
    entry_price: float,
    current_sl: Optional[float],
    vol_ctx: VolatilityContext,
    protect_profit: bool = False,
) -> Optional[float]:
    """
    Wrapper around volatility-based SL adjustment with profit protection flag.
    """
    _, sl = adjust_tp_sl(entry_price, None, current_sl, vol_ctx)

    if protect_profit and sl:
        sl = sl * 1.01

    return sl

