import * as React from "react";
import { Camera, Pencil } from "lucide-react";
import { Card } from "./ui/card";
import type { Profile } from "../types/profile";

type Props = {
  profile: Profile;
  onClick: (profile: Profile) => void;
  onAvatarClick?: (profile: Profile) => void;
  onRename?: (profile: Profile, newName: string) => void;
};

export default function ProfileCard({
  profile,
  onClick,
  onAvatarClick,
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

  return (
    <Card
      onClick={() => !editing && onClick(profile)}
      className="
        cursor-pointer
        rounded-3xl
        border
        border-zinc-800
        bg-zinc-900/70
        p-8
        backdrop-blur
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-violet-500/50
        hover:shadow-2xl
        hover:shadow-violet-500/10
      "
    >
      <div className="flex flex-col items-center">

        {/* ── Avatar ──────────────────────────────────────────────────────── */}
        <div
          className="relative mb-6 h-24 w-24"
          onMouseEnter={() => setAvatarHovered(true)}
          onMouseLeave={() => setAvatarHovered(false)}
        >
          <div
            className="
              h-full w-full
              overflow-hidden
              rounded-full
              bg-gradient-to-br from-violet-500 to-blue-500
              flex items-center justify-center
              text-4xl font-bold text-white
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
            onClick={handleAvatarClick}
            className="
              absolute inset-0
              rounded-full
              bg-black/60
              flex items-center justify-center
              transition-opacity duration-200
              cursor-pointer
            "
            style={{
              opacity: avatarHovered ? 1 : 0,
              pointerEvents: avatarHovered ? "auto" : "none",
            }}
          >
            <Camera className="text-white" size={24} />
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
              w-full max-w-[180px]
              bg-zinc-800
              border border-violet-500/60
              rounded-lg
              px-3 py-1
              text-center text-lg font-semibold text-white
              outline-none
              focus:ring-2 focus:ring-violet-500/40
              transition-all
            "
          />
        ) : (
          <div
            className="flex items-center gap-1.5 group/name cursor-default"
            onMouseEnter={() => setNameHovered(true)}
            onMouseLeave={() => setNameHovered(false)}
          >
            <h2 className="text-xl font-semibold text-center text-white">
              {profile.name}
            </h2>
            {/* Pencil icon — only visible on hover, clicking starts edit */}
            <button
              onClick={startEditing}
              title="Rename profile"
              className="
                transition-opacity duration-150
                text-zinc-500 hover:text-violet-400
                focus:outline-none
              "
              style={{ opacity: nameHovered ? 1 : 0 }}
            >
              <Pencil size={14} />
            </button>
          </div>
        )}

      </div>
    </Card>
  );
}