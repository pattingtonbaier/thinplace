// The walkable Hollow, drawn on a canvas as an isometric ink diorama:
// grey hatching on paper, with red kept for the one thing that needs you.
import { BUILDINGS, type BuildingId, type Ember } from "./content";
import type { GuiserOpts } from "./art";

export interface WorldState {
  open: (id: BuildingId) => boolean;
  level: (id: BuildingId) => number;
  ember: Record<Ember, number>;
  lvl: number;
  look: GuiserOpts;
  firstTime: boolean;
}

// ---------- the board ----------
const N = 30, TW = 64, TH = 32, MX = 260, MT = 300, MB = 220;
const WW = N * TW + 2 * MX, WH = N * TH + MT + MB, OX = MX + N * TW / 2, OY = MT;
const INK = "#1e1c1a", LIGHT = "#f3f1ec", MID = "#bdb8b0", GROUND = "#e2ded6", PATH = "#efece6", WATER = "#b4b0aa", RED = "#d2483a";
const P = (i: number, j: number, z = 0): [number, number] => [OX + (i - j) * TW / 2, OY + (i + j) * TH / 2 - z];

function mul(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function h2(x: number, y: number) {
  let h = Math.imul((x | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(((y | 0) + 0x632be5ab) | 0, 0xc2b2ae35);
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const jit = (x: number, y: number) => [(h2(Math.round(x * 3), Math.round(y * 3)) - 0.5) * 1.5, (h2(Math.round(y * 3) + 7, Math.round(x * 3)) - 0.5) * 1.5];

// Where each building stands (top-left of its 2x2 plot); its door is two tiles south-west of that.
const PLOT: Record<string, [number, number]> = {
  "bothy": [16, 18], "stone-field": [9, 17], "ogham-tower": [21, 11], "forge": [10, 10], "craft-hall": [22, 17],
  "bards-lane": [15, 5], "wildwood": [5, 5], "feasting-halls": [23, 23], "market-square": [15, 24],
  "healing-well": [25, 4], "raven-post": [4, 23],
};
const FIRE: [number, number] = [14, 14];
const SPAWN: [number, number] = [16, 16];

type Tile = 0 | 1 | 2; // ground, water, path
const T: Tile[][] = [...Array(N)].map(() => Array(N).fill(0));
const B: boolean[][] = [...Array(N)].map(() => Array(N).fill(false));
type Obj = { type: "bld"; id: BuildingId; ci: number; cj: number; door: [number, number]; depth: number; bbox?: number[] }
  | { type: "pine" | "round"; i: number; j: number; v: number; depth: number }
  | { type: "fire"; depth: number };
const objs: Obj[] = [];
const inb = (i: number, j: number) => i >= 0 && j >= 0 && i < N && j < N;

function bfs(s: [number, number], g: [number, number], ok: (i: number, j: number) => boolean, diag = true): [number, number][] | null {
  const key = (i: number, j: number) => i * N + j, prev = new Map<number, number | null>([[key(...s), null]]), q: [number, number][] = [s];
  const dirs = diag ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (q.length) {
    const [i, j] = q.shift()!;
    if (i === g[0] && j === g[1]) {
      const out: [number, number][] = []; let k: number | null | undefined = key(i, j);
      while (k != null) { out.push([Math.floor(k / N), k % N]); k = prev.get(k); }
      return out.reverse();
    }
    for (const [a, b] of dirs) {
      const ni = i + a, nj = j + b;
      if (!inb(ni, nj) || prev.has(key(ni, nj))) continue;
      if (!(ni === g[0] && nj === g[1]) && !ok(ni, nj)) continue;
      if (a && b && (!ok(i + a, j) || !ok(i, j + b))) continue;
      prev.set(key(ni, nj), key(i, j)); q.push([ni, nj]);
    }
  }
  return null;
}

(function gen() {
  const rnd = mul(20261101);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++)
    if (((i + 0.5 - 4) / 2.6) ** 2 + ((j + 0.5 - 13) / 3.2) ** 2 < 1) { T[i][j] = 1; B[i][j] = true; }
  B[FIRE[0]][FIRE[1]] = true;
  objs.push({ type: "fire", depth: FIRE[0] + FIRE[1] + 1 });
  for (const b of BUILDINGS) {
    const [i, j] = PLOT[b.id];
    for (let a = 0; a < 2; a++) for (let c = 0; c < 2; c++) B[i + a][j + c] = true;
    objs.push({ type: "bld", id: b.id, ci: i + 1, cj: j + 1, door: [i, j + 2], depth: i + j + 2.4 });
  }
  for (let i = 12; i <= 17; i++) for (let j = 12; j <= 17; j++) if (Math.hypot(i - 14.5, j - 14.5) < 2.6 && !B[i][j]) T[i][j] = 2;
  for (const o of objs) {
    if (o.type !== "bld") continue;
    (bfs(SPAWN, o.door, (i, j) => !B[i][j], false) ?? []).forEach(([i, j]) => (T[i][j] = 2));
    T[o.door[0]][o.door[1]] = 2;
  }
  const nearPlot = (i: number, j: number) => Object.values(PLOT).some(([a, b]) => i >= a - 1 && i <= a + 2 && j >= b - 1 && j <= b + 3);
  const nextToPath = (i: number, j: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inb(i + a, j + b) && T[i + a][j + b] === 2);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (B[i][j] || T[i][j] !== 0 || Math.hypot(i - 15, j - 15) < 3.5 || nearPlot(i, j)) continue;
    if (nextToPath(i, j) && rnd() < 0.65) continue;
    const edge = Math.min(i, j, N - 1 - i, N - 1 - j);
    const forest = edge < 3 || (i < 9 && j < 9 && !(i > 3 && i < 8 && j > 3 && j < 8));
    if (rnd() < (forest ? 0.6 : 0.11)) {
      B[i][j] = true;
      objs.push({ type: rnd() < (forest ? 0.75 : 0.35) ? "pine" : "round", i: i + 0.5 + (rnd() - 0.5) * 0.35, j: j + 0.5 + (rnd() - 0.5) * 0.35, v: Math.floor(rnd() * 3), depth: i + j + 1 });
    }
  }
})();

// ---------- drawing helpers ----------
type C = CanvasRenderingContext2D;
type Pt = [number, number];
function pathPts(c: C, pts: Pt[], close = true) {
  c.beginPath();
  pts.forEach(([x, y], k) => { const [a, b] = jit(x, y); k ? c.lineTo(x + a, y + b) : c.moveTo(x + a, y + b); });
  if (close) c.closePath();
}
function poly(c: C, pts: Pt[], fill: string | null, lw = 2.2) {
  pathPts(c, pts);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (lw) { c.strokeStyle = INK; c.lineWidth = lw; c.lineJoin = "round"; c.stroke(); }
}
function line(c: C, pts: Pt[], lw = 2, col = INK) {
  pathPts(c, pts, false); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = "round"; c.lineJoin = "round"; c.stroke();
}
function hatch(c: C, pts: Pt[], gap = 5, col = "#8b867f", lw = 1.1) {
  c.save(); c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
  for (let x = x0 - (y1 - y0); x < x1; x += gap) { c.moveTo(x, y1); c.lineTo(x + (y1 - y0), y0); }
  c.stroke(); c.restore();
}
function ellipse(c: C, x: number, y: number, rx: number, ry: number, fill: string, stroke = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  if (stroke) { c.lineWidth = stroke; c.strokeStyle = INK; c.stroke(); }
}
function box(c: C, ci: number, cj: number, a: number, b: number, h: number, o: { left?: string; right?: string; top?: string | null; hatchR?: boolean; z0?: number } = {}) {
  const { left = LIGHT, right = MID, top = "#f8f6f2", hatchR = true, z0 = 0 } = o;
  const L: Pt[] = [P(ci - a, cj + b, z0), P(ci + a, cj + b, z0), P(ci + a, cj + b, h), P(ci - a, cj + b, h)];
  const R: Pt[] = [P(ci + a, cj + b, z0), P(ci + a, cj - b, z0), P(ci + a, cj - b, h), P(ci + a, cj + b, h)];
  const Tp: Pt[] = [P(ci - a, cj - b, h), P(ci + a, cj - b, h), P(ci + a, cj + b, h), P(ci - a, cj + b, h)];
  poly(c, L, left, 0); poly(c, R, right, 0); if (hatchR) hatch(c, R); poly(c, L, null); poly(c, R, null); if (top) poly(c, Tp, top);
}
function face(c: C, f: "L" | "R", ci: number, cj: number, a: number, b: number, u0: number, u1: number, z0: number, z1: number, fill: string | null, lw = 2) {
  const pts: Pt[] = f === "L" ? [P(u0, cj + b, z0), P(u1, cj + b, z0), P(u1, cj + b, z1), P(u0, cj + b, z1)] : [P(ci + a, u0, z0), P(ci + a, u1, z0), P(ci + a, u1, z1), P(ci + a, u0, z1)];
  poly(c, pts, fill, lw); return pts;
}
function gable(c: C, ci: number, cj: number, a: number, b: number, h: number, rh: number, roof = "#6f6b65", thatch = false) {
  const o = thatch ? 0.16 : 0.1;
  poly(c, [P(ci + a, cj - b, h), P(ci + a, cj + b, h), P(ci + a, cj, h + rh)], "#cfcac2");
  hatch(c, [P(ci + a, cj - b, h), P(ci + a, cj + b, h), P(ci + a, cj, h + rh)], 6, "#a19c95");
  const S: Pt[] = [P(ci - a - o, cj + b + o, h - (thatch ? 6 : 2)), P(ci + a + o, cj + b + o, h - (thatch ? 6 : 2)), P(ci + a + o, cj, h + rh), P(ci - a - o, cj, h + rh)];
  poly(c, S, roof, 0);
  c.save(); c.beginPath(); S.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.clip();
  if (thatch) for (let u = 0; u < 1; u += 0.05) { const A = P(ci - a - o + (2 * a + 2 * o) * u, cj + b + o, h - 6), Bp = P(ci - a - o + (2 * a + 2 * o) * u + 0.03, cj, h + rh); line(c, [A, Bp], 1, "#8f8a83"); }
  else for (let u = 0; u < 1; u += 0.12) { const A = P(ci - a - o + (2 * a + 2 * o) * u, cj + b + o, h - 2), Bp = P(ci - a - o + (2 * a + 2 * o) * u, cj, h + rh); line(c, [A, Bp], 1.2, "#9b968f"); }
  c.restore(); poly(c, S, null);
}
const door = (c: C, ci: number, cj: number, b: number, di: number, hgt = 26, w = 0.17) => face(c, "L", ci, cj, 0, b, di - w, di + w, 0, hgt, "#2d2a27");
const win = (c: C, f: "L" | "R", ci: number, cj: number, a: number, b: number, u: number, z: number, w = 0.13, hh = 14) => face(c, f, ci, cj, a, b, u - w, u + w, z, z + hh, "#efece6", 1.8);
function flag(c: C, x: number, y: number, t: number, col = RED) {
  line(c, [[x, y], [x, y - 26]], 2);
  const w = Math.sin(t * 3 + x) * 2;
  poly(c, [[x, y - 26], [x + 15, y - 22 + w], [x, y - 17]], col, 1.6);
}
function smoke(c: C, x: number, y: number, t: number) {
  for (let k = 0; k < 4; k++) {
    const ph = (t * 0.35 + k / 4) % 1, r = 3 + ph * 7;
    c.globalAlpha = 1 - ph; c.beginPath(); c.arc(x + ph * 14 + Math.sin(t + k) * 2, y - ph * 40, r, 0, 7);
    c.fillStyle = LIGHT; c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke(); c.globalAlpha = 1;
  }
}

// ---------- sprites ----------
const DPR = Math.min(2, (globalThis as any).devicePixelRatio || 1);
type Sprite = { cv: HTMLCanvasElement; w: number; h: number; ax: number; ay: number };
function sprite(w: number, h: number, ax: number, ay: number, fn: (c: C) => void): Sprite {
  const cv = document.createElement("canvas"); cv.width = w * DPR; cv.height = h * DPR;
  const c = cv.getContext("2d")!; c.scale(DPR, DPR); c.translate(ax, ay); fn(c);
  return { cv, w, h, ax, ay };
}
let SPR: { pine: Sprite[]; round: Sprite[] } | null = null;
function sprites() {
  if (SPR) return SPR;
  SPR = { pine: [], round: [] };
  [1, 1.15, 0.88].forEach((s) => SPR!.pine.push(sprite(56, 90, 28, 80, (c) => {
    ellipse(c, 2, 2, 15 * s, 5 * s, "#cbc6bd"); line(c, [[0, 0], [0, -7]], 2.4);
    const pts: Pt[] = [[0, -62 * s], [-9 * s, -44 * s], [-5 * s, -44 * s], [-15 * s, -26 * s], [-8 * s, -26 * s], [-19 * s, -6 * s], [19 * s, -6 * s], [8 * s, -26 * s], [15 * s, -26 * s], [5 * s, -44 * s], [9 * s, -44 * s]];
    poly(c, pts, LIGHT, 0); c.save(); pathPts(c, pts); c.clip(); c.fillStyle = "#c6c1b9"; c.fillRect(1, -80, 40, 80); hatch(c, [[1, -80], [41, -80], [41, 0], [1, 0]], 4, "#a8a39b", 1); c.restore(); poly(c, pts, null, 2.2);
  })));
  [1, 1.2, 0.85].forEach((s) => SPR!.round.push(sprite(70, 80, 35, 70, (c) => {
    ellipse(c, 3, 2, 18 * s, 6 * s, "#cbc6bd"); line(c, [[0, 0], [0, -12 * s]], 3);
    const cs = [[-9 * s, -22 * s, 11 * s], [8 * s, -24 * s, 12 * s], [0, -35 * s, 13 * s], [-2 * s, -20 * s, 10 * s]];
    c.lineWidth = 4.6; c.strokeStyle = INK; cs.forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); });
    c.fillStyle = "#d5d0c8"; cs.forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); });
    c.save(); c.beginPath(); cs.forEach(([x, y, r]) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, 7); }); c.clip();
    c.fillStyle = "#aea9a1"; cs.forEach(([x, y, r]) => { c.beginPath(); c.arc(x + 6 * s, y + 6 * s, r, 0, 7); c.fill(); });
    c.fillStyle = "#d5d0c8"; cs.forEach(([x, y, r]) => { c.beginPath(); c.arc(x - 3 * s, y - 3 * s, r * 0.8, 0, 7); c.fill(); }); c.restore();
    line(c, [[-6 * s, -32 * s], [-2 * s, -36 * s]], 1.4, "#8b867f");
  })));
  return SPR;
}

// ---------- the ground: a raised turf board with hatched edges ----------
let ground: HTMLCanvasElement | null = null;
function buildGround() {
  const rnd = mul(7);
  const cv = document.createElement("canvas"); cv.width = WW * DPR; cv.height = WH * DPR;
  const c = cv.getContext("2d")!; c.scale(DPR, DPR);
  c.fillStyle = "#cfcac2"; c.fillRect(0, 0, WW, WH);
  c.fillStyle = "rgba(30,28,26,.07)"; for (let x = 0; x < WW; x += 22) for (let y = 0; y < WH; y += 22) { c.beginPath(); c.arc(x, y, 1, 0, 7); c.fill(); }
  const d = 26, E = [P(0, N), P(N, N), P(N, 0)];
  const left: Pt[] = [E[0], E[1], [E[1][0], E[1][1] + d], [E[0][0], E[0][1] + d]];
  const right: Pt[] = [E[1], E[2], [E[2][0], E[2][1] + d], [E[1][0], E[1][1] + d]];
  poly(c, left, "#d9d5ce", 2.4); poly(c, right, "#aaa59d", 2.4); hatch(c, right, 4, "#7f7a73"); hatch(c, left, 9, "#a39e97");
  // the turf lip, scalloped like TOEM's grass edges
  for (const [a, b] of [[E[0], E[1]], [E[1], E[2]]] as [Pt, Pt][]) {
    for (let u = 0; u < 1; u += 0.012) {
      const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
      c.beginPath(); c.arc(x, y + 2, 4 + h2(x, y) * 2, 0, Math.PI); c.fillStyle = GROUND; c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
    }
  }
  poly(c, [P(0, 0), P(N, 0), P(N, N), P(0, N)], GROUND, 0);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const q = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
    if (T[i][j]) { c.beginPath(); q.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = T[i][j] === 2 ? PATH : WATER; c.fill(); }
  }
  c.lineWidth = 1;
  for (let k = 0; k <= N; k++) {
    c.strokeStyle = "rgba(30,28,26,.045)";
    c.beginPath(); c.moveTo(...P(k, 0)); c.lineTo(...P(k, N)); c.moveTo(...P(0, k)); c.lineTo(...P(N, k)); c.stroke();
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (T[i][j] === 1) {
      for (let n = 0; n < 3; n++) { const [x, y] = P(i + 0.2 + rnd() * 0.6, j + 0.2 + rnd() * 0.6); line(c, [[x - 5, y], [x + 5, y]], 1.6, "#77736c"); }
      ([[1, 0, [i + 1, j], [i + 1, j + 1]], [-1, 0, [i, j], [i, j + 1]], [0, 1, [i, j + 1], [i + 1, j + 1]], [0, -1, [i, j], [i + 1, j]]] as [number, number, Pt, Pt][])
        .forEach(([a, b, p1, p2]) => { if (!inb(i + a, j + b) || T[i + a][j + b] !== 1) line(c, [P(...p1), P(...p2)], 2.4); });
    } else if (T[i][j] === 0 && rnd() < 0.42) {
      const [x, y] = P(i + 0.2 + rnd() * 0.6, j + 0.2 + rnd() * 0.6);
      c.strokeStyle = "#8f8a83"; c.lineWidth = 1.3; c.lineCap = "round"; c.beginPath();
      c.moveTo(x - 4, y - 3); c.lineTo(x - 2, y); c.lineTo(x, y - 4); c.lineTo(x + 2, y); c.lineTo(x + 4, y - 3); c.stroke();
      if (rnd() < 0.08) { ellipse(c, x + 8, y - 2, 2.4, 2.4, LIGHT, 1.2); }
    } else if (T[i][j] === 2 && rnd() < 0.25) {
      const [x, y] = P(i + 0.3 + rnd() * 0.4, j + 0.3 + rnd() * 0.4); ellipse(c, x, y, 2.2, 1.2, "#c5c0b8");
    }
  }
  poly(c, [P(0, 0), P(N, 0), P(N, N), P(0, N)], null, 2.6);
  ground = cv;
}

// ---------- buildings ----------
function tag(c: C, x: number, y: number, label: string, locked: boolean) {
  c.font = "16px 'Patrick Hand SC','Gochi Hand',cursive";
  const w = c.measureText(label).width + 24;
  c.save(); c.translate(x, y); c.rotate(-0.025);
  poly(c, [[-w / 2, -13], [w / 2, -13], [w / 2, 13], [-w / 2, 13]], locked ? "#e4e0d9" : "#f7f5f1", locked ? 1.4 : 2);
  c.fillStyle = locked ? "#7d7871" : INK; c.textBaseline = "middle"; c.textAlign = "center"; c.fillText(label, 0, 1);
  c.restore();
  return w;
}

function drawBuilding(c: C, o: Extract<Obj, { type: "bld" }>, t: number, ws: WorldState) {
  const { ci, cj, id } = o, dk = o.door[0] + 0.5;
  const name = BUILDINGS.find((b) => b.id === id)!.name.replace(/^The /, "").toUpperCase();
  ellipse(c, ...P(ci + 0.15, cj + 0.15), TW * 0.95, TH * 0.95, "rgba(120,114,106,.22)");
  if (!ws.open(id)) {
    // still in the fog
    const [x, y] = P(ci, cj);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + t * 0.15, r = 26 + 6 * Math.sin(t * 0.7 + k);
      ellipse(c, x + Math.cos(a) * r * 1.4, y - 26 + Math.sin(a) * r * 0.6, 22, 15, "rgba(246,244,240,.92)", 1.4);
    }
    ellipse(c, x, y - 28, 34, 20, "rgba(246,244,240,.96)");
    c.font = "28px 'Patrick Hand SC',cursive"; c.fillStyle = "#8a8580"; c.textAlign = "center"; c.fillText("?", x, y - 18);
    tag(c, x, y - 68, `LEVEL ${ws.level(id)}`, true);
    o.bbox = [x - 70, y - 90, x + 70, y + 20];
    return;
  }
  let top = 0;
  switch (id) {
    case "bothy": {
      const a = 0.8, b = 0.7, h = 34;
      box(c, ci, cj, a, b, h, { top: null });
      for (let z = 8; z < h; z += 9) line(c, [P(ci + a, cj - b + 0.1, z), P(ci + a, cj + b - 0.1, z - 1)], 1, "#9a958e");
      door(c, ci, cj, b, dk, 24, 0.15); win(c, "L", ci, cj, a, b, ci + 0.4, 10, 0.15, 13); win(c, "R", ci, cj, a, b, cj, 12, 0.15, 12);
      const cx = ci + 0.35, cjc = cj - 0.3; box(c, cx, cjc, 0.12, 0.12, h + 36, { top: "#6f6b65" });
      gable(c, ci, cj, a, b, h, 30, "#cfc8b9", true);
      const [sx, sy] = P(cx, cjc, h + 42); smoke(c, sx, sy, t);
      top = h + 62; break;
    }
    case "stone-field": {
      const stones: [number, number, number][] = [[-0.6, 0.5, 44], [0.1, 0.75, 54], [0.75, 0.3, 40], [0.6, -0.5, 48], [-0.5, -0.6, 36]];
      ellipse(c, ...P(ci, cj), TW * 0.9, TH * 0.9, "#ece9e3", 1.4);
      stones.sort((p, q) => p[0] + p[1] - (q[0] + q[1])).forEach(([u, v, hh]) => box(c, ci + u, cj + v, 0.13, 0.11, hh, { top: "#d8d4cd" }));
      top = 70; break;
    }
    case "ogham-tower": {
      const [x, y] = P(ci, cj), r = 26, h = 104;
      c.beginPath(); c.moveTo(x - r, y); c.lineTo(x - r, y - h); c.lineTo(x + r, y - h); c.lineTo(x + r, y); c.ellipse(x, y, r, r / 2, 0, 0, Math.PI); c.closePath();
      c.fillStyle = LIGHT; c.fill();
      hatch(c, [[x + 4, y + r / 2], [x + 4, y - h], [x + r, y - h], [x + r, y]], 4, "#8f8a83");
      c.lineWidth = 2.4; c.strokeStyle = INK; c.beginPath(); c.moveTo(x - r, y - h); c.lineTo(x - r, y); c.ellipse(x, y, r, r / 2, 0, Math.PI, 0, true); c.lineTo(x + r, y - h); c.stroke();
      for (let z = 22; z < h - 6; z += 26) line(c, [[x - r + 3, y - z + 4], [x + r - 3, y - z + 4]], 1, "#a19c95");
      ellipse(c, x, y - h, r, r / 2, "#e9e5de", 2.2);
      poly(c, [[x - r - 3, y - h], [x, y - h - 46], [x + r + 3, y - h]], "#6f6b65"); hatch(c, [[x, y - h - 46], [x + r + 3, y - h], [x, y - h + 4]], 4, "#4c4945");
      poly(c, [[x - 6, y - 50], [x + 6, y - 50], [x + 6, y - 32], [x - 6, y - 32]], "#2d2a27", 2);
      poly(c, [[x - 4, y - 84], [x + 4, y - 84], [x + 4, y - 72], [x - 4, y - 72]], "#efece6", 1.6);
      for (let k = 0; k < 5; k++) line(c, [[x - 18, y - 20 - k * 6], [x - 12, y - 20 - k * 6]], 1.6);
      line(c, [[x - 15, y - 16], [x - 15, y - 50]], 1.6);
      top = h + 64; break;
    }
    case "forge": {
      const a = 0.85, b = 0.75, h = 30;
      box(c, ci, cj, a, b, h, { top: null, right: "#a8a39b" });
      face(c, "L", ci, cj, a, b, ci - a + 0.15, ci + 0.15, 0, 20, "#3a3733");
      const [gx, gy] = P(ci - 0.2, cj + b, 8); ellipse(c, gx, gy, 9, 5, RED);
      const cx = ci + 0.4, cjc = cj - 0.35; box(c, cx, cjc, 0.16, 0.16, h + 34, { top: "#55524d" });
      gable(c, ci, cj, a, b, h, 24, "#5f5b56");
      const [sx, sy] = P(cx, cjc, h + 40);
      for (let k = 0; k < 5; k++) { const ph = (t * 0.8 + k / 5) % 1; ellipse(c, sx + Math.sin(k * 3 + t) * 6, sy - ph * 34, 1.8, 1.8, RED); }
      const [ax, ay] = P(ci + 0.3, cj + b + 0.55); poly(c, [[ax - 9, ay], [ax + 9, ay], [ax + 6, ay - 8], [ax + 14, ay - 12], [ax - 14, ay - 12], [ax - 6, ay - 8]], "#6f6b65", 1.8);
      top = h + 60; break;
    }
    case "craft-hall": {
      const a = 0.95, b = 0.7, h = 38;
      box(c, ci, cj, a, b, h, { top: null });
      const g = face(c, "L", ci, cj, a, b, ci - a + 0.12, ci + 0.2, 10, h - 6, "#eef0ee", 2);
      for (let u = 1; u < 4; u++) { const uu = ci - a + 0.12 + (u * (ci + 0.2 - (ci - a + 0.12))) / 4; line(c, [P(uu, cj + b, 10), P(uu, cj + b, h - 6)], 1.3); }
      line(c, [P(ci - a + 0.12, cj + b, (h + 4) / 2), P(ci + 0.2, cj + b, (h + 4) / 2)], 1.3); void g;
      door(c, ci, cj, b, ci + 0.6, 24, 0.15);
      gable(c, ci, cj, a, b, h, 26, "#77736d");
      const [px, py] = P(ci + a + 0.02, cj + 0.1, 22); ellipse(c, px + 3, py, 6, 8, RED); ellipse(c, px - 2, py + 8, 3, 3, RED);
      top = h + 52; break;
    }
    case "bards-lane": {
      box(c, ci, cj, 0.75, 0.55, 10, { top: "#e9e5de" });
      const cur: Pt[] = [P(ci - 0.6, cj - 0.45, 10), P(ci + 0.6, cj - 0.45, 10), P(ci + 0.6, cj - 0.45, 46), P(ci - 0.6, cj - 0.45, 46)];
      poly(c, cur, RED, 2); for (let u = -0.4; u <= 0.4; u += 0.2) line(c, [P(ci + u, cj - 0.45, 12), P(ci + u, cj - 0.45, 44)], 1, "#8f2c22");
      line(c, [P(ci - 0.6, cj - 0.45, 46), P(ci + 0.6, cj - 0.45, 46)], 3);
      for (const [u, v] of [[-0.95, 0.9], [0.95, 0.9], [1, -0.6]]) {
        const [x, y] = P(ci + u, cj + v); line(c, [[x, y], [x, y - 44]], 2.4);
        poly(c, [[x - 5, y - 54], [x + 5, y - 54], [x + 5, y - 44], [x - 5, y - 44]], "#f8f3e3", 1.8);
        c.globalAlpha = 0.35 + 0.1 * Math.sin(t * 2 + u); ellipse(c, x, y - 49, 12, 12, "#fffaf0"); c.globalAlpha = 1;
      }
      top = 76; break;
    }
    case "wildwood": {
      const s = sprites();
      const a = 0.6, b = 0.5, h = 22;
      box(c, ci + 0.3, cj + 0.3, a, b, h, { left: "rgba(236,240,238,.92)", right: "rgba(208,214,211,.92)", top: null, hatchR: false });
      for (let k = 1; k < 4; k++) { const u = ci + 0.3 - a + (k * a * 2) / 4; line(c, [P(u, cj + 0.3 + b, 0), P(u, cj + 0.3 + b, h)], 1.3); }
      poly(c, [P(ci + 0.3 - a, cj + 0.3 + b, h), P(ci + 0.3 + a, cj + 0.3 + b, h), P(ci + 0.3 + a, cj + 0.3, h + 16), P(ci + 0.3 - a, cj + 0.3, h + 16)], "rgba(240,244,242,.95)", 1.8);
      for (const [u, v, k] of [[-0.7, -0.6, 1], [0.6, -0.8, 0], [-0.8, 0.5, 2]] as [number, number, number][]) { const [x, y] = P(ci + u, cj + v); const sp = s.round[k]; c.drawImage(sp.cv, x - sp.ax, y - sp.ay, sp.w, sp.h); }
      top = 84; break;
    }
    case "feasting-halls": {
      const a = 0.95, b = 0.85, h = 40;
      box(c, ci, cj, a, b, h, { top: null });
      for (const u of [-0.55, -0.15, 0.25]) win(c, "L", ci, cj, a, b, ci + u, 14, 0.1, 14);
      door(c, ci, cj, b, ci + 0.62, 28, 0.2); line(c, [P(ci + 0.62, cj + b, 0), P(ci + 0.62, cj + b, 28)], 1.4, "#8a8580");
      gable(c, ci, cj, a, b, h, 34, "#55524d");
      const [fx, fy] = P(ci - 0.3, cj, h + 30); flag(c, fx, fy, t);
      const [fx2, fy2] = P(ci + 0.5, cj, h + 30); flag(c, fx2, fy2, t + 1);
      top = h + 66; break;
    }
    case "market-square": {
      for (const [u, v] of [[-0.45, 0.25], [0.55, -0.35]] as Pt[]) {
        const sc = ci + u, sj = cj + v, a = 0.42, b = 0.36;
        for (const [p, q] of [[-a, b], [a, b], [a, -b]]) line(c, [P(sc + p, sj + q, 0), P(sc + p, sj + q, 26)], 2.2);
        box(c, sc, sj, a, b, 12, { top: "#ece8e1" });
        const aw: Pt[] = [P(sc - a - 0.06, sj + b + 0.12, 24), P(sc + a + 0.06, sj + b + 0.12, 24), P(sc + a + 0.06, sj - b, 34), P(sc - a - 0.06, sj - b, 34)];
        poly(c, aw, "#f6f3ee", 0); c.save(); pathPts(c, aw); c.clip();
        for (let k = 0; k < 6; k += 2) poly(c, [P(sc - a - 0.06 + (k * (2 * a + 0.12)) / 6, sj + b + 0.12, 24), P(sc - a - 0.06 + ((k + 1) * (2 * a + 0.12)) / 6, sj + b + 0.12, 24), P(sc - a - 0.06 + ((k + 1) * (2 * a + 0.12)) / 6, sj - b, 34), P(sc - a - 0.06 + (k * (2 * a + 0.12)) / 6, sj - b, 34)], RED, 0);
        c.restore(); poly(c, aw, null, 2);
      }
      top = 62; break;
    }
    case "healing-well": {
      const [x, y] = P(ci, cj), r = 22;
      c.beginPath(); c.ellipse(x, y, r, r / 2, 0, 0, Math.PI); c.lineTo(x - r, y - 18); c.lineTo(x + r, y - 18); c.closePath(); c.fillStyle = "#d8d4cd"; c.fill();
      c.beginPath(); c.moveTo(x - r, y - 18); c.lineTo(x - r, y); c.ellipse(x, y, r, r / 2, 0, Math.PI, 0, true); c.lineTo(x + r, y - 18); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
      for (let k = 0; k < 6; k++) { const a2 = (k / 6) * Math.PI; line(c, [[x - Math.cos(a2) * r, y - 9 + Math.sin(a2) * r / 2], [x - Math.cos(a2 + 0.3) * r, y - 9 + Math.sin(a2 + 0.3) * r / 2]], 1, "#8f8a83"); }
      ellipse(c, x, y - 18, r, r / 2, "#e9e5de", 2.2); ellipse(c, x, y - 18, r - 6, r / 2 - 3, "#7d8f93");
      line(c, [[x - r + 2, y - 18], [x - r + 2, y - 62]], 2.6); line(c, [[x + r - 2, y - 18], [x + r - 2, y - 62]], 2.6);
      poly(c, [[x - r - 10, y - 60], [x, y - 82], [x + r + 10, y - 60]], "#6f6b65"); hatch(c, [[x, y - 82], [x + r + 10, y - 60], [x, y - 58]], 4, "#4c4945");
      line(c, [[x, y - 60], [x, y - 36]], 1.4); poly(c, [[x - 5, y - 36], [x + 5, y - 36], [x + 4, y - 28], [x - 4, y - 28]], "#b8b3ab", 1.6);
      top = 104; break;
    }
    case "raven-post": {
      const a = 0.55, b = 0.55, h = 62;
      box(c, ci, cj, a, b, h);
      door(c, ci, cj, b, dk, 24, 0.16); win(c, "L", ci, cj, a, b, ci + 0.25, 36, 0.12, 12); win(c, "R", ci, cj, a, b, cj, 40, 0.12, 12);
      const pk = P(ci, cj, h + 38), r = [P(ci - a - 0.1, cj + b + 0.1, h), P(ci + a + 0.1, cj + b + 0.1, h), P(ci + a + 0.1, cj - b - 0.1, h)];
      poly(c, [r[0], r[1], pk], "#4e4b47"); poly(c, [r[1], r[2], pk], "#3a3734");
      const [bx, by] = [pk[0] + 4, pk[1] + 2];
      c.fillStyle = INK; c.beginPath(); c.moveTo(bx - 9, by); c.quadraticCurveTo(bx - 4, by - 10, bx + 4, by - 8); c.lineTo(bx + 10, by - 6); c.lineTo(bx + 4, by - 4); c.quadraticCurveTo(bx, by + 2, bx - 9, by); c.fill();
      const [lx, ly] = P(ci, cj + b, 14); poly(c, [[lx - 7, ly - 5], [lx + 7, ly - 1], [lx + 7, ly + 7], [lx - 7, ly + 3]], "#f3f1ec", 1.6); line(c, [[lx - 7, ly - 5], [lx, ly + 3], [lx + 7, ly - 1]], 1.2);
      top = h + 64; break;
    }
  }
  const [tx, ty] = P(ci, cj, top);
  const w = tag(c, tx, ty, name, false);
  const [, gy] = P(ci + 1, cj + 1);
  o.bbox = [tx - Math.max(w / 2, 64), ty - 16, tx + Math.max(w / 2, 64), gy + 6];
}

function drawFire(c: C, t: number, ws: WorldState) {
  const [x, y] = P(FIRE[0] + 0.5, FIRE[1] + 0.5);
  ellipse(c, x, y, 34, 15, "#cfcac2", 1.6);
  for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; ellipse(c, x + Math.cos(a) * 30, y + Math.sin(a) * 13, 6, 4, "#b5b0a8", 1.4); }
  const keys = Object.keys(ws.ember) as Ember[];
  keys.forEach((e, i) => {
    const a = (i / keys.length) * Math.PI * 2 + 0.3, v = ws.ember[e] / 10;
    const ex = x + Math.cos(a) * 16, ey = y + Math.sin(a) * 7;
    c.lineCap = "round"; c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.moveTo(x, y - 8); c.lineTo(ex, ey); c.stroke();
    c.strokeStyle = `hsl(0 0% ${78 - v * 46}%)`; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y - 8); c.lineTo(ex, ey); c.stroke();
  });
  const s = Math.min(1.5, 0.8 + ws.lvl * 0.05), fl = 1 + Math.sin(t * 7) * 0.05;
  const flame = (k: number, col: string) => {
    const h = 44 * k * s * fl, w = 14 * k * s;
    c.beginPath(); c.moveTo(x, y - 6 - h); c.bezierCurveTo(x + w, y - 6 - h * 0.45, x + w * 1.1, y - 8, x, y - 4);
    c.bezierCurveTo(x - w * 1.1, y - 8, x - w, y - 6 - h * 0.45, x, y - 6 - h); c.fillStyle = col; c.fill();
  };
  c.globalAlpha = 0.09; ellipse(c, x, y - 18, 56 * s, 36 * s, RED); c.globalAlpha = 1;
  flame(1, RED); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); flame(0.66, "#ec9a8f"); flame(0.34, "#fbf1e8");
}

// ---------- the Scáth, walking ----------
export const pl = { i: SPAWN[0] + 0.5, j: SPAWN[1] + 0.5, face: 1, moving: false, step: 0, path: [] as [number, number][] };
const BODY = new Path2D("M60 26C82 28 88 52 86 70C90 96 94 118 90 128Q60 134 30 128C26 118 30 96 34 70C32 52 38 28 60 26Z");
function drawPlayer(c: C, t: number, look: GuiserOpts) {
  const [x, y] = P(pl.i, pl.j);
  const walk = pl.moving ? pl.step * 9 : 0;
  const bob = pl.moving ? Math.abs(Math.sin(walk)) * 2.2 : Math.sin(t * 2) * 0.5;
  const sw = pl.moving ? Math.sin(walk) * 7 : 0;
  ellipse(c, x, y + 1, 13, 5, "rgba(60,56,52,.28)");
  c.save(); c.translate(x, y - bob); const sc = 0.42; c.scale(pl.face * sc, sc); c.translate(-60, -136);
  // glow
  c.globalAlpha = 0.22; ellipse(c, 60, 82, 36, 46, look.glow ?? "#f2b84b"); c.globalAlpha = 1;
  // staff behind
  if (look.staff) { line(c, [[90, 34], [86 + (pl.moving ? sw * 0.2 : 0), 138]], 4.5, look.staff === "drift" ? "#a7a29a" : "#6b4a2e"); if (look.staff === "rowan") { ellipse(c, 94, 40, 3, 3, RED); ellipse(c, 97, 36, 3, 3, RED); } }
  // legs: they swing as you walk, so the Scáth walks instead of gliding
  c.lineCap = "round"; c.strokeStyle = INK; c.lineWidth = 7;
  c.beginPath(); c.moveTo(50, 122); c.lineTo(50 - sw, 136); c.moveTo(70, 122); c.lineTo(70 + sw, 136); c.stroke();
  c.lineWidth = 6; c.beginPath(); c.moveTo(46 - sw, 137); c.lineTo(53 - sw, 137); c.moveTo(67 + sw, 137); c.lineTo(74 + sw, 137); c.stroke();
  // cloak
  c.fillStyle = look.hood || INK; c.fill(BODY); c.lineWidth = 3; c.strokeStyle = INK; c.stroke(BODY);
  if (look.trim) { c.strokeStyle = look.trim; c.lineWidth = 4; c.beginPath(); c.moveTo(30, 126); c.quadraticCurveTo(60, 132, 90, 126); c.stroke(); }
  c.strokeStyle = look.hood || INK; c.lineWidth = 5; c.beginPath(); c.moveTo(60, 22); c.lineTo(64, 14); c.stroke();
  // face and the two white eyes
  ellipse(c, 60, 58, 17, 19, "#3d3935");
  const blink = (t % 4.2) < 0.12 ? 0.15 : 1;
  ellipse(c, 53, 58, 4.4, 5.8 * blink, "#fbfaf6"); ellipse(c, 67, 58, 4.4, 5.8 * blink, "#fbfaf6");
  // arms swing opposite the legs
  ellipse(c, 38 + sw * 0.4, 104, 4.5, 4.5, INK); ellipse(c, 82 - sw * 0.4, 104, 4.5, 4.5, INK);
  // satchel
  if (look.satchel) { line(c, [[42, 74], [76, 110]], 3, look.bagColor ?? "#8c5a3c"); c.fillStyle = look.bagColor ?? "#8c5a3c"; c.beginPath(); c.roundRect(66, 104, 22, 17, 3); c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); }
  c.restore();
}

// ---------- loop ----------
let ws: WorldState | null = null;
let cam = { x: -1, y: -1 }, raf = 0, last = 0, pending: BuildingId | null = null, near: BuildingId | null = null;
const keys = new Set<string>();
let keysBound = false;
let hooks: { enter: (id: BuildingId) => void; near: (id: BuildingId | null) => void; locked: (id: BuildingId) => void; moved: () => void; isOpen: (id: BuildingId) => boolean } | null = null;

export function worldSVG(state: WorldState): string {
  ws = state;
  return `<canvas id="world" role="application" aria-label="Your Hollow. Tap the ground to walk, tap a building to go inside. Arrow keys also work."></canvas>`;
}

const walkable = (i: number, j: number) => { const a = Math.floor(i), b = Math.floor(j); return inb(a, b) && !B[a][b]; };
function walkTo(tgt: [number, number]) {
  const s: [number, number] = [Math.floor(pl.i), Math.floor(pl.j)];
  const path = bfs(s, tgt, (i, j) => !B[i][j]);
  if (path) { pl.path = path.slice(1).map(([i, j]) => [i + 0.5, j + 0.5] as [number, number]); if (!pl.path.length) pl.path = [[tgt[0] + 0.5, tgt[1] + 0.5]]; }
}
const bldObjs = () => objs.filter((o): o is Extract<Obj, { type: "bld" }> => o.type === "bld");

export function standAtDoor(id: BuildingId) {
  const o = bldObjs().find((x) => x.id === id);
  if (!o) return;
  pl.i = o.door[0] + 0.5; pl.j = o.door[1] + 1.3; pl.path = []; pending = null;
}

export function attachWorld(h: NonNullable<typeof hooks>) {
  hooks = h;
  cancelAnimationFrame(raf);
  const cv = document.getElementById("world") as HTMLCanvasElement | null;
  if (!cv || !ws) return;
  if (!ground) buildGround();
  sprites();
  cam = { x: -1, y: -1 };
  const ctx = cv.getContext("2d")!;
  const size = () => { const r = cv.getBoundingClientRect(); cv.width = Math.max(1, r.width * DPR); cv.height = Math.max(1, r.height * DPR); return r; };
  let rect = size();
  const onResize = () => { rect = size(); };
  addEventListener("resize", onResize);

  cv.addEventListener("pointerdown", (e) => {
    const r = cv.getBoundingClientRect();
    const wx = e.clientX - r.left + cam.x, wy = e.clientY - r.top + cam.y;
    hooks?.moved();
    const hit = [...bldObjs()].sort((a, b) => b.ci + b.cj - (a.ci + a.cj)).find((o) => o.bbox && wx >= o.bbox[0] && wx <= o.bbox[2] && wy >= o.bbox[1] && wy <= o.bbox[3]);
    if (hit) {
      if (!hooks?.isOpen(hit.id)) { hooks?.locked(hit.id); return; }
      if (Math.hypot(pl.i - (hit.door[0] + 0.5), pl.j - (hit.door[1] + 0.5)) < 0.8) { hooks?.enter(hit.id); return; }
      walkTo(hit.door); pending = hit.id; return;
    }
    const i = Math.floor((wy - OY) / TH + (wx - OX) / TW), j = Math.floor((wy - OY) / TH - (wx - OX) / TW);
    if (!inb(i, j)) return;
    let tgt: [number, number] = [i, j];
    if (B[i][j]) {
      let best: [number, number, number] | null = null;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (inb(i + a, j + b) && !B[i + a][j + b]) { const d = Math.hypot(a, b); if (!best || d < best[2]) best = [i + a, j + b, d]; }
      if (!best) return; tgt = [best[0], best[1]];
    }
    walkTo(tgt); pending = null;
  });
  if (!keysBound) {
    keysBound = true;
    addEventListener("keydown", (e) => {
      if (!document.getElementById("world") || document.querySelector(".sheet")) return;
      if ((e.target as HTMLElement).closest?.("input,textarea")) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "w", "a", "s", "d"].includes(k)) { keys.add(k); e.preventDefault(); hooks?.moved(); }
    });
    addEventListener("keyup", (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
    addEventListener("blur", () => keys.clear());
  }
  last = performance.now();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const frame = (now: number) => {
    const cvNow = document.getElementById("world");
    if (cvNow !== cv) { removeEventListener("resize", onResize); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = reduce ? 0 : now / 1000;
    // movement
    let vx = 0, vy = 0;
    if (keys.has("ArrowLeft") || keys.has("a")) vx -= 1; if (keys.has("ArrowRight") || keys.has("d")) vx += 1;
    if (keys.has("ArrowUp") || keys.has("w")) vy -= 1; if (keys.has("ArrowDown") || keys.has("s")) vy += 1;
    const speed = 160;
    if (vx || vy) {
      pl.path = []; pending = null; const m = Math.hypot(vx, vy); vx /= m; vy /= m;
      const di = ((vx * speed) / TW + (vy * speed) / TH) * dt, dj = ((vy * speed) / TH - (vx * speed) / TW) * dt, r = 0.28;
      if (walkable(pl.i + di + Math.sign(di) * r, pl.j)) pl.i += di;
      if (walkable(pl.i, pl.j + dj + Math.sign(dj) * r)) pl.j += dj;
      if (vx) pl.face = vx > 0 ? 1 : -1; pl.moving = true; pl.step += dt;
    } else if (pl.path.length) {
      const [ti, tj] = pl.path[0], di = ti - pl.i, dj = tj - pl.j, d = Math.hypot(di, dj), s = 3.6 * dt;
      if (d <= s) { pl.i = ti; pl.j = tj; pl.path.shift(); if (!pl.path.length && pending) { const p = pending; pending = null; pl.moving = false; hooks?.enter(p); return; } }
      else { pl.i += (di / d) * s; pl.j += (dj / d) * s; }
      const sx = di - dj; if (Math.abs(sx) > 0.05) pl.face = sx > 0 ? 1 : -1; pl.moving = true; pl.step += dt;
    } else pl.moving = false;
    // camera
    const [px, py] = P(pl.i, pl.j), VW = rect.width, VH = rect.height;
    const tx = px - VW / 2, ty = py - 40 - VH / 2;
    if (cam.x < -0.5 && cam.y < -0.5) cam = { x: tx, y: ty };
    else { cam.x += (tx - cam.x) * Math.min(1, dt * 6); cam.y += (ty - cam.y) * Math.min(1, dt * 6); }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = "#cfcac2"; ctx.fillRect(0, 0, VW, VH);
    ctx.drawImage(ground!, -cam.x, -cam.y, WW, WH);
    ctx.translate(-cam.x, -cam.y);
    const all: (Obj | { type: "player"; depth: number })[] = [...objs, { type: "player", depth: pl.i + pl.j }];
    all.sort((a, b) => a.depth - b.depth);
    for (const o of all) {
      if (o.type === "player") { drawPlayer(ctx, t, ws!.look); continue; }
      if (o.type === "bld") { drawBuilding(ctx, o, t, ws!); continue; }
      if (o.type === "fire") { drawFire(ctx, t, ws!); continue; }
      const [x, y] = P(o.i, o.j);
      if (x < cam.x - 120 || x > cam.x + VW + 120 || y < cam.y - 40 || y > cam.y + VH + 160) continue;
      const sp = sprites()[o.type][o.v]; ctx.drawImage(sp.cv, x - sp.ax, y - sp.ay, sp.w, sp.h);
    }
    if (pl.path.length) { const g = pl.path[pl.path.length - 1], [gx, gy] = P(g[0], g[1]); ctx.beginPath(); ctx.ellipse(gx, gy, 9 + Math.sin(t * 6) * 1.5, 4.5, 0, 0, 7); ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.stroke(); }
    // fog at the edges of the view
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const gr = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.42, VW / 2, VH / 2, Math.max(VW, VH) * 0.75);
    gr.addColorStop(0, "rgba(214,209,201,0)"); gr.addColorStop(1, "rgba(214,209,201,.85)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
    // the nearest open door
    let best: BuildingId | null = null, bd = 1.2;
    for (const o of bldObjs()) { const d = Math.hypot(pl.i - (o.door[0] + 0.5), pl.j - (o.door[1] + 0.5)); if (d < bd) { bd = d; best = o.id; } }
    if (pl.path.length) best = null;
    if (best !== near) { near = best; hooks?.near(best); }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  hooks.near(near);
}

// Where a building's sign sits on screen right now (used by tests and the list view).
export function signOnScreen(id: BuildingId): [number, number] | null {
  const o = bldObjs().find((x) => x.id === id), cv = document.getElementById("world");
  if (!o?.bbox || !cv) return null;
  const r = cv.getBoundingClientRect();
  return [(o.bbox[0] + o.bbox[2]) / 2 - cam.x + r.left, o.bbox[1] + 20 - cam.y + r.top];
}
(globalThis as any).__thinplace = { signOnScreen };
