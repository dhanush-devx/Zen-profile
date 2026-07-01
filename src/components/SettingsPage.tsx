import * as React from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  ArrowLeft,
  Monitor,
  Moon,
  Sun,
  FolderOpen,
  ExternalLink,
} from "lucide-react";

import { Link } from "react-router-dom";
import type { Theme, VersionInfo } from "../types/app_config";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

// ── Settings Page ─────────────────────────────────────────────────────────────

export default function SettingsPage({ theme, onThemeChange }: Props) {
  const [launchAtLogin, setLaunchAtLogin] = React.useState(false);
  const [launchError, setLaunchError] = React.useState<string | null>(null);
  const [versionInfo, setVersionInfo] = React.useState<VersionInfo | null>(null);

  React.useEffect(() => {
    // Read launch-at-login state from the OS via the autostart plugin.
    invoke<boolean>("get_launch_at_login")
      .then(setLaunchAtLogin)
      .catch((err) => console.error("get_launch_at_login:", err));

    // Fetch version / platform info from Rust.
    invoke<VersionInfo>("get_version_info")
      .then(setVersionInfo)
      .catch((err) => console.error("get_version_info:", err));
  }, []);

  async function handleLaunchAtLoginToggle() {
    const next = !launchAtLogin;
    setLaunchAtLogin(next);
    setLaunchError(null);
    try {
      await invoke("set_launch_at_login", { enabled: next });
    } catch (err) {
      // Revert optimistic update on failure.
      setLaunchAtLogin(!next);
      setLaunchError(
        typeof err === "string" ? err : "Failed to update launch setting."
      );
    }
  }

  async function handleOpenFolder() {
    try {
      await invoke("open_settings_folder");
    } catch (err) {
      console.error("open_settings_folder:", err);
    }
  }

  // ── Theme options ───────────────────────────────────────────────────────────
  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] =
    [
      { value: "system", label: "System", icon: <Monitor size={13} /> },
      { value: "dark", label: "Dark", icon: <Moon size={13} /> },
      { value: "light", label: "Light", icon: <Sun size={13} /> },
    ];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-10 flex items-center gap-3">
        <Link
          to="/"
          className="
            flex items-center gap-1.5
            rounded-lg px-3 py-2
            text-sm text-muted-foreground
            transition-colors hover:bg-accent hover:text-accent-foreground
          "
        >
          <ArrowLeft size={15} />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      {/* ── Sections ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">

        {/* ── Appearance ───────────────────────────────────────────────── */}
        <Section title="Appearance">
          <Row
            label="Theme"
            description="Choose the application color scheme."
          >
            {/* Segmented control */}
            <div className="flex rounded-xl border border-border bg-muted/50 p-1 gap-0.5">
              {themeOptions.map(({ value, label, icon }) => (
                <button
                  key={value}
                  id={`theme-${value}`}
                  onClick={() => onThemeChange(value)}
                  className={`
                    flex items-center gap-1.5
                    rounded-lg px-3 py-1.5
                    text-sm font-medium
                    transition-all duration-150
                    ${
                      theme === value
                        ? "bg-violet-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                    }
                  `}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        {/* ── Startup ──────────────────────────────────────────────────── */}
        <Section title="Startup">
          <Row
            label="Launch at Login"
            description="Automatically open ZenProfile when you log in to macOS."
          >
            <Toggle
              id="launch-at-login"
              checked={launchAtLogin}
              onChange={handleLaunchAtLoginToggle}
            />
          </Row>
          {launchError && (
            <p className="px-4 pb-3 text-xs text-destructive" role="alert">
              {launchError}
            </p>
          )}
        </Section>

        {/* ── About ────────────────────────────────────────────────────── */}
        <Section title="About">
          {versionInfo ? (
            <>
              {/* App identity */}
              <div className="px-4 pt-3 pb-4">
                <p className="text-[15px] font-semibold text-foreground">
                  {versionInfo.app_name}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Version {versionInfo.app_version}
                </p>
                {/* Stack badges */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    `Tauri ${versionInfo.tauri_version}`,
                    `React ${React.version}`,
                    versionInfo.platform === "macos"
                      ? "macOS"
                      : versionInfo.platform,
                  ].map((badge) => (
                    <span
                      key={badge}
                      className="
                        rounded-md border border-border
                        bg-muted/60
                        px-2 py-0.5
                        text-xs text-muted-foreground
                      "
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 border-t border-border/60 px-4 py-3">
                <OutlineButton
                  id="btn-github"
                  icon={<Github size={13} />}
                  label="GitHub"
                  onClick={() =>
                    openUrl("https://github.com/dhanush-devx/zen-profile")
                  }
                />
                <OutlineButton
                  id="btn-report-issue"
                  icon={<ExternalLink size={13} />}
                  label="Report an Issue"
                  onClick={() =>
                    openUrl(
                      "https://github.com/dhanush-devx/zen-profile/issues/new"
                    )
                  }
                />
              </div>
            </>
          ) : (
            <div className="px-4 py-4 text-sm text-muted-foreground">Loading…</div>
          )}
        </Section>

        {/* ── Storage ──────────────────────────────────────────────────── */}
        <Section title="Storage">
          <Row
            label="Settings Location"
            description={versionInfo?.settings_dir ?? "…"}
          >
            <button
              id="btn-open-folder"
              onClick={handleOpenFolder}
              className="
                flex items-center gap-1.5
                rounded-lg border border-border
                px-3 py-1.5
                text-sm text-foreground
                transition-colors
                hover:bg-accent hover:text-accent-foreground
              "
            >
              <FolderOpen size={13} />
              Open Folder
            </button>
          </Row>
        </Section>

      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/** A labelled settings section card with a title header. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border/60 px-4 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/80">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

/**
 * A single settings row: label + optional description on the left,
 * a control slot on the right.
 */
function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 break-all text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Accessible iOS-style toggle switch. */
function Toggle({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`
        relative h-[26px] w-[46px] rounded-full
        transition-colors duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50
        ${checked ? "bg-violet-600" : "bg-muted"}
      `}
    >
      <span
        className={`
          absolute top-[3px] left-[3px]
          h-5 w-5 rounded-full bg-white shadow-sm
          transition-transform duration-200
          ${checked ? "translate-x-[20px]" : "translate-x-0"}
        `}
      />
    </button>
  );
}

/** A subtle text-style button with an icon, used in the About section. */
function OutlineButton({
  id,
  icon,
  label,
  onClick,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className="
        flex items-center gap-1.5
        rounded-lg border border-border
        px-3 py-1.5
        text-sm text-foreground
        transition-colors
        hover:bg-accent hover:text-accent-foreground
      "
    >
      {icon}
      {label}
    </button>
  );
}

/** Custom SVG Github Icon matching Lucide style. */
function Github({ size = 24 }: { size?: number }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

