"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Thesis } from "@/lib/types";
import { pct, shortAddress, timeAgo } from "@/lib/format";
import { Badge, CompositionBar, EmptyState, SectionLabel } from "./ui";

export function GalleryGrid({ theses }: { theses: Thesis[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"top" | "new">("top");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? theses.filter(
          (t) =>
            t.prompt.toLowerCase().includes(q) ||
            t.basket.assets.some((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
        )
      : theses;
    return [...matches].sort((a, b) =>
      sort === "top" ? b.followers + b.copies * 2 - (a.followers + a.copies * 2) : a.createdAt < b.createdAt ? 1 : -1
    );
  }, [theses, query, sort]);

  async function follow(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/gallery/${id}/follow`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function copy(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/gallery/${id}/copy`, { method: "POST" });
      router.push(`/t/${id}?copy=1`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 border-b border-line pb-1 transition-colors focus-within:border-accent">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="text-faint">
            <circle cx="6.2" cy="6.2" r="4.6" stroke="currentColor" strokeWidth="1.3" />
            <path d="m9.8 9.8 2.7 2.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by thesis or symbol"
            aria-label="Filter theses"
            className="w-full border-0 bg-transparent p-0 text-[13px] text-ink placeholder:text-faint focus:outline-none"
          />
        </label>
        <div className="flex border-b border-line text-[11.5px]">
          {(
            [
              ["top", "Top"],
              ["new", "Newest"]
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              aria-pressed={sort === key}
              className={`border-b-2 px-3 py-2 transition-colors ${
                sort === key ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing on the desk matches"
            body="Try a different keyword, or compile a new thesis and publish it to the gallery."
            action={
              <Link href="/" className="rounded-[4px] bg-accent px-3 py-1.5 text-[12px] font-semibold text-[#1d1607]">
                Compile a thesis
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((thesis) => (
            <article
              key={thesis.id}
              className="flex flex-col overflow-hidden rounded-[4px] border border-line bg-surface transition-colors hover:border-line-2"
            >
              <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2 font-mono text-[9.5px] text-faint">
                <span className="truncate">{thesis.author.name ?? shortAddress(thesis.author.address)}</span>
                <span className="tnum shrink-0">{timeAgo(thesis.createdAt)}</span>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <Link href={`/t/${thesis.id}`} className="block">
                  <h3 className="line-clamp-3 min-h-[3.3em] text-[13px] font-medium leading-snug text-ink transition-colors hover:text-accent">
                    {thesis.prompt}
                  </h3>
                </Link>

                <div className="mt-3">
                  <CompositionBar assets={thesis.basket.assets} />
                  <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 font-mono text-[9.5px] text-faint">
                    {thesis.basket.assets.slice(0, 4).map((asset) => (
                      <span key={asset.symbol}>
                        {asset.symbol} <span className="text-muted">{(asset.targetWeight * 100).toFixed(0)}</span>
                      </span>
                    ))}
                    {thesis.basket.assets.length > 4 && <span>+{thesis.basket.assets.length - 4}</span>}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge tone={thesis.dataMode === "live" ? "muted" : "warn"}>
                    {thesis.dataMode === "live" ? "live data" : "demo data"}
                  </Badge>
                  <Badge tone={thesis.basket.risk.level === "low" ? "ok" : thesis.basket.risk.level === "medium" ? "warn" : "danger"}>
                    risk {thesis.basket.risk.score}
                  </Badge>
                  <span className="tnum ml-auto text-[9.5px] text-faint">{thesis.citations.length} sources</span>
                </div>

                <div className="mt-3 flex items-baseline gap-3 border-t border-line pt-2.5 font-mono text-[9.5px] text-faint">
                  <span>{thesis.followers} followers</span>
                  <span>{thesis.copies} copies</span>
                  <span className="ml-auto">{pct(thesis.basket.assets[0]?.targetWeight ?? 0, 0)} top</span>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => follow(thesis.id)}
                    disabled={busy === thesis.id}
                    className="flex-1 rounded-[4px] border border-line py-1.5 text-[11px] text-muted transition-colors hover:text-ink disabled:opacity-40"
                  >
                    Follow
                  </button>
                  <button
                    type="button"
                    onClick={() => copy(thesis.id)}
                    disabled={busy === thesis.id}
                    className="flex-1 rounded-[4px] bg-accent py-1.5 text-[11px] font-semibold text-[#1d1607] transition enabled:hover:bg-[#dbbc78] disabled:opacity-40"
                  >
                    Copy &amp; execute
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-6 border-t border-line pt-3">
        <SectionLabel>Attribution</SectionLabel>
        <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
          Every copy routes through ThesisForge, so the platform Builder Code is attached to each fill. Authors keep the
          follower and copy credit.
        </p>
      </div>
    </div>
  );
}
