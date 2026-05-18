# app/routers/market.py
from fastapi import APIRouter, Query
import pandas as pd
import yfinance as yf
import numpy as np
from app.data.nasdaq100 import NASDAQ_100
import io
import contextlib

router = APIRouter(prefix="/market", tags=["market"])

PERIOD_MAP = {
  "6 Months": "6mo",
  "1 Year": "1y",
  "2 Years": "2y",
  "5 Years": "5y",
}

RANGE_MAP = {
  "6m": "6mo",
  "1y": "1y",
  "2y": "2y",
  "5y": "5y",
  "max": "max",
}

def compute_sma(series: pd.Series, window: int) -> pd.Series:
  return series.rolling(window=window, min_periods=window).mean()

def compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
  delta = close.diff()
  gain = delta.clip(lower=0)
  loss = (-delta).clip(lower=0)

  avg_gain = gain.ewm(alpha=1/period, adjust=False).mean()
  avg_loss = loss.ewm(alpha=1/period, adjust=False).mean()

  rs = avg_gain / avg_loss.replace(0, np.nan)
  rsi = 100 - (100 / (1 + rs))
  return rsi.fillna(method="bfill")

def compute_macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
  ema_fast = close.ewm(span=fast, adjust=False).mean()
  ema_slow = close.ewm(span=slow, adjust=False).mean()
  macd = ema_fast - ema_slow
  sig = macd.ewm(span=signal, adjust=False).mean()
  return macd, sig

def format_compact_number(value: float) -> str:
  if value is None or not np.isfinite(value):
    return "-"
  v = float(value)
  if v >= 1e12: return f"{v/1e12:.1f}T"
  if v >= 1e9:  return f"{v/1e9:.1f}B"
  if v >= 1e6:  return f"{v/1e6:.1f}M"
  if v >= 1e3:  return f"{v/1e3:.1f}K"
  return str(int(round(v)))

@router.get("/daily")
def get_daily(
  symbol: str = Query(..., min_length=1, max_length=10),
  range: str = Query("1y", pattern="^(6m|1y|2y|5y|max)$"),
):
  sym = symbol.strip().upper()
  yf_range = RANGE_MAP[range]

  df = yf.Ticker(sym).history(period=yf_range, interval="1d", auto_adjust=False)
  if df is None or df.empty:
    return {"ok": False, "error": {"code": "NO_DATA", "message": f"No data for {sym}"}}

  df = df.dropna().copy()
  df.index = pd.to_datetime(df.index)

  candles = []
  for idx, row in df.iterrows():
    candles.append({
      "date": idx.date().isoformat(),
      "open": float(row["Open"]),
      "high": float(row["High"]),
      "low": float(row["Low"]),
      "close": float(row["Close"]),
      "volume": float(row.get("Volume", 0) or 0),
    })

  # 你前端 parseDailyCandles 是 newest first
  candles.sort(key=lambda x: x["date"], reverse=True)

  return {"ok": True, "symbol": sym, "candles": candles}


@router.get("/research")
def get_research(
  symbol: str = Query(..., min_length=1, max_length=10),
  period: str = Query("1 Year", pattern="^(6 Months|1 Year|2 Years|5 Years)$"),
):
  sym = symbol.strip().upper()
  yf_period = PERIOD_MAP[period]

  df = yf.Ticker(sym).history(period=yf_period, interval="1d", auto_adjust=False)
  if df is None or df.empty:
    return {"ok": False, "error": {"code": "NO_DATA", "message": f"No data for {sym}"}}

  df = df.dropna().copy()
  df.index = pd.to_datetime(df.index)

  # 只需要 close/volume + 指标
  df["close"] = df["Close"].astype(float)
  df["volume"] = df.get("Volume", 0).fillna(0).astype(float)

  df["sma20"] = compute_sma(df["close"], 20)
  df["sma50"] = compute_sma(df["close"], 50)
  df["rsi"] = compute_rsi(df["close"], 14)
  df["macd"], df["signal"] = compute_macd(df["close"], 12, 26, 9)

  # 去掉前 50 天那种 SMA50 还没出来的行（保证图表不一堆 NaN）
  df = df.dropna(subset=["sma20", "sma50", "rsi", "macd", "signal"]).copy()

  if df.empty:
    return {"ok": False, "error": {"code": "NOT_ENOUGH_DATA", "message": f"Not enough data to compute indicators for {sym}"}}

  # 输出 series：按日期升序（Recharts 画线更自然）
  series = []
  for idx, row in df.iterrows():
    series.append({
      "date": idx.date().isoformat(),
      "close": float(row["close"]),
      "volume": float(row["volume"]),
      "rsi": float(row["rsi"]),
      "macd": float(row["macd"]),
      "signal": float(row["signal"]),
      "sma20": float(row["sma20"]),
      "sma50": float(row["sma50"]),
    })

  latest = series[-1]
  prev = series[-2] if len(series) >= 2 else latest

  closes = [p["close"] for p in series]
  vols = [p["volume"] for p in series]

  min_close = float(min(closes))
  max_close = float(max(closes))
  avg_vol = float(sum(vols) / len(vols))
  vol_delta = ((latest["volume"] - avg_vol) / avg_vol * 100) if avg_vol else 0.0

  change = latest["close"] - prev["close"]
  change_pct = (change / prev["close"] * 100) if prev["close"] else 0.0

  trend_above = latest["close"] >= latest["sma50"]

  # 你前端 ResearchData 结构：fundamentals/news/events/analysts/highlights 先给空/简单占位也行
  data = {
    "series": series,
    "keyStats": [
      {"label": "Range", "value": f"${min_close:.2f} - ${max_close:.2f}"},
      {"label": "Avg volume", "value": format_compact_number(avg_vol), "note": f"{vol_delta:+.0f}% vs avg"},
      {"label": "Trend vs 50D", "value": "Above 50D" if trend_above else "Below 50D"},
      {"label": "RSI (14)", "value": str(int(round(latest["rsi"]))), "note": "Momentum up" if latest["rsi"] >= 60 else "Momentum down" if latest["rsi"] <= 40 else "Neutral"},
    ],
    "indicatorSummary": [
      {"label": "Price change", "value": f"{change:+.2f} ({change_pct:+.2f}%)", "note": "Last session"},
      {"label": "MACD", "value": "Bullish cross" if latest["macd"] >= latest["signal"] else "Below signal", "note": f"MACD {latest['macd']:.2f} vs signal {latest['signal']:.2f}"},
      {"label": "Volume pulse", "value": format_compact_number(latest["volume"]), "note": f"{vol_delta:+.0f}% vs avg"},
    ],
    "fundamentals": [],   # 以后再接更稳的 fundamentals 源
    "highlights": [
      f"{sym} latest close ${latest['close']:.2f}, indicators computed from Yahoo daily bars.",
    ],
    "news": [],
    "events": [],
    "analysts": [],
  }

  return {"ok": True, "symbol": sym, "period": period, "data": data}


@router.get("/most-traded")
def most_traded(
    limit: int = Query(10, ge=1, le=100),
    symbols: str | None = Query(
        None,
        description="Comma-separated symbols. If omitted, use NASDAQ_100."
    ),
):
    universe = NASDAQ_100
    if symbols:
        universe = [s.strip().upper() for s in symbols.split(",") if s.strip()]

    if not universe:
        return {"ok": False, "error": {"code": "NO_SYMBOLS", "message": "No symbols provided"}}

    # yfinance 一次性拉多个 ticker，取最近 5 天（避免节假日/停牌导致没数据）
    buf = io.StringIO()
    with contextlib.redirect_stderr(buf), contextlib.redirect_stdout(buf):
        df = yf.download(
            tickers=" ".join(universe),
            period="5d",
            interval="1d",
            group_by="ticker",
            auto_adjust=False,
            progress=False,
            threads=True,
        )

    if df is None or df.empty:
        return {"ok": False, "error": {"code": "NO_DATA", "message": "No data returned from yfinance"}}

    items = []

    # 多 ticker 时是 MultiIndex columns: (field, ticker) 或 (ticker, field)，不同版本略有差异
    # 这里做兼容解析：最终拿到每个 ticker 的 Volume 序列
    for sym in universe:
        try:
            vol_series = None

            # 常见格式1：df[sym]["Volume"]
            if sym in df.columns.get_level_values(0):
                # columns level0 is ticker
                vol_series = df[sym]["Volume"]
            # 常见格式2：df["Volume"][sym]
            elif "Volume" in df.columns.get_level_values(0):
                vol_series = df["Volume"][sym]
            # 单 ticker 时：df["Volume"]
            elif "Volume" in df.columns:
                vol_series = df["Volume"]

            if vol_series is None:
                continue

            vol_series = vol_series.dropna()
            if vol_series.empty:
                continue

            latest_vol = float(vol_series.iloc[-1])
            items.append({"symbol": sym, "volume": latest_vol})
        except Exception:
            continue

    items.sort(key=lambda x: x["volume"], reverse=True)
    items = items[:limit]

    return {"ok": True, "items": items}