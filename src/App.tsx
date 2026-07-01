import * as React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";

import AppHeader from "./components/AppHeader";
import ProfileGrid from "./components/ProfileGrid";
import SettingsPage from "./components/SettingsPage";
import type { AppConfig, Theme } from "./types/app_config";

// ── Theme helpers ─────────────────────────────────────────────────────────────

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    // System — follow the OS preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [theme, setTheme] = React.useState<Theme>("dark");

  // Load persisted theme on first mount and apply it immediately.
  React.useEffect(() => {
    invoke<AppConfig>("get_app_config")
      .then((cfg) => {
        setTheme(cfg.theme);
        applyTheme(cfg.theme);
      })
      .catch(console.error);
  }, []);

  // Keep System theme in sync if the OS dark/light preference changes live.
  React.useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) =>
      document.documentElement.classList.toggle("dark", e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function handleThemeChange(newTheme: Theme) {
    setTheme(newTheme);
    applyTheme(newTheme);
    invoke("set_theme", { theme: newTheme }).catch(console.error);
  }

  return (
    <HashRouter>
      <main className="min-h-screen bg-background text-foreground transition-colors duration-200">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <AppHeader />
                <ProfileGrid />
              </>
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                theme={theme}
                onThemeChange={handleThemeChange}
              />
            }
          />
        </Routes>
      </main>
    </HashRouter>
  );
}

export default App;