import Link from "next/link";
import { Feather } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-brass-bright to-brass">
        <Feather className="h-5 w-5 text-ink" strokeWidth={2.2} />
      </div>
      <h1 className="font-display mt-6 text-4xl font-semibold text-cream">This page is unwritten</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-faded">
        The shelf you’re looking for doesn’t exist — or the story moved to another library.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-xl bg-gradient-to-b from-brass-bright to-brass px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110"
      >
        Return to your shelves
      </Link>
    </div>
  );
}
