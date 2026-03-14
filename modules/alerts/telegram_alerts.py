from typing import Optional


class TelegramAlerter:
    def __init__(self, bot_token: str, chat_id: str) -> None:
        self.bot_token = bot_token
        self.chat_id = chat_id

    async def send_message(self, text: str, parse_mode: Optional[str] = None) -> None:
        """
        Placeholder implementation – wire up HTTP request to Telegram Bot API.
        """
        _ = parse_mode
        # TODO: implement real HTTP call (e.g. via httpx)
        print(f"[TELEGRAM] {text}")

