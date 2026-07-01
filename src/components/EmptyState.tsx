import { Folder, Plus } from "lucide-react";

interface EmptyStateProps {
  onCreateClick: () => void;
}

export default function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in duration-150 ease-out">
      {/* Subtle Illustration/Icon */}
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 text-muted-foreground/60">
        <Folder size={28} strokeWidth={1.5} />
      </div>

      {/* Heading */}
      <h3 className="text-lg font-medium tracking-tight text-foreground mb-2">
        No Profiles Yet
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground font-normal max-w-xs mb-6 leading-relaxed">
        Create your first Zen Browser profile to get started.
      </p>

      {/* Create Profile Button */}
      <button
        onClick={onCreateClick}
        className="
          flex items-center gap-1.5
          rounded-xl
          bg-primary
          px-5 py-2
          text-sm font-medium text-primary-foreground
          transition-colors duration-150
          hover:bg-primary/90
          shadow-sm
        "
      >
        <Plus size={14} />
        Create Profile
      </button>
    </div>
  );
}
