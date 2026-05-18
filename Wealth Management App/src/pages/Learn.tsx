import React, { useState } from "react";
import { Search, Sparkles, Loader2 } from "lucide-react";

export function Learn() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickQuestions = [
    "What does RSI above 70 mean?",
    "What is a MACD bullish crossover?",
    "How should I interpret moving average crossovers?",
    "Why can market cap / P/E be missing from quote APIs?",
  ];

  const styles = {
    page: { background: "var(--bg)", color: "var(--text)" } as React.CSSProperties,
    card: { background: "var(--card)", borderColor: "var(--border)" } as React.CSSProperties,
    subtle: { background: "var(--subtle)", borderColor: "var(--border)" } as React.CSSProperties,
    text: { color: "var(--text)" } as React.CSSProperties,
    muted: { color: "var(--mutedText)" } as React.CSSProperties,
    hoverBg: "var(--hover)",
  };

  async function askAI(q?: string) {
    const text = (q ?? question).trim();
    if (!text) return;

    setLoading(true);
    setError(null);
    setAnswer("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Request failed");
      }

      const data = await res.json();
      setAnswer(data?.answer ?? "No answer returned.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to get an answer");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--card)",
    color: "var(--text)",
    borderColor: "var(--border)",
  };

  return (
    <div className="space-y-8" style={styles.page}>
      {/* Hero / Header */}
      <section className="rounded-xl border shadow-sm p-6" style={styles.card}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl" style={styles.text}>
              Learn & Disclaimer
            </h1>
            <p style={styles.muted}>
              This platform is for educational purposes only. It helps you understand how
              indicators and events relate to price movements. It is{" "}
              <span className="font-semibold" style={styles.text}>
                not
              </span>{" "}
              investment advice or a trading recommendation.
            </p>
          </div>

          <div
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            style={{
              background: "var(--accentSoft)",
              borderColor: "var(--accentBorder)",
              color: "var(--accentText)",
            }}
          >
            <Sparkles className="h-4 w-4" />
            Ask questions in-page
          </div>
        </div>

        <div className="mt-5 rounded-lg border p-4" style={styles.subtle}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search
                className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--accentIcon)" }}
              />
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") askAI();
                }}
                placeholder="Ask: e.g., What does RSI mean? Why is P/E missing?"
                className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2"
                style={{
                  ...inputStyle,
                  // focus ring color via vars
                  boxShadow: "0 0 0 0 rgba(0,0,0,0)",
                }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px var(--focusRing)")}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "0 0 0 0 rgba(0,0,0,0)")}
              />
            </div>

            <button
              type="button"
              onClick={() => askAI()}
              disabled={loading || !question.trim()}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border transition",
                loading || !question.trim()
                  ? "cursor-not-allowed opacity-60"
                  : "",
              ].join(" ")}
              style={
                loading || !question.trim()
                  ? {
                      background: "var(--subtle)",
                      borderColor: "var(--border)",
                      color: "var(--mutedText)",
                    }
                  : {
                      background: "var(--accent)",
                      borderColor: "var(--accent)",
                      color: "#fff",
                    }
              }
              onMouseEnter={(e) => {
                if (!(loading || !question.trim())) e.currentTarget.style.filter = "brightness(0.95)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = "brightness(1)";
              }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Ask AI
            </button>
          </div>

          {/* Quick questions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {quickQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setQuestion(q);
                  askAI(q);
                }}
                className="text-xs rounded-full border px-3 py-1 transition"
                style={{
                  background: "var(--card)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = styles.hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--card)")}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Answer */}
          {(error || answer) && (
            <div className="mt-4 rounded-lg border p-4" style={styles.card}>
              {error ? (
                <p className="text-sm" style={{ color: "var(--danger)" }}>
                  {error}
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium" style={styles.muted}>
                    Answer
                  </p>
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={styles.text}
                  >
                    {answer}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Cards */}
      <section className="grid md:grid-cols-2 gap-6">
        {[
          {
            title: "Momentum & Trend",
            desc:
              "Momentum indicators (like RSI and MACD) try to capture the speed and direction of price changes. They are often used to identify overbought or oversold conditions, or when a trend may be starting or ending.",
          },
          {
            title: "Volatility",
            desc:
              "Volatility describes how much a price moves around its average. Higher volatility usually means higher risk and larger swings in portfolio value, both up and down.",
          },
          {
            title: "Moving Averages",
            desc:
              "Moving averages smooth out short-term noise. Crossovers between short and long moving averages are often used as simple “trend following” signals.",
          },
          {
            title: "Fundamentals",
            desc:
              "Ratios like P/E, P/B, and P/S compare a company's price to its earnings, book value, or sales. They help you understand whether a stock is relatively expensive or cheap compared to its fundamentals.",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-xl border shadow-sm p-5 transition-shadow"
            style={styles.card}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,.10)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "")}
          >
            <h2 className="text-xl mb-2" style={styles.text}>
              {card.title}
            </h2>
            <p className="text-sm leading-relaxed" style={styles.muted}>
              {card.desc}
            </p>
          </div>
        ))}
      </section>

      {/* How to use */}
      <section className="rounded-xl border shadow-sm p-6" style={styles.card}>
        <h2 className="text-xl mb-2" style={styles.text}>
          How to Use This Platform
        </h2>
        <ul className="list-disc list-inside text-sm space-y-1" style={styles.muted}>
          <li>Start from the Watchlist to see an overview of tracked stocks.</li>
          <li>Open a stock in Stock Details to see price, basic metrics, and signals.</li>
          <li>
            Use the Backtest Sandbox to experiment with simple rules and understand how they
            would have behaved historically.
          </li>
          <li>Always combine indicators with your own research and risk tolerance.</li>
        </ul>
      </section>
    </div>
  );
}
