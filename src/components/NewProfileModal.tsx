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

  // Close on Escape.
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, loading]);

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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
          rounded-2xl
          border border-zinc-700/80
          bg-zinc-900
          p-6
          shadow-2xl shadow-black/60
          animate-in fade-in slide-in-from-bottom-4
          duration-200
        "
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2
            id="new-profile-title"
            className="text-xl font-semibold text-white"
          >
            Create New Profile
          </h2>
          <button
            onClick={() => !loading && onClose()}
            disabled={loading}
            aria-label="Close"
            className="
              rounded-lg p-1.5
              text-zinc-400 transition-colors
              hover:bg-zinc-800 hover:text-white
              disabled:opacity-40
            "
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Name field */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="new-profile-name"
              className="text-sm font-medium text-zinc-300"
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
                rounded-lg
                border border-zinc-700 bg-zinc-800
                px-4 py-2.5
                text-white placeholder-zinc-500
                outline-none
                transition-all
                focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/20
                disabled:opacity-50
              "
            />
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
          </div>

          {/* Launch after creation */}
          <label className="flex cursor-pointer select-none items-center gap-3">
            <input
              id="launch-after"
              type="checkbox"
              checked={launchAfter}
              onChange={(e) => setLaunchAfter(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 accent-violet-500"
            />
            <span className="text-sm text-zinc-300">Launch after creation</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => !loading && onClose()}
              disabled={loading}
              className="
                rounded-lg
                border border-zinc-700
                px-4 py-2
                text-sm font-medium text-zinc-300
                transition-colors
                hover:border-zinc-500 hover:text-white
                disabled:opacity-50
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="
                flex items-center gap-2
                rounded-lg
                bg-violet-600
                px-5 py-2
                text-sm font-medium text-white
                transition-colors
                hover:bg-violet-500
                disabled:cursor-not-allowed disabled:opacity-50
              "
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
