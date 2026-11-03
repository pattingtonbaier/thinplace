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

// ---------- the shared frame ----------
type Scene = { spots: Spot[]; still: (r: Rooms) => void; things: (r: Rooms, t: number) => { depth: number; draw: () => void }[]; front: () => void };
const SCENES: Partial<Record<BuildingId, Scene>> = {
  "stone-field": { spots: STONE_FIELD, still: stoneFieldStill, things: stoneFieldThings, front: stoneFieldFront },
};
export const hasScene = (id: BuildingId) => !!SCENES[id];
export const sceneRooms = (id: BuildingId) => SCENES[id]?.spots.map((s) => s.room) ?? [];

let raf = 0;
export function attachInterior(cv: HTMLCanvasElement, id: BuildingId, rooms: Rooms, selected: number, look: GuiserOpts, onTap: (i: number) => void, labels: boolean) {
  cancelAnimationFrame(raf);
  const sc = SCENES[id]; if (!sc) return;
  const DPR = Math.min(2, devicePixelRatio || 1), ctx = cv.getContext("2d")!;
  const still = document.createElement("canvas"); still.width = VW * DPR; still.height = VH * DPR;
  c = still.getContext("2d")!; c.scale(DPR, DPR); sc.still(rooms);
  let scale = 1, rect = cv.getBoundingClientRect();
  const size = () => { rect = cv.getBoundingClientRect(); scale = rect.width / VW; cv.width = rect.width * DPR; cv.height = Math.round(VH * scale) * DPR; cv.style.height = Math.round(VH * scale) + "px"; rect = cv.getBoundingClientRect(); };
  size(); const onResize = () => size(); addEventListener("resize", onResize);
  cv.onpointerdown = (e) => {
    const wx = (e.clientX - rect.left) / scale, wy = (e.clientY - rect.top) / scale;
    let best = -1, bd = 120;
    sc.spots.forEach((s, i) => { const [x, y] = P(s.hot[0], s.hot[1]); const d = Math.hypot(wx - x, (wy - (y - 30)) * 0.9); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) onTap(best);
  };
  const spot = sc.spots[Math.min(selected, sc.spots.length - 1)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const frame = (now: number) => {
    if (!cv.isConnected) { removeEventListener("resize", onResize); return; }
    const t = reduce ? 0 : now / 1000;
    ctx.setTransform(DPR * scale, 0, 0, DPR * scale, 0, 0);
    ctx.drawImage(still, 0, 0, VW, VH); c = ctx;
    const items = [...sc.things(rooms, t), { depth: spot.at[0] + spot.at[1], draw: () => { const [x, y] = P(spot.at[0], spot.at[1]); c.beginPath(); c.ellipse(x, y + 2, 26, 9, 0, 0, Math.PI * 2); c.strokeStyle = "#d2483a"; c.lineWidth = 2; c.stroke(); drawScath(c, x, y, 0.5, t, look, false, 0, 1); } }];
    items.sort((a, b) => a.depth - b.depth).forEach((o) => o.draw());
    sc.front();
    if (labels) sc.spots.forEach((s) => { const [x, y] = P(s.hot[0], s.hot[1]); tag(s.name, [x, y - 96], !(s.room in rooms)); });
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}
// keep flameAt referenced for scenes that use fire (the Forge next)
void flameAt;
