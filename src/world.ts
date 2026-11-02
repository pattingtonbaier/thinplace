// Building interiors: an inked room per building, one spot per room.
import { guiser, INK, RED, type GuiserOpts } from "./art";
import { ACTIONS, type BuildingId } from "./content";

// Everything inside is grey ink on paper; red stays for the spot you're standing at.
export function inkify(svg: string, keep: string[] = [RED]): string {
  return svg.replace(/#([0-9a-f]{6})\b/gi, (m, h) => {
    if (keep.some((k) => k.toLowerCase() === m.toLowerCase())) return m;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const y = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
    const v = Math.min(250, Math.round(y * 0.92 + 14));
    const hx = (n: number) => n.toString(16).padStart(2, "0");
    return `#${hx(v)}${hx(v - 2)}${hx(v - 5 < 0 ? 0 : v - 5)}`;
  });
}

// ---------- interiors ----------
const OUTDOOR: BuildingId[] = ["stone-field", "bards-lane", "wildwood", "market-square", "old-roads"];
const WALL: Partial<Record<BuildingId, string>> = { "bothy": "#e9dfcb", "ogham-tower": "#d9d3c7", "forge": "#b9b2a8", "craft-hall": "#e6ded0", "feasting-halls": "#dccdb2", "healing-well": "#d7e0dc", "raven-post": "#d9d6e0" };

export function roomsOf(id: BuildingId): string[] {
  const rooms = [...new Set(ACTIONS.filter((a) => a.building === id && a.id !== "journal").map((a) => a.room))];
  return id === "bothy" ? ["the hearth desk", ...rooms] : rooms;
}

type Prop = "desk" | "cauldron" | "bed" | "well" | "tree" | "pen" | "window" | "shelf" | "broom" | "stones" | "sign" | "steam" | "lectern" | "anvil" | "table" | "tools" | "easel" | "camera" | "kiln" | "bricks" | "lamp" | "harp" | "screen" | "plant" | "board" | "moon" | "chair" | "bottles" | "coins";

function propFor(room: string): Prop {
  const r = room.toLowerCase();
  const m: [string, Prop][] = [["desk", "desk"], ["cauldron", "cauldron"], ["loft", "bed"], ["tobar", "well"], ["whispering", "well"], ["oak", "tree"], ["pen", "pen"], ["window", "window"], ["scriptorium", "shelf"], ["library", "shelf"], ["hearth", "broom"], ["training", "stones"], ["trailhead", "sign"], ["sweat", "steam"], ["subject", "lectern"], ["projects", "anvil"], ["guild", "table"], ["repair", "tools"], ["illuminator", "easel"], ["camera", "camera"], ["kiln", "kiln"], ["bench", "bricks"], ["lamp", "lamp"], ["song", "harp"], ["theatre", "screen"], ["glasshouse", "plant"], ["garden", "plant"], ["long table", "table"], ["restaurant", "table"], ["moot", "table"], ["fidchell", "board"], ["moon", "moon"], ["therapy", "chair"], ["apothecary", "bottles"], ["treasury", "coins"], ["steward", "desk"], ["old roads", "sign"]];
  return m.find(([k]) => r.includes(k))?.[1] ?? "table";
}

const S = (d: string, fill = "none", w = 2.2) => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;

function prop(kind: Prop): string {
  switch (kind) {
    case "desk": return S("M-28 0v-30h56v30M-28 -30h56M-22 -30v-4h20v4", "#8c6a48") + S("M-20 -42h14v8h-14z", "#efe3c6", 1.6) + `<circle cx="16" cy="-38" r="5" fill="#f2b84b" stroke="${INK}" stroke-width="1.6"/>`;
    case "cauldron": return S("M-24 -30q0 30 24 30q24 0 24 -30z", "#3d3935") + S("M-28 -30h56", "none", 3) + `<path d="M-10 -38q4 -10 0 -18M6 -38q4 -10 0 -18" stroke="#9a948c" stroke-width="2" fill="none"/>` + `<path d="M-14 6l-6 6h40l-6 -6" fill="#e8794a" stroke="${INK}" stroke-width="1.6"/>`;
    case "bed": return S("M-34 0v-22h68v22M-34 -10h68", "#b59a63") + S("M-30 -22v-10h18v10", "#efe3c6", 1.8) + S("M-12 -22h44v10h-44z", "#6b4f7a", 1.8);
    case "well": return S("M-22 0v-22q22 -8 44 0v22z", "#b5afa6") + S("M-18 -22v-26M18 -22v-26M-24 -48L0 -60 24 -48z", "#6f6a64") + `<rect x="-4" y="-38" width="8" height="8" fill="#7fc3c7" stroke="${INK}" stroke-width="1.4"/>`;
    case "tree": return S("M0 0v-26", "none", 4) + S("M0 -24q-30 -2 -24 -28q-8 -24 24 -28q30 6 24 28q6 26 -24 28z", "#7f9a7a") + `<path d="M8 -6h14v-12" stroke="#8c6a48" stroke-width="2" fill="none"/>`;
    case "pen": return S("M-34 0v-22M34 0v-22M-34 -14h68M-34 -6h68M-17 0v-22M0 0v-22M17 0v-22", "none", 2) + `<ellipse cx="-6" cy="-6" rx="10" ry="6" fill="#3d3935"/><circle cx="4" cy="-12" r="5" fill="#3d3935"/><circle cx="2" cy="-13" r="1.2" fill="#fbfaf6"/><circle cx="6" cy="-13" r="1.2" fill="#fbfaf6"/>`;
    case "window": return S("M-22 -64h44v40h-44z", "#cfe0e0") + S("M0 -64v40M-22 -44h44", "none", 1.6) + S("M-30 0v-20h60v20", "#8c6a48") + S("M-26 -20q26 -8 52 0", "#6b4f7a", 1.6);
    case "shelf": return S("M-28 0v-64h56v64M-28 -42h56M-28 -20h56", "#8c6a48") + [[-22, -64, "#4f6b86"], [-14, -62, "#a04f3c"], [-6, -64, "#7f9a7a"], [-20, -40, "#d6b26a"], [-10, -42, "#4f6b86"], [6, -40, "#a04f3c"]].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="7" height="20" fill="${c}" stroke="${INK}" stroke-width="1.2"/>`).join("");
    case "broom": return S("M-30 0v-40h36v40", "#a9a29a") + `<path d="M-22 0q10 -24 20 0" fill="#e8794a" stroke="${INK}" stroke-width="1.6"/>` + S("M20 0l6 -54", "none", 3) + S("M14 0l12 -6 8 6z", "#b59a63", 1.6);
    case "stones": return S("M-28 0v-34q6 -8 12 0v34zM-4 0v-48q6 -8 12 0v48zM20 0v-28q6 -8 12 0v28z", "#b5afa6");
    case "sign": return S("M0 0v-50", "none", 3) + S("M-24 -50h40l8 7 -8 7h-40z", "#efe3c6", 1.8) + S("M-20 -32h36l-8 7 8 7h-36z", "#efe3c6", 1.8);
    case "steam": return S("M-30 0v-30h60v30z", "#8c6a48") + `<path d="M-14 -36q-6 -10 0 -18q6 -8 0 -16M2 -36q-6 -10 0 -18q6 -8 0 -16M18 -36q-6 -10 0 -18" stroke="#9a948c" stroke-width="2.2" fill="none"/>`;
    case "lectern": return S("M0 0v-30M-12 0h24M-20 -30l20 -10 20 10z", "#8c6a48") + S("M-16 -36l16 -8 16 8", "#efe3c6", 1.6);
    case "anvil": return S("M-20 0l6 -12h28l6 12zM-24 -12h36q12 0 16 -8h-56z", "#6f6a64") + `<circle cx="22" cy="-30" r="2" fill="${RED}"/><circle cx="28" cy="-36" r="1.6" fill="#f2b84b"/>`;
    case "table": return S("M-34 -24h68M-28 -24v24M28 -24v24", "#8c6a48", 2.6) + `<circle cx="-12" cy="-30" r="5" fill="#efe3c6" stroke="${INK}" stroke-width="1.6"/><path d="M6 -24v-12h8v12" fill="#d6b26a" stroke="${INK}" stroke-width="1.6"/>`;
    case "tools": return S("M-30 -60h60v44h-60z", "#cdbfa6") + S("M-20 -54v30M-24 -54h8M0 -54l6 30M18 -54v26M14 -30h8", "none", 2.2) + S("M-24 0v-16h48v16", "#8c6a48");
    case "easel": return S("M-16 0l12 -60M16 0l-12 -60M0 -60v60", "none", 2.2) + S("M-20 -54h40v30h-40z", "#efe3c6") + `<path d="M-14 -34l8 -10 6 6 8 -12 6 16" fill="none" stroke="#7f9a7a" stroke-width="2"/>`;
    case "camera": return S("M-10 0l10 -30 10 30M0 -30v30", "none", 2) + S("M-18 -46h36v18h-36z", "#3d3935") + `<circle cx="0" cy="-37" r="6" fill="#7fc3c7" stroke="${INK}" stroke-width="1.6"/>`;
    case "kiln": return S("M-26 0v-36q26 -26 52 0v36z", "#c98d6c") + S("M-10 0v-16q10 -8 20 0v16", "#3d3935") + `<path d="M-6 -4h12" stroke="#f2b84b" stroke-width="3"/>`;
    case "bricks": return S("M-30 -20h60M-30 0v-20M30 0v-20", "#8c6a48") + [[-22, "#c4544a"], [-6, "#f2b84b"], [10, "#4f6b86"]].map(([x, c]) => `<rect x="${x}" y="-34" width="12" height="10" fill="${c}" stroke="${INK}" stroke-width="1.4"/><circle cx="${Number(x) + 3}" cy="-36" r="1.8" fill="${c}" stroke="${INK}" stroke-width="1"/><circle cx="${Number(x) + 9}" cy="-36" r="1.8" fill="${c}" stroke="${INK}" stroke-width="1"/>`).join("");
    case "lamp": return S("M0 0v-56", "none", 3) + `<rect x="-7" y="-70" width="14" height="14" rx="2" fill="#f2b84b" stroke="${INK}" stroke-width="2"/>` + `<circle cx="0" cy="-63" r="14" fill="#f2b84b" opacity=".35"/>`;
    case "harp": return S("M-14 0v-50q14 -14 30 0q-10 26 -30 50", "#a07a3c", 2.4) + S("M-8 -46v40M-2 -48v34M4 -48v26M10 -46v16", "none", 1);
    case "screen": return S("M-34 -66h68v44h-68z", "#efe3c6") + `<path d="M-20 -30q8 -22 20 -10q10 -16 22 6" fill="none" stroke="${INK}" stroke-width="2.4"/>` + S("M-26 0v-12h52v12", "#6b4a2e");
    case "plant": return S("M-16 0l4 -18h24l4 18z", "#c98d6c") + S("M0 -18q-20 -14 -12 -34q8 10 12 34M0 -18q20 -14 12 -34q-8 10 -12 34M0 -18v-30", "#7f9a7a", 1.8);
    case "board": return S("M-30 -24h60M-24 -24v24M24 -24v24", "#8c6a48", 2.4) + S("M-20 -34h40v10h-40z", "#efe3c6", 1.6) + `<circle cx="-10" cy="-29" r="3" fill="${INK}"/><circle cx="6" cy="-29" r="3" fill="#fbfaf6" stroke="${INK}"/>`;
    case "moon": return `<circle cx="0" cy="-48" r="16" fill="#f1e7c8" stroke="${INK}" stroke-width="2"/><circle cx="7" cy="-52" r="14" fill="${WALL["healing-well"]}"/>` + S("M-26 0q26 -14 52 0", "#7f9a7a");
    case "chair": return S("M-18 0v-24h36v24M-18 -24v-26q18 -8 36 0v26", "#6b4f7a") + S("M-22 -24h44", "none", 3);
    case "bottles": return S("M-30 0v-50h60v50M-30 -26h60", "#8c6a48") + [[-22, -46, "#9fc27a"], [-8, -46, "#b9a3e0"], [8, -46, "#7fc3c7"], [-16, -22, "#e8794a"], [4, -22, "#9fc27a"]].map(([x, y, c]) => `<path d="M${x} ${Number(y) + 18}v-12l3 -4h4l3 4v12z" fill="${c}" stroke="${INK}" stroke-width="1.3"/>`).join("");
    case "coins": return S("M-26 0v-26h52v26", "#6b4a2e") + [[-12, -30], [0, -34], [12, -30], [-6, -38], [6, -40]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="3" fill="#d6b26a" stroke="${INK}" stroke-width="1.3"/>`).join("");
  }
}

export function interiorSVG(id: BuildingId, selected: number, look: GuiserOpts): string {
  const rooms = roomsOf(id), out = OUTDOOR.includes(id);
  const n = rooms.length, VW = Math.max(400, (n + 1) * 84), gap = VW / (n + 1);
  const wall = out
    ? `<rect width="${VW}" height="150" fill="#dfe6e3"/><path d="M0 150q60 -26 120 -10q70 -30 140 -6q70 -22 140 4q${VW - 400} -10 ${VW - 400} 0v12H0z" fill="#c9d3c4" stroke="${INK}" stroke-width="1.6"/><rect y="150" width="${VW}" height="110" fill="#d6dcc9"/>${[40, 130, 260, 350].map((x) => `<path d="M${x} 230l-3 -8M${x} 230l2 -10M${x} 230l6 -7" stroke="#7f8a6f" stroke-width="1.6"/>`).join("")}`
    : `<rect width="${VW}" height="160" fill="${WALL[id] ?? "#e3ddd2"}"/><path d="M0 26h${VW}${Array.from({ length: Math.ceil(VW / 140) }, (_, i) => `M${60 + i * 140} 0v26`).join("")}" stroke="${INK}" stroke-width="2" opacity=".5"/><rect y="160" width="${VW}" height="100" fill="#cbb48e"/><path d="M0 160h${VW}M0 190h${VW}M0 225h${VW}" stroke="${INK}" stroke-width="1.4" opacity=".35"/>`;
  const props = rooms.map((r, i) => {
    const x = gap * (i + 1), on = i === selected;
    const label = r.replace(/^the /, "");
    return `<g class="prop ${on ? "on" : ""}" role="button" tabindex="0" aria-pressed="${on}" aria-label="${label}" data-act="station" data-arg="${i}" transform="translate(${x.toFixed(0)} 200)">
      ${on ? `<ellipse cx="0" cy="2" rx="40" ry="8" fill="none" stroke="${RED}" stroke-width="2.2"/>` : ""}
      <ellipse cx="0" cy="2" rx="34" ry="6" fill="${INK}" opacity=".12"/><g filter="url(#wob)">${prop(propFor(r))}</g>
      <text y="26" text-anchor="middle" class="prop-name">${label[0].toUpperCase() + label.slice(1)}</text></g>`;
  }).join("");
  const gx = gap * (selected + 1) + (selected === n - 1 ? -46 : 40);
  const hatchDefs = `<defs><pattern id="hatchf" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0 0v6" stroke="#8f8a83" stroke-width="1"/></pattern></defs>`;
  const floor = out ? "" : `<rect y="160" width="${VW}" height="100" fill="url(#hatchf)" opacity=".35"/>`;
  return `<svg class="interior" viewBox="0 92 ${VW} 168" style="width:max(100%, ${VW * 1.1}px)" role="group" aria-label="Inside">${hatchDefs}${inkify(wall)}${floor}${inkify(props)}
    <g class="pl-room" style="transform:translate(${gx.toFixed(0)}px, 214px)"><g transform="scale(.42) translate(-60 -140)">${guiser({ ...look, bare: true })}</g></g></svg>`;
}
