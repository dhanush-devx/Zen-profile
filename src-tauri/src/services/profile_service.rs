use crate::models::profile::Profile;
use crate::services::avatar_service;
use dirs::home_dir;
use ini::Ini;
use std::path::PathBuf;
use std::process::Command;

fn profiles_ini_path() -> PathBuf {
    home_dir()
        .unwrap()
        .join("Library")
        .join("Application Support")
        .join("zen")
        .join("profiles.ini")
}

/// Base directory for Zen's application data.
fn profiles_base_dir() -> PathBuf {
    home_dir()
        .unwrap()
        .join("Library")
        .join("Application Support")
        .join("zen")
}

pub fn get_profiles() -> Vec<Profile> {
    let path = profiles_ini_path();

    let ini = Ini::load_from_file(&path).unwrap();

    let mut profiles = Vec::new();

    for (section, properties) in &ini {
        let Some(section) = section else {
            continue;
        };

        if !section.starts_with("Profile") {
            continue;
        }

        let name = properties.get("Name").unwrap_or("Unknown").to_string();

        let path = properties.get("Path").unwrap_or("").to_string();

        let is_default = properties.get("Default").map(|v| v == "1").unwrap_or(false);

        profiles.push(Profile {
            id: path.clone(),
            name,
            path,
            is_default,
            avatar: None,
        });
    }

    // Attach custom names and avatar filenames from settings.json.
    // display_name overrides the Zen Browser profile name when set.
    // avatar holds a filename the frontend converts to a data URL via load_avatar.
    let settings = avatar_service::all_settings();
    for profile in &mut profiles {
        if let Some(setting) = settings.profiles.get(&profile.id) {
            if let Some(name) = &setting.display_name {
                profile.name = name.clone();
            }
            if let Some(avatar) = &setting.avatar {
                profile.avatar = Some(avatar.clone());
            }
        }
    }

    profiles
}

pub fn launch_profile(profile_id: String) {
    println!("Launching profile: {}", profile_id);

    let status = Command::new("open")
        .args(["-na", "/Applications/Zen.app", "--args", "-P", &profile_id])
        .status();

    println!("{:?}", status);
}

/// Creates a new Zen Browser profile by:
///   1. Validating the name.
///   2. Checking for duplicate names in profiles.ini.
///   3. Generating a random 8-char directory ID.
///   4. Creating the profile directory with prefs.js + times.json.
///   5. Appending a [ProfileN] entry to profiles.ini.
///
/// Zen initialises all other files (SQLite databases, extensions, etc.)
/// automatically the first time the profile is opened.
///
/// Any filesystem artefacts created before a failure are cleaned up so
/// no half-formed profile is ever left on disk.
pub fn create_profile(name: &str) -> Result<Profile, String> {
    let trimmed = name.trim();

    // ── Validation ────────────────────────────────────────────────────────────
    if trimmed.is_empty() {
        return Err("Profile name cannot be empty.".to_string());
    }
    if trimmed.len() > 100 {
        return Err("Profile name is too long (max 100 characters).".to_string());
    }
    if trimmed.contains('/') || trimmed.contains('\0') {
        return Err("Profile name contains invalid characters.".to_string());
    }

    // ── Duplicate check ───────────────────────────────────────────────────────
    let ini_path = profiles_ini_path();
    let mut ini = Ini::load_from_file(&ini_path)
        .map_err(|e| format!("Failed to read profiles.ini: {}", e))?;

    for (section, props) in &ini {
        let Some(s) = section else { continue };
        if !s.starts_with("Profile") {
            continue;
        }
        if let Some(existing_name) = props.get("Name") {
            if existing_name.to_lowercase() == trimmed.to_lowercase() {
                return Err(format!(
                    "A profile named \"{}\" already exists.",
                    existing_name
                ));
            }
        }
    }

    // ── Build paths ───────────────────────────────────────────────────────────
    let profile_id = generate_profile_id();
    let dir_name = format!("{}.{}", profile_id, trimmed);
    let relative_path = format!("Profiles/{}", dir_name);
    let profile_dir = profiles_base_dir().join("Profiles").join(&dir_name);

    if profile_dir.exists() {
        // Astronomically unlikely with an 8-char random ID, but guard anyway.
        return Err("Generated a duplicate directory ID — please try again.".to_string());
    }

    // ── Create directory ──────────────────────────────────────────────────────
    std::fs::create_dir_all(&profile_dir)
        .map_err(|e| format!("Failed to create profile directory: {}", e))?;

    // Helper: clean up the new directory if any subsequent step fails.
    let cleanup = || {
        let _ = std::fs::remove_dir_all(&profile_dir);
    };

    // ── prefs.js ──────────────────────────────────────────────────────────────
    // Standard Mozilla empty-preferences header. Zen populates the rest on first launch.
    let prefs_content = "// Mozilla User Preferences\n\
        \n\
        // DO NOT EDIT THIS FILE.\n\
        //\n\
        // If you make changes to this file while the application is running,\n\
        // the changes will be overwritten when the application exits.\n\
        //\n\
        // To change a preference value, you can either:\n\
        // - modify it via the UI (e.g. via about:config in the browser); or\n\
        // - set it within a user.js file in your profile.\n\n";

    if let Err(e) = std::fs::write(profile_dir.join("prefs.js"), prefs_content) {
        cleanup();
        return Err(format!("Failed to write prefs.js: {}", e));
    }

    // ── times.json ────────────────────────────────────────────────────────────
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    if let Err(e) = std::fs::write(
        profile_dir.join("times.json"),
        format!("{{\"created\":{}}}\n", now_ms),
    ) {
        cleanup();
        return Err(format!("Failed to write times.json: {}", e));
    }

    // ── profiles.ini ──────────────────────────────────────────────────────────
    let next_n = find_next_profile_n(&ini);
    let section_name = format!("Profile{}", next_n);

    ini.with_section(Some(section_name))
        .set("Name", trimmed)
        .set("IsRelative", "1")
        .set("Path", &relative_path);

    if let Err(e) = ini.write_to_file(&ini_path) {
        cleanup();
        return Err(format!("Failed to update profiles.ini: {}", e));
    }

    Ok(Profile {
        id: relative_path.clone(),
        name: trimmed.to_string(),
        path: relative_path,
        is_default: false,
        avatar: None,
    })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Generates an 8-character lowercase alphanumeric profile ID using a
/// time-seeded linear congruential generator. No external crate required.
///
/// Collision probability: 1 in ~2.8 trillion — safe for local profile use.
fn generate_profile_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();

    // Mix millis + nanos for better entropy within the same second.
    let mut seed = (now.as_millis() as u64).wrapping_shl(17) ^ (now.subsec_nanos() as u64);

    let chars: &[u8] = b"abcdefghijklmnopqrstuvwxyz0123456789";
    let mut result = String::with_capacity(8);

    for _ in 0..8 {
        // Knuth multiplicative hash step.
        seed = seed
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        result.push(chars[(seed >> 33) as usize % chars.len()] as char);
    }

    result
}

/// Returns the next unused ProfileN number by scanning existing [ProfileN] sections.
fn find_next_profile_n(ini: &Ini) -> usize {
    let mut max: Option<usize> = None;

    for (section, _) in ini {
        let Some(s) = section else { continue };
        let Some(rest) = s.strip_prefix("Profile") else {
            continue;
        };
        let Ok(n) = rest.parse::<usize>() else {
            continue;
        };
        max = Some(match max {
            Some(m) => m.max(n),
            None => n,
        });
    }

    max.map_or(0, |m| m + 1)
}
