import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { APP_NAME, APP_SUBTITLE } from "../constants";

export default function AppHeader() {
  return (
    <header className="relative pt-20 pb-12 text-center">
      {/* Settings gear — top-right corner */}
      <Link
        to="/settings"
        aria-label="Open Settings"
        className="
          absolute right-6 top-6
          rounded-lg p-2
          text-muted-foreground transition-colors duration-150
          hover:bg-accent hover:text-accent-foreground
        "
      >
        <Settings size={20} />
      </Link>

      <h1 className="mt-8 text-5xl font-bold tracking-tight">
        {APP_NAME}
      </h1>

      <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
        {APP_SUBTITLE}
      </p>
    </header>
  );
}