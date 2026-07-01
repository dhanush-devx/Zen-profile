mod commands;
mod models;
mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            commands::profile_commands::get_profiles,
            commands::profile_commands::launch_profile,
            commands::profile_commands::create_profile,
            commands::avatar_commands::select_avatar,
            commands::avatar_commands::load_avatar,
            commands::avatar_commands::rename_profile,
            commands::settings_commands::get_app_config,
            commands::settings_commands::set_theme,
            commands::settings_commands::set_launch_at_login,
            commands::settings_commands::get_launch_at_login,
            commands::settings_commands::get_version_info,
            commands::settings_commands::open_settings_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
