# app/routers/market_events.py
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Literal, Optional
from dotenv import load_dotenv
import finnhub
from fastapi import APIRouter, HTTPException, Query
load_dotenv()

router = APIRouter(prefix="/market", tags=["market"])

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "").strip()
if not FINNHUB_API_KEY:
    # 你也可以选择不在 import 阶段报错，而是在请求时才报错
    print("WARNING: FINNHUB_API_KEY not set")

client = finnhub.Client(api_key=FINNHUB_API_KEY)

Sentiment = Literal["positive", "neutral", "negative"]
Impact = Literal["high", "medium", "low"]


def _sentiment_from_score(score: float) -> Sentiment:
    if score >= 0.15:
        return "positive"
    if score <= -0.15:
        return "negative"
    return "neutral"


def _impact_from_reco_delta(delta: float) -> Impact:
    # 非严格科学，只是 UI 分类演示：变化越大，impact 越高
    if abs(delta) >= 0.3:
        return "high"
    if abs(delta) >= 0.1:
        return "medium"
    return "low"


@router.get("/events")
def get_market_events(
    symbol: str = Query(..., min_length=1, max_length=12),
    days: int = Query(7, ge=1, le=30),  # 拉最近几天新闻
) -> Dict[str, Any]:
    """
    返回 Events 页需要的数据：
    - news: 新闻/催化剂
    - events: upcoming events（这里用 earnings calendar）
    - analysts: 分析师动态（recommendation trends + price target）
    """
    if not FINNHUB_API_KEY:
        raise HTTPException(status_code=500, detail="FINNHUB_API_KEY not configured")

    s = symbol.strip().upper()

    # -------- News --------
    to_dt = datetime.utcnow().date()
    from_dt = (datetime.utcnow() - timedelta(days=days)).date()

    try:
        raw_news: List[Dict[str, Any]] = client.company_news(
            s,
            _from=from_dt.isoformat(),
            to=to_dt.isoformat(),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Finnhub company_news failed: {e}")

    # Finnhub 的 company_news 本身没有 sentiment 字段
    # ✅ 这里用 “news_sentiment” 作为一个整体的情绪参考（不是逐条新闻）
    sentiment_score = 0.0
    try:
        ns = client.news_sentiment(s)
        sentiment_score = float(ns.get("sentiment", {}).get("score", 0.0) or 0.0)
    except Exception:
        # 不要因为 sentiment 拿不到就失败
        sentiment_score = 0.0

    overall_sent = _sentiment_from_score(sentiment_score)

    news_items = []
    for n in (raw_news or [])[:25]:
        # Finnhub: datetime 是 unix seconds
        ts = n.get("datetime")
        time_str = ""
        if ts:
            try:
                time_str = datetime.utcfromtimestamp(int(ts)).strftime("%Y-%m-%d %H:%M UTC")
            except Exception:
                time_str = ""

        news_items.append(
            {
                "title": n.get("headline") or "",
                "source": n.get("source") or "Finnhub",
                "time": time_str,
                "summary": n.get("summary") or "",
                # 先用 overall 作为展示（想做逐条情绪，后面可以加 vaderTextBlob）
                "sentiment": overall_sent,
                "url": n.get("url") or "",
            }
        )

    # -------- Upcoming Events (Earnings Calendar) --------
    # Finnhub earnings_calendar 可以指定 from/to
    try:
        ec = client.earnings_calendar(
            symbol=s,
            _from=to_dt.isoformat(),
            to=(to_dt + timedelta(days=120)).isoformat(),  # 看未来 120 天
        )
        raw_earnings = ec.get("earningsCalendar", []) if isinstance(ec, dict) else []
    except Exception as e:
        raw_earnings = []

    events_items = []
    for ev in (raw_earnings or [])[:15]:
        # 可能字段：date, hour, epsEstimate, revenueEstimate...
        date_str = ev.get("date") or ""
        hour = ev.get("hour") or ""
        title = f"Earnings ({hour})" if hour else "Earnings"

        # 简单 impact：如果有 epsEstimate 就 medium，否则 low
        impact: Impact = "medium" if ev.get("epsEstimate") is not None else "low"

        note_parts = []
        if ev.get("epsEstimate") is not None:
            note_parts.append(f"EPS est: {ev.get('epsEstimate')}")
        if ev.get("revenueEstimate") is not None:
            note_parts.append(f"Rev est: {ev.get('revenueEstimate')}")
        note = " • ".join(note_parts) if note_parts else "Upcoming earnings release"

        events_items.append(
            {
                "date": date_str,
                "title": title,
                "impact": impact,
                "note": note,
            }
        )

    # -------- Analyst Activity --------
    # 1) Recommendation trends
    try:
        reco = client.recommendation_trends(s) or []
    except Exception:
        reco = []

    latest_reco = reco[0] if len(reco) > 0 else None
    # month: "2025-01-01" 这种
    analysts_items = []

    if latest_reco:
        # 这里用 buy/hold/sell 的变化做一个展示
        buy = float(latest_reco.get("buy") or 0)
        hold = float(latest_reco.get("hold") or 0)
        sell = float(latest_reco.get("sell") or 0)

        # 简单 action：buy 占比高就 bullish，sell 占比高就 bearish
        total = buy + hold + sell
        buy_ratio = (buy / total) if total else 0.0
        sell_ratio = (sell / total) if total else 0.0

        if buy_ratio >= 0.5:
            action = "Upgrade"
            rating = "Bullish"
            sent: Sentiment = "positive"
        elif sell_ratio >= 0.35:
            action = "Downgrade"
            rating = "Bearish"
            sent = "negative"
        else:
            action = "Maintain"
            rating = "Neutral"
            sent = "neutral"

        analysts_items.append(
            {
                "firm": "Street Consensus",
                "action": action,
                "rating": rating,
                "priceTarget": "—",
                "time": latest_reco.get("period") or "",
                "sentiment": sent,
            }
        )

    # 2) Price target
    try:
        pt = client.price_target(s) or {}
    except Exception:
        pt = {}

    if pt:
        analysts_items.append(
            {
                "firm": "Price Target (avg)",
                "action": "Target",
                "rating": "—",
                "priceTarget": str(pt.get("targetMean") or "—"),
                "time": datetime.utcnow().strftime("%Y-%m-%d"),
                "sentiment": "neutral",
            }
        )

    return {
        "ok": True,
        "symbol": s,
        "news": news_items,
        "events": events_items,
        "analysts": analysts_items,
        "meta": {
            "newsDays": days,
            "newsCount": len(news_items),
            "eventsCount": len(events_items),
        },
    }
