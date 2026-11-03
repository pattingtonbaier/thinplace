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
let extra = { finished: 0 }, ringAt = 0, lastFinished = -1;
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

// ---------- the shared frame ----------
type Scene = {
  spots: Spot[]; still: (r: Rooms) => void; things: (r: Rooms, t: number) => { depth: number; draw: () => void }[]; front: () => void;
  size?: [number, number]; // a front-on scene has its own size; isometric ones share the yard's
  hit?: (x: number, y: number) => number; stand?: (i: number) => [number, number, number]; labelAt?: (i: number) => Pt;
};
const SCENES: Partial<Record<BuildingId, Scene>> = {
  "stone-field": { spots: STONE_FIELD, still: stoneFieldStill, things: stoneFieldThings, front: stoneFieldFront },
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
export function attachInterior(cv: HTMLCanvasElement, id: BuildingId, rooms: Rooms, selected: number, look: GuiserOpts, onTap: (i: number) => void, labels: boolean, finished = 0) {
  // a newly finished book rings the bell
  if (lastFinished >= 0 && finished > lastFinished) ringAt = performance.now();
  lastFinished = finished; extra = { finished };
  cancelAnimationFrame(raf);
  const sc = SCENES[id]; if (!sc) return;
  const DPR = Math.min(2, devicePixelRatio || 1), ctx = cv.getContext("2d")!;
  const [W, H] = sc.size ?? [VW, VH];
  cv.style.maxWidth = `min(100%, calc((100dvh - 330px) * ${(W / H).toFixed(3)}))`;
  const still = document.createElement("canvas"); still.width = W * DPR; still.height = H * DPR;
  c = still.getContext("2d")!; c.scale(DPR, DPR); sc.still(rooms);
  let scale = 1, rect = cv.getBoundingClientRect();
  const size = () => { rect = cv.getBoundingClientRect(); scale = rect.width / W; cv.width = rect.width * DPR; cv.height = Math.round(H * scale) * DPR; cv.style.height = Math.round(H * scale) + "px"; rect = cv.getBoundingClientRect(); };
  size(); const onResize = () => size(); addEventListener("resize", onResize);
  cv.onpointerdown = (e) => {
    const wx = (e.clientX - rect.left) / scale, wy = (e.clientY - rect.top) / scale;
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
    ctx.drawImage(still, 0, 0, W, H); c = ctx;
    const [sx, sy, ss] = sc.stand ? sc.stand(sel) : [...P(spot.at[0], spot.at[1]), 0.5];
    const items = [...sc.things(rooms, t), { depth: sc.stand ? 99 : spot.at[0] + spot.at[1], draw: () => { c.beginPath(); c.ellipse(sx, sy + 2, 52 * ss, 18 * ss, 0, 0, Math.PI * 2); c.strokeStyle = "#d2483a"; c.lineWidth = 2; c.stroke(); drawScath(c, sx, sy, ss, t, look, false, 0, 1); } }];
    items.sort((a, b) => a.depth - b.depth).forEach((o) => o.draw());
    sc.front();
    if (labels) sc.spots.forEach((s, i) => { const at: Pt = sc.labelAt ? sc.labelAt(i) : ((p) => [p[0], p[1] - 96] as Pt)(P(s.hot[0], s.hot[1])); tag(s.name, at, !(s.room in rooms)); });
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

