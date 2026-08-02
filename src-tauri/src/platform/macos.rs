use std::path::{Path, PathBuf};
use std::process::Command;

pub fn config_directory() -> PathBuf {
    dirs::home_dir()
        .expect("no home directory")
        .join("Library")
        .join("Application Support")
        .join("zen")
}

pub fn app_data_directory() -> PathBuf {
    dirs::home_dir()
        .expect("no home directory")
        .join("Library")
        .join("Application Support")
        .join("zen-profile")
}

pub fn find_zen_browser() -> Result<PathBuf, String> {
    let candidate = PathBuf::from("/Applications/Zen.app");
    if candidate.exists() {
        Ok(candidate)
    } else {
        Err("Zen Browser was not found in /Applications. Please install Zen Browser or set a custom path in Settings.".to_string())
    }
}

pub fn launch_profile(executable: &Path, profile_id: &str) -> Result<(), String> {
    Command::new("open")
        .args([
            "-na",
            &executable.to_string_lossy(),
            "--args",
            "-P",
            profile_id,
        ])
        .status()
        .map(|_| ())
        .map_err(|e| format!("Failed to launch Zen Browser: {}", e))
}
