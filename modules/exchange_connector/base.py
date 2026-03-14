from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class BaseExchangeConnector(ABC):
    name: str

    def __init__(self, api_key: str, api_secret: str, api_passphrase: Optional[str] = None) -> None:
        self.api_key = api_key
        self.api_secret = api_secret
        self.api_passphrase = api_passphrase

    @abstractmethod
    async def fetch_open_positions(self) -> list[Dict[str, Any]]:
        ...

    @abstractmethod
    async def update_order(self, position_id: str, *, take_profit: float | None, stop_loss: float | None) -> Dict[str, Any]:
        ...

    @abstractmethod
    async def close_partial(self, position_id: str, size: float) -> Dict[str, Any]:
        ...

