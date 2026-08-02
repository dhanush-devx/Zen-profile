//! Platform abstraction layer.
//!
//! Every OS-specific path, executable lookup, and launch command lives in
//! `macos.rs` / `windows.rs` / `linux.rs`. The rest of the app only calls the
//! functions below and never checks `target_os` itself.

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "linux")]
use linux as os;
#[cfg(target_os = "macos")]
use macos as os;
#[cfg(target_os = "windows")]
use windows as os;

use std::path::PathBuf;

/// Zen Browser's own configuration directory (where `profiles.ini` lives).
pub fn config_directory() -> PathBuf {
    os::config_directory()
}

/// Path to Zen Browser's `profiles.ini`.
pub fn profiles_ini_path() -> PathBuf {
    config_directory().join("profiles.ini")
}

/// Directory containing individual profile folders.
pub fn profiles_directory() -> PathBuf {
    config_directory().join("Profiles")
}

/// Locates the Zen Browser executable in common install locations.
/// Returns a descriptive error (never panics) if it can't be found, so the
/// caller/UI can offer a manual path picker instead.
pub fn find_zen_browser() -> Result<PathBuf, String> {
    os::find_zen_browser()
}

/// Launches Zen Browser with the given profile.
pub fn launch_profile(profile_id: &str) -> Result<(), String> {
    let executable = find_zen_browser()?;
    os::launch_profile(&executable, profile_id)
}

/// zen-profile's own application data directory (settings.json, avatars/, app_config.json).
pub fn app_data_directory() -> PathBuf {
    os::app_data_directory()
}

/// The current user's home directory, for display purposes (e.g. substituting `~`).
pub fn home_directory() -> PathBuf {
    dirs::home_dir().expect("no home directory")
}
