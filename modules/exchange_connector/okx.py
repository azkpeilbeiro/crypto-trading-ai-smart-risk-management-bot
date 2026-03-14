from typing import Any, Dict

from .base import BaseExchangeConnector


class OkxConnector(BaseExchangeConnector):
    name = "okx"

    async def fetch_open_positions(self) -> list[Dict[str, Any]]:
        # TODO: integrate with OKX API
        return []

    async def update_order(
        self,
        position_id: str,
        *,
        take_profit: float | None,
        stop_loss: float | None,
    ) -> Dict[str, Any]:
        # TODO: call OKX API to update TP/SL
        return {"position_id": position_id, "take_profit": take_profit, "stop_loss": stop_loss}

    async def close_partial(self, position_id: str, size: float) -> Dict[str, Any]:
        # TODO: place a reduce-only order for partial close
        return {"position_id": position_id, "closed_size": size}

