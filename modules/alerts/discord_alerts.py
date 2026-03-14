from typing import Optional


class DiscordAlerter:
    def __init__(self, webhook_url: str) -> None:
        self.webhook_url = webhook_url

    async def send_message(self, content: str, username: Optional[str] = None) -> None:
        """
        Placeholder implementation – wire up HTTP request to Discord webhook.
        """
        _ = username
        # TODO: implement real HTTP call (e.g. via httpx)
        print(f"[DISCORD] {content}")

