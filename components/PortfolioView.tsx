"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DriftResult } from "@/lib/drift";
import { money, pct, price, quantity, timeAgo } from "@/lib/format";
import type { Position } from "@/lib/types";
import { Badge, EmptyState, SectionLabel, Stat } from "./ui";

export interface PortfolioRow {
  position: Position;
  drift: DriftResult;
}

interface Totals {
  positions: number;
  orders: number;
  tradedNotionalUsd: number;
  builderFeesUsd: number;
}

interface Feedback {
  message: string;
  legs: number;
  fees: number;
}

export function PortfolioView({
  rows,
  totals,
  builder
}: {
  rows: PortfolioRow[];
  totals: Totals;
  builder: { id: number; fee: number; network: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(rows[0]?.position.id ?? null);

  const rebases = rows.reduce((sum, row) => sum + (row.position.rebases ?? 0), 0);

  async function rebalanceOne(id: string) {
    const res = await fetch("/api/rebalance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positionId: id })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error ?? "Rebalance failed");
    setFeedback((prev) => ({
      ...prev,
      [id]: { message: body.message ?? "Rebalanced", legs: body.deltas?.length ?? 0, fees: body.builderFeesUsd ?? 0 }
    }));
  }

  async function rebalanceAll() {
    setError(null);
    setBusy("all");
    try {
      for (const row of rows) {
        if (row.drift.maxDrift < 0.03) continue;
        await rebalanceOne(row.position.id);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rebalance failed");
    } finally {
      setBusy(null);
    }
  }

  async function rebalance(id: string) {
    setError(null);
    setBusy(id);
    try {
      await rebalanceOne(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rebalance failed");
    } finally {
      setBusy(null);
    }
  }

  async function simulate(id: string) {
    setError(null);
    setBusy(`sim-${id}`);
    try {
      const res = await fetch(`/api/positions/${id}/simulate`, { method: "POST" });
      if (!res.ok) throw new Error("Could not simulate a market move");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No open positions yet"
        body="Execute a thesis to open a position. Drift and rebalance proposals appear here, priced against the basket's target weights."
        action={
          <Link href="/gallery" className="rounded-[4px] bg-accent px-3 py-1.5 text-[12px] font-semibold text-[#1d1607]">
            Browse the gallery
          </Link>
        }
      />
    );
  }

  const driftedCount = rows.filter((r) => r.drift.maxDrift >= 0.03).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-y-4 border-b border-line pb-4 sm:grid-cols-5">
        <Stat label="Positions" value={totals.positions} hint={`${driftedCount} drifted`} />
        <Stat label="Orders recorded" value={totals.orders} hint={`${rebases} rebalances`} />
        <Stat label="Traded notional" value={money(totals.tradedNotionalUsd)} />
        <Stat label="Builder fees" value={money(totals.builderFeesUsd, 2)} hint="platform attribution" />
        <Stat label="Builder code" value={builder.id ? `#${builder.id}` : "unset"} hint={`${(builder.fee / 10).toFixed(1)} bp · ${builder.network}`} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <SectionLabel right={<span className="font-mono text-[9.5px] text-faint">band {pct(0.03)}</span>}>Open theses</SectionLabel>
        <button
          type="button"
          onClick={rebalanceAll}
          disabled={busy !== null}
          className="rounded-[4px] border border-line-2 px-3 py-1.5 text-[11px] font-medium text-ink transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-40"
        >
          {busy === "all" ? "Rebalancing…" : "Rebalance all drifted"}
        </button>
      </div>

      {error && <p role="alert" className="rounded-[4px] border border-danger/25 bg-danger-dim/40 px-3 py-2 text-[12px] text-danger">{error}</p>}

      <div className="space-y-5">
        {rows.map(({ position, drift }) => {
          const drifted = drift.maxDrift >= 0.03;
          const fb = feedback[position.id];
          const targets = position.weights;
          const symbols = [...new Set([...Object.keys(targets), ...Object.keys(drift.weights)])].sort(
            (a, b) => (targets[b] ?? 0) - (targets[a] ?? 0)
          );
          const isOpen = expanded === position.id;

          return (
            <article key={position.id} className="overflow-hidden rounded-[4px] border border-line bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge>{position.engine}</Badge>
                    <Badge tone={drifted ? "warn" : "ok"}>
                      {drifted ? `drift ${pct(drift.maxDrift)}` : "on target"}
                    </Badge>
                    <Badge tone={drift.source === "live" ? "info" : "muted"}>
                      {drift.source === "live" ? "live prices" : "simulated prices"}
                    </Badge>
                    {position.copiesNote && <Badge tone="info">copied</Badge>}
                  </div>
                  <Link href={`/t/${position.thesisId}`} className="mt-1.5 block max-w-2xl truncate text-[13px] font-medium text-ink hover:text-accent">
                    {position.thesisPrompt}
                  </Link>
                  <p className="mt-0.5 font-mono text-[9.5px] text-faint">
                    opened {timeAgo(position.createdAt)}
                    {position.lastRebalanceAt ? ` · rebalanced ${timeAgo(position.lastRebalanceAt)}` : " · never rebalanced"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-faint">NAV</p>
                    <p className="tnum text-[15px] font-semibold text-ink">{money(drift.navUsd)}</p>
                    <p className="tnum text-[9.5px] text-faint">
                      {drift.navUsd >= position.navUsd ? "+" : "−"}
                      {Math.abs(((drift.navUsd - position.navUsd) / position.navUsd) * 100).toFixed(2)}% vs entry
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => rebalance(position.id)}
                    disabled={busy !== null || !drifted}
                    className="rounded-[4px] bg-accent px-3 py-2 text-[11px] font-semibold text-[#1d1607] transition enabled:hover:bg-[#dbbc78] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy === position.id ? "Rebalancing…" : "Rebalance"}
                  </button>
                  <button
                    type="button"
                    onClick={() => simulate(position.id)}
                    disabled={busy !== null}
                    title="Apply a deterministic market move so drift can be reviewed without waiting for the real market"
                    className="rounded-[4px] border border-line px-2.5 py-2 text-[10.5px] text-muted transition-colors hover:text-ink disabled:opacity-40"
                  >
                    {busy === `sim-${position.id}` ? "…" : "Simulate move"}
                  </button>
                </div>
              </div>

              {fb && (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line bg-accent-dim/30 px-4 py-2 text-[11px] text-accent">
                  <span>{fb.message}</span>
                  <span className="text-faint">·</span>
                  <span className="tnum">{fb.legs} legs</span>
                  <span className="text-faint">·</span>
                  <span className="tnum">{money(fb.fees, 2)} builder fees</span>
                </div>
              )}

              <div className="grid gap-4 px-4 py-3 md:grid-cols-[minmax(0,1fr)_252px]">
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-faint">Target vs current</span>
                    <span className="font-mono text-[9.5px] text-faint">drift band 3%</span>
                  </div>
                  <div className="space-y-2">
                    {symbols.map((symbol) => {
                      const target = targets[symbol] ?? 0;
                      const current = drift.weights[symbol] ?? 0;
                      const delta = current - target;
                      return (
                        <div key={symbol} className="grid grid-cols-[48px_minmax(0,1fr)_88px] items-center gap-2">
                          <span className="font-mono text-[10.5px] font-medium text-ink">{symbol}</span>
                          <div className="relative h-[3px] w-full bg-white/[0.07]">
                            <div
                              className="absolute inset-y-0 left-0 bg-[#b9b4a4]"
                              style={{ width: `${Math.max(1, Math.min(100, current * 100))}%` }}
                            />
                            <span
                              className="absolute top-1/2 h-3 w-[1.5px] -translate-y-1/2 bg-ink"
                              style={{ left: `${Math.min(99, target * 100)}%` }}
                            />
                          </div>
                          <span
                            className={`tnum text-right text-[10.5px] ${
                              Math.abs(delta) >= 0.03 ? (delta > 0 ? "text-warn" : "text-info") : "text-faint"
                            }`}
                          >
                            {pct(current, 1)} <span className="text-faint">/ {pct(target, 0)}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border border-line bg-surface-2 p-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-faint">Recent orders</span>
                    <span className="tnum text-[9.5px] text-faint">{position.orders.length}</span>
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {position.orders
                      .slice(-5)
                      .reverse()
                      .map((order) => (
                        <li key={order.id} className="flex items-baseline gap-2 text-[10px]">
                          <span className={`font-mono ${order.side === "buy" ? "text-ok" : "text-muted"}`}>
                            {order.side === "buy" ? "B" : "S"}
                          </span>
                          <span className="font-mono text-muted">{order.symbol}</span>
                          <span className="tnum ml-auto text-faint">{money(order.notionalUsd)}</span>
                          <span className="tnum w-11 text-right text-faint">{money(order.builderFeeUsd, 2)}</span>
                        </li>
                      ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : position.id)}
                    aria-expanded={isOpen}
                    className="mt-2 w-full border border-line py-1 font-mono text-[9.5px] text-muted transition-colors hover:text-ink"
                  >
                    {isOpen ? "Hide audit log" : "Show audit log"}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="overflow-x-auto border-t border-line">
                  <table className="w-full min-w-[560px] text-[10.5px]">
                    <thead className="bg-surface-2 text-left font-mono text-[9px] uppercase tracking-[0.1em] text-faint">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">Time</th>
                        <th className="px-3 py-1.5 font-medium">Side</th>
                        <th className="px-3 py-1.5 font-medium">Pair</th>
                        <th className="px-3 py-1.5 text-right font-medium">Qty</th>
                        <th className="px-3 py-1.5 text-right font-medium">Price</th>
                        <th className="px-3 py-1.5 text-right font-medium">Notional</th>
                        <th className="px-3 py-1.5 text-right font-medium">Builder fee</th>
                        <th className="px-3 py-1.5 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {position.orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-3 py-1.5 font-mono text-faint">
                            {new Date(order.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className={`px-3 py-1.5 font-mono text-[10px] ${order.side === "buy" ? "text-ok" : "text-muted"}`}>
                            {order.side.toUpperCase()}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-muted">{order.sodexSymbol}</td>
                          <td className="tnum px-3 py-1.5 text-right text-muted">{quantity(order.quantity)}</td>
                          <td className="tnum px-3 py-1.5 text-right text-muted">{price(order.price)}</td>
                          <td className="tnum px-3 py-1.5 text-right text-muted">{money(order.notionalUsd)}</td>
                          <td className="tnum px-3 py-1.5 text-right text-faint">{money(order.builderFeeUsd, 2)}</td>
                          <td className="px-3 py-1.5 text-right">
                            <Badge tone={order.status === "filled" ? "ok" : "muted"}>{order.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <p className="text-[10.5px] leading-relaxed text-faint">
        Drift is holdings priced at SoDEX tickers (or deterministic demo prices when the public endpoint is unreachable).
        A 3% band triggers a rebalance; once triggered, every leg is solved back to target above a 0.5% dust floor. Builder
        fees are counted on the sell side of spot and both sides of perps — exactly how SoDEX charges them.
      </p>
    </div>
  );
}
