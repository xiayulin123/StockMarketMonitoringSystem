import React, { useMemo, useState } from "react";
import {
  Play,
  Loader2,
  Info,
  TrendingUp,
  TrendingDown,
  Percent,
  Hash,
} from "lucide-react";

interface BacktestResult {
  totalReturn: string;
  maxDrawdown: string;
  winRate: string;
  trades: number;
}

type Period = "6 Months" | "1 Year" | "2 Years" | "5 Years";
type EntrySignal =
  | "RSI Oversold (buy)"
  | "MACD Bullish Crossover"
  | "MA Golden Cross"
  | "Momentum Breakout";
type RiskFocus = "Balanced" | "Return focused" | "Drawdown focused";

export function BacktestSandbox() {
  const [isRunning, setIsRunning] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const [symbol, setSymbol] = useState("AAPL");
  const [period, setPeriod] = useState<Period>("6 Months");
  const [signal, setSignal] = useState<EntrySignal>("RSI Oversold (buy)");
  const [risk, setRisk] = useState<RiskFocus>("Balanced");
  

  const canRun = useMemo(
    () => symbol.trim().length > 0 && !isRunning,
    [symbol, isRunning]
  );

  // Theme vars (Plan A)
  const styles = {
    bg: { background: "var(--bg)", color: "var(--text)" } as React.CSSProperties,
    card: { background: "var(--card)", borderColor: "var(--border)" } as React.CSSProperties,
    subtle: { background: "var(--subtle)", borderColor: "var(--border)" } as React.CSSProperties,
    text: { color: "var(--text)" } as React.CSSProperties,
    muted: { color: "var(--mutedText)" } as React.CSSProperties,
  };

  // Inputs: keep tailwind layout, but color via vars
  const controlClass =
    "block w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm transition placeholder:text-gray-400 " +
    "focus:outline-none focus:ring-4";

  const controlStyle: React.CSSProperties = {
    background: "var(--card)",
    color: "var(--text)",
    borderColor: "var(--border)",
  };

  const handleRun = async () => {
    if (!canRun) return;
    setIsRunning(true);
    setHasResult(false);

    try {
      const res = await fetch("/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          period,
          entrySignal: signal,
          riskFocus: risk,
        }),
      });


      const contentType = res.headers.get("content-type") || "";
      const raw = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${raw || "No body"}`);
      if (!contentType.includes("application/json")) {
        throw new Error(`Expected JSON, got: ${contentType}. Body: ${raw}`);
      }
      const data = JSON.parse(raw);


      if (!data.ok) {
        throw new Error(data?.error?.message ?? "Backtest failed");
      }

      // 映射到你现有 UI 的结构（字符串百分比）
      setResult({
        totalReturn: `${data.metrics.totalReturnPct >= 0 ? "+" : ""}${data.metrics.totalReturnPct.toFixed(1)}%`,
        maxDrawdown: `${data.metrics.maxDrawdownPct.toFixed(1)}%`,
        winRate: `${data.metrics.winRatePct.toFixed(1)}%`,
        trades: data.metrics.trades,
      });

      setHasResult(true);

      // 未来：data.series.equityCurve 用于 Recharts
      // setEquitySeries(data.series.equityCurve)

    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      className="space-y-6 rounded-2xl border bg-gradient-to-b p-6"
      style={{
        borderColor: "var(--border)",
        background: "linear-gradient(to bottom, var(--subtle), var(--bg))",
        color: "var(--text)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold" style={styles.text}>
            Backtest Sandbox
          </h1>
          <p className="text-sm max-w-3xl" style={styles.muted}>
            Experiment with simple rules and learn how metrics like return,
            drawdown, and win rate are interpreted. (Educational demo)
          </p>
        </div>

        <div
          className="hidden md:inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
          style={styles.subtle}
        >
          <Info className="h-4 w-4" style={styles.muted} />
          <span style={styles.muted}>Demo data</span>
        </div>
      </div>

      {/* Subtle callout */}
      <div
        className="flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-sm ring-1 ring-black/5"
        style={styles.subtle}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl border"
          style={styles.card}
        >
          <Info className="h-4 w-4 shrink-0" style={styles.muted} />
        </div>

        <div className="text-sm leading-relaxed" style={styles.text}>
          <span className="font-semibold">How to use:</span>{" "}
          Choose a symbol + period + entry signal, then run a demo backtest.
          Later you&apos;ll wire this panel to FastAPI and render the equity curve.
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Left: config */}
        <div className="lg:sticky lg:top-24">
          <div className="rounded-2xl border shadow-sm" style={styles.card}>
            <div className="border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold" style={styles.text}>
                  Strategy Configuration
                </h2>
                <span
                  className="text-xs rounded-full border px-2 py-1"
                  style={styles.subtle}
                >
                  <span style={styles.muted}>Demo</span>
                </span>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <Field label="Stock Symbol" hint="e.g., AAPL, AMZN, NVDA" styles={styles}>
                <input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="AAPL"
                  className={controlClass}
                  style={controlStyle}
                />
              </Field>

              <Field label="Time Period" styles={styles}>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as Period)}
                  className={controlClass + " cursor-pointer pr-10 appearance-none"}
                  style={controlStyle}
                >
                  <option value="6 Months">6 Months</option>
                  <option value="1 Year">1 Year</option>
                  <option value="2 Years">2 Years</option>
                  <option value="5 Years">5 Years</option>
                </select>
              </Field>

              <Field label="Entry Signal" styles={styles}>
                <select
                  value={signal}
                  onChange={(e) => setSignal(e.target.value as EntrySignal)}
                  className={controlClass + " cursor-pointer pr-10 appearance-none"}
                  style={controlStyle}
                >
                  <option value="RSI Oversold (buy)">RSI Oversold (buy)</option>
                  <option value="MACD Bullish Crossover">MACD Bullish Crossover</option>
                  <option value="MA Golden Cross">MA Golden Cross</option>
                  <option value="Momentum Breakout">Momentum Breakout</option>
                </select>
              </Field>

              <Field label="Risk Focus" styles={styles}>
                <select
                  value={risk}
                  onChange={(e) => setRisk(e.target.value as RiskFocus)}
                  className={controlClass + " cursor-pointer pr-10 appearance-none"}
                  style={controlStyle}
                >
                  <option value="Balanced">Balanced</option>
                  <option value="Return focused">Return focused</option>
                  <option value="Drawdown focused">Drawdown focused</option>
                </select>
              </Field>

              <button
                onClick={handleRun}
                disabled={!canRun}
                className="w-full h-11 rounded-xl px-5 text-sm font-semibold
                           focus:outline-none focus:ring-4
                           disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  boxShadow: "0 1px 0 rgba(0,0,0,.08)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.95)")}
                onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
              >
                <span className="flex items-center justify-center gap-2">
                  {isRunning ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="leading-none">Running…</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 translate-y-[0.5px]" />
                      <span className="leading-none">Run Backtest</span>
                    </>
                  )}
                </span>
              </button>

              <div className="rounded-lg border px-3 py-2 text-xs" style={styles.subtle}>
                <span style={styles.muted}>
                  Demo only. Later: POST config to FastAPI and render equity curve +
                  metrics from real price data.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: output */}
        <div>
          {!hasResult ? (
            <div className="rounded-2xl border shadow-sm" style={styles.card}>
              <div className="px-6 py-12 text-center">
                <h3 className="text-lg font-semibold" style={styles.text}>
                  {isRunning ? "Backtest running…" : "No results yet"}
                </h3>

                <p className="mt-2 text-sm max-w-xl mx-auto" style={styles.muted}>
                  {isRunning
                    ? "Generating demo metrics. Next step: show real progress from backend jobs."
                    : "Run a backtest to see performance metrics and an equity curve preview."}
                </p>

                {isRunning && (
                  <div className="mt-6 max-w-md mx-auto">
                    <div
                      className="h-2 w-full rounded-full overflow-hidden"
                      style={{ background: "var(--hover)" }}
                    >
                      <div
                        className="h-full w-2/5 animate-pulse"
                        style={{ background: "var(--accent)" }}
                      />
                    </div>
                    <p className="mt-2 text-xs" style={styles.muted}>
                      Simulating engine…
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border shadow-sm" style={styles.card}>
                <div className="border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold" style={styles.text}>
                        Results
                      </h3>
                      <p className="text-xs mt-1" style={styles.muted}>
                        <span className="font-medium" style={styles.text}>
                          {symbol}
                        </span>{" "}
                        • {period} • {signal} • {risk}
                      </p>
                    </div>
                    <span className="text-xs rounded-full border px-2 py-1" style={styles.subtle}>
                      <span style={styles.muted}>mock</span>
                    </span>
                  </div>
                </div>

                <div className="px-6 py-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiMini
                      title="Total Return"
                      value={result?.totalReturn ?? "--"}
                      icon={<TrendingUp className="h-4 w-4" />}
                      tone="positive"
                      styles={styles}
                    />
                    <KpiMini
                      title="Max Drawdown"
                      value={result?.maxDrawdown ?? "--"}
                      icon={<TrendingDown className="h-4 w-4" />}
                      tone="negative"
                      styles={styles}
                    />
                    <KpiMini
                      title="Win Rate"
                      value={result?.winRate ?? "--"}
                      icon={<Percent className="h-4 w-4" />}
                      tone="neutral"
                      styles={styles}
                    />
                    <KpiMini
                      title="Trades"
                      value={String(result?.trades ?? "--")}
                      icon={<Hash className="h-4 w-4" />}
                      tone="neutral"
                      styles={styles}
                    />
                  </div>

                  <div className="mt-5 rounded-xl border px-6 py-10 text-center" style={styles.subtle}>
                    <p className="text-sm font-medium" style={styles.text}>
                      Equity Curve (placeholder)
                    </p>
                    <p className="text-xs mt-1" style={styles.muted}>
                      Next: plot equity + benchmark with Recharts once backend returns series.
                    </p>
                  </div>

                  <div className="mt-5 text-sm" style={styles.text}>
                    <p>
                      Use return + drawdown together: higher return with extreme
                      drawdowns can be hard to stick with. Win rate alone can be
                      misleading without risk context.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Small field wrapper */
function Field({
  label,
  hint,
  children,
  styles,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  styles: {
    text: React.CSSProperties;
    muted: React.CSSProperties;
  };
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" style={styles.text}>
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs" style={styles.muted}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** KPI mini */
function KpiMini({
  title,
  value,
  icon,
  tone,
  styles,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: "positive" | "negative" | "neutral";
  styles: {
    card: React.CSSProperties;
    text: React.CSSProperties;
    muted: React.CSSProperties;
  };
}) {
  const bar =
    tone === "positive"
      ? "rgba(34,197,94,.9)"
      : tone === "negative"
      ? "rgba(239,68,68,.9)"
      : "rgba(148,163,184,.9)";

  const valueColor =
    tone === "positive"
      ? "rgb(34,197,94)"
      : tone === "negative"
      ? "rgb(239,68,68)"
      : "var(--text)";

  return (
    <div
      className="relative overflow-hidden rounded-xl border px-4 py-3"
      style={styles.card}
    >
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: bar }} />
      <div className="flex items-center justify-between">
        <p className="text-xs" style={styles.muted}>
          {title}
        </p>
        <div style={styles.muted}>{icon}</div>
      </div>
      <p className="mt-2 text-lg font-semibold" style={{ color: valueColor }}>
        {value}
      </p>
    </div>
  );
}
