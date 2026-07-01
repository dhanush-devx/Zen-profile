import { useEffect, useRef } from "react";

interface ShortcutHandlers {
  onNewProfile?: () => void;
  onOpenSettings?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  // Keep handlers in a ref so the event listener is registered only once
  // and does not need to re-bind when handlers change.
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Check if Escape is pressed (Escape is context-aware and allowed in inputs)
      if (e.key === "Escape") {
        if (handlersRef.current.onEscape) {
          handlersRef.current.onEscape();
        }
        return;
      }

      // 2. Check if focus is inside a text input, textarea, or contenteditable element
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable);

      if (isInput) return;

      // 3. macOS-first shortcuts (⌘ N, ⌘ ,) with Ctrl fallback
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (handlersRef.current.onNewProfile) {
          handlersRef.current.onNewProfile();
        }
      }

      if (isCmdOrCtrl && e.key === ",") {
        e.preventDefault();
        if (handlersRef.current.onOpenSettings) {
          handlersRef.current.onOpenSettings();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []); // Empty dependency array ensures listener is registered only once on mount.
}
