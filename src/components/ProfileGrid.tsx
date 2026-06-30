import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import ProfileCard from "./ProfileCard";
import type { Profile } from "../types/profile";

export default function ProfileGrid() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      const raw = await invoke<Profile[]>("get_profiles");

      // For each profile that has an avatar filename, convert it to a
      // base64 data URL via load_avatar. ProfileCard receives a ready-to-use
      // <img src> value — no filesystem paths ever reach React.
      const withAvatars = await Promise.all(
        raw.map(async (p) => {
          if (!p.avatar) return p;
          try {
            const dataUrl = await invoke<string>("load_avatar", {
              filename: p.avatar,
            });
            return { ...p, avatar: dataUrl };
          } catch {
            // Avatar file missing or unreadable — show initials fallback.
            return { ...p, avatar: undefined };
          }
        })
      );

      setProfiles(withAvatars);
    } catch (error) {
      console.error("Failed to load profiles:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileClick(profile: Profile) {
    await invoke("launch_profile", {
      profileId: profile.name,
    });
  }

  async function handleAvatarClick(profile: Profile) {
    try {
      // Step 1: open native picker, copy file, get filename back
      const filename = await invoke<string | null>("select_avatar", {
        profileId: profile.id,
      });

      if (!filename) return; // user cancelled

      // Step 2: convert filename → data URL (all FS access in Rust)
      const dataUrl = await invoke<string>("load_avatar", { filename });

      // Step 3: update only this profile in state — no full reload
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profile.id ? { ...p, avatar: dataUrl } : p
        )
      );
    } catch (error) {
      console.error("Failed to set avatar:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-zinc-400">
        Loading profiles...
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="flex justify-center py-24 text-zinc-400">
        No Zen profiles found.
      </div>
    );
  }

  return (
    <section className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-10 md:grid-cols-3">
      {profiles.map((profile) => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          onClick={handleProfileClick}
          onAvatarClick={handleAvatarClick}
        />
      ))}
    </section>
  );
}