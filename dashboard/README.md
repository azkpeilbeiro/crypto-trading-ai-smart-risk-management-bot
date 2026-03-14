## Smart Risk Manager Dashboard (React)

This folder contains the analytics dashboard that sits on top of the FastAPI backend.

- **Tech stack**: React, TypeScript, Vite, Tailwind CSS
- **Purpose**: Visualize open trades, risk scores, volatility, and scaling/partial-exit activity in real time.

### Running the Dashboard

From the repository root:

```bash
cd dashboard
npm install
npm run dev
```

The app will start on `http://localhost:5173` and proxy API calls from `/api/*`
to the FastAPI backend at `http://localhost:8000`.

### Planned Pages

- **Overview**: active positions, equity curve, current risk exposure.
- **Risk Monitor**: per-trade risk score, liquidation buffer, and recommended actions.
- **History**: log of adjustments, trailing-stop moves, and partial exits.

