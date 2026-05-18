# app/routers/backtest.py
from fastapi import APIRouter
from datetime import date, timedelta
from typing import List, Optional

import numpy as np
import pandas as pd
import yfinance as yf
import backtrader as bt

from app.schemas.backtest import (
    BacktestRequest, BacktestResponse, Meta, Metrics, Series, Point, Trade
)

router = APIRouter(prefix="", tags=["backtest"])


def period_to_days(p: str) -> int:
    return {"6 Months": 182, "1 Year": 365, "2 Years": 730, "5 Years": 1825}[p]


def compute_max_drawdown(equity: np.ndarray) -> float:
    """
    equity: array of equity values
    returns drawdown in percent (negative number, e.g. -12.3)
    """
    if len(equity) == 0:
        return 0.0
    peak = np.maximum.accumulate(equity)
    dd = (equity - peak) / peak
    return float(np.min(dd) * 100.0)


def compute_cagr(e0: float, e1: float, days: int) -> Optional[float]:
    if days <= 0 or e0 <= 0:
        return None
    years = days / 365.0
    if years <= 0:
        return None
    return float(((e1 / e0) ** (1 / years) - 1) * 100.0)


def compute_sharpe(daily_returns: np.ndarray) -> Optional[float]:
    # 简单 Sharpe：假设无风险利率=0，年化用 sqrt(252)
    if len(daily_returns) < 2:
        return None
    std = np.std(daily_returns, ddof=1)
    if std == 0:
        return None
    return float((np.mean(daily_returns) / std) * np.sqrt(252))


class TradeRecorder(bt.Analyzer):

    def __init__(self):
        self.trades = []

    def notify_trade(self, trade):
        if not trade.isclosed:
            return

        entry_dt = bt.num2date(trade.dtopen).date().isoformat() if trade.dtopen else ""
        exit_dt  = bt.num2date(trade.dtclose).date().isoformat() if trade.dtclose else ""

        entry_price = float(trade.price)  # 平均开仓价（有）
        pnl = float(trade.pnlcomm)        # ✅ 你debug里有正有负

        # ✅ 用 trade.size 估算交易规模（很多版本是可用的）
        size = float(abs(getattr(trade, "size", 0.0) or 0.0))
        value = entry_price * size
        pnl_pct = (pnl / value * 100.0) if value > 0 else float("nan")

        self.trades.append({
            "entryTime": entry_dt,
            "exitTime": exit_dt,
            "side": "LONG",
            "entryPrice": entry_price,
            "exitPrice": entry_price,     # 先占位
            "pnlPct": 0.0 if not np.isfinite(pnl_pct) else float(pnl_pct),
            "pnl": pnl,                   # ✅ 加这个字段用于胜率判断
        })

    def get_analysis(self):
        return {"trades": self.trades}


class EquityCurveAnalyzer(bt.Analyzer):
    """
    每个 bar 记录一次净值
    """
    def __init__(self):
        self.curve = []

    def next(self):
        dt = self.strategy.data.datetime.date(0).isoformat()
        equity = float(self.strategy.broker.getvalue())
        self.curve.append({"t": dt, "equity": equity})

    def get_analysis(self):
        return {"equity": self.curve}


# ---------------- Strategies ----------------

class BaseOnePositionStrategy(bt.Strategy):
    params = dict()

    def __init__(self):
        self.order = None

    def notify_order(self, order):
        if order.status in [order.Submitted, order.Accepted]:
            return
        # 完成/取消都清空引用
        if order.status in [order.Completed, order.Canceled, order.Margin, order.Rejected]:
            self.order = None


class RSIOversoldStrategy(BaseOnePositionStrategy):
    params = dict(rsi_period=14, buy_below=30, sell_above=50)

    def __init__(self):
        super().__init__()
        self.rsi = bt.indicators.RSI(self.data.close, period=self.p.rsi_period)

    def next(self):
        if self.order:
            return

        if not self.position:
            if self.rsi[0] < self.p.buy_below:
                self.order = self.buy()
        else:
            if self.rsi[0] > self.p.sell_above:
                self.order = self.sell()


class MACDBullishCrossoverStrategy(BaseOnePositionStrategy):
    def __init__(self):
        super().__init__()
        macd = bt.indicators.MACD(self.data.close)
        self.crossover = bt.indicators.CrossOver(macd.macd, macd.signal)

    def next(self):
        if self.order:
            return

        if not self.position:
            if self.crossover[0] > 0:   # macd 上穿 signal
                self.order = self.buy()
        else:
            if self.crossover[0] < 0:   # macd 下穿 signal
                self.order = self.sell()


class MAGoldenCrossStrategy(BaseOnePositionStrategy):
    params = dict(fast=50, slow=200)

    def __init__(self):
        super().__init__()
        self.ma_fast = bt.indicators.SMA(self.data.close, period=self.p.fast)
        self.ma_slow = bt.indicators.SMA(self.data.close, period=self.p.slow)
        self.crossover = bt.indicators.CrossOver(self.ma_fast, self.ma_slow)

    def next(self):
        if self.order:
            return

        if not self.position:
            if self.crossover[0] > 0:  # fast 上穿 slow
                self.order = self.buy()
        else:
            if self.crossover[0] < 0:  # fast 下穿 slow
                self.order = self.sell()


class MomentumBreakoutStrategy(BaseOnePositionStrategy):
    params = dict(lookback=20)

    def __init__(self):
        super().__init__()
        self.highest = bt.indicators.Highest(self.data.close, period=self.p.lookback)
        self.lowest = bt.indicators.Lowest(self.data.close, period=self.p.lookback)

    def next(self):
        if self.order:
            return

        if not self.position:
            # 突破前 N 天最高收盘价（排除今天用 [-1]）
            if len(self.data) > self.p.lookback and self.data.close[0] > self.highest[-1]:
                self.order = self.buy()
        else:
            # 跌破前 N 天最低收盘价（简单退出）
            if len(self.data) > self.p.lookback and self.data.close[0] < self.lowest[-1]:
                self.order = self.sell()


def pick_strategy(entry_signal: str):
    mapping = {
        "RSI Oversold (buy)": RSIOversoldStrategy,
        "MACD Bullish Crossover": MACDBullishCrossoverStrategy,
        "MA Golden Cross": MAGoldenCrossStrategy,
        "Momentum Breakout": MomentumBreakoutStrategy,
    }
    return mapping.get(entry_signal, RSIOversoldStrategy)


def apply_risk_focus(cerebro: bt.Cerebro, risk_focus: str):
    """
    简化版 risk 控制（你 UI 的 riskFocus）：
    - Balanced：全仓买入（默认）
    - Return focused：允许更激进（这里仍全仓，未来可加杠杆）
    - Drawdown focused：加一个止损（示例）
    """
    if risk_focus == "Drawdown focused":
        # 加一个简单止损：-8% 止损（演示用途）
        cerebro.addsizer(bt.sizers.PercentSizer, percents=95)  # 留一点现金
    else:
        cerebro.addsizer(bt.sizers.PercentSizer, percents=99)


@router.post("/backtest", response_model=BacktestResponse)
def backtest(req: BacktestRequest) -> BacktestResponse:
    symbol = req.symbol.strip().upper()

    end = date.today()
    start = end - timedelta(days=period_to_days(req.period))

    warnings: List[str] = []

    # 1) fetch price data from yfinance
    df = yf.download(symbol, start=start.isoformat(), end=end.isoformat(), auto_adjust=True, progress=False)

    if df is None or df.empty:
        return BacktestResponse(
            ok=False,
            error={"code": "NO_DATA", "message": f"No price data for {symbol} in selected period."},
            warnings=[f"yfinance returned empty data for {symbol}."],
        )

    # backtrader expects columns: Open High Low Close Volume (Adj Close optional)
    # yfinance download columns may be multiindex; normalize
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    needed = {"Open", "High", "Low", "Close", "Volume"}
    if not needed.issubset(set(df.columns)):
        return BacktestResponse(
            ok=False,
            error={"code": "BAD_DATA", "message": f"Missing columns in data: expected {sorted(list(needed))}"},
            warnings=[f"Columns: {list(df.columns)}"],
        )

    df = df.dropna().copy()
    df.index = pd.to_datetime(df.index)

    # 2) run backtrader
    cerebro = bt.Cerebro(stdstats=False)
    cerebro.broker.setcash(10000.0)

    # strategy
    strat_cls = pick_strategy(req.entrySignal)
    cerebro.addstrategy(strat_cls)

    # risk focus
    apply_risk_focus(cerebro, req.riskFocus)

    data_feed = bt.feeds.PandasData(dataname=df)
    cerebro.adddata(data_feed)

    # analyzers
    cerebro.addanalyzer(TradeRecorder, _name="trades")
    cerebro.addanalyzer(EquityCurveAnalyzer, _name="equity")

    # run
    results = cerebro.run()
    strat = results[0]

    equity_curve_raw = strat.analyzers.equity.get_analysis()["equity"]
    trades_raw = strat.analyzers.trades.get_analysis()["trades"]
    print("DEBUG trades_raw sample:", trades_raw[:5])


    if len(equity_curve_raw) < 2:
        return BacktestResponse(
            ok=False,
            error={"code": "TOO_SHORT", "message": "Not enough data points to compute metrics."},
            warnings=["Equity curve too short."],
        )

    # 3) compute metrics from real equity curve
    equity_vals = np.array([p["equity"] for p in equity_curve_raw], dtype=float)
    e0 = float(equity_vals[0])
    e1 = float(equity_vals[-1])

    total_return_pct = float((e1 - e0) / e0 * 100.0) if e0 != 0 else 0.0
    max_dd_pct = compute_max_drawdown(equity_vals)

    daily_returns = np.diff(equity_vals) / equity_vals[:-1]
    sharpe = compute_sharpe(daily_returns)
    cagr = compute_cagr(e0, e1, days=(end - start).days)

    trades_count = len(trades_raw)
    win_trades = sum(1 for t in trades_raw if t.get("pnl", 0) > 0)   # ✅ 用 pnl
    win_rate_pct = (win_trades / trades_count * 100.0) if trades_count else 0.0

    # 4) format output to schema
    equity_points = [Point(t=p["t"], equity=float(round(p["equity"], 2))) for p in equity_curve_raw]
    trade_points = [Trade(**t) for t in trades_raw] if trades_raw else None

    return BacktestResponse(
        ok=True,
        meta=Meta(
            symbol=symbol,
            period=req.period,
            entrySignal=req.entrySignal,
            riskFocus=req.riskFocus,
            startDate=start.isoformat(),
            endDate=end.isoformat(),
            dataPoints=len(equity_points),
            isMock=False,
        ),
        metrics=Metrics(
            totalReturnPct=round(total_return_pct, 4),
            maxDrawdownPct=round(max_dd_pct, 4),
            winRatePct=round(win_rate_pct, 4),
            trades=trades_count,
            cagrPct=round(cagr, 4) if cagr is not None else None,
            sharpe=round(sharpe, 4) if sharpe is not None else None,
        ),
        series=Series(
            equityCurve=equity_points,
            benchmarkCurve=None,
            trades=trade_points,
        ),
        warnings=warnings,
    )
