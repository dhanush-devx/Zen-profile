import { APP_NAME, APP_SUBTITLE, } from "../constants";

export default function AppHeader() {
  return (
    <header className="pt-20 pb-12 text-center">
     

      <h1 className="mt-8 text-5xl font-bold tracking-tight">
        {APP_NAME}
      </h1>

      <p className="mx-auto mt-4 max-w-xl text-zinc-400">
        {APP_SUBTITLE}
      </p>
    </header>
  );
}