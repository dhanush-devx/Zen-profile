use crate::services::avatar_service;

/// Opens the native macOS file picker, copies the selected image into
/// ~/Library/Application Support/zen-profile/avatars/, persists the
/// mapping in settings.json, and returns just the avatar filename
/// (e.g. "oa1jx08s.StellarProof.png").
///
/// Returns Ok(None) if the user cancels the picker.
#[tauri::command]
pub async fn select_avatar(
    app: tauri::AppHandle,
    profile_id: String,
) -> Result<Option<String>, String> {
    avatar_service::select_avatar(&app, &profile_id).await
}

/// Reads the avatar file from disk and returns it as a base64 data URL
/// (e.g. "data:image/png;base64,...") ready to use as <img src>.
///
/// React never needs to know the filesystem path.
#[tauri::command]
pub fn load_avatar(filename: String) -> Result<String, String> {
    avatar_service::load_avatar(&filename)
}
