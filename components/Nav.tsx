import { sodexConfig } from "@/lib/sodex";
import { NavLinks } from "./NavLinks";

export function Nav() {
  const cfg = sodexConfig();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-[52px] max-w-6xl items-center gap-6 px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2.5" aria-label="ThesisForge home">
          <span aria-hidden className="grid h-7 w-7 place-items-center">
            {/* Flat index mark: three bars in the desk's ink. */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="9" width="3.4" height="7" rx="0.8" fill="var(--color-muted)" />
              <rect x="7.3" y="4" width="3.4" height="12" rx="0.8" fill="var(--color-accent)" />
              <rect x="13.6" y="12" width="3.4" height="4" rx="0.8" fill="var(--color-muted)" />
            </svg>
          </span>
          <span className="font-serif text-[16px] font-semibold tracking-[-0.01em] text-ink">ThesisForge</span>
        </a>

        <NavLinks />

        <div className="ml-auto flex items-center gap-3 text-[10.5px] text-muted">
          <span className="hidden items-center gap-1.5 sm:flex">
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${cfg.builderId > 0 ? "bg-ok" : "bg-faint"}`} />
            <span className="font-mono">Builder {cfg.builderId > 0 ? `#${cfg.builderId}` : "unset"} · {(cfg.fee / 10).toFixed(1)} bp</span>
          </span>
          <span className="font-mono text-faint">{cfg.network}</span>
        </div>
      </div>
    </header>
  );
}
