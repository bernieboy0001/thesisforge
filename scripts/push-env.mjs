// Pushes SOSO_API_KEY from .env.local into Vercel production without printing it.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const raw = readFileSync(".env.local", "utf8");
const match = raw.match(/^SOSO_API_KEY=(.+)$/m);
if (!match) {
  console.error("No SOSO_API_KEY line in .env.local");
  process.exit(1);
}
const value = match[1].trim().replace(/^["']|["']$/g, "");
console.log(`key loaded (length ${value.length}); pushing to Vercel production`);

const out = execFileSync(
  "vercel",
  ["env", "add", "SOSO_API_KEY", "production", "--scope", "rerunjago", "--yes"],
  { input: value, encoding: "utf8", shell: true, stdio: ["pipe", "pipe", "pipe"] }
);
console.log(String(out).trim().split("\n").slice(-4).join("\n"));
