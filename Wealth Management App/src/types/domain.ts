export type Signal = "bullish" | "bearish" | "neutral";

export interface StockSummary {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  pe: number;
  signal: Signal;
}
