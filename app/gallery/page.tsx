import Link from "next/link";
import { GalleryGrid } from "@/components/GalleryGrid";
import { Badge, Stat } from "@/components/ui";
import { ensureSeeded } from "@/lib/seed";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  await ensureSeeded();
  const published = await store.published();
  const totals = await store.totals();

  const sources = published.reduce((sum, t) => sum + t.citations.length, 0);
  const followers = published.reduce((sum, t) => sum + t.followers, 0);
  const copies = published.reduce((sum, t) => sum + t.copies, 0);
  const anyLive = published.some((t) => t.dataMode === "live");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-[26px] font-semibold leading-none text-ink">The copy desk</h1>
            <Badge tone={anyLive ? "muted" : "warn"}>{anyLive ? "live data" : "demo data"}</Badge>
          </div>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-muted">
            Published theses keep their full citation trail. Copy one and the proposal screen loads with the original
            evidence; execution is tagged with the platform Builder Code and the author keeps the credit.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-[4px] border border-line-2 px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent"
        >
          Compile a thesis →
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-y-4 border-y border-line py-4 sm:grid-cols-4">
        <Stat label="Published" value={published.length} hint={`${totals.theses} compiled`} />
        <Stat label="Sources attached" value={sources} hint="numbered and linked" />
        <Stat label="Followers" value={followers} />
        <Stat label="Copies" value={copies} hint="each routes through the Builder Code" />
      </div>

      <div className="mt-6">
        <GalleryGrid theses={published} />
      </div>
    </main>
  );
}
