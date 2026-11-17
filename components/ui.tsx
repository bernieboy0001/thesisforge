import type { ReactNode } from "react";
import type { AssetWeight, Citation, RiskReport } from "@/lib/types";
import { SOURCE_LABEL } from "@/lib/format";

/**
 * Quiet outline tags. Sentence case, hairline border, used sparingly — never
 * shout; the figure inside carries the information.
 */
export function Badge({
  children,
  tone = "muted",
  className = ""
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "ok" | "warn" | "danger" | "info";
  className?: string;
}) {
  const tones: Record<string, string> = {
    muted: "border-line-2 text-muted",
    accent: "border-accent/35 bg-accent-dim/40 text-accent",
    ok: "border-ok/35 bg-ok-dim/40 text-ok",
    warn: "border-warn/35 bg-warn-dim/40 text-warn",
    danger: "border-danger/35 bg-danger-dim/40 text-danger",
    info: "border-info/35 bg-info-dim/40 text-info"
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[4px] border px-1.5 py-[3px] text-[10px] font-medium leading-none ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default"
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "accent" | "warn";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-faint">{label}</span>
      <span
        className={`tnum text-[19px] leading-none font-semibold ${
          tone === "accent" ? "text-accent" : tone === "warn" ? "text-warn" : "text-ink"
        }`}
      >
        {value}
      </span>
      {hint && <span className="text-[10.5px] text-faint">{hint}</span>}
    </div>
  );
}

/**
 * A printed-section label: sentence-case medium type with a light rule, not a
 * tracked all-caps kicker. The right slot is for quiet metadata.
 */
export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-line pb-2">
      <h3 className="text-[13px] font-semibold text-ink">{children}</h3>
      {right && <div className="text-[10.5px] text-faint">{right}</div>}
    </div>
  );
}

/** One ranked footnote chip — the product's signature reference marker. */
export function CitationChip({ citation, index }: { citation: Citation; index: number }) {
  return (
    <a
      href={`#cite-${citation.id}`}
      title={citation.title}
      className="inline-flex items-baseline gap-1 rounded border border-line-2 px-1 py-[2px] font-mono text-[10px] leading-none text-accent transition-colors hover:border-accent/50 hover:bg-accent-dim/30"
    >
      [{index}]
      <span className="font-sans text-[9.5px] text-muted">{SOURCE_LABEL[citation.source] ?? citation.source}</span>
    </a>
  );
}

/**
 * Composition strip — the basket reduced to one hairline column: each holding
 * takes proportional width, darkest-to-lightest ink for rank, brass for the top
 * holding. Ticks mark the cap line only when weight breaches it.
 */
export function CompositionBar({ assets, className = "" }: { assets: AssetWeight[]; className?: string }) {
  const sorted = [...assets].sort((a, b) => b.targetWeight - a.targetWeight);
  const topTicker = sorted[0]?.symbol;
  return (
    <div
      className={`flex h-[7px] w-full overflow-hidden rounded-[2px] border border-line ${className}`}
      role="img"
      aria-label={`Basket composition: ${sorted
        .map((a) => `${a.symbol} ${(a.targetWeight * 100).toFixed(1)}%`)
        .join(", ")}`}
    >
      {sorted.map((asset) => (
        <div
          key={asset.symbol}
          style={{
            width: `${asset.targetWeight * 100}%`,
            background:
              asset.symbol === topTicker
                ? "var(--color-accent)"
                : `rgba(236, 232, 220, ${0.62 - Math.min(0.42, sorted.findIndex((x) => x.symbol === asset.symbol) * 0.055)})`
          }}
          title={`${asset.symbol} ${(asset.targetWeight * 100).toFixed(1)}%`}
        />
      ))}
    </div>
  );
}

export function SignalStrip({ asset }: { asset: AssetWeight }) {
  const rows = [
    { label: "align", value: asset.signals.thesisAlignment },
    { label: "flow", value: asset.signals.flowSignal },
    { label: "mom", value: asset.signals.momentum },
    { label: "liq", value: asset.signals.liquidity }
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-faint">
      {rows.map((row) => (
        <span key={row.label} className="inline-flex items-center gap-1.5">
          <span className="font-mono uppercase text-[9px] text-muted">{row.label}</span>
          <span className="inline-block h-[3px] w-9 overflow-hidden rounded-[1px] bg-white/[0.08]">
            <span
              className="block h-full bg-[#8a877a]"
              style={{ width: `${Math.round(row.value * 100)}%` }}
            />
          </span>
          <span className="tnum text-muted">{row.value.toFixed(2)}</span>
        </span>
      ))}
      <span className="tnum">risk −{asset.signals.riskPenalty.toFixed(2)} → score {asset.score.toFixed(3)}</span>
    </div>
  );
}

const riskTone = {
  low: "ok",
  medium: "warn",
  high: "danger"
} as const;

const riskWord = {
  low: "CLEAR",
  medium: "CAUTION",
  high: "REFUSE"
} as const;

/** A stamped verdict, the way an index committee would mark a draft. */
export function RiskPanel({ risk }: { risk: RiskReport }) {
  const levelTone = riskTone[risk.level];
  return (
    <div className="card p-5">
      <SectionLabel
        right={
          <span className="hidden font-mono text-[10px] text-faint sm:inline">score {risk.score}/100</span>
        }
      >
        Risk gate
      </SectionLabel>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[13px] text-muted">Committee review of this basket</p>
          <p className="mt-0.5 text-[11px] text-faint">Failed checks block nothing by themselves — they are visible before approval.</p>
        </div>
        <div
          aria-label={`Risk verdict: ${riskWord[risk.level]} · ${risk.score} of 100`}
          className={`grid h-16 w-16 shrink-0 rotate-[-4deg] place-items-center rounded-[4px] border-2 text-center ${
            risk.level === "low"
              ? "border-ok text-ok"
              : risk.level === "medium"
                ? "border-warn text-warn"
                : "border-danger text-danger"
          }`}
          style={{ boxShadow: "inset 0 0 0 1px var(--color-surface), inset 0 0 0 3px currentColor" }}
        >
          <span className="font-mono text-[12px] font-semibold leading-[1.05] tracking-[0.08em]">
            {riskWord[risk.level]}
            <br />
            <span className="text-[10px] tracking-[0.18em] opacity-90">{risk.score}/100</span>
          </span>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-line border-t border-line">
        {risk.checks.map((check) => (
          <li key={check.id} className="flex gap-3 py-2.5">
            <span
              aria-hidden
              className={`mt-[7px] h-1.5 w-4 shrink-0 border-t-2 ${
                check.status === "pass"
                  ? "border-ok"
                  : check.status === "warn"
                    ? "border-warn"
                    : "border-danger"
              }`}
            />
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-ink">
                {check.label}
                <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                  {check.status}
                </span>
              </p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface PipelineEntry {
  label: string;
  detail: string;
  state: "done" | "active" | "idle";
}

/** A printed form's steps: numbered, ruled, no card chrome. */
export function PipelineSteps({ steps }: { steps: PipelineEntry[] }) {
  return (
    <ol className="divide-y divide-line border-y border-line">
      {steps.map((step, i) => (
        <li key={step.label} className="flex items-start gap-3 py-2.5">
          <span
            className={`mt-0.5 w-6 shrink-0 font-mono text-[11px] ${
              step.state === "done" ? "text-accent" : step.state === "active" ? "text-ink" : "text-faint"
            }`}
          >
            {step.state === "done" ? "[done]" : `0${i + 1}`}
          </span>
          <div className="min-w-0">
            <p className={`text-[12.5px] font-medium ${step.state === "idle" ? "text-muted" : "text-ink"}`}>
              {step.label}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-faint">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
        <circle cx="17" cy="17" r="12.5" stroke="var(--color-faint)" strokeWidth="1.4" strokeDasharray="3.5 4" />
        <path d="M12 22 22 12" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <h3 className="font-serif text-[15px] font-semibold">{title}</h3>
      <p className="max-w-sm text-[12px] leading-snug text-muted">{body}</p>
      {action}
    </div>
  );
}
