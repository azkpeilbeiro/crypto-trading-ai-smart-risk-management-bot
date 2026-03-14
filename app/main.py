from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Literal, Optional

from modules.risk_engine.position_sizing import AccountState, compute_position_size
from modules.risk_engine.risk_score import RiskLevel, compute_risk_score
from modules.risk_engine.volatility_adjustment import VolatilityContext
from modules.trade_manager.scaling_manager import ScalingPlan, plan_scaling
from modules.trade_manager.take_profit_manager import compute_take_profit
from modules.trade_manager.stop_loss_manager import compute_stop_loss


class Trade(BaseModel):
    id: str = Field(..., description="Client-side identifier for this trade")
    symbol: str = Field(..., description="Exchange symbol, e.g. BTCUSDT")
    side: Literal["long", "short"]
    entry_price: float
    size: float = Field(..., description="Current position size in contracts or units")
    leverage: Optional[float] = Field(
        default=None, description="Applied leverage, e.g. 10 for 10x",
    )
    take_profit: Optional[float] = Field(
        default=None, description="Current take-profit price, if any",
    )
    stop_loss: Optional[float] = Field(
        default=None, description="Current stop-loss price, if any",
    )


class RiskEvaluationRequest(BaseModel):
    trade: Trade
    account_equity: float = Field(..., description="Total account equity in quote currency")
    max_risk_pct: float = Field(
        default=1.0,
        description="Maximum % of equity risked per trade when sizing positions",
        ge=0.0,
    )
    volatility_atr: Optional[float] = Field(
        default=None,
        description="Optional ATR value in price units for the trade's symbol",
    )
    volatility_score: Optional[float] = Field(
        default=None,
        description="Optional normalized volatility score (0–5).",
    )


class ScalingAdvice(BaseModel):
    add_size: float = 0.0
    reduce_size: float = 0.0
    reason: Optional[str] = None


class RiskAdjustment(BaseModel):
    trade_id: str
    adjusted_take_profit: Optional[float] = None
    adjusted_stop_loss: Optional[float] = None
    recommended_size: Optional[float] = None
    risk_score: Optional[Literal["LOW", "MEDIUM", "HIGH"]] = None
    scaling: Optional[ScalingAdvice] = None
    notes: Optional[str] = None


app = FastAPI(
    title="Smart Risk Management Bot",
    description="AI-assisted risk manager for manual traders.",
    version="0.1.0",
)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.post("/risk/evaluate", response_model=RiskAdjustment)
def evaluate_risk(request: RiskEvaluationRequest) -> RiskAdjustment:
    """
    Evaluate the current trade in the context of account equity and volatility,
    and propose TP/SL, position size, and scaling adjustments.
    """
    trade = request.trade

    account_state = AccountState(
        equity=request.account_equity,
        max_risk_pct=request.max_risk_pct,
    )

    # Volatility factor – higher values reduce recommended size.
    volatility_factor: Optional[float] = None
    if request.volatility_atr and trade.entry_price > 0:
        normalized_atr = request.volatility_atr / trade.entry_price
        # Map ATR % into a soft factor around 1.0
        volatility_factor = max(0.5, min(3.0, normalized_atr / 0.01))

    recommended_size = compute_position_size(
        account=account_state,
        entry_price=trade.entry_price,
        stop_loss=trade.stop_loss,
        volatility_factor=volatility_factor,
    )

    position_notional = trade.entry_price * trade.size
    position_size_pct = (
        (position_notional / request.account_equity) * 100.0
        if request.account_equity > 0
        else 0.0
    )

    risk_level = compute_risk_score(
        leverage=trade.leverage,
        position_size_pct=position_size_pct,
        volatility_score=request.volatility_score or (volatility_factor or 0.0),
    )

    vol_ctx = VolatilityContext(
        atr=request.volatility_atr,
        realized_vol=request.volatility_score,
    )

    adjusted_tp = compute_take_profit(
        entry_price=trade.entry_price,
        current_tp=trade.take_profit,
        vol_ctx=vol_ctx,
        trend_strength=None,
    )

    adjusted_sl = compute_stop_loss(
        entry_price=trade.entry_price,
        current_sl=trade.stop_loss,
        vol_ctx=vol_ctx,
        protect_profit=risk_level is RiskLevel.HIGH,
    )

    scaling_plan = plan_scaling(
        current_size=trade.size,
        target_size=recommended_size,
        risk_level=risk_level.value,
    )

    scaling_advice = ScalingAdvice(
        add_size=scaling_plan.add_size,
        reduce_size=scaling_plan.reduce_size,
        reason=scaling_plan.reason,
    )

    notes_parts: list[str] = []
    notes_parts.append(
        f"Risk={risk_level.value}, pos={position_size_pct:.2f}% of equity, "
        f"max_risk={request.max_risk_pct:.2f}%."
    )
    if scaling_plan.add_size > 0:
        notes_parts.append(f"Suggest scaling in by {scaling_plan.add_size:.4f}.")
    if scaling_plan.reduce_size > 0:
        notes_parts.append(f"Suggest scaling out by {scaling_plan.reduce_size:.4f}.")

    notes = " ".join(notes_parts) if notes_parts else None

    return RiskAdjustment(
        trade_id=trade.id,
        adjusted_take_profit=adjusted_tp,
        adjusted_stop_loss=adjusted_sl,
        recommended_size=recommended_size,
        risk_score=risk_level.value,
        scaling=scaling_advice,
        notes=notes,
    )


@app.post("/trades/{trade_id}/apply-adjustments")
def apply_adjustments(trade_id: str, adjustment: RiskAdjustment) -> dict:
    """
    Placeholder for applying adjustments via exchange connectors.

    In a production deployment this would:
    - Resolve the correct exchange connector for the symbol/account.
    - Update TP/SL and potentially submit scale-in/scale-out orders.
    - Persist an audit trail of the changes.
    """
    return {
        "trade_id": trade_id,
        "applied": True,
        "details": adjustment.model_dump(),
    }

