## Smart Risk Management Bot (`smart-risk-manager`)

**AI-assisted trade manager for manual crypto traders.**  
Adjusts take-profit, stop-loss, and position sizing dynamically based on volatility and account risk, while keeping trade entries fully manual.

### Core Idea

- **No auto-entry**: the trader opens positions manually on their exchange.
- **AI-assisted management**: the bot monitors open positions and:
  - adjusts **TP/SL** based on volatility and trend strength,
  - manages **position size** and scaling in/out,
  - activates **trailing stops** after profit thresholds,
  - computes a **risk score** and sends alerts.

Perfect for **high-leverage** and **swing** traders who want smarter, safer risk management without giving up control.

### Features (MVP Scope)

- **Dynamic TP / SL**
  - Volatility-aware TP/SL proposals (ATR / bands to be plugged into `risk_engine`).
  - Room to move TP in strong trends and tighten SL in chop.
- **Position Sizing & Scaling**
  - Position size suggestions based on account equity and distance to SL.
  - Hooks for **partial exits** and **scaling in/out** via the `scaling_manager`.
- **Trailing Stop Management**
  - Design space for fixed or adaptive trailing logic.
- **Risk Scoring & Alerts**
  - Simple risk score (`LOW` / `MEDIUM` / `HIGH`) based on leverage, size %, and volatility.
  - Telegram/Discord alert stubs for high-risk situations and recommended actions.
- **Exchange Integration Ready**
  - Abstract `BaseExchangeConnector` with Binance, Bybit, and OKX stubs ready to wire to real APIs.

### Project Structure

```text
app/
  main.py                 # FastAPI app entrypoint (health + risk evaluation endpoints)
modules/
  exchange_connector/
    base.py               # Base class for exchange connectors
    binance.py            # Binance stub connector
    bybit.py              # Bybit stub connector
    okx.py                # OKX stub connector
  risk_engine/
    volatility_adjustment.py  # Volatility context + TP/SL adjust hooks
    position_sizing.py        # Account-based position size calculation
    risk_score.py             # Risk score (LOW/MEDIUM/HIGH)
  trade_manager/
    take_profit_manager.py    # TP logic wrapper
    stop_loss_manager.py      # SL logic wrapper
    scaling_manager.py        # Scaling in/out planner
  alerts/
    telegram_alerts.py        # Telegram alert stub
    discord_alerts.py         # Discord alert stub
dashboard/
  README.md                   # Dashboard overview + usage
  package.json                # React/Vite/Tailwind dashboard
  src/                        # Dashboard source
requirements.txt
README.md
```

### Running the Backend (Dev)

```bash
cd smart-risk-management-bot  # repo root
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then open the FastAPI docs at `http://localhost:8000/docs`.

#### Example: Risk Evaluation Request

```json
POST /risk/evaluate
{
  "id": "btc-long-1",
  "symbol": "BTCUSDT",
  "side": "long",
  "entry_price": 63000,
  "size": 0.1,
  "leverage": 10,
  "take_profit": 64000,
  "stop_loss": 61200
}
```

The endpoint returns a **`RiskAdjustment`** payload (currently with placeholder logic) that will later be powered by the `risk_engine` and `trade_manager` modules.

### Next Steps / Roadmap

- **Wire real exchange APIs** (Binance, Bybit, OKX) in `exchange_connector/*`.
- **Implement true volatility metrics** (ATR, Bollinger Bands) in `risk_engine.volatility_adjustment`.
- **Add Redis/PostgreSQL** for positions and audit logging.
- **Build the React/Tailwind dashboard** under `dashboard/` for live monitoring and client demos.
- **Integrate Strategy Guardian AI** as a higher-level strategy brain, with Smart Risk Manager as the execution/risk layer.

### GitHub Topics

Suggested topics:

- `crypto-trading`
- `risk-management`
- `trading-bot`
- `manual-trading`
- `position-sizing`
- `trailing-stop`
- `ai-trading`
- `futures-trading`
- `swing-trading`

