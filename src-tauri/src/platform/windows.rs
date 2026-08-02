use std::path::{Path, PathBuf};
use std::process::Command;

pub fn config_directory() -> PathBuf {
    dirs::config_dir()
        .expect("no %APPDATA% directory")
        .join("zen")
}

pub fn app_data_directory() -> PathBuf {
    dirs::config_dir()
        .expect("no %APPDATA% directory")
        .join("zen-profile")
}

pub fn find_zen_browser() -> Result<PathBuf, String> {
    let program_files = std::env::var("ProgramFiles")
        .ok()
        .map(|base| PathBuf::from(base).join("Zen Browser").join("zen.exe"));
    let program_files_x86 = std::env::var("ProgramFiles(x86)")
        .ok()
        .map(|base| PathBuf::from(base).join("Zen Browser").join("zen.exe"));
    // Per-user installs (no admin rights) land under %LOCALAPPDATA%\Programs.
    let local_app_data_programs = std::env::var("LOCALAPPDATA").ok().map(|base| {
        PathBuf::from(base)
            .join("Programs")
            .join("Zen Browser")
            .join("zen.exe")
    });

    let candidates = [program_files, program_files_x86, local_app_data_programs]
        .into_iter()
        .flatten();

    for candidate in candidates {
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    Err("Zen Browser was not found in Program Files or %LOCALAPPDATA%\\Programs. Please install Zen Browser or set a custom path in Settings.".to_string())
}

pub fn launch_profile(executable: &Path, profile_id: &str) -> Result<(), String> {
    Command::new(executable)
        .args(["-P", profile_id])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to launch Zen Browser: {}", e))
}
