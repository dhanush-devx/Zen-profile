use crate::services::app_config_service::{self, AppConfig, Theme, VersionInfo};

// ── App Config ────────────────────────────────────────────────────────────────

/// Returns the current application configuration (theme, launch_at_login).
#[tauri::command]
pub fn get_app_config() -> AppConfig {
    app_config_service::get_config()
}

/// Persists a new theme preference. Accepts "system", "light", or "dark".
#[tauri::command]
pub fn set_theme(theme: String) -> Result<(), String> {
    let mut config = app_config_service::read_config();
    config.theme = match theme.to_lowercase().as_str() {
        "system" => Theme::System,
        "light" => Theme::Light,
        _ => Theme::Dark,
    };
    app_config_service::save_config(&config)
}

// ── Launch at Login ───────────────────────────────────────────────────────────

/// Enables or disables macOS launch at login via the autostart plugin,
/// then persists the new value to app_config.json.
#[tauri::command]
pub fn set_launch_at_login(enabled: bool, app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;

    if enabled {
        app.autolaunch().enable().map_err(|e| e.to_string())?;
    } else {
        app.autolaunch().disable().map_err(|e| e.to_string())?;
    }

    // Persist to app_config.json so we can show the correct state on next launch.
    let mut config = app_config_service::read_config();
    config.launch_at_login = enabled;
    app_config_service::save_config(&config)
}

/// Reads the current launch-at-login state directly from the OS via the autostart plugin.
/// This is the authoritative source — the OS state, not our cached config value.
#[tauri::command]
pub fn get_launch_at_login(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;

    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

// ── About ─────────────────────────────────────────────────────────────────────

/// Returns static version and platform information for the Settings → About section.
#[tauri::command]
pub fn get_version_info(app: tauri::AppHandle) -> VersionInfo {
    app_config_service::get_version_info(&app)
}

// ── Storage ───────────────────────────────────────────────────────────────────

/// Opens the zen-profile settings directory in macOS Finder.
/// Creates the directory first if it does not yet exist.
#[tauri::command]
pub fn open_settings_folder() -> Result<(), String> {
    use std::process::Command;

    let dir = app_config_service::get_settings_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    Command::new("open")
        .arg(&dir)
        .status()
        .map(|_| ())
        .map_err(|e| e.to_string())
}
