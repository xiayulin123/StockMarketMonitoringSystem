export type MarketEventsResponse = {
  ok: boolean;
  symbol: string;
  news: Array<{
    title: string;
    source: string;
    time: string;
    summary: string;
    sentiment: "positive" | "neutral" | "negative";
    url?: string;
  }>;
  events: Array<{
    date: string;
    title: string;
    impact: "high" | "medium" | "low";
    note: string;
  }>;
  analysts: Array<{
    firm: string;
    action: string;
    rating: string;
    priceTarget: string;
    time: string;
    sentiment: "positive" | "neutral" | "negative";
  }>;
  meta?: any;
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? ""; // 或者用 vite proxy 就留空

export async function getMarketEvents(symbol: string, days = 7): Promise<MarketEventsResponse> {
  const url = `${API_BASE}/market/events?symbol=${encodeURIComponent(symbol)}&days=${days}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);

  // 防止你遇到的 Unexpected token '<'
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON, got ${ct}. Body: ${text.slice(0, 120)}`);
  }

  const data = JSON.parse(text);
  if (!data?.ok) throw new Error(data?.detail ?? data?.error?.message ?? "market/events failed");

  return data as MarketEventsResponse;
}
