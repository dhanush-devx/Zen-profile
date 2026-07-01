use crate::models::profile::Profile;
use crate::services::profile_service;

#[tauri::command]
pub fn get_profiles() -> Vec<Profile> {
    profile_service::get_profiles()
}

#[tauri::command]
pub fn launch_profile(profile_id: String) {
    profile_service::launch_profile(profile_id);
}

/// Creates a new Zen Browser profile with the given name.
/// Returns the newly created Profile on success or an error message on failure.
#[tauri::command]
pub fn create_profile(name: String) -> Result<Profile, String> {
    profile_service::create_profile(&name)
}
