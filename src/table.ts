// The working table at the hearth desk, drawn front-on like a dom2d desk: the wall of pinned things
// above, the table below, lit by one candle. Every object is a function you tap.
// Grey ink on stone and paper; red only for flame, wax, the ribbon and "you are here".
import { BUILDINGS, type BuildingId } from "./content";
import { PLOT, riverX } from "./iso";

type Pt = [number, number];
type C = CanvasRenderingContext2D;
const INK = "#1e1c1a", RED = "#d2483a", WHITE = "#f7f5f1";
const W = 1000, H = 1000;
const FELL = "'IM Fell English', Georgia, 'Times New Roman', serif";
const FELL_SC = "'IM Fell English SC', 'IM Fell English', Georgia, serif";

export type TableData = {
  dateLabel: string;
  day: { name: string }[]; // today's logs, oldest first
  journal: string | null; // tonight's entry, if written
  notches: number; // habit days kept, recently
  moons: boolean[]; // the last 28 nights, oldest first; true when you came to the desk
  found: BuildingId[];
  stones: number[]; // ember values, in EMBERS order
  hot: number; // index of the stone to ring in red (-1 for none)
  flask: number; // 0..1, how far into this level
  jars: string[]; // labels for filled jars
  sealed: boolean; // a cairn letter waits
  prompt: string;
  candle: number; // 0..1 of the day left
  notes: boolean; // a slip of reminders is pinned up
  labels: boolean;
  look: { hood: string };
};

export type Spot = { id: string; label: string; r: [number, number, number, number] };
// Where each object sits on the 1000 × 1000 table, for taps.
export const SPOTS: Spot[] = [
  { id: "log", label: "Mortar and pestle: log what you did", r: [846, 560, 960, 716] },
  { id: "day", label: "Day-book: today's logs", r: [248, 786, 470, 944] },
  { id: "journal", label: "Journal page: tonight's entry", r: [474, 786, 694, 944] },
  { id: "quill", label: "Quill and ink: write tonight's entry", r: [712, 604, 830, 792] },
  { id: "tally", label: "Tally stick: your habits", r: [36, 796, 262, 868] },
  { id: "embers", label: "Ember flask: your embers and level", r: [366, 466, 540, 716] },
  { id: "stones", label: "Ember-stones: each ember", r: [498, 676, 624, 724] },
  { id: "candle", label: "Candle: how much of the day is left", r: [60, 500, 176, 704] },
  { id: "moons", label: "Moon-strip: the nights you came", r: [146, 96, 304, 272] },
  { id: "prompt", label: "Birch bark: tonight's folklore prompt", r: [156, 300, 302, 410] },
  { id: "map", label: "Map of the Hollow: back out to walk", r: [318, 70, 664, 462] },
  { id: "relics", label: "Relic jars", r: [690, 186, 964, 318] },
  { id: "bag", label: "Crane bag: pack a backup", r: [888, 362, 992, 538] },
  { id: "bowl", label: "Scrying bowl: change your look", r: [840, 796, 972, 852] },
  { id: "cairn", label: "Sealed scroll: your cairn letter", r: [34, 878, 192, 934] },
  { id: "book", label: "Field Book: places you've found", r: [174, 670, 342, 748] },
  { id: "key", label: "Iron key: the rules of the house", r: [898, 904, 990, 946] },
  { id: "notes", label: "A slip of reminders", r: [18, 296, 142, 404] },
];

let c: C;
const h2 = (a: number, b: number) => { let x = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const jit = (x: number, y: number, a = 1.6): Pt => [x + (h2(x * 7, y * 3) - 0.5) * a, y + (h2(y * 5 + 3, x * 11) - 0.5) * a];
function path(pts: Pt[], close = true) { c.beginPath(); pts.forEach(([x, y], k) => { const [a, b] = jit(x, y); k ? c.lineTo(a, b) : c.moveTo(a, b); }); if (close) c.closePath(); }
function poly(pts: Pt[], fill: string | null, lw = 3, col = INK) { path(pts); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = col; c.lineJoin = "round"; c.stroke(); } }
function line(pts: Pt[], lw = 2, col = INK) { path(pts, false); c.lineWidth = lw; c.strokeStyle = col; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(); }
function clipTo(pts: Pt[], fn: () => void) { c.save(); c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip(); fn(); c.restore(); }
function hatch(pts: Pt[], gap = 5, col = "#8b867f", lw = 1.1, slope = 1) {
  clipTo(pts, () => {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs) - 400, x1 = Math.max(...xs) + 400, y0 = Math.min(...ys), y1 = Math.max(...ys);
    c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); for (let x = x0; x < x1; x += gap) { c.moveTo(x, y1); c.lineTo(x + (y1 - y0) * slope, y0); } c.stroke();
  });
}
function ell(x: number, y: number, rx: number, ry: number, fill: string | null, lw = 0, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); } }
function rect(x: number, y: number, w: number, h: number, rot = 0): Pt[] {
  const cx = x + w / 2, cy = y + h / 2, cs = Math.cos(rot), sn = Math.sin(rot);
  return ([[x, y], [x + w, y], [x + w, y + h], [x, y + h]] as Pt[]).map(([px, py]) => [cx + (px - cx) * cs - (py - cy) * sn, cy + (px - cx) * sn + (py - cy) * cs] as Pt);
}
function text(s: string, x: number, y: number, size = 14, col = INK, align: CanvasTextAlign = "center", font = FELL) { c.font = `${size}px ${font}`; c.fillStyle = col; c.textAlign = align; c.textBaseline = "middle"; c.fillText(s, x, y); }
function itext(s: string, x: number, y: number, size = 14, col = INK, align: CanvasTextAlign = "left", maxW = 0) {
  c.font = `italic ${size}px ${FELL}`; c.fillStyle = col; c.textAlign = align; c.textBaseline = "alphabetic";
  if (maxW) { while (c.measureText(s).width > maxW && s.length > 3) s = s.slice(0, -2) + "…"; }
  c.fillText(s, x, y);
}
function scribble(x: number, y: number, w: number, rows: number, gap = 12, col = "#5f5b55") {
  for (let r = 0; r < rows; r++) { const ww = w * (0.55 + h2(r, x) * 0.45); const pts: Pt[] = []; for (let u = 0; u <= ww; u += 6) pts.push([x + u, y + r * gap + Math.sin(u * 0.6 + r) * 1.4]); line(pts, 1.4, col); }
}
function pin(x: number, y: number) { ell(x + 2, y + 3, 5, 3, "rgba(30,28,26,.25)"); ell(x, y, 5.5, 5.5, "#5f5b55", 1.6); ell(x - 1.5, y - 1.5, 1.6, 1.6, "#cfcac2"); }
function shadow(x: number, y: number, rx: number, ry = 8) { ell(x + 10, y + 3, rx, ry, "rgba(30,28,26,.3)"); }
function wrap(s: string, max: number, size: number): string[] {
  c.font = `italic ${size}px ${FELL}`; const out: string[] = []; let cur = "";
  for (const w of s.split(/\s+/)) { const t = cur ? cur + " " + w : w; if (c.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur); return out;
}
function ogham(x: number, y: number, len: number, seed: number, vertical = false, col = "#3d3934") {
  if (vertical) line([[x, y], [x, y + len]], 1.4, col); else line([[x, y], [x + len, y]], 1.4, col);
  for (let k = 0, t = 6; t < len - 4; k++) {
    const n = 1 + Math.floor(h2(seed, k) * 4), side = Math.floor(h2(k, seed) * 3) - 1;
    for (let q = 0; q < n; q++, t += 3) {
      if (vertical) line([[x - (side >= 0 ? 6 : 0), y + t], [x + (side <= 0 ? 6 : 0), y + t]], 1.2, col);
      else line([[x + t, y - (side >= 0 ? 6 : 0)], [x + t, y + (side <= 0 ? 6 : 0)]], 1.2, col);
    }
    t += 5;
  }
}
function label(s: string, x: number, y: number, on: boolean) {
  if (!on) return;
  c.font = `15px ${FELL_SC}`; const w = c.measureText(s).width + 18;
  poly(rect(x - w / 2, y - 12, w, 24, -0.02), WHITE, 2); text(s, x, y + 1, 15, INK, "center", FELL_SC);
}
export function flameAt(cc: C, x: number, y: number, s = 1, t = 0) {
  c = cc;
  const fl = 1 + Math.sin(t * 7 + x) * 0.06 + Math.sin(t * 13 + y) * 0.03;
  const f = (k: number, col: string) => { const hh = 30 * k * s * fl, w = 9 * k * s; c.beginPath(); c.moveTo(x + Math.sin(t * 3) * 1.2 * s, y - hh); c.bezierCurveTo(x + w, y - hh * 0.45, x + w * 1.1, y - 2, x, y); c.bezierCurveTo(x - w * 1.1, y - 2, x - w, y - hh * 0.45, x + Math.sin(t * 3) * 1.2 * s, y - hh); c.fillStyle = col; c.fill(); };
  c.globalAlpha = 0.14; ell(x, y - 14 * s, 44 * s, 40 * s, RED); c.globalAlpha = 1;
  f(1, RED); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke(); f(0.6, "#ec9a8f"); f(0.28, "#fbf1e8");
}

// ---------- the still life: everything that doesn't move ----------
export function drawTable(cc: C, d: TableData) {
  c = cc;
  const L = d.labels;
  // the wall: old stone under worn lime
  c.fillStyle = "#aaa49b"; c.fillRect(0, 0, W, H);
  for (let r = 0; r < 22; r++) for (let q = 0; q < 12; q++) {
    const y = 64 + r * 26, x = q * 92 + (r % 2) * 46 - 20, w = 70 + h2(r, q) * 26;
    if (h2(q, r * 3) < 0.55) continue;
    poly([[x, y], [x + w, y + 2], [x + w - 2, y + 22], [x + 2, y + 20]], "#9d978e", 1.2, "#6d6862");
  }
  for (let k = 0; k < 1800; k++) { c.fillStyle = `rgba(30,28,26,${0.05 + h2(k, 3) * 0.06})`; c.fillRect(h2(k, 1) * W, h2(k, 2) * 610, 1.5, 1.5); }
  const gl = c.createRadialGradient(150, 560, 10, 150, 560, 520); gl.addColorStop(0, "rgba(247,240,228,.55)"); gl.addColorStop(1, "rgba(247,240,228,0)"); c.fillStyle = gl; c.fillRect(0, 0, W, H);
  const vg = c.createRadialGradient(W / 2, 470, 260, W / 2, 470, 760); vg.addColorStop(0, "rgba(30,26,22,0)"); vg.addColorStop(1, "rgba(30,26,22,.5)"); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  c.globalAlpha = 0.45; c.setLineDash([6, 4]); ell(905, 470, 46, 46, null, 0); c.lineWidth = 1.6; c.strokeStyle = "#efebe3"; c.stroke(); c.setLineDash([]);
  line([[905, 424], [880, 506], [944, 456], [866, 456], [930, 506], [905, 424]], 1.6, "#efebe3"); c.globalAlpha = 1;

  // the beam
  { const B: Pt[] = [[0, 18], [W, 26], [W, 60], [0, 52]]; poly(B, "#6f6b65", 3); hatch(B, 4, "#3d3934", 1, 0.08); for (const x of [120, 470, 820]) { line([[x, 40], [x + 5, 44]], 3); ell(x, 40, 3, 3, "#3a3733"); } }

  // Brigid's cross, nailed up for the year
  {
    c.save(); c.translate(80, 140); c.rotate(0.12);
    for (const [dx, dy, w, h] of [[-6, -46, 12, 92], [-46, -6, 92, 12]] as [number, number, number, number][]) { poly([[dx, dy], [dx + w, dy], [dx + w, dy + h], [dx, dy + h]], "#d7d0c1", 1.8); for (let k = 3; k < Math.max(w, h); k += 5) w > h ? line([[dx + k, dy + 1], [dx + k, dy + h - 1]], 0.8, "#8f897d") : line([[dx + 1, dy + k], [dx + w - 1, dy + k]], 0.8, "#8f897d"); }
    poly([[-12, -12], [12, -12], [12, 12], [-12, 12]], "#cfc6b2", 2); for (let k = -8; k <= 8; k += 4) line([[-12, k], [12, k]], 0.8, "#8f897d");
    c.restore(); pin(80, 140);
  }

  // a slip of reminders, only when there's something to do
  if (d.notes) {
    const N = rect(24, 304, 112, 92, -0.06);
    c.save(); c.translate(4, 6); poly(N, "rgba(30,28,26,.25)", 0); c.restore();
    poly(N, "#efe8da", 2.2); pin(80, 312); ell(44, 338, 5, 5, RED); scribble(54, 336, 70, 4, 14, "#3d3934");
    label("reminders", 80, 420, L);
  }

  // the moon-strip: a dark moon for each night you came to the desk
  {
    const S = rect(150, 100, 150, 168, -0.02);
    c.save(); c.translate(5, 7); poly(S, "rgba(30,28,26,.25)", 0); c.restore();
    poly(S, "#e6dfcf", 2.4); pin(225, 110);
    text("the last four weeks", 225, 130, 13, INK, "center", FELL);
    const n = d.moons.length;
    for (let k = 0; k < 28; k++) {
      const r = Math.floor(k / 7), q = k % 7, x = 168 + q * 19, y = 156 + r * 26, idx = k - (28 - n);
      const kept = idx >= 0 && d.moons[idx];
      ell(x, y, 7, 7, kept ? "#3a3733" : null, 1.3);
      if (k === 27) { ell(x, y, 10, 10, null); c.strokeStyle = RED; c.lineWidth = 1.6; c.stroke(); }
    }
    label("moon-strip", 225, 288, L);
  }

  // the map of the Hollow on a hide laced to a hazel frame; it fills in as you find places
  {
    const fx0 = 330, fy0 = 82, fx1 = 650, fy1 = 450;
    for (const [a, b] of [[[fx0 - 14, fy0], [fx1 + 14, fy0 + 4]], [[fx0 - 14, fy1], [fx1 + 14, fy1 - 4]], [[fx0, fy0 - 14], [fx0 + 4, fy1 + 14]], [[fx1, fy0 - 12], [fx1 - 4, fy1 + 14]]] as [Pt, Pt][]) { line([a, b], 9); line([a, b], 5.5, "#8d7a62"); }
    for (const [x, y] of [[fx0, fy0], [fx1, fy0 + 2], [fx0 + 2, fy1], [fx1 - 2, fy1 - 2]] as Pt[]) for (let k = -2; k <= 2; k++) line([[x - 7, y + k * 3 - 4], [x + 7, y + k * 3 + 4]], 1.4, "#3d3934");
    const hide: Pt[] = [[355, 108], [420, 100], [500, 104], [575, 98], [628, 112], [632, 190], [624, 280], [630, 370], [618, 428], [540, 432], [470, 426], [400, 432], [350, 424], [356, 340], [348, 250], [358, 170]];
    c.save(); c.translate(6, 8); poly(hide, "rgba(30,28,26,.25)", 0); c.restore();
    poly(hide, "#e3d9c6", 2.6);
    for (const [x, y] of hide) { const tx = x < 400 ? fx0 : x > 600 ? fx1 : x, ty = y < 140 ? fy0 : y > 400 ? fy1 : y; if (tx !== x || ty !== y) line([[x, y], [tx, ty]], 1.2, "#5f5b55"); }
    const mx = (i: number) => 370 + (i / 36) * 240, my = (j: number) => 160 + (j / 36) * 250;
    clipTo(hide, () => {
      for (let k = 0; k < 700; k++) { c.fillStyle = `rgba(110,90,60,${0.05 + h2(k, 3) * 0.06})`; c.fillRect(340 + h2(k, 9) * 300, 96 + h2(k, 8) * 340, 2.4, 2.4); }
      for (let k = 0; k < 64; k++) {
        const e = k % 4, u = h2(k, 4);
        const x = e < 2 ? 370 + u * 240 : e === 2 ? 364 + h2(k, 6) * 18 : 600 + h2(k, 6) * 22;
        const y = e === 0 ? 150 + h2(k, 5) * 14 : e === 1 ? 408 + h2(k, 5) * 16 : 160 + u * 250;
        poly([[x, y - 11], [x - 5, y + 2], [x + 5, y + 2]], h2(k, 7) < 0.55 ? "#5f5b55" : "#e3d9c6", 1.2);
      }
      const river: Pt[] = []; for (let j = 0; j <= 36; j += 1.5) river.push([mx(riverX(j)), my(j)]);
      line(river, 12, "#a59c8c"); line(river.map(([x, y]) => [x - 7, y] as Pt), 1.4); line(river.map(([x, y]) => [x + 7, y] as Pt), 1.4);
      const bx = mx(riverX(18)), by = my(18.5); poly(rect(bx - 14, by - 4, 28, 9), "#e3d9c6", 1.4);
      const found = BUILDINGS.filter((b) => d.found.includes(b.id) && PLOT[b.id]);
      // the palisade, around what you've found
      const pts = found.map((b) => [mx(PLOT[b.id][0] + 1), my(PLOT[b.id][1] + 1)] as Pt);
      const cx0 = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy0 = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      const rx = Math.max(40, ...pts.map((p) => Math.abs(p[0] - cx0) + 26)), ry = Math.max(34, ...pts.map((p) => Math.abs(p[1] - cy0) + 24));
      for (let a = 0; a < Math.PI * 2; a += 0.13) { if (Math.abs(a - 0.4) < 0.12) continue; const x = cx0 + Math.cos(a) * rx, y = cy0 + Math.sin(a) * ry; line([[x, y + 3], [x, y - 4]], 1.5); }
      const home = PLOT["bothy"];
      c.setLineDash([3, 5]); for (const p of pts) line([[mx(home[0] + 1), my(home[1] + 1)], p], 1.2, "#4f4b45"); c.setLineDash([]);
      const house = (x: number, y: number, s = 1) => { poly([[x - 8 * s, y], [x + 8 * s, y], [x + 8 * s, y - 9 * s], [x, y - 16 * s], [x - 8 * s, y - 9 * s]], "#efe8da", 1.5); hatch([[x - 8 * s, y - 9 * s], [x, y - 16 * s], [x + 8 * s, y - 9 * s]], 2.4, "#4f4b45", 0.8); };
      for (const b of BUILDINGS) {
        if (!PLOT[b.id]) continue;
        const x = mx(PLOT[b.id][0] + 1), y = my(PLOT[b.id][1] + 1);
        if (d.found.includes(b.id)) { house(x, y + 6, b.id === "bothy" ? 1.3 : 1); itext(b.name.replace(/^(The|Your) /, ""), x, y + 20, 11, "#3d3934", "center"); }
        else { c.setLineDash([2, 4]); ell(x, y, 13, 9, null, 1); c.setLineDash([]); text("?", x, y + 1, 12, "#7d7871"); }
      }
      const hx = mx(home[0] + 1) + 14, hy = my(home[1] + 1) - 4;
      ell(hx, hy, 5, 5, RED); line([[hx - 5, hy - 5], [hx + 5, hy + 5]], 2, RED); line([[hx + 5, hy - 5], [hx - 5, hy + 5]], 2, RED);
      text("The Hollow", 490, 128, 26, INK, "center", FELL_SC);
      ogham(410, 144, 160, 7);
      const cx = 600, cy = 404; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; poly([[cx, cy], [cx + Math.cos(a - 0.3) * 6, cy + Math.sin(a - 0.3) * 6], [cx + Math.cos(a) * 16, cy + Math.sin(a) * 16]], k % 2 ? "#e3d9c6" : INK, 1); }
    });
    label("map of the Hollow", 490, 472, L);
  }

  // tonight's prompt, on birch bark pinned with a thorn
  {
    const Bk = rect(160, 312, 138, 92, 0.05);
    c.save(); c.translate(5, 6); poly(Bk, "rgba(30,28,26,.25)", 0); c.restore();
    poly(Bk, "#ece7dc", 2.2);
    for (let k = 0; k < 7; k++) { const y = 322 + k * 12 + h2(k, 2) * 6, x = 170 + h2(k, 3) * 90; line([[x, y], [x + 12 + h2(k, 5) * 14, y + 1]], 2, "#5f5b55"); }
    ogham(176, 334, 104, 3);
    wrap(d.prompt, 112, 12).slice(0, 4).forEach((ln, k) => itext(ln, 174, 356 + k * 14, 12, "#3d3934"));
    line([[229, 306], [233, 322]], 2.2); poly([[226, 304], [232, 300], [234, 310]], "#5f5b55", 1);
    label("tonight's prompt", 230, 424, L);
  }

  // the relic shelf: what you carry, in stoppered jars
  {
    const sy = 300;
    poly([[690, sy], [960, sy - 4], [962, sy + 12], [690, sy + 16]], "#8d7a62", 2.4); hatch([[690, sy], [960, sy - 4], [962, sy + 12], [690, sy + 16]], 4, "#5f5040", 1, 0.1);
    for (const x of [714, 934]) poly([[x - 6, sy + 14], [x + 6, sy + 14], [x + 2, sy + 40], [x - 2, sy + 40]], "#6f6b65", 1.8);
    const fills = [
      (x: number) => { for (let k = 0; k < 10; k++) ell(x - 16 + h2(k, 1) * 32, sy - 6 - h2(k, 2) * 30, 5, 3, "#cfcac2", 1); },
      (x: number) => { for (let k = 0; k < 16; k++) ell(x - 20 + h2(k, 4) * 40, sy - 6 - h2(k, 5) * 40, 4, 4, "#8d887f", 1.1); },
      (x: number) => { for (let k = 0; k < 4; k++) line([[x - 14 + k * 7, sy - 6], [x - 10 + k * 6, sy - 40]], 2.4, "#3a3733"); },
      (x: number) => { for (let k = 0; k < 6; k++) ell(x - 12 + h2(k, 8) * 24, sy - 8 - h2(k, 9) * 30, 6, 4, "#e3dfd8", 1); },
    ];
    const jar = (x: number, w: number, h: number, name: string | null, k: number) => {
      const y = sy;
      shadow(x, y - 2, w * 0.5, 3);
      poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2 + 2, y - h * 0.8], [x + w / 2 - 4, y - h], [x - w / 2 + 4, y - h], [x - w / 2 - 2, y - h * 0.8]], name ? "rgba(225,230,229,.55)" : "rgba(230,232,230,.3)", 2);
      if (name) clipTo([[x - w / 2, y], [x + w / 2, y], [x + w / 2, y - h * 0.8], [x - w / 2, y - h * 0.8]], () => fills[k % 4](x));
      poly([[x - w / 2 + 6, y - h], [x + w / 2 - 6, y - h], [x + w / 2 - 8, y - h - 12], [x - w / 2 + 8, y - h - 12]], name ? "#b8a98f" : "#d6cfc0", 1.8);
      if (name) { poly(rect(x - w / 2 + 3, y - h * 0.55, w - 6, 16, 0.02), "#efe8da", 1.2); itext(name, x, y - h * 0.55 + 12, 11, INK, "center", w - 8); }
      else { c.setLineDash([2, 3]); poly(rect(x - w / 2 + 4, y - h * 0.55, w - 8, 16, 0), null, 1, "#8d887f"); c.setLineDash([]); }
      line([[x - w / 2 + 4, y - h * 0.75], [x - w / 2 + 4, y - 10]], 2, "rgba(247,245,241,.8)");
    };
    const slots: [number, number, number][] = [[748, 46, 70], [806, 52, 92], [862, 40, 62], [914, 40, 76]];
    slots.forEach(([x, w, h], k) => jar(x, w, h, d.jars[k] ?? null, k));
    label("relic jars", 830, 340, L);
    // the crane-skin bag
    line([[930, 372], [950, 368]], 6); ell(930, 372, 5, 5, "#5f5b55", 1.6);
    line([[938, 374], [912, 420]], 1.4); line([[942, 374], [966, 420]], 1.4);
    const bag: Pt[] = [[906, 420], [972, 420], [984, 470], [972, 520], [938, 534], [902, 518], [894, 470]];
    poly(bag, "#cfcac2", 2.6);
    clipTo(bag, () => { for (let r = 0; r < 8; r++) for (let q = 0; q < 6; q++) { const x = 898 + q * 15 + (r % 2) * 7, y = 428 + r * 14; line([[x - 6, y], [x, y + 6], [x + 6, y]], 1.1, "#8d887f"); } });
    line([[898, 430], [980, 430]], 2.2);
    label("crane bag", 938, 556, L);
  }

  // herbs drying from the beam, and the hagstone
  {
    const bundle = (x: number, len: number, kind: number) => {
      line([[x, 50], [x, 70]], 1.4);
      poly([[x - 7, 70], [x + 7, 70], [x + 5, 78], [x - 5, 78]], "#cfcac2", 1.6);
      for (let k = -6; k <= 6; k++) {
        const ex = x + k * 5, ey = 78 + len * (0.75 + h2(k, x) * 0.3);
        line([[x + k, 78], [ex, ey]], 1.3, "#5f5b55");
        for (let t = 0.3; t < 1; t += 0.18) { const px = x + k + (ex - x - k) * t, py = 78 + (ey - 78) * t; if (kind === 0) poly([[px, py], [px - 9, py - 6], [px - 3, py + 1]], "#8d887f", 0.9); else if (kind === 1) ell(px + 2, py, 3.4, 2.4, "#cfcac2", 1); else poly([[px, py], [px + 8, py - 7], [px + 3, py + 1]], "#6f6b65", 0.9); }
      }
    };
    bundle(700, 110, 0); bundle(752, 84, 1); bundle(960, 120, 2); bundle(300, 70, 1);
    line([[870, 56], [870, 140]], 1.4); ell(870, 158, 20, 19, "#cfcac2", 2.4); ell(873, 156, 7, 8, "#5f5b55", 1.6);
  }

  // the table
  {
    const top: Pt[] = [[0, 600], [W, 600], [W, 945], [0, 945]];
    poly(top, "#9d968b", 0);
    for (let y = 616; y < 945; y += 40) { const pts: Pt[] = []; for (let x = 0; x <= W; x += 20) pts.push([x, y + Math.sin(x / 80 + y) * 1.6]); line(pts, 1.3, "#6d6862"); }
    for (let k = 0; k < 40; k++) { const x = h2(k, 21) * W, y = 616 + h2(k, 22) * 320; line([[x, y], [x + 30 + h2(k, 23) * 70, y + 1]], 0.8, "#7d7871"); }
    ell(120, 900, 14, 5, null, 1.2); ell(120, 900, 6, 2, null, 1);
    // ink spatters build up with the nights you've written
    const nights = d.moons.filter(Boolean).length;
    for (let k = 0; k < Math.min(14, nights); k++) ell(620 + h2(k, 31) * 120, 900 + h2(k, 32) * 36, 2 + h2(k, 33) * 6, 1.5 + h2(k, 34) * 3, "rgba(30,28,26,.35)");
    line([[0, 600], [W, 600]], 3);
    poly([[0, 945], [W, 945], [W, H], [0, H]], "#5f5b55", 3); hatch([[0, 945], [W, 945], [W, H], [0, H]], 5, "#2a2724");
  }

  // the candle: burns down through the day, notched by the hour
  {
    const x = 110, base = 690, hgt = 18 + 86 * Math.max(0, Math.min(1, d.candle));
    shadow(x, base + 8, 46, 8);
    ell(x, base, 40, 10, "#5f5b55", 2.4); poly([[x - 6, base - 6], [x + 6, base - 6], [x + 5, base - 26], [x - 5, base - 26]], "#3a3733", 2);
    c.lineWidth = 4; c.strokeStyle = INK; c.beginPath(); c.arc(x + 44, base - 12, 12, -1.6, 1.4); c.stroke();
    ell(x, base - 26, 22, 6, "#5f5b55", 2);
    poly([[x - 15, base - 28], [x + 15, base - 28], [x + 15, base - 28 - hgt], [x - 15, base - 28 - hgt]], "#ece8e0", 2.6);
    for (const [dx, l] of [[-12, 40], [-2, 24], [9, 56]]) { const ll = Math.min(l, hgt - 8); poly([[x + dx - 3, base - 28 - hgt], [x + dx + 3, base - 28 - hgt], [x + dx + 3, base - 28 - hgt + ll], [x + dx, base - 28 - hgt + ll + 5], [x + dx - 3, base - 28 - hgt + ll]], "#f4f1ea", 1.4); }
    ell(x, base - 28 - hgt, 15, 4, "#f4f1ea", 2);
    for (let k = 1; k * 18 < hgt; k++) line([[x - 15, base - 28 - hgt + k * 18], [x - 8, base - 28 - hgt + k * 18]], 1.4, "#8d887f");
    line([[x, base - 28 - hgt], [x, base - 36 - hgt]], 1.6);
    label("candle", x, base + 36, L);
  }

  // the Field Book: a grimoire with a brass clasp
  {
    shadow(250, 742, 86, 10);
    poly([[176, 690], [324, 684], [332, 736], [182, 744]], "#4a4540", 2.8);
    poly([[180, 680], [326, 674], [324, 684], [176, 690]], "#e3dfd8", 2);
    hatch([[176, 690], [324, 684], [332, 736], [182, 744]], 3.4, "#2a2724");
    ell(250, 712, 22, 15, null, 1.6); c.strokeStyle = "#cfcac2"; c.stroke();
    poly([[318, 700], [338, 699], [338, 716], [318, 717]], "#c9b48c", 1.8);
    ogham(196, 700, 30, 5, true, "#cfcac2");
    label("Field Book", 254, 772, L);
  }

  // tripod, burner and flask (the liquid and bubbles move, drawn live)
  {
    const cx = 432;
    shadow(cx, 712, 64, 9);
    for (const dx of [-40, 40]) line([[cx + dx * 0.6, 640], [cx + dx, 710]], 3);
    line([[cx, 640], [cx, 706]], 3); ell(cx, 640, 34, 7, null, 2.6);
    poly([[cx - 16, 704], [cx + 16, 704], [cx + 12, 686], [cx - 12, 686]], "#6f6b65", 2); line([[cx, 686], [cx, 680]], 1.4);
    label("ember flask", cx, 742, L);
  }

  // the seven ember-stones, each cut with its Ogham letter
  {
    shadow(560, 716, 56, 8);
    ell(560, 704, 56, 16, "#6f6b65", 2.4); ell(560, 700, 48, 12, "#5f5b55");
    d.stones.forEach((v, k) => {
      const x = 524 + (k % 4) * 22 + (k > 3 ? 11 : 0), y = 694 + (k > 3 ? 10 : 0);
      const g = Math.max(0, Math.min(1, (v - 1) / 9)), tone = `hsl(30 6% ${84 - g * 64}%)`, dark = g > 0.5;
      ell(x, y, 10, 7, tone, 1.6);
      for (let q = 0; q <= k % 4; q++) line([[x - 5 + q * 3, y - 3], [x - 5 + q * 3, y + 3]], 0.9, dark ? "#e3dfd8" : INK);
      line([[x - 6, y], [x + 6, y]], 0.9, dark ? "#e3dfd8" : INK);
      if (k === d.hot) { ell(x, y, 13, 9, null); c.strokeStyle = RED; c.lineWidth = 1.8; c.stroke(); }
    });
    label("ember-stones", 560, 742, L);
  }

  // the open day-book: today's logs on the left, tonight's journal on the right
  {
    const cx = 470, y0 = 790;
    shadow(cx, 932, 210, 12);
    const Lp: Pt[] = [[cx - 220, y0 + 10], [cx - 6, y0], [cx - 6, y0 + 132], [cx - 214, y0 + 140]];
    const Rp: Pt[] = [[cx + 6, y0], [cx + 222, y0 + 8], [cx + 216, y0 + 138], [cx + 6, y0 + 132]];
    poly([[cx - 226, y0 + 16], [cx + 228, y0 + 14], [cx + 222, y0 + 148], [cx - 220, y0 + 150]], "#4a4540", 2.4);
    poly(Lp, "#efe8da", 2.2); poly(Rp, "#efe8da", 2.2); line([[cx, y0 - 2], [cx, y0 + 134]], 2);
    itext(d.dateLabel, cx - 196, y0 + 30, 15, INK, "left", 186);
    const rows = d.day.slice(-4);
    if (!rows.length) itext("nothing yet: the mortar's waiting", cx - 196, y0 + 60, 13, "#7d7871", "left", 186);
    rows.forEach((r, k) => { const y = y0 + 56 + k * 21; itext(r.name.toLowerCase(), cx - 178, y, 14, "#3d3934", "left", 168); line([[cx - 196, y - 6], [cx - 190, y - 1], [cx - 184, y - 11]], 1.6); });
    if (d.day.length > 4) itext(`and ${d.day.length - 4} more`, cx - 178, y0 + 56 + 4 * 21, 12, "#7d7871");
    itext("Tonight", cx + 26, y0 + 30, 15, INK);
    if (d.journal) wrap(d.journal, 170, 13).slice(0, 4).forEach((ln, k) => itext(ln, cx + 26, y0 + 54 + k * 19, 13, "#3d3934"));
    else { scribble(cx + 26, y0 + 52, 170, 3, 18, "#c4bdb0"); }
    line([[cx + 2, y0 + 132], [cx + 10, y0 + 170], [cx + 4, y0 + 176]], 3.2, RED);
    label("day-book", cx - 110, 966, L); label("journal page", cx + 112, 966, L);
  }

  // ink-horn, quill and pounce pot
  {
    shadow(742, 772, 30, 6);
    poly([[722, 772], [760, 768], [752, 730], [728, 732]], "#3a3733", 2.4); ell(740, 731, 12, 4, "#1e1c1a", 1.6);
    line([[738, 732], [812, 620]], 2);
    const q: Pt[] = [[766, 696], [784, 652], [806, 622], [820, 614], [822, 630], [806, 664], [784, 696], [772, 706]];
    poly(q, "#f2efe9", 2.2); for (let k = 0; k < 9; k++) { const t = k / 9; line([[772 + t * 40, 700 - t * 80], [790 + t * 28, 698 - t * 70]], 0.9, "#8d887f"); }
    shadow(796, 786, 20, 5);
    poly([[780, 788], [812, 788], [810, 760], [782, 760]], "#8d887f", 2); ell(796, 760, 14, 4, "#5f5b55", 1.6); for (const dx of [-6, 0, 6]) ell(796 + dx, 760, 1.4, 1, "#e3dfd8");
    label("quill and ink", 760, 812, L);
  }

  // the mortar (the pestle moves, drawn live)
  {
    shadow(900, 700, 48, 9);
    poly([[858, 652], [942, 652], [930, 700], [870, 700]], "#cfcac2", 2.8); hatch([[900, 652], [942, 652], [930, 700], [900, 700]], 4, "#8d887f");
    ell(900, 652, 42, 10, "#8d887f", 2.6); ell(900, 652, 32, 6, "#5f5b55");
    for (let k = 0; k < Math.min(8, d.day.length + 2); k++) ell(866 + k * 6, 712 + (k % 2) * 3, 2.2, 1.6, "#6f6b65");
    label("mortar · log", 900, 730, L);
  }

  // the scrying bowl: dark water, and your Scáth looking back
  {
    shadow(905, 836, 62, 10);
    ell(905, 826, 60, 20, "#8d7a62", 2.6); ell(905, 822, 50, 14, "#2f2c29", 1.6);
    ell(905, 820, 7, 5, d.look.hood); ell(902, 820, 1.4, 1.6, WHITE); ell(908, 820, 1.4, 1.6, WHITE);
    line([[870, 818], [882, 816]], 1.4, "rgba(247,245,241,.6)");
    label("scrying bowl", 905, 866, L);
  }

  // the tally stick: a notch for each day you kept a habit
  {
    shadow(150, 832, 110, 6);
    poly([[40, 818], [250, 804], [254, 820], [42, 834]], "#d6c8ac", 2.4); hatch([[40, 818], [250, 804], [254, 820], [42, 834]], 7, "#a8977a", 0.8, 0.15);
    for (let k = 0; k < Math.min(17, d.notches); k++) { const x = 58 + k * 11, y = 817 - (x - 40) * 0.066; line([[x, y], [x + 3, y + 9]], 2); }
    poly([[150, 856], [218, 846], [222, 852], [152, 864]], "#cfcac2", 2); poly([[218, 846], [258, 840], [260, 850], [222, 852]], "#5f5b55", 2);
    label("tally stick", 150, 790, L);
  }

  // the cairn letter: a scroll, sealed in red when there's one waiting
  {
    shadow(110, 916, 80, 7);
    poly([[40, 896], [180, 884], [184, 914], [44, 926]], "#ece6d8", 2.4); ell(42, 911, 7, 15, "#ece6d8", 2); ell(182, 899, 7, 15, "#e3dcce", 2);
    line([[100, 890], [104, 922]], 3, "#8d887f");
    if (d.sealed) { ell(104, 906, 13, 12, RED, 2); ell(104, 906, 6, 5, "rgba(255,255,255,.2)"); }
    label("cairn letter", 110, 952, L);
  }

  // a wren's skull and a feather
  { ell(640, 772, 12, 9, "#ece8e0", 1.6); poly([[650, 770], [668, 775], [650, 776]], "#ece8e0", 1.4); ell(636, 770, 3.4, 3, "#3a3733"); line([[600, 790], [660, 800]], 1.4); poly([[606, 788], [640, 790], [658, 798], [626, 798]], "#bdb8b0", 1.2); }

  // the iron key
  { ell(966, 922, 11, 9, null, 3.6); line([[955, 924], [906, 932]], 4); line([[918, 930], [916, 940]], 3.4); line([[910, 931], [908, 940]], 3.4); label("iron key", 940, 966, L); }
}

// ---------- what moves: flames, the flask, the pestle ----------
export type Motion = { grind: number; boil: number; notch: number }; // 0..1 progress of each ritual, or 0
export function drawLive(cc: C, d: TableData, t: number, m: Motion) {
  c = cc;
  const hgt = 18 + 86 * Math.max(0, Math.min(1, d.candle));
  flameAt(c, 110, 690 - 36 - hgt, 1.2, t);
  flameAt(c, 432, 680, 0.55 * (1 + m.boil * 0.6), t);
  // the flask: liquid level is how far into this level you are
  const cx = 432, cy = 590;
  ell(cx, cy, 52, 50, "rgba(225,230,229,.45)", 2.8);
  const lvl = cy + 44 - 90 * Math.max(0.12, Math.min(0.92, d.flask));
  clipTo([[cx - 60, lvl], [cx + 60, lvl], [cx + 60, cy + 60], [cx - 60, cy + 60]], () => {
    ell(cx, cy, 50, 48, `rgba(210,72,58,${0.3 + m.boil * 0.2})`);
    for (let k = 0; k < 9 + m.boil * 10; k++) { const ph = (t * (0.5 + h2(k, 7)) + h2(k, 2)) % 1; ell(cx - 30 + h2(k, 1) * 60, cy + 40 - ph * (cy + 40 - lvl), 2 + h2(k, 3) * 3, 2 + h2(k, 3) * 3, "rgba(255,240,230,.75)", 1); }
  });
  line([[cx - 48, lvl], [cx + 48, lvl]], 1.4);
  poly([[cx - 10, cy - 48], [cx + 10, cy - 48], [cx + 10, cy - 104], [cx - 10, cy - 104]], "rgba(225,230,229,.45)", 2.4);
  poly([[cx - 12, cy - 104], [cx + 12, cy - 104], [cx + 10, cy - 116], [cx - 10, cy - 116]], "#b8a98f", 2);
  line([[cx + 8, cy - 96], [cx + 74, cy - 70], [cx + 96, cy - 30]], 6); line([[cx + 8, cy - 96], [cx + 74, cy - 70], [cx + 96, cy - 30]], 3, "#dfe3e2");
  poly([[cx + 84, cy - 26], [cx + 110, cy - 26], [cx + 106, cy + 4], [cx + 88, cy + 4]], "rgba(225,230,229,.6)", 2); ell(cx + 97, cy - 8, 6, 2.4, RED);
  const drip = (t * 0.7) % 1; ell(cx + 96, cy - 22 + drip * 12, 1.8, 3, RED);
  line([[cx - 40, cy - 30], [cx - 44, cy - 8]], 3, "rgba(247,245,241,.9)");
  // the pestle: it grinds while a log goes in
  const a = m.grind ? Math.sin(m.grind * Math.PI * 6) * 0.5 : 0;
  const px = 900 + Math.sin(a) * 30, py = 646;
  const tip: Pt = [px + 48 * Math.cos(-0.88 + a), py + 48 * Math.sin(-0.88 + a) - 20];
  poly([[px - 7, py + 2], [px + 3, py], [tip[0] + 4, tip[1] + 3], [tip[0] - 4, tip[1] - 3]], "#e3dfd8", 2.2); ell(tip[0], tip[1], 7, 5, "#e3dfd8", 2);
  // a fresh notch being cut
  if (m.notch) { const k = Math.min(16, Math.max(0, d.notches - 1)), x = 58 + k * 11, y = 817 - (x - 40) * 0.066; line([[x, y], [x + 3, y + 9 * m.notch]], 3, RED); }
}
