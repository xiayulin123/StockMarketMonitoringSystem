import React, { useEffect, useState } from "react";
import { Plus, TrendingUp, Star, ArrowUpRight } from "lucide-react";
import type { StockSummary } from "../types/domain";
import { getDailyCandles, getWatchlistSummaries, addToWatchlist, removeFromWatchlist } from "../data/watchlistData";import { RecommendedStocksSection } from "../components/RecommendedStocksSection";
import { MostTradedStocksSection } from "../components/MostTradedStocks";


interface WatchlistProps {
  onStockSelect: (symbol: string) => void;
}

// 看股票
export function Watchlist({ onStockSelect }: WatchlistProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [rows, setRows] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [indices, setIndices] = useState<{
    sp?: any;
    ndq?: any;
    dji?: any;
  }>({});


  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // ⚠️ 这些 symbol 必须是你后端 /market/daily 支持的
        const [sp, ndq, dji] = await Promise.all([
          getQuoteFromDaily("^GSPC"),
          getQuoteFromDaily("^IXIC"),
          getQuoteFromDaily("^DJI"),
        ]);

        if (!cancelled) setIndices({ sp, ndq, dji });
      } catch {
        // 如果指数不支持，你也可以换成 ETF: SPY / QQQ / DIA
        if (!cancelled) {
          setIndices({});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const data = await getWatchlistSummaries();
      setRows(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  } 
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddStock() {
    const symbol = newSymbol.trim().toUpperCase();
    setAddError(null);

    if (!symbol) {
      setAddError("Please enter a symbol (e.g., AAPL).");
      return;
    }

    if (rows.some((r) => r.symbol.toUpperCase() === symbol)) {
      setAddError(`${symbol} is already in your watchlist.`);
      return;
    }

    try {
      setAdding(true);
      addToWatchlist(symbol);
      await reload();

      setIsAddOpen(false);
      setNewSymbol("");
    } catch (e: any) {
      setAddError(e?.message ?? "Failed to add stock");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveStock(symbol: string) {
  try {
    removeFromWatchlist(symbol);
    await reload();
  } catch (e: any) {
    setError(e?.message ?? "Failed to remove stock");
  }
}

  function IndexCard({
    title,
    quote,
    styles,
  }: {
    title: string;
    quote?: SimpleQuote;
    styles: any;
  }) {
    const up = (quote?.change ?? 0) >= 0;

    return (
      <div className="rounded-lg border shadow-sm p-4" style={styles.card}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={styles.muted}>
            {title}
          </span>
          <TrendingUp className={`h-4 w-4 ${up ? "text-green-600" : "text-red-600"}`} />
        </div>

        <p className="text-2xl mb-1" style={styles.text}>
          {quote ? quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
        </p>

        <p className={`text-sm ${up ? "text-green-600" : "text-red-600"}`}>
          {quote
            ? `${up ? "+" : ""}${quote.change.toFixed(2)} (${up ? "+" : ""}${quote.changePercent.toFixed(2)}%)`
            : "Loading..."}
        </p>
      </div>
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await getWatchlistSummaries();
        if (!cancelled) setRows(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load watchlist");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const styles = {
    page: { background: "var(--bg)", color: "var(--text)" } as React.CSSProperties,
    card: { background: "var(--card)", borderColor: "var(--border)" } as React.CSSProperties,
    text: { color: "var(--text)" } as React.CSSProperties,
    muted: { color: "var(--mutedText)" } as React.CSSProperties,
    hoverBg: "var(--hover)",
  };

  return (
    <div className="space-y-6 -m-6 p-6" style={styles.page}>
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => !adding && setIsAddOpen(false)}
        >
          <div
            className="w-[92vw] max-w-md rounded-xl border shadow-lg p-4"
            style={styles.card}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg" style={styles.text}>Add a stock</h3>
              <button
                className="text-sm px-2 py-1 rounded"
                style={{ background: "var(--hover)", color: "var(--text)" }}
                onClick={() => !adding && setIsAddOpen(false)}
              >
                Close
              </button>
            </div>

            <label className="text-sm block mb-2" style={styles.muted}>
              Symbol (e.g., AAPL, TSLA)
            </label>

            <input
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddStock();
                if (e.key === "Escape") !adding && setIsAddOpen(false);
              }}
              placeholder="AAPL"
              className="w-full rounded-lg border px-3 py-2 outline-none"
              style={{
                background: "var(--bg)",
                color: "var(--text)",
                borderColor: "var(--border)",
              }}
              disabled={adding}
              autoFocus
            />

            {addError && <div className="text-sm text-red-600 mt-2">{addError}</div>}

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-2 rounded-lg"
                style={{ background: "var(--hover)", color: "var(--text)" }}
                onClick={() => !adding && setIsAddOpen(false)}
                disabled={adding}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 rounded-lg"
                style={{ background: "var(--accent)", color: "#fff", opacity: adding ? 0.8 : 1 }}
                onClick={handleAddStock}
                disabled={adding}
              >
                {adding ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border)" }}>
        <div>
          <h1 className="text-3xl mb-2" style={styles.text}>
            My Watchlist
          </h1>
          <p style={styles.muted}>Track and analyze your favorite stocks</p>
        </div>

        <button
          className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          style={{ background: "var(--accent)", color: "#fff" }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.95)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
          onClick={() => {
            setAddError(null);
            setNewSymbol("");
            setIsAddOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Stock
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <IndexCard title="S&P 500" quote={indices.sp} styles={styles} />
        <IndexCard title="NASDAQ" quote={indices.ndq} styles={styles} />
        <IndexCard title="Dow Jones" quote={indices.dji} styles={styles} />
      </div>

      <div className="rounded-lg border shadow-sm p-6" style={styles.card}>
        <h2 className="text-xl mb-4" style={styles.text}>
          Tracked Stocks
        </h2>

        {loading && <p className="text-sm" style={styles.muted}>Loading watchlist from API…</p>}

        {!loading && error && (
          <div className="text-sm text-red-600">
            {error}
            <div className="text-xs mt-2" style={styles.muted}>
              If this is a rate limit message, wait ~1 minute and refresh.
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th className="text-left py-3 px-4 text-sm" style={styles.muted}>Symbol</th>
                  <th className="text-left py-3 px-4 text-sm" style={styles.muted}>Company</th>
                  <th className="text-right py-3 px-4 text-sm" style={styles.muted}>Price</th>
                  <th className="text-right py-3 px-4 text-sm" style={styles.muted}>Change</th>
                  <th className="text-right py-3 px-4 text-sm" style={styles.muted}>Volume</th>
                  <th className="text-right py-3 px-4 text-sm" style={styles.muted}>Market Cap</th>
                  <th className="text-right py-3 px-4 text-sm" style={styles.muted}>P/E</th>
                  <th className="text-left py-3 px-4 text-sm" style={styles.muted}>Signal</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>

              <tbody>
                {rows.map((stock) => {
                  const marketCapDisplay =
                    stock.marketCap && stock.marketCap !== "-" ? stock.marketCap : "—";
                  const peDisplay =
                    stock.pe === undefined || stock.pe === null ? "—" : String(stock.pe);

                  const pill =
                    stock.signal === "bullish"
                      ? { background: "rgba(34,197,94,.15)", borderColor: "rgba(34,197,94,.35)", color: "rgb(34,197,94)" }
                      : stock.signal === "bearish"
                      ? { background: "rgba(239,68,68,.15)", borderColor: "rgba(239,68,68,.35)", color: "rgb(239,68,68)" }
                      : { background: "rgba(148,163,184,.15)", borderColor: "rgba(148,163,184,.35)", color: "var(--mutedText)" };

                  return (
                    <tr
                      key={stock.symbol}
                      className="border-b cursor-pointer transition-colors"
                      style={{ borderColor: "var(--border)" }}
                      onClick={() => onStockSelect(stock.symbol)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = styles.hoverBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span style={styles.text}>{stock.symbol}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4" style={styles.muted}>
                        {stock.name}
                      </td>

                      <td className="py-3 px-4 text-right" style={styles.text}>
                        ${stock.price.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className={stock.change >= 0 ? "text-green-600" : "text-red-600"}>
                          {stock.change >= 0 ? "+" : ""}
                          {stock.change.toFixed(2)} (
                          {stock.changePercent >= 0 ? "+" : ""}
                          {stock.changePercent.toFixed(2)}%)
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right" style={styles.muted}>
                        {stock.volume}
                      </td>
                      <td className="py-3 px-4 text-right" style={styles.muted}>
                        {marketCapDisplay}
                      </td>
                      <td className="py-3 px-4 text-right" style={styles.text}>
                        {peDisplay}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className="inline-block px-2 py-1 text-xs rounded-md border"
                          style={pill as React.CSSProperties}
                        >
                          {stock.signal}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="text-xs px-2 py-1 rounded-md border"
                            style={{
                              borderColor: "var(--border)",
                              background: "var(--hover)",
                              color: "var(--text)",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveStock(stock.symbol);
                            }}
                            title="Remove from tracked"
                          >
                            Remove
                          </button>

                          <ArrowUpRight className="h-4 w-4" style={styles.muted} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MostTradedStocksSection onStockSelect={onStockSelect} pageSize={20} />
      {/* <RecommendedStocksSection onStockSelect={onStockSelect} pageSize={10} /> */}

    </div>
  );
}

export type SimpleQuote = {
  price: number;
  change: number;
  changePercent: number;
};

export async function getQuoteFromDaily(symbol: string): Promise<SimpleQuote> {
  const candles = await getDailyCandles(symbol);
  const latest = candles[0];
  const prev = candles[1];

  const price = latest?.close ?? 0;
  const change = prev ? price - prev.close : 0;
  const changePercent = prev && prev.close !== 0 ? (change / prev.close) * 100 : 0;

  return {
    price: Number(price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
  };
}