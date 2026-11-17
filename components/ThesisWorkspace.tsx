"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ExecutionPlan, Order, Position, Thesis } from "@/lib/types";
import { money, pct, quantity, shortAddress, timeAgo } from "@/lib/format";
import { Badge, CitationChip, CompositionBar, RiskPanel, SectionLabel, SignalStrip } from "./ui";

interface Props {
  thesis: Thesis;
  copyMode: boolean;
  builder: { id: number; fee: number; network: string };
}

export function ThesisWorkspace({ thesis, copyMode, builder }: Props) {
  const router = useRouter();
  const [notional, setNotional] = useState(10_000);
  const [busy, setBusy] = useState<"execute" | "publish" | null>(null);
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [status, setStatus] = useState(thesis.status);
  const [counts, setCounts] = useState({ followers: thesis.followers, copies: thesis.copies });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const citationIndex = useMemo(() => {
    const map = new Map<string, number>();
    thesis.citations.forEach((c, i) => map.set(c.id, i + 1));
    return map;
  }, [thesis.citations]);

  const citationById = useMemo(() => new Map(thesis.citations.map((c) => [c.id, c])), [thesis.citations]);

  const executable = thesis.basket.assets.filter((a) => a.symbolVerified && a.targetWeight > 0);
  const citedWeight = thesis.basket.assets
    .filter((a) => a.citationIds.length > 0)
    .reduce((sum, a) => sum + a.targetWeight, 0);

  const feeRate = plan?.builder.feeRate ?? builder.fee;

  async function execute() {
    setBusy("execute");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thesisId: thesis.id, notionalUsd: notional })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Execution failed");
      setPlan(body.plan as ExecutionPlan);
      setPosition(body.position as Position);
      setNotice("Plan built and recorded. Every leg carries the platform Builder Code.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    setBusy("publish");
    setError(null);
    try {
      const res = await fetch(`/api/thesis/${thesis.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "You" })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Publish failed");
      setStatus("published");
      setNotice("Published. Anyone can now follow or copy this thesis.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  }

  async function follow() {
    setError(null);
    try {
      const res = await fetch(`/api/gallery/${thesis.id}/follow`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Follow failed");
      setCounts({ followers: body.followers, copies: body.copies });
      setNotice("Following. Rebalance proposals will reference this thesis.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Follow failed");
    }
  }

  const orders: Order[] = position?.orders ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6">
      {/* dossier strip: origin line */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3 text-[10.5px] text-faint">
        <Link href="/gallery" className="transition-colors hover:text-ink">
          ← Gallery
        </Link>
        <span className="text-line-2">/</span>
        <span className="font-mono">{thesis.id.slice(0, 8).toUpperCase()}</span>
        <Badge tone={thesis.dataMode === "live" ? "muted" : "warn"}>
          {thesis.dataMode === "live" ? "Live SoSoValue" : "Demo dataset"}
        </Badge>
        <Badge>{thesis.basket.engine.toUpperCase()}</Badge>
        <Badge tone={status === "published" ? "ok" : "muted"}>{status === "published" ? "Published" : "Draft"}</Badge>
        <span className="tnum ml-auto">{timeAgo(thesis.createdAt)}</span>
      </div>

      {copyMode && (
        <div className="mt-4 rounded-[4px] border border-info/25 bg-info-dim/50 px-4 py-2.5 text-[11.5px] leading-relaxed text-info">
          You are copying a published thesis. Orders are tagged with ThesisForge&apos;s Builder Code and the author keeps
          the follower credit. Nothing executes without your explicit approval below.
        </div>
      )}

      <header className="mt-6">
        <h1 className="max-w-4xl font-serif text-[24px] font-semibold leading-[1.15] text-ink sm:text-[29px]">
          {thesis.prompt}
        </h1>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[10.5px] text-muted">
          <span>
            by <span className="text-ink">{thesis.author.name ?? shortAddress(thesis.author.address)}</span>
          </span>
          <span>{counts.followers} followers · {counts.copies} copies</span>
          <span>{thesis.citations.length} sources / {thesis.sourcesQueried.length} feed calls</span>
          <span>risk {thesis.basket.risk.score}/100</span>
        </div>
        <p className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-muted">{thesis.summary}</p>
      </header>

      {(thesis.basket.excluded?.length ?? 0) > 0 && (
        <div className="mt-4 rounded-[4px] border border-warn/30 bg-warn-dim/40 px-4 py-2.5 text-[11.5px] leading-relaxed text-warn">
          <span className="font-semibold">Ruled out before allocation.</span>{" "}
          {thesis.basket.excluded.map((entry) => `${entry.symbol} — ${entry.reason}`).join("; ")}. The compiler never
          weights an asset whose spot pair is unconfirmed on {builder.network}, or one the thesis explicitly rules out.
        </div>
      )}

      {notice && <p role="status" className="mt-4 rounded-[4px] border border-ok/25 bg-ok-dim/40 px-3 py-2 text-[12px] text-ok">{notice}</p>}
      {error && <p role="alert" className="mt-4 rounded-[4px] border border-danger/25 bg-danger-dim/40 px-3 py-2 text-[12px] text-danger">{error}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_348px]">
        {/* ─────────────── left: the holdings document ─────────────── */}
        <div className="flex min-w-0 flex-col gap-6">
          <section className="overflow-hidden rounded-[4px] border border-line-2 bg-surface shadow-[0_10px_30px_-14px_rgba(0,0,0,0.55)]">
            {/* sheet masthead */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-2 bg-surface-2 px-4 py-2">
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">Proposed basket</span>
                <span className="font-mono text-[10.5px] text-faint">{thesis.basket.assets.length} positions</span>
              </div>
              <span className="tnum font-mono text-[9.5px] text-faint">{pct(citedWeight, 0)} of weight cited · cap 28%</span>
            </div>

            <ol className="divide-y divide-line">
              {thesis.basket.assets.map((asset, i) => {
                const chips = asset.citationIds
                  .map((id) => citationById.get(id))
                  .filter((c): c is NonNullable<typeof c> => Boolean(c))
                  .slice(0, 4)
                  .map((c) => ({ citation: c, index: citationIndex.get(c.id) ?? 0 }));
                return (
                  <li key={asset.symbol} className="px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 w-5 shrink-0 font-mono text-[10px] text-faint">{String(i + 1).padStart(2, "0")}</span>

                      <div className="w-[84px] shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-ink">{asset.symbol}</span>
                          {!asset.symbolVerified && <Badge tone="danger">no pair</Badge>}
                        </div>
                        <div className="truncate text-[10px] text-faint">{asset.name}</div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="relative h-[3px] w-full overflow-hidden rounded-[1px] bg-white/[0.07]">
                          <span
                            className="absolute inset-y-0 left-0 bg-[#b9b4a4]"
                            style={{ width: `${Math.min(100, (asset.targetWeight / 0.28) * 100)}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{asset.reason}</p>
                        {chips.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {chips.map(({ citation, index }) => (
                              <CitationChip key={citation.id} citation={citation} index={index} />
                            ))}
                          </div>
                        )}
                        <div className="mt-2">
                          <SignalStrip asset={asset} />
                        </div>
                      </div>

                      <div className="w-[64px] shrink-0 text-right">
                        <div className="tnum text-[15px] font-semibold text-ink">{(asset.targetWeight * 100).toFixed(1)}%</div>
                        <div className="tnum text-[9.5px] text-faint">{money(notional * asset.targetWeight)}</div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="border-t border-line-2 bg-surface-2 px-4 py-2">
              <CompositionBar assets={thesis.basket.assets} />
            </div>

            <details className="border-t border-line px-4 py-3">
              <summary className="cursor-pointer text-[11px] font-medium text-muted transition-colors hover:text-ink">
                Methodology &amp; signal weights
              </summary>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">{thesis.basket.methodology}</p>
              <p className="mt-2 text-[10.5px] leading-relaxed text-faint">
                Inputs are keyword and feed evidence, not language-model guesses. Recompiling the same thesis against the
                same data reproduces the same weights.
              </p>
            </details>
          </section>

          <section>
            <SectionLabel
              right={<span className="font-mono text-[9.5px] text-faint">click [n] to jump</span>}
            >
              Source trail — {thesis.citations.length} items
            </SectionLabel>
            <ol className="mt-2 divide-y divide-line">
              {thesis.citations.map((citation, i) => (
                <li key={citation.id} id={`cite-${citation.id}`} className="scroll-mt-20 py-3">
                  <div className="flex items-start gap-3">
                    <span className="fn mt-0.5">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-faint">{citation.source}</span>
                        <span className="text-[10px] text-faint">
                          {citation.publisher} · {new Date(citation.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      {citation.url ? (
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block text-[12px] font-medium leading-snug text-ink underline decoration-line-2 underline-offset-2 hover:text-accent"
                        >
                          {citation.title}
                        </a>
                      ) : (
                        <p className="mt-1 text-[12px] font-medium leading-snug text-ink">{citation.title}</p>
                      )}
                      {citation.snippet && (
                        <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{citation.snippet}</p>
                      )}
                      {citation.symbols.length > 0 && (
                        <p className="mt-1 font-mono text-[9.5px] text-faint">linked to {citation.symbols.join(", ")}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <details className="mt-2 border-t border-line pt-3">
              <summary className="cursor-pointer text-[11px] font-medium text-muted transition-colors hover:text-ink">
                {thesis.sourcesQueried.length} feed calls
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {thesis.sourcesQueried.map((source) => (
                  <span key={source} className="border border-line px-1.5 py-0.5 font-mono text-[9.5px] text-faint">
                    {source}
                  </span>
                ))}
              </div>
            </details>
          </section>

        </div>

        {/* ─────────────── right: the execution ticket ─────────────── */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-[64px] lg:self-start">
          <section className="overflow-hidden rounded-[4px] border border-line-2 bg-surface shadow-[0_10px_30px_-14px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-line-2 bg-surface-2 px-4 py-2">
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">Execution ticket</span>
              <Badge tone={plan?.mode === "live" ? "accent" : "warn"}>{plan?.mode === "live" ? "Live" : "Simulated"}</Badge>
            </div>

            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="border-r border-line pr-3">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-faint">Legs</p>
                  <p className="tnum text-[16px] font-semibold">{executable.length}</p>
                </div>
                <div>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-faint">Venue</p>
                  <p className="text-[13px] font-medium">SoDEX spot</p>
                </div>
              </div>

              <label className="block">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-faint">Notional · USD</span>
                <span className="mt-1 flex items-baseline gap-1.5 border-b border-line pb-1.5 focus-within:border-accent">
                  <span className="font-mono text-[14px] text-faint">$</span>
                  <input
                    type="number"
                    min={100}
                    step={500}
                    value={notional}
                    onChange={(e) => setNotional(Number(e.target.value))}
                    aria-label="Notional in USD"
                    className="tnum w-full border-0 bg-transparent p-0 text-[16px] text-ink focus:outline-none"
                  />
                </span>
              </label>

              <div className="border border-line bg-surface-2 px-3 py-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-muted">Builder fee</span>
                  <span className="tnum text-[11px] font-medium text-ink">{(feeRate / 10).toFixed(1)} bp</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-[11px] text-muted">Charged on this batch</span>
                  <span className="tnum text-[11px] font-medium text-accent">{money(plan?.builder.estimatedUsd ?? 0, 2)}</span>
                </div>
                <p className="mt-1.5 text-[9.5px] leading-snug text-faint">
                  {(plan?.builder.note ??
                    "SoDEX collects builder fees in the quote asset and exempts spot buys. The initial buy earns nothing; the rebalance loop is the revenue engine.")}
                </p>
              </div>

              {builder.id === 0 && (
                <p className="border border-warn/30 bg-warn-dim/30 px-2.5 py-2 text-[10px] leading-snug text-warn">
                  SODEX_BUILDER_ID is unset — the payload carries builder id 0 until it is configured.
                </p>
              )}

              <button
                type="button"
                onClick={execute}
                disabled={busy !== null || executable.length === 0}
                className="w-full rounded-[4px] bg-accent py-2.5 text-[13px] font-semibold text-[#1d1607] transition enabled:hover:bg-[#dbbc78] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "execute" ? "Building plan…" : `Approve and build the ${executable.length}-leg plan`}
              </button>

              <p className="text-[9.5px] leading-snug text-faint">
                No signature is requested in demo mode. Set SODEX_LIVE, SODEX_ACCOUNT_ID and a master-wallet approval to
                route for real; the payload below is already the exact batch shape.
              </p>

              {orders.length > 0 && (
                <div className="space-y-3 border-t border-line pt-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <SectionLabel>Order plan</SectionLabel>
                    <Badge tone="accent">{orders.length} legs</Badge>
                  </div>
                  <div className="overflow-hidden border border-line">
                    <table className="w-full text-[10.5px]">
                      <thead className="bg-surface-2 text-left font-mono text-[9px] uppercase tracking-[0.1em] text-faint">
                        <tr>
                          <th className="px-2 py-1.5 font-medium">Leg</th>
                          <th className="px-2 py-1.5 text-right font-medium">Qty</th>
                          <th className="px-2 py-1.5 text-right font-medium">Notional</th>
                          <th className="px-2 py-1.5 text-right font-medium">Fee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {orders.map((order) => (
                          <tr key={order.id}>
                            <td className="px-2 py-1.5">
                              <span className={`font-mono text-[9.5px] ${order.side === "buy" ? "text-ok" : "text-muted"}`}>
                                {order.side.toUpperCase()}
                              </span>{" "}
                              <span className="text-ink">{order.symbol}</span>
                            </td>
                            <td className="tnum px-2 py-1.5 text-right text-muted">{quantity(order.quantity)}</td>
                            <td className="tnum px-2 py-1.5 text-right text-muted">{money(order.notionalUsd)}</td>
                            <td className="tnum px-2 py-1.5 text-right text-faint">{money(order.builderFeeUsd, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[9px] text-faint">
                    <span>
                      {plan?.pricesLive
                        ? "live SoDEX tickers"
                        : plan?.unpricedSymbols?.length
                          ? `${plan.orders.length - plan.unpricedSymbols.length}/${plan.orders.length} live · fallback ${plan.unpricedSymbols.join(", ")}`
                          : "fallback tickers"}
                    </span>
                    <span className="text-line-2">·</span>
                    <span>symbolID resolved on spot markets</span>
                  </div>

                  <details className="border border-line bg-bg">
                    <summary className="cursor-pointer px-2.5 py-2 font-mono text-[9.5px] text-faint transition-colors hover:text-ink">
                      SoDEX batch payload (with builder)
                    </summary>
                    <pre className="max-h-56 overflow-auto border-t border-line px-2.5 py-2 font-mono text-[9px] leading-relaxed text-muted">
{JSON.stringify(plan?.payload, null, 2)}
                    </pre>
                  </details>

                  <details className="border border-line bg-bg">
                    <summary className="cursor-pointer px-2.5 py-2 font-mono text-[9.5px] text-faint transition-colors hover:text-ink">
                      ApproveBuilderFee typed data (master wallet, once)
                    </summary>
                    <pre className="max-h-56 overflow-auto border-t border-line px-2.5 py-2 font-mono text-[9px] leading-relaxed text-muted">
{JSON.stringify(plan?.approvalTypedData, null, 2)}
                    </pre>
                  </details>

                  <div className="flex gap-2">
                    <Link
                      href="/portfolio"
                      className="flex-1 rounded-[4px] border border-line bg-surface-2 py-2 text-center text-[11.5px] font-medium text-ink transition-colors hover:border-line-2"
                    >
                      Track in portfolio →
                    </Link>
                    <Link
                      href={`/t/${thesis.id}`}
                      className="rounded-[4px] border border-line bg-surface-2 px-3 py-2 text-center text-[11.5px] text-muted transition-colors hover:text-ink"
                    >
                      Refresh
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>

          <RiskPanel risk={thesis.basket.risk} />

          <section className="border border-line bg-surface px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[12px] font-semibold text-ink">Publish &amp; follow</p>
              <span className="tnum font-mono text-[9.5px] text-faint">{counts.followers} · {counts.copies}</span>
            </div>
            <p className="mt-1 text-[10.5px] leading-snug text-muted">
              Publishing puts the thesis in the public gallery with its citation trail. Copies route back here; every
              execution still carries the platform Builder Code.
            </p>
            <div className="mt-2.5 flex gap-2">
              {status === "published" ? (
                <Link
                  href="/gallery"
                  className="flex-1 rounded-[4px] border border-line-2 py-2 text-center text-[11.5px] font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent"
                >
                  View in gallery →
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={publish}
                  disabled={busy !== null}
                  className="flex-1 rounded-[4px] border border-line-2 py-2 text-[11.5px] font-medium text-ink transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-40"
                >
                  {busy === "publish" ? "Publishing…" : "Publish to gallery"}
                </button>
              )}
              <button
                type="button"
                onClick={follow}
                className="rounded-[4px] border border-line px-3 py-2 text-[11.5px] text-muted transition-colors hover:text-ink"
              >
                Follow
              </button>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between border-t border-line pt-2.5 font-mono text-[9.5px] text-faint">
              <span>builder {builder.id || "unset"}</span>
              <span>{builder.network}</span>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
