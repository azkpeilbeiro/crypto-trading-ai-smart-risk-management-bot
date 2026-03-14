from dataclasses import dataclass


@dataclass
class AccountState:
    equity: float
    max_risk_pct: float = 1.0  # % of equity per trade


def compute_position_size(
    account: AccountState,
    entry_price: float,
    stop_loss: float | None,
    volatility_factor: float | None = None,
) -> float:
    """
    Simple position sizing based on fixed % of equity and distance to stop.
    """
    if stop_loss is None or stop_loss == entry_price:
        return 0.0

    risk_amount = account.equity * (account.max_risk_pct / 100.0)
    distance = abs(entry_price - stop_loss)
    if distance <= 0:
        return 0.0

    size = risk_amount / distance

    if volatility_factor is not None and volatility_factor > 0:
        size = size / volatility_factor

    return max(size, 0.0)

