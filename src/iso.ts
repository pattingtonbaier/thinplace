// The walkable Hollow: an isometric, inked village inside a palisade, with a river, dark forests
// and fields. Grey ink on paper; red is kept for the few things that need you.
import { ACTIONS, BUILDINGS, type BuildingId, type Ember } from "./content";
import type { GuiserOpts } from "./art";
import { drawStaff } from "./staffs";
import { drawBuilding, type Rooms } from "./buildings";
import { h2, kit } from "./ink";

export interface WorldState {
  open: (id: BuildingId) => boolean;
  level: (id: BuildingId) => number;
  rooms: (id: BuildingId) => Rooms;
  ember: Record<Ember, number>;
  lvl: number;
  look: GuiserOpts;
  firstTime: boolean;
}

// ---------- the board ----------
const N = 36, TW = 64, TH = 32, MX = 260, MT = 320, MB = 240;
const WW = N * TW + 2 * MX, WH = N * TH + MT + MB, OX = MX + N * TW / 2, OY = MT;
const INK = "#1e1c1a", LIGHT = "#f3f1ec", GROUND = "#e2ded6", PATH = "#efece6", WATER = "#b9b6b0", RED = "#d2483a";
type Pt = [number, number];
const P = (i: number, j: number, z = 0): Pt => [OX + (i - j) * TW / 2, OY + (i + j) * TH / 2 - z];
function mul(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const jit = (x: number, y: number) => [(h2(Math.round(x * 3), Math.round(y * 3)) - 0.5) * 1.5, (h2(Math.round(y * 3) + 7, Math.round(x * 3)) - 0.5) * 1.5];

const PLOT: Record<string, [number, number]> = {
  "bothy": [17, 20], "stone-field": [10, 19], "ogham-tower": [23, 13], "forge": [11, 12], "craft-hall": [23, 20],
  "bards-lane": [13, 8], "wildwood": [7, 6], "feasting-halls": [23, 26], "market-square": [15, 27],
  "healing-well": [25, 5], "raven-post": [7, 26],
};
const FIRE: Pt = [15, 16];
const SPAWN: Pt = [17, 18];
const HARBOUR_J = 28;
const riverX = (j: number) => 31.2 + 1.5 * Math.sin(j / 4.2) + 0.6 * Math.sin(j / 1.7);

// 0 ground, 1 water, 2 path, 3 bridge, 4 field
const T: number[][] = [...Array(N)].map(() => Array(N).fill(0));
const B: boolean[][] = [...Array(N)].map(() => Array(N).fill(false)); // scenery and buildings
let W: boolean[][] = [...Array(N)].map(() => Array(N).fill(false)); // the palisade
type Bld = { type: "bld"; id: BuildingId; ci: number; cj: number; door: Pt; depth: number; bbox?: number[] };
type Prop = { type: "prop"; kind: "cart" | "woodpile" | "haystack" | "barrel" | "boathouse" | "nets" | "boat"; i: number; j: number; depth: number };
type Obj = Bld | Prop
  | { type: "pine" | "dpine" | "round"; i: number; j: number; v: number; depth: number }
  | { type: "fire"; depth: number };
type Stake = { type: "stake" | "gate"; i: number; j: number; depth: number };
const objs: Obj[] = [];
let stakes: Stake[] = [];
const inb = (i: number, j: number) => i >= 0 && j >= 0 && i < N && j < N;

function bfs(s: Pt, g: Pt, ok: (i: number, j: number) => boolean, diag = true): Pt[] | null {
  const key = (i: number, j: number) => i * N + j, prev = new Map<number, number | null>([[key(...s), null]]), q: Pt[] = [s];
  const dirs = diag ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (q.length) {
    const [i, j] = q.shift()!;
    if (i === g[0] && j === g[1]) { const out: Pt[] = []; let k: number | null | undefined = key(i, j); while (k != null) { out.push([Math.floor(k / N), k % N]); k = prev.get(k); } return out.reverse(); }
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
  const rnd = mul(20261102);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (((i + 0.5 - 3.6) / 2.4) ** 2 + ((j + 0.5 - 15) / 3.2) ** 2 < 1) { T[i][j] = 1; B[i][j] = true; }
    if (Math.abs(i + 0.5 - riverX(j)) < 1.6) { T[i][j] = 1; B[i][j] = true; }
  }
  B[FIRE[0]][FIRE[1]] = true; objs.push({ type: "fire", depth: FIRE[0] + FIRE[1] + 1 });
  for (const b of BUILDINGS) {
    const [i, j] = PLOT[b.id];
    for (let a = 0; a < 2; a++) for (let c = 0; c < 2; c++) B[i + a][j + c] = true;
    objs.push({ type: "bld", id: b.id, ci: i + 1, cj: j + 1, door: [i, j + 2], depth: i + j + 2.4 });
  }
  for (let i = 12; i <= 19; i++) for (let j = 13; j <= 20; j++) if (Math.hypot(i - 15.5, j - 16.5) < 2.7 && !B[i][j]) T[i][j] = 2;
  for (const o of objs) {
    if (o.type !== "bld") continue;
    (bfs(SPAWN, o.door, (i, j) => !B[i][j], false) ?? []).forEach(([i, j]) => (T[i][j] = 2));
    T[o.door[0]][o.door[1]] = 2;
  }
  // the east road, over the river to the Old Roads
  for (let i = SPAWN[0]; i < N; i++) { const j = 18; if (T[i][j] === 1) { T[i][j] = 3; B[i][j] = false; } else if (!B[i][j]) T[i][j] = 2; }
  // a little harbour on the west bank: a jetty, a boathouse, nets drying, boats tied up
  {
    const hj = HARBOUR_J;
    let iw = 0; while (iw < N && T[iw][hj] !== 1) iw++;
    T[iw][hj] = 5; B[iw][hj] = false;
    (bfs([iw - 1, 18], [iw - 1, hj], (i, j) => !B[i][j], false) ?? []).forEach(([i, j]) => { if (T[i][j] === 0 || T[i][j] === 4) T[i][j] = 2; });
    const put = (i: number, j: number, kind: Prop["kind"], di = 0.5, dj = 0.5) => { B[i][j] = true; objs.push({ type: "prop", kind, i: i + di, j: j + dj, depth: i + j + 1 }); };
    put(iw - 1, hj - 2, "boathouse"); put(iw - 1, hj + 2, "nets"); put(iw - 2, hj + 1, "barrel");
    objs.push({ type: "prop", kind: "boat", i: iw + 0.5, j: hj - 0.75, depth: iw + hj });
    objs.push({ type: "prop", kind: "boat", i: iw + 0.55, j: hj + 1.3, depth: iw + hj + 2 });
  }
  for (const [i0, j0, w, h] of [[11, 23, 3, 3], [27, 22, 2, 4], [19, 2, 4, 2]] as [number, number, number, number][])
    for (let i = i0; i < i0 + w; i++) for (let j = j0; j < j0 + h; j++) if (inb(i, j) && T[i][j] === 0 && !B[i][j]) T[i][j] = 4;
  const nearPlot = (i: number, j: number) => Object.values(PLOT).some(([a, b]) => i >= a - 1 && i <= a + 2 && j >= b - 1 && j <= b + 3);
  const nextToPath = (i: number, j: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inb(i + a, j + b) && (T[i + a][j + b] === 2 || T[i + a][j + b] === 3));
  for (const [i, j, kind] of [[14, 23, "haystack"], [10, 22, "woodpile"], [20, 17, "cart"], [13, 18, "barrel"], [21, 10, "woodpile"], [26, 24, "haystack"], [19, 25, "cart"]] as [number, number, Prop["kind"]][])
    if (!B[i][j] && T[i][j] !== 2 && T[i][j] !== 3) { B[i][j] = true; objs.push({ type: "prop", kind, i: i + 0.5, j: j + 0.5, depth: i + j + 1 }); }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (B[i][j] || T[i][j] !== 0 || Math.hypot(i - 16, j - 17) < 3.5 || nearPlot(i, j)) continue;
    if (nextToPath(i, j) && rnd() < 0.7) continue;
    if (Math.abs(i + 0.5 - riverX(j)) < 3.2 && rnd() < 0.75) continue; // keep the river banks open so the water shows
    const edge = Math.min(i, j, N - 1 - i, N - 1 - j);
    const beyondRiver = i > riverX(j) + 1;
    const forest = edge < 4 || beyondRiver || (i < 10 && j < 10 && !(i > 4 && i < 10 && j > 3 && j < 9));
    if (rnd() < (forest ? 0.7 : 0.08)) {
      B[i][j] = true;
      const pine = rnd() < (forest ? 0.8 : 0.35);
      objs.push({ type: pine ? (forest && rnd() < 0.55 ? "dpine" : "pine") : "round", i: i + 0.5 + (rnd() - 0.5) * 0.35, j: j + 0.5 + (rnd() - 0.5) * 0.35, v: Math.floor(rnd() * 3), depth: i + j + 1 });
    }
  }
})();

// ---------- the palisade: a ring of stakes that grows to take in every building you've found ----------
function hull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Pt[] = [], up: Pt[] = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
let wallKey = "";
function buildWall(open: BuildingId[]) {
  const key = open.join(",");
  if (key === wallKey) return;
  wallKey = key;
  const pts: Pt[] = [];
  const ring = (ci: number, cj: number, r: number) => { for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; pts.push([ci + Math.cos(a) * r, cj + Math.sin(a) * r]); } };
  ring(16, 17, 5.2);
  for (const id of open) { const [i, j] = PLOT[id]; ring(i + 1, j + 1.6, 3.8); }
  const hl = hull(pts);
  W = [...Array(N)].map(() => Array(N).fill(false));
  const raw: Stake[] = [];
  for (let k = 0; k < hl.length; k++) {
    const a = hl[k], b = hl[(k + 1) % hl.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(len / 0.3);
    for (let s = 0; s < n; s++) {
      const i = a[0] + ((b[0] - a[0]) * s) / n, j = a[1] + ((b[1] - a[1]) * s) / n, ti = Math.floor(i), tj = Math.floor(j);
      if (!inb(ti, tj) || T[ti][tj] === 1) continue;
      if (T[ti][tj] === 2 || T[ti][tj] === 3) { raw.push({ type: "gate", i, j, depth: i + j }); continue; }
      if (B[ti][tj]) continue;
      W[ti][tj] = true; raw.push({ type: "stake", i, j, depth: i + j });
    }
  }
  // keep only the posts at either side of each gap as gateposts
  stakes = raw.filter((s, k) => s.type === "stake" || raw[k - 1]?.type === "stake" || raw[k + 1]?.type === "stake");
}

// ---------- drawing helpers ----------
type C = CanvasRenderingContext2D;
function pathPts(c: C, pts: Pt[], close = true) { c.beginPath(); pts.forEach(([x, y], k) => { const [a, b] = jit(x, y); k ? c.lineTo(x + a, y + b) : c.moveTo(x + a, y + b); }); if (close) c.closePath(); }
function poly(c: C, pts: Pt[], fill: string | null, lw = 2.2) { pathPts(c, pts); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.strokeStyle = INK; c.lineWidth = lw; c.lineJoin = "round"; c.stroke(); } }
function line(c: C, pts: Pt[], lw = 2, col = INK) { pathPts(c, pts, false); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(); }
function hatch(c: C, pts: Pt[], gap = 5, col = "#8b867f", lw = 1.1) {
  c.save(); c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); for (let x = x0 - (y1 - y0); x < x1; x += gap) { c.moveTo(x, y1); c.lineTo(x + (y1 - y0), y0); } c.stroke(); c.restore();
}
function ellipse(c: C, x: number, y: number, rx: number, ry: number, fill: string, stroke = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = stroke; c.strokeStyle = INK; c.stroke(); } }

// ---------- sprites ----------
const DPR = Math.min(2, (globalThis as any).devicePixelRatio || 1);
type Sprite = { cv: HTMLCanvasElement; w: number; h: number; ax: number; ay: number };
function sprite(w: number, h: number, ax: number, ay: number, fn: (c: C) => void): Sprite {
  const cv = document.createElement("canvas"); cv.width = w * DPR; cv.height = h * DPR;
  const c = cv.getContext("2d")!; c.scale(DPR, DPR); c.translate(ax, ay); fn(c);
  return { cv, w, h, ax, ay };
}
let SPR: Record<"pine" | "dpine" | "round", Sprite[]> | null = null;
function sprites() {
  if (SPR) return SPR;
  const pine = (s: number, fill: string, shade: string, hatchCol: string) => sprite(60, 100, 30, 88, (c) => {
    ellipse(c, 2, 2, 15 * s, 5 * s, "#cbc6bd"); line(c, [[0, 0], [0, -7]], 2.4);
    const pts: Pt[] = [[0, -70 * s], [-9 * s, -52 * s], [-5 * s, -52 * s], [-15 * s, -32 * s], [-8 * s, -32 * s], [-20 * s, -8 * s], [20 * s, -8 * s], [8 * s, -32 * s], [15 * s, -32 * s], [5 * s, -52 * s], [9 * s, -52 * s]];
    poly(c, pts, fill, 0); c.save(); pathPts(c, pts); c.clip(); c.fillStyle = shade; c.fillRect(1, -90, 40, 90); hatch(c, [[1, -90], [41, -90], [41, 0], [1, 0]], 3.4, hatchCol, 1); c.restore(); poly(c, pts, null, 2.2);
  });
  SPR = {
    pine: [1, 1.15, 0.88].map((s) => pine(s, LIGHT, "#c6c1b9", "#a8a39b")),
    dpine: [1.05, 1.25, 0.92].map((s) => pine(s, "#8f8a83", "#5f5b55", "#3d3a36")),
    round: [1, 1.2, 0.85].map((s) => sprite(70, 80, 35, 70, (c) => {
      ellipse(c, 3, 2, 18 * s, 6 * s, "#cbc6bd"); line(c, [[0, 0], [0, -12 * s]], 3);
      const cs = [[-9 * s, -22 * s, 11 * s], [8 * s, -24 * s, 12 * s], [0, -35 * s, 13 * s], [-2 * s, -20 * s, 10 * s]];
      c.lineWidth = 4.6; c.strokeStyle = INK; cs.forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); });
      c.fillStyle = "#d5d0c8"; cs.forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); });
      c.save(); c.beginPath(); cs.forEach(([x, y, r]) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, 7); }); c.clip();
      c.fillStyle = "#aea9a1"; cs.forEach(([x, y, r]) => { c.beginPath(); c.arc(x + 6 * s, y + 6 * s, r, 0, 7); c.fill(); }); c.restore();
    })),
  };
  return SPR;
}

// Buildings are drawn once into their own sprite, and redrawn only when a room opens.
const bldCache = new Map<string, { s: Sprite; top: number }>();
function buildingSprite(id: BuildingId, rooms: Rooms) {
  const key = id + "|" + Object.keys(rooms).sort().join(",");
  const hit = bldCache.get(key);
  if (hit) return hit;
  let top = 0;
  const s = sprite(320, 340, 160, 250, (c) => {
    const Pl = (x: number, y: number, z = 0): Pt => [(x - y) * TW / 2, (x + y) * TH / 2 - z];
    top = drawBuilding(kit(c, Pl, 1), id, rooms, 1.3);
  });
  for (const k of [...bldCache.keys()]) if (k.startsWith(id + "|")) bldCache.delete(k);
  const out = { s, top };
  bldCache.set(key, out);
  return out;
}
function allRooms(id: BuildingId): Rooms { const r: Rooms = { "the hearth desk": 1 }; for (const a of ACTIONS) if (a.building === id) r[a.room] = 1; return r; }

// ---------- the ground ----------
let ground: HTMLCanvasElement | null = null;
function buildGround() {
  const rnd = mul(7);
  const cv = document.createElement("canvas"); cv.width = WW * DPR; cv.height = WH * DPR;
  const c = cv.getContext("2d")!; c.scale(DPR, DPR);
  c.fillStyle = "#cfcac2"; c.fillRect(0, 0, WW, WH);
  c.fillStyle = "rgba(30,28,26,.07)"; for (let x = 0; x < WW; x += 22) for (let y = 0; y < WH; y += 22) { c.beginPath(); c.arc(x, y, 1, 0, 7); c.fill(); }
  const d = 30, E = [P(0, N), P(N, N), P(N, 0)];
  const left: Pt[] = [E[0], E[1], [E[1][0], E[1][1] + d], [E[0][0], E[0][1] + d]];
  const right: Pt[] = [E[1], E[2], [E[2][0], E[2][1] + d], [E[1][0], E[1][1] + d]];
  poly(c, left, "#d9d5ce", 2.4); poly(c, right, "#aaa59d", 2.4); hatch(c, right, 4, "#7f7a73"); hatch(c, left, 9, "#a39e97");
  for (const [a, b] of [[E[0], E[1]], [E[1], E[2]]] as [Pt, Pt][])
    for (let u = 0; u < 1; u += 0.01) { const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u; c.beginPath(); c.arc(x, y + 2, 4 + h2(x, y) * 2, 0, Math.PI); c.fillStyle = GROUND; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke(); }
  poly(c, [P(0, 0), P(N, 0), P(N, N), P(0, N)], GROUND, 0);
  const tile = (i: number, j: number, fill: string) => { const q = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)]; c.beginPath(); q.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = fill; c.fill(); };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (T[i][j] === 2 || T[i][j] === 3) tile(i, j, PATH);
    if (T[i][j] === 1 || T[i][j] === 5) tile(i, j, WATER);
    if (T[i][j] === 4) tile(i, j, "#e8e4da");
  }
  // a faint grid, like a surveyor's sheet
  c.lineWidth = 1;
  for (let k = 0; k <= N; k++) { c.strokeStyle = "rgba(30,28,26,.05)"; c.beginPath(); c.moveTo(...P(k, 0)); c.lineTo(...P(k, N)); c.moveTo(...P(0, k)); c.lineTo(...P(N, k)); c.stroke(); }
  const edges = (i: number, j: number) => [[1, 0, [i + 1, j], [i + 1, j + 1]], [-1, 0, [i, j], [i, j + 1]], [0, 1, [i, j + 1], [i + 1, j + 1]], [0, -1, [i, j], [i + 1, j]]] as [number, number, Pt, Pt][];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (T[i][j] === 1) {
      for (let n = 0; n < 3; n++) { const [x, y] = P(i + 0.2 + rnd() * 0.6, j + 0.2 + rnd() * 0.6); line(c, [[x - 6, y], [x - 2, y - 1.5], [x + 2, y], [x + 6, y - 1.5]], 1.3, "#6d6862"); }
      for (const [a, b, p1, p2] of edges(i, j)) if (inb(i + a, j + b) && T[i + a][j + b] !== 1 && T[i + a][j + b] !== 3 && T[i + a][j + b] !== 5) {
        line(c, [P(...p1), P(...p2)], 2.4);
        for (let q = 0; q < 2; q++) { const u = 0.25 + q * 0.5, [x, y] = P(p1[0] + (p2[0] - p1[0]) * u, p1[1] + (p2[1] - p1[1]) * u); line(c, [[x, y], [x - 1, y - 7], [x + 1, y - 10]], 1.1, "#6d6862"); }
      }
    } else if (T[i][j] === 4) {
      for (let q = 1; q < 5; q++) line(c, [P(i + q / 5, j + 0.05), P(i + q / 5, j + 0.95)], 1.1, "#9b968f");
    } else if (T[i][j] === 0 && rnd() < 0.42) {
      const [x, y] = P(i + 0.2 + rnd() * 0.6, j + 0.2 + rnd() * 0.6);
      c.strokeStyle = "#8f8a83"; c.lineWidth = 1.3; c.lineCap = "round"; c.beginPath(); c.moveTo(x - 4, y - 3); c.lineTo(x - 2, y); c.lineTo(x, y - 4); c.lineTo(x + 2, y); c.lineTo(x + 4, y - 3); c.stroke();
    } else if (T[i][j] === 2 && rnd() < 0.3) { const [x, y] = P(i + 0.3 + rnd() * 0.4, j + 0.3 + rnd() * 0.4); ellipse(c, x, y, 2.2, 1.2, "#c5c0b8"); }
  }
  c.setLineDash([2, 4]);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (T[i][j] === 2)
    for (const [a, b, p1, p2] of edges(i, j)) if (inb(i + a, j + b) && T[i + a][j + b] === 0) line(c, [P(...p1), P(...p2)], 1.2, "#9b968f");
  c.setLineDash([]);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (T[i][j] === 3) {
    poly(c, [P(i, j + 0.1, 4), P(i + 1, j + 0.1, 4), P(i + 1, j + 0.9, 4), P(i, j + 0.9, 4)], "#e3dfd8", 1.8);
    for (let u = 0.2; u < 1; u += 0.2) line(c, [P(i + u, j + 0.1, 4), P(i + u, j + 0.9, 4)], 0.9, "#8d887f");
    poly(c, [P(i, j + 0.9, 4), P(i + 1, j + 0.9, 4), P(i + 1, j + 0.9, 0), P(i, j + 0.9, 0)], "#aaa59d", 1.4);
    for (const v of [0.1, 0.9]) line(c, [P(i, j + v, 14), P(i + 1, j + v, 14)], 1.8);
  }
  // the jetty: planks on posts, running out into the river
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (T[i][j] === 5) {
    line(c, [P(i, j), P(i, j + 1)], 2.4);
    for (const u of [0.35, 0.95]) for (const v of [0.28, 0.72]) { const [x, y] = P(i + u, j + v); line(c, [[x, y + 4], [x, y - 6]], 3.2); ellipse(c, x, y + 4, 4, 1.6, "rgba(60,56,52,.25)"); }
    poly(c, [P(i - 0.05, j + 0.25, 5), P(i + 1, j + 0.25, 5), P(i + 1, j + 0.75, 5), P(i - 0.05, j + 0.75, 5)], "#e3dfd8", 1.8);
    for (let u = 0.12; u < 1; u += 0.14) line(c, [P(i + u, j + 0.25, 5), P(i + u, j + 0.75, 5)], 0.9, "#8d887f");
    poly(c, [P(i - 0.05, j + 0.75, 5), P(i + 1, j + 0.75, 5), P(i + 1, j + 0.75, 1), P(i - 0.05, j + 0.75, 1)], "#aaa59d", 1.4);
    const [bx, by] = P(i + 0.92, j + 0.3, 5); line(c, [[bx, by], [bx, by - 7]], 3.4); ellipse(c, bx, by - 7, 2.2, 1, "#55524d", 1);
  }
  poly(c, [P(0, 0), P(N, 0), P(N, N), P(0, N)], null, 2.6);
  ground = cv;
}

// ---------- signs ----------
function tag(c: C, x: number, y: number, label: string, locked: boolean) {
  c.font = "16px 'Patrick Hand SC','Gochi Hand',cursive";
  const w = c.measureText(label).width + 24;
  c.save(); c.translate(x, y); c.rotate(-0.025);
  poly(c, [[-w / 2, -13], [w / 2, -13], [w / 2, 13], [-w / 2, 13]], locked ? "#e4e0d9" : "#f7f5f1", locked ? 1.4 : 2);
  c.fillStyle = locked ? "#7d7871" : INK; c.textBaseline = "middle"; c.textAlign = "center"; c.fillText(label, 0, 1);
  c.restore();
  return w;
}

let previewAll = false; // test-only: draw every building as if open, with every room
function drawBld(c: C, o: Bld, t: number, ws: WorldState) {
  const { ci, cj, id } = o;
  const name = BUILDINGS.find((b) => b.id === id)!.name.replace(/^The /, "").toUpperCase();
  const [x, y] = P(ci, cj);
  if (!ws.open(id) && !previewAll) {
    // low mist lying over the ground, drifting; a little cairn marks the spot
    const wisp = (wx: number, wy: number, w: number, h: number, a: number) => {
      c.beginPath(); c.moveTo(wx - w, wy); c.quadraticCurveTo(wx - w * 0.3, wy - h * 1.3, wx + w * 0.1, wy - h * 0.7); c.quadraticCurveTo(wx + w * 0.6, wy - h * 1.2, wx + w, wy);
      c.quadraticCurveTo(wx, wy + h * 0.45, wx - w, wy); c.fillStyle = `rgba(247,245,241,${a})`; c.fill();
      c.beginPath(); c.moveTo(wx - w * 0.85, wy - h * 0.25); c.quadraticCurveTo(wx - w * 0.3, wy - h * 1.3, wx + w * 0.1, wy - h * 0.7); c.quadraticCurveTo(wx + w * 0.55, wy - h * 1.15, wx + w * 0.85, wy - h * 0.2);
      c.strokeStyle = "rgba(30,28,26,.55)"; c.lineWidth = 1.3; c.lineCap = "round"; c.stroke();
    };
    for (let k = 0; k < 3; k++) { const p = P(ci - 0.3 + k * 0.3, cj + 0.5 - k * 0.4); ellipse(c, p[0], p[1] - 3 - k * 0.5, 7 - k * 1.2, 4 - k * 0.6, k % 2 ? "#cfcac2" : "#e3dfd8", 1.4); }
    const L = [[-30, 6, 54, 10, .9], [34, 2, 48, 9, .9], [0, -6, 66, 11, .92], [-22, -18, 50, 10, .88], [26, -22, 44, 9, .86], [2, -34, 40, 8, .8], [-8, 14, 58, 8, .85]];
    L.forEach(([dx, dy, w, h, a], k) => wisp(x + dx + Math.sin(t * 0.25 + k * 1.7) * 7, y - 14 + dy, w, h, a));
    const cp = P(ci + 0.3, cj + 0.3); for (let k = 0; k < 3; k++) ellipse(c, cp[0], cp[1] - 14 - k * 7, 8 - k * 2, 4.5 - k, k % 2 ? "#cfcac2" : "#e3dfd8", 1.6);
    tag(c, x, y - 74, `LEVEL ${ws.level(id)}`, true);
    o.bbox = [x - 70, y - 96, x + 70, y + 20];
    return;
  }
  const { s, top } = buildingSprite(id, previewAll ? allRooms(id) : ws.rooms(id));
  ellipse(c, x + 6, y + 4, TW * 0.9, TH * 0.9, "rgba(120,114,106,.16)");
  c.drawImage(s.cv, x - s.ax, y - s.ay, s.w, s.h);
  const w = tag(c, x, y - top - 8, name, false);
  o.bbox = [x - Math.max(w / 2, 70), y - top - 24, x + Math.max(w / 2, 70), y + TH + 6];
}

function drawProp(c: C, o: Prop) {
  const k = kit(c, (x, y, z = 0) => P(o.i + x, o.j + y, z), 1);
  if (o.kind === "cart") k.cart(0, 0);
  else if (o.kind === "haystack") k.haystack(0, 0);
  else if (o.kind === "barrel") { k.barrel(-0.15, 0); k.barrel(0.15, 0.15); }
  else if (o.kind === "boat") drawBoat(c, o.i, o.j, 1, "row", 0);
  else if (o.kind === "boathouse") {
    k.shadow(0.42, 0.34);
    k.walls(0.42, 0.34, 20, { front: "#e3dfd8", side: "#aaa59d", footing: 0 });
    for (let u = -0.32; u < 0.42; u += 0.12) k.line([P(o.i + u, o.j + 0.34, 1), P(o.i + u, o.j + 0.34, 19)], 0.8, "#8d887f");
    k.door(0.34, 0.08, 0.17, 16, false);
    k.slate(0.42, 0.34, 20, 16, "#77736d");
    k.lantern(-0.55, 0.45);
  } else if (o.kind === "nets") {
    for (const u of [-0.35, 0.35]) k.line([P(o.i + u, o.j, 0), P(o.i + u, o.j, 24)], 2.4);
    k.line([P(o.i - 0.4, o.j, 22), P(o.i + 0.4, o.j, 22)], 2);
    const top = [P(o.i - 0.33, o.j, 21), P(o.i + 0.33, o.j, 21)], bot = [P(o.i - 0.3, o.j, 6), P(o.i + 0.3, o.j, 4)];
    k.poly([top[0], top[1], bot[1], bot[0]], "rgba(246,244,240,.6)", 1.3);
    c.save(); c.beginPath(); [top[0], top[1], bot[1], bot[0]].forEach(([x, y], q) => (q ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
    c.strokeStyle = "#6d6862"; c.lineWidth = 0.8; c.beginPath(); for (let d = -60; d < 60; d += 4) { c.moveTo(top[0][0] + d, top[0][1] - 30); c.lineTo(top[0][0] + d + 40, top[0][1] + 30); c.moveTo(top[0][0] + d + 40, top[0][1] - 30); c.lineTo(top[0][0] + d, top[0][1] + 30); } c.stroke(); c.restore();
    k.ell(...P(o.i + 0.3, o.j + 0.35, 2), 6, 3, "#cfcac2", 1.2);
  }
  else for (let r = 0; r < 3; r++) for (let q = 0; q < 4 - r; q++) { const p = P(o.i - 0.3 + q * 0.18 + r * 0.09, o.j, 3 + r * 5.5); k.ell(p[0], p[1], 3.2, 3.8, "#e9e6df", 1.2); k.ell(p[0], p[1], 1.4, 1.7, null, 0.7); }
}

// A small boat, bow pointing along the river (+j when dir is 1). Sails are paper; one pennant is red.
function drawBoat(c: C, i: number, j: number, dir: number, kind: "sail" | "row", t: number) {
  const bob = Math.sin(t * 1.8 + j * 2) * 1.2, rock = Math.sin(t * 1.3 + j) * 0.03;
  const L = 0.72, Bm = 0.27, z = 6 + bob;
  const at = (u: number, v: number, zz: number) => P(i + v, j + u * dir, zz);
  const outline: [number, number][] = [[L, 0], [L * 0.45, Bm], [-L * 0.8, Bm * 0.9], [-L, Bm * 0.6], [-L, -Bm * 0.6], [-L * 0.8, -Bm * 0.9], [L * 0.45, -Bm]];
  const [wx, wy] = P(i, j);
  for (const r of [1, 1.6]) { c.beginPath(); c.ellipse(wx, wy + 2, 34 * r, 10 * r, 0, 0, 7); c.strokeStyle = `rgba(60,56,52,${0.35 / r})`; c.lineWidth = 1.1; c.stroke(); }
  const top = outline.map(([u, v]) => at(u, v, z)), bot = outline.map(([u, v]) => at(u * 0.82, v * 0.6, bob));
  for (let k = 0; k < outline.length; k++) {
    const n = (k + 1) % outline.length, A = top[k], Bp = top[n];
    poly(c, [A, Bp, bot[n], bot[k]], "#8f8a83", 1.4);
  }
  poly(c, top, "#d9d5ce", 2);
  poly(c, outline.map(([u, v]) => at(u * 0.8, v * 0.75, z - 1)), "#efece6", 1);
  for (const u of [-0.15, 0.15]) line(c, [at(u, -Bm * 0.7, z), at(u, Bm * 0.7, z)], 1.2, "#6d6862");
  if (kind === "row") {
    for (const s of [-1, 1]) line(c, [at(0, s * Bm * 0.9, z + 1), at(-0.25, s * (Bm + 0.32), bob)], 1.6);
    return;
  }
  const m0 = at(0.15, 0, z), m1: Pt = [m0[0], m0[1] - 58];
  line(c, [m0, m1], 2.2);
  const s0: Pt = [m0[0], m0[1] - 6], tip: Pt = [m1[0], m1[1] + 2], aft = at(-0.6, 0, z + 9);
  const sail: Pt[] = [tip, s0, [aft[0], aft[1]]];
  poly(c, [tip, [s0[0] + (aft[0] - s0[0]) * 0.1 + Math.sin(t + j) * 1.5, s0[1]], aft], "#f7f5f1", 1.8);
  hatch(c, sail, 5, "#c4bfb7", 0.8);
  line(c, [s0, aft], 1.6);
  const flap = Math.sin(t * 5 + j) * 2;
  poly(c, [m1, [m1[0] - 9 * dir + flap * 0.3, m1[1] + 2 + flap * 0.5], [m1[0], m1[1] + 5]], RED, 1);
}
// Boats that sail the river, turning at the ends of their stretch (never under the bridge).
const LANES = [{ a: 20.6, b: 34.2, speed: 0.32, kind: "sail" as const, off: 0.55, ph: 0 }, { a: 1.2, b: 16.4, speed: 0.26, kind: "sail" as const, off: 0.5, ph: 9 }, { a: 22, b: 33.5, speed: 0.4, kind: "row" as const, off: 0.6, ph: 20 }];
function boatsAt(t: number) {
  return LANES.map((L) => {
    const span = L.b - L.a, s = (t * L.speed + L.ph) % (span * 2), fwd = s < span, j = fwd ? L.a + s : L.b - (s - span);
    const i = riverX(j) + L.off;
    return { type: "boat" as const, i, j, dir: fwd ? 1 : -1, kind: L.kind, depth: i + j + 0.3 };
  });
}

function drawStake(c: C, s: Stake) {
  const [x, y] = P(s.i, s.j);
  const gate = s.type === "gate", h = gate ? 40 : 26 + h2(s.i * 10, s.j * 10) * 6, w = gate ? 5 : 3.6;
  poly(c, [[x - w, y], [x + w, y], [x + w, y - h], [x, y - h - 7], [x - w, y - h]], gate ? "#cfcac2" : "#e3dfd8", 1.6);
  hatch(c, [[x, y], [x + w, y], [x + w, y - h], [x, y - h - 7]], 2.6, "#8d887f", 0.8);
  if (!gate) line(c, [[x - w, y - 9], [x + w, y - 7]], 1, "#6d6862");
  else line(c, [[x - w - 2, y - h + 4], [x + w + 2, y - h + 4]], 2.2);
}

function drawFire(c: C, t: number, ws: WorldState) {
  const [x, y] = P(FIRE[0] + 0.5, FIRE[1] + 0.5);
  ellipse(c, x, y, 34, 15, "#cfcac2", 1.6);
  for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; ellipse(c, x + Math.cos(a) * 30, y + Math.sin(a) * 13, 6, 4, "#b5b0a8", 1.4); }
  const keys = Object.keys(ws.ember) as Ember[];
  keys.forEach((e, i) => {
    const a = (i / keys.length) * Math.PI * 2 + 0.3, v = ws.ember[e] / 10, ex = x + Math.cos(a) * 16, ey = y + Math.sin(a) * 7;
    c.lineCap = "round"; c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.moveTo(x, y - 8); c.lineTo(ex, ey); c.stroke();
    c.strokeStyle = `hsl(0 0% ${78 - v * 46}%)`; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y - 8); c.lineTo(ex, ey); c.stroke();
  });
  const s = Math.min(1.5, 0.8 + ws.lvl * 0.05), fl = 1 + Math.sin(t * 7) * 0.05;
  const flame = (k: number, col: string) => { const h = 44 * k * s * fl, w = 14 * k * s; c.beginPath(); c.moveTo(x, y - 6 - h); c.bezierCurveTo(x + w, y - 6 - h * 0.45, x + w * 1.1, y - 8, x, y - 4); c.bezierCurveTo(x - w * 1.1, y - 8, x - w, y - 6 - h * 0.45, x, y - 6 - h); c.fillStyle = col; c.fill(); };
  c.globalAlpha = 0.09; ellipse(c, x, y - 18, 56 * s, 36 * s, RED); c.globalAlpha = 1;
  flame(1, RED); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); flame(0.66, "#ec9a8f"); flame(0.34, "#fbf1e8");
}

// ---------- the Scáth, walking ----------
export const pl = { i: SPAWN[0] + 0.5, j: SPAWN[1] + 0.5, face: 1, moving: false, step: 0, path: [] as Pt[] };
const BODY = new Path2D("M60 26C82 28 88 52 86 70C90 96 94 118 90 128Q60 134 30 128C26 118 30 96 34 70C32 52 38 28 60 26Z");
function drawPlayer(c: C, t: number, look: GuiserOpts) {
  const [x, y] = P(pl.i, pl.j);
  const walk = pl.moving ? pl.step * 9 : 0;
  const bob = pl.moving ? Math.abs(Math.sin(walk)) * 2.2 : Math.sin(t * 2) * 0.5;
  const sw = pl.moving ? Math.sin(walk) * 7 : 0;
  ellipse(c, x, y + 1, 13, 5, "rgba(60,56,52,.28)");
  c.save(); c.translate(x, y - bob); const sc = 0.42; c.scale(pl.face * sc, sc); c.translate(-60, -136);
  c.globalAlpha = 0.22; ellipse(c, 60, 82, 36, 46, look.glow ?? "#f2b84b"); c.globalAlpha = 1;
  if (look.staff) drawStaff(c, look.staff);
  // legs swing as you walk, so the Scáth walks instead of gliding
  c.lineCap = "round"; c.strokeStyle = INK; c.lineWidth = 7;
  c.beginPath(); c.moveTo(50, 122); c.lineTo(50 - sw, 136); c.moveTo(70, 122); c.lineTo(70 + sw, 136); c.stroke();
  c.lineWidth = 6; c.beginPath(); c.moveTo(46 - sw, 137); c.lineTo(53 - sw, 137); c.moveTo(67 + sw, 137); c.lineTo(74 + sw, 137); c.stroke();
  c.fillStyle = look.hood || INK; c.fill(BODY);
  c.save(); c.clip(BODY); c.strokeStyle = "rgba(30,28,26,.22)"; c.lineWidth = 1; c.beginPath(); for (let k = 40; k < 150; k += 5) { c.moveTo(68, k + 40); c.lineTo(100, k); } c.stroke(); c.restore();
  c.strokeStyle = "rgba(30,28,26,.35)"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(48, 84); c.quadraticCurveTo(44, 104, 46, 124); c.moveTo(72, 86); c.quadraticCurveTo(76, 106, 74, 125); c.stroke();
  c.lineWidth = 3; c.strokeStyle = INK; c.stroke(BODY);
  if (look.trim) { c.strokeStyle = look.trim; c.lineWidth = 4; c.beginPath(); c.moveTo(30, 126); c.quadraticCurveTo(60, 132, 90, 126); c.stroke(); }
  c.strokeStyle = look.hood || INK; c.lineWidth = 5; c.beginPath(); c.moveTo(60, 22); c.lineTo(64, 14); c.stroke();
  ellipse(c, 60, 58, 17, 19, "#3d3935");
  const blink = (t % 4.2) < 0.12 ? 0.15 : 1;
  ellipse(c, 53, 58, 4.4, 5.8 * blink, "#fbfaf6"); ellipse(c, 67, 58, 4.4, 5.8 * blink, "#fbfaf6");
  ellipse(c, 38 + sw * 0.4, 104, 4.5, 4.5, INK); ellipse(c, 82 - sw * 0.4, 104, 4.5, 4.5, INK);
  if (look.satchel) { line(c, [[42, 74], [76, 110]], 3, look.bagColor ?? "#8c5a3c"); c.fillStyle = look.bagColor ?? "#8c5a3c"; c.beginPath(); c.roundRect(66, 104, 22, 17, 3); c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); }
  c.restore();
}

function drawScene(ctx: C, t: number, cx: number, cy: number, VW: number, VH: number) {
  const all: (Obj | Stake | ReturnType<typeof boatsAt>[number] | { type: "player"; depth: number })[] = [...objs, ...stakes, ...boatsAt(t), { type: "player", depth: pl.i + pl.j }];
  all.sort((a, b) => a.depth - b.depth);
  for (const o of all) {
    if (o.type === "player") { drawPlayer(ctx, t, ws!.look); continue; }
    if (o.type === "fire") { drawFire(ctx, t, ws!); continue; }
    if (o.type === "bld") { drawBld(ctx, o, t, ws!); continue; }
    if (o.type === "boat") { drawBoat(ctx, o.i, o.j, o.dir, o.kind, t); continue; }
    const [x, y] = P(o.i, o.j);
    if (x < cx - 140 || x > cx + VW + 140 || y < cy - 40 || y > cy + VH + 160) continue;
    if (o.type === "stake" || o.type === "gate") { drawStake(ctx, o); continue; }
    if (o.type === "prop") { drawProp(ctx, o); continue; }
    const tr = o as { type: "pine" | "dpine" | "round"; v: number }; const sp = sprites()[tr.type][tr.v]; ctx.drawImage(sp.cv, x - sp.ax, y - sp.ay, sp.w, sp.h);
  }
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

const blocked = (a: number, b: number) => !inb(a, b) || B[a][b] || W[a][b];
const walkable = (i: number, j: number) => !blocked(Math.floor(i), Math.floor(j));
function walkTo(tgt: Pt) {
  const s: Pt = [Math.floor(pl.i), Math.floor(pl.j)];
  const path = bfs(s, tgt, (i, j) => !blocked(i, j));
  if (path) { pl.path = path.slice(1).map(([i, j]) => [i + 0.5, j + 0.5] as Pt); if (!pl.path.length) pl.path = [[tgt[0] + 0.5, tgt[1] + 0.5]]; }
}
const bldObjs = () => objs.filter((o): o is Bld => o.type === "bld");

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
  buildWall(previewAll ? BUILDINGS.map((b) => b.id) : BUILDINGS.filter((b) => ws!.open(b.id)).map((b) => b.id));
  if (blocked(Math.floor(pl.i), Math.floor(pl.j))) { pl.i = SPAWN[0] + 0.5; pl.j = SPAWN[1] + 0.5; }
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
    let tgt: Pt = [i, j];
    if (blocked(i, j)) {
      let best: [number, number, number] | null = null;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (inb(i + a, j + b) && !blocked(i + a, j + b)) { const d = Math.hypot(a, b); if (!best || d < best[2]) best = [i + a, j + b, d]; }
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
    if (document.getElementById("world") !== cv) { removeEventListener("resize", onResize); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = reduce ? 0 : now / 1000;
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
    const [px, py] = P(pl.i, pl.j), VW = rect.width, VH = rect.height;
    const tx = px - VW / 2, ty = py - 40 - VH / 2;
    if (cam.x < -0.5 && cam.y < -0.5) cam = { x: tx, y: ty };
    else { cam.x += (tx - cam.x) * Math.min(1, dt * 6); cam.y += (ty - cam.y) * Math.min(1, dt * 6); }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = "#cfcac2"; ctx.fillRect(0, 0, VW, VH);
    ctx.drawImage(ground!, -cam.x, -cam.y, WW, WH);
    ctx.translate(-cam.x, -cam.y);
    drawScene(ctx, t, cam.x, cam.y, VW, VH);
    if (pl.path.length) { const g = pl.path[pl.path.length - 1], [gx, gy] = P(g[0], g[1]); ctx.beginPath(); ctx.ellipse(gx, gy, 9 + Math.sin(t * 6) * 1.5, 4.5, 0, 0, 7); ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const gr = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.42, VW / 2, VH / 2, Math.max(VW, VH) * 0.75);
    gr.addColorStop(0, "rgba(214,209,201,0)"); gr.addColorStop(1, "rgba(214,209,201,.85)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
    let best: BuildingId | null = null, bd = 1.2;
    for (const o of bldObjs()) { const d = Math.hypot(pl.i - (o.door[0] + 0.5), pl.j - (o.door[1] + 0.5)); if (d < bd) { bd = d; best = o.id; } }
    if (pl.path.length) best = null;
    if (best !== near) { near = best; hooks?.near(best); }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  hooks.near(near);
}

// Where a building's sign sits on screen right now (used by tests).
export function signOnScreen(id: BuildingId): Pt | null {
  const o = bldObjs().find((x) => x.id === id), cv = document.getElementById("world");
  if (!o?.bbox || !cv) return null;
  const r = cv.getBoundingClientRect();
  return [(o.bbox[0] + o.bbox[2]) / 2 - cam.x + r.left, o.bbox[1] + 20 - cam.y + r.top];
}
// Test-only hooks.
(globalThis as any).__thinplace = {
  signOnScreen,
  drawAll: () => { previewAll = true; wallKey = ""; },
  overview: (all = false) => {
    if (!ws) return null;
    if (all) previewAll = true;
    wallKey = ""; buildWall(previewAll ? BUILDINGS.map((b) => b.id) : BUILDINGS.filter((b) => ws!.open(b.id)).map((b) => b.id));
    if (!ground) buildGround();
    const cv = document.createElement("canvas"); cv.width = WW; cv.height = WH;
    const c = cv.getContext("2d")!; c.drawImage(ground!, 0, 0, WW, WH); drawScene(c, 0, 0, 0, WW, WH);
    return cv.toDataURL("image/png");
  },
};
