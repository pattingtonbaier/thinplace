// Ink drawings, made in code so the art stays light and consistent.
import { EMBERS, GLOWS, HOODS, SATCHELS, type BuildingId, type Ember } from "./content";
import type { Look } from "./engine";

export const INK = "#1e1c1a", PAPER = "#efece6", EYE = "#fbfaf6", RED = "#d2483a";

// Shared filters: a gentle wobble for hand-drawn ink, and a soft blur for glows.
export const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<filter id="wob" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter>
<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="blur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
</defs></svg>`;

export interface GuiserOpts {
  hood?: string;
  trim?: string;
  satchel?: string;
  bagColor?: string;
  staff?: string;
  glow?: string;
  glowSize?: number;
  label?: string;
  bare?: boolean; // without the outer <svg>, for placing inside a scene
}

export function lookToOpts(look: Look, glowSize = 0.8): GuiserOpts {
  const h = HOODS.find((x) => x.id === look.hood) ?? HOODS[0];
  const b = SATCHELS.find((x) => x.id === look.satchel) ?? SATCHELS[0];
  return { hood: h.hood, trim: h.trim, satchel: b.id, bagColor: b.color, staff: look.staff, glow: GLOWS[look.glow] ?? GLOWS.amber, glowSize };
}

// The Scáth, drawn as the Guiser: a hooded ink shade with two plain white eyes.
export function guiser(o: GuiserOpts = {}): string {
  const cx = 60, g = o.glow || GLOWS.amber, gs = o.glowSize ?? 0.8, hood = o.hood || INK, face = "#3d3935";
  let B = "", M = "", F = "";
  B += `<ellipse cx="${cx}" cy="80" rx="${32 * gs}" ry="${42 * gs}" fill="${g}" opacity="${0.16 + (0.2 * Math.min(gs, 1.4)) / 1.4}" filter="url(#blur)"/><ellipse cx="${cx}" cy="139" rx="24" ry="3.4" fill="${INK}" opacity=".13"/>`;
  if (o.staff) {
    const sc = o.staff === "drift" ? "#a7a29a" : o.staff === "crook" ? "#8c6a48" : "#6b4a2e", st = o.staff;
    if (st === "crook") B += `<path d="M${cx + 27} 138L${cx + 31} 40q2 -14 -8 -14q-8 0 -6 8" fill="none" stroke="${sc}" stroke-width="4" stroke-linecap="round"/><circle cx="${cx + 19}" cy="36" r="3.6" fill="#e8d48a" stroke="${INK}" stroke-width="1.4"/>`;
    else B += `<path d="M${cx + 30} 34L${cx + 26} 138" stroke="${sc}" stroke-width="4" stroke-linecap="round"/>`;
    if (st === "rowan") B += `<path d="M${cx + 30} 34q8 -6 10 2q-6 2 -10 -2M${cx + 30} 34q-8 -8 -12 0q6 2 12 0" fill="#7f9a7a" stroke="${INK}" stroke-width="1.2"/><circle cx="${cx + 34}" cy="40" r="2.4" fill="${RED}"/><circle cx="${cx + 37}" cy="37" r="2.4" fill="${RED}"/>`;
    if (st === "ogham") B += `<path d="M${cx + 28} 60h5M${cx + 28} 68h5M${cx + 28} 76h3M${cx + 28} 84h5M${cx + 28} 92h3" stroke="${EYE}" stroke-width="1.6"/><path d="M${cx + 30} 22l5 8 -5 8 -5 -8z" fill="#7fc3c7" stroke="${INK}" stroke-width="1.6"/>`;
    if (st === "lantern") B += `<path d="M${cx + 30} 34q10 0 10 8" fill="none" stroke="${sc}" stroke-width="3" stroke-linecap="round"/><circle cx="${cx + 40}" cy="52" r="10" fill="${g}" opacity=".5" filter="url(#blur)"/><path d="M${cx + 40} 42v3" stroke="${INK}" stroke-width="1.6"/><rect x="${cx + 35}" y="45" width="10" height="13" rx="2" fill="${g}" stroke="${INK}" stroke-width="1.6"/><path d="M${cx + 34} 45h12M${cx + 34} 58h12" stroke="${INK}" stroke-width="1.8"/>`;
    if (st === "drift") B += `<path d="M${cx + 30} 34q-6 -6 -2 -12q6 2 4 10M${cx + 30} 34q8 -4 10 -12" fill="none" stroke="${sc}" stroke-width="3" stroke-linecap="round"/><path d="M${cx + 33} 40q6 6 4 16q-4 -6 -6 -14" fill="${EYE}" stroke="${INK}" stroke-width="1.2"/>`;
  }
  const body = `M${cx} 26C${cx + 22} 28 ${cx + 28} 52 ${cx + 26} 70C${cx + 30} 96 ${cx + 34} 118 ${cx + 30} 128Q${cx} 134 ${cx - 30} 128C${cx - 34} 118 ${cx - 30} 96 ${cx - 26} 70C${cx - 28} 52 ${cx - 22} 28 ${cx} 26Z`;
  M += `<path d="${body}" fill="${hood}"/>`;
  if (hood !== INK) M += `<path d="${body}" fill="none" stroke="${INK}" stroke-width="2.4"/>`;
  if (o.trim) M += `<path d="M${cx - 30} 126Q${cx} 132 ${cx + 30} 126" fill="none" stroke="${o.trim}" stroke-width="4"/><path d="M${cx - 17} 72q17 8 34 0" fill="none" stroke="${o.trim}" stroke-width="3"/>`;
  M += `<path d="M${cx} 22l4 -8" stroke="${hood}" stroke-width="4" stroke-linecap="round"/>`;
  M += `<ellipse cx="${cx}" cy="58" rx="17" ry="19" fill="${face}"/>`;
  M += `<ellipse class="eye" cx="${cx - 7}" cy="58" rx="4.4" ry="5.8" fill="${EYE}"/><ellipse class="eye" cx="${cx + 7}" cy="58" rx="4.4" ry="5.8" fill="${EYE}"/>`;
  M += `<path d="M${cx - 10} 128v8M${cx + 10} 128v8" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M${cx - 14} 136h7M${cx + 7} 136h7" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`;
  M += `<circle cx="${cx - 22}" cy="104" r="4" fill="${INK}"/><circle cx="${cx + 22}" cy="104" r="4" fill="${INK}"/>`;
  if (o.satchel) {
    const bc = o.bagColor || "#8c5a3c", bs = o.satchel;
    F += `<path d="M${cx - 18} 74L${cx + 16} 110" stroke="${bc}" stroke-width="3"/>`;
    if (bs === "satchel") F += `<rect x="${cx + 6}" y="104" width="22" height="17" rx="3" fill="${bc}" stroke="${INK}" stroke-width="1.8"/><path d="M${cx + 6} 104q11 10 22 0v6h-22z" fill="${bc}" stroke="${INK}" stroke-width="1.4"/><rect x="${cx + 15}" y="109" width="4" height="5" fill="#d6b26a" stroke="${INK}" stroke-width="1"/>`;
    if (bs === "sack") F += `<path d="M${cx + 10} 104q-6 4 -4 12q2 8 12 8q10 0 12 -8q2 -8 -4 -12z" fill="${bc}" stroke="${INK}" stroke-width="1.8"/><path d="M${cx + 11} 104q7 -4 14 0" fill="none" stroke="${INK}" stroke-width="1.6"/><path d="M${cx + 14} 101l-2 -5M${cx + 20} 100l1 -5" stroke="#7f9a7a" stroke-width="2"/>`;
    if (bs === "books") F += `<rect x="${cx + 6}" y="104" width="22" height="17" rx="3" fill="${bc}" stroke="${INK}" stroke-width="1.8"/><path d="M${cx + 6} 110h22" stroke="${INK}" stroke-width="1.4"/><rect x="${cx + 10}" y="100" width="6" height="6" fill="#4f6b86" stroke="${INK}" stroke-width="1"/><rect x="${cx + 17}" y="99" width="6" height="7" fill="#a04f3c" stroke="${INK}" stroke-width="1"/>`;
    if (bs === "basket") F += `<path d="M${cx + 6} 106h24l-3 15h-18z" fill="${bc}" stroke="${INK}" stroke-width="1.8"/><path d="M${cx + 8} 111h20M${cx + 9} 116h18M${cx + 12} 106v15M${cx + 18} 106v15M${cx + 24} 106v15" stroke="${INK}" stroke-width=".9" opacity=".6"/><path d="M${cx + 9} 106q9 -14 18 0" fill="none" stroke="${INK}" stroke-width="1.8"/>`;
  }
  const inner = `${B}<g filter="url(#wob)">${M}${F}</g>`;
  if (o.bare) return inner;
  return `<svg viewBox="0 0 120 150" role="img" aria-label="${o.label || "Your Scáth"}">${inner}</svg>`;
}

// The bonfire of seven embers: each log burns brighter as its ember grows, and the fire grows with your level.
export function bonfire(ember: Record<Ember, number>, level: number, opts: { bare?: boolean; labels?: boolean } = {}): string {
  const cx = 100, cy = 112, size = Math.min(1.5, 0.8 + level * 0.04);
  // Seven logs fan out below the flame like spokes; each burns brighter as its ember grows.
  const logs = EMBERS.map((e, i) => {
    const ang = 165 - (i * 150) / 6, rad = (ang * Math.PI) / 180;
    const x1 = cx + Math.cos(rad) * 10, y1 = cy + 14 + Math.sin(rad) * 6;
    const x2 = cx + Math.cos(rad) * 66, y2 = cy + 14 + Math.sin(rad) * 44;
    const v = ember[e.key] ?? 1, heat = v / 10;
    const col = `hsl(${30 - heat * 18} ${40 + heat * 50}% ${30 + heat * 32}%)`;
    const lx = cx + Math.cos(rad) * 84, ly = cy + 18 + Math.sin(rad) * 58;
    const lab = opts.labels ? `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" class="emb-l">${e.name.slice(0, 3)}<tspan class="emb-n" dx="3">${v}</tspan></text>` : "";
    return `<g><path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${col}" stroke-width="7" stroke-linecap="round"/><title>${e.name} ${v}</title></g>${lab}`;
  }).join("");
  const f = (k: number, c: string) => {
    const h = 72 * k * size, w = 28 * k * size, b = cy + 18;
    return `<path d="M${cx} ${b - h}C${cx + w} ${b - h * 0.45} ${cx + w * 1.1} ${b - 8} ${cx} ${b}C${cx - w * 1.1} ${b - 8} ${cx - w} ${b - h * 0.45} ${cx} ${b - h}Z" fill="${c}"/>`;
  };
  const flame = `<g class="flame">${f(1, "#e8794a")}${f(0.7, "#f2b84b")}${f(0.4, "#fbf1c8")}</g>`;
  const glow = `<ellipse cx="${cx}" cy="${cy + 6}" rx="${62 * size}" ry="${50 * size}" fill="#f2b84b" opacity=".28" filter="url(#blur)"/>`;
  const inner = `${glow}<g filter="url(#wob)">${logs}${flame}</g>`;
  if (opts.bare) return inner;
  return `<svg viewBox="0 ${opts.labels ? 10 : 20} 200 ${opts.labels ? 210 : 180}" role="img" aria-label="Your bonfire of seven embers">${inner}</svg>`;
}

const s = (d: string, fill = "none", w = 2.2) => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;

// One small ink diorama per building, about 64 units wide, anchored at its base centre.
export function buildingArt(id: BuildingId): string {
  switch (id) {
    case "bothy":
      return `<path d="M-6 -78q4 -10 -2 -18q8 6 4 18" fill="none" stroke="#9a948c" stroke-width="2" opacity=".7"/><path d="M4 -86q6 -8 0 -16q8 4 6 16" fill="none" stroke="#9a948c" stroke-width="2" opacity=".55"/>`
        + s("M-34 0v-34h68v34z", "#e9e4da") + s("M-40 -32Q0 -74 40 -32q-40 6 -80 0z", "#b59a63") + s("M-30 -40q30 -10 60 0M-22 -50q22 -8 44 0", "none", 1.2)
        + s("M8 -62v-20h10v14", "#8a8580") + s("M-8 0v-20q8 -8 16 0v20", "#6b4a2e") + `<rect x="16" y="-26" width="12" height="11" fill="#f2b84b" stroke="${INK}" stroke-width="2"/><path d="M22 -26v11M16 -20.5h12" stroke="${INK}" stroke-width="1.2"/>`;
    case "stone-field":
      return s("M-30 0v-34q6 -8 12 0v34z", "#b5afa6") + s("M-6 0v-48q6 -8 12 0v48z", "#a7a29a") + s("M18 0v-30q6 -8 12 0v30z", "#b5afa6") + s("M-38 0h76", "none", 2.4) + s("M-2 -30h4M22 -18h4", "none", 1.2);
    case "ogham-tower":
      return s("M-12 0v-70h24v70z", "#cfc8bd") + s("M-14 -70l14 -26 14 26z", "#6f6a64") + s("M-3 0v-14h6v14z", "#6b4a2e") + `<rect x="-3" y="-52" width="6" height="9" fill="#f2b84b" stroke="${INK}" stroke-width="1.6"/>` + s("M14 -14h5M14 -22h5M14 -30h3M14 -38h5", "none", 1.4);
    case "forge":
      return s("M-30 0v-26h52v26z", "#a9a29a") + s("M-36 -24l32 -16 32 16z", "#6f6a64") + s("M12 -40v-16h10v24", "#8a8580") + `<circle cx="17" cy="-64" r="2" fill="${RED}"/><circle cx="22" cy="-70" r="1.6" fill="#f2b84b"/>` + s("M-20 0v-14h14v14", "#3d3935") + `<path d="M-17 -6h8" stroke="#f2b84b" stroke-width="3"/>` + s("M28 0v-8h12v-4h-16v4h4", "#6f6a64", 1.6);
    case "craft-hall":
      return s("M-36 0v-30h72v30z", "#e3ddd2") + s("M-40 -28L0 -52 40 -28z", "#8c4a2f") + s("M-22 -8v-14h44v14z", "#cfe0e0") + s("M-11 -22v14M0 -22v14M11 -22v14", "none", 1.2) + s("M-4 0v-6h8v6", "#6b4a2e");
    case "bards-lane":
      return [-24, 0, 24].map((x, i) => s(`M${x} 0v-${44 - i * 4}`, "none", 2.4) + `<rect x="${x - 6}" y="-${54 - i * 4}" width="12" height="11" rx="2" fill="#f2b84b" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="-${48 - i * 4}" r="10" fill="#f2b84b" opacity=".35" filter="url(#blur2)"/>`).join("") + s("M-34 0h68", "none", 2.2);
    case "wildwood":
      return s("M-26 0v-12M-26 -12q-14 -2 -10 -16q-6 -14 10 -18q16 4 10 18q4 14 -10 16z", "#7f9a7a") + s("M4 0v-10M4 -10q-16 -2 -12 -20q-4 -16 12 -20q18 4 12 20q4 18 -12 20z", "#6b8a6a") + s("M18 0v-18l10 -8 10 8v18z", "#d7e6df", 1.8) + s("M28 -26v26M18 -9h20", "none", 1);
    case "feasting-halls":
      return s("M-38 0v-28h76v28z", "#d6c9b0") + s("M-42 -26L0 -48 42 -26z", "#5a3f33") + s("M-6 0v-16q6 -6 12 0v16", "#6b4a2e") + `<path d="M-30 -36v-22l12 5-12 5" fill="${RED}" stroke="${INK}" stroke-width="1.4"/>` + `<rect x="-30" y="-20" width="10" height="9" fill="#f2b84b" stroke="${INK}" stroke-width="1.6"/><rect x="20" y="-20" width="10" height="9" fill="#f2b84b" stroke="${INK}" stroke-width="1.6"/>`;
    case "market-square":
      return [-22, 10].map((x) => s(`M${x - 12} 0v-22M${x + 12} 0v-22`, "none", 2) + s(`M${x - 16} -22l4 -10h24l4 10z`, x < 0 ? "#c98d6c" : "#7f9a7a") + s(`M${x - 12} -10h24v6h-24z`, "#e9e4da", 1.6)).join("");
    case "healing-well":
      return s("M-22 0v-14q22 -8 44 0v14z", "#b5afa6") + s("M-18 -14v-24M18 -14v-24M-24 -38L0 -50 24 -38z", "#6f6a64") + s("M0 -38v12", "none", 1.4) + `<rect x="-4" y="-26" width="8" height="7" fill="#7fc3c7" stroke="${INK}" stroke-width="1.4"/>`;
    case "raven-post":
      return s("M-16 0v-44h32v44z", "#cfc8bd") + s("M-20 -44L0 -60 20 -44z", "#2d3550") + s("M-6 -22h12v10h-12z", "#efe3c6", 1.6) + s("M-6 -22l6 6 6 -6", "none", 1.2) + `<path d="M4 -66q2 -8 10 -8q4 0 6 4l5 1 -5 2q-2 6 -9 6q-5 0 -7 -5z" fill="${INK}"/><circle cx="15" cy="-70" r="1.2" fill="${EYE}"/>`;
    default:
      return "";
  }
}

// Where each building sits around the bonfire, in a portrait 400 x 560 village.
export const PLOTS: Record<string, [number, number]> = {
  "bothy": [200, 452],
  "stone-field": [80, 380],
  "ogham-tower": [322, 362],
  "forge": [88, 262],
  "craft-hall": [314, 252],
  "bards-lane": [200, 178],
  "wildwood": [74, 156],
  "feasting-halls": [328, 140],
  "market-square": [198, 92],
  "healing-well": [60, 506],
  "raven-post": [342, 498],
};
export const FIRE_AT: [number, number] = [200, 318];
