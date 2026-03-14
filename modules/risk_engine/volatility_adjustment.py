from dataclasses import dataclass
from typing import Iterable, Optional


@dataclass
class VolatilityContext:
    """
    Container for pre-computed volatility measures.
    All fields are in absolute price terms except realized_vol, which is annualised.
    """

    atr: Optional[float] = None
    bollinger_width: Optional[float] = None
    realized_vol: Optional[float] = None


def compute_atr(
    highs: Iterable[float],
    lows: Iterable[float],
    closes: Iterable[float],
    period: int = 14,
) -> Optional[float]:
    """
    Average True Range using the classic Wilder smoothing.
    Returns ATR in price units, or None if there is not enough data.
    """
    highs_list = list(highs)
    lows_list = list(lows)
    closes_list = list(closes)

    if len(highs_list) != len(lows_list) or len(highs_list) != len(closes_list):
        raise ValueError("High, low, and close series must be the same length.")

    n = len(closes_list)
    if n <= period:
        return None

    trs: list[float] = []
    for i in range(1, n):
        high = highs_list[i]
        low = lows_list[i]
        prev_close = closes_list[i - 1]
        tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
        trs.append(tr)

    # Initial ATR: simple moving average of first `period` TRs
    initial = sum(trs[:period]) / period
    atr = initial

    alpha = 1.0 / period
    for tr in trs[period:]:
        atr = atr + alpha * (tr - atr)

    return atr


def compute_bollinger_width(
    closes: Iterable[float],
    period: int = 20,
    num_std: float = 2.0,
) -> Optional[float]:
    """
    Bollinger Band width (upper - lower) for the last `period` closes.
    """
    from statistics import mean, pstdev

    closes_list = list(closes)
    if len(closes_list) < period:
        return None

    window = closes_list[-period:]
    mu = mean(window)
    sigma = pstdev(window)

    upper = mu + num_std * sigma
    lower = mu - num_std * sigma
    return upper - lower


def compute_realized_vol(closes: Iterable[float]) -> Optional[float]:
    """
    Simple annualised realized volatility from log returns.
    Assumes 365 trading days; adjust if you use intraday bars.
    """
    import math

    closes_list = list(closes)
    if len(closes_list) < 2:
        return None

    log_returns: list[float] = []
    for i in range(1, len(closes_list)):
        if closes_list[i - 1] <= 0:
            continue
        r = math.log(closes_list[i] / closes_list[i - 1])
        log_returns.append(r)

    if not log_returns:
        return None

    mean_r = sum(log_returns) / len(log_returns)
    var = sum((r - mean_r) ** 2 for r in log_returns) / len(log_returns)
    daily_vol = math.sqrt(var)

    trading_days = 365
    return daily_vol * math.sqrt(trading_days)


def build_volatility_context_from_series(
    highs: Iterable[float],
    lows: Iterable[float],
    closes: Iterable[float],
) -> VolatilityContext:
    """
    Convenience helper to compute all key metrics for a price series.
    Data fetching is intentionally kept outside this module – it only
    transforms price series into volatility measures.
    """
    atr = compute_atr(highs, lows, closes)
    width = compute_bollinger_width(closes)
    realized = compute_realized_vol(closes)
    return VolatilityContext(atr=atr, bollinger_width=width, realized_vol=realized)


def adjust_tp_sl(
    entry_price: float,
    take_profit: float | None,
    stop_loss: float | None,
    vol_ctx: VolatilityContext,
) -> tuple[float | None, float | None]:
    """
    Volatility-aware TP/SL adjustment.

    - In **high volatility**, TP and SL are pulled closer to the entry to
      reduce liquidation risk.
    - In **low volatility**, TP can be stretched slightly to capture more
      of slow trends while SL is left mostly unchanged.
    """
    if entry_price <= 0 or vol_ctx.atr is None:
        return take_profit, stop_loss

    normalized_atr = vol_ctx.atr / entry_price

    # Heuristic bands for "low" vs "high" volatility.
    low_vol = 0.005   # 0.5% of price
    high_vol = 0.02   # 2% of price

    adj_tp = take_profit
    adj_sl = stop_loss

    # High volatility: tighten both TP and SL towards entry.
    if normalized_atr >= high_vol:
        if take_profit is not None:
            distance = take_profit - entry_price
            adj_tp = entry_price + 0.75 * distance
        if stop_loss is not None:
            distance = entry_price - stop_loss
            adj_sl = entry_price - 0.75 * distance

    # Low volatility: give TP slightly more room, keep SL conservative.
    elif normalized_atr <= low_vol:
        if take_profit is not None:
            distance = take_profit - entry_price
            adj_tp = entry_price + 1.1 * distance

    return adj_tp, adj_sl

