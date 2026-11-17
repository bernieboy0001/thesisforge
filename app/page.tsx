import Link from "next/link";
import { CompileForm } from "@/components/CompileForm";
import { CompositionBar, Stat } from "@/components/ui";
import { ensureSeeded } from "@/lib/seed";
import { sodexConfig } from "@/lib/sodex";
import { store } from "@/lib/store";
import { compactMoney, timeAgo } from "@/lib/format";
import type { Thesis } from "@/lib/types";

export const dynamic = "force-dynamic";

function DossierSlip({ thesis }: { thesis: Thesis }) {
  const sorted = [...thesis.basket.assets].sort((a, b) => b.targetWeight - a.targetWeight);
  const top = sorted.slice(0, 5);
  const citationIndex = new Map(thesis.citations.map((citation, i) => [citation.id, i + 1]));
  const issue = thesis.id.slice(0, 8).toUpperCase();
  return (
    <figure className="relative">
      {/* the sheet itself */}
      <div className="overflow-hidden rounded-[4px] border border-line-2 bg-surface shadow-[0_18px_50px_-12px_rgba(0,0,0,0.5)]">
        {/* masthead */}
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2.5">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-[13px] font-semibold text-ink">Index Basket</span>
            <span className="font-mono text-[9.5px] text-faint">№ {issue}</span>
          </div>
          <span className="font-mono text-[9.5px] uppercase text-faint">
            {thesis.dataMode === "live" ? "live · sosovalue" : "demo dataset"}
          </span>
        </div>

        {/* thesis line */}
        <div className="border-b border-line px-4 py-3">
          <p className="line-clamp-2 font-serif text-[13px] font-medium leading-snug text-ink">{thesis.prompt}</p>
        </div>

        {/* holdings ledger */}
        <ul className="divide-y divide-line">
          {top.map((asset) => (
            <li key={asset.symbol} className="flex items-center gap-2 px-4 py-2">
              <span className="w-14 font-mono text-[11px] font-medium text-ink">{asset.symbol}</span>
              <span className="relative h-[3px] flex-1 overflow-hidden rounded-[1px] bg-white/[0.07]">
                <span
                  className="absolute inset-y-0 left-0 bg-[#b9b4a4]"
                  style={{ width: `${Math.min(100, (asset.targetWeight / 0.28) * 100)}%` }}
                />
              </span>
              <span className="tnum w-11 text-right text-[11px] text-muted">{(asset.targetWeight * 100).toFixed(1)}%</span>
              <span className="flex gap-0.5">
                {asset.citationIds.slice(0, 2).map((id) => (
                  <span key={id} className="fn" aria-label={`Citation ${citationIndex.get(id)}`}>
                    {citationIndex.get(id) ?? "?"}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>

        <div className="border-t border-line px-4 py-2.5">
          <CompositionBar assets={thesis.basket.assets} />
          <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-faint">
            <span>{thesis.basket.assets.length} legs · {thesis.citations.length} sources</span>
            <span>risk gate {thesis.basket.risk.score}/100</span>
          </div>
        </div>
      </div>

      {/* shadow sheet behind — a stack of slips */}
      <div aria-hidden className="absolute inset-x-2 -bottom-2 -z-10 h-full rounded-[4px] border border-line bg-surface-2" />
    </figure>
  );
}

export default async function Home() {
  await ensureSeeded();
  const [published, totals] = await Promise.all([store.published(), store.totals()]);
  const cfg = sodexConfig();
  const featured = published.slice(0, 3);
  const lead = published[0];
  const sources = published.reduce((sum, thesis) => sum + thesis.citations.length, 0);

  return (
    <main className="flex-1">
      {/* ── hero: asymmetric split ─────────────────────────────── */}
      <section className="border-b border-line">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-10 pt-12 sm:px-6 lg:grid-cols-[7fr_5fr] lg:gap-14 lg:pb-14 lg:pt-16">
          <div>
            <h1 className="max-w-[22ch] font-serif text-[40px] font-semibold leading-[1.06] tracking-[-0.01em] text-ink sm:text-[52px]">
              Describe a thesis. Get a cited, executable index.
            </h1>
            <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-muted">
              ThesisForge compiles plain English into a weighted basket from SoSoValue data, shows the source behind
              every weight, gates the result on risk, and turns it into a Builder-Code-tagged SoDEX order plan — ready
              to approve, publish, and let others follow.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#compile"
                className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-accent px-4 text-[13px] font-semibold text-[#1c1608] transition-colors hover:bg-[#dbbc78]"
              >
                Compile a thesis
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                  <path d="M2 6.5h8.5M7.2 3.1 10.6 6.5 7.2 9.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <Link href="/gallery" className="text-[13px] font-medium text-muted transition-colors hover:text-ink">
                See what the desk publishes →
              </Link>
            </div>
            <p className="mt-6 font-mono text-[10.5px] text-faint">
              SoSoValue live feed · SoSoValueIndexes methodology · SoDEX execution · simulated orders
            </p>
          </div>

          {/* signature artifact */}
          <div className="lg:justify-self-end">
            {lead ? <DossierSlip thesis={lead} /> : <div className="card p-6 text-sm text-muted">No published theses yet.</div>}
          </div>
        </div>

        {/* counters, ruled */}
        <div className="border-t border-line">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-5 px-4 py-4 sm:px-6 lg:grid-cols-4">
            <Stat label="Theses compiled" value={totals.theses} hint={`${totals.published} published`} />
            <Stat label="Sources cited" value={sources} hint="news · ETF · sector · SSI · macro" />
            <Stat label="Positions opened" value={totals.positions} hint={`${totals.orders} orders recorded`} />
            <Stat label="Builder fees" value={compactMoney(totals.builderFeesUsd)} hint={`${(cfg.fee / 10).toFixed(1)} bp · ${cfg.network}`} />
          </div>
        </div>
      </section>

      {/* ── compile ticket ────────────────────────────────────── */}
      <section id="compile" className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 py-10 sm:px-6">
        <CompileForm />
      </section>

      {/* ── the method, as a printed ledger ───────────────────── */}
      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[7fr_5fr] lg:gap-14">
          <div>
            <h2 className="font-serif text-[26px] font-semibold leading-tight text-ink">The method, on paper</h2>
            <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-muted">
              Every compile runs the same five steps. No hidden language-model step in the weight path — the formula and
              the inputs for every asset are stored with the thesis, so a rebuild against the same data reproduces the
              same weights.
            </p>
            <ol className="mt-6 divide-y divide-line border-t border-line">
              {[
                ["Retrieve", "news/search · news/hot · ETF history · sector spotlight · SSI index feeds · macro events — each normalised into numbered citations."],
                ["Read", "Clauses that rule out an exposure are stripped before matching — a bearish headline can never become silent evidence to buy."],
                ["Score", "0.40·alignment + 0.25·flow + 0.20·momentum + 0.15·liquidity, penalised by risk — then softmax (T=5), a 28% per-asset cap, dust pruned below 2%."],
                ["Gate", "Concentration, breadth, meme exposure, sector mix, tokenised-equity weight, evidence coverage — failed checks are visible before approval."],
                ["Execute", "Legs map to confirmed SoDEX pairs with numeric symbol IDs, priced from live tickers, every order tagged with the platform Builder Code."]
              ].map(([label, detail], i) => (
                <li key={label} className="grid grid-cols-[3.2rem_7rem_1fr] items-baseline gap-2 py-3">
                  <span className="font-mono text-[12px] text-faint">0{i + 1}</span>
                  <span className="text-[13px] font-semibold text-ink">{label}</span>
                  <span className="text-[12px] leading-snug text-muted">{detail}</span>
                </li>
              ))}
            </ol>
          </div>

          <aside>
            <h2 className="font-serif text-[26px] font-semibold leading-tight text-ink">The fine print</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              SoDEX collects builder fees in the quote asset — and never on the buying side of a spot trade. A fresh
              spot basket earns <span className="text-ink">nothing on entry</span>. ThesisForge states that plainly
              instead of projecting fake revenue.
            </p>
            <div className="mt-5 border-t border-line">
              {[
                ["1", "Rebalances and exits accrue the 0.5 bp through the sell leg of every rebalance. The 3% band is the trigger; the solve is against live prices, so drift converges instead of lingering."],
                ["2", "This build ships spot-only — the public perp market endpoints are undocumented, so no perp leg is ever proposed. Perps would accrue on both sides."],
                ["3", "Caps are 2% spot and 0.2% perps. The approval happens once with the master wallet; every order afterwards carries the Builder Code automatically."],
                ["4", "Orders are recorded as simulated unless a signing key is configured. Live submission is intentionally not wired in this build."]
              ].map(([n, text]) => (
                <div key={n as string} className="flex gap-3 border-b border-line py-3">
                  <span className="fn">{n}</span>
                  <p className="text-[12px] leading-relaxed text-muted">{text}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-faint">
              This is why the product ships with a monitor-and-rebalance loop instead of stopping at the first fill — the
              band is where the Builder fee actually accrues.
            </p>
          </aside>
        </div>
      </section>

      {/* ── recent publication, as issue slips ───────────────── */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="font-serif text-[26px] font-semibold leading-tight text-ink">From the copy desk</h2>
              <p className="mt-1.5 max-w-[52ch] text-[13px] text-muted">
                Published theses keep their full citation trail. Copy one and it executes with attribution intact.
              </p>
            </div>
            <Link href="/gallery" className="shrink-0 text-[12px] font-medium text-muted transition-colors hover:text-ink">
              All theses →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {featured.map((thesis) => (
              <Link
                key={thesis.id}
                href={`/t/${thesis.id}`}
                className="group rounded-[4px] border border-line bg-surface p-4 transition-colors hover:border-line-2"
              >
                <div className="flex items-center justify-between gap-3 font-mono text-[9.5px] text-faint">
                  <span className="truncate">{thesis.author.name ?? "Anonymous"}</span>
                  <span>{timeAgo(thesis.createdAt)}</span>
                </div>
                <h3 className="mt-2 line-clamp-2 min-h-[2.4em] text-[13px] font-medium leading-snug text-ink transition-colors group-hover:text-accent">
                  {thesis.prompt}
                </h3>
                <div className="mt-3">
                  <CompositionBar assets={thesis.basket.assets} />
                </div>
                <div className="mt-3 flex items-center gap-3 font-mono text-[9.5px] text-faint">
                  <span>{thesis.basket.assets.length} legs</span>
                  <span>{thesis.citations.length} sources</span>
                  <span className="ml-auto">{thesis.followers} follows · {thesis.copies} copies</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
