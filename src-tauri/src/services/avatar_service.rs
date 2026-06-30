use base64::Engine as _;
use dirs::home_dir;
use std::collections::HashMap;
use std::path::PathBuf;
use tauri_plugin_dialog::{DialogExt, FilePath};

/// profile_id → avatar filename (e.g. "oa1jx08s.StellarProof.png")
type AvatarMap = HashMap<String, String>;

// ── Paths ────────────────────────────────────────────────────────────────────

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

fn read_settings() -> AvatarMap {
    let path = settings_path();
    if !path.exists() {
        return HashMap::new();
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn write_settings(map: &AvatarMap) -> Result<(), String> {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(map).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Returns all profile_id → filename mappings from settings.json.
/// Called by profile_service to attach avatars to profiles on startup.
pub fn all_avatar_mappings() -> AvatarMap {
    read_settings()
}

/// Opens the native macOS file picker, copies the chosen image into the
/// avatars directory, and persists the mapping in settings.json.
///
/// Returns Ok(None) if the user cancels.
/// Returns Ok(Some(filename)) on success, e.g. "oa1jx08s.StellarProof.png".
///
/// Uses pick_file(callback) rather than blocking_pick_file() because
/// blocking_pick_file() dispatches NSOpenPanel.runModal() to the main thread
/// via dispatch_sync, which deadlocks against WRY/tao's event loop ownership
/// on macOS — the Open button never enables. The async callback version
/// integrates correctly with the running AppKit event loop.
pub async fn select_avatar(
    app: &tauri::AppHandle,
    profile_id: &str,
) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel::<Option<FilePath>>();

    app.dialog()
        .file()
        .pick_file(move |path| {
            // Called on the main thread after the user dismisses the dialog.
            let _ = tx.send(path);
        });

    // Await the callback result — yields back to Tokio while the dialog is open.
    let picked = rx.await.map_err(|_| "Dialog was dropped unexpectedly".to_string())?;

    let Some(file_path) = picked else {
        return Ok(None); // user cancelled
    };

    let source: PathBuf = match file_path {
        FilePath::Path(p) => p,
        _ => return Err("Unsupported file path type".into()),
    };

    // Derive and validate extension.
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

    // Extract just the folder name from the profile_id.
    // "Profiles/oa1jx08s.StellarProof" → "oa1jx08s.StellarProof"
    let folder_name = std::path::Path::new(profile_id)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(profile_id);

    let filename = format!("{}.{}", folder_name, ext);

    // Copy image to avatars directory.
    let dest_dir = avatars_dir();
    std::fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
    std::fs::copy(&source, dest_dir.join(&filename)).map_err(|e| e.to_string())?;

    // Persist: profile_id → filename.
    let mut settings = read_settings();
    settings.insert(profile_id.to_string(), filename.clone());
    write_settings(&settings)?;

    Ok(Some(filename))
}

/// Reads an avatar file from the avatars directory and returns it as a
/// base64 data URL (e.g. "data:image/png;base64,...").
///
/// React uses this directly as <img src>. No filesystem path is exposed.
pub fn load_avatar(filename: &str) -> Result<String, String> {
    let path = avatars_dir().join(filename);
    let bytes = std::fs::read(&path).map_err(|e| {
        format!("Failed to read avatar \"{}\": {}", filename, e)
    })?;

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
