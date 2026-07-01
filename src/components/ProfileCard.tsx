import * as React from "react";
import { Camera, Pencil, X } from "lucide-react";
import { Card } from "./ui/card";
import type { Profile } from "../types/profile";

type Props = {
  profile: Profile;
  onClick: (profile: Profile) => void;
  onAvatarClick?: (profile: Profile) => void;
  onAvatarRemove?: (profile: Profile) => void;
  onRename?: (profile: Profile, newName: string) => void;
};

export default function ProfileCard({
  profile,
  onClick,
  onAvatarClick,
  onAvatarRemove,
  onRename,
}: Props) {
  const [avatarHovered, setAvatarHovered] = React.useState(false);
  const [nameHovered, setNameHovered] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(profile.name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Keep editValue in sync if profile.name changes externally (e.g. after save).
  React.useEffect(() => {
    if (!editing) setEditValue(profile.name);
  }, [profile.name, editing]);

  // Auto-focus and select all text when edit mode activates.
  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function startEditing(e: React.MouseEvent) {
    e.stopPropagation(); // don't launch the profile
    setEditValue(profile.name);
    setEditing(true);
  }

  function commitRename() {
    const trimmed = editValue.trim();
    setEditing(false);
    setNameHovered(false);
    if (trimmed && trimmed !== profile.name && onRename) {
      onRename(profile, trimmed);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") {
      setEditing(false);
      setEditValue(profile.name);
    }
  }

  function handleAvatarClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (onAvatarClick) {
      onAvatarClick(profile);
    }
  }

  function handleRemoveAvatar(e: React.MouseEvent) {
    e.stopPropagation();
    if (onAvatarRemove) {
      onAvatarRemove(profile);
    }
  }

  return (
    <Card
      onClick={() => !editing && onClick(profile)}
      className="
        w-[160px]
        h-[160px]
        cursor-pointer
        rounded-3xl
        border
        border-border
        bg-card
        p-5
        flex flex-col items-center justify-center
        transition-all
        duration-200
        ease-out
        shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)]
        dark:shadow-[0_4px_25px_-6px_rgba(0,0,0,0.4)]
        hover:-translate-y-0.5
        hover:border-primary/40
        hover:shadow-[0_8px_30px_-6px_rgba(247,111,83,0.12)]
        dark:hover:shadow-[0_8px_35px_-8px_rgba(247,111,83,0.25)]
      "
    >
      <div className="flex flex-col items-center justify-center w-full h-full">

        {/* ── Avatar ──────────────────────────────────────────────────────── */}
        <div
          className="relative mb-3 h-16 w-16 shrink-0"
          onMouseEnter={() => setAvatarHovered(true)}
          onMouseLeave={() => setAvatarHovered(false)}
        >
          <div
            className="
              h-full w-full
              overflow-hidden
              rounded-full
              bg-gradient-to-br from-muted-foreground/30 to-muted
              flex items-center justify-center
              text-2xl font-semibold text-foreground
            "
          >
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            ) : (
              profile.name.charAt(0).toUpperCase()
            )}
          </div>

          <div
            className="
              absolute inset-0
              rounded-full
              bg-black/45
              backdrop-blur-[2px]
              flex items-center justify-center
              gap-2
              transition-opacity duration-150
            "
            style={{
              opacity: avatarHovered ? 1 : 0,
              pointerEvents: avatarHovered ? "auto" : "none",
            }}
          >
            {/* Camera Button to choose new image */}
            <button
              onClick={handleAvatarClick}
              title="Change avatar"
              className="
                flex items-center justify-center
                h-6 w-6 rounded-full bg-white/20 hover:bg-white/35
                text-white transition-colors duration-150
                focus:outline-none
              "
            >
              <Camera size={13} />
            </button>

            {/* X Button to delete current avatar image (if present) */}
            {profile.avatar && (
              <button
                onClick={handleRemoveAvatar}
                title="Remove avatar"
                className="
                  flex items-center justify-center
                  h-6 w-6 rounded-full bg-white/20 hover:bg-red-500/80
                  text-white transition-colors duration-150
                  focus:outline-none
                "
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── Profile name (inline-editable) ──────────────────────────────── */}
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
            className="
              w-full max-w-[120px]
              bg-muted
              border border-foreground/30
              rounded-xl
              px-2 py-0.5
              text-center text-xs font-medium text-foreground
              outline-none
              focus:ring-2 focus:ring-foreground/20
              transition-all
            "
          />
        ) : (
          <div
            className="flex items-center gap-1 group/name cursor-default"
            onMouseEnter={() => setNameHovered(true)}
            onMouseLeave={() => setNameHovered(false)}
          >
            <h2 className="text-[14px] font-medium text-center text-foreground tracking-tight truncate max-w-[120px]">
              {profile.name}
            </h2>
            {/* Pencil icon — only visible on hover, clicking starts edit */}
            <button
              onClick={startEditing}
              title="Rename profile"
              className="
                transition-opacity duration-150
                text-muted-foreground/60 hover:text-foreground
                focus:outline-none
              "
              style={{ opacity: nameHovered ? 1 : 0 }}
            >
              <Pencil size={11} />
            </button>
          </div>
        )}

      </div>
    </Card>
  );
}