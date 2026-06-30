import * as React from "react";
import { Camera } from "lucide-react";
import { Card } from "./ui/card";
import type { Profile } from "../types/profile";

type Props = {
  profile: Profile;
  onClick: (profile: Profile) => void;
  onAvatarClick?: (profile: Profile) => void;
};

export default function ProfileCard({ profile, onClick, onAvatarClick }: Props) {
  // Fix 1: Track hover with React state instead of hardcoding opacity-100.
  // This is what was broken — the overlay was always visible and always
  // intercepting clicks because opacity-100 was set unconditionally.
  const [avatarHovered, setAvatarHovered] = React.useState(false);

  function handleAvatarClick(e: React.MouseEvent) {
    // Fix 2: stopPropagation was already present in the original, kept as-is.
    e.stopPropagation();
    if (onAvatarClick) {
      onAvatarClick(profile);
    } else {
      console.log("Change avatar:", profile.name);
    }
  }

  return (
    <Card
      onClick={() => onClick(profile)}
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
              // Fix 1 (cont.): opacity driven by state, not hardcoded.
              opacity: avatarHovered ? 1 : 0,
              // Fix 3: invisible overlay gets pointerEvents:none so it cannot
              // silently swallow clicks meant for the card beneath it.
              pointerEvents: avatarHovered ? "auto" : "none",
            }}
          >
            <Camera className="text-white" size={24} />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-center text-white">
          {profile.name}
        </h2>

      </div>
    </Card>
  );
}