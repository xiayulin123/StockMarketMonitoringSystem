export type ResearchTone = "positive" | "neutral" | "negative";

export type ResearchSeriesPoint = {
  date: string;
  close: number;
  volume: number;
  rsi: number;
  macd: number;
  signal: number;
  sma20: number;
  sma50: number;
};

export type StaticCandle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ResearchStat = {
  label: string;
  value: string;
  tone?: ResearchTone;
  note?: string;
};

export type ResearchNewsItem = {
  title: string;
  source: string;
  time: string;
  sentiment: ResearchTone;
  summary: string;
};

export type ResearchEvent = {
  date: string;
  title: string;
  impact: "high" | "medium" | "low";
  note: string;
};

export type ResearchAnalyst = {
  firm: string;
  action: string;
  rating: string;
  priceTarget: string;
  time: string;
};

export type ResearchData = {
  series: ResearchSeriesPoint[];
  keyStats: ResearchStat[];
  indicatorSummary: ResearchStat[];
  fundamentals: ResearchStat[];
  highlights: string[];
  news: ResearchNewsItem[];
  events: ResearchEvent[];
  analysts: ResearchAnalyst[];
};

type BasePoint = {
  date: string;
  close: number;
  volume: number;
  rsi: number;
  macd: number;
  signal: number;
};

const BASE_SERIES: BasePoint[] = [
  { date: "2024-09-02", close: 176.2, volume: 98_500_000, rsi: 47, macd: -0.42, signal: -0.55 },
  { date: "2024-09-03", close: 177.1, volume: 94_800_000, rsi: 48, macd: -0.31, signal: -0.48 },
  { date: "2024-09-04", close: 175.9, volume: 102_300_000, rsi: 46, macd: -0.38, signal: -0.46 },
  { date: "2024-09-05", close: 178.3, volume: 108_100_000, rsi: 49, macd: -0.15, signal: -0.32 },
  { date: "2024-09-06", close: 179.4, volume: 112_600_000, rsi: 51, macd: 0.02, signal: -0.18 },
  { date: "2024-09-09", close: 180.6, volume: 97_400_000, rsi: 52, macd: 0.16, signal: -0.02 },
  { date: "2024-09-10", close: 179.8, volume: 92_800_000, rsi: 50, macd: 0.08, signal: -0.01 },
  { date: "2024-09-11", close: 181.7, volume: 105_900_000, rsi: 53, macd: 0.22, signal: 0.04 },
  { date: "2024-09-12", close: 182.5, volume: 100_200_000, rsi: 54, macd: 0.31, signal: 0.12 },
  { date: "2024-09-13", close: 181.9, volume: 99_100_000, rsi: 53, macd: 0.24, signal: 0.18 },
  { date: "2024-09-16", close: 183.6, volume: 110_500_000, rsi: 55, macd: 0.38, signal: 0.23 },
  { date: "2024-09-17", close: 184.1, volume: 103_700_000, rsi: 56, macd: 0.44, signal: 0.30 },
  { date: "2024-09-18", close: 185.2, volume: 118_300_000, rsi: 57, macd: 0.52, signal: 0.36 },
  { date: "2024-09-19", close: 184.7, volume: 95_600_000, rsi: 56, macd: 0.46, signal: 0.39 },
  { date: "2024-09-20", close: 186.3, volume: 120_800_000, rsi: 59, macd: 0.61, signal: 0.46 },
  { date: "2024-09-23", close: 187.1, volume: 107_400_000, rsi: 60, macd: 0.70, signal: 0.52 },
  { date: "2024-09-24", close: 186.8, volume: 101_200_000, rsi: 59, macd: 0.65, signal: 0.55 },
  { date: "2024-09-25", close: 188.4, volume: 113_900_000, rsi: 61, macd: 0.78, signal: 0.62 },
  { date: "2024-09-26", close: 189.2, volume: 109_300_000, rsi: 62, macd: 0.86, signal: 0.68 },
  { date: "2024-09-27", close: 191.0, volume: 104_200_000, rsi: 63, macd: 0.95, signal: 0.74 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function getSeed(symbol: string) {
  return symbol
    .toUpperCase()
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function formatCompactNumber(value: number) {
  if (!Number.isFinite(value)) return "-";
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(Math.round(value));
}

function buildSeries(symbol: string): ResearchSeriesPoint[] {
  const seed = getSeed(symbol || "DEMO");
  const priceScale = 0.8 + (seed % 180) / 100;
  const volumeScale = 0.7 + (seed % 50) / 100;
  const rsiShift = (seed % 9) - 4;
  const macdShift = ((seed % 11) - 5) / 10;

  return BASE_SERIES.map((point) => {
    const close = round2(point.close * priceScale);
    const sma20 = round2(close - 1.3 * priceScale);
    const sma50 = round2(close - 4.5 * priceScale);
    return {
      date: point.date,
      close,
      volume: Math.round(point.volume * volumeScale),
      rsi: clamp(point.rsi + rsiShift, 35, 75),
      macd: round2(point.macd + macdShift),
      signal: round2(point.signal + macdShift * 0.8),
      sma20,
      sma50,
    };
  });
}

function buildStaticCandles(series: ResearchSeriesPoint[]): StaticCandle[] {
  return series
    .map((point, index) => {
      const prev = series[index - 1] ?? point;
      const open = prev.close;
      const close = point.close;
      const range = Math.max(open, close) * 0.006;
      const high = round2(Math.max(open, close) + range);
      const low = round2(Math.min(open, close) - range);
      return {
        date: point.date,
        open: round2(open),
        high,
        low,
        close,
        volume: point.volume,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getStaticDailyCandles(symbol: string): StaticCandle[] {
  return buildStaticCandles(buildSeries(symbol));
}

/** Build highlights / stats / demo fundamentals from any research series (e.g. daily API candles). */
export function buildResearchDataFromSeries(symbol: string, series: ResearchSeriesPoint[]): ResearchData {
  if (series.length === 0) {
    return buildResearchDataFromSeries(symbol, buildSeries(symbol));
  }

  const latest = series[series.length - 1];
  const prev = series[series.length - 2] ?? latest;
  const minClose = Math.min(...series.map((point) => point.close));
  const maxClose = Math.max(...series.map((point) => point.close));
  const avgVolume =
    series.reduce((sum, point) => sum + point.volume, 0) / series.length;
  const volumeDelta = ((latest.volume - avgVolume) / avgVolume) * 100;
  const trendAbove = latest.close >= latest.sma50;
  const rsiTone: ResearchTone =
    latest.rsi >= 60 ? "positive" : latest.rsi <= 40 ? "negative" : "neutral";
  const macdTone: ResearchTone =
    latest.macd >= latest.signal ? "positive" : "negative";

  const change = latest.close - prev.close;
  const changePercent = prev.close
    ? (change / prev.close) * 100
    : 0;

  const keyStats: ResearchStat[] = [
    {
      label: "Range",
      value: `$${minClose.toFixed(2)} - $${maxClose.toFixed(2)}`,
    },
    {
      label: "Avg volume",
      value: formatCompactNumber(avgVolume),
      note: `${volumeDelta >= 0 ? "+" : ""}${volumeDelta.toFixed(0)}% vs avg`,
      tone:
        volumeDelta >= 10 ? "positive" : volumeDelta <= -10 ? "negative" : "neutral",
    },
    {
      label: "Trend vs 50D",
      value: trendAbove ? "Above 50D" : "Below 50D",
      tone: trendAbove ? "positive" : "negative",
    },
    {
      label: "RSI (14)",
      value: `${Math.round(latest.rsi)}`,
      tone: rsiTone,
      note: latest.rsi >= 60 ? "Momentum up" : latest.rsi <= 40 ? "Momentum down" : "Neutral",
    },
  ];

  const indicatorSummary: ResearchStat[] = [
    {
      label: "Price change",
      value: `${change >= 0 ? "+" : ""}${change.toFixed(2)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)`,
      tone: change >= 0 ? "positive" : "negative",
      note: "Last session in series",
    },
    {
      label: "MACD",
      value: macdTone === "positive" ? "Bullish cross" : "Below signal",
      tone: macdTone,
      note: `MACD ${latest.macd.toFixed(2)} vs signal ${latest.signal.toFixed(2)}`,
    },
    {
      label: "Volume pulse",
      value: formatCompactNumber(latest.volume),
      tone:
        volumeDelta >= 10 ? "positive" : volumeDelta <= -10 ? "negative" : "neutral",
      note: `${volumeDelta >= 0 ? "+" : ""}${volumeDelta.toFixed(0)}% vs avg`,
    },
  ];

  const fundamentals: ResearchStat[] = [
    { label: "Market Cap", value: "$1.94T", note: "Demo estimate" },
    { label: "Forward P/E", value: "24.6x" },
    { label: "EPS (TTM)", value: "$6.12" },
    { label: "Dividend Yield", value: "0.6%" },
    { label: "Free Cash Flow", value: "$99B" },
    { label: "Debt/Equity", value: "1.2x" },
    { label: "Gross Margin", value: "43%" },
    { label: "Revenue YoY", value: "+8.4%" },
    { label: "Operating Margin", value: "29%" },
  ];

  const highlights = [
    `${symbol} holds above the short-term trend line with steady volume.`,
    "Momentum indicators are improving but not overbought.",
    "Volatility remains contained relative to the demo period range.",
  ];

  const news: ResearchNewsItem[] = [
    {
      title: `${symbol} expands recurring revenue mix`,
      source: "MarketWire",
      time: "2h ago",
      sentiment: "positive",
      summary:
        "Management highlighted stronger subscription attach rates in the latest update.",
    },
    {
      title: `Supply chain update for ${symbol}`,
      source: "Daily Ledger",
      time: "1d ago",
      sentiment: "neutral",
      summary:
        "Channel checks show stable demand with selective promotions heading into Q4.",
    },
    {
      title: `${symbol} faces softer guidance commentary`,
      source: "Street Pulse",
      time: "3d ago",
      sentiment: "negative",
      summary:
        "Executives noted cautious enterprise spending in the near-term outlook.",
    },
  ];

  const events: ResearchEvent[] = [
    {
      date: "2024-10-15",
      title: "Earnings call (demo)",
      impact: "high",
      note: "Consensus looks for mid-single digit revenue growth.",
    },
    {
      date: "2024-10-28",
      title: "Product update",
      impact: "medium",
      note: "New feature set expected for core platform.",
    },
    {
      date: "2024-11-05",
      title: "Dividend record date",
      impact: "low",
      note: "Dividend schedule based on last declaration.",
    },
  ];

  const analysts: ResearchAnalyst[] = [
    {
      firm: "Northwind Equity",
      action: "Reiterate",
      rating: "Buy",
      priceTarget: "$225",
      time: "1d ago",
    },
    {
      firm: "Harbor Capital",
      action: "Raise",
      rating: "Overweight",
      priceTarget: "$218",
      time: "2d ago",
    },
    {
      firm: "Summit Research",
      action: "Maintain",
      rating: "Hold",
      priceTarget: "$205",
      time: "5d ago",
    },
  ];

  return {
    series,
    keyStats,
    indicatorSummary,
    fundamentals,
    highlights,
    news,
    events,
    analysts,
  };
}

export function getStaticResearchData(symbol: string): ResearchData {
  return buildResearchDataFromSeries(symbol, buildSeries(symbol));
}


// ✅ 新增：后端 research API（真实数据）
export async function getResearchData(
  symbol: string,
  period: "6 Months" | "1 Year" | "2 Years" | "5 Years" = "1 Year",
  forceRefresh = false
): Promise<ResearchData> {
  const url = new URL("http://127.0.0.1:8000/market/research");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("period", period);
  if (forceRefresh) url.searchParams.set("force", "1");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch research data (${res.status})`);
  }

  const raw = await res.json();

  if (!raw?.ok) {
    throw new Error(raw?.error?.message ?? "Backend research failed");
  }

  // 后端返回的结构建议：{ ok, data: ResearchData }
  return raw.data as ResearchData;
}

// ✅ 新增：优先真实，失败 fallback static
export async function getResearchDataWithFallback(symbol: string) {
  try {
    return await getResearchData(symbol, "1 Year");
  } catch {
    return getStaticResearchData(symbol);
  }
}
