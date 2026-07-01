import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { APP_NAME, APP_SUBTITLE } from "../constants";

export default function AppHeader() {
  return (
    <header className="relative pt-10 pb-6 text-center">
      {/* Settings gear — top-right corner */}
      <Link
        to="/settings"
        aria-label="Open Settings"
        className="
          absolute right-6 top-6
          rounded-xl p-2.5
          text-muted-foreground transition-colors duration-150
          hover:bg-accent hover:text-accent-foreground
        "
      >
        <Settings size={18} />
      </Link>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        {APP_NAME}
      </h1>

      <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground font-normal">
        {APP_SUBTITLE}
      </p>
    </header>
  );
}