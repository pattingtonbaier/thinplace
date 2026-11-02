// Builds the installable app into dist/, plus a single-file preview (dist/preview.html).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
const r = await Bun.build({ entrypoints: ["src/main.ts"], outdir: "dist", naming: "app.js", minify: true, target: "browser" });
if (!r.success) { console.error(r.logs); process.exit(1); }
cpSync("public", "dist", { recursive: true });
cpSync("src/styles.css", "dist/styles.css");
cpSync("index.html", "dist/index.html");

const js = readFileSync("dist/app.js", "utf8").replace(/<\/script/g, "<\\/script");
const css = readFileSync("src/styles.css", "utf8");
const html = readFileSync("index.html", "utf8")
  .replace(/<link rel="manifest"[^>]*>\n/, "")
  .replace(/<link rel="(icon|apple-touch-icon)"[^>]*>\n/g, "")
  .replace('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`)
  .replace('<script type="module" src="app.js"></script>', `<script type="module">${js}</script>`);
writeFileSync("dist/preview.html", html);

// The claude.ai artifact version: the page body only, since the host adds the document skeleton.
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Patrick+Hand+SC&family=Gochi+Hand&family=IBM+Plex+Mono:wght@400;600&display=swap">';
writeFileSync("dist/artifact.html", `<title>Thinplace</title>\n${fonts}\n<style>${css}</style>\n<div id="app"><p style="padding:24px">Opening your Hollow…</p></div>\n<script type="module">${js}</script>\n`);
console.log("built", (js.length / 1024).toFixed(1) + " KB js");
