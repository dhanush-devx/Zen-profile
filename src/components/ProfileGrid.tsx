import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus } from "lucide-react";

import ProfileCard from "./ProfileCard";
import NewProfileModal from "./NewProfileModal";
import type { Profile } from "../types/profile";

export default function ProfileGrid() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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

  async function handleRename(profile: Profile, newName: string) {
    try {
      await invoke("rename_profile", {
        profileId: profile.id,
        displayName: newName,
      });

      // Update state locally
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profile.id ? { ...p, name: newName } : p
        )
      );
    } catch (error) {
      console.error("Failed to rename profile:", error);
    }
  }

  /**
   * Called by NewProfileModal when the user confirms.
   * Throws a string on failure so the modal can display it inline.
   */
  async function handleCreate(name: string, launchAfter: boolean) {
    // invoke throws the Rust Err(String) as a string — modal catches it.
    const newProfile = await invoke<Profile>("create_profile", { name });

    // Append to state; no avatar conversion needed (fresh profile has none).
    setProfiles((prev) => [...prev, newProfile]);
    setShowModal(false);

    if (launchAfter) {
      // The new profile has no custom display_name yet, so profile.name
      // matches the canonical Zen profile name stored in profiles.ini.
      await invoke("launch_profile", { profileId: newProfile.name });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-zinc-400">
        Loading profiles...
      </div>
    );
  }

  return (
    <>
      <section className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-10 md:grid-cols-3">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            onClick={handleProfileClick}
            onAvatarClick={handleAvatarClick}
            onRename={handleRename}
          />
        ))}

        {/* ── New Profile Card ─────────────────────────────────────────────── */}
        <button
          id="new-profile-card"
          onClick={() => setShowModal(true)}
          className="
            group
            flex min-h-[160px] cursor-pointer flex-col items-center justify-center
            rounded-3xl
            border-2 border-dashed border-zinc-700
            bg-zinc-900/30
            p-8
            transition-all duration-300
            hover:border-violet-500/50
            hover:bg-zinc-800/40
            hover:shadow-2xl hover:shadow-violet-500/10
          "
        >
          <div
            className="
              mb-4 flex h-14 w-14 items-center justify-center
              rounded-full border-2 border-dashed border-zinc-600
              text-zinc-500
              transition-colors duration-300
              group-hover:border-violet-500/60
              group-hover:text-violet-400
            "
          >
            <Plus size={24} />
          </div>
          <span
            className="
              text-sm font-medium text-zinc-500
              transition-colors duration-300
              group-hover:text-zinc-300
            "
          >
            New Profile
          </span>
        </button>
      </section>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {showModal && (
        <NewProfileModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </>
  );
}