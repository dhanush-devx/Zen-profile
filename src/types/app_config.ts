// TypeScript mirror of the Rust AppConfig / VersionInfo structs.
// Keep in sync with src-tauri/src/services/app_config_service.rs

export type Theme = "system" | "dark" | "light";

export interface AppConfig {
  theme: Theme;
  launch_at_login: boolean;
}

export interface VersionInfo {
  app_name: string;
  app_version: string;
  tauri_version: string;
  platform: string;
  /** Human-readable path, e.g. ~/Library/Application Support/zen-profile/ */
  settings_dir: string;
}
