// src/data/watchlistData.ts
import type { StockSummary } from "../types/domain";
import {
  buildResearchDataFromSeries,
  getStaticDailyCandles,
  getStaticResearchData,
  type ResearchData,
  type ResearchSeriesPoint,
} from "./staticResearchData";


export type WatchlistItem = {
  symbol: string;
  name?: string;
};

const STORAGE_KEY = "watchlist_v1";

const defaultWatchlist: WatchlistItem[] = [
  { symbol: "AAPL", name: "Apple Inc." },
];

// 内存态（模块级单例）
let watchlistState: WatchlistItem[] = loadWatchlist();

/** 读取 localStorage */
function loadWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...defaultWatchlist];
    const parsed = JSON.parse(raw) as WatchlistItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [...defaultWatchlist];
    return parsed;
  } catch {
    return [...defaultWatchlist];
  }
}

function saveWatchlist(list: WatchlistItem[]) {
  watchlistState = list;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore storage failures
  }
}

export function getWatchlist(): WatchlistItem[] {
  return watchlistState;
}

export function addToWatchlist(symbol: string, name?: string) {
  const s = symbol.trim().toUpperCase();
  if (!s) throw new Error("Symbol is required");

  const exists = watchlistState.some((x) => x.symbol.toUpperCase() === s);
  if (exists) return;

  saveWatchlist([{ symbol: s, name }, ...watchlistState]);
}

export function removeFromWatchlist(symbol: string) {
  const s = symbol.trim().toUpperCase();
  saveWatchlist(watchlistState.filter((x) => x.symbol.toUpperCase() !== s));
}

/* =========================
   2) Candle + API response types
========================= */

export type Candle = {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type AlphaVantageDailyResponse = {
  "Meta Data"?: Record<string, string>;
  "Time Series (Daily)"?: Record<
    string,
    {
      "1. open": string;
      "2. high": string;
      "3. low": string;
      "4. close": string;
      "5. volume": string;
    }
  >;
  Note?: string; // rate limit
  "Error Message"?: string;
};

/* =========================
   3) Parse
========================= */

function parseDailyCandles(data: AlphaVantageDailyResponse): Candle[] {
  const series = data["Time Series (Daily)"];
  if (!series) return [];

  return Object.entries(series)
    .map(([date, v]) => ({
      date,
      open: Number(v["1. open"]),
      high: Number(v["2. high"]),
      low: Number(v["3. low"]),
      close: Number(v["4. close"]),
      volume: Number(v["5. volume"]),
    }))
    // newest first
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* =========================
   4) API fetch + cache
========================= */


type MarketDailyResponse = {
  ok: boolean;
  symbol?: string;
  candles?: Candle[];
  error?: { code: string; message: string };
};

const dailyCache: Record<string, Candle[]> = {};

function toRangeParam(period?: string): "6m" | "1y" | "2y" | "5y" | "max" {
  return "1y";
}

export async function getDailyCandles(
  symbol: string,
  forceRefresh = false
): Promise<Candle[]> {
  if (!forceRefresh && dailyCache[symbol]) return dailyCache[symbol];

  try {
    const range = toRangeParam();
    const url = new URL("http://127.0.0.1:8000/market/daily");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("range", range);

    const res = await fetch(url.toString());
    const rawText = await res.text();

    if (!res.ok) throw new Error(`Backend error ${res.status}: ${rawText}`);

    const data = JSON.parse(rawText) as MarketDailyResponse;

    if (!data.ok) throw new Error(data.error?.message ?? "Market API failed");
    const candles = data.candles ?? [];
    if (!candles.length) throw new Error(`No candles returned for ${symbol}`);

    dailyCache[symbol] = candles;
    return candles;
  } catch (error) {
    const fallback = getStaticDailyCandles(symbol);
    dailyCache[symbol] = fallback;
    return fallback;
  }
}


/* =========================
   5) 从 Daily candles 生成 StockSummary
   - price / change / changePercent 来自 candles
   - volume 用最新一天 volume（格式化）
   - marketCap / pe: AlphaVantage daily 没有 → 留空
========================= */

function formatVolume(n: number): string {
  if (!Number.isFinite(n)) return "-";
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

function signalFromChangePercent(pct: number): StockSummary["signal"] {
  if (pct >= 1) return "bullish";
  if (pct <= -1) return "bearish";
  return "neutral";
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Build chart/research series from `/market/daily` candles (same dates as headline price).
 * Candles are newest-first from the API; output is oldest-first for Recharts.
 */
export function candlesToResearchSeries(candles: Candle[]): ResearchSeriesPoint[] {
  if (!candles.length) return [];
  const sorted = [...candles].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const closes = sorted.map((c) => c.close);
  const n = closes.length;

  const rollingSma = (period: number, i: number) => {
    const start = Math.max(0, i - period + 1);
    let s = 0;
    for (let j = start; j <= i; j++) s += closes[j];
    return s / (i - start + 1);
  };

  function emaWithPeriod(values: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const out: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i === 0) out[i] = values[0];
      else out[i] = values[i] * k + out[i - 1] * (1 - k);
    }
    return out;
  }

  const ema12 = emaWithPeriod(closes, 12);
  const ema26 = emaWithPeriod(closes, 26);
  const macdLine = closes.map((_, i) => round2(ema12[i] - ema26[i]));
  const signalLine = emaWithPeriod(macdLine, 9);

  const rsiArr = new Array(n).fill(50);
  let avgGain = 0;
  let avgLoss = 0;
  const rsiPeriod = 14;
  for (let i = 1; i < n; i++) {
    const ch = closes[i] - closes[i - 1];
    const gain = Math.max(ch, 0);
    const loss = Math.max(-ch, 0);
    if (i <= rsiPeriod) {
      avgGain += gain;
      avgLoss += loss;
      if (i === rsiPeriod) {
        avgGain /= rsiPeriod;
        avgLoss /= rsiPeriod;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsiArr[i] = 100 - 100 / (1 + rs);
      }
    } else {
      avgGain = (avgGain * (rsiPeriod - 1) + gain) / rsiPeriod;
      avgLoss = (avgLoss * (rsiPeriod - 1) + loss) / rsiPeriod;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsiArr[i] = 100 - 100 / (1 + rs);
    }
  }
  const rsiAt = rsiPeriod < n ? rsiArr[rsiPeriod] : 50;
  for (let i = 1; i < rsiPeriod && i < n; i++) rsiArr[i] = rsiAt;

  return sorted.map((c, i) => ({
    date: c.date,
    close: round2(c.close),
    volume: Math.round(c.volume),
    rsi: clamp(Math.round(rsiArr[i] * 10) / 10, 0, 100),
    macd: round2(macdLine[i]),
    signal: round2(signalLine[i]),
    sma20: round2(rollingSma(20, i)),
    sma50: round2(rollingSma(50, i)),
  }));
}

function stockSummaryFromCandles(item: WatchlistItem, candles: Candle[]): StockSummary {
  const latest = candles[0];
  const prev = candles[1];

  const price = latest?.close ?? 0;
  const change = prev ? price - prev.close : 0;
  const changePercent = prev && prev.close !== 0 ? (change / prev.close) * 100 : 0;

  return {
    symbol: item.symbol,
    name: item.name ?? item.symbol,
    price: Number(price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    volume: latest ? formatVolume(latest.volume) : "-",

    marketCap: "-",
    pe: undefined as any,
    signal: signalFromChangePercent(changePercent),
  };
}

/**
 * One `/market/daily` fetch for summary + research charts (aligned dates).
 */
export async function getStockDetailsData(symbol: string, name?: string): Promise<{
  summary: StockSummary;
  research: ResearchData;
}> {
  const item: WatchlistItem = { symbol, name: name ?? symbol };
  const candles = await getDailyCandles(symbol);
  const summary = stockSummaryFromCandles(item, candles);
  const series = candlesToResearchSeries(candles);
  const research =
    series.length >= 2 ? buildResearchDataFromSeries(symbol, series) : getStaticResearchData(symbol);
  return { summary, research };
}

/**
 * 获取单只股票的 Summary（给 Watchlist 用）
 */
export async function getStockSummary(item: WatchlistItem): Promise<StockSummary> {
  const candles = await getDailyCandles(item.symbol);
  return stockSummaryFromCandles(item, candles);
}

export async function getWatchlistSummaries(): Promise<StockSummary[]> {
  const list = getWatchlist();
  return Promise.all(list.map(getStockSummary));
}