import Link from "next/link";
import { PortfolioView, type PortfolioRow } from "@/components/PortfolioView";
import { computeDrift } from "@/lib/drift";
import { sodexConfig } from "@/lib/sodex";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const [positions, totals] = await Promise.all([store.positions(), store.totals()]);
  const cfg = sodexConfig();

  const rows: PortfolioRow[] = await Promise.all(
    positions.map(async (position) => ({ position, drift: await computeDrift(position, position.weights) }))
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold leading-none text-ink">The ledger</h1>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-muted">
            Every position is measured against the thesis that produced it. Drift past 3% triggers a rebalance that is
            solved back to target — not a blind full rebuild, and never a trade below the dust floor.
          </p>
        </div>
        <Link href="/gallery" className="rounded-[4px] border border-line-2 px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent">
          Copy another thesis →
        </Link>
      </div>

      <div className="mt-5">
        <PortfolioView
          rows={rows}
          totals={{
            positions: totals.positions,
            orders: totals.orders,
            tradedNotionalUsd: totals.tradedNotionalUsd,
            builderFeesUsd: totals.builderFeesUsd
          }}
          builder={{ id: cfg.builderId, fee: cfg.fee, network: cfg.network }}
        />
      </div>
    </main>
  );
}
