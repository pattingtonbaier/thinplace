// Inside the Bothy: an isometric cutaway you walk around. The far walls stand, the near walls are cut
// to their footings. Each part of the house is a room; a room you haven't used yet is drawn unbuilt.
import type { GuiserOpts } from "./art";
import { drawScath } from "./iso";
import { flameAt } from "./table";

type Pt = [number, number];
type C = CanvasRenderingContext2D;
type Rooms = Record<string, number>;
const INK = "#1e1c1a", RED = "#d2483a", WHITE = "#f7f5f1";
const FELL_SC = "'IM Fell English SC', 'IM Fell English', Georgia, serif";

export type Station = { id: string; room: string; at: Pt; name: string };
export const STATIONS: Station[] = [
  { id: "desk", room: "the hearth desk", at: [2.3, -1.55], name: "the hearth desk" },
  { id: "cauldron", room: "the Cauldron", at: [0.75, -1.9], name: "the Cauldron" },
  { id: "hearth", room: "the hearth", at: [-0.35, -1.85], name: "the hearth" },
  { id: "tobar", room: "the Tobar", at: [-1.0, -2.4], name: "the back door, out to the Tobar" },
  { id: "nook", room: "the Scriptorium nook", at: [-2.15, -1.95], name: "the Scriptorium nook" },
  { id: "loft", room: "the Dreaming Loft", at: [-0.45, -0.25], name: "the ladder to the Dreaming Loft" },
  { id: "seat", room: "the window seat", at: [-2.1, 1.65], name: "the window seat" },
  { id: "pen", room: "the familiars' pen", at: [2.2, 0.95], name: "the familiars' pen" },
  { id: "oak", room: "the Hollow Oak", at: [-0.05, 2.5], name: "the front door, out to the Hollow Oak" },
];

const TW = 124, TH = 62, OX = 500, OY = 420, A = 3, WH = 220;
const VW = 1000, VH = 660;
const P = (x: number, y: number, z = 0): Pt => [OX + (x - y) * TW / 2, OY + (x + y) * TH / 2 - z];

let c: C;
const h2 = (a: number, b: number) => { let x = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const jit = (x: number, y: number, a = 1.5): Pt => [x + (h2(x * 7, y * 3) - 0.5) * a, y + (h2(y * 5 + 3, x * 11) - 0.5) * a];
function path(pts: Pt[], close = true) { c.beginPath(); pts.forEach(([x, y], k) => { const [a, b] = jit(x, y); k ? c.lineTo(a, b) : c.moveTo(a, b); }); if (close) c.closePath(); }
function poly(pts: Pt[], fill: string | null, lw = 2.6, col = INK) { path(pts); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = col; c.lineJoin = "round"; c.stroke(); } }
function line(pts: Pt[], lw = 2, col = INK) { path(pts, false); c.lineWidth = lw; c.strokeStyle = col; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(); }
function clipTo(pts: Pt[], fn: () => void) { c.save(); c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip(); fn(); c.restore(); }
function hatch(pts: Pt[], gap = 5, col = "#8b867f", lw = 1, slope = 1) {
  clipTo(pts, () => {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs) - 400, x1 = Math.max(...xs) + 400, y0 = Math.min(...ys), y1 = Math.max(...ys);
    c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); for (let x = x0; x < x1; x += gap) { c.moveTo(x, y1); c.lineTo(x + (y1 - y0) * slope, y0); } c.stroke();
  });
}
function ell(x: number, y: number, rx: number, ry: number, fill: string | null, lw = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); } }
function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, top: string, fy: string, fx: string, lw = 2.4, hatchX = true) {
  const Fy: Pt[] = [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)];
  const Fx: Pt[] = [P(x1, y1, z0), P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1)];
  const T: Pt[] = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)];
  poly(Fy, fy, lw); poly(Fx, fx, 0); if (hatchX) hatch(Fx, 3.6, "#7d7871"); poly(Fx, null, lw); poly(T, top, lw);
}
function dashed(fn: () => void) { c.save(); c.setLineDash([5, 5]); c.globalAlpha = 0.7; fn(); c.restore(); }
function tag(s: string, [x, y]: Pt, dim = false) {
  c.font = `15px ${FELL_SC}`; const w = c.measureText(s).width + 18;
  poly([[x - w / 2, y - 12], [x + w / 2, y - 12], [x + w / 2, y + 12], [x - w / 2, y + 12]], dim ? "#e4e0d9" : WHITE, dim ? 1.4 : 2);
  c.fillStyle = dim ? "#7d7871" : INK; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(s, x, y + 1);
}
function herbs(at: Pt, len: number, kind: number) {
  const [x, y] = at;
  line([[x, y], [x, y + 14]], 1.2);
  poly([[x - 5, y + 14], [x + 5, y + 14], [x + 4, y + 20], [x - 4, y + 20]], "#cfcac2", 1.2);
  for (let k = -4; k <= 4; k++) {
    const ex = x + k * 3.4, ey = y + 20 + len * (0.75 + h2(k, x) * 0.3);
    line([[x + k * 0.7, y + 20], [ex, ey]], 1, "#5f5b55");
    for (let t = 0.35; t < 1; t += 0.22) { const px = x + (ex - x) * t, py = y + 20 + (ey - y - 20) * t; if (kind === 0) poly([[px, py], [px - 6, py - 4], [px - 2, py + 1]], "#8d887f", 0.7); else ell(px + 1, py, 2.4, 1.7, "#cfcac2", 0.8); }
  }
}

// ---------- the still room ----------
function drawShell(rooms: Rooms) {
  const open = (r: string) => r in rooms;
  c.fillStyle = "#d4cfc7"; c.fillRect(0, 0, VW, VH);
  for (let k = 0; k < 900; k++) { c.fillStyle = "rgba(30,28,26,.06)"; c.fillRect(h2(k, 1) * VW, h2(k, 2) * VH, 1.4, 1.4); }
  // the slab
  {
    const d = 26;
    const L: Pt[] = [P(-A, A), P(A, A), [P(A, A)[0], P(A, A)[1] + d], [P(-A, A)[0], P(-A, A)[1] + d]];
    const R: Pt[] = [P(A, A), P(A, -A), [P(A, -A)[0], P(A, -A)[1] + d], [P(A, A)[0], P(A, A)[1] + d]];
    poly(L, "#cfcac2", 2.4); poly(R, "#9d988f", 2.4); hatch(R, 4, "#6d6862");
  }
  // flagstones
  poly([P(-A, -A), P(A, -A), P(A, A), P(-A, A)], "#e6e2da", 2.6);
  for (let i = -A; i < A; i += 1) for (let j = -A; j < A; j += 1) {
    const s = h2(i * 13 + 50, j * 7 + 50) < 0.5;
    const q = s ? [[i, j, i + 1, j + 0.5], [i, j + 0.5, i + 1, j + 1]] : [[i, j, i + 0.5, j + 1], [i + 0.5, j, i + 1, j + 1]];
    for (const [a, b, cc, d] of q) poly([P(a + 0.04, b + 0.04), P(cc - 0.04, b + 0.04), P(cc - 0.04, d - 0.04), P(a + 0.04, d - 0.04)], h2(a * 9, b * 9) < 0.3 ? "#d9d5ce" : null, 1, "#9d988f");
  }
  const g = c.createRadialGradient(...P(0.75, -2.2), 10, ...P(0.75, -2.2), 280); g.addColorStop(0, "rgba(210,72,58,.16)"); g.addColorStop(1, "rgba(210,72,58,0)");
  clipTo([P(-A, -A), P(A, -A), P(A, A), P(-A, A)], () => { c.fillStyle = g; c.fillRect(0, 0, VW, VH); });
  // the salt line across the front door
  for (let u = -0.5; u <= 0.4; u += 0.06) { const [x, y] = P(u, A - 0.12); ell(x, y, 1.6, 1, WHITE); }
  // the rug
  {
    poly([P(-0.6, -0.4), P(1.4, -0.4), P(1.4, 1.4), P(-0.6, 1.4)], "#d6d1c8", 2.2);
    poly([P(-0.4, -0.2), P(1.2, -0.2), P(1.2, 1.2), P(-0.4, 1.2)], null, 1.4, "#8d887f");
    for (let k = 0; k < 7; k++) { const u = -0.3 + k * 0.24; line([P(u, -0.1), P(u + 0.12, 0.05), P(u, 0.2)], 1.2, "#8d887f"); line([P(u, 1.1), P(u + 0.12, 0.95), P(u, 0.8)], 1.2, "#8d887f"); }
  }

  // the far walls
  const WL: Pt[] = [P(-A, A, 0), P(-A, -A, 0), P(-A, -A, WH), P(-A, A, WH)];
  const WR: Pt[] = [P(-A, -A, 0), P(A, -A, 0), P(A, -A, WH), P(-A, -A, WH)];
  poly(WL, "#e6e1d7", 0); poly(WR, "#cdc8bf", 0); hatch(WR, 6, "#b3aea6", 0.9);
  for (const [wall, pts] of [["L", [[-A, 1.6, 150], [-A, 2.5, 20], [-A, -0.5, 40]]], ["R", [[2.1, -A, 160], [-1.9, -A, 30], [2.4, -A, 14]]]] as [string, [number, number, number][]][])
    for (const [x, y, z] of pts) for (let k = 0; k < 4; k++) {
      const du = (k % 2) * 0.3 - 0.15, dz = Math.floor(k / 2) * 14;
      const q = wall === "L" ? [P(x, y + du, z + dz), P(x, y + du + 0.26, z + dz), P(x, y + du + 0.26, z + dz + 12), P(x, y + du, z + dz + 12)] : [P(x + du, y, z + dz), P(x + du + 0.26, y, z + dz), P(x + du + 0.26, y, z + dz + 12), P(x + du, y, z + dz + 12)];
      poly(q as Pt[], wall === "L" ? "#d6d1c8" : "#b8b3ab", 1.2, "#6d6862");
    }
  for (const y of [-A + 0.02, 0.3, A - 0.02]) poly([P(-A, y - 0.07, 0), P(-A, y + 0.07, 0), P(-A, y + 0.07, WH), P(-A, y - 0.07, WH)], "#8d887f", 1.6);
  for (const x of [-A + 0.02, A - 0.02]) poly([P(x - 0.07, -A, 0), P(x + 0.07, -A, 0), P(x + 0.07, -A, WH), P(x - 0.07, -A, WH)], "#6f6b65", 1.6);
  poly(WL, null, 2.8); poly(WR, null, 2.8);
  // a chalk sigil and Brigid's cross on the left wall
  {
    const [bx, by] = P(-A, 0.95, 150);
    c.save(); c.translate(bx, by); c.transform(1, -0.5, 0, 1, 0, 0);
    for (const [dx, dy, w, h] of [[-3, -20, 6, 40], [-20, -3, 40, 6]] as [number, number, number, number][]) poly([[dx, dy], [dx + w, dy], [dx + w, dy + h], [dx, dy + h]], "#d7d0c1", 1.3);
    poly([[-6, -6], [6, -6], [6, 6], [-6, 6]], "#cfc6b2", 1.4); c.restore();
  }
  // herbs hung from pegs along the tops of the walls
  [[-A, -0.6], [-A, 0.0], [-A, 2.6]].forEach(([x, y], k) => herbs(P(x + 0.05, y, WH - 26), 26 + k * 6, k % 2));
  [[-0.4, -A], [1.7, -A], [2.6, -A]].forEach(([x, y], k) => herbs(P(x, y + 0.05, WH - 26), 30 - k * 4, (k + 1) % 2));

  // the window over the seat, with the Hollow Oak outside
  {
    const y0 = 1.0, y1 = 2.3, z0 = 60, z1 = 128;
    const O: Pt[] = [P(-A, y0, z0), P(-A, y1, z0), P(-A, y1, z1), P(-A, y0, z1)];
    poly(O, "#f4f2ed", 2.6);
    clipTo(O, () => {
      const [bx, by] = P(-A, 1.65, z0);
      c.fillStyle = "#e3dfd8"; c.beginPath(); c.moveTo(bx - 80, by + 10); c.quadraticCurveTo(bx, by - 30, bx + 90, by - 10); c.lineTo(bx + 90, by + 20); c.fill();
      line([[bx - 6, by - 4], [bx - 4, by - 34]], 2.6); ell(bx - 4, by - 44, 20, 13, "#bdb8b0", 1.6);
      if (open("the Hollow Oak")) { line([[bx + 2, by - 36], [bx + 4, by - 10]], 1); line([[bx + 12, by - 36], [bx + 14, by - 10]], 1); line([[bx + 2, by - 10], [bx + 15, by - 10]], 2); }
    });
    line([P(-A, (y0 + y1) / 2, z0), P(-A, (y0 + y1) / 2, z1)], 2.4); line([P(-A, y0, (z0 + z1) / 2), P(-A, y1, (z0 + z1) / 2)], 2.4);
    poly([P(-A, y0 - 0.06, z0), P(-A, y1 + 0.06, z0), P(-A + 0.24, y1 + 0.06, z0), P(-A + 0.24, y0 - 0.06, z0)], "#d9d5ce", 1.8);
    if (open("the window seat")) { const [cx, cy] = P(-A + 0.12, y0 + 0.2, z0); poly([[cx - 4, cy], [cx + 4, cy], [cx + 4, cy - 16], [cx - 4, cy - 16]], "#ece8e0", 1.4); }
  }
  // the Scriptorium shelves: books and stoppered jars
  {
    const y0 = -2.7, y1 = -1.3, made = open("the Scriptorium nook");
    for (const z of [10, 46, 82, 118]) {
      poly([P(-A, y0, z), P(-A, y1, z), P(-A + 0.36, y1, z), P(-A + 0.36, y0, z)], "#cfcac2", 1.8);
      if (z >= 118) continue;
      if (!made) { dashed(() => poly([P(-A + 0.16, y0 + 0.2, z), P(-A + 0.16, y1 - 0.2, z), P(-A + 0.16, y1 - 0.2, z + 22), P(-A + 0.16, y0 + 0.2, z + 22)], null, 1.2, "#8d887f")); continue; }
      let y = y0 + 0.06, k = 0;
      while (y < y1 - 0.1) {
        if ((k + z) % 5 === 3) { const [jx, jy] = P(-A + 0.18, y + 0.08, z); poly([[jx - 6, jy], [jx + 6, jy], [jx + 6, jy - 18], [jx - 6, jy - 18]], "rgba(225,230,229,.7)", 1.2); poly([[jx - 4, jy - 18], [jx + 4, jy - 18], [jx + 3, jy - 23], [jx - 3, jy - 23]], "#b8a98f", 1); y += 0.2; k++; continue; }
        const w = 0.08 + h2(k, z) * 0.06, hh = 22 + h2(z, k) * 10, tone = ["#6f6b65", "#e3dfd8", "#9d988f", "#3a3733"][(k + z) % 4];
        poly([P(-A + 0.16, y, z), P(-A + 0.16, y + w, z), P(-A + 0.16, y + w, z + hh), P(-A + 0.16, y, z + hh)], tone, 1.2); y += w + 0.01; k++;
      }
    }
    for (const y of [y0, y1]) line([P(-A + 0.36, y, 10), P(-A + 0.36, y, 118)], 2);
  }
  // the back door to the Tobar, rowan hung over it
  {
    const x0 = -1.3, x1 = x0 + 0.62, hh = 128, made = open("the Tobar");
    const D: Pt[] = [P(x0, -A, 0), P(x1, -A, 0), P(x1, -A, hh), P(x0, -A, hh)];
    if (made) {
      poly(D, "#f4f2ed", 2.4);
      clipTo(D, () => { const [bx, by] = P(x0 + 0.32, -A, 40); poly([[bx - 14, by + 4], [bx + 14, by + 4], [bx + 12, by + 24], [bx - 12, by + 24]], "#cfcac2", 1.6); ell(bx, by + 4, 14, 5, "#6f6b65", 1.4); line([[bx - 12, by - 2], [bx - 12, by - 30], [bx + 12, by - 30], [bx + 12, by - 2]], 1.8); });
      const Dd: Pt[] = [P(x1, -A, 0), P(x1, -A + 0.56, 0), P(x1, -A + 0.56, hh), P(x1, -A, hh)];
      poly(Dd, "#8d887f", 2.4); hatch(Dd, 3.4, "#5f5b55");
    } else { poly(D, "#8d887f", 2.4); hatch(D, 3.4, "#5f5b55"); for (const z of [30, 96]) line([P(x0 + 0.04, -A, z), P(x1 - 0.04, -A, z)], 3); }
    // rowan over the door: berries in red
    const [rx, ry] = P((x0 + x1) / 2, -A, hh + 12);
    line([[rx - 26, ry + 13], [rx + 26, ry - 13]], 2);
    for (let k = 0; k < 5; k++) { const lx = rx - 20 + k * 10, ly = ry + 10 - k * 5; poly([[lx, ly], [lx - 4, ly - 9], [lx + 4, ly - 8]], "#8d887f", 0.9); }
    for (const [dx, dy] of [[-4, 4], [0, 7], [4, 3], [8, 6], [-8, 8]]) ell(rx + dx, ry + dy, 2.6, 2.6, RED, 0.8);
  }
  // the hearth: a stone breast, the crane, a cauldron if it's been used
  {
    const x0 = 0.0, x1 = 1.5, d = 0.55;
    box(x0, x1, -A, -A + d, 0, WH, "#cfcac2", "#dcd8d1", "#aaa59d");
    for (let r = 0; r < 12; r++) for (let q = 0; q < 4; q++) { const z = 100 + r * 10, x = x0 + 0.05 + q * 0.36 + (r % 2) * 0.18; if (x > x1 - 0.2) continue; poly([P(x, -A + d, z), P(x + 0.3, -A + d, z), P(x + 0.3, -A + d, z + 8), P(x, -A + d, z + 8)], null, 0.9, "#8d887f"); }
    const o0 = x0 + 0.22, o1 = x1 - 0.22, oh = 86;
    poly([P(o0, -A + d, 0), P(o1, -A + d, 0), P(o1, -A + d, oh), P(o0, -A + d, oh)], "#2a2724", 2.6);
    poly([P(o0 - 0.12, -A + d, oh), P(o1 + 0.12, -A + d, oh), P(o1 + 0.12, -A + d, oh + 16), P(o0 - 0.12, -A + d, oh + 16)], "#bdb8b0", 2.2);
    const [fx, fy] = P((o0 + o1) / 2, -A + d - 0.1, 2);
    for (const dx of [-16, 0, 16]) ell(fx + dx, fy + 2, 9, 4, "#5f5b55", 1.2);
    line([P(o0 + 0.1, -A + d - 0.05, 72), P((o0 + o1) / 2, -A + d - 0.05, 72)], 2.6, "#d9d5ce");
    line([P((o0 + o1) / 2, -A + d - 0.05, 72), P((o0 + o1) / 2, -A + d - 0.05, 54)], 1.8, "#d9d5ce");
    // a horseshoe on the lintel, for luck
    const [hx, hy] = P((o0 + o1) / 2, -A + d, oh + 30); c.lineWidth = 4; c.strokeStyle = INK; c.beginPath(); c.arc(hx, hy, 8, 0.2 * Math.PI, 0.8 * Math.PI, true); c.stroke();
  }
  // the quern by the hearth
  { const [qx, qy] = P(1.68, -2.72); ell(qx, qy - 6, 13, 6, "#bdb8b0", 1.8); ell(qx, qy - 12, 12, 5, "#d9d5ce", 1.6); line([[qx + 6, qy - 13], [qx + 8, qy - 24]], 2); }
  // the hearth desk
  {
    const x0 = 1.8, x1 = 2.85, y0 = -A, y1 = -A + 0.6, top = 50;
    const M: Pt[] = [P(x0 + 0.05, -A, 86), P(x1 - 0.05, -A, 86), P(x1 - 0.05, -A, 140), P(x0 + 0.05, -A, 140)];
    poly(M, "#e3d9c6", 1.8);
    clipTo(M, () => { const [mx, my] = P((x0 + x1) / 2, -A, 112); c.setLineDash([2, 3]); ell(mx, my, 16, 10, null, 1); c.setLineDash([]); ell(mx + 3, my, 2.5, 2.5, RED); line([[mx + 22, my - 22], [mx + 18, my + 22]], 3, "#9d988f"); });
    for (const [x, y] of [[x0 + 0.06, y1 - 0.06], [x1 - 0.06, y1 - 0.06]] as Pt[]) poly([P(x - 0.04, y, 0), P(x + 0.04, y, 0), P(x + 0.04, y, top), P(x - 0.04, y, top)], "#8d887f", 1.6);
    box(x0, x1, y0, y1, top, top + 7, "#bdb8b0", "#9d988f", "#8d887f", 2.2, false);
    const [ix, iy] = P(x0 + 0.25, y0 + 0.3, top + 7); poly([[ix - 7, iy - 10], [ix + 7, iy - 10], [ix + 8, iy], [ix - 8, iy]], "#3a3733", 1.4); line([[ix + 2, iy - 10], [ix + 14, iy - 40]], 1.4); poly([[ix + 6, iy - 22], [ix + 12, iy - 40], [ix + 17, iy - 36], [ix + 10, iy - 20]], WHITE, 1.2);
    poly([P(x0 + 0.42, y0 + 0.16, top + 7), P(x0 + 0.78, y0 + 0.16, top + 7), P(x0 + 0.78, y0 + 0.5, top + 7), P(x0 + 0.42, y0 + 0.5, top + 7)], "#efe8da", 1.4);
    const [jx, jy] = P(x1 - 0.14, y0 + 0.24, top + 7); ell(jx, jy - 12, 11, 12, "rgba(225,230,229,.6)", 1.6);
    const [mx2, my2] = P(x0 + 0.86, y0 + 0.42, top + 7); poly([[mx2 - 8, my2], [mx2 + 8, my2], [mx2 + 6, my2 - 10], [mx2 - 6, my2 - 10]], "#cfcac2", 1.4);
  }
  // the thatch, cut through, and the rafters
  {
    const t = 30;
    const TL: Pt[] = [P(-A, A, WH), P(-A, -A, WH), P(-A, -A, WH + t), P(-A, A, WH + t)];
    const TR: Pt[] = [P(-A, -A, WH), P(A, -A, WH), P(A, -A, WH + t), P(-A, -A, WH + t)];
    for (const T of [TL, TR]) { poly(T, "#d7d0c1", 2.4); clipTo(T, () => { for (let k = 0; k < 160; k++) { const u = h2(k, 3); const a = T[0][0] + (T[1][0] - T[0][0]) * u, b = T[0][1] + (T[1][1] - T[0][1]) * u; line([[a, b - 2], [a + 3, b - t + 4]], 0.9, "#8f897d"); } }); poly(T, null, 2.6); }
    for (const y of [-2, 0, 2]) line([P(-A, y, WH + t), P(-A + 0.5, y, WH + t + 34)], 4, "#6f6b65");
    for (const x of [-2, 0, 2]) line([P(x, -A, WH + t), P(x, -A + 0.5, WH + t + 34)], 4, "#6f6b65");
  }
}

// things that stand on the floor, drawn in depth order with the Scáth
type Thing = { depth: number; draw: () => void };
function things(rooms: Rooms, t: number): Thing[] {
  const open = (r: string) => r in rooms;
  const out: Thing[] = [];
  // the cauldron on its crane, or an empty hook
  out.push({ depth: 0.75 - 2.5, draw: () => {
    const [cx, cy] = P(0.75, -A + 0.5, 30);
    if (open("the Cauldron")) {
      c.beginPath(); c.moveTo(cx - 24, cy - 16); c.quadraticCurveTo(cx - 28, cy + 14, cx, cy + 16); c.quadraticCurveTo(cx + 28, cy + 14, cx + 24, cy - 16); c.closePath(); c.fillStyle = "#3a3733"; c.fill(); c.lineWidth = 2.4; c.strokeStyle = "#d9d5ce"; c.stroke();
      ell(cx, cy - 16, 24, 6, "#5f5b55"); c.lineWidth = 2; c.strokeStyle = "#d9d5ce"; c.stroke();
      for (const dx of [-8, 6]) { const ph = (t * 0.5 + dx) % 1; line([[cx + dx, cy - 22], [cx + dx - 4 + Math.sin(t + dx) * 2, cy - 34], [cx + dx + 3, cy - 46 - ph * 6]], 1.6, "#bdb8b0"); }
    } else dashed(() => { c.beginPath(); c.moveTo(cx - 24, cy - 16); c.quadraticCurveTo(cx - 28, cy + 14, cx, cy + 16); c.quadraticCurveTo(cx + 28, cy + 14, cx + 24, cy - 16); c.closePath(); c.lineWidth = 1.6; c.strokeStyle = "#cfcac2"; c.stroke(); });
    flameAt(c, ...P(0.75, -A + 0.45, 2), 1.2, t);
  } });
  // a broom against the hearth, once you've tidied
  out.push({ depth: -0.15 - 2.55, draw: () => {
    const a = P(-0.12, -2.5, 0), b = P(-0.05, -2.62, 110);
    if (open("the hearth")) { line([a, b], 3); poly([[a[0] - 10, a[1] + 2], [a[0] + 10, a[1] + 2], [a[0] + 6, a[1] - 26], [a[0] - 6, a[1] - 26]], "#d7d0c1", 1.8); for (let k = -3; k <= 3; k++) line([[a[0] + k * 2, a[1]], [a[0] + k * 1.6, a[1] - 24]], 0.8, "#8f897d"); }
    else dashed(() => line([a, b], 1.6, "#8d887f"));
  } });
  // the turf basket
  out.push({ depth: 1.85 - 1.3, draw: () => { const [tx, ty] = P(1.85, -1.3); poly([[tx - 18, ty - 24], [tx + 18, ty - 24], [tx + 14, ty], [tx - 14, ty]], "#bdb8b0", 2); for (let k = 0; k < 3; k++) poly([[tx - 12 + k * 9, ty - 34], [tx - 4 + k * 9, ty - 34], [tx - 4 + k * 9, ty - 24], [tx - 12 + k * 9, ty - 24]], "#5f5b55", 1.2); } });
  // the desk chair
  out.push({ depth: 2.3 - 2.0, draw: () => {
    const x0 = 2.1, y1 = -A + 0.6;
    box(x0, x0 + 0.38, y1 + 0.18, y1 + 0.52, 0, 28, "#cfcac2", "#d9d5ce", "#aaa59d");
    poly([P(x0, y1 + 0.52, 28), P(x0 + 0.38, y1 + 0.52, 28), P(x0 + 0.38, y1 + 0.52, 66), P(x0, y1 + 0.52, 66)], "#d9d5ce", 2);
  } });
  // a bucket by the back door
  if (open("the Tobar")) out.push({ depth: -0.33 - 2.6, draw: () => { const [bx, by] = P(-0.33, -2.6); poly([[bx - 10, by - 18], [bx + 10, by - 18], [bx + 8, by], [bx - 8, by]], "#cfcac2", 1.8); ell(bx, by - 18, 10, 4, "#6f6b65", 1.4); } });
  // the window seat
  out.push({ depth: -2.75 + 2.4, draw: () => {
    box(-A, -A + 0.5, 0.9, 2.4, 0, 30, "#e3dfd8", "#d9d5ce", "#bdb8b0");
    if (open("the window seat")) {
      for (const y of [1.0, 1.7]) poly([P(-A + 0.06, y, 36), P(-A + 0.44, y, 36), P(-A + 0.44, y + 0.62, 36), P(-A + 0.06, y + 0.62, 36)], "#f2efe9", 1.8);
      const [bx, by] = P(-A + 0.3, 2.0, 38); poly([[bx - 12, by - 4], [bx + 10, by - 8], [bx + 14, by], [bx - 8, by + 4]], "#6f6b65", 1.4);
    }
  } });
  // the loft: posts, platform, straw tick and blanket; a ladder once you've slept well
  out.push({ depth: -1.5, draw: () => {
    const x0 = -A, x1 = -1.75, y0 = -A, y1 = 0.25, z = 192, made = open("the Dreaming Loft");
    for (const y of [y0 + 0.08, y1 - 0.08]) poly([P(x1 - 0.05, y - 0.05, 0), P(x1 + 0.05, y - 0.05, 0), P(x1 + 0.05, y - 0.05, z), P(x1 - 0.05, y - 0.05, z)], "#8d887f", 1.8);
    box(x0, x1, y0, y1, z - 12, z, "#d9d5ce", "#9d988f", "#8d887f", 2.4, true);
    for (let u = x0 + 0.25; u < x1; u += 0.25) line([P(u, y0, z), P(u, y1, z)], 0.9, "#9d988f");
    if (made) {
      box(-A + 0.12, -A + 1.0, -A + 0.2, -A + 1.9, z, z + 12, "#ece8e0", "#e3dfd8", "#cfcac2", 1.8, false);
      const Bl: Pt[] = [P(-A + 0.12, -A + 0.9, z + 13), P(-A + 1.02, -A + 0.9, z + 13), P(-A + 1.02, -A + 1.92, z + 13), P(-A + 0.12, -A + 1.92, z + 13)];
      poly(Bl, "#9d988f", 1.8); hatch(Bl, 5, "#6f6b65"); ell(...P(-A + 0.6, -A + 0.45, z + 18), 16, 8, WHITE, 1.6);
    }
    const lx = x1 + 0.02, ly0 = -0.55, ly1 = 0.0;
    const foot = (y: number): Pt => P(lx + 0.75, y, 0), head = (y: number): Pt => P(lx, y, z + 18);
    const draw = () => { line([foot(ly0), head(ly0)], 3); line([foot(ly1), head(ly1)], 3); for (let k = 1; k < 9; k++) { const q = k / 9, a = foot(ly0), b = head(ly0), cc = foot(ly1), d = head(ly1); line([[a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q], [cc[0] + (d[0] - cc[0]) * q, cc[1] + (d[1] - cc[1]) * q]], 2.2); } };
    if (made) draw(); else dashed(draw);
  } });
  // the familiars' pen: a basket and a curled cat, or a pencilled outline
  out.push({ depth: 2.25 + 0.95, draw: () => {
    const [bx, by] = P(2.25, 0.95);
    if (open("the familiars' pen")) {
      ell(bx, by - 4, 36, 15, "#bdb8b0", 2.2); ell(bx, by - 10, 30, 11, "#8d887f", 1.6);
      for (let k = -3; k <= 3; k++) line([[bx + k * 9, by + 6], [bx + k * 9 + 3, by - 10]], 0.9, "#6d6862");
      ell(bx, by - 14, 20, 9, "#3a3733", 1.6); ell(bx + 15, by - 18, 8, 7, "#3a3733", 1.6);
      poly([[bx + 11, by - 23], [bx + 13, by - 30], [bx + 16, by - 24]], "#3a3733", 1); poly([[bx + 17, by - 23], [bx + 20, by - 29], [bx + 21, by - 22]], "#3a3733", 1);
      const breathe = Math.sin(t * 1.4) * 0.8; line([[bx - 18, by - 12], [bx - 22, by - 4 + breathe], [bx - 8, by - 6]], 2.2, "#3a3733");
    } else dashed(() => { c.beginPath(); c.ellipse(bx, by - 6, 36, 15, 0, 0, Math.PI * 2); c.strokeStyle = "#8d887f"; c.lineWidth = 1.4; c.stroke(); });
  } });
  return out;
}
function drawFront() {
  const z = 22, gap0 = -0.55, gap1 = 0.45;
  const seg = (a: number, b: number, face: "y" | "x") => {
    if (face === "y") { poly([P(a, A, 0), P(b, A, 0), P(b, A, z), P(a, A, z)], "#dcd8d1", 2.2); poly([P(a, A - 0.22, z), P(b, A - 0.22, z), P(b, A, z), P(a, A, z)], "#bdb8b0", 2); for (let u = a + 0.2; u < b; u += 0.32) line([P(u, A, 2), P(u, A, z - 2)], 1, "#8d887f"); }
    else { const F: Pt[] = [P(A, a, 0), P(A, b, 0), P(A, b, z), P(A, a, z)]; poly(F, "#aaa59d", 2.2); hatch(F, 3.6, "#7d7871"); poly([P(A - 0.22, a, z), P(A - 0.22, b, z), P(A, b, z), P(A, a, z)], "#bdb8b0", 2); }
  };
  seg(-A, A, "x"); seg(-A, gap0, "y"); seg(gap1, A, "y");
  poly([P(gap0, A - 0.1, 2), P(gap1, A - 0.1, 2), P(gap1, A + 0.2, 2), P(gap0, A + 0.2, 2)], "#cfcac2", 1.8);
}

// ---------- walking ----------
const blockers: [number, number, number, number][] = [
  [1.78, 2.9, -3, -2.35], [-0.02, 1.52, -3, -2.42], [-3, -2.6, -2.75, -1.25], [-3, -2.48, 0.85, 2.45],
  [-1.85, -1.65, -3, -2.8], [-1.85, -1.65, 0.05, 0.3], [-1.15, -0.85, -0.65, 0.1], [1.65, 2.05, -1.5, -1.1], [2.05, 2.52, -2.25, -1.85],
];
const G = 0.25, NG = 24; // walking grid
const blockedAt = (x: number, y: number) => x < -2.85 || x > 2.85 || y < -2.85 || y > 2.85 || blockers.some(([a, b, cc, d]) => x > a && x < b && y > cc && y < d);
const cell = (x: number, y: number): Pt => [Math.floor((x + A) / G), Math.floor((y + A) / G)];
const centre = ([i, j]: Pt): Pt => [-A + (i + 0.5) * G, -A + (j + 0.5) * G];
function route(from: Pt, to: Pt): Pt[] {
  const s = cell(...from), g = cell(...to), key = (i: number, j: number) => i * NG + j;
  const ok = (i: number, j: number) => i >= 0 && j >= 0 && i < NG && j < NG && !blockedAt(...centre([i, j]));
  const prev = new Map<number, number | null>([[key(...s), null]]), q: Pt[] = [s];
  while (q.length) {
    const [i, j] = q.shift()!;
    if (i === g[0] && j === g[1]) { const out: Pt[] = []; let k: number | null | undefined = key(i, j); while (k != null) { out.push(centre([Math.floor(k / NG), k % NG])); k = prev.get(k); } out.reverse(); out[out.length - 1] = to; return out.slice(1); }
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = i + a, nj = j + b; if (prev.has(key(ni, nj)) || !ok(ni, nj)) continue;
      if (a && b && (!ok(i + a, j) || !ok(i, j + b))) continue;
      prev.set(key(ni, nj), key(i, j)); q.push([ni, nj]);
    }
  }
  return [];
}

export const me = { x: 2.3, y: -1.2, face: 1, moving: false, step: 0, path: [] as Pt[], goal: null as string | null };
export function placeAt(id: string) { const s = STATIONS.find((x) => x.id === id); if (s) { me.x = s.at[0]; me.y = s.at[1] + 0.35; me.path = []; me.goal = null; } }

export type BothyHooks = { arrive: (id: string) => void; near: (id: string | null) => void; tapStation: (id: string) => void };
let raf = 0;
export function attachBothy(cv: HTMLCanvasElement, rooms: Rooms, look: GuiserOpts, hooks: BothyHooks, labels: boolean) {
  cancelAnimationFrame(raf);
  const DPR = Math.min(2, devicePixelRatio || 1);
  const ctx = cv.getContext("2d")!;
  // the still parts are drawn once into their own canvas
  const still = document.createElement("canvas"); still.width = VW * DPR; still.height = VH * DPR;
  c = still.getContext("2d")!; c.scale(DPR, DPR); drawShell(rooms);
  let scale = 1, cam = -1, rect = cv.getBoundingClientRect();
  const size = () => {
    rect = cv.getBoundingClientRect();
    scale = Math.min(1, Math.max(0.5, rect.width / 760));
    cv.width = rect.width * DPR; cv.height = Math.round(VH * scale) * DPR; cv.style.height = Math.round(VH * scale) + "px";
    rect = cv.getBoundingClientRect();
  };
  size();
  const onResize = () => size(); addEventListener("resize", onResize);
  const toWorld = (sx: number, sy: number): Pt => [(sx - rect.left) / scale + cam, (sy - rect.top) / scale];
  cv.onpointerdown = (e) => {
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    // a tap on a station's thing walks there; tapping it when you're there uses it
    let best: Station | null = null, bd = 64;
    for (const s of STATIONS) { const [px, py] = P(s.at[0], s.at[1]); const d = Math.hypot(wx - px, (wy - (py - 40)) * 0.8); if (d < bd) { bd = d; best = s; } }
    if (best) {
      if (Math.hypot(me.x - best.at[0], me.y - best.at[1]) < 0.45) { hooks.tapStation(best.id); return; }
      me.path = route([me.x, me.y], best.at); me.goal = best.id; return;
    }
    const u = (wx - OX) / (TW / 2), v = (wy - OY) / (TH / 2);
    let x = (u + v) / 2, y = (v - u) / 2;
    x = Math.max(-2.8, Math.min(2.8, x)); y = Math.max(-2.8, Math.min(2.8, y));
    if (blockedAt(x, y)) return;
    me.path = route([me.x, me.y], [x, y]); me.goal = null;
  };
  let near: string | null = null, last = performance.now();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const frame = (now: number) => {
    if (!cv.isConnected) { removeEventListener("resize", onResize); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = reduce ? 0 : now / 1000;
    if (me.path.length) {
      const [tx, ty] = me.path[0], dx = tx - me.x, dy = ty - me.y, d = Math.hypot(dx, dy), s = 2.6 * dt;
      if (d <= s) { me.x = tx; me.y = ty; me.path.shift(); if (!me.path.length && me.goal) { const g = me.goal; me.goal = null; me.moving = false; hooks.arrive(g); } }
      else { me.x += (dx / d) * s; me.y += (dy / d) * s; }
      const sx = dx - dy; if (Math.abs(sx) > 0.02) me.face = sx > 0 ? 1 : -1; me.moving = true; me.step += dt;
    } else me.moving = false;
    let nb: string | null = null, nd = 0.5;
    for (const s of STATIONS) { const d = Math.hypot(me.x - s.at[0], me.y - s.at[1]); if (d < nd) { nd = d; nb = s.id; } }
    if (me.path.length) nb = null;
    if (nb !== near) { near = nb; hooks.near(nb); }
    // camera: follow the Scáth sideways when the room is wider than the screen
    const vw = rect.width / scale, [px] = P(me.x, me.y);
    const target = vw >= VW ? (VW - vw) / 2 : Math.max(0, Math.min(VW - vw, px - vw / 2));
    cam = cam < 0 && cam !== target ? target : cam + (target - cam) * Math.min(1, dt * 5);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = "#d4cfc7"; ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.setTransform(DPR * scale, 0, 0, DPR * scale, -cam * DPR * scale, 0);
    ctx.drawImage(still, 0, 0, VW, VH);
    c = ctx;
    if (rooms["the window seat"] !== undefined) { const [cx, cy] = P(-A + 0.12, 1.2, 60); flameAt(c, cx, cy - 16, 0.4, t); }
    const all = [...things(rooms, t), { depth: me.x + me.y, draw: () => { const [x, y] = P(me.x, me.y); drawScath(c, x, y, 0.5, t, look, me.moving, me.step, me.face); } }];
    all.sort((a, b) => a.depth - b.depth).forEach((o) => o.draw());
    drawFront();
    if (me.path.length) { const g = me.path[me.path.length - 1], [gx, gy] = P(g[0], g[1]); ctx.beginPath(); ctx.ellipse(gx, gy, 12 + Math.sin(t * 6) * 2, 6, 0, 0, 7); ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.stroke(); }
    if (labels) for (const s of STATIONS) { const [x, y] = P(s.at[0], s.at[1]); const dim = s.room !== "the hearth desk" && rooms[s.room] === undefined; if (s.id === near) continue; tag(s.id === "desk" ? "hearth desk" : s.room.replace(/^the /, ""), [x, y - 70], dim); }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  hooks.near(near);
}
