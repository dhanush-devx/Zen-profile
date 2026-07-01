import * as React from "react";
import { X, Loader2 } from "lucide-react";

interface Props {
  onClose: () => void;
  /** Called when the user confirms creation. Throw a string to show an error. */
  onCreate: (name: string, launchAfter: boolean) => Promise<void>;
}

export default function NewProfileModal({ onClose, onCreate }: Props) {
  const [name, setName] = React.useState("");
  const [launchAfter, setLaunchAfter] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus the name input when the modal mounts.
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = name.trim();

    // Client-side guard (Rust validates too — belt-and-suspenders).
    if (!trimmed) {
      setError("Profile name cannot be empty.");
      return;
    }
    if (trimmed.length > 100) {
      setError("Profile name cannot exceed 100 characters.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await onCreate(trimmed, launchAfter);
      // On success the parent closes the modal; no need to reset state here.
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to create profile.");
      setLoading(false);
    }
  }

  return (
    /* ── Backdrop ─────────────────────────────────────────────────────────── */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-md"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      {/* ── Panel ──────────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-profile-title"
        className="
          relative z-10
          w-full max-w-md
          rounded-3xl
          border border-border
          bg-card
          p-6
          shadow-[0_12px_40px_-6px_rgba(0,0,0,0.15)]
          dark:shadow-[0_15px_50px_-8px_rgba(0,0,0,0.6)]
          animate-in fade-in slide-in-from-bottom-3
          duration-200
          ease-out
        "
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="new-profile-title"
            className="text-lg font-medium tracking-tight text-foreground"
          >
            Create New Profile
          </h2>
          <button
            onClick={() => !loading && onClose()}
            disabled={loading}
            aria-label="Close"
            className="
              rounded-xl p-1.5
              text-muted-foreground transition-colors duration-150
              hover:bg-accent hover:text-accent-foreground
              disabled:opacity-40
            "
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Name field */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="new-profile-name"
              className="text-sm font-medium text-foreground/90"
            >
              Profile Name
            </label>
            <input
              ref={inputRef}
              id="new-profile-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Work, Personal, Dev…"
              disabled={loading}
              maxLength={100}
              className="
                rounded-xl
                border border-border bg-background
                px-4 py-2.5
                text-sm text-foreground placeholder:text-muted-foreground/60
                outline-none
                transition-all
                duration-150
                focus:border-primary/50 focus:ring-2 focus:ring-primary/15
                disabled:opacity-50
              "
            />
            {error && (
              <p role="alert" className="text-sm text-destructive font-medium">
                {error}
              </p>
            )}
          </div>

          {/* Launch after creation */}
          <label className="flex cursor-pointer select-none items-center gap-2.5">
            <input
              id="launch-after"
              type="checkbox"
              checked={launchAfter}
              onChange={(e) => setLaunchAfter(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-border text-primary accent-primary focus:ring-primary/30"
            />
            <span className="text-sm text-muted-foreground font-normal">Launch after creation</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => !loading && onClose()}
              disabled={loading}
              className="
                rounded-xl
                border border-border
                px-4 py-2
                text-sm font-medium text-foreground/80
                transition-colors duration-150
                hover:bg-accent hover:text-accent-foreground
                disabled:opacity-50
               font-normal"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="
                flex items-center gap-1.5
                rounded-xl
                bg-primary
                px-5 py-2
                text-sm font-medium text-primary-foreground
                transition-colors duration-150
                hover:bg-primary/90
                disabled:cursor-not-allowed disabled:opacity-50
              "
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
