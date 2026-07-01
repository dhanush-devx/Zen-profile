use dirs::home_dir;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

// ── Types ─────────────────────────────────────────────────────────────────────

/// Color theme preference for the ZenProfile application UI.
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    System,
    #[default]
    Dark,
    Light,
}

/// Application-level configuration.
///
/// Stored separately from profile metadata (`settings.json`) in `app_config.json`
/// so that app-level preferences are never mixed with per-profile data.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    /// UI color theme preference.
    pub theme: Theme,
    /// Whether ZenProfile should launch automatically at macOS login.
    pub launch_at_login: bool,

    /// Preserve any future unknown fields for forward compatibility.
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// Static build / platform information surfaced in the Settings → About section.
#[derive(Debug, Serialize)]
pub struct VersionInfo {
    pub app_name: String,
    pub app_version: String,
    pub tauri_version: String,
    pub platform: String,
    /// Human-readable path to the zen-profile settings directory (~ substituted).
    pub settings_dir: String,
}

// ── Paths ─────────────────────────────────────────────────────────────────────

fn zen_profile_dir() -> PathBuf {
    home_dir()
        .expect("no home directory")
        .join("Library")
        .join("Application Support")
        .join("zen-profile")
}

fn app_config_path() -> PathBuf {
    zen_profile_dir().join("app_config.json")
}

/// Returns the absolute path to the zen-profile settings directory.
/// Used by the open_settings_folder command.
pub fn get_settings_dir() -> PathBuf {
    zen_profile_dir()
}

// ── Persistence ───────────────────────────────────────────────────────────────

pub fn read_config() -> AppConfig {
    let path = app_config_path();
    if !path.exists() {
        return AppConfig::default();
    }
    let content = std::fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&content).unwrap_or_default()
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let path = app_config_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Returns the current application configuration.
pub fn get_config() -> AppConfig {
    read_config()
}

/// Returns build and platform information for the About section.
pub fn get_version_info(app: &tauri::AppHandle) -> VersionInfo {
    let pkg = app.package_info();

    // Substitute the real home directory with ~ for a cleaner display.
    let home = home_dir()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_default();
    let full = zen_profile_dir().to_string_lossy().to_string();
    let settings_dir = if full.starts_with(&home) {
        format!("~{}", &full[home.len()..])
    } else {
        full
    };

    VersionInfo {
        app_name: pkg.name.clone(),
        app_version: pkg.version.to_string(),
        tauri_version: "2".to_string(),
        platform: std::env::consts::OS.to_string(),
        settings_dir,
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_config_default() {
        let config = AppConfig::default();
        assert_eq!(config.theme, Theme::Dark);
        assert!(!config.launch_at_login);
        assert!(config.extra.is_empty());
    }

    #[test]
    fn test_app_config_roundtrip() {
        let config = AppConfig {
            theme: Theme::System,
            launch_at_login: true,
            extra: HashMap::new(),
        };
        let json = serde_json::to_string(&config).unwrap();
        let restored: AppConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(restored.theme, Theme::System);
        assert!(restored.launch_at_login);
    }

    #[test]
    fn test_theme_serialization() {
        assert_eq!(serde_json::to_string(&Theme::Dark).unwrap(), "\"dark\"");
        assert_eq!(serde_json::to_string(&Theme::Light).unwrap(), "\"light\"");
        assert_eq!(serde_json::to_string(&Theme::System).unwrap(), "\"system\"");
    }

    #[test]
    fn test_extra_fields_preserved() {
        let json = r#"{"theme":"dark","launch_at_login":false,"future_feature":true}"#;
        let config: AppConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.theme, Theme::Dark);
        assert_eq!(
            config.extra.get("future_feature").unwrap(),
            &serde_json::Value::Bool(true)
        );
    }
}
