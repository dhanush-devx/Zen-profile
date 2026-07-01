import * as React from "react";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import AppHeader from "./components/AppHeader";
import ProfileGrid from "./components/ProfileGrid";
import SettingsPage from "./components/SettingsPage";
import type { AppConfig, Theme } from "./types/app_config";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

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

// ── AppContent ────────────────────────────────────────────────────────────────

function AppContent({
  theme,
  onThemeChange,
}: {
  theme: Theme;
  onThemeChange: (newTheme: Theme) => void;
}) {
  const [showNewProfileModal, setShowNewProfileModal] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useKeyboardShortcuts({
    onNewProfile: () => {
      // Only open if Settings is not open, and modal is not already open
      if (location.pathname === "/" && !showNewProfileModal) {
        setShowNewProfileModal(true);
      }
    },
    onOpenSettings: () => {
      if (location.pathname !== "/settings") {
        navigate("/settings");
      }
    },
    onEscape: () => {
      if (showNewProfileModal) {
        setShowNewProfileModal(false);
      } else if (location.pathname === "/settings") {
        navigate("/");
      }
    },
  });

  // Listen for native macOS menu bar click events
  React.useEffect(() => {
    let active = true;

    const unlistenSettings = listen("menu-settings", () => {
      if (active) {
        if (location.pathname !== "/settings") {
          navigate("/settings");
        }
      }
    });

    const unlistenNewProfile = listen("menu-new-profile", () => {
      if (active) {
        if (location.pathname === "/") {
          setShowNewProfileModal(true);
        } else {
          // If Settings is open, return to main view first, then open modal
          navigate("/");
          setTimeout(() => {
            setShowNewProfileModal(true);
          }, 50);
        }
      }
    });

    return () => {
      active = false;
      unlistenSettings.then((f) => f());
      unlistenNewProfile.then((f) => f());
    };
  }, [location.pathname, navigate]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <AppHeader />
            <ProfileGrid
              showNewProfileModal={showNewProfileModal}
              setShowNewProfileModal={setShowNewProfileModal}
            />
          </>
        }
      />
      <Route
        path="/settings"
        element={
          <SettingsPage
            theme={theme}
            onThemeChange={onThemeChange}
          />
        }
      />
    </Routes>
  );
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
        <AppContent theme={theme} onThemeChange={handleThemeChange} />
      </main>
    </HashRouter>
  );
}

export default App;