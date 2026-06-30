use base64::Engine as _;
use dirs::home_dir;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tauri_plugin_dialog::{DialogExt, FilePath};

// ── Settings types ────────────────────────────────────────────────────────────

/// Per-profile settings stored in settings.json.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProfileSettings {
    /// Custom display name chosen by the user (overrides the Zen Browser name).
    pub display_name: Option<String>,
    /// Avatar filename inside the avatars/ directory.
    pub avatar: Option<String>,

    /// Preserve any other unknown/custom properties.
    #[serde(flatten, default)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// Global settings file structure containing "profiles" and preserving root-level extra fields.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppSettings {
    pub profiles: HashMap<String, ProfileSettings>,

    /// Preserve any other root-level unknown/custom properties.
    #[serde(flatten, default)]
    pub extra: HashMap<String, serde_json::Value>,
}

// ── Paths ─────────────────────────────────────────────────────────────────────

fn zen_profile_dir() -> PathBuf {
    home_dir()
        .expect("no home directory")
        .join("Library")
        .join("Application Support")
        .join("zen-profile")
}

fn avatars_dir() -> PathBuf {
    zen_profile_dir().join("avatars")
}

fn settings_path() -> PathBuf {
    zen_profile_dir().join("settings.json")
}

// ── Settings persistence ──────────────────────────────────────────────────────

fn parse_settings(content: &str) -> AppSettings {
    let trimmed = content.trim();
    if trimmed.is_empty() || trimmed == "{}" {
        return AppSettings::default();
    }

    // 1. Try parsing Format B (current/new format with "profiles" key)
    if let Ok(settings) = serde_json::from_str::<AppSettings>(content) {
        if !settings.profiles.is_empty() || content.contains("\"profiles\"") {
            return settings;
        }
    }

    // 2. Try parsing Format C (Flat map of String -> ProfileSettings)
    if let Ok(flat_settings) = serde_json::from_str::<HashMap<String, ProfileSettings>>(content) {
        return AppSettings {
            profiles: flat_settings,
            extra: HashMap::new(),
        };
    }

    // 3. Try parsing Format A (Flat map of String -> String)
    if let Ok(old_flat) = serde_json::from_str::<HashMap<String, String>>(content) {
        let profiles = old_flat
            .into_iter()
            .map(|(k, v)| {
                (
                    k,
                    ProfileSettings {
                        avatar: Some(v),
                        ..Default::default()
                    },
                )
            })
            .collect();
        return AppSettings {
            profiles,
            extra: HashMap::new(),
        };
    }

    AppSettings::default()
}

fn read_settings() -> AppSettings {
    let path = settings_path();
    if !path.exists() {
        return AppSettings::default();
    }

    let content = std::fs::read_to_string(&path).unwrap_or_default();
    parse_settings(&content)
}

fn write_settings(settings: &AppSettings) -> Result<(), String> {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Returns all per-profile settings.
/// Called by profile_service on startup to populate name and avatar.
pub fn all_settings() -> AppSettings {
    read_settings()
}

/// Opens the native macOS file picker, copies the chosen image into the
/// avatars directory, and persists the mapping in settings.json.
///
/// Returns Ok(None) if the user cancels.
/// Returns Ok(Some(filename)) on success, e.g. "oa1jx08s.StellarProof.png".
///
/// Uses pick_file(callback) rather than blocking_pick_file() because
/// blocking_pick_file() dispatches NSOpenPanel.runModal() via dispatch_sync,
/// which conflicts with WRY/tao's main-thread event loop on macOS.
pub async fn select_avatar(
    app: &tauri::AppHandle,
    profile_id: &str,
) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel::<Option<FilePath>>();

    app.dialog().file().pick_file(move |path| {
        let _ = tx.send(path);
    });

    let picked = rx
        .await
        .map_err(|_| "Dialog was dropped unexpectedly".to_string())?;

    let Some(file_path) = picked else {
        return Ok(None);
    };

    let source: PathBuf = match file_path {
        FilePath::Path(p) => p,
        _ => return Err("Unsupported file path type".into()),
    };

    let ext = source
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let allowed = ["png", "jpg", "jpeg", "webp"];
    if !allowed.contains(&ext.as_str()) {
        return Err(format!(
            "Unsupported image format \".{}\". Please select a PNG, JPG, or WebP file.",
            ext
        ));
    }

    // "Profiles/oa1jx08s.StellarProof" → "oa1jx08s.StellarProof"
    let folder_name = std::path::Path::new(profile_id)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(profile_id);

    let filename = format!("{}.{}", folder_name, ext);

    let dest_dir = avatars_dir();
    std::fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
    std::fs::copy(&source, dest_dir.join(&filename)).map_err(|e| e.to_string())?;

    let mut settings = read_settings();
    settings
        .profiles
        .entry(profile_id.to_string())
        .or_default()
        .avatar = Some(filename.clone());
    write_settings(&settings)?;

    Ok(Some(filename))
}

/// Saves a custom display name for a profile in settings.json.
/// Pass an empty string to clear the custom name (falls back to Zen's name).
pub fn rename_profile(profile_id: &str, display_name: &str) -> Result<(), String> {
    let mut settings = read_settings();
    let entry = settings.profiles.entry(profile_id.to_string()).or_default();
    let trimmed = display_name.trim();
    entry.display_name = if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    };
    write_settings(&settings)
}

/// Reads an avatar file and returns it as a base64 data URL ready for <img src>.
pub fn load_avatar(filename: &str) -> Result<String, String> {
    let path = avatars_dir().join(filename);
    let bytes = std::fs::read(&path)
        .map_err(|e| format!("Failed to read avatar \"{}\": {}", filename, e))?;

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();

    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => "image/png",
    };

    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrate_format_a() {
        let json = r#"{
            "Profiles/default": "avatar.png",
            "Profiles/work": "work_avatar.jpg"
        }"#;
        let settings = parse_settings(json);

        assert_eq!(settings.profiles.len(), 2);
        assert_eq!(
            settings.profiles.get("Profiles/default").unwrap().avatar,
            Some("avatar.png".to_string())
        );
        assert_eq!(
            settings.profiles.get("Profiles/work").unwrap().avatar,
            Some("work_avatar.jpg".to_string())
        );
    }

    #[test]
    fn test_migrate_format_c() {
        let json = r#"{
            "Profiles/work": {
                "display_name": "Work Profile",
                "avatar": "work.png"
            }
        }"#;

        let settings = parse_settings(json);

        assert_eq!(settings.profiles.len(), 1);
        let profile = settings.profiles.get("Profiles/work").unwrap();
        assert_eq!(profile.display_name, Some("Work Profile".to_string()));
        assert_eq!(profile.avatar, Some("work.png".to_string()));
    }

    #[test]
    fn test_format_b_with_extra_fields() {
        let json = r#"{
            "profiles": {
                "Profiles/work": {
                    "display_name": "Work",
                    "avatar": "work.png",
                    "favorite": true,
                    "launch_count": 42,
                    "custom_future_field": "hello-world"
                }
            },
            "root_level_extra_field": 12345
        }"#;

        let settings = parse_settings(json);
        assert_eq!(settings.profiles.len(), 1);
        let profile = settings.profiles.get("Profiles/work").unwrap();
        assert_eq!(profile.display_name, Some("Work".to_string()));

        // Unused fields should be preserved inside ProfileSettings' extra field:
        assert_eq!(
            profile.extra.get("favorite").unwrap(),
            &serde_json::Value::Bool(true)
        );
        assert_eq!(
            profile.extra.get("launch_count").unwrap(),
            &serde_json::Value::Number(serde_json::Number::from(42))
        );
        assert_eq!(
            profile.extra.get("custom_future_field").unwrap(),
            &serde_json::Value::String("hello-world".to_string())
        );

        // Unknown fields should be preserved at the root level:
        assert_eq!(
            settings.extra.get("root_level_extra_field").unwrap(),
            &serde_json::Value::Number(serde_json::Number::from(12345))
        );
    }
}
