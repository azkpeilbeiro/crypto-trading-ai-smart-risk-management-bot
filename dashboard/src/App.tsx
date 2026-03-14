import type { FC, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { createChart, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";

type RiskAdjustment = {
  trade_id: string;
  adjusted_take_profit?: number | null;
  adjusted_stop_loss?: number | null;
  recommended_size?: number | null;
  risk_score?: "LOW" | "MEDIUM" | "HIGH" | null;
  scaling?: {
    add_size: number;
    reduce_size: number;
    reason?: string | null;
  } | null;
  notes?: string | null;
};

type MockPosition = {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  markPrice: number;
  size: number;
  leverage: number;
  unrealizedPnlPct: number;
  riskScore: "LOW" | "MEDIUM" | "HIGH";
};

type MockAdjustmentEvent = {
  id: string;
  time: string;
  symbol: string;
  action: string;
  details: string;
};

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

const MOCK_POSITIONS: MockPosition[] = [
  {
    id: "btc-long-1",
    symbol: "BTCUSDT",
    side: "LONG",
    entryPrice: 71588,
    markPrice: 71780,
    size: 0.25,
    leverage: 10,
    unrealizedPnlPct: 2.7,
    riskScore: "MEDIUM",
  },
  {
    id: "eth-short-1",
    symbol: "ETHUSDT",
    side: "SHORT",
    entryPrice: 2089,
    markPrice: 2025,
    size: 1.5,
    leverage: 8,
    unrealizedPnlPct: 3.1,
    riskScore: "LOW",
  },
  {
    id: "sol-long-1",
    symbol: "SOLUSDT",
    side: "LONG",
    entryPrice: 89,
    markPrice: 85.5,
    size: 80,
    leverage: 12,
    unrealizedPnlPct: -3.9,
    riskScore: "HIGH",
  },
];

const MOCK_ADJUSTMENTS: MockAdjustmentEvent[] = [
  {
    id: "evt-1",
    time: "14:03",
    symbol: "BTCUSDT",
    action: "TP tightened",
    details: "ATR high – TP moved from 64,200 → 63,850",
  },
  {
    id: "evt-2",
    time: "13:41",
    symbol: "SOLUSDT",
    action: "Scale out",
    details: "High risk – reduced size by 25% at +1.8%",
  },
  {
    id: "evt-3",
    time: "13:12",
    symbol: "ETHUSDT",
    action: "Trailing SL",
    details: "Trailing stop raised to lock in +1.2%",
  },
];

const MOCK_EQUITY_POINTS: { t: string; value: number }[] = [
  { t: "10:00", value: 9_820 },
  { t: "11:00", value: 9_950 },
  { t: "12:00", value: 10_120 },
  { t: "13:00", value: 10_040 },
  { t: "14:00", value: 10_260 },
  { t: "15:00", value: 10_380 },
];

function generateInitialCandles(count: number, basePrice: number): Candle[] {
  const candles: Candle[] = [];
  let open = basePrice - 400;
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 1000);
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const change = (Math.random() - 0.48) * 120;
    const close = Math.max(open * 0.998, open + change);
    const high = Math.max(open, close) + Math.random() * 80;
    const low = Math.min(open, close) - Math.random() * 80;
    candles.push({
      time,
      open,
      high: Math.max(high, open, close),
      low: Math.min(low, open, close),
      close,
    });
    open = close;
  }
  return candles;
}

const INITIAL_CANDLES: Candle[] = generateInitialCandles(100, 71588);

const EquityCurve: FC<{ points: { t: string; value: number }[] }> = ({
  points: dataPoints,
}) => {
  const width = 360;
  const height = 120;
  const padding = 16;
  if (!dataPoints.length) return null;
  const values = dataPoints.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = maxV - minV || 1;
  const lastValue = values[values.length - 1];

  const points = dataPoints.map((p, idx) => {
    const x =
      padding + (idx / Math.max(1, dataPoints.length - 1)) * (width - 2 * padding);
    const y =
      height -
      padding -
      ((p.value - minV) / span) * (height - 2 * padding);
    return `${x},${y}`;
  });

  return (
    <div className="mt-2">
      {lastValue != null && (
        <p className="text-right text-xs font-tabular text-slate-400">
          Equity <span className="font-semibold text-emerald-400">${lastValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </p>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-1 w-full rounded-lg border border-slate-700/60 bg-slate-950/60"
      >
      <defs>
        <linearGradient id="equityFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>

      <polyline
        fill="none"
        stroke="#334155"
        strokeWidth="0.5"
        points={`${padding},${height - padding} ${width - padding},${
          height - padding
        }`}
      />

      <polyline
        fill="url(#equityFill)"
        stroke="none"
        points={`${points[0]} ${points
          .slice(1)
          .join(" ")} ${width - padding},${height - padding} ${padding},${
          height - padding
        }`}
      />

      <polyline
        fill="none"
        stroke="#22c55e"
        strokeWidth="1.7"
        strokeLinecap="round"
        points={points.join(" ")}
      />

      {dataPoints.map((p, idx) => {
        const x =
          padding + (idx / Math.max(1, dataPoints.length - 1)) * (width - 2 * padding);
        const y =
          height -
          padding -
          ((p.value - minV) / span) * (height - 2 * padding);
        return (
          <circle key={`${p.t}-${idx}`} cx={x} cy={y} r={2} fill="#22c55e" />
        );
      })}
      </svg>
    </div>
  );
};

const LightweightCandleChart: FC<{ candles: Candle[] }> = ({ candles }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#020617" },
        textColor: "#cbd5f5",
      },
      rightPriceScale: {
        borderColor: "#1f2937",
      },
      timeScale: {
        borderColor: "#1f2937",
      },
      grid: {
        vertLines: { color: "#020617" },
        horzLines: { color: "#020617" },
      },
      autoSize: true,
    });

    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#f97373",
      borderUpColor: "#22c55e",
      borderDownColor: "#f97373",
      wickUpColor: "#22c55e",
      wickDownColor: "#f97373",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    const now = Math.floor(Date.now() / 1000);
    const data = candles.map((candle, idx) => ({
      time: (now - (candles.length - idx) * 60) as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    seriesRef.current.setData(data);
  }, [candles]);

  return (
    <div
      ref={containerRef}
      className="h-72 w-full rounded-lg border border-slate-700/60 bg-slate-950/80"
    />
  );
};

const App: FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RiskAdjustment | null>(null);

  const [positions, setPositions] = useState<MockPosition[]>(MOCK_POSITIONS);
  const [adjustments, setAdjustments] =
    useState<MockAdjustmentEvent[]>(MOCK_ADJUSTMENTS);
  const [equityPoints, setEquityPoints] = useState(MOCK_EQUITY_POINTS);
  const [candles, setCandles] = useState<Candle[]>(INITIAL_CANDLES);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPositions((prev) => {
        return prev.map((p) => {
          const drift = p.markPrice * (Math.random() - 0.5) * 0.0015; // +/- 0.15%
          const newMark = Math.max(0, p.markPrice + drift);
          const direction = p.side === "LONG" ? 1 : -1;
          const pnlPct =
            ((newMark - p.entryPrice) / p.entryPrice) *
            100 *
            direction *
            p.leverage *
            0.25;

          let riskScore: MockPosition["riskScore"] = "LOW";
          const absPnl = Math.abs(pnlPct);
          if (absPnl > 6 || p.leverage >= 12) {
            riskScore = "HIGH";
          } else if (absPnl > 3 || p.leverage >= 8) {
            riskScore = "MEDIUM";
          }

          return {
            ...p,
            markPrice: newMark,
            unrealizedPnlPct: pnlPct,
            riskScore,
          };
        });
      });

      setEquityPoints((prev) => {
        const base = prev[prev.length - 1]?.value ?? 10_000;
        const shock = (Math.random() - 0.4) * 40; // small up-bias
        const next = Math.max(9_500, base + shock);
        const nextPoint = {
          t: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          value: next,
        };
        const updated = [...prev, nextPoint];
        return updated.slice(-12);
      });

      setAdjustments((prev) => {
        if (Math.random() < 0.35) {
          const pos = positions[Math.floor(Math.random() * positions.length)];
          if (!pos) return prev;
          const nowLabel = new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const action =
            pos.unrealizedPnlPct > 0
              ? "Trailing SL"
              : pos.riskScore === "HIGH"
              ? "Scale out"
              : "TP adjusted";
          const details =
            action === "Trailing SL"
              ? `Stop raised to protect ${pos.unrealizedPnlPct.toFixed(
                  1,
                )}% unrealized.`
              : action === "Scale out"
              ? "Reduced exposure by 20% due to elevated risk."
              : "Take-profit tightened based on volatility.";

          const nextEvt: MockAdjustmentEvent = {
            id: `evt-${Date.now()}`,
            time: nowLabel,
            symbol: pos.symbol,
            action,
            details,
          };
          const updated = [nextEvt, ...prev];
          return updated.slice(0, 8);
        }
        return prev;
      });

      setLastUpdated(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );

      setCandles((prev) => {
        const last = prev[prev.length - 1] ?? {
          time: "00:00",
          open: 71588,
          high: 71650,
          low: 71480,
          close: 71588,
        };

        const drift = last.close * (Math.random() - 0.45) * 0.002;
        const nextClose = Math.max(1, last.close + drift);
        const mid = (last.close + nextClose) / 2;
        const range = Math.abs(nextClose - last.close) || last.close * 0.002;
        const high = mid + range * (0.8 + Math.random() * 0.6);
        const low = mid - range * (0.8 + Math.random() * 0.6);

        const timeLabel = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const next: Candle = {
          time: timeLabel,
          open: last.close,
          high,
          low,
          close: nextClose,
        };

        const updated = [...prev, next];
        return updated.slice(-40);
      });
    }, 3_000);

    return () => clearInterval(interval);
  }, [positions]);

  const totalEquity = equityPoints[equityPoints.length - 1]?.value ?? 10_000;
  const totalPnlUsd = positions.reduce(
    (acc, p) => acc + (p.unrealizedPnlPct / 100) * p.size * p.markPrice,
    0,
  );
  const totalPnlPct = totalEquity > 0 ? (totalPnlUsd / totalEquity) * 100 : 0;
  const highRiskCount = positions.filter((p) => p.riskScore === "HIGH").length;

  const handleRunSample = async (evt: FormEvent) => {
    evt.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/risk/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trade: {
            id: "btc-long-demo",
            symbol: "BTCUSDT",
            side: "long",
            entry_price: 71588,
            size: 0.1,
            leverage: 10,
            take_profit: 72800,
            stop_loss: 69800,
          },
          account_equity: 10000,
          max_risk_pct: 1.0,
          volatility_atr: 900, // ~1.4% of price
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with status ${response.status}`);
      }

      const data: RiskAdjustment = await response.json();
      setResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error calling backend";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-700/80 bg-slate-900/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-slate-100">
                Smart Risk Manager
              </h1>
              <p className="text-[11px] text-slate-500">
                AI-assisted risk management for manual traders
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/50 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <span className="text-[11px] font-medium text-slate-300">Live</span>
            </div>
            <span className="font-tabular text-xs text-slate-500">
              {lastUpdated ?? "—"}
            </span>
            <span className="rounded-md border border-slate-700/80 bg-slate-800/50 px-2 py-1 text-[11px] font-medium text-slate-400">
              Demo
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card-border rounded-xl p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Equity</p>
            <p className="mt-1 font-tabular text-lg font-semibold text-slate-100">
              ${totalEquity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="card-border rounded-xl p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Open PnL</p>
            <p className={`mt-1 font-tabular text-lg font-semibold ${totalPnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%
            </p>
          </div>
          <div className="card-border rounded-xl p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Positions</p>
            <p className="mt-1 font-tabular text-lg font-semibold text-slate-100">{positions.length}</p>
          </div>
          <div className="card-border rounded-xl p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">High risk</p>
            <p className="mt-1 font-tabular text-lg font-semibold text-rose-400">{highRiskCount}</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="card-border rounded-xl p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">
                Open Positions
              </h2>
              {lastUpdated && (
                <span className="font-tabular text-[10px] text-slate-500">
                  Updated {lastUpdated}
                </span>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-700/60">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-700/60 bg-slate-800/40 text-slate-400">
                    <th className="px-3 py-2.5 font-medium">Symbol</th>
                    <th className="px-3 py-2.5 font-medium">Side</th>
                    <th className="px-3 py-2.5 font-medium text-right">Size</th>
                    <th className="px-3 py-2.5 font-medium text-right">Lev</th>
                    <th className="px-3 py-2.5 font-medium text-right">Entry</th>
                    <th className="px-3 py-2.5 font-medium text-right">Mark</th>
                    <th className="px-3 py-2.5 font-medium text-right">PnL %</th>
                    <th className="px-3 py-2.5 font-medium text-right">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => (
                    <tr key={pos.id} className="border-b border-slate-800/80 last:border-0 hover:bg-slate-800/30">
                      <td className="px-3 py-2 font-mono text-slate-100">{pos.symbol}</td>
                      <td className="px-3 py-2">
                        <span className={pos.side === "LONG" ? "text-emerald-400" : "text-rose-400"}>
                          {pos.side}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-tabular text-slate-300">{pos.size.toFixed(3)}</td>
                      <td className="px-3 py-2 text-right font-tabular text-slate-300">{pos.leverage}x</td>
                      <td className="px-3 py-2 text-right font-tabular text-slate-400">{pos.entryPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                      <td className="px-3 py-2 text-right font-tabular text-slate-300">{pos.markPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                      <td className="px-3 py-2 text-right font-tabular">
                        <span className={pos.unrealizedPnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                          {pos.unrealizedPnlPct >= 0 ? "+" : ""}{pos.unrealizedPnlPct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          pos.riskScore === "HIGH" ? "bg-rose-500/20 text-rose-400" :
                          pos.riskScore === "MEDIUM" ? "bg-amber-500/20 text-amber-300" :
                          "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {pos.riskScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card-border rounded-xl p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-100">
                Risk Monitor
              </h2>
              <ul className="space-y-2">
                {positions.map((pos) => (
                  <li key={pos.id} className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2">
                    <span className="font-mono text-xs text-slate-200">{pos.symbol}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      pos.riskScore === "HIGH" ? "bg-rose-500/20 text-rose-400" :
                      pos.riskScore === "MEDIUM" ? "bg-amber-500/20 text-amber-300" :
                      "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      {pos.riskScore}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-border rounded-xl p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-100">
                Activity
              </h2>
              <ul className="space-y-0">
                {adjustments.map((evt, i) => (
                  <li key={evt.id} className="relative flex gap-3 pb-3 last:pb-0">
                    {i < adjustments.length - 1 && (
                      <span className="absolute left-[5px] top-3 bottom-0 w-px bg-slate-700" />
                    )}
                    <span className="relative h-2.5 w-2.5 shrink-0 rounded-full bg-slate-600 mt-1.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-tabular text-[10px] text-slate-500">{evt.time}</span>
                        <span className="font-mono text-[11px] text-slate-300">{evt.symbol}</span>
                        <span className="text-[11px] text-slate-400">{evt.action}</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-500">{evt.details}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="card-border rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Risk API & Equity
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Evaluate a trade and view recommended TP/SL and scaling.
              </p>
            </div>
            <form onSubmit={handleRunSample}>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-medium text-emerald-950 shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Evaluating…" : "Run evaluation"}
              </button>
            </form>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr,320px]">
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg border border-rose-700/60 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
                  {error}
                </div>
              )}

              {result && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
                    <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Risk</h3>
                    <p className="mt-1 font-semibold text-emerald-300">{result.risk_score}</p>
                    <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">{result.notes}</p>
                  </div>
                  <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
                    <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">TP / SL</h3>
                    <p className="mt-1 font-tabular text-slate-200">{result.adjusted_take_profit ?? "—"} / {result.adjusted_stop_loss ?? "—"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
                    <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Scaling</h3>
                    <p className="mt-1 font-tabular text-slate-200">
                      +{result.scaling?.add_size?.toFixed(4) ?? "0"} / −{result.scaling?.reduce_size?.toFixed(4) ?? "0"}
                    </p>
                    {result.scaling?.reason && <p className="mt-0.5 text-[10px] text-slate-500">{result.scaling.reason}</p>}
                  </div>
                </div>
              )}
              {!result && !error && (
                <p className="text-xs text-slate-500">
                  Run evaluation to see risk metrics and recommendations.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-slate-700/60 bg-slate-800/30 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-200">Equity curve</h3>
                <span className="font-tabular text-[10px] text-slate-500">{equityPoints.length} pts</span>
              </div>
              <EquityCurve points={equityPoints} />
            </div>
          </div>
        </section>

        <section className="card-border rounded-xl p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-100">
                BTCUSDT
              </h2>
              <span className="rounded border border-slate-600 bg-slate-800/50 px-2 py-0.5 text-[10px] text-slate-400">
                1m
              </span>
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>
            <span className="font-tabular text-[11px] text-slate-500">
              Candlestick · mock feed
            </span>
          </div>
          <LightweightCandleChart candles={candles} />
        </section>
      </main>
    </div>
  );
};

export default App;

