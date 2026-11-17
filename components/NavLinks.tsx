"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Compile" },
  { href: "/gallery", label: "Gallery" },
  { href: "/portfolio", label: "Portfolio" }
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-stretch gap-5 text-[12.5px]">
      {links.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" || pathname.startsWith("/t/") : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative flex items-center border-b-2 px-0.5 py-1 transition-colors ${
              active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
