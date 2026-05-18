# app/main.py
from fastapi import FastAPI
from app.routers.backtest import router as backtest_router
from fastapi.middleware.cors import CORSMiddleware
from app.routers.market import router as market_router
from fastapi import FastAPI
from app.routers.market_news import router as market_events_router
from dotenv import load_dotenv
from app.routers.ask import router as ask_router

load_dotenv()
app = FastAPI()
app.include_router(market_events_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(backtest_router)
app.include_router(market_router)
app.include_router(ask_router)
