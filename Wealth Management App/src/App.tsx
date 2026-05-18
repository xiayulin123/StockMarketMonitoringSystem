// src/App.tsx
import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Search,
  Bell,
  Settings,
} from "lucide-react";
import { Watchlist } from "./pages/Watchlist";
import { StockDetails } from "./pages/StockDetails";
import { BacktestSandbox } from "./pages/BacktestSandbox";
import { Learn } from "./pages/Learn";
import { loadSettings, SettingsDrawer } from "./components/SettingsDrawer";

type Page = "watchlist" | "stock-details" | "backtest" | "learn";

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("watchlist");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("AAPL");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => loadSettings());

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme; // "light" | "dark"
  }, [settings.theme]);

  const navBtn = (active: boolean) =>
    cx(
      "px-3 py-1.5 text-sm rounded-lg transition-colors",
      active
        ? "bg-blue-50 text-blue-700"
        : "hover:opacity-100",
    );

  const iconBtn =
    "p-2 rounded-full transition-colors";

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>

                <span
                  className="text-lg font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  Market Insight
                </span>
              </div>

              <nav className="hidden md:flex items-center gap-4">
                <button
                  onClick={() => setCurrentPage("watchlist")}
                  className={navBtn(currentPage === "watchlist")}
                  style={
                    currentPage === "watchlist"
                      ? undefined
                      : { color: "var(--mutedText)" }
                  }
                >
                  Watchlist
                </button>

                <button
                  onClick={() => setCurrentPage("backtest")}
                  className={navBtn(currentPage === "backtest")}
                  style={
                    currentPage === "backtest"
                      ? undefined
                      : { color: "var(--mutedText)" }
                  }
                >
                  Backtest
                </button>

                <button
                  onClick={() => setCurrentPage("learn")}
                  className={navBtn(currentPage === "learn")}
                  style={
                    currentPage === "learn"
                      ? undefined
                      : { color: "var(--mutedText)" }
                  }
                >
                  Learn
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <button
                className={iconBtn}
                style={{ background: "transparent" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
                aria-label="Search"
              >
                <Search className="h-4 w-4" style={{ color: "var(--mutedText)" }} />
              </button>

              <button
                className={iconBtn}
                style={{ background: "transparent" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" style={{ color: "var(--mutedText)" }} />
              </button>

              <button
                className={iconBtn}
                style={{ background: "transparent" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
                onClick={() => setSettingsOpen(true)}
                aria-label="Open settings"
              >
                <Settings className="h-4 w-4" style={{ color: "var(--mutedText)" }} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          className="rounded-2xl border shadow-sm p-6 md:p-8"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            outline: "1px solid var(--ring)",
            outlineOffset: "-1px",
          }}
        >
          {currentPage === "watchlist" && (
            <Watchlist
              onStockSelect={(symbol) => {
                setSelectedSymbol(symbol);
                setCurrentPage("stock-details");
              }}
            />
          )}

          {currentPage === "stock-details" && (
            <StockDetails
              symbol={selectedSymbol}
              onBack={() => setCurrentPage("watchlist")}
            />
          )}

          {currentPage === "backtest" && <BacktestSandbox />}
          {currentPage === "learn" && <Learn />}
        </div>
      </main>
    </div>
  );
}
