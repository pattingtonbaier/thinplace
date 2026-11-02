// Renders the home-screen icons from the Guiser drawing.
import { guiser, DEFS } from "./src/art";
const sharp = (await import("/home/claude/.npm-global/lib/node_modules/sharp/dist/index.cjs")).default;
const defs = DEFS.replace('<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">', "").replace("</svg>", "");
const g = guiser({ staff: "rowan", satchel: "satchel", bagColor: "#8c5a3c", glowSize: 1.1, bare: true });
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#efece6"/>${defs}<g transform="translate(76 46) scale(3)">${g}</g></svg>`;
for (const n of [192, 512]) await sharp(Buffer.from(svg)).resize(n, n).png().toFile(`public/icon-${n}.png`);
console.log("icons ok");
