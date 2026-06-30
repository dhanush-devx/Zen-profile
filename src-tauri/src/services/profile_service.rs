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

        let name = properties
            .get("Name")
            .unwrap_or("Unknown")
            .to_string();

        let path = properties
            .get("Path")
            .unwrap_or("")
            .to_string();

        let is_default = properties
            .get("Default")
            .map(|v| v == "1")
            .unwrap_or(false);

        profiles.push(Profile {
            id: path.clone(),
            name,
            path,
            is_default,
            avatar: None,
        });
    }

    // Attach saved avatar filenames from settings.json.
    // Each profile.avatar will hold a filename (e.g. "oa1jx08s.StellarProof.png")
    // that the frontend converts to a data URL via the load_avatar command.
    let avatar_map = avatar_service::all_avatar_mappings();
    for profile in &mut profiles {
        if let Some(filename) = avatar_map.get(&profile.id) {
            profile.avatar = Some(filename.clone());
        }
    }

    profiles
}

pub fn launch_profile(profile_id: String) {
    println!("Launching profile: {}", profile_id);

    let status = Command::new("open")
        .args([
            "-na",
            "/Applications/Zen.app",
            "--args",
            "-P",
            &profile_id,
        ])
        .status();

    println!("{:?}", status);
}