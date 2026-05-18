import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "../components/ui/chart";

import { formatCompactNumber, type ResearchData } from "../data/staticResearchData";

import type { StockSummary } from "../types/domain";
import { getStockDetailsData } from "../data/watchlistData";
import { getMarketEvents, type MarketEventsResponse } from "../data/marketEventsApi";

interface StockDetailsProps {
  symbol: string;
  onBack: () => void;
}

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}
type TabKey = "overview" | "technicals" | "events" | "fundamentals" | "explain";


function hoverHandlers(enabled: boolean = true) {
  if (!enabled) return {};
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      (e.currentTarget as HTMLElement).style.background = "var(--hover)";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      (e.currentTarget as HTMLElement).style.background = "transparent";
    },
  };
}

const styles = {
  page: { background: "var(--bg)", color: "var(--text)" } as React.CSSProperties,

  card: {
    background: "var(--card)",
    borderColor: "var(--border)",
  } as React.CSSProperties,

  subCard: {
    background: "var(--bg)",
    borderColor: "var(--border)",
  } as React.CSSProperties,

  text: { color: "var(--text)" } as React.CSSProperties,
  muted: { color: "var(--mutedText)" } as React.CSSProperties,
};

export function StockDetails({ symbol, onBack }: StockDetailsProps) {
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [research, setResearch] = useState<ResearchData | null>(null);

  const [eventsData, setEventsData] = useState<MarketEventsResponse | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");


  useEffect(() => {
  let cancelled = false;

  async function loadEvents() {
    if (tab !== "events") return;

    setEventsLoading(true);
    setEventsError(null);

    try {
      const data = await getMarketEvents(symbol, 7);
      if (!cancelled) setEventsData(data);
    } catch (e: any) {
      if (!cancelled) setEventsError(e?.message ?? "Failed to load events");
    } finally {
      if (!cancelled) setEventsLoading(false);
    }
  }

  loadEvents();
  return () => {
    cancelled = true;
  };
}, [tab, symbol]);


  const latestPoint = research?.series?.[research.series.length - 1];

useEffect(() => {
  let cancelled = false;

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { summary: s, research: r } = await getStockDetailsData(symbol);

      if (cancelled) return;

      setSummary(s);
      setResearch(r);
    } catch (e: any) {
      if (cancelled) return;

      setError(e?.message ?? "Failed to load stock details");
      setSummary(null);
      setResearch(null);
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  load();
  return () => {
    cancelled = true;
  };
}, [symbol]);


  // safe display for PE (since daily API doesn’t provide it)
  const peDisplay =
    summary?.pe === undefined || summary?.pe === null ? "—" : String(summary?.pe);

  const marketCapDisplay =
    summary?.marketCap && summary.marketCap !== "-" ? summary.marketCap : "—";

  const toneText = {
    positive: "text-green-700",
    neutral: "",
    negative: "text-red-600",
  } as const;

  const tonePill = {
    positive: "bg-green-100 text-green-800 border border-green-200",
    neutral: "bg-gray-100 text-gray-800 border border-gray-200",
    negative: "bg-red-100 text-red-800 border border-red-200",
  } as const;

  const impactPill = {
    high: "bg-red-100 text-red-700 border border-red-200",
    medium: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    low: "bg-green-100 text-green-700 border border-green-200",
  } as const;

  const priceChartConfig = {
    close: { label: "Price", color: "hsl(var(--chart-1))" },
    sma20: { label: "20D SMA", color: "hsl(var(--chart-2))" },
  };

  const volumeChartConfig = {
    volume: { label: "Volume", color: "hsl(var(--chart-3))" },
  };

  const rsiChartConfig = {
    rsi: { label: "RSI", color: "hsl(var(--chart-4))" },
  };

  const macdChartConfig = {
    macd: { label: "MACD", color: "hsl(var(--chart-1))" },
    signal: { label: "Signal", color: "hsl(var(--chart-2))" },
  };

  const formatDateTick = (value: string | number) => String(value).slice(5);

  const BackButton = (
    <button
      onClick={onBack}
      className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
      style={{ color: "var(--mutedText)", background: "transparent" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--hover)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Watchlist
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-4" style={styles.page}>
        {BackButton}

        <div className="rounded-lg border shadow-sm p-6" style={styles.card}>
          <p style={styles.text}>Loading {symbol}…</p>
          <p className="text-sm mt-1" style={styles.muted}>
            Fetching daily market data (same source as the watchlist).
          </p>
        </div>
      </div>
    );
  }

  if (error || !summary || !research) {
    return (
      <div className="space-y-4" style={styles.page}>
        {BackButton}

        <div className="rounded-lg border shadow-sm p-6" style={styles.card}>
          <p className="font-medium" style={styles.text}>
            No stock data available.
          </p>
          <p className="text-sm text-red-600 mt-2">{error ?? "Unknown error"}</p>
          <p className="text-sm mt-2" style={styles.muted}>
            If you see rate limit errors, wait ~1 minute and retry.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 -m-6 p-6" style={styles.page}>
      {BackButton}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl" style={styles.text}>
              {summary.symbol}
            </h1>
            <span
              className={`inline-block px-2 py-1 text-xs rounded-md ${
                summary.signal === "bullish"
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : summary.signal === "bearish"
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-gray-100 text-gray-800 border border-gray-200"
              }`}
            >
              {summary.signal}
            </span>
          </div>

          <p className="mb-4" style={styles.muted}>
            {summary.name}
          </p>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl" style={styles.text}>
              ${summary.price.toFixed(2)}
            </span>

            <span
              className={cx(
                "text-lg",
                summary.change >= 0 ? "text-green-600" : "text-red-600",
              )}
            >
              {summary.change >= 0 ? "+" : ""}
              {summary.change.toFixed(2)} (
              {summary.changePercent >= 0 ? "+" : ""}
              {summary.changePercent.toFixed(2)}%)
            </span>
          </div>

          {latestPoint && (
            <p className="text-sm mt-2" style={styles.muted}>
              Last day in chart series:{" "}
              <span className="font-medium" style={styles.text}>
                {latestPoint.date}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Volume", value: summary.volume },
          { label: "Market Cap", value: marketCapDisplay },
          { label: "P/E Ratio", value: peDisplay },
          { label: "Signal", value: summary.signal, cap: true },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border shadow-sm p-4"
            style={styles.card}
          >
            <p className="text-sm mb-1" style={styles.muted}>
              {item.label}
            </p>
            <p
              className={cx("text-lg", item.cap && "capitalize")}
              style={styles.text}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* ====== Custom Tabs (no Radix) ====== */}
      <div className="space-y-4">
        <div className="border rounded-xl shadow-sm p-2" style={styles.card}>
          <div className="w-full flex flex-nowrap gap-2 overflow-x-auto">
            {(
              [
                ["overview", "Overview"],
                ["technicals", "Technicals"],
                ["events", "Events"],
                ["fundamentals", "Fundamentals"],
                ["explain", "Explain"],
              ] as const
            ).map(([key, label]) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cx(
                    "px-4 py-2 rounded-lg border shadow-sm whitespace-nowrap transition-colors",
                    active ? "border-blue-500 shadow-md text-blue-700" : "",
                  )}
                  style={{
                    background: active ? "var(--card)" : "transparent",
                    borderColor: active ? undefined : "var(--border)",
                    color: active ? undefined : "var(--mutedText)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== Overview ===== */}
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="rounded-lg border shadow-sm p-6" style={styles.card}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl" style={styles.text}>
                    Price and Volume
                  </h2>
                  <p className="text-sm" style={styles.muted}>
                    Daily OHLCV from your market API; indicators computed in the app.
                  </p>
                </div>
                <span className="text-xs" style={styles.muted}>
                  Daily series
                </span>
              </div>

              <div className="space-y-4">
                <ChartContainer config={priceChartConfig} className="h-64 w-full aspect-auto">
                  <AreaChart data={research.series} margin={{ left: 12, right: 12, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-1)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-1)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateTick}
                      minTickGap={20}
                      stroke="var(--chart-foreground)"
                      tick={{ fill: "var(--chart-foreground)" }}
                    />                    
                    <YAxis stroke="var(--chart-foreground)" tick={{ fill: "var(--chart-foreground)" }} domain={["dataMin - 2", "dataMax + 2"]} tickFormatter={(value) => value.toFixed(0)} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="close" stroke="var(--color-1)" fill="url(#priceFill)" strokeWidth={2} />
                    <Line type="monotone" dataKey="sma20" stroke="var(--chart-foreground)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ChartContainer>

                <ChartContainer config={volumeChartConfig} className="h-32 w-full aspect-auto">
                  <BarChart data={research.series} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDateTick} minTickGap={20} stroke="var(--chart-foreground)" tick={{ fill: "var(--chart-foreground)" }} />
                    <YAxis stroke="var(--chart-foreground)" tick={{ fill: "var(--chart-foreground)" }} tickFormatter={formatCompactNumber} width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="volume" fill="var(--chart-foreground)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {research.keyStats.map((stat, index) => {
                const toneClass = stat.tone ? toneText[stat.tone] : "";
                return (
                  <div
                    key={`${stat.label}-${index}`}
                    className="rounded-lg border shadow-sm p-4"
                    style={styles.card}
                  >
                    <p className="text-xs uppercase mb-1" style={styles.muted}>
                      {stat.label}
                    </p>
                    <p
                      className={cx("text-lg font-semibold", toneClass)}
                      style={!stat.tone ? styles.text : undefined}
                    >
                      {stat.value}
                    </p>
                    {stat.note && (
                      <p className="text-xs mt-1" style={styles.muted}>
                        {stat.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              className="rounded-lg border shadow-sm p-6"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <h3 className="text-lg mb-3" style={{ color: "var(--text)" }}>
                Research Highlights
              </h3>

              <div className="space-y-2 text-sm" style={{ color: "var(--text)" }}>
                {research.highlights.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-start gap-2">
                    <span
                      className="mt-2 h-1.5 w-1.5 rounded-full"
                      style={{ background: "var(--accent)" }}
                    />
                    <span style={{ color: "var(--text)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== Technicals ===== */}
        {tab === "technicals" && (
          <div className="space-y-4">
            <div className="rounded-lg border shadow-sm p-6" style={styles.card}>
              <h2 className="text-xl mb-2" style={styles.text}>
                RSI (14)
              </h2>
              <p className="text-sm mb-4" style={styles.muted}>
                Relative Strength Index from the same daily series as the overview chart.
              </p>

              <ChartContainer config={rsiChartConfig} className="h-56 w-full aspect-auto">
                <LineChart data={research.series} margin={{ left: 12, right: 12, top: 10 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDateTick} minTickGap={20} />
                  <YAxis domain={[0, 100]} tickCount={6} />
                  <ReferenceLine y={70} stroke="var(--border)" strokeDasharray="4 4" />
                  <ReferenceLine y={30} stroke="var(--border)" strokeDasharray="4 4" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="rsi" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </div>

            <div className="rounded-lg border shadow-sm p-6" style={styles.card}>
              <h2 className="text-xl mb-2" style={styles.text}>
                MACD
              </h2>
              <p className="text-sm mb-4" style={styles.muted}>
                MACD line vs signal line for the same daily period.
              </p>

              <ChartContainer config={macdChartConfig} className="h-56 w-full aspect-auto">
                <LineChart data={research.series} margin={{ left: 12, right: 12, top: 10 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDateTick} minTickGap={20} />
                  <YAxis tickFormatter={(value) => value.toFixed(1)} width={40} />
                  <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend
                    content={(props) => (
                      <ChartLegendContent payload={props.payload} verticalAlign={props.verticalAlign} />
                    )}
                  />
                  <Line type="monotone" dataKey="macd" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="signal" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {research.indicatorSummary.map((stat, index) => {
                const toneClass = stat.tone ? toneText[stat.tone] : "";
                return (
                  <div
                    key={`${stat.label}-${index}`}
                    className="rounded-lg border shadow-sm p-4"
                    style={styles.card}
                  >
                    <p className="text-xs uppercase mb-1" style={styles.muted}>
                      {stat.label}
                    </p>
                    <p
                      className={cx("text-lg font-semibold", toneClass)}
                      style={!stat.tone ? styles.text : undefined}
                    >
                      {stat.value}
                    </p>
                    {stat.note && (
                      <p className="text-xs mt-1" style={styles.muted}>
                        {stat.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== Events ===== */}
        {tab === "events" && (
          <div className="space-y-4">
            {eventsLoading && (
              <p className="text-sm" style={styles.muted}>
                Loading events…
              </p>
            )}

            {!eventsLoading && eventsError && (
              <div className="text-sm text-red-600">
                {eventsError}
              </div>
            )}

            {!eventsLoading && !eventsError && eventsData && (
              <div className="grid lg:grid-cols-3 gap-4">
                {/* News */}
                <div className="lg:col-span-2 rounded-lg border shadow-sm p-6" style={styles.card}>
                  <h2 className="text-xl mb-4" style={styles.text}>
                    News and Catalysts
                  </h2>

                  <div className="space-y-3">
                    {eventsData.news.map((item, index) => (
                      <div
                        key={`${item.title}-${index}`}
                        className="border rounded-lg p-4"
                        style={{ borderColor: "var(--border)", background: "transparent" }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium" style={styles.text}>
                              {item.title}
                            </p>
                            <p className="text-xs mt-1" style={styles.muted}>
                              {item.source} • {item.time}
                            </p>
                          </div>

                          <span className={`text-xs px-2 py-1 rounded-full ${tonePill[item.sentiment]}`}>
                            {item.sentiment}
                          </span>
                        </div>

                        <p className="text-sm mt-2" style={styles.text}>
                          {item.summary}
                        </p>

                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs underline"
                            style={styles.muted}
                          >
                            Open
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  {/* Upcoming Events */}
                  <div className="rounded-lg border shadow-sm p-6" style={styles.card}>
                    <h3 className="text-lg mb-3" style={styles.text}>
                      Upcoming Events
                    </h3>

                    <div className="space-y-3">
                      {eventsData.events.map((event, index) => (
                        <div key={`${event.title}-${index}`} className="flex items-start gap-3">
                          <div className="text-xs w-20" style={styles.muted}>
                            {event.date}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm" style={styles.text}>
                                {event.title}
                              </p>
                              <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${impactPill[event.impact]}`}>
                                {event.impact}
                              </span>
                            </div>
                            <p className="text-xs mt-1" style={styles.muted}>
                              {event.note}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Analyst Activity */}
                  <div className="rounded-lg border shadow-sm p-6" style={styles.card}>
                    <h3 className="text-lg mb-3" style={styles.text}>
                      Analyst Activity
                    </h3>

                    <div className="space-y-3">
                      {eventsData.analysts.map((analyst, index) => (
                        <div key={`${analyst.firm}-${index}`} className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm" style={styles.text}>
                              {analyst.firm}
                            </p>
                            <p className="text-xs mt-1" style={styles.muted}>
                              {analyst.action} - {analyst.rating}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm" style={styles.text}>
                              {analyst.priceTarget}
                            </p>
                            <p className="text-xs mt-1" style={styles.muted}>
                              {analyst.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!eventsLoading && !eventsError && !eventsData && (
              <p className="text-sm" style={styles.muted}>
                No events data yet.
              </p>
            )}
          </div>
        )}


        {/* ===== Fundamentals ===== */}
        {tab === "fundamentals" && (
          <div className="space-y-4">
            <div className="rounded-lg border shadow-sm p-6" style={styles.card}>
              <h2 className="text-xl mb-4" style={styles.text}>
                Fundamental Snapshot
              </h2>
              <p className="text-sm mb-4" style={styles.text}>
                Illustrative fundamentals (not from the daily API).
              </p>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {research.fundamentals.map((metric, index) => (
                  <div
                    key={`${metric.label}-${index}`}
                    className="border rounded-lg p-4"
                    style={styles.subCard}
                  >
                    <p className="text-xs uppercase mb-1" style={styles.muted}>
                      {metric.label}
                    </p>
                    <p className="text-lg" style={styles.text}>
                      {metric.value}
                    </p>
                    {metric.note && (
                      <p className="text-xs mt-1" style={styles.muted}>
                        {metric.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== Explain ===== */}
        {tab === "explain" && (
          <div className="space-y-4">
            <div className="rounded-lg border shadow-sm p-6" style={styles.card}>
              <h2 className="text-xl mb-3" style={styles.text}>
                Educational Explanation
              </h2>

              <p className="text-sm mb-3" style={styles.text}>
                This section explains how to interpret the current signal in a learning context. It is designed for
                students and new investors, not as trading advice.
              </p>

              <p className="text-sm mb-2" style={styles.text}>
                • A <span className="font-semibold">{summary.signal}</span> signal means the indicators currently suggest{" "}
                {summary.signal === "bullish"
                  ? "positive momentum or an uptrend."
                  : summary.signal === "bearish"
                  ? "negative momentum or a downtrend."
                  : "neutral or sideways conditions."}
              </p>

              <p className="text-sm mb-2" style={styles.text}>
                • Historically, momentum signals can be early or late. They may work well in trending markets but give
                false signals in noisy markets.
              </p>

              <p className="text-sm" style={styles.text}>
                • In practice, investors often combine indicators with fundamental research, risk management rules, and
                a clear time horizon instead of relying on a single signal.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
