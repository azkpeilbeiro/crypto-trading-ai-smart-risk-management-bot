# Smart Risk Management Bot

> AI-powered dynamic trade manager for manual crypto traders. Adjust take-profit, stop-loss, and position sizing automatically—you keep full control of entries.

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Quick Start](#installation--quick-start)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Contact](#contact)
- [License](#license)

---

## Overview

Smart Risk Management Bot is an **AI-assisted trade manager** for manual crypto traders. It does **not** open trades for you—you enter positions on your exchange as usual. The bot then:

- Monitors open positions and adjusts **take-profit** and **stop-loss** based on volatility (ATR, Bollinger Bands).
- Suggests **position size** and **scaling in/out** using account equity and risk limits.
- Activates **trailing stops** and computes a **risk score** with optional Telegram/Discord alerts.

Ideal for **futures**, **high-leverage**, and **swing** traders who want automated risk management without giving up manual control.

---

## Features

| Feature | Description |
|--------|-------------|
| **Dynamic TP/SL** | Volatility-aware adjustments; tighter in chop, extended in trends. |
| **Position sizing** | Size suggestions from equity, stop distance, and optional volatility factor. |
| **Scaling** | Partial exits and scale-in/out logic via the scaling manager. |
| **Risk scoring** | Per-trade risk level (LOW / MEDIUM / HIGH) from leverage, size %, and volatility. |
| **Alerts** | Telegram and Discord stubs for high-risk and recommended actions. |
| **Exchange-ready** | Abstract connector with stubs for **Binance**, **Bybit**, and **OKX**. |
| **Dashboard** | React + Vite + Tailwind UI with live positions, risk monitor, and TradingView-style charts. |

---

## Screenshots

Screenshots live in the `images/` folder. Add files (e.g. `dashboard.png`, `chart.png`) to display them here.

| Dashboard | Chart |
|-----------|--------|
| ![Dashboard](images/dashboard.png) | ![Chart](images/chart.png) |

| Positions & Risk | Equity & API |
|------------------|--------------|
| ![Positions](images/positions.png) | ![Equity](images/equity.png) |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.10+, FastAPI, Pydantic |
| **Risk engine** | ATR, Bollinger width, realized vol; position sizing & risk score |
| **Dashboard** | React 18, TypeScript, Vite, Tailwind CSS, lightweight-charts |
| **Alerts** | Telegram / Discord (stubs; wire with `httpx`) |
| **Data (planned)** | Redis, PostgreSQL |

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** (for the dashboard)
- **npm** or **yarn**

---

## Installation & Quick Start

### 1. Clone and enter the repo

```bash
git clone https://github.com/azkpeilbeiro/crypto-trading-ai-smart-risk-management-bot.git
cd crypto-trading-ai-smart-risk-management-bot
```

### 2. Backend (FastAPI)

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: **http://localhost:8000/docs**

### 3. Dashboard (React)

```bash
cd dashboard
npm install
npm run dev
```

Dashboard: **http://localhost:5173** (proxies `/api` to the backend on port 8000).

---

## API Reference

### Health check

```http
GET /health
```

Returns `{"status": "ok"}`.

### Risk evaluation

Evaluates a trade and returns adjusted TP/SL, recommended size, risk score, and scaling advice.

```http
POST /risk/evaluate
Content-Type: application/json
```

**Request body:**

```json
{
  "trade": {
    "id": "btc-long-1",
    "symbol": "BTCUSDT",
    "side": "long",
    "entry_price": 71588,
    "size": 0.1,
    "leverage": 10,
    "take_profit": 72800,
    "stop_loss": 69800
  },
  "account_equity": 10000,
  "max_risk_pct": 1.0,
  "volatility_atr": 900,
  "volatility_score": null
}
```

**Response:** `RiskAdjustment` with `adjusted_take_profit`, `adjusted_stop_loss`, `recommended_size`, `risk_score`, `scaling`, and `notes`.

### Apply adjustments (stub)

```http
POST /trades/{trade_id}/apply-adjustments
Content-Type: application/json
```

Body: same shape as `RiskAdjustment`. In production this would call the exchange API to update orders.

---

## Project Structure

```
├── app/
│   └── main.py              # FastAPI app, /health, /risk/evaluate, /trades/.../apply-adjustments
├── modules/
│   ├── exchange_connector/  # Base + Binance, Bybit, OKX stubs
│   ├── risk_engine/         # Volatility, position sizing, risk score
│   ├── trade_manager/       # TP/SL and scaling logic
│   └── alerts/              # Telegram, Discord stubs
├── dashboard/               # React + Vite + Tailwind + lightweight-charts
├── images/                  # Screenshots for README
├── requirements.txt
└── README.md
```

---

## Roadmap

- [ ] Wire real exchange APIs (Binance, Bybit, OKX) in `exchange_connector/`
- [ ] Full ATR/Bollinger pipeline in `risk_engine.volatility_adjustment`
- [ ] Redis/PostgreSQL for positions and audit log
- [ ] Production-ready dashboard with auth and live exchange data
- [ ] Integration with Strategy Guardian AI as strategy layer

---

## 📬 Contact

For questions, support, or help tailoring the Smart Risk Management Bot to your strategy and exchange setup, reach out on Telegram.

[![Telegram](https://img.shields.io/badge/Telegram-Contact%20me-blue?style=for-the-badge&logo=telegram)](https://t.me/galileo0000)
---