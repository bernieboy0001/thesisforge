"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMPLES = [
  {
    label: "Core beta",
    prompt:
      "Defensive core: bitcoin and ether exposure while spot ETF inflows persist, sized so the basket stays liquid and avoids meme risk."
  },
  {
    label: "AI semis",
    prompt:
      "Long AI infrastructure: inference demand is outrunning GPU supply, so own the accelerators, foundries and memory that every model needs."
  },
  {
    label: "L1 rotation",
    prompt:
      "High-beta L1 rotation: Solana and Sui should lead if stablecoin payment volume keeps broadening and fee revenue follows."
  },
  {
    label: "DeFi stack",
    prompt:
      "Own the DeFi stack as onchain lending and DEX volume recover, with oracles as the attested-pricing layer underneath."
  },
  {
    label: "Yield + gold",
    prompt:
      "Park in tokenised treasuries while real yields stay high, and keep a gold hedge for the day the rate-cut trade arrives."
  }
];

const STAGES = [
  "querying SoSoValue feeds",
  "checking SoDEX listings",
  "extracting citations",
  "scoring and allocating",
  "running the risk gate"
];

export function CompileForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState(EXAMPLES[0].prompt);
  const [notional, setNotional] = useState(10_000);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (prompt.trim().length < 8 || busy) return;
    setBusy(true);
    setError(null);
    setStage(0);
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 650);
    try {
      const res = await fetch("/api/thesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, engine: "spot", notionalUsd: notional })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Compile failed");
      router.push(`/t/${body.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compile failed");
      setBusy(false);
    } finally {
      clearInterval(timer);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="overflow-hidden rounded-[4px] border border-line-2 bg-surface shadow-[0_10px_30px_-14px_rgba(0,0,0,0.55)]"
    >
      {/* ticket masthead */}
      <div className="flex items-center justify-between gap-4 border-b border-line-2 bg-surface-2 px-4 py-2">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">Order of compilation</span>
          <span className="font-mono text-[10.5px] text-faint">spot</span>
        </div>
        <span className="font-mono text-[10px] text-faint">no hidden LLM step</span>
      </div>

      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <label htmlFor="thesis" className="sr-only">
          Your thesis
        </label>
        <textarea
          id="thesis"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          maxLength={600}
          placeholder="Describe your thesis in plain English — what to hold, why, what to avoid."
          className="w-full resize-none border-0 border-b border-line bg-transparent px-0 py-2 text-[15.5px] leading-relaxed text-ink placeholder:text-faint focus:border-accent"
        />

        {/* quick entries */}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1.5 text-[12px]">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Quick entries</span>
          {EXAMPLES.map((example) => {
            const active = prompt === example.prompt;
            return (
              <button
                key={example.label}
                type="button"
                onClick={() => setPrompt(example.prompt)}
                aria-pressed={active}
                className={`border-b transition-colors ${
                  active ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {example.label}
              </button>
            );
          })}
        </div>

        {/* notional + action */}
        <div className="ticket-rule mt-4 flex flex-wrap items-end gap-4 pt-4">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Notional · USD</span>
            <span className="flex items-baseline gap-1 border-b border-line pb-1.5 focus-within:border-accent">
              <span className="font-mono text-[15px] text-faint">$</span>
              <input
                type="number"
                min={100}
                step={100}
                value={notional}
                onChange={(e) => setNotional(Number(e.target.value))}
                aria-label="Notional in USD"
                className="tnum w-36 border-0 bg-transparent p-0 text-[15px] text-ink focus:outline-none"
              />
            </span>
          </label>

          <button
            type="submit"
            disabled={busy || prompt.trim().length < 8}
            className="h-10 rounded-[4px] bg-accent px-5 text-[13.5px] font-semibold text-[#1d1607] transition enabled:hover:bg-[#dbbc78] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Compiling…" : "Compile the basket"}
          </button>

          <p className="w-full text-[11px] leading-snug text-faint">
            Only SoDEX-listed spot pairs enter the basket. Weights come from retrieved evidence — every number on the
            next screen can be reproduced from what the feeds said at compile time.
          </p>
        </div>

        {busy && (
          <ol className="mt-4 divide-y divide-line border-y border-line" aria-live="polite">
            {STAGES.map((label, i) => {
              const done = i < stage;
              const active = i === stage;
              return (
                <li key={label} className="flex items-center gap-3 py-1.5 text-[11px]">
                  <span className={`font-mono text-[10px] ${done ? "text-accent" : active ? "text-ink" : "text-faint"}`}>
                    {done ? "[x]" : "[ ]"}
                  </span>
                  <span className={done ? "text-muted" : active ? "text-ink" : "text-faint"}>{label}</span>
                </li>
              );
            })}
          </ol>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-[4px] border border-danger/25 bg-danger-dim/40 px-3 py-2 text-[12px] text-danger">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
