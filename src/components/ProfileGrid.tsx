import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus } from "lucide-react";

import ProfileCard from "./ProfileCard";
import NewProfileModal from "./NewProfileModal";
import EmptyState from "./EmptyState";
import type { Profile } from "../types/profile";

interface ProfileGridProps {
  showNewProfileModal: boolean;
  setShowNewProfileModal: (show: boolean) => void;
}

export default function ProfileGrid({
  showNewProfileModal,
  setShowNewProfileModal,
}: ProfileGridProps) {
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

  async function handleAvatarRemove(profile: Profile) {
    try {
      await invoke("remove_avatar", { profileId: profile.id });
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profile.id ? { ...p, avatar: undefined } : p
        )
      );
    } catch (error) {
      console.error("Failed to remove avatar:", error);
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
    setShowNewProfileModal(false);

    if (launchAfter) {
      // The new profile has no custom display_name yet, so profile.name
      // matches the canonical Zen profile name stored in profiles.ini.
      await invoke("launch_profile", { profileId: newProfile.name });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        Loading profiles...
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <>
        <EmptyState onCreateClick={() => setShowNewProfileModal(true)} />
        {showNewProfileModal && (
          <NewProfileModal
            onClose={() => setShowNewProfileModal(false)}
            onCreate={handleCreate}
          />
        )}
      </>
    );
  }

  return (
    <>
      <section className="mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-fit px-6 pb-12 justify-items-center">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            onClick={handleProfileClick}
            onAvatarClick={handleAvatarClick}
            onAvatarRemove={handleAvatarRemove}
            onRename={handleRename}
          />
        ))}

        {/* ── New Profile Card ─────────────────────────────────────────────── */}
        <button
          id="new-profile-card"
          onClick={() => setShowNewProfileModal(true)}
          className="
            group
            w-[160px]
            h-[160px]
            cursor-pointer
            flex flex-col items-center justify-center
            rounded-3xl
            border border-dashed border-border
            bg-card/40
            p-5
            transition-all duration-200
            ease-out
            shadow-[0_4px_15px_-4px_rgba(0,0,0,0.05)]
            dark:shadow-none
            hover:border-primary/40
            hover:bg-card/85
            hover:shadow-[0_8px_25px_-6px_rgba(247,111,83,0.1)]
            dark:hover:shadow-[0_8px_30px_-8px_rgba(247,111,83,0.2)]
          "
        >
          <div
            className="
              mb-4 flex h-14 w-14 items-center justify-center
              rounded-full border border-dashed border-border
              text-muted-foreground
              transition-colors duration-200
              group-hover:border-foreground/40
              group-hover:text-foreground
            "
          >
            <Plus size={22} />
          </div>
          <span
            className="
              text-sm font-medium text-muted-foreground
              transition-colors duration-200
              group-hover:text-foreground
            "
          >
            New Profile
          </span>
        </button>
      </section>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {showNewProfileModal && (
        <NewProfileModal
          onClose={() => setShowNewProfileModal(false)}
          onCreate={handleCreate}
        />
      )}
    </>
  );
}