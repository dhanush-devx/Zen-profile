mod commands;
mod models;
mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::profile_commands::get_profiles,
            commands::profile_commands::launch_profile,
            commands::profile_commands::create_profile,
            commands::avatar_commands::select_avatar,
            commands::avatar_commands::load_avatar,
            commands::avatar_commands::rename_profile,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
