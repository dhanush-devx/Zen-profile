use std::path::{Path, PathBuf};
use std::process::Command;

pub fn config_directory() -> PathBuf {
    let xdg = dirs::config_dir().expect("no config directory").join("zen");
    if xdg.exists() {
        return xdg;
    }

    let legacy = dirs::home_dir().expect("no home directory").join(".zen");
    if legacy.exists() {
        return legacy;
    }

    // Neither exists yet (fresh install) — default to the XDG location.
    xdg
}

pub fn app_data_directory() -> PathBuf {
    dirs::config_dir()
        .expect("no config directory")
        .join("zen-profile")
}

pub fn find_zen_browser() -> Result<PathBuf, String> {
    let candidates = ["/usr/bin/zen", "/usr/local/bin/zen", "/opt/zen/zen"];
    for candidate in candidates {
        let path = PathBuf::from(candidate);
        if path.exists() {
            return Ok(path);
        }
    }

    if let Ok(output) = Command::new("which").arg("zen").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Ok(PathBuf::from(path));
            }
        }
    }

    Err(
        "Zen Browser was not found. Please install Zen Browser or set a custom path in Settings."
            .to_string(),
    )
}

pub fn launch_profile(executable: &Path, profile_id: &str) -> Result<(), String> {
    Command::new(executable)
        .args(["-P", profile_id])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to launch Zen Browser: {}", e))
}
