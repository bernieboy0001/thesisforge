import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-serif/500.css";
import "@fontsource/ibm-plex-serif/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThesisForge — compile a thesis into a tradable index",
  description:
    "Describe a thesis in plain English. ThesisForge pulls SoSoValue data, cites every weight, gates it on risk, and builds a Builder-Code-tagged SoDEX order plan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <Nav />
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-[11.5px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              ThesisForge · research from SoSoValue, execution on SoDEX, every order tagged with the platform Builder
              Code.
            </p>
            <p className="font-mono text-faint">Not investment advice. Orders are simulated unless a signing key is configured.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
