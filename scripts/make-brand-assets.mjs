// Exports brand raster assets from the gold-source SVGs in public/brand.
// Run: node scripts/make-brand-assets.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const dir = path.join(process.cwd(), "public", "brand");
const read = (f) => fs.readFileSync(path.join(dir, f), "utf8");

const MARK = read("thesisforge-mark.svg");

// The icon declares a 512px box; restate it at the target size so sharp renders
// the real pixel grid instead of upsampling the declared one.
const iconAt = (px) =>
  read("thesisforge-icon.svg").replace(
    /<svg([^>]*)>/,
    (_m, attrs) =>
      `<svg${attrs.replace(/\s(?:width|height)="\d+"/g, "")} width="${px}" height="${px}">`
  );

// Rasterise the 18x18 viewBox at full size (SVG has no intrinsic px size).
const markAt = (px, fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="${px}" height="${px}">
    <rect x="1" y="9" width="3.4" height="7" rx="0.8" fill="${fill[0]}"/>
    <rect x="7.3" y="4" width="3.4" height="12" rx="0.8" fill="${fill[1]}"/>
    <rect x="13.6" y="12" width="3.4" height="4" rx="0.8" fill="${fill[0]}"/>
  </svg>`;

const jobs = [
  ["thesisforge-mark-1024.png", markAt(1024, ["#B0AB9C", "#CEA45D"])],
  ["thesisforge-mark-512.png", markAt(512, ["#B0AB9C", "#CEA45D"])],
  ["thesisforge-mark-ink-1024.png", markAt(1024, ["#13151B", "#CEA45D"])],
  ["thesisforge-icon-1024.png", iconAt(1024)],
  ["thesisforge-icon-512.png", iconAt(512)],
];

for (const [file, svg] of jobs) {
  const out = path.join(dir, file);
  await sharp(Buffer.from(svg), { density: 384 }).png().toFile(out);
  const { size } = fs.statSync(out);
  console.log(`${file}  ${Math.round(size / 1024)} KB`);
}

// app/icon.svg so the browser tab and PWA tile carry the mark.
fs.copyFileSync(path.join(dir, "thesisforge-icon.svg"), path.join(process.cwd(), "app", "icon.svg"));
console.log("app/icon.svg  (favicon)");
void MARK;
