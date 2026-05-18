# app/schemas/backtest.py
from pydantic import BaseModel, Field
from typing import Literal, List, Optional

Period = Literal["6 Months", "1 Year", "2 Years", "5 Years"]
EntrySignal = Literal[
  "RSI Oversold (buy)",
  "MACD Bullish Crossover",
  "MA Golden Cross",
  "Momentum Breakout",
]
RiskFocus = Literal["Balanced", "Return focused", "Drawdown focused"]

class BacktestRequest(BaseModel):
  symbol: str = Field(min_length=1, max_length=10)
  period: Period
  entrySignal: EntrySignal
  riskFocus: RiskFocus

class Meta(BaseModel):
  symbol: str
  period: Period
  entrySignal: EntrySignal
  riskFocus: RiskFocus
  startDate: str
  endDate: str
  currency: str = "USD"
  dataPoints: int
  isMock: bool = False

class Metrics(BaseModel):
  totalReturnPct: float
  maxDrawdownPct: float
  winRatePct: float
  trades: int
  cagrPct: Optional[float] = None
  sharpe: Optional[float] = None

class Point(BaseModel):
  t: str
  equity: float

class Trade(BaseModel):
  entryTime: str
  exitTime: str
  side: Literal["LONG", "SHORT"]
  entryPrice: float
  exitPrice: float
  pnlPct: float

class Series(BaseModel):
  equityCurve: List[Point]
  benchmarkCurve: Optional[List[Point]] = None
  trades: Optional[List[Trade]] = None

class BacktestResponse(BaseModel):
  ok: bool
  meta: Optional[Meta] = None
  metrics: Optional[Metrics] = None
  series: Optional[Series] = None
  warnings: List[str] = []
  error: Optional[dict] = None
