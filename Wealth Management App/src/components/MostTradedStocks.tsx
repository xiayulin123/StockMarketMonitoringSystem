import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { StockSummary } from "../types/domain";
import { getStockSummary, type WatchlistItem } from "../data/watchlistData";
import { formatCompactNumber } from "../data/staticResearchData";

const RECOMMENDED: WatchlistItem[] = [
  { symbol: "AMZN" },
  { symbol: "META" },
  { symbol: "MSFT" },
  { symbol: "SPY" },
  { symbol: "QQQ" },
  { symbol: "JPM" },
  { symbol: "V" },
  { symbol: "MA" },
  { symbol: "COST" },
  { symbol: "NFLX" },
  { symbol: "XOM" },
  { symbol: "UNH" },
  { symbol: "JNJ" },
  { symbol: "DIS" },
  { symbol: "SHOP.TRT" },
];

type Props = {
  onStockSelect: (symbol: string) => void;
  pageSize?: number; // 默认 10
  title?: string;
};
type MostTradedItem = { symbol: string; volume: number };

export function MostTradedStocksSection({
  onStockSelect,
  pageSize = 10,
  title = "Most Traded Stocks",
}: Props) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const [universe, setUniverse] = useState<MostTradedItem[]>([]);
  const [rows, setRows] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canShowMore = visibleCount < 100;
  const canShowLess = visibleCount > pageSize;
  const volMap = useMemo(() => new Map(universe.map(x => [x.symbol, x.volume])), [universe]);
    const STEP = pageSize; 
    const MAX_RESULTS = 100; 


  // 1) 拉 most-traded symbol 列表
  useEffect(() => {
    let cancelled = false;

    async function loadUniverse() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/market/most-traded?limit=${visibleCount}`);
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data?.error?.message ?? "Failed to load most traded");
        if (!cancelled) setUniverse(data.items);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load most traded");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUniverse();
    return () => {
      cancelled = true;
    };
  }, [visibleCount]);

  // 2) 对 universe 里的 symbol 拉你已有的 StockSummary（价格/涨跌/信号等）
  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      if (universe.length === 0) return;
      setLoading(true);
      setError(null);

      try {
        const data = await Promise.all(universe.map((it) => getStockSummary({ symbol: it.symbol } as any)));
        if (!cancelled) setRows(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load stock summaries");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRows();
    return () => {
      cancelled = true;
    };
  }, [universe]);

  // 主题变量（Plan A）
  const styles = {
    card: { background: "var(--card)", borderColor: "var(--border)" } as React.CSSProperties,
    text: { color: "var(--text)" } as React.CSSProperties,
    muted: { color: "var(--mutedText)" } as React.CSSProperties,
    hoverBg: "var(--hover)",
  };

  return (
    <div className="rounded-lg border shadow-sm p-6" style={styles.card}>
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h2 className="text-xl" style={styles.text}>
            {title}
          </h2>
          <p className="text-sm" style={styles.muted}>
            Showing {rows.length} of {Math.min(visibleCount, MAX_RESULTS)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canShowLess && (
            <button
              className="px-3 py-2 text-sm rounded-lg border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text)", background: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              onClick={() => setVisibleCount(pageSize)}
            >
              Show less
            </button>
          )}
          {canShowMore && (
            <button
              className="px-3 py-2 text-sm rounded-lg transition-colors"
              style={{ background: "var(--accent)", color: "#fff" }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.95)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
              onClick={() => setVisibleCount((c) => Math.min(c + pageSize, MAX_RESULTS))}
            >
              Show more
            </button>
          )}
        </div>
      </div>

      {loading && (
        <p className="text-sm" style={styles.muted}>
          Loading Most Traded Stocks…
        </p>
      )}

      {!loading && error && (
        <div className="text-sm text-red-600">
          {error}
          <div className="text-xs mt-2" style={styles.muted}>
            If this is a rate limit message, wait ~1 minute and try again.
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
                <th className="text-left py-3 px-4 text-sm" style={styles.muted}>Signal</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>

            <tbody>
              {rows.map((stock) => {
                const pill =
                  stock.signal === "bullish"
                    ? {
                        background: "rgba(34,197,94,.15)",
                        borderColor: "rgba(34,197,94,.35)",
                        color: "rgb(34,197,94)",
                      }
                    : stock.signal === "bearish"
                    ? {
                        background: "rgba(239,68,68,.15)",
                        borderColor: "rgba(239,68,68,.35)",
                        color: "rgb(239,68,68)",
                      }
                    : {
                        background: "rgba(148,163,184,.15)",
                        borderColor: "rgba(148,163,184,.35)",
                        color: "var(--mutedText)",
                      };

                return (
                  <tr
                    key={stock.symbol}
                    className="border-b cursor-pointer transition-colors"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() => onStockSelect(stock.symbol)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = styles.hoverBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="py-3 px-4" style={styles.text}>
                      {stock.symbol}
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
                      {formatCompactNumber(volMap.get(stock.symbol) ?? 0)}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-1 text-xs rounded-md border" style={pill as any}>
                        {stock.signal}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <ArrowUpRight className="h-4 w-4" style={styles.muted} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
