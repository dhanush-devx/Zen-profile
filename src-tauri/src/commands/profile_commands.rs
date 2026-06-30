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
