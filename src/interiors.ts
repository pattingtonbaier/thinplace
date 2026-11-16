// Working-room cutaways for the buildings other than the Bothy. You don't walk these: you tap a room,
// and the Scáth goes there. Each is a working place of its craft, and rooms appear the first time you log in them.
import type { GuiserOpts } from "./art";
import type { BuildingId } from "./content";
import { drawScath } from "./iso";
import { flameAt } from "./table";

type Pt = [number, number];
type C = CanvasRenderingContext2D;
type Rooms = Record<string, number>;
const INK = "#1e1c1a", WHITE = "#f7f5f1";
const FELL_SC = "'IM Fell English SC', 'IM Fell English', Georgia, serif";
const TW = 124, TH = 62, OX = 410, OY = 300, A = 3, VW = 820, VH = 540;
const P = (x: number, y: number, z = 0): Pt => [OX + (x - y) * TW / 2, OY + (x + y) * TH / 2 - z];

let c: C;
const h2 = (a: number, b: number) => { let x = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const jit = (x: number, y: number, a = 1.5): Pt => [x + (h2(x * 7, y * 3) - 0.5) * a, y + (h2(y * 5 + 3, x * 11) - 0.5) * a];
function path(pts: Pt[], close = true) { c.beginPath(); pts.forEach(([x, y], k) => { const [a, b] = jit(x, y); k ? c.lineTo(a, b) : c.moveTo(a, b); }); if (close) c.closePath(); }
function poly(pts: Pt[], fill: string | null, lw = 2.4, col = INK) { path(pts); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = col; c.lineJoin = "round"; c.stroke(); } }
function line(pts: Pt[], lw = 2, col = INK) { path(pts, false); c.lineWidth = lw; c.strokeStyle = col; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(); }
function clipTo(pts: Pt[], fn: () => void) { c.save(); c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip(); fn(); c.restore(); }
function hatch(pts: Pt[], gap = 5, col = "#8b867f", lw = 1, slope = 1) {
  clipTo(pts, () => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs) - 400, x1 = Math.max(...xs) + 400, y0 = Math.min(...ys), y1 = Math.max(...ys); c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); for (let x = x0; x < x1; x += gap) { c.moveTo(x, y1); c.lineTo(x + (y1 - y0) * slope, y0); } c.stroke(); });
}
function ell(x: number, y: number, rx: number, ry: number, fill: string | null, lw = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); } }
function tag(s: string, [x, y]: Pt, dim = false) {
  c.font = `15px ${FELL_SC}`; const w = c.measureText(s).width + 18;
  poly([[x - w / 2, y - 12], [x + w / 2, y - 12], [x + w / 2, y + 12], [x - w / 2, y + 12]], dim ? "#e4e0d9" : WHITE, dim ? 1.4 : 2);
  c.fillStyle = dim ? "#7d7871" : INK; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(s, x, y + 1);
}
function chalk(at: Pt) {
  const [x, y] = P(at[0], at[1]);
  c.save(); c.setLineDash([3, 4]); ell(x, y, 16, 8, null); c.lineWidth = 1.4; c.strokeStyle = "#8d887f"; c.stroke(); c.setLineDash([]);
  c.font = `15px ${FELL_SC}`; c.fillStyle = "#7d7871"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("?", x, y); c.restore();
}
// a boulder, drawn as an inked lump with a shaded side
function boulder(x: number, y: number, r: number, tone = "#cfcac2", seed = 1) {
  const pts: Pt[] = []; for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, rr = r * (0.85 + h2(seed, k) * 0.3); pts.push([x + Math.cos(a) * rr * 1.25, y - r * 0.6 + Math.sin(a) * rr * 0.75]); }
  ell(x + 4, y + 2, r * 1.2, r * 0.4, "rgba(30,28,26,.22)");
  poly(pts, tone, 2.2); clipTo(pts, () => { c.fillStyle = "rgba(30,28,26,.18)"; c.fillRect(x, y - r * 2, r * 2, r * 3); }); hatch(pts.filter((p) => p[0] > x - 2), 3.4, "#8d887f");
}
// a dry-stone wall face, along one axis
function stoneWall(a: Pt, b: Pt, h: number, faceFill: string) {
  const F: Pt[] = [P(a[0], a[1], 0), P(b[0], b[1], 0), P(b[0], b[1], h), P(a[0], a[1], h)];
  poly(F, faceFill, 0);
  const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.32);
  for (let r = 0; r < Math.ceil(h / 13); r++) for (let k = 0; k < n; k++) {
    const u0 = (k + (r % 2) * 0.5) / n, u1 = Math.min(1, u0 + 0.9 / n); if (u0 >= 1) continue;
    const z0 = r * 13, z1 = Math.min(h, z0 + 11);
    const q: Pt[] = [P(a[0] + (b[0] - a[0]) * u0, a[1] + (b[1] - a[1]) * u0, z0 + 1), P(a[0] + (b[0] - a[0]) * u1, a[1] + (b[1] - a[1]) * u1, z0 + 1), P(a[0] + (b[0] - a[0]) * u1, a[1] + (b[1] - a[1]) * u1, z1), P(a[0] + (b[0] - a[0]) * u0, a[1] + (b[1] - a[1]) * u0, z1)];
    poly(q, h2(r, k) < 0.3 ? "#bdb8b0" : null, 1, "#6d6862");
  }
  poly(F, null, 2.4);
  // the coping stones on top
  for (let k = 0; k < n; k++) { const u = (k + 0.5) / n, [x, y] = P(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, h); poly([[x - 9, y], [x - 4, y - 9], [x + 5, y - 8], [x + 9, y]], "#d9d5ce", 1.4); }
}

// ---------- the Stone Field: a walled training yard ----------
type Spot = { room: string; at: Pt; hot: Pt; name: string };
const STONE_FIELD: Spot[] = [
  { room: "Training", at: [-0.3, 0.25], hot: [-0.3, 0.2], name: "Training" },
  { room: "the trailheads", at: [1.55, -1.9], hot: [1.6, -2.75], name: "the trailheads" },
  { room: "the Sweat House", at: [-1.2, -2.35], hot: [-2.0, -2.0], name: "the Sweat House" },
];
function stoneFieldStill(rooms: Rooms) {
  const open = (r: string) => r in rooms;
  c.fillStyle = "#d4cfc7"; c.fillRect(0, 0, VW, VH);
  for (let k = 0; k < 900; k++) { c.fillStyle = "rgba(30,28,26,.06)"; c.fillRect(h2(k, 1) * VW, h2(k, 2) * VH, 1.4, 1.4); }
  // the slab of ground
  const d = 26;
  poly([P(-A, A), P(A, A), [P(A, A)[0], P(A, A)[1] + d], [P(-A, A)[0], P(-A, A)[1] + d]], "#cfcac2", 2.4);
  const Rs: Pt[] = [P(A, A), P(A, -A), [P(A, -A)[0], P(A, -A)[1] + d], [P(A, A)[0], P(A, A)[1] + d]]; poly(Rs, "#9d988f", 2.4); hatch(Rs, 4, "#6d6862");
  // grass and a trodden middle
  poly([P(-A, -A), P(A, -A), P(A, A), P(-A, A)], "#e2ded6", 2.6);
  for (let k = 0; k < 220; k++) { const [x, y] = P(-A + h2(k, 3) * 6, -A + h2(k, 4) * 6); c.strokeStyle = "#8f8a83"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 3, y - 3); c.lineTo(x - 1, y); c.lineTo(x + 1, y - 4); c.lineTo(x + 3, y); c.stroke(); }
  const trod: Pt[] = []; for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2; trod.push(P(-0.2 + Math.cos(a) * 1.6, 0.2 + Math.sin(a) * 1.5)); }
  poly(trod, "#d9d3c8", 0);
  // a flagged path from the gap in the near wall to the stile
  for (let k = 0; k < 9; k++) { const u = k / 8, x = 0.1 + (1.6 - 0.1) * u, y = 2.8 + (-2.5 - 2.8) * u; poly([P(x - 0.2, y - 0.14), P(x + 0.2, y - 0.14), P(x + 0.2, y + 0.14), P(x - 0.2, y + 0.14)], "#cfcac2", 1.2, "#8d887f"); }
  // the far walls: dry stone, with a gap for the stile
  stoneWall([-A, A], [-A, -A], 46, "#d6d1c8");
  stoneWall([-A, -A], [1.15, -A], 46, "#bdb8b0");
  stoneWall([2.05, -A], [A, -A], 46, "#bdb8b0");
  // the trailheads: a stile, a fingerpost to the Old Roads, hazel sticks and boots by the wall
  if (open("the trailheads")) {
    for (let s = 0; s < 3; s++) poly([P(1.2, -A + 0.05, 10 + s * 12), P(2.0, -A + 0.05, 10 + s * 12), P(2.0, -A + 0.25 - s * 0.06, 10 + s * 12), P(1.2, -A + 0.25 - s * 0.06, 10 + s * 12)], "#d9d5ce", 1.6);
    const [px, py] = P(2.25, -2.75); line([[px, py], [px, py - 92]], 4);
    poly([[px, py - 88], [px + 74, py - 96], [px + 84, py - 88], [px + 74, py - 80], [px, py - 76]], "#efe8da", 1.8);
    c.font = `11px ${FELL_SC}`; c.fillStyle = INK; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("the Old Roads", px + 4, py - 86);
    poly([[px, py - 70], [px - 44, py - 66], [px - 52, py - 60], [px - 44, py - 54], [px, py - 58]], "#e3dfd8", 1.6);
    for (let k = 0; k < 3; k++) line([P(0.62 + k * 0.08, -A + 0.08, 0), P(0.56 + k * 0.08, -A + 0.08, 84)], 2.2, "#8d7a62");
    const [bx, by] = P(0.95, -2.6); poly([[bx - 10, by], [bx + 4, by], [bx + 8, by - 6], [bx - 4, by - 18], [bx - 10, by - 18]], "#6f6b65", 1.6); poly([[bx + 6, by + 4], [bx + 20, by + 4], [bx + 24, by - 2], [bx + 12, by - 14], [bx + 6, by - 14]], "#6f6b65", 1.6);
    // the road beyond the gap
    c.save(); c.setLineDash([3, 5]); line([P(1.6, -A, 0), P(1.6, -A - 0.8, 0)], 1.4, "#8d887f"); c.restore();
  }
  // standing stones and the rush mat (Training) are drawn in depth order, with the Scáth
}
function stoneFieldThings(rooms: Rooms, t: number): { depth: number; draw: () => void }[] {
  const open = (r: string) => r in rooms, out: { depth: number; draw: () => void }[] = [];
  if (open("Training")) {
    // a mat of woven rushes inside a ring of five standing stones
    out.push({ depth: -10, draw: () => { const M: Pt[] = [P(-0.75, -0.25), P(0.15, -0.25), P(0.15, 0.65), P(-0.75, 0.65)]; poly(M, "#e3dccb", 1.8); clipTo(M, () => { for (let u = -0.7; u < 0.15; u += 0.09) line([P(u, -0.25), P(u, 0.65)], 0.8, "#a8977a"); }); } });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - 0.6, x = -0.3 + Math.cos(a) * 1.2, y = 0.2 + Math.sin(a) * 1.2, hgt = 52 + h2(k, 9) * 30;
      out.push({ depth: x + y, draw: () => {
        const w = 0.13;
        poly([P(x - w, y + w, 0), P(x + w, y + w, 0), P(x + w * 0.7, y + w, hgt), P(x - w * 0.8, y + w, hgt - 6)], "#d9d5ce", 2.2);
        const S: Pt[] = [P(x + w, y + w, 0), P(x + w, y - w, 0), P(x + w * 0.6, y - w, hgt - 4), P(x + w * 0.7, y + w, hgt)]; poly(S, "#aaa59d", 2.2); hatch(S, 3.4, "#7d7871");
        if (k === 1) { const [ox, oy] = P(x, y + w, hgt * 0.55); line([[ox - 5, oy], [ox + 5, oy]], 1.2); line([[ox - 3, oy - 4], [ox - 3, oy + 4]], 1.2); line([[ox + 2, oy - 4], [ox + 2, oy + 4]], 1.2); }
      } });
    }
    // lifting stones, graded by size, and a log on two stones
    out.push({ depth: 1.0 - 1.6, draw: () => { const [x, y] = P(1.0, -1.6); boulder(x - 34, y + 6, 12, "#d9d5ce", 1); boulder(x, y, 17, "#cfcac2", 2); boulder(x + 40, y - 8, 22, "#bdb8b0", 3); } });
    out.push({ depth: -1.8 - 0.6, draw: () => { boulder(...P(-2.2, -0.2), 11, "#cfcac2", 4); boulder(...P(-1.4, -1.0), 11, "#cfcac2", 5);
      const a = P(-2.25, -0.25, 22), b = P(-1.35, -1.05, 22); line([a, b], 16); line([a, b], 12, "#a8977a"); ell(b[0], b[1], 7, 8, "#d6c8ac", 1.6); } });
  } else out.push({ depth: -9, draw: () => chalk([-0.3, -0.1]) });
  if (!open("the trailheads")) out.push({ depth: -9, draw: () => chalk([1.55, -2.25]) });
  // the Sweat House: a beehive of corbelled stone, and a plunge trough
  if (open("the Sweat House")) {
    out.push({ depth: -2.0 - 2.0, draw: () => {
      const [x, y] = P(-2.0, -2.0), r = 64;
      const dome: Pt[] = []; for (let k = 0; k <= 16; k++) { const a = Math.PI + (k / 16) * Math.PI; dome.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 1.15 - 4]); }
      poly([...dome, [x + r, y + 10], [x - r, y + 10]], "#cfcac2", 2.6);
      clipTo([...dome, [x + r, y + 10], [x - r, y + 10]], () => { for (let r2 = 0; r2 < 9; r2++) for (let q = 0; q < 10; q++) { const yy = y + 6 - r2 * 9, xx = x - r + q * 14 + (r2 % 2) * 7; poly([[xx, yy], [xx + 12, yy], [xx + 12, yy - 7], [xx, yy - 7]], h2(r2, q) < 0.3 ? "#b8b3ab" : null, 0.9, "#6d6862"); } c.fillStyle = "rgba(30,28,26,.14)"; c.fillRect(x + 10, y - 90, 70, 110); });
      poly([[x + 14, y + 10], [x + 40, y + 6], [x + 40, y - 22], [x + 27, y - 30], [x + 14, y - 22]], "#2a2724", 2);
      for (let k = 0; k < 3; k++) { const ph = (t * 0.35 + k / 3) % 1; c.globalAlpha = 1 - ph; line([[x - 6 + k * 8, y - 70 - ph * 40], [x - 2 + k * 8 + Math.sin(t + k) * 4, y - 84 - ph * 46], [x + 2 + k * 8, y - 98 - ph * 50]], 1.6, "#9d988f"); c.globalAlpha = 1; }
    } });
    out.push({ depth: -2.5 + 1.0, draw: () => {
      const x0 = -2.8, x1 = -2.2, y0 = 0.7, y1 = 1.35, z = 26;
      const F: Pt[] = [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, z), P(x0, y1, z)], R2: Pt[] = [P(x1, y1, 0), P(x1, y0, 0), P(x1, y0, z), P(x1, y1, z)];
      poly(F, "#d9d5ce", 2.2); poly(R2, "#aaa59d", 2.2); hatch(R2, 3.4, "#7d7871");
      poly([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], "#bdb8b0", 2.2);
      const W2: Pt[] = [P(x0 + 0.08, y0 + 0.08, z), P(x1 - 0.08, y0 + 0.08, z), P(x1 - 0.08, y1 - 0.08, z), P(x0 + 0.08, y1 - 0.08, z)];
      poly(W2, "#a8a6a0", 1.4); for (let k = 0; k < 3; k++) { const [wx, wy] = P(x0 + 0.2 + k * 0.15, y0 + 0.3 + (k % 2) * 0.1, z); line([[wx - 6, wy], [wx - 2, wy - 1.5 + Math.sin(t * 2 + k)], [wx + 2, wy], [wx + 6, wy - 1.5]], 1.2, "#6d6862"); }
    } });
  } else out.push({ depth: -9, draw: () => chalk([-1.2, -2.7]) });
  return out;
}
function stoneFieldFront() {
  // the near walls, cut low, with a gap where the path comes in
  const lowWall = (a: Pt, b: Pt) => stoneWall(a, b, 18, "#cfcac2");
  lowWall([-A, A], [-0.35, A]); lowWall([0.55, A], [A, A]);
  const F: Pt[] = [P(A, A, 0), P(A, -A, 0), P(A, -A, 18), P(A, A, 18)]; poly(F, "#aaa59d", 2.2); hatch(F, 3.6, "#7d7871");
}


// ---------- the Ogham Tower: a lighthouse cut open, a floor per room ----------
// Front-on, like the lighthouse concept: the Whispering Well in the cellar, the Hedge Library on the ground,
// the subject floor above, and a lantern room that lights once all three are made.
const TOWER = { w: 820, h: 1000, x0: 232, x1: 588, wall: 30 };
const FLOORS = { cellar: [826, 962], library: [650, 812], subject: [480, 636], lantern: [334, 466] } as const;
const TOWER_ROOMS = ["the Hedge Library", "a subject floor", "the Whispering Well"];
// The twenty letters, in their four groups: strokes below the stem, above it, across it slantwise, and notches on it.
type Og = { name: string; side: "below" | "above" | "across" | "notch"; n: number };
const OGHAM: Og[] = [
  ["beith", "below", 1], ["luis", "below", 2], ["fearn", "below", 3], ["sail", "below", 4], ["nion", "below", 5],
  ["uath", "above", 1], ["dair", "above", 2], ["tinne", "above", 3], ["coll", "above", 4], ["ceirt", "above", 5],
  ["muin", "across", 1], ["gort", "across", 2], ["ngéadal", "across", 3], ["straif", "across", 4], ["ruis", "across", 5],
  ["ailm", "notch", 1], ["onn", "notch", 2], ["úr", "notch", 3], ["eadhadh", "notch", 4], ["iodhadh", "notch", 5],
].map(([name, side, n]) => ({ name, side, n } as Og));
function oghamMark(x: number, y: number, o: Og): number {
  for (let k = 0; k < o.n; k++) {
    const xx = x + k * 4;
    if (o.side === "below") line([[xx, y], [xx, y + 8]], 2.2, "#f1e8d4");
    else if (o.side === "above") line([[xx, y - 8], [xx, y]], 2.2, "#f1e8d4");
    else if (o.side === "across") line([[xx - 3, y + 8], [xx + 3, y - 8]], 2.2, "#f1e8d4");
    else ell(xx, y, 2.2, 2.2, "#f1e8d4");
  }
  return (o.n - 1) * 4 + 2;
}
type Counts = { finished: number; shipped: number; poems: number; finds: string[]; season: Season; samhain: boolean };
let extra: Counts = { finished: 0, shipped: 0, poems: 0, finds: [], season: "autumn", samhain: false }, ringAt = 0, lastFinished = -1;
function rect2(x0: number, y0: number, x1: number, y1: number): Pt[] { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
function books(x0: number, x1: number, y: number, seed: number) {
  let x = x0, k = 0;
  while (x < x1 - 6) { const w = 6 + h2(seed, k) * 6, hh = 22 + h2(k, seed) * 12, tone = ["#6f6b65", "#e3dfd8", "#9d988f", "#3a3733", "#cfcac2"][(k + seed) % 5];
    if (h2(k, seed + 3) < 0.12 && x + 24 < x1) { poly([[x, y], [x + 26, y], [x + 26, y - 7], [x, y - 7]], tone, 1.1); x += 28; k++; continue; } // a book lying flat
    poly([[x, y], [x + w, y], [x + w, y - hh], [x, y - hh]], tone, 1.1); x += w + 1; k++; }
}
function towerStill(rooms: Rooms) {
  const open = (r: string) => r in rooms, { x0, x1, wall } = TOWER, ix0 = x0 + wall, ix1 = x1 - wall;
  c.fillStyle = "#d4cfc7"; c.fillRect(0, 0, TOWER.w, TOWER.h);
  for (let k = 0; k < 1200; k++) { c.fillStyle = "rgba(30,28,26,.06)"; c.fillRect(h2(k, 1) * TOWER.w, h2(k, 2) * TOWER.h, 1.4, 1.4); }
  // the hill, and the ground cut through below it
  poly([[0, 830], [140, 806], [300, 812], [520, 808], [700, 800], [820, 812], [820, 1000], [0, 1000]], "#bdb7ac", 2.4);
  hatch([[0, 830], [820, 812], [820, 1000], [0, 1000]], 6, "#8d887f");
  for (let k = 0; k < 40; k++) { const x = h2(k, 5) * 820, y = 850 + h2(k, 6) * 140; ell(x, y, 4 + h2(k, 7) * 6, 2 + h2(k, 8) * 3, "#a8a196", 1); }
  for (let k = 0; k < 60; k++) { const x = h2(k, 11) * 820; if (x > x0 - 20 && x < x1 + 20) continue; const y = 812 + (x < 410 ? 10 : -4); line([[x, y], [x - 2, y - 7]], 1.1, "#6d6862"); line([[x + 2, y], [x + 4, y - 6]], 1.1, "#6d6862"); }
  // the back wall inside, lime-washed, and the cellar
  poly(rect2(ix0, 330, ix1, 962), "#e9e5dc", 0);
  for (let r = 0; r < 24; r++) for (let q = 0; q < 6; q++) if (h2(r, q * 7) < 0.18) { const y = 344 + r * 26, x = ix0 + 8 + q * 48 + (r % 2) * 24; poly(rect2(x, y, x + 40, y + 18), "#dcd8d1", 1, "#9d988f"); }
  // windows in the back wall, one to each floor, with the sky in them
  for (const [y0, y1, cx] of [[690, 760, 410], [516, 584, 470], [360, 430, 410]] as [number, number, number][]) {
    const W: Pt[] = [[cx - 22, y1], [cx - 22, y0 + 20], [cx - 14, y0 + 6], [cx, y0], [cx + 14, y0 + 6], [cx + 22, y0 + 20], [cx + 22, y1]];
    poly(W, "#f4f2ed", 2.2); clipTo(W, () => { line([[cx - 40, y1 - 14], [cx - 10, y1 - 22], [cx + 30, y1 - 18]], 1.4, "#9d988f"); });
    line([[cx, y0], [cx, y1]], 1.8); poly(rect2(cx - 26, y1, cx + 26, y1 + 6), "#cfcac2", 1.6);
  }
  // the walls, cut through: thick coursed stone
  for (const [a, b] of [[x0, ix0], [ix1, x1]]) {
    const Wl = rect2(a, 330, b, 962); poly(Wl, "#bdb8b0", 2.6);
    clipTo(Wl, () => { for (let y = 330; y < 962; y += 14) { const off = ((y / 14) % 2) * 9; for (let x = a - 20 + off; x < b; x += 18) poly(rect2(x, y + 1, x + 16, y + 12), h2(x, y) < 0.3 ? "#a8a39b" : null, 0.9, "#6d6862"); } });
    poly(Wl, null, 2.8);
  }
  // the bell chamber's windows: four, one to each quarter (the front one is cut away with the wall)
  for (const [a, b] of [[x0, ix0], [ix1, x1]]) { const Wn: Pt[] = [[a, 432], [a, 382], [(a + b) / 2, 368], [b, 382], [b, 432]]; poly(Wn, "#f4f2ed", 2.2); }
  // timber floors
  for (const y of [FLOORS.library[1], FLOORS.subject[1], FLOORS.lantern[1], 330]) {
    const F = rect2(ix0, y, ix1, y + 14); poly(F, "#a8977a", 2.2); for (let x = ix0 + 30; x < ix1; x += 46) line([[x, y + 2], [x, y + 12]], 1, "#6f6252");
  }
  poly(rect2(ix0, 962, ix1, 972), "#9d988f", 2); // the cellar floor
  // the stair, climbing the right wall from floor to floor
  for (const [fy, ty] of [[962, 826], [812, 664], [636, 494], [466, 344]] as [number, number][]) {
    const n = 8, sx = ix1 - 92, w = 92;
    for (let k = 0; k < n; k++) { const y = fy - (k + 1) * ((fy - ty) / n), x = sx + (k * w) / n; poly(rect2(x, y, ix1, y + (fy - ty) / n), k % 2 ? "#cfcac2" : "#d9d5ce", 1.2); }
    poly([[ix1 - 40, ty], [ix1, ty], [ix1, ty + 14], [ix1 - 40, ty + 14]], "#e9e5dc", 0); // the hatch in the floor above
  }
  // the roof: a cone of slates over the parapet, and a finial
  const roof: Pt[] = [[x0 - 26, 334], [410, 150], [x1 + 26, 334]];
  poly(roof, "#77736d", 2.6); clipTo(roof, () => { for (let y = 160; y < 340; y += 10) line([[0, y], [820, y]], 1, "#4c4945"); for (let y = 160; y < 340; y += 10) for (let x = (y / 10) % 2 ? 0 : 9; x < 820; x += 18) line([[x, y], [x, y + 10]], 0.8, "#4c4945"); });
  poly([[x0 - 30, 334], [x1 + 30, 334], [x1 + 30, 344], [x0 - 30, 344]], "#9d988f", 2.2);
  line([[410, 150], [410, 116]], 2.6); poly([[410, 112], [432, 120], [410, 128]], "#9d988f", 1.4);
  // Ogham cut up the outside of the doorway
  for (let k = 0; k < 7; k++) line([[x0 - 6, 790 - k * 9], [x0 + 4, 790 - k * 9]], 1.4);
  line([[x0 - 1, 800], [x0 - 1, 724]], 1.6);

  // ---- the Hedge Library ----
  if (open("the Hedge Library")) {
    const [ty, fy] = FLOORS.library;
    for (const [sx0, sx1] of [[ix0 + 8, 372], [448, ix1 - 100]] as [number, number][]) {
      poly(rect2(sx0, ty + 18, sx1, fy), "#9d8a70", 2.2);
      for (const sy of [ty + 58, ty + 100, ty + 142]) { poly(rect2(sx0 + 4, sy - 38, sx1 - 4, sy), "#3a3733", 1); books(sx0 + 6, sx1 - 6, sy, Math.round(sx0 + sy)); poly(rect2(sx0, sy, sx1, sy + 5), "#b8a98f", 1.2); }
    }
  } else chalkAt(380, FLOORS.library[1] - 14);
  // ---- the subject floor ----
  if (open("a subject floor")) {
    const [ty, fy] = FLOORS.subject;
    // a slate with Ogham chalked on it, and a star chart pinned beside it
    poly(rect2(ix0 + 14, ty + 30, ix0 + 120, ty + 104), "#3a3733", 2.2); poly(rect2(ix0 + 10, ty + 26, ix0 + 124, ty + 108), null, 3, "#8d7a62");
    c.strokeStyle = "#e9e5dc"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(ix0 + 24, ty + 66); c.lineTo(ix0 + 110, ty + 66);
    for (let k = 0; k < 12; k++) { const x = ix0 + 30 + k * 7, up = k % 3 === 0; c.moveTo(x, up ? ty + 56 : ty + 66); c.lineTo(x + (k % 4 === 1 ? 4 : 0), up ? ty + 66 : ty + 76); } c.stroke();
    c.font = `italic 13px 'IM Fell English', Georgia, serif`; c.fillStyle = "#e9e5dc"; c.textAlign = "left"; c.fillText("beith, luis, fearn", ix0 + 22, ty + 94);
    const Sc: Pt[] = rect2(520 - 60, ty + 30, 520, ty + 92); poly(Sc, "#e3d9c6", 1.6);
    for (let k = 0; k < 9; k++) ell(470 + h2(k, 3) * 44, ty + 38 + h2(k, 4) * 48, 1.6, 1.6, INK);
    line([[474, ty + 50], [488, ty + 62], [506, ty + 56], [500, ty + 80]], 0.9);
  } else chalkAt(380, FLOORS.subject[1] - 14);
  // ---- the Whispering Well ----
  if (!open("the Whispering Well")) chalkAt(410, 948);
}
function chalkAt(x: number, y: number) {
  c.save(); c.setLineDash([3, 4]); ell(x, y, 22, 8, null); c.lineWidth = 1.4; c.strokeStyle = "#8d887f"; c.stroke(); c.setLineDash([]);
  c.font = `17px ${FELL_SC}`; c.fillStyle = "#7d7871"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("?", x, y - 1); c.restore();
}
function towerThings(rooms: Rooms, t: number): { depth: number; draw: () => void }[] {
  const open = (r: string) => r in rooms, out: { depth: number; draw: () => void }[] = [], { x0, x1, wall } = TOWER, ix0 = x0 + wall, ix1 = x1 - wall;
  if (open("the Hedge Library")) out.push({ depth: 1, draw: () => {
    const fy = FLOORS.library[1];
    // a wing chair, a reading table with a candle, and a stack of books on the floor
    poly([[300, fy], [300, fy - 74], [314, fy - 86], [338, fy - 84], [340, fy - 40], [370, fy - 40], [372, fy]], "#8d887f", 2.2); hatch([[300, fy], [300, fy - 74], [314, fy - 86], [338, fy - 84], [340, fy - 40], [370, fy - 40], [372, fy]], 4, "#5f5b55");
    poly(rect2(336, fy - 44, 378, fy - 30), "#cfcac2", 1.8);
    poly(rect2(392, fy - 46, 446, fy - 40), "#9d8a70", 1.8); line([[400, fy - 40], [400, fy]], 2.4); line([[438, fy - 40], [438, fy]], 2.4);
    poly(rect2(414, fy - 64, 422, fy - 46), "#ece8e0", 1.2); flameAt(c, 418, fy - 66, 0.4, t);
    for (let k = 0; k < 4; k++) poly(rect2(452 + (k % 2) * 3, fy - 8 - k * 8, 486 + (k % 2) * 3, fy - k * 8), ["#6f6b65", "#e3dfd8", "#3a3733", "#cfcac2"][k], 1.2);
  } });
  if (open("a subject floor")) out.push({ depth: 2, draw: () => {
    const fy = FLOORS.subject[1];
    // the lectern with an open book, an astrolabe on a stand, a three-legged stool
    line([[420, fy], [420, fy - 64]], 4); poly([[404, fy], [436, fy], [430, fy - 6], [410, fy - 6]], "#6f6b65", 1.6);
    poly([[388, fy - 66], [452, fy - 80], [456, fy - 70], [394, fy - 56]], "#8d887f", 2);
    poly([[392, fy - 68], [420, fy - 74], [422, fy - 66], [396, fy - 60]], "#efe8da", 1.1); poly([[420, fy - 74], [448, fy - 80], [450, fy - 72], [422, fy - 66]], "#efe8da", 1.1);
    line([[492, fy], [492, fy - 54]], 2.6); poly([[480, fy], [504, fy], [498, fy - 4], [486, fy - 4]], "#6f6b65", 1.4);
    ell(492, fy - 76, 22, 22, null, 2.2); ell(492, fy - 76, 14, 14, null, 1.2); line([[472, fy - 70], [512, fy - 82]], 1.6); ell(492, fy - 76, 3, 3, "#c9b48c", 1);
    poly(rect2(ix0 + 24, fy - 30, ix0 + 70, fy - 24), "#b8a98f", 1.6); for (const x of [ix0 + 28, ix0 + 47, ix0 + 66]) line([[x, fy - 24], [x - 3 + (x - ix0 - 47) * 0.1, fy]], 2.2);
  } });
  if (open("the Whispering Well")) out.push({ depth: 0, draw: () => {
    const fy = 962, cx = 380;
    // a round well-head of stone, a windlass, and a brass ear-trumpet on the wall for the voices that come up
    poly(rect2(cx - 50, fy - 40, cx + 50, fy), "#cfcac2", 2.2); for (let r = 0; r < 3; r++) for (let q = 0; q < 5; q++) poly(rect2(cx - 50 + q * 20 + (r % 2) * 10, fy - 40 + r * 13, cx - 32 + q * 20 + (r % 2) * 10, fy - 29 + r * 13), null, 0.9, "#6d6862");
    ell(cx, fy - 40, 50, 9, "#2f2c29", 2);
    for (let k = 0; k < 2; k++) { const rr = 10 + ((t * 0.5 + k / 2) % 1) * 30; c.globalAlpha = 1 - rr / 40; ell(cx, fy - 40, rr, rr * 0.18, null); c.strokeStyle = "#9d988f"; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1; }
    for (const dx of [-44, 44]) line([[cx + dx, fy - 40], [cx + dx, fy - 104]], 3);
    line([[cx - 48, fy - 100], [cx + 48, fy - 100]], 5); line([[cx + 48, fy - 100], [cx + 60, fy - 88]], 2.4);
    line([[cx + 6, fy - 100], [cx + 6, fy - 62]], 1); poly(rect2(cx - 2, fy - 62, cx + 14, fy - 50), "#8d7a62", 1.4);
    const hx = ix0 + 30, hy = fy - 120; poly([[hx, hy], [hx + 50, hy - 18], [hx + 50, hy + 18]], "#c9b48c", 1.8); line([[hx, hy], [hx - 12, hy + 26]], 2.2, "#8d7a62");
    for (let k = 0; k < 3; k++) { const ph = (t * 0.6 + k / 3) % 1; c.globalAlpha = 1 - ph; c.beginPath(); c.arc(hx + 54, hy, 8 + ph * 26, -0.6, 0.6); c.strokeStyle = "#8d887f"; c.lineWidth = 1.2; c.stroke(); c.globalAlpha = 1; }
  } });
  // the bell chamber: built once every floor below is made. A bronze bell hangs from an oak beam,
  // and each book you finish cuts the next Ogham letter into the beam and rings the bell.
  out.push({ depth: 3, draw: () => {
    const [ty, fy] = FLOORS.lantern, all = TOWER_ROOMS.every(open);
    if (!all) { for (let k = 0; k < 3; k++) poly(rect2(300 + k * 36, fy - 26 - (k % 2) * 4, 330 + k * 36, fy), "#b8a98f", 1.6); return; }
    // the beam, end to end across the chamber, with the Ogham stem-line and the letters cut so far
    const by = ty + 26, bx0 = ix0 - 4, bx1 = ix1 + 4;
    poly(rect2(bx0, by - 2, bx1, by + 20), "#7d6a52", 2.2); hatch(rect2(bx0, by - 2, bx1, by + 20), 7, "#5f5040", 0.7, 0.1);
    line([[ix0 + 14, by + 9], [ix1 - 14, by + 9]], 1.6, "#e3d6bb");
    let x = ix0 + 22; const n = Math.min(extra.finished, OGHAM.length * 2);
    for (let k = 0; k < n; k++) { const w = oghamMark(x, by + 9, OGHAM[k % OGHAM.length]); x += w + 7; if (x > ix1 - 30) break; }
    // the bell and its rope, swinging when it has just rung
    const since = (performance.now() - ringAt) / 1000, swing = ringAt && since < 4 ? Math.sin(since * 7) * 0.45 * (1 - since / 4) : 0;
    const px = 410, py = by + 18;
    c.save(); c.translate(px, py); c.rotate(swing);
    line([[0, 0], [0, 10]], 4);
    const bell: Pt[] = [[-8, 10], [8, 10], [12, 22], [16, 46], [26, 58], [-26, 58], [-16, 46], [-12, 22]];
    poly(bell, "#9a7f55", 2.4); hatch(bell.filter((p) => p[0] >= -2), 3, "#6a5638");
    line([[-24, 52], [24, 52]], 1.2, "#5a4a32"); ell(0 + swing * 30, 62, 5, 5, "#5a4a32", 1.4);
    line([[0, 58], [6, 150 - py + fy - 150]], 1.8, "#8d7a62");
    c.restore();
    if (ringAt && since < 2.5) for (let k = 0; k < 3; k++) { const r = 30 + ((since * 40 + k * 18) % 54); c.globalAlpha = Math.max(0, 1 - r / 84) * (1 - since / 2.5); c.beginPath(); c.arc(px, py + 34, r, -0.9, 0.9); c.arc(px, py + 34, r, Math.PI - 0.9, Math.PI + 0.9); c.strokeStyle = "#8d887f"; c.lineWidth = 1.6; c.stroke(); c.globalAlpha = 1; }
    // a book satchel on its peg, as the scribes hung them
    line([[ix0 + 30, fy - 96], [ix0 + 40, fy - 92]], 3);
    line([[ix0 + 34, fy - 94], [ix0 + 22, fy - 70]], 1.4); line([[ix0 + 36, fy - 94], [ix0 + 52, fy - 70]], 1.4);
    poly([[ix0 + 18, fy - 70], [ix0 + 58, fy - 70], [ix0 + 60, fy - 30], [ix0 + 16, fy - 30]], "#8d7a62", 2); poly([[ix0 + 18, fy - 70], [ix0 + 58, fy - 70], [ix0 + 54, fy - 54], [ix0 + 22, fy - 54]], "#6f6252", 1.6);
    for (let k = 0; k < 4; k++) line([[ix0 + 22, fy - 42 + k * 0], [ix0 + 54, fy - 42]], 0.8, "#5a4a32");
    // under the beam: the next letter waiting to be cut
    if (extra.finished < OGHAM.length * 2) { const nx = OGHAM[extra.finished % OGHAM.length]; c.font = `italic 13px 'IM Fell English', Georgia, serif`; c.fillStyle = "#5f5b55"; c.textAlign = "right"; c.fillText(`next: ${nx.name}`, ix1 - 14, by + 34); }
  } });
  void x1;
  return out;
}
const TOWER_SPOTS: Spot[] = [
  { room: "the Hedge Library", at: [0, 0], hot: [0, 0], name: "the Hedge Library" },
  { room: "a subject floor", at: [0, 0], hot: [0, 0], name: "a subject floor" },
  { room: "the Whispering Well", at: [0, 0], hot: [0, 0], name: "the Whispering Well" },
];
const towerBand = (i: number): [number, number] => i === 0 ? [FLOORS.library[0], FLOORS.library[1]] : i === 1 ? [FLOORS.subject[0], FLOORS.subject[1]] : [FLOORS.cellar[0], 962];

// ---------- the Forge: a smithy cut open front-on, its rooms stacked and side by side ----------
// The smithy on the ground floor (Projects), the Guild room upstairs under the thatch, and Repairs in a
// lean-to built against the side once you've used it. Every project you ship hangs a forged piece on the wall of work.
const FG = { w: 820, h: 700, gy: 600, x0: 300, x1: 700, wall: 24, mid: 410, eave: 262, apex: 112, lx0: 96 };
const FORGE_SPOTS: Spot[] = [
  { room: "Projects", at: [0, 0], hot: [0, 0], name: "Projects" },
  { room: "the Guild room", at: [0, 0], hot: [0, 0], name: "the Guild room" },
  { room: "Repairs", at: [0, 0], hot: [0, 0], name: "Repairs" },
];
function coursed(R: Pt[], x0: number, x1: number, y0: number, y1: number, tone = "#bdb8b0") {
  poly(R, tone, 2.4);
  clipTo(R, () => { for (let y = y0; y < y1; y += 14) { const off = ((y / 14) % 2) * 9; for (let x = x0 - 20 + off; x < x1; x += 18) poly(rect2(x, y + 1, x + 16, y + 12), h2(x, y) < 0.3 ? "#a8a39b" : null, 0.9, "#6d6862"); } });
  poly(R, null, 2.6);
}
function forgeStill(rooms: Rooms) {
  const open = (r: string) => r in rooms, { gy, x0, x1, wall, mid, eave, apex, lx0 } = FG, ix0 = x0 + wall, ix1 = x1 - wall;
  c.fillStyle = "#d4cfc7"; c.fillRect(0, 0, FG.w, FG.h);
  for (let k = 0; k < 1000; k++) { c.fillStyle = "rgba(30,28,26,.06)"; c.fillRect(h2(k, 1) * FG.w, h2(k, 2) * FG.h, 1.4, 1.4); }
  // the ground, cut through
  poly([[0, gy + 6], [180, gy], [820, gy - 2], [820, 700], [0, 700]], "#bdb7ac", 2.4); hatch([[0, gy + 6], [820, gy - 2], [820, 700], [0, 700]], 6, "#8d887f");
  for (let k = 0; k < 30; k++) ell(h2(k, 5) * 820, gy + 24 + h2(k, 6) * 70, 4 + h2(k, 7) * 6, 2 + h2(k, 8) * 3, "#a8a196", 1);
  // inside: the back wall, lime-washed below and soot-dark by the chimney
  poly(rect2(ix0, eave, ix1, gy), "#e6e1d7", 0);
  const sg = c.createRadialGradient(610, 470, 10, 610, 470, 200); sg.addColorStop(0, "rgba(40,36,32,.4)"); sg.addColorStop(1, "rgba(40,36,32,0)"); c.fillStyle = sg; c.fillRect(ix0, eave, ix1 - ix0, gy - eave);
  for (let r = 0; r < 12; r++) for (let q = 0; q < 7; q++) if (h2(r, q * 5) < 0.16) { const y = eave + 10 + r * 26, x = ix0 + 8 + q * 50 + (r % 2) * 25; poly(rect2(x, y, x + 40, y + 18), "#dcd8d1", 1, "#9d988f"); }
  // the gable: the upper room sits under the roof
  const gable: Pt[] = [[ix0, eave], [mid + 90, apex + 26], [ix1, eave]];
  poly([[ix0, eave], [mid + 90, apex + 26], [ix1, eave]], open("the Guild room") ? "#e9e5dc" : "#cfcac2", 0);
  void gable;
  // the walls, cut through
  coursed(rect2(x0, eave, ix0, gy), x0, ix0, eave, gy); coursed(rect2(ix1, eave, x1, gy), ix1, x1, eave, gy);
  // the upper floor, on beams
  poly(rect2(ix0, 392, ix1, 408), "#a8977a", 2.2); for (let x = ix0 + 40; x < ix1; x += 60) poly(rect2(x - 7, 408, x + 7, 420), "#8d7a62", 1.6);
  poly(rect2(ix0, gy - 2, ix1, gy + 6), "#9d988f", 2);
  // a hatch and ladder up to the Guild room
  poly(rect2(ix0 + 8, 392, ix0 + 58, 408), "#e6e1d7", 1.4);
  for (const x of [ix0 + 14, ix0 + 50]) line([[x - 6, gy], [x + 4, 380]], 3.2, "#6f6252");
  for (let k = 1; k < 10; k++) { const y = gy - k * ((gy - 384) / 10); line([[ix0 + 9 + (gy - y) * 0.047, y], [ix0 + 45 + (gy - y) * 0.047, y]], 2.2, "#6f6252"); }
  // the roof: thatch over the gable, cut through so you see its thickness
  const roof: Pt[] = [[x0 - 34, eave + 4], [mid + 90, apex - 18], [x1 + 34, eave + 4], [x1 + 4, eave + 30], [mid + 90, apex + 26], [x0 - 4, eave + 30]];
  poly(roof, "#d7d0c1", 2.6);
  clipTo(roof, () => { for (let k = 0; k < 220; k++) { const u = h2(k, 3), side = k % 2, x = side ? (mid + 90) + u * (x1 + 34 - mid - 90) : (x0 - 34) + u * (mid + 90 - x0 + 34), y = side ? apex - 18 + u * (eave + 4 - apex + 18) : eave + 4 - u * (eave + 4 - apex + 18); line([[x, y], [x + (side ? -4 : 4), y + 26]], 0.9, "#8f897d"); } });
  poly(roof, null, 2.6);
  // the chimney stack, up the right wall and out through the thatch
  const cx0 = 604, cx1 = ix1;
  coursed(rect2(cx0, 300, cx1, gy - 64), cx0, cx1, 300, gy - 64, "#aaa59d");
  coursed([[cx0 + 6, 300], [cx1, 300], [cx1, 64], [cx0 + 6, 64]], cx0 + 6, cx1, 64, 300, "#aaa59d");
  poly(rect2(cx0, 56, cx1 + 6, 66), "#8d887f", 2);
  // the hearth: a raised stone bed, its fire opening, and the hood narrowing into the stack
  coursed(rect2(548, gy - 64, ix1, gy), 548, ix1, gy - 64, gy, "#cfcac2");
  poly(rect2(548, gy - 70, ix1, gy - 64), "#5f5b55", 2);
  for (let k = 0; k < 9; k++) ell(560 + h2(k, 1) * 100, gy - 72 + h2(k, 2) * 4, 7, 4, h2(k, 3) < 0.4 ? "#8d887f" : "#3a3733", 0.9);
  poly([[536, gy - 150], [ix1, gy - 150], [ix1, 418], [cx0, 418]], "#9d988f", 2.4); hatch([[536, gy - 150], [ix1, gy - 150], [ix1, 418], [cx0, 418]], 5, "#6d6862");
  line([[536, gy - 150], [ix1, gy - 150]], 4);
  // the Guild room's window and charter, or its chalk mark
  if (open("the Guild room")) {
    const W: Pt[] = [[mid + 40, 330], [mid + 40, 290], [mid + 60, 276], [mid + 80, 290], [mid + 80, 330]]; poly(W, "#f4f2ed", 2.2); line([[mid + 60, 278], [mid + 60, 330]], 1.6);
    const Ch = rect2(ix0 + 14, 292, ix0 + 66, 344); poly(Ch, "#efe8da", 1.8);
    for (let k = 0; k < 5; k++) line([[ix0 + 20, 304 + k * 8], [ix0 + 60 - (k % 2) * 10, 304 + k * 8]], 1, "#5f5b55");
    ell(ix0 + 40, 340, 6, 6, "#d2483a", 1.2);
  } else chalkAt(mid + 20, 380);
  // the lean-to for Repairs, built against the left wall once it's used
  if (open("Repairs")) {
    const lx = lx0, ly = 470, ry = 410;
    coursed(rect2(lx, ly, lx + 20, gy), lx, lx + 20, ly, gy, "#cfcac2");
    poly([[lx + 20, ly], [x0, ry + 20], [x0, gy], [lx + 20, gy]], "#e6e1d7", 0);
    const R: Pt[] = [[lx - 18, ly + 2], [x0, ry - 8], [x0, ry + 14], [lx - 4, ly + 22]]; poly(R, "#9d988f", 2.4); hatch(R, 4, "#5f5b55");
    for (let x = lx + 20; x < x0; x += 34) line([[x, ly + 20 - (x - lx - 20) * 0.32], [x, ly + 26 - (x - lx - 20) * 0.32]], 1, "#6f6b65");
    const Wn = rect2(lx + 60, 506, lx + 96, 540); poly(Wn, "#f4f2ed", 2); line([[lx + 78, 506], [lx + 78, 540]], 1.4);
    poly(rect2(lx + 20, gy - 2, x0, gy + 6), "#9d988f", 2);
  } else chalkAt(200, gy - 8);
}
function forgeThings(rooms: Rooms, t: number): { depth: number; draw: () => void }[] {
  const open = (r: string) => r in rooms, out: { depth: number; draw: () => void }[] = [], { gy, wall, x0 } = FG, ix0 = FG.x0 + wall;
  // the fire is always lit: this is a forge
  out.push({ depth: 0, draw: () => {
    flameAt(c, 600, gy - 72, 1.1, t);
    for (let k = 0; k < 6; k++) { const ph = (t * 0.8 + k / 6) % 1; c.globalAlpha = 1 - ph; ell(600 + Math.sin(k * 3.1 + t) * 16 * ph, gy - 100 - ph * 70, 1.6, 1.6, "#d2483a"); c.globalAlpha = 1; }
  } });
  // the wall of work: a forged piece on the rail for each project shipped
  out.push({ depth: 0, draw: () => {
    const n = Math.min(extra.shipped, 14), pieces = ["horseshoe", "hinge", "key", "hook", "blade", "ring"];
    line([[ix0 + 74, 448], [ix0 + 230, 448]], 4, "#6f6252"); for (const x of [ix0 + 78, ix0 + 226]) line([[x, 444], [x, 454]], 3);
    for (let k = 0; k < n; k++) {
      const row = Math.floor(k / 7), px = ix0 + 88 + (k % 7) * 20, py = 452 + row * 40, kind = pieces[k % pieces.length];
      line([[px, py - 4], [px, py + 2]], 1); c.lineWidth = 3; c.strokeStyle = "#3a3733"; c.beginPath();
      if (kind === "horseshoe") c.arc(px, py + 12, 8, Math.PI * 0.15, Math.PI * 0.85, true);
      else if (kind === "hinge") { c.moveTo(px - 2, py + 2); c.lineTo(px - 2, py + 26); c.moveTo(px - 2, py + 6); c.lineTo(px + 8, py + 4); }
      else if (kind === "key") { c.arc(px, py + 7, 4, 0, Math.PI * 2); c.moveTo(px, py + 11); c.lineTo(px, py + 28); c.lineTo(px + 5, py + 28); }
      else if (kind === "hook") { c.moveTo(px, py + 2); c.lineTo(px, py + 18); c.arc(px + 5, py + 18, 5, Math.PI, 0, true); }
      else if (kind === "blade") { c.moveTo(px, py + 2); c.lineTo(px, py + 8); c.moveTo(px - 2, py + 8); c.lineTo(px + 2, py + 8); c.lineTo(px + 1, py + 30); c.lineTo(px - 1, py + 30); c.closePath(); }
      else c.arc(px, py + 12, 7, 0, Math.PI * 2);
      c.stroke();
    }
    if (!n) { c.font = `italic 12px 'IM Fell English', Georgia, serif`; c.fillStyle = "#7d7871"; c.textAlign = "center"; c.fillText("a piece hangs here for each project shipped", ix0 + 152, 470); }
  } });
  if (open("Projects")) {
    out.push({ depth: 1, draw: () => {
      // the bellows beside the hearth, worked by a lever
      const pump = Math.sin(t * 1.6) * 5, bx = 508, by = gy - 46;
      poly([[bx - 30, by - 8 - pump], [bx + 26, by - 4], [bx + 26, by + 6], [bx - 30, by + 14 + pump]], "#6f6252", 2); hatch([[bx - 30, by - 8], [bx + 26, by - 4], [bx + 26, by + 6], [bx - 30, by + 14]], 4, "#4c4035");
      line([[bx + 26, by + 1], [548, by - 6]], 3); line([[bx - 22, by + 14], [bx - 22, gy]], 3); line([[bx + 18, by + 6], [bx + 18, gy]], 3); line([[bx - 30, by - 8 - pump], [bx - 52, by - 52 - pump]], 3);
      // the anvil on its stump, hammer and tongs
      const ax = 430;
      poly([[ax - 22, gy], [ax - 18, gy - 40], [ax + 18, gy - 40], [ax + 22, gy]], "#8d7a62", 2.2); hatch([[ax, gy], [ax, gy - 40], [ax + 18, gy - 40], [ax + 22, gy]], 4, "#5f5040");
      poly([[ax - 46, gy - 58], [ax + 22, gy - 58], [ax + 42, gy - 52], [ax + 22, gy - 48], [ax + 14, gy - 40], [ax - 14, gy - 40], [ax - 20, gy - 52]], "#3a3733", 2.4);
      line([[ax - 44, gy - 57], [ax + 20, gy - 57]], 1.4, "#8d887f");
      const sw = Math.max(0, Math.sin(t * 3)) * 0.45;
      c.save(); c.translate(ax + 30, gy - 62); c.rotate(-0.9 + sw); line([[0, 0], [0, -36]], 3, "#6f6252"); poly(rect2(-9, -44, 9, -36), "#3a3733", 1.6); c.restore();
      if (Math.sin(t * 3) > 0.92) for (let k = 0; k < 5; k++) ell(ax + 8 + k * 5, gy - 64 - k * 3, 1.4, 1.4, "#d2483a");
      line([[ax - 40, gy - 8], [ax - 8, gy - 54]], 1.6); line([[ax - 34, gy - 6], [ax - 4, gy - 50]], 1.6);
      // the quench trough, steaming
      const qx = 336;
      coursed(rect2(qx, gy - 30, qx + 72, gy), qx, qx + 72, gy - 30, gy, "#cfcac2");
      poly(rect2(qx + 6, gy - 34, qx + 66, gy - 30), "#8d887f", 1.4);
      for (let k = 0; k < 3; k++) { const ph = (t * 0.4 + k / 3) % 1, sx = qx + 18 + k * 18; c.globalAlpha = 0.8 * (1 - ph); line([[sx, gy - 36 - ph * 40], [sx + 4, gy - 48 - ph * 40], [sx, gy - 58 - ph * 40]], 1.4, "#9d988f"); c.globalAlpha = 1; }
    } });
  } else out.push({ depth: 1, draw: () => chalkAt(440, gy - 8) });
  // the Guild room: a long bench, an hourglass running, plans and a lamp
  if (open("the Guild room")) out.push({ depth: 1, draw: () => {
    const fy = 392, bx0 = ix0 + 150, bx1 = 592;
    poly(rect2(bx0, fy - 52, bx1, fy - 44), "#8d7a62", 2.2); for (const x of [bx0 + 8, bx1 - 8]) line([[x, fy - 44], [x, fy]], 3, "#6f6252");
    poly([[bx0 + 8, fy - 52], [bx0 + 56, fy - 52], [bx0 + 62, fy - 56], [bx0 + 14, fy - 56]], "#efe8da", 1.2);
    const hx = bx0 + 76, hy = fy - 52, sand = (t * 0.05) % 1;
    poly([[hx - 9, hy - 40], [hx + 9, hy - 40], [hx + 1.5, hy - 20], [hx + 9, hy], [hx - 9, hy], [hx - 1.5, hy - 20]], "rgba(225,230,229,.6)", 1.6);
    poly([[hx - 7 + sand * 5, hy - 38 + sand * 16], [hx + 7 - sand * 5, hy - 38 + sand * 16], [hx, hy - 21]], "#c9b48c", 0); poly([[hx - 8 * sand, hy - 1], [hx + 8 * sand, hy - 1], [hx, hy - 1 - 14 * sand]], "#c9b48c", 0);
    line([[hx, hy - 21], [hx, hy - 2]], 0.8, "#c9b48c"); line([[hx - 11, hy - 42], [hx + 11, hy - 42]], 2.4, "#6f6252"); line([[hx - 11, hy + 1], [hx + 11, hy + 1]], 2.4, "#6f6252");
    const lx = bx1 - 16; poly(rect2(lx - 7, fy - 74, lx + 7, fy - 52), "rgba(247,241,223,.6)", 1.4); flameAt(c, lx, fy - 58, 0.32, t);
    poly(rect2(bx0 + 40, fy - 30, bx0 + 70, fy - 24), "#a8977a", 1.6); for (const dx of [44, 55, 66]) line([[bx0 + dx, fy - 24], [bx0 + dx + (dx - 55) * 0.2, fy]], 2.2);
  } });
  // Repairs: a mending bench with a vise, a riveted kettle, a cartwheel waiting for its spoke
  if (open("Repairs")) out.push({ depth: 1, draw: () => {
    const bx0 = FG.lx0 + 30, bx1 = x0 - 20;
    poly(rect2(bx0, gy - 48, bx1, gy - 40), "#8d7a62", 2.2); for (const x of [bx0 + 6, bx1 - 6]) line([[x, gy - 40], [x, gy]], 3, "#6f6252");
    poly(rect2(bx0 + 12, gy - 66, bx0 + 26, gy - 48), "#5f5b55", 1.6); line([[bx0 + 4, gy - 62], [bx0 + 34, gy - 62]], 2);
    ell(bx0 + 70, gy - 58, 12, 10, "#8d887f", 1.6); for (let k = 0; k < 4; k++) ell(bx0 + 62 + k * 5, gy - 58, 1, 1, "#e3dfd8"); line([[bx0 + 82, gy - 62], [bx0 + 90, gy - 70]], 2);
    const wx = bx1 - 10, wy = gy - 40; c.lineWidth = 3; c.strokeStyle = INK; c.beginPath(); c.arc(wx, wy, 34, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1.8; for (let k = 0; k < 8; k++) { if (k === 3) continue; const a = (k / 8) * Math.PI * 2; c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx + Math.cos(a) * 32, wy + Math.sin(a) * 32); c.stroke(); }
    ell(wx, wy, 6, 6, "#8d7a62", 1.4);
  } });
  return out;
}
const forgeBand = (i: number): [number, number, number, number] => i === 0 ? [FG.x0, 408, FG.x1, FG.gy] : i === 1 ? [FG.x0, FG.apex, FG.x1, 408] : [FG.lx0 - 20, 400, FG.x0, FG.gy];

// ---------- the Craft Hall: two workshops below, the illuminator above, the Camera Obscura on the ridge ----------
const CH = { w: 820, h: 760, gy: 660, x0: 196, x1: 644, wall: 24, mid: 420, fl: 452, eave: 300, apex: 168 };
const CRAFT_SPOTS: Spot[] = [
  { room: "the illuminator's desk", at: [0, 0], hot: [0, 0], name: "the illuminator's desk" },
  { room: "the Camera Obscura", at: [0, 0], hot: [0, 0], name: "the Camera Obscura" },
  { room: "the Kiln", at: [0, 0], hot: [0, 0], name: "the Kiln" },
  { room: "the Builder's Bench", at: [0, 0], hot: [0, 0], name: "the Builder's Bench" },
];
function craftStill(rooms: Rooms) {
  const open = (r: string) => r in rooms, { gy, x0, x1, wall, mid, fl, eave, apex } = CH, ix0 = x0 + wall, ix1 = x1 - wall, rx = (x0 + x1) / 2;
  c.fillStyle = "#d4cfc7"; c.fillRect(0, 0, CH.w, CH.h);
  for (let k = 0; k < 1000; k++) { c.fillStyle = "rgba(30,28,26,.06)"; c.fillRect(h2(k, 1) * CH.w, h2(k, 2) * CH.h, 1.4, 1.4); }
  poly([[0, gy + 4], [820, gy - 4], [820, 760], [0, 760]], "#bdb7ac", 2.4); hatch([[0, gy + 4], [820, gy - 4], [820, 760], [0, 760]], 6, "#8d887f");
  for (let k = 0; k < 30; k++) ell(h2(k, 5) * 820, gy + 24 + h2(k, 6) * 70, 4 + h2(k, 7) * 6, 2 + h2(k, 8) * 3, "#a8a196", 1);
  // inside walls, lime-washed, and the gable room under the roof
  poly(rect2(ix0, eave, ix1, gy), "#e6e1d7", 0);
  poly([[ix0, eave], [rx, apex + 28], [ix1, eave]], "#e9e5dc", 0);
  for (let r = 0; r < 14; r++) for (let q = 0; q < 8; q++) if (h2(r, q * 5) < 0.15) { const y = eave + 10 + r * 26, x = ix0 + 8 + q * 50 + (r % 2) * 25; if (y > gy - 20) continue; poly(rect2(x, y, x + 40, y + 18), "#dcd8d1", 1, "#9d988f"); }
  // the outer walls, cut through
  coursed(rect2(x0, eave, ix0, gy), x0, ix0, eave, gy); coursed(rect2(ix1, eave, x1, gy), ix1, x1, eave, gy);
  // the stone wall between the two workshops, with a doorway
  coursed(rect2(mid - 8, fl + 16, mid + 8, gy - 110), mid - 8, mid + 8, fl + 16, gy - 110, "#cfcac2");
  // the upper floor on its beams, and the cellar-less floor below
  poly(rect2(ix0, fl, ix1, fl + 16), "#a8977a", 2.2); for (let x = ix0 + 40; x < ix1; x += 64) poly(rect2(x - 7, fl + 16, x + 7, fl + 28), "#8d7a62", 1.6);
  poly(rect2(ix0, gy - 2, ix1, gy + 6), "#9d988f", 2);
  // the stair up the right-hand end, through a hatch
  for (let k = 0; k < 9; k++) { const y = gy - (k + 1) * ((gy - fl) / 9), x = ix1 - 96 + k * 10; poly(rect2(x, y, ix1, y + (gy - fl) / 9), k % 2 ? "#cfcac2" : "#d9d5ce", 1.2); }
  poly(rect2(ix1 - 50, fl, ix1, fl + 16), "#e6e1d7", 0);
  // windows: one to each workshop, one under the gable
  for (const [cx, y0, y1] of [[460, 360, 412]] as [number, number, number][]) {
    const W: Pt[] = [[cx - 20, y1], [cx - 20, y0 + 16], [cx, y0], [cx + 20, y0 + 16], [cx + 20, y1]]; poly(W, "#f4f2ed", 2.2); line([[cx, y0 + 2], [cx, y1]], 1.6); poly(rect2(cx - 24, y1, cx + 24, y1 + 6), "#cfcac2", 1.4);
  }
  // the roof, thatched, cut through
  const roof: Pt[] = [[x0 - 34, eave + 4], [rx, apex - 18], [x1 + 34, eave + 4], [x1 + 4, eave + 30], [rx, apex + 26], [x0 - 4, eave + 30]];
  poly(roof, "#d7d0c1", 2.6);
  clipTo(roof, () => { for (let k = 0; k < 240; k++) { const u = h2(k, 3), side = k % 2, x = side ? rx + u * (x1 + 34 - rx) : (x0 - 34) + u * (rx - x0 + 34), y = side ? apex - 18 + u * (eave + 4 - apex + 18) : eave + 4 - u * (eave + 4 - apex + 18); line([[x, y], [x + (side ? -4 : 4), y + 26]], 0.9, "#8f897d"); } });
  poly(roof, null, 2.6);
  // the Camera Obscura: a turret on the ridge, a lens and a tilted mirror at its top, a white table below
  if (open("the Camera Obscura")) {
    const tx0 = rx - 74, tx1 = rx + 74, ty0 = 60, ty1 = apex + 4;
    poly(rect2(tx0, ty0, tx1, ty1), "#e9e5dc", 0);
    coursed(rect2(tx0 - 14, ty0, tx0, ty1), tx0 - 14, tx0, ty0, ty1, "#cfcac2"); coursed(rect2(tx1, ty0, tx1 + 14, ty1), tx1, tx1 + 14, ty0, ty1, "#cfcac2");
    poly([[tx0 - 24, ty0 + 2], [rx, ty0 - 40], [tx1 + 24, ty0 + 2]], "#77736d", 2.4); hatch([[tx0 - 24, ty0 + 2], [rx, ty0 - 40], [tx1 + 24, ty0 + 2]], 4, "#4c4945");
    // the lens in its brass ring, and the mirror tilted to throw the view down
    ell(rx + 34, ty0 + 14, 10, 10, "#c9b48c", 2); ell(rx + 34, ty0 + 14, 5, 5, "#e9eef0", 1);
    line([[rx + 10, ty0 + 6], [rx + 36, ty0 + 30]], 3.2, "#8d887f");
    c.save(); c.globalAlpha = 0.25; c.fillStyle = "#f7f1df"; c.beginPath(); c.moveTo(rx + 24, ty0 + 20); c.lineTo(rx - 60, ty1 - 34); c.lineTo(rx + 16, ty1 - 34); c.closePath(); c.fill(); c.restore();
    // the round white table, with the Hollow upside down on it
    const tbx = rx - 22;
    ell(tbx, ty1 - 30, 40, 9, "#fbfaf6", 2); line([[tbx, ty1 - 22], [tbx, ty1]], 3);
    c.save(); c.beginPath(); c.ellipse(tbx, ty1 - 30, 38, 8, 0, 0, Math.PI * 2); c.clip();
    for (let k = 0; k < 7; k++) { const x = tbx - 30 + k * 10; poly([[x, ty1 - 32], [x - 4, ty1 - 26], [x + 4, ty1 - 26]], "#9d988f", 0.8); }
    line([[tbx - 36, ty1 - 30], [tbx + 36, ty1 - 30]], 1, "#9d988f"); poly([[tbx + 6, ty1 - 32], [tbx + 14, ty1 - 32], [tbx + 14, ty1 - 27], [tbx + 10, ty1 - 24], [tbx + 6, ty1 - 27]], "#cfcac2", 0.8);
    c.restore();
    // the ladder up through the roof
    for (const x of [rx - 44, rx - 24]) line([[x, eave + 140], [x + 6, ty1 - 6]], 2.6, "#6f6252");
    for (let k = 1; k < 9; k++) { const y = eave + 140 - k * ((eave + 140 - ty1) / 9); line([[rx - 44 + (eave + 140 - y) * 0.02, y], [rx - 24 + (eave + 140 - y) * 0.02, y]], 2, "#6f6252"); }
  } else chalkAt(rx, apex - 34);
  if (!open("the illuminator's desk")) chalkAt(rx - 10, fl - 12);
  if (!open("the Kiln")) chalkAt(300, gy - 10);
  if (!open("the Builder's Bench")) chalkAt(510, gy - 10);
}
function craftThings(rooms: Rooms, t: number): { depth: number; draw: () => void }[] {
  const open = (r: string) => r in rooms, out: { depth: number; draw: () => void }[] = [], { gy, fl, x0, wall } = CH, ix0 = x0 + wall;
  // the Kiln: a brick bottle kiln with its fire-mouth, a kick-wheel, shelves of pots
  if (open("the Kiln")) out.push({ depth: 1, draw: () => {
    const kx = 270, kw = 46;
    const K: Pt[] = [[kx - kw, gy], [kx - kw, gy - 80], [kx - kw + 8, gy - 112], [kx - 14, gy - 140], [kx - 14, gy - 168], [kx + 14, gy - 168], [kx + 14, gy - 140], [kx + kw - 8, gy - 112], [kx + kw, gy - 80], [kx + kw, gy]];
    poly(K, "#b8a08a", 2.4);
    clipTo(K, () => { for (let y = gy - 168; y < gy; y += 9) { const off = ((y / 9) % 2) * 7; for (let x = kx - kw - 10 + off; x < kx + kw; x += 14) poly(rect2(x, y + 1, x + 12, y + 8), null, 0.8, "#7a6450"); } });
    poly(K, null, 2.4);
    poly([[kx - 18, gy], [kx - 18, gy - 26], [kx, gy - 38], [kx + 18, gy - 26], [kx + 18, gy]], "#2a2724", 2);
    c.globalAlpha = 0.2; ell(kx, gy - 20, 40, 26, "#d2483a"); c.globalAlpha = 1; flameAt(c, kx, gy - 4, 0.55, t);
    for (let k = 0; k < 3; k++) { const ph = (t * 0.3 + k / 3) % 1; c.globalAlpha = 0.7 * (1 - ph); line([[kx - 4 + k * 4, gy - 172 - ph * 40], [kx + k * 4, gy - 186 - ph * 40], [kx - 4 + k * 4, gy - 198 - ph * 40]], 1.4, "#9d988f"); c.globalAlpha = 1; }
    // the kick-wheel, a pot turning on it
    const wx = 366, spin = Math.sin(t * 4) * 3;
    line([[wx, gy - 6], [wx, gy - 48]], 3); ell(wx, gy - 6, 26, 6, "#8d7a62", 2); ell(wx, gy - 48, 20, 5, "#a8977a", 2);
    poly([[wx - 9, gy - 50], [wx + 9, gy - 50], [wx + 12 + spin * 0.3, gy - 64], [wx + 7, gy - 78], [wx - 7, gy - 78], [wx - 12 - spin * 0.3, gy - 64]], "#c9b9a2", 1.8);
    // a shelf of fired pots
    const sy = gy - 124; poly(rect2(330, sy, 408, sy + 6), "#8d7a62", 1.8);
    for (let k = 0; k < 3; k++) { const px = 344 + k * 24, h = 18 + h2(k, 4) * 14; poly([[px - 8, sy], [px + 8, sy], [px + 10, sy - h * 0.6], [px + 5, sy - h], [px - 5, sy - h], [px - 10, sy - h * 0.6]], ["#cfc3b2", "#9d988f", "#e3dfd8"][k], 1.4); }
  } });
  // the Builder's Bench: a model of the Bothy in blocks, a box of bricks, chisels on the wall
  if (open("the Builder's Bench")) out.push({ depth: 1, draw: () => {
    const bx0 = 440, bx1 = 572;
    poly(rect2(bx0, gy - 56, bx1, gy - 48), "#8d7a62", 2.2); for (const x of [bx0 + 8, bx1 - 8]) line([[x, gy - 48], [x, gy]], 3, "#6f6252");
    // the model, block by block
    const mx = 480, my = gy - 56;
    for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) poly(rect2(mx - 28 + q * 14 + (r % 2) * 7, my - 10 - r * 10, mx - 16 + q * 14 + (r % 2) * 7, my - r * 10), (q + r) % 3 ? "#e3dfd8" : "#cfcac2", 1.2);
    poly([[mx - 32, my - 30], [mx + 2, my - 52], [mx + 34, my - 30]], "#9d988f", 1.6);
    for (let k = 0; k < 3; k++) ell(mx - 18 + k * 18, my - 62, 2, 2, "#5f5b55");
    poly(rect2(bx1 - 40, gy - 72, bx1 - 10, gy - 56), "#a8977a", 1.6); for (let k = 0; k < 4; k++) poly(rect2(bx1 - 36 + k * 6, gy - 78, bx1 - 32 + k * 6, gy - 72), "#e3dfd8", 0.8);
    line([[bx0 + 4, gy - 160], [bx1 - 4, gy - 160]], 3, "#6f6252");
    for (let k = 0; k < 5; k++) { const x = bx0 + 20 + k * 22; line([[x, gy - 158], [x, gy - 126]], 2.4, "#3a3733"); poly(rect2(x - 3, gy - 160, x + 3, gy - 144), "#8d7a62", 1); }
  } });
  // the illuminator's desk: a slanted desk under the window, pigments, pages drying on a cord
  if (open("the illuminator's desk")) out.push({ depth: 1, draw: () => {
    const dx = 300;
    poly([[dx - 50, fl - 70], [dx + 42, fl - 92], [dx + 46, fl - 82], [dx - 46, fl - 60]], "#8d7a62", 2.2);
    for (const x of [dx - 40, dx + 36]) line([[x, fl - 66], [x, fl]], 3, "#6f6252");
    const pg: Pt[] = [[dx - 34, fl - 74], [dx + 30, fl - 88], [dx + 34, fl - 78], [dx - 30, fl - 64]]; poly(pg, "#efe8da", 1.4);
    poly([[dx - 26, fl - 76], [dx - 14, fl - 79], [dx - 12, fl - 70], [dx - 24, fl - 67]], "#d2483a", 1); // a rubricated initial
    for (let k = 0; k < 3; k++) line([[dx - 8, fl - 80 + k * 4 - k * 0.6], [dx + 26, fl - 87 + k * 4]], 0.8, "#5f5b55");
    // pigments on a shelf, and a horn of ink
    poly(rect2(ix0 + 12, fl - 120, ix0 + 120, fl - 114), "#8d7a62", 1.6);
    ["#3a3733", "#9d988f", "#c9b48c", "#d2483a", "#e3dfd8", "#6f6b65"].forEach((col, k) => { const px = ix0 + 22 + k * 16; poly(rect2(px - 5, fl - 134, px + 5, fl - 120), "rgba(225,230,229,.7)", 1.1); poly(rect2(px - 4, fl - 128, px + 4, fl - 121), col, 0); });
    poly([[dx + 52, fl - 92], [dx + 60, fl - 92], [dx + 58, fl - 76], [dx + 54, fl - 76]], "#3a3733", 1.2);
    // pages pegged on a cord to dry
    const cy = CH.eave + 50; line([[488, cy], [604, cy + 6]], 1.2);
    for (let k = 0; k < 3; k++) { const px = 494 + k * 38, py = cy + 2 + k * 2; poly(rect2(px, py, px + 30, py + 40), "#efe8da", 1.4); line([[px + 15, py - 4], [px + 15, py + 4]], 2); for (let q = 0; q < 3; q++) line([[px + 5, py + 12 + q * 8], [px + 25, py + 12 + q * 8]], 0.8, "#8d887f"); }
  } });
  void gy;
  return out;
}
const craftBand = (i: number): [number, number, number, number] =>
  i === 0 ? [CH.x0, CH.apex, CH.x1, CH.fl] : i === 1 ? [CH.mid - 90, 0, CH.mid + 90, CH.apex - 6] : i === 2 ? [CH.x0, CH.fl + 16, CH.mid, CH.gy] : [CH.mid, CH.fl + 16, CH.x1, CH.gy];

// ---------- Bards' Lane: the Shadow Theatre's hall, the Song Cellar below it, and the lamp posts down the lane ----------
const BL = { w: 820, h: 740, gy: 560, x0: 300, x1: 600, wall: 24, cf: 704, eave: 300, apex: 176 };
const BARD_SPOTS: Spot[] = [
  { room: "the lamp posts", at: [0, 0], hot: [0, 0], name: "the lamp posts" },
  { room: "the Song Cellar", at: [0, 0], hot: [0, 0], name: "the Song Cellar" },
  { room: "the Shadow Theatre", at: [0, 0], hot: [0, 0], name: "the Shadow Theatre" },
];
const LAMPS = [70, 150, 230, 670, 750];
function bardsStill(rooms: Rooms) {
  const open = (r: string) => r in rooms, { gy, x0, x1, wall, cf, eave, apex } = BL, ix0 = x0 + wall, ix1 = x1 - wall, rx = (x0 + x1) / 2;
  c.fillStyle = "#cfcac2"; c.fillRect(0, 0, BL.w, BL.h);
  for (let k = 0; k < 1000; k++) { c.fillStyle = "rgba(30,28,26,.06)"; c.fillRect(h2(k, 1) * BL.w, h2(k, 2) * BL.h, 1.4, 1.4); }
  // the lane: cobbles along the top of the ground, and the earth cut through below
  poly([[0, gy], [820, gy], [820, 740], [0, 740]], "#bdb7ac", 2.4); hatch([[0, gy + 14], [820, gy + 14], [820, 740], [0, 740]], 6, "#8d887f");
  for (let x = 4; x < 820; x += 18) { if (x > x0 - 6 && x < x1 + 6) continue; ell(x + (h2(x, 1) - 0.5) * 4, gy + 6, 8, 5, "#d6d1c8", 1.2); }
  // inside the hall, and the cellar dug below it
  poly(rect2(ix0, eave, ix1, gy), "#e6e1d7", 0); poly([[ix0, eave], [rx, apex + 28], [ix1, eave]], "#e9e5dc", 0);
  poly(rect2(ix0, gy + 16, ix1, cf), "#d9d3c8", 0);
  // the cellar's brick vault
  if (open("the Song Cellar")) {
    const V: Pt[] = [[ix0, gy + 16], [ix1, gy + 16], [ix1, gy + 46]]; void V;
    c.save(); c.beginPath(); c.rect(ix0, gy + 16, ix1 - ix0, cf - gy - 16); c.clip();
    for (let r = 0; r < 8; r++) for (let q = 0; q < 14; q++) { const y = gy + 20 + r * 14, x = ix0 + q * 22 + (r % 2) * 11; poly(rect2(x, y, x + 20, y + 12), h2(r, q) < 0.25 ? "#c4b29e" : "#cfc0ad", 0.8, "#8d7a62"); }
    c.restore();
    c.beginPath(); c.moveTo(ix0, gy + 70); c.quadraticCurveTo(rx, gy + 6, ix1, gy + 70); c.lineTo(ix1, gy + 16); c.lineTo(ix0, gy + 16); c.closePath(); c.fillStyle = "#b8a08a"; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
  } else chalkAt(rx, cf - 12);
  // the walls, down into the cellar
  coursed(rect2(x0, eave, ix0, cf + 6), x0, ix0, eave, cf + 6); coursed(rect2(ix1, eave, x1, cf + 6), ix1, x1, eave, cf + 6);
  poly(rect2(ix0, gy, ix1, gy + 16), "#a8977a", 2.2); poly(rect2(ix0, cf, ix1, cf + 8), "#9d988f", 2);
  // a trap-door stair from the hall down to the cellar
  for (let k = 0; k < 7; k++) { const y = gy + 16 + k * ((cf - gy - 16) / 7), x = ix1 - 70 + k * 8; poly(rect2(x, y, ix1, y + (cf - gy - 16) / 7), k % 2 ? "#cfcac2" : "#d9d5ce", 1.1); }
  poly(rect2(ix1 - 74, gy, ix1, gy + 16), "#e6e1d7", 1);
  // the roof
  const roof: Pt[] = [[x0 - 30, eave + 4], [rx, apex - 18], [x1 + 30, eave + 4], [x1 + 4, eave + 30], [rx, apex + 26], [x0 - 4, eave + 30]];
  poly(roof, "#77736d", 2.6); clipTo(roof, () => { for (let y = apex - 20; y < eave + 34; y += 9) line([[0, y], [820, y]], 1, "#4c4945"); for (let y = apex - 20; y < eave + 34; y += 9) for (let x = (y / 9) % 2 ? 0 : 8; x < 820; x += 16) line([[x, y], [x, y + 9]], 0.8, "#4c4945"); }); poly(roof, null, 2.6);
  // a round window high in the gable
  ell(rx, apex + 74, 20, 20, "#f4f2ed", 2.2); line([[rx - 20, apex + 74], [rx + 20, apex + 74]], 1.4); line([[rx, apex + 54], [rx, apex + 94]], 1.4);
  if (!open("the Shadow Theatre")) chalkAt(rx, gy - 12);
  if (!open("the lamp posts")) chalkAt(150, gy - 8);
}
function bardsThings(rooms: Rooms, t: number): { depth: number; draw: () => void }[] {
  const open = (r: string) => r in rooms, out: { depth: number; draw: () => void }[] = [], { gy, x0, wall, cf } = BL, ix0 = x0 + wall, ix1 = BL.x1 - wall, rx = (x0 + BL.x1) / 2;
  // the lamp posts: one lit, with its poem hung below, for each poem written
  if (open("the lamp posts")) out.push({ depth: 1, draw: () => {
    LAMPS.forEach((lx, k) => {
      const lit = k < extra.poems;
      line([[lx, gy], [lx, gy - 150]], 4); poly(rect2(lx - 8, gy - 8, lx + 8, gy), "#6f6b65", 1.6);
      line([[lx, gy - 150], [lx + 18, gy - 150]], 3); line([[lx + 18, gy - 150], [lx + 18, gy - 142]], 1.6);
      const L: Pt[] = [[lx + 10, gy - 142], [lx + 26, gy - 142], [lx + 24, gy - 118], [lx + 12, gy - 118]];
      if (lit) { c.globalAlpha = 0.16; ell(lx + 18, gy - 130, 40, 34, "#d2483a"); c.globalAlpha = 1; }
      poly(L, lit ? "rgba(247,241,223,.95)" : "rgba(225,230,229,.5)", 1.8); poly([[lx + 8, gy - 142], [lx + 18, gy - 152], [lx + 28, gy - 142]], "#3a3733", 1.4);
      if (lit) { flameAt(c, lx + 18, gy - 122, 0.3, t + k);
        // the poem, on a page tied to the post
        const sway = Math.sin(t * 1.2 + k) * 2;
        line([[lx, gy - 96], [lx + 6 + sway, gy - 90]], 1);
        poly(rect2(lx + 2 + sway, gy - 90, lx + 26 + sway, gy - 58), "#efe8da", 1.4); for (let q = 0; q < 4; q++) line([[lx + 6 + sway, gy - 82 + q * 6], [lx + 22 + sway - (q % 2) * 6, gy - 82 + q * 6]], 0.8, "#5f5b55"); }
    });
    if (!extra.poems) { c.font = `italic 13px 'IM Fell English', Georgia, serif`; c.fillStyle = "#5f5b55"; c.textAlign = "center"; c.fillText("a lamp is lit for each poem", 150, gy - 170); }
  } });
  // the Song Cellar: a harp, a fiddle and a bodhrán, a gramophone and a crate of records, a barrel with a candle
  if (open("the Song Cellar")) out.push({ depth: 1, draw: () => {
    const fy = cf;
    // the harp
    const hx = ix0 + 30;
    c.lineWidth = 4; c.strokeStyle = "#6f6252"; c.beginPath(); c.moveTo(hx, fy - 4); c.lineTo(hx, fy - 100); c.quadraticCurveTo(hx + 30, fy - 112, hx + 58, fy - 92); c.lineTo(hx + 10, fy - 6); c.stroke();
    for (let k = 1; k < 8; k++) { const x = hx + k * 6; line([[x, fy - 100 + k * 1.5], [x, fy - 10 - k * 9]], 0.8, "#8d887f"); }
    // the fiddle and bow on the wall, and the bodhrán
    const fx = ix0 + 112, fyy = gy + 92;
    poly([[fx, fyy - 26], [fx + 8, fyy - 22], [fx + 6, fyy - 10], [fx + 10, fyy + 2], [fx + 4, fyy + 14], [fx - 4, fyy + 14], [fx - 10, fyy + 2], [fx - 6, fyy - 10], [fx - 8, fyy - 22]], "#8d6a48", 1.6);
    line([[fx, fyy - 26], [fx, fyy - 46]], 2.4, "#3a3733"); line([[fx + 18, fyy - 40], [fx + 6, fyy + 18]], 1.4);
    ell(ix0 + 220, fyy - 6, 18, 18, "#e3d9c6", 2); ell(ix0 + 220, fyy - 6, 14, 14, null, 1); line([[ix0 + 210, fyy + 14], [ix0 + 232, fyy + 22]], 2);
    // the gramophone on a crate of records
    const gx = ix0 + 168, gb = fy;
    poly(rect2(gx - 26, gb - 32, gx + 26, gb), "#a8977a", 2); for (let k = 0; k < 6; k++) line([[gx - 22 + k * 8, gb - 30], [gx - 22 + k * 8, gb - 4]], 2.2, "#3a3733");
    poly(rect2(gx - 20, gb - 52, gx + 20, gb - 32), "#6f6252", 1.8); ell(gx, gb - 54, 18, 4, "#2a2724", 1.4);
    c.lineWidth = 2; c.strokeStyle = INK; c.beginPath(); c.moveTo(gx + 10, gb - 54); c.quadraticCurveTo(gx + 16, gb - 80, gx + 40, gb - 96); c.stroke();
    poly([[gx + 34, gb - 92], [gx + 50, gb - 118], [gx + 66, gb - 102], [gx + 44, gb - 88]], "#c9b48c", 1.8);

    // a tune rising
    for (let k = 0; k < 3; k++) { const ph = (t * 0.35 + k / 3) % 1, nx = gx + 60 + Math.sin(ph * 6 + k) * 10, ny = gb - 110 - ph * 60; c.globalAlpha = 1 - ph; ell(nx, ny, 3.4, 2.6, "#3a3733"); line([[nx + 3, ny], [nx + 3, ny - 14]], 1.2); c.globalAlpha = 1; }
  } });
  // the Shadow Theatre: a paper screen lit from behind, puppets on rods, benches facing it, curtains tied back
  if (open("the Shadow Theatre")) out.push({ depth: 1, draw: () => {
    const sx0 = ix0 + 40, sx1 = ix1 - 40, sy0 = BL.eave + 20, sy1 = gy - 110;
    c.globalAlpha = 0.25; ell(rx, (sy0 + sy1) / 2, 140, 90, "#f7e6c6"); c.globalAlpha = 1;
    poly(rect2(sx0 - 8, sy0 - 8, sx1 + 8, sy1 + 8), "#6f6252", 2.4); poly(rect2(sx0, sy0, sx1, sy1), "#f6ecd6", 2);
    c.save(); c.beginPath(); c.rect(sx0, sy0, sx1 - sx0, sy1 - sy0); c.clip();
    const drift = Math.sin(t * 0.5) * 30;
    // a hare and a stag, cut from card, crossing the screen
    const hx = rx - 74 + drift, hy = sy1 - 30;
    c.fillStyle = "#2a2724"; c.beginPath(); c.ellipse(hx, hy, 18, 10, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(hx + 16, hy - 8, 7, 6, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(hx + 14, hy - 12); c.lineTo(hx + 12, hy - 32); c.lineTo(hx + 17, hy - 13); c.moveTo(hx + 18, hy - 12); c.lineTo(hx + 22, hy - 30); c.lineTo(hx + 21, hy - 12); c.fill();
    line([[hx, hy + 10], [hx - 4, sy1 + 10]], 1.4, "#2a2724");
    const dx = rx + 58 + drift, dy = sy1 - 40;
    c.beginPath(); c.ellipse(dx, dy, 22, 11, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(dx - 18, dy); c.lineTo(dx - 26, dy - 22); c.lineTo(dx - 20, dy - 24); c.lineTo(dx - 12, dy - 6); c.fill();
    for (const lx of [dx - 14, dx - 6, dx + 8, dx + 16]) { c.fillRect(lx, dy + 6, 3, 16); }
    line([[dx - 24, dy - 22], [dx - 34, dy - 40]], 1.6, "#2a2724"); line([[dx - 30, dy - 33], [dx - 38, dy - 34]], 1.6, "#2a2724"); line([[dx - 24, dy - 22], [dx - 16, dy - 42]], 1.6, "#2a2724");
    line([[dx, dy + 10], [dx + 6, sy1 + 10]], 1.4, "#2a2724");
    c.restore();
    // curtains, tied back with red cord
    for (const [cx, dir] of [[sx0 - 8, 1], [sx1 + 8, -1]] as [number, number][]) {
      const C2: Pt[] = [[cx, sy0 - 12], [cx + dir * 28, sy0 - 12], [cx + dir * 8, sy0 + 70], [cx + dir * 22, sy1 + 30], [cx, sy1 + 30]];
      poly(C2, "#5f5b55", 2); hatch(C2, 4, "#3d3934"); line([[cx + dir * 4, sy0 + 70], [cx + dir * 14, sy0 + 74]], 3, "#d2483a");
    }
    // benches, in rows, facing the screen
    for (let r = 0; r < 2; r++) { const by = gy - 18 - r * 26, bx0 = ix0 + 24 + r * 20, bx1 = ix1 - 90 - r * 20; poly(rect2(bx0, by - 8, bx1, by), "#8d7a62", 1.8); for (const x of [bx0 + 8, (bx0 + bx1) / 2, bx1 - 8]) line([[x, by], [x, by + 16 - r * 4]], 2.4, "#6f6252"); }
  } });
  return out;
}
const bardsBand = (i: number): [number, number, number, number] => i === 0 ? [0, BL.gy - 200, BL.w, BL.gy + 14] : i === 1 ? [BL.x0, BL.gy + 14, BL.x1, BL.cf + 10] : [BL.x0, BL.apex - 20, BL.x1, BL.gy];

// ---------- the Wildwood: a clearing in the wood, not a building. It follows the real seasons. ----------
// The Wort Garden on the left, the Glasshouse of finds on the right, a lone hawthorn between, the lake in front.
const WW = { w: 820, h: 640, gy: 470, lake: 500 };
const WILD_SPOTS: Spot[] = [
  { room: "the Wort Garden", at: [0, 0], hot: [0, 0], name: "the Wort Garden" },
  { room: "the Glasshouse", at: [0, 0], hot: [0, 0], name: "the Glasshouse" },
];
export type Season = "spring" | "summer" | "autumn" | "winter";
export function seasonOf(d: Date): Season { const m = d.getMonth(); return m >= 2 && m <= 4 ? "spring" : m >= 5 && m <= 7 ? "summer" : m >= 8 && m <= 10 ? "autumn" : "winter"; }
function pine(x: number, y: number, s: number, fill: string, snow: boolean) {
  const pts: Pt[] = [[x, y - 70 * s], [x - 9 * s, y - 52 * s], [x - 5 * s, y - 52 * s], [x - 15 * s, y - 32 * s], [x - 8 * s, y - 32 * s], [x - 20 * s, y - 8 * s], [x + 20 * s, y - 8 * s], [x + 8 * s, y - 32 * s], [x + 15 * s, y - 32 * s], [x + 5 * s, y - 52 * s], [x + 9 * s, y - 52 * s]];
  line([[x, y], [x, y - 8 * s]], 2.2 * s); poly(pts, fill, 1.8);
  if (snow) for (const [a, b] of [[0, 1], [3, 4], [5, 6]] as [number, number][]) { const p = pts[a], q = pts[b]; line([[p[0], p[1] + 1], [q[0], q[1] + 1]], 3 * s, "#fbfaf6"); }
}
function wildStill(rooms: Rooms) {
  const open = (r: string) => r in rooms, se = extra.season, snow = se === "winter", { gy, lake } = WW;
  c.fillStyle = snow ? "#dcd9d3" : "#d4cfc7"; c.fillRect(0, 0, WW.w, WW.h);
  for (let k = 0; k < 1000; k++) { c.fillStyle = "rgba(30,28,26,.05)"; c.fillRect(h2(k, 1) * WW.w, h2(k, 2) * WW.h, 1.4, 1.4); }
  // the far wood: dark, close-set, deepest behind
  for (let r = 0; r < 3; r++) for (let k = 0; k < 26; k++) {
    const x = -10 + k * 33 + (r % 2) * 16 + h2(k, r) * 10, y = 250 + r * 60 + h2(r, k) * 14, s = 1.3 - r * 0.15;
    if (r === 2 && x > 230 && x < 590) continue; // the clearing opens in front
    pine(x, y, s, r === 0 ? "#6f6b65" : r === 1 ? "#8d887f" : "#aaa59d", snow);
  }
  // the clearing's ground
  poly([[0, gy - 30], [200, gy - 18], [420, gy - 26], [640, gy - 16], [820, gy - 28], [820, lake + 20], [0, lake + 20]], snow ? "#f4f3ef" : se === "autumn" ? "#d9d0bf" : "#dcd8cd", 2.2);
  if (!snow) for (let k = 0; k < 120; k++) { const x = h2(k, 3) * 820, y = gy - 20 + h2(k, 4) * 46; c.strokeStyle = "#8f8a83"; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x - 1, y - 4); c.lineTo(x + 1, y); c.lineTo(x + 3, y - 5); c.stroke(); }
  // the lake, across the front
  poly([[0, lake + 6], [820, lake], [820, 640], [0, 640]], snow ? "#c9ccce" : "#b9b6b0", 2.4);
  for (let k = 0; k < 16; k++) { const x = 30 + h2(k, 9) * 760, y = lake + 30 + h2(k, 8) * 90; line([[x - 10, y], [x - 4, y - 2], [x + 2, y], [x + 8, y - 2]], 1.2, "#6d6862"); }
  if (snow) { poly([[0, lake + 6], [820, lake], [820, lake + 26], [500, lake + 34], [200, lake + 24], [0, lake + 30]], "#e9ecee", 1.4); for (let k = 0; k < 8; k++) line([[60 + k * 95, lake + 14], [80 + k * 95, lake + 24]], 1, "#9d988f"); }
  // reeds at the water's edge
  for (const [x0, n] of [[20, 9], [690, 10]] as [number, number][]) for (let k = 0; k < n; k++) { const x = x0 + k * 11, h = 34 + h2(k, x0) * 26; line([[x, lake + 16], [x + 3, lake + 16 - h]], 1.4, snow ? "#9d988f" : "#6d6862"); if (k % 3 === 0) poly([[x + 1, lake + 10 - h], [x + 5, lake + 10 - h], [x + 5, lake + 22 - h], [x + 1, lake + 22 - h]], "#6f6252", 0.8); }
  if (!open("the Wort Garden")) chalkAt(200, gy - 8);
  if (!open("the Glasshouse")) chalkAt(620, gy - 8);
}
function hawthorn(x: number, y: number, se: Season, t: number) {
  // a lone thorn: never cut, it belongs to the good people
  c.lineWidth = 7; c.strokeStyle = INK; c.lineCap = "round";
  const limbs: [number, number, number, number][] = [[0, 0, -6, -60], [-6, -60, -40, -96], [-6, -60, 26, -104], [26, -104, 56, -120], [-40, -96, -62, -110], [26, -104, 14, -136], [-40, -96, -30, -128]];
  for (const [a, b, c2, d] of limbs) { c.beginPath(); c.moveTo(x + a, y + b); c.lineTo(x + c2, y + d); c.stroke(); }
  c.lineWidth = 4; c.strokeStyle = "#5f5b55"; for (const [a, b, c2, d] of limbs) { c.beginPath(); c.moveTo(x + a, y + b); c.lineTo(x + c2, y + d); c.stroke(); }
  const crown: Pt[] = [[x - 70, y - 104], [x - 46, y - 140], [x, y - 152], [x + 48, y - 146], [x + 72, y - 118], [x + 40, y - 92], [x - 30, y - 88]];
  if (se === "winter") { for (const [a, b, c2, d] of limbs.slice(1)) line([[x + c2 - 4, y + d - 2], [x + c2 + 4, y + d - 4]], 3, "#fbfaf6"); return; }
  const leaf = se === "autumn" ? "rgba(143,136,128,.55)" : "rgba(125,120,113,.75)";
  for (let k = 0; k < 26; k++) { const px = x - 60 + h2(k, 7) * 126, py = y - 148 + h2(k, 8) * 58; ell(px, py, 9, 6, leaf); }
  for (let k = 0; k < 26; k++) { const px = x - 60 + h2(k, 17) * 126, py = y - 148 + h2(k, 18) * 58; c.beginPath(); c.ellipse(px, py, 8, 5, 0, 0, Math.PI * 2); c.strokeStyle = "#3d3934"; c.lineWidth = 0.9; c.stroke(); }
  void crown;
  if (se === "spring") for (let k = 0; k < 40; k++) ell(x - 62 + h2(k, 27) * 130, y - 150 + h2(k, 28) * 60, 2.4, 2.4, "#fbfaf6", 0.6);
  if (se === "autumn") { for (let k = 0; k < 22; k++) ell(x - 58 + h2(k, 37) * 120, y - 146 + h2(k, 38) * 56, 2.6, 2.6, RED_HAW, 0.6);
    for (let k = 0; k < 4; k++) { const ph = (t * 0.12 + k / 4) % 1; ell(x - 40 + k * 26 + Math.sin(t + k) * 10, y - 100 + ph * 104, 4, 2.4, "#9d988f", 0.8); } }
}
const RED_HAW = "#d2483a";
function wildThings(rooms: Rooms, t: number): { depth: number; draw: () => void }[] {
  const open = (r: string) => r in rooms, se = extra.season, snow = se === "winter", out: { depth: number; draw: () => void }[] = [], { gy, lake } = WW;
  out.push({ depth: 0, draw: () => hawthorn(420, gy - 22, se, t) });
  // the Wort Garden: wattle-edged beds, a bee skep, a water butt, a scarecrow
  if (open("the Wort Garden")) out.push({ depth: 1, draw: () => {
    for (let b = 0; b < 3; b++) {
      const bx0 = 60 + b * 78, bx1 = bx0 + 66, by = gy - 4 + (b % 2) * 6;
      poly(rect2(bx0, by - 16, bx1, by), "#a8977a", 1.8); for (let x = bx0 + 4; x < bx1; x += 7) line([[x, by - 16], [x + 3, by]], 0.9, "#6f6252");
      poly(rect2(bx0 + 2, by - 20, bx1 - 2, by - 16), snow ? "#fbfaf6" : "#6f6252", 1.2);
      if (!snow) for (let k = 0; k < 5; k++) {
        const px = bx0 + 9 + k * 12, base = by - 20;
        if (se === "spring") { line([[px, base], [px, base - 7]], 1.2, "#5f5b55"); ell(px - 3, base - 8, 3, 1.6, "#9d988f"); ell(px + 3, base - 8, 3, 1.6, "#9d988f"); }
        else if (se === "summer") { line([[px, base], [px, base - 20]], 1.2, "#5f5b55"); for (let q = 0; q < 3; q++) ell(px + (q % 2 ? 4 : -4), base - 6 - q * 5, 4, 2.2, "#8d887f", 0.6); if (b === 1) ell(px, base - 22, 3, 3, "#fbfaf6", 0.8); }
        else { if (b === 2 && k % 2 === 0) ell(px, base - 6, 7, 6, "#c9b48c", 1.2); else { line([[px, base], [px - 3, base - 12]], 1.1, "#8d887f"); line([[px, base], [px + 4, base - 10]], 1.1, "#8d887f"); } }
      }
    }
    // the skep on its stand, bees about it in summer
    const sx = 300, sy = gy - 26;
    line([[sx - 14, gy], [sx - 14, sy]], 2.4); line([[sx + 14, gy], [sx + 14, sy]], 2.4); poly(rect2(sx - 20, sy - 4, sx + 20, sy), "#8d7a62", 1.6);
    const sk: Pt[] = [[sx - 18, sy - 4], [sx - 18, sy - 18], [sx - 12, sy - 32], [sx, sy - 38], [sx + 12, sy - 32], [sx + 18, sy - 18], [sx + 18, sy - 4]]; poly(sk, "#d7d0c1", 1.8);
    for (let k = 1; k < 5; k++) line([[sx - 18 + k * 1.5, sy - 4 - k * 7], [sx + 18 - k * 1.5, sy - 4 - k * 7]], 1, "#8f897d");
    if (snow) line([[sx - 12, sy - 34], [sx + 12, sy - 34]], 4, "#fbfaf6");
    ell(sx, sy - 8, 4, 3, "#3a3733");
    if (se === "summer") for (let k = 0; k < 5; k++) { const a = t * 2 + k * 1.3; ell(sx + Math.cos(a) * 26, sy - 22 + Math.sin(a * 1.4) * 14, 1.8, 1.4, "#3a3733"); }
    // the scarecrow in an old coat
    const cx = 30, cy = gy - 10;
    line([[cx, cy], [cx, cy - 90]], 3); line([[cx - 26, cy - 66], [cx + 26, cy - 66]], 3);
    poly([[cx - 22, cy - 68], [cx + 22, cy - 68], [cx + 16, cy - 30], [cx - 16, cy - 30]], "#6f6b65", 1.6); ell(cx, cy - 82, 9, 10, "#d7d0c1", 1.6); poly([[cx - 14, cy - 88], [cx + 14, cy - 88], [cx + 8, cy - 100], [cx - 8, cy - 100]], "#3a3733", 1.4);
    // the gatepost, with a turnip lantern at Samhain
    const gx = 340; poly(rect2(gx - 5, gy - 54, gx + 5, gy), "#8d7a62", 1.6);
    if (extra.samhain) { ell(gx, gy - 64, 11, 10, "#e3dfd8", 1.6); poly([[gx - 5, gy - 66], [gx - 2, gy - 70], [gx - 1, gy - 64]], "#3a3733", 0.8); poly([[gx + 1, gy - 64], [gx + 2, gy - 70], [gx + 5, gy - 66]], "#3a3733", 0.8); line([[gx - 5, gy - 60], [gx, gy - 58], [gx + 5, gy - 60]], 1.2); c.globalAlpha = 0.25; ell(gx, gy - 62, 22, 20, "#d2483a"); c.globalAlpha = 1; }
  } });
  // the Glasshouse: leaded panes on a hazel frame, and shelves of finds under bell jars
  if (open("the Glasshouse")) out.push({ depth: 1, draw: () => {
    const x0 = 520, x1 = 740, y1 = gy - 2, y0 = gy - 150, peak = gy - 196;
    const body = rect2(x0, y0, x1, y1);
    poly(body, "rgba(236,240,238,.55)", 2.6);
    // shelves of finds
    const finds = extra.finds.slice(-12);
    for (let s2 = 0; s2 < 2; s2++) {
      const sy = y0 + 60 + s2 * 56; poly(rect2(x0 + 10, sy, x1 - 10, sy + 5), "#8d7a62", 1.4);
      for (let k = 0; k < 6; k++) {
        const kind = finds[s2 * 6 + k]; const jx = x0 + 30 + k * 32, jb = sy;
        if (!kind) { if (s2 * 6 + k === finds.length) { c.setLineDash([2, 3]); poly([[jx - 10, jb], [jx + 10, jb], [jx + 10, jb - 24], [jx, jb - 30], [jx - 10, jb - 24]], null, 1, "#9d988f"); c.setLineDash([]); } continue; }
        specimen(kind, jx, jb);
        poly([[jx - 11, jb], [jx + 11, jb], [jx + 11, jb - 24], [jx + 6, jb - 30], [jx - 6, jb - 30], [jx - 11, jb - 24]], "rgba(225,230,229,.35)", 1.3); ell(jx, jb - 32, 3, 2.4, "rgba(225,230,229,.6)", 1);
      }
    }
    // the leading, the frame, the glass roof
    for (let x = x0 + 22; x < x1; x += 22) line([[x, y0], [x, y1]], 1, "#6d6862");
    for (let y = y0 + 30; y < y1; y += 30) line([[x0, y], [x1, y]], 0.8, "#6d6862");
    poly(body, null, 2.6); for (const x of [x0, x1]) line([[x, y1], [x, y0]], 4, "#8d7a62");
    const roof: Pt[] = [[x0 - 10, y0], [(x0 + x1) / 2, peak], [x1 + 10, y0]]; poly(roof, "rgba(242,245,243,.7)", 2.4);
    for (let k = 1; k < 8; k++) { const u = k / 8; line([[x0 - 10 + u * (x1 - x0 + 20), y0], [(x0 + x1) / 2, peak]], 0.8, "#6d6862"); }
    if (snow) { poly([[x0 - 12, y0 - 2], [(x0 + x1) / 2, peak - 4], [x1 + 12, y0 - 2], [x1 - 10, y0 - 8], [(x0 + x1) / 2, peak + 8], [x0 + 10, y0 - 8]], "#fbfaf6", 1.4); }
    // a door of glass, ajar
    poly(rect2(x0 + 8, y1 - 74, x0 + 40, y1), "rgba(236,240,238,.6)", 1.8); ell(x0 + 34, y1 - 38, 2, 2, "#c9b48c");
    if (!finds.length) { c.font = `italic 12px 'IM Fell English', Georgia, serif`; c.fillStyle = "#5f5b55"; c.textAlign = "center"; c.fillText("a jar for each find", (x0 + x1) / 2, y0 + 30); }
  } });
  // the heron at the water, and geese going over in autumn
  out.push({ depth: 2, draw: () => {
    const hx = 640, hy = lake + 40;
    line([[hx, hy], [hx - 2, hy - 30]], 1.6); line([[hx + 4, hy], [hx + 3, hy - 30]], 1.6);
    poly([[hx - 12, hy - 30], [hx + 16, hy - 32], [hx + 10, hy - 52], [hx - 4, hy - 50]], "#bdb8b0", 1.6);
    c.lineWidth = 2.4; c.strokeStyle = INK; c.beginPath(); c.moveTo(hx + 8, hy - 50); c.quadraticCurveTo(hx + 2, hy - 66, hx + 10, hy - 76); c.stroke(); ell(hx + 12, hy - 78, 5, 4, "#bdb8b0", 1.4); line([[hx + 16, hy - 78], [hx + 30, hy - 76]], 1.8);
    if (se === "autumn") for (let k = 0; k < 5; k++) { const gx = ((t * 18 + k * 18) % 900) - 40, gyy = 80 + Math.abs(k - 2) * 12; line([[gx - 6, gyy + 2], [gx, gyy], [gx + 6, gyy + 2]], 1.6); }
    if (snow) for (let k = 0; k < 40; k++) { const ph = (t * 0.05 + h2(k, 3)) % 1; ell(h2(k, 1) * 820 + Math.sin(t + k) * 6, ph * 640, 1.6, 1.6, "#fbfaf6"); }
    if (extra.samhain) for (let k = 0; k < 6; k++) { const wx = ((t * 6 + k * 150) % 980) - 80, wy = gy - 30 - (k % 3) * 18; c.globalAlpha = 0.6; ell(wx, wy, 90, 10, "#f4f2ed"); c.globalAlpha = 1; }
  } });
  return out;
}
function specimen(kind: string, x: number, b: number) {
  if (kind === "bird") { poly([[x - 2, b - 2], [x + 2, b - 2], [x + 5, b - 18], [x + 1, b - 26], [x - 3, b - 18]], "#e3dfd8", 1); line([[x, b - 2], [x + 1, b - 24]], 0.8); }
  else if (kind === "plant") { poly([[x, b - 2], [x - 7, b - 12], [x, b - 24], [x + 7, b - 12]], "#9d988f", 1); line([[x, b - 2], [x, b - 22]], 0.8); }
  else if (kind === "flower") { line([[x, b - 2], [x, b - 16]], 1); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ell(x + Math.cos(a) * 4, b - 20 + Math.sin(a) * 4, 2.6, 2.6, "#fbfaf6", 0.8); } ell(x, b - 20, 2, 2, "#c9b48c"); }
  else if (kind === "creature") { ell(x, b - 12, 3, 7, "#3a3733"); poly([[x - 2, b - 12], [x - 10, b - 20], [x - 8, b - 8]], "#bdb8b0", 0.9); poly([[x + 2, b - 12], [x + 10, b - 20], [x + 8, b - 8]], "#bdb8b0", 0.9); }
  else if (kind === "stone") { ell(x, b - 6, 8, 5, "#aaa59d", 1.2); ell(x - 2, b - 7, 2, 2, "#5f5b55"); }
  else { ell(x, b - 6, 9, 5, "#a8977a", 1); for (let k = 0; k < 3; k++) ell(x - 4 + k * 4, b - 9, 2.2, 3, "#ece8e0", 0.8); }
}
const wildBand = (i: number): [number, number, number, number] => i === 0 ? [0, 280, 380, WW.lake + 20] : [480, 260, 820, WW.lake + 20];

// ---------- the shared frame ----------
type Scene = {
  spots: Spot[]; still: (r: Rooms) => void; things: (r: Rooms, t: number) => { depth: number; draw: () => void }[]; front: () => void;
  size?: [number, number]; // a front-on scene has its own size; isometric ones share the yard's
  shift?: number; // move the drawing down, for scenes that stand taller than the yard
  hit?: (x: number, y: number) => number; stand?: (i: number) => [number, number, number]; labelAt?: (i: number) => Pt;
};
const SCENES: Partial<Record<BuildingId, Scene>> = {
  "stone-field": { spots: STONE_FIELD, still: stoneFieldStill, things: stoneFieldThings, front: stoneFieldFront },
  "forge": {
    spots: FORGE_SPOTS, still: forgeStill, things: forgeThings, front: () => {}, size: [FG.w, FG.h],
    hit: (x, y) => [0, 1, 2].find((i) => { const [a, b, c2, d] = forgeBand(i); return x >= a && x <= c2 && y >= b && y <= d; }) ?? -1,
    stand: (i) => i === 0 ? [505, FG.gy, 0.6] : i === 1 ? [FG.x0 + 120, 392, 0.6] : [FG.lx0 + 80, FG.gy, 0.6],
    labelAt: (i) => i === 0 ? [FG.x0 + 110, 432] : i === 1 ? [FG.x0 + 110, 280] : [FG.lx0 + 100, 380],
  },
  "craft-hall": {
    spots: CRAFT_SPOTS, still: craftStill, things: craftThings, front: () => {}, size: [CH.w, CH.h],
    hit: (x, y) => [1, 0, 2, 3].find((i) => { const [a, b, c2, d] = craftBand(i); return x >= a && x <= c2 && y >= b && y <= d; }) ?? -1,
    // (the turret is checked first, so a tap on it isn't taken by the room below)
    stand: (i) => i === 0 ? [CH.x0 + 270, CH.fl, 0.6] : i === 1 ? [(CH.x0 + CH.x1) / 2 + 46, CH.apex + 4, 0.45] : i === 2 ? [CH.x0 + 150, CH.gy, 0.6] : [CH.mid + 150, CH.gy, 0.6],
    labelAt: (i) => i === 0 ? [CH.x0 + 330, CH.eave + 14] : i === 1 ? [(CH.x0 + CH.x1) / 2 + 150, 40] : i === 2 ? [CH.x0 + 110, CH.fl + 46] : [CH.mid + 110, CH.fl + 46],
  },
  "bards-lane": {
    spots: BARD_SPOTS, still: bardsStill, things: bardsThings, front: () => {}, size: [BL.w, BL.h],
    hit: (x, y) => ([2, 1].find((i) => { const [a, b, c2, d] = bardsBand(i); return x >= a && x <= c2 && y >= b && y <= d; }) ?? ((y >= BL.gy - 200 && y <= BL.gy + 14) ? 0 : -1)),
    stand: (i) => i === 0 ? [190, BL.gy, 0.6] : i === 1 ? [BL.x0 + 118, BL.cf, 0.55] : [BL.x1 - 90, BL.gy, 0.6],
    labelAt: (i) => i === 0 ? [150, BL.gy - 200] : i === 1 ? [(BL.x0 + BL.x1) / 2 + 40, BL.gy + 34] : [(BL.x0 + BL.x1) / 2, BL.eave - 4],
  },
  "wildwood": {
    spots: WILD_SPOTS, still: wildStill, things: wildThings, front: () => {}, size: [WW.w, WW.h],
    hit: (x, y) => [0, 1].find((i) => { const [a, b, c2, d] = wildBand(i); return x >= a && x <= c2 && y >= b && y <= d; }) ?? -1,
    stand: (i) => i === 0 ? [250, WW.gy + 4, 0.6] : [470, WW.gy + 4, 0.6],
    labelAt: (i) => i === 0 ? [180, WW.gy - 150] : [630, WW.gy - 216],
  },
  "ogham-tower": {
    spots: TOWER_SPOTS, still: towerStill, things: towerThings, front: () => {}, size: [TOWER.w, TOWER.h],
    hit: (x, y) => (x < TOWER.x0 - 40 || x > TOWER.x1 + 40 ? -1 : [0, 1, 2].find((i) => { const [a, b] = towerBand(i); return y >= a - 10 && y <= b + 10; }) ?? -1),
    stand: (i) => [i === 2 ? 300 : 330, towerBand(i)[1], 0.62],
    labelAt: (i) => [TOWER.x0 + 110, towerBand(i)[0] + 16],
  },
};
export const hasScene = (id: BuildingId) => !!SCENES[id];
export const sceneRooms = (id: BuildingId) => SCENES[id]?.spots.map((s) => s.room) ?? [];

let raf = 0;
export function attachInterior(cv: HTMLCanvasElement, id: BuildingId, rooms: Rooms, selected: number, look: GuiserOpts, onTap: (i: number) => void, labels: boolean, counts: Counts = extra) {
  const finished = counts.finished;
  // a newly finished book rings the bell
  if (lastFinished >= 0 && finished > lastFinished) ringAt = performance.now();
  lastFinished = finished; extra = { ...counts };
  cancelAnimationFrame(raf);
  const sc = SCENES[id]; if (!sc) return;
  const DPR = Math.min(2, devicePixelRatio || 1), ctx = cv.getContext("2d")!;
  const [W, H] = sc.size ?? [VW, VH];
  cv.style.maxWidth = `min(100%, calc((100dvh - 330px) * ${(W / H).toFixed(3)}))`;
  const still = document.createElement("canvas"); still.width = W * DPR; still.height = H * DPR;
  const shift = sc.shift ?? 0;
  c = still.getContext("2d")!; c.scale(DPR, DPR); c.fillStyle = "#d4cfc7"; c.fillRect(0, 0, W, H); c.translate(0, shift); sc.still(rooms);
  let scale = 1, rect = cv.getBoundingClientRect();
  const size = () => { rect = cv.getBoundingClientRect(); scale = rect.width / W; cv.width = rect.width * DPR; cv.height = Math.round(H * scale) * DPR; cv.style.height = Math.round(H * scale) + "px"; rect = cv.getBoundingClientRect(); };
  size(); const onResize = () => size(); addEventListener("resize", onResize);
  cv.onpointerdown = (e) => {
    const wx = (e.clientX - rect.left) / scale, wy = (e.clientY - rect.top) / scale - shift;
    let best = -1, bd = 120;
    if (sc.hit) best = sc.hit(wx, wy);
    else sc.spots.forEach((s, i) => { const [x, y] = P(s.hot[0], s.hot[1]); const d = Math.hypot(wx - x, (wy - (y - 30)) * 0.9); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) onTap(best);
  };
  const sel = Math.min(selected, sc.spots.length - 1), spot = sc.spots[sel];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const frame = (now: number) => {
    if (!cv.isConnected) { removeEventListener("resize", onResize); return; }
    const t = reduce ? 0 : now / 1000;
    ctx.setTransform(DPR * scale, 0, 0, DPR * scale, 0, 0);
    ctx.drawImage(still, 0, 0, W, H); ctx.translate(0, shift); c = ctx;
    const [sx, sy, ss] = sc.stand ? sc.stand(sel) : [...P(spot.at[0], spot.at[1]), 0.5];
    const items = [...sc.things(rooms, t), { depth: sc.stand ? 99 : spot.at[0] + spot.at[1], draw: () => { c.beginPath(); c.ellipse(sx, sy + 2, 52 * ss, 18 * ss, 0, 0, Math.PI * 2); c.strokeStyle = "#d2483a"; c.lineWidth = 2; c.stroke(); drawScath(c, sx, sy, ss, t, look, false, 0, 1); } }];
    items.sort((a, b) => a.depth - b.depth).forEach((o) => o.draw());
    sc.front();
    if (labels) sc.spots.forEach((s, i) => { const at: Pt = sc.labelAt ? sc.labelAt(i) : ((p) => [p[0], p[1] - 96] as Pt)(P(s.hot[0], s.hot[1])); tag(s.name, at, !(s.room in rooms)); });
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

