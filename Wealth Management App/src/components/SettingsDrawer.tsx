import React, { useEffect } from "react";
import { X, Moon, Sun, SlidersHorizontal } from "lucide-react";

type Page = "watchlist" | "stock-details" | "backtest" | "learn";

export type AppSettings = {
  theme: "light" | "dark";
  defaultPage: Exclude<Page, "stock-details">;
  numberFormat: "standard" | "compact";
  dataMode: "live" | "demo";
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  defaultPage: "watchlist",
  numberFormat: "standard",
  dataMode: "live",
};

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem("mi_settings");
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem("mi_settings", JSON.stringify(s));
  } catch {
    // ignore
  }
}

export function SettingsDrawer({
  open,
  onClose,
  settings,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
}) {
  // Plan A theme vars helpers
  const styles = {
    panel: {
      background: "var(--card)",
      borderColor: "var(--border)",
      color: "var(--text)",
    } as React.CSSProperties,
    header: {
      borderColor: "var(--border)",
    } as React.CSSProperties,
    text: {
      color: "var(--text)",
    } as React.CSSProperties,
    muted: {
      color: "var(--mutedText)",
    } as React.CSSProperties,
    subtle: {
      background: "var(--subtle)",
      borderColor: "var(--border)",
      color: "var(--text)",
    } as React.CSSProperties,
  };

  // close on ESC + lock body scroll
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // helper setters
  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...settings, [key]: value };
    onChange(next);
    saveSettings(next);
  };

  const pill = (active: boolean): React.CSSProperties =>
    active
      ? {
          background: "var(--accentSoft)",
          borderColor: "var(--accentBorder)",
          color: "var(--accentText)",
        }
      : {
          background: "transparent",
          borderColor: "var(--border)",
          color: "var(--text)",
        };

  const pillHover = (e: React.MouseEvent<HTMLButtonElement>, on: boolean) => {
    if (on) return;
    e.currentTarget.style.background = "var(--hover)";
  };
  const pillUnhover = (e: React.MouseEvent<HTMLButtonElement>, on: boolean) => {
    if (on) return;
    e.currentTarget.style.background = "transparent";
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cx(
          "fixed inset-0 z-[60] transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{ background: "rgba(0,0,0,0.30)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={cx(
          "fixed right-0 top-0 z-[70] h-full w-[360px] max-w-[90vw] shadow-2xl border-l transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
        style={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div
          className="h-16 px-4 border-b flex items-center justify-between"
          style={styles.header}
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" style={styles.muted} />
            <h2 className="text-base font-semibold" style={styles.text}>
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            aria-label="Close settings"
            style={{ color: "var(--mutedText)", background: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Theme */}
          <section className="space-y-2">
            <p className="text-sm font-medium" style={styles.text}>
              Theme
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set("theme", "light")}
                className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
                style={pill(settings.theme === "light")}
                onMouseEnter={(e) => pillHover(e, settings.theme === "light")}
                onMouseLeave={(e) => pillUnhover(e, settings.theme === "light")}
              >
                <Sun className="h-4 w-4" />
                Light
              </button>

              <button
                type="button"
                onClick={() => set("theme", "dark")}
                className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
                style={pill(settings.theme === "dark")}
                onMouseEnter={(e) => pillHover(e, settings.theme === "dark")}
                onMouseLeave={(e) => pillUnhover(e, settings.theme === "dark")}
              >
                <Moon className="h-4 w-4" />
                Dark
              </button>
            </div>
            <p className="text-xs" style={styles.muted}>
              Theme is applied via CSS variables (Plan A).
            </p>
          </section>

          {/* Default landing */}
          <section className="space-y-2">
            <p className="text-sm font-medium" style={styles.text}>
              Default page
            </p>
            <select
              value={settings.defaultPage}
              onChange={(e) => set("defaultPage", e.target.value as any)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              <option value="watchlist">Watchlist</option>
              <option value="backtest">Backtest</option>
              <option value="learn">Learn</option>
            </select>
          </section>

          {/* Number format */}
          <section className="space-y-2">
            <p className="text-sm font-medium" style={styles.text}>
              Number format
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set("numberFormat", "standard")}
                className="rounded-lg border px-3 py-2 text-sm transition-colors"
                style={pill(settings.numberFormat === "standard")}
                onMouseEnter={(e) => pillHover(e, settings.numberFormat === "standard")}
                onMouseLeave={(e) => pillUnhover(e, settings.numberFormat === "standard")}
              >
                Standard
              </button>

              <button
                type="button"
                onClick={() => set("numberFormat", "compact")}
                className="rounded-lg border px-3 py-2 text-sm transition-colors"
                style={pill(settings.numberFormat === "compact")}
                onMouseEnter={(e) => pillHover(e, settings.numberFormat === "compact")}
                onMouseLeave={(e) => pillUnhover(e, settings.numberFormat === "compact")}
              >
                Compact (83.9M)
              </button>
            </div>
          </section>

          {/* Data mode */}
          <section className="space-y-2">
            <p className="text-sm font-medium" style={styles.text}>
              Data mode
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set("dataMode", "live")}
                className="rounded-lg border px-3 py-2 text-sm transition-colors"
                style={pill(settings.dataMode === "live")}
                onMouseEnter={(e) => pillHover(e, settings.dataMode === "live")}
                onMouseLeave={(e) => pillUnhover(e, settings.dataMode === "live")}
              >
                Live (API)
              </button>

              <button
                type="button"
                onClick={() => set("dataMode", "demo")}
                className="rounded-lg border px-3 py-2 text-sm transition-colors"
                style={pill(settings.dataMode === "demo")}
                onMouseEnter={(e) => pillHover(e, settings.dataMode === "demo")}
                onMouseLeave={(e) => pillUnhover(e, settings.dataMode === "demo")}
              >
                Demo (Static)
              </button>
            </div>
            <p className="text-xs" style={styles.muted}>
              Useful when rate-limited or presenting a demo.
            </p>
          </section>

          <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs" style={styles.muted}>
              Settings are saved locally in your browser.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
