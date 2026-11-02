// The inking kit: hand-wobbled lines, hatching and the building parts every building is made from.
// Coordinates are in tiles around a building's centre; z is height in pixels.
type C = CanvasRenderingContext2D;
export type Pt = [number, number];
export const INK = "#1e1c1a", PAPER = "#f3f1ec", WHITE = "#f7f5f0", RED = "#d2483a";

function h2(x: number, y: number) {
  let h = Math.imul((x | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(((y | 0) + 0x632be5ab) | 0, 0xc2b2ae35);
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
export { h2 };

export function kit(c: C, P: (x: number, y: number, z?: number) => Pt, S = 1) {
  const jit = (x: number, y: number, a = 1.1) => [(h2(Math.round(x * 2), Math.round(y * 2)) - 0.5) * a, (h2(Math.round(y * 2) + 7, Math.round(x * 2)) - 0.5) * a];
  const FF = (b: number, u: number, z: number) => P(u, b, z), SF = (a: number, u: number, z: number) => P(a, u, z);
  function path(pts: Pt[], close = true) { c.beginPath(); pts.forEach(([x, y], k) => { const [a, b] = jit(x, y); k ? c.lineTo(x + a, y + b) : c.moveTo(x + a, y + b); }); if (close) c.closePath(); }
  function poly(pts: Pt[], fill: string | null, lw = 2.2, col = INK) { path(pts); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.strokeStyle = col; c.lineWidth = Math.max(0.8, lw * S * 0.9); c.lineJoin = "round"; c.stroke(); } }
  function line(pts: Pt[], lw = 1.6, col = INK) { path(pts, false); c.strokeStyle = col; c.lineWidth = Math.max(0.6, lw * S * 0.9); c.lineCap = "round"; c.lineJoin = "round"; c.stroke(); }
  function clip(pts: Pt[], fn: () => void) { c.save(); c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip(); fn(); c.restore(); }
  function hatch(pts: Pt[], gap = 4, col = "#8b867f", lw = 1, ang = 1) {
    clip(pts, () => {
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs) - 10, x1 = Math.max(...xs) + 10, y0 = Math.min(...ys) - 10, y1 = Math.max(...ys) + 10, d = y1 - y0;
      c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
      for (let x = x0 - d; x < x1 + d; x += Math.max(2.4, gap * S)) { c.moveTo(x, y1); c.lineTo(x + d * ang, y0); }
      c.stroke();
    });
  }
  function ell(x: number, y: number, rx: number, ry: number, fill: string | null, lw = 0) {
    c.beginPath(); c.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, 7);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); }
  }
  function stones(face: "F" | "R", lim: number, u0: number, u1: number, z0: number, z1: number, fill: string) {
    for (let z = z0; z < z1; z += 5.2) {
      let u = Math.min(u0, u1) + ((z * 13) % 7) / 40; const end = Math.max(u0, u1);
      while (u < end) {
        const w = 0.14 + h2(u * 50, z) * 0.16, u2 = Math.min(end, u + w);
        const q: Pt[] = face === "F" ? [FF(lim, u + 0.02, z + 0.6), FF(lim, u2 - 0.02, z + 0.6), FF(lim, u2 - 0.02, z + 4.6), FF(lim, u + 0.02, z + 4.6)]
          : [SF(lim, u + 0.02, z + 0.6), SF(lim, u2 - 0.02, z + 0.6), SF(lim, u2 - 0.02, z + 4.6), SF(lim, u + 0.02, z + 4.6)];
        poly(q, fill, 1.2); u = u2;
      }
    }
  }
  // a walled block with plaster (or stone) walls on a stone footing
  function walls(a: number, b: number, h: number, o: { front?: string; side?: string; footing?: number; z0?: number; stone?: boolean } = {}) {
    const z0 = o.z0 ?? 0, front = o.front ?? WHITE, side = o.side ?? "#c4bfb7";
    const F: Pt[] = [P(-a, b, z0), P(a, b, z0), P(a, b, h), P(-a, b, h)], R: Pt[] = [P(a, b, z0), P(a, -b, z0), P(a, -b, h), P(a, b, h)];
    poly(F, front, 0); poly(R, side, 0); hatch(R, 3.6, "#8d887f");
    if (o.stone) { stones("F", b, -a, a, z0, h, "#dcd8d1"); stones("R", a, b, -b, z0, h, "#aaa59d"); }
    else if ((o.footing ?? 9) > 0 && z0 === 0) { stones("F", b, -a, a, 0, o.footing ?? 9, "#d9d5ce"); stones("R", a, b, -b, 0, o.footing ?? 9, "#a8a39b"); }
    if (!o.stone) { line([FF(b, -a + 0.22, h * 0.7), FF(b, -a + 0.3, h * 0.55), FF(b, -a + 0.26, h * 0.42)], 1, "#8d887f"); }
    poly(F, null, 2.4); poly(R, null, 2.4);
  }
  function door(b: number, u: number, w = 0.2, hgt = 26, arch = true) {
    const pts: Pt[] = [];
    if (arch) for (let k = 0; k <= 12; k++) { const t = (Math.PI * k) / 12; pts.push(FF(b, u + Math.cos(t) * w, hgt - w * 18 + Math.sin(t) * w * 24)); }
    else pts.push(FF(b, u + w, hgt), FF(b, u - w, hgt));
    const D: Pt[] = [FF(b, u + w, 0), ...pts, FF(b, u - w, 0)];
    poly(D, "#5c5650", 2); clip(D, () => hatch(D, 3, "#3d3934"));
    for (const z of [hgt * 0.22, hgt * 0.62]) line([FF(b, u - w + 0.02, z), FF(b, u + 0.04, z)], 2.2);
    const r = FF(b, u + w * 0.55, hgt * 0.45); ell(r[0], r[1], 1.8 * S, 1.8 * S, null, 1.2);
    poly([P(u - w - 0.08, b), P(u + w + 0.08, b), P(u + w + 0.08, b + 0.2), P(u - w - 0.08, b + 0.2)], "#d9d5ce", 1.3);
  }
  function windowF(b: number, u: number, z: number, w = 0.18, hh = 12, shutters = true, box = false) {
    poly([FF(b, u - w, z), FF(b, u + w, z), FF(b, u + w, z + hh), FF(b, u - w, z + hh)], "#3a3733", 1.8);
    const g: Pt[] = [FF(b, u - w + 0.03, z + 1.4), FF(b, u + w - 0.03, z + 1.4), FF(b, u + w - 0.03, z + hh - 1.4), FF(b, u - w + 0.03, z + hh - 1.4)];
    poly(g, "#e9e6df", 1); line([FF(b, u, z + 1), FF(b, u, z + hh - 1)], 1.3); line([FF(b, u - w, z + hh / 2), FF(b, u + w, z + hh / 2)], 1.3);
    if (shutters) for (const s of [-1, 1]) { const x0 = u + s * w, x1 = u + s * (w + 0.12); poly([FF(b, x0, z - 1), FF(b, x1, z - 1), FF(b, x1, z + hh + 1), FF(b, x0, z + hh + 1)], "#9b968f", 1.3); }
    if (box) {
      poly([P(u - w, b + 0.14, z - 2), P(u + w, b + 0.14, z - 2), P(u + w, b + 0.14, z - 6), P(u - w, b + 0.14, z - 6)], "#9b968f", 1.2);
      for (let k = 0; k < 4; k++) { const p = P(u - w + 0.05 + (k * (2 * w - 0.1)) / 3, b + 0.08, z - 2); ell(p[0], p[1] - 2.4 * S, 2 * S, 2 * S, k % 2 ? WHITE : "#cfcac2", 0.9); }
    }
  }
  function windowR(a: number, u: number, z: number, w = 0.15, hh = 11) {
    poly([SF(a, u - w, z), SF(a, u + w, z), SF(a, u + w, z + hh), SF(a, u - w, z + hh)], "#3a3733", 1.8);
    poly([SF(a, u - w + 0.03, z + 1.4), SF(a, u + w - 0.03, z + 1.4), SF(a, u + w - 0.03, z + hh - 1.4), SF(a, u - w + 0.03, z + hh - 1.4)], "#d8d4cd", 1);
    line([SF(a, u, z + 1), SF(a, u, z + hh - 1)], 1.2);
  }
  // a thatched roof with soft, sagging eaves; ridge along x
  function thatch(a: number, b: number, h: number, rh: number, ov = 0.2, tone = "#d7d0c1") {
    const ez = h - 3, A = -a - ov, B = a + ov;
    const gab: Pt[] = [SF(a, b, h), SF(a, -b, h), SF(a, 0, h + rh * 0.82)]; poly(gab, "#c4bfb7", 0); hatch(gab, 3.6, "#8d887f"); poly(gab, null, 2.2);
    const n = 16, eave: Pt[] = [], ridge: Pt[] = [];
    for (let k = 0; k <= n; k++) { const u = A + ((B - A) * k) / n; eave.push(P(u, b + ov, ez - Math.sin((Math.PI * k) / n) * 2.5)); }
    for (let k = n; k >= 0; k--) { const u = A + 0.1 + ((B - A - 0.2) * k) / n; ridge.push(P(u, 0, h + rh + Math.sin((Math.PI * k) / n) * 1.5)); }
    const slope = [...eave, ...ridge]; poly(slope, tone, 0);
    clip(slope, () => {
      const rows = Math.max(3, Math.round(rh / 6));
      for (let row = 0; row < rows; row++) {
        const t0 = row / rows, t1 = (row + 1) / rows, cols = Math.round(40 * a * S);
        for (let k = 0; k <= cols; k++) {
          const u = A + ((B - A) * k) / cols + (h2(k, row) - 0.5) * 0.03, y0 = (b + ov) * (1 - t0), y1 = (b + ov) * (1 - t1), z0 = ez + (h + rh - ez) * t0, z1 = ez + (h + rh - ez) * t1;
          line([P(u, y0, z0 - 1), P(u, y1, z1 + 2)], 0.7, row % 2 ? "#a8a296" : "#8f897d");
        }
        const cy = (b + ov) * (1 - t1), cz = ez + (h + rh - ez) * t1, crs: Pt[] = [];
        for (let k = 0; k <= 12; k++) crs.push(P(A + ((B - A) * k) / 12, cy, cz - Math.sin((Math.PI * k) / 12) + (k % 2)));
        line(crs, 1, "#6f6a5f");
      }
    });
    poly(slope, null, 2.4);
    const fr: Pt[] = [...eave, ...eave.slice().reverse().map(([x, y], k) => [x, y + 5 * S + Math.sin((Math.PI * k) / n) * 1.2] as Pt)];
    poly(fr, "#c9c2b2", 1.8);
    const rc: Pt[] = []; for (let k = 0; k <= n; k++) rc.push(P(A + 0.1 + ((B - A - 0.2) * k) / n, 0.05, h + rh + 2 + Math.sin((Math.PI * k) / n) * 1.5));
    line(rc, 5, INK); line(rc, 3, "#c9c2b2");
    for (let k = 1; k < n; k++) { const p = rc[k]; c.beginPath(); c.arc(p[0], p[1] + 2.6 * S, 2.6 * S, 0, Math.PI); c.lineWidth = 1; c.strokeStyle = INK; c.stroke(); }
  }
  // a slate or shingle gable roof
  function slate(a: number, b: number, h: number, rh: number, tone = "#6f6b65", ov = 0.12) {
    const A = -a - ov, B = a + ov;
    const gab: Pt[] = [SF(a, b, h), SF(a, -b, h), SF(a, 0, h + rh)]; poly(gab, "#c4bfb7", 0); hatch(gab, 3.6, "#8d887f"); poly(gab, null, 2.2);
    const S1: Pt[] = [P(A, b + ov, h - 2), P(B, b + ov, h - 2), P(B, 0, h + rh), P(A, 0, h + rh)];
    poly(S1, tone, 0);
    clip(S1, () => {
      const rows = Math.max(3, Math.round(rh / 5));
      for (let r = 0; r < rows; r++) {
        const t = r / rows, y = (b + ov) * (1 - t), z = h - 2 + (rh + 2) * t;
        line([P(A, y, z), P(B, y, z)], 0.9, "#3d3a36");
        const cols = Math.round(12 * a);
        for (let k = 0; k < cols; k++) { const u = A + ((B - A) * (k + (r % 2) * 0.5)) / cols; const y2 = (b + ov) * (1 - (r + 1) / rows), z2 = h - 2 + (rh + 2) * ((r + 1) / rows); line([P(u, y, z), P(u, y2, z2)], 0.6, "#3d3a36"); }
      }
    });
    poly(S1, null, 2.4);
    line([P(A, 0, h + rh + 1), P(B, 0, h + rh + 1)], 3, INK);
  }
  function chimney(u: number, h: number, top: number, smoke = 0, sparks = false) {
    const w = 0.15, d = 0.14, cy = -0.05;
    const F: Pt[] = [P(u - w, cy + d, h), P(u + w, cy + d, h), P(u + w, cy + d, top), P(u - w, cy + d, top)];
    const R: Pt[] = [P(u + w, cy + d, h), P(u + w, cy - d, h + 4), P(u + w, cy - d, top), P(u + w, cy + d, top)];
    poly(F, "#e3dfd8", 0); poly(R, "#aaa59d", 0); hatch(R, 3.4, "#7f7a73");
    for (let z = h + 2; z < top - 2; z += 5) { const p = P(u + ((z * 7) % 3) * 0.02, cy + d, z + 2.5); ell(p[0], p[1], 4 * S, 1.9 * S, null, 0.8); }
    poly(F, null, 2); poly(R, null, 2);
    poly([P(u - w - 0.05, cy - d - 0.05, top + 3), P(u + w + 0.05, cy - d - 0.05, top + 3), P(u + w + 0.05, cy + d + 0.05, top + 3), P(u - w - 0.05, cy + d + 0.05, top + 3)], "#e9e6df", 1.6);
    const s = P(u, cy, top + 6);
    if (smoke) for (let k = 0; k < 5; k++) { const ph = ((smoke * 0.3) + k / 5) % 1, r = (2.5 + ph * 7) * S; c.globalAlpha = 1 - ph * 0.9; ell(s[0] + ph * 26 * S + Math.sin(k * 1.7) * 3, s[1] - ph * 40 * S, r, r * 0.85, PAPER, 1.2); c.globalAlpha = 1; }
    if (sparks) for (let k = 0; k < 5; k++) { const ph = ((smoke * 0.8) + k / 5) % 1; ell(s[0] + Math.sin(k * 3 + smoke) * 5 * S, s[1] - ph * 30 * S, 1.6 * S, 1.6 * S, RED); }
  }
  function woodpile(a: number, u0: number, n = 3) {
    for (let row = 0; row < n; row++) for (let k = 0; k < n + 1 - row; k++) {
      const p = SF(a + 0.2, u0 + 0.05 + k * 0.16 + row * 0.08, 3 + row * 5.6);
      ell(p[0], p[1], 3.2 * S, 3.8 * S, "#e9e6df", 1.2); ell(p[0], p[1], 1.5 * S, 1.8 * S, null, 0.7);
    }
  }
  function lantern(x: number, y: number) {
    const b = P(x, y); line([b, [b[0], b[1] - 32 * S]], 2.2); line([[b[0], b[1] - 32 * S], [b[0] + 8 * S, b[1] - 32 * S]], 1.8);
    const L: Pt = [b[0] + 8 * S, b[1] - 28 * S];
    poly([[L[0] - 3.5 * S, L[1]], [L[0] + 3.5 * S, L[1]], [L[0] + 3.5 * S, L[1] + 8 * S], [L[0] - 3.5 * S, L[1] + 8 * S]], "#f7f1df", 1.4);
    poly([[L[0] - 4.5 * S, L[1]], [L[0], L[1] - 3.5 * S], [L[0] + 4.5 * S, L[1]]], "#3a3733", 1.2);
  }
  function mushrooms(x: number, y: number, n = 3) {
    for (let k = 0; k < n; k++) {
      const p = P(x + k * 0.12, y + (k % 2) * 0.09), s = (1 - k * 0.18) * S;
      c.fillStyle = WHITE; c.fillRect(p[0] - 1.4 * s, p[1] - 5 * s, 2.8 * s, 5 * s); c.lineWidth = 0.8; c.strokeStyle = INK; c.strokeRect(p[0] - 1.4 * s, p[1] - 5 * s, 2.8 * s, 5 * s);
      c.beginPath(); c.ellipse(p[0], p[1] - 5 * s, 6 * s, 4.4 * s, 0, Math.PI, 0); c.closePath(); c.fillStyle = RED; c.fill(); c.lineWidth = 1.3; c.stroke();
      ell(p[0] - 2 * s, p[1] - 7 * s, 1 * s, 1 * s, WHITE); ell(p[0] + 1.8 * s, p[1] - 7.6 * s, 1.1 * s, 1.1 * s, WHITE);
    }
  }
  function birdhouse(x: number, y: number) {
    const b = P(x, y); line([b, [b[0], b[1] - 34 * S]], 2.2); const t: Pt = [b[0], b[1] - 34 * S];
    poly([[t[0] - 6 * S, t[1]], [t[0] + 6 * S, t[1]], [t[0] + 6 * S, t[1] - 10 * S], [t[0] - 6 * S, t[1] - 10 * S]], "#e3dfd8", 1.4); ell(t[0], t[1] - 5 * S, 1.8 * S, 1.8 * S, "#3a3733");
    poly([[t[0] - 8.5 * S, t[1] - 9 * S], [t[0], t[1] - 17 * S], [t[0] + 8.5 * S, t[1] - 9 * S]], "#77736d", 1.4);
  }
  function fence(pts: Pt[]) {
    for (let k = 0; k < pts.length - 1; k++) {
      const [a, b] = [pts[k], pts[k + 1]], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2));
      for (let i = 0; i <= n; i++) { const x = a[0] + ((b[0] - a[0]) * i) / n, y = a[1] + ((b[1] - a[1]) * i) / n, p = P(x, y); poly([[p[0] - 1.6 * S, p[1]], [p[0] + 1.6 * S, p[1]], [p[0] + 1.6 * S, p[1] - 11 * S], [p[0], p[1] - 13.5 * S], [p[0] - 1.6 * S, p[1] - 11 * S]], "#ebe8e2", 1); }
      for (const z of [4, 8.5]) line([P(a[0], a[1], z), P(b[0], b[1], z)], 1.2);
    }
  }
  function well(x: number, y: number) {
    const p = P(x, y), r = 13 * S;
    c.beginPath(); c.ellipse(p[0], p[1], r, r / 2, 0, 0, Math.PI); c.lineTo(p[0] - r, p[1] - 12 * S); c.lineTo(p[0] + r, p[1] - 12 * S); c.closePath(); c.fillStyle = "#d9d5ce"; c.fill();
    hatch([[p[0], p[1] - 14 * S], [p[0] + r, p[1] - 14 * S], [p[0] + r, p[1] + r], [p[0], p[1] + r]], 3.4, "#8d887f");
    c.beginPath(); c.moveTo(p[0] - r, p[1] - 12 * S); c.lineTo(p[0] - r, p[1]); c.ellipse(p[0], p[1], r, r / 2, 0, Math.PI, 0, true); c.lineTo(p[0] + r, p[1] - 12 * S); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
    ell(p[0], p[1] - 12 * S, r, r / 2, "#e9e6df", 1.8); ell(p[0], p[1] - 12 * S, r - 3.5 * S, r / 2 - 1.8 * S, "#55524d");
    line([[p[0] - r + 3 * S, p[1] - 12 * S], [p[0] - r + 3 * S, p[1] - 42 * S]], 2.2); line([[p[0] + r - 3 * S, p[1] - 12 * S], [p[0] + r - 3 * S, p[1] - 42 * S]], 2.2);
    const R: Pt[] = [[p[0] - r - 7 * S, p[1] - 38 * S], [p[0], p[1] - 54 * S], [p[0] + r + 7 * S, p[1] - 38 * S], [p[0] + r + 3 * S, p[1] - 35 * S], [p[0], p[1] - 49 * S], [p[0] - r - 3 * S, p[1] - 35 * S]];
    poly(R, "#77736d", 1.6); hatch(R, 3, "#4c4945");
    line([[p[0] + 2 * S, p[1] - 33 * S], [p[0] + 2 * S, p[1] - 23 * S]], 1); poly([[p[0] - 2.5 * S, p[1] - 23 * S], [p[0] + 6 * S, p[1] - 23 * S], [p[0] + 5 * S, p[1] - 17 * S], [p[0] - 1.5 * S, p[1] - 17 * S]], "#b8b3ab", 1.2);
  }
  function tree(x: number, y: number, s2 = 1, swing = false) {
    const p = P(x, y), k = S * s2;
    ell(p[0] + 6 * k, p[1] + 2 * k, 28 * k, 8 * k, "rgba(120,114,106,.25)");
    poly([[p[0] - 7 * k, p[1]], [p[0] - 5 * k, p[1] - 32 * k], [p[0] - 20 * k, p[1] - 50 * k], [p[0] - 15 * k, p[1] - 52 * k], [p[0] - 1 * k, p[1] - 38 * k], [p[0] + 3 * k, p[1] - 56 * k], [p[0] + 8 * k, p[1] - 54 * k], [p[0] + 5 * k, p[1] - 35 * k], [p[0] + 17 * k, p[1] - 46 * k], [p[0] + 20 * k, p[1] - 43 * k], [p[0] + 7 * k, p[1] - 29 * k], [p[0] + 8 * k, p[1]]], "#e3dfd8", 1.8);
    const cs = [[-22, -58, 18], [0, -72, 21], [21, -60, 18], [-10, -46, 13], [13, -48, 12], [-29, -45, 11], [27, -46, 11]];
    c.lineWidth = 4 * k; c.strokeStyle = INK; cs.forEach(([dx, dy, r]) => { c.beginPath(); c.arc(p[0] + dx * k, p[1] + dy * k, r * k, 0, 7); c.stroke(); });
    c.fillStyle = "#dcd8d1"; cs.forEach(([dx, dy, r]) => { c.beginPath(); c.arc(p[0] + dx * k, p[1] + dy * k, r * k, 0, 7); c.fill(); });
    c.save(); c.beginPath(); cs.forEach(([dx, dy, r]) => { c.moveTo(p[0] + dx * k + r * k, p[1] + dy * k); c.arc(p[0] + dx * k, p[1] + dy * k, r * k, 0, 7); }); c.clip();
    c.fillStyle = "#b9b4ac"; cs.forEach(([dx, dy, r]) => { c.beginPath(); c.arc(p[0] + dx * k + 7 * k, p[1] + dy * k + 7 * k, r * k, 0, 7); c.fill(); });
    c.strokeStyle = "#8f8a83"; c.lineWidth = 1; for (let q = 0; q < 26; q++) { const xx = p[0] + (h2(q, x * 9) - 0.5) * 70 * k, yy = p[1] - 32 * k - h2(q, y * 9) * 56 * k; c.beginPath(); c.arc(xx, yy, 2.6 * k, Math.PI * 0.1, Math.PI * 0.9); c.stroke(); }
    c.restore();
    if (swing) { const b0: Pt = [p[0] + 13 * k, p[1] - 42 * k]; line([b0, [b0[0] - 2 * k, b0[1] + 29 * k]], 1); line([[b0[0] + 10 * k, b0[1] - 2 * k], [b0[0] + 10 * k, b0[1] + 27 * k]], 1); poly([[b0[0] - 4 * k, b0[1] + 29 * k], [b0[0] + 12 * k, b0[1] + 27 * k], [b0[0] + 12 * k, b0[1] + 30 * k], [b0[0] - 4 * k, b0[1] + 32 * k]], "#9b968f", 1.2); }
  }
  function pen(x0: number, y0: number, x1: number, y1: number) {
    fence([[x0, y1], [x1, y1], [x1, y0]]);
    const kx = x0 + 0.22, ky = y0 + 0.22;
    poly([P(kx - 0.16, ky + 0.14), P(kx + 0.16, ky + 0.14), P(kx + 0.16, ky + 0.14, 10), P(kx - 0.16, ky + 0.14, 10)], "#e3dfd8", 1.4);
    poly([P(kx + 0.16, ky + 0.14), P(kx + 0.16, ky - 0.14), P(kx + 0.16, ky - 0.14, 10), P(kx + 0.16, ky + 0.14, 10)], "#aaa59d", 1.4);
    poly([P(kx - 0.21, ky + 0.18, 8), P(kx + 0.21, ky + 0.18, 8), P(kx + 0.21, ky, 18), P(kx - 0.21, ky, 18)], "#6f6b65", 1.4);
    const h = P((x0 + x1) / 2 + 0.1, (y0 + y1) / 2 + 0.1);
    ell(h[0], h[1] - 3.5 * S, 9 * S, 4.6 * S, "#2a2724"); ell(h[0] - 7.5 * S, h[1] - 5 * S, 4.2 * S, 3.8 * S, "#2a2724");
  }
  function dormer(u: number, b: number, h: number, rh: number) {
    const y = b * 0.45, z = h + rh * 0.5, w = 0.18;
    poly([P(u - w, y, z - 5), P(u + w, y, z - 5), P(u + w, y, z + 8), P(u - w, y, z + 8)], WHITE, 1.8);
    poly([P(u - w + 0.05, y, z - 3), P(u + w - 0.05, y, z - 3), P(u + w - 0.05, y, z + 6), P(u - w + 0.05, y, z + 6)], "#3a3733", 1.3);
    poly([P(u - w - 0.09, y + 0.05, z + 6), P(u, y + 0.05, z + 18), P(u + w + 0.09, y + 0.05, z + 6)], "#c9c2b2", 1.8);
  }
  function bay(u: number, b: number) {
    const w = 0.22, d = 0.2, h = 19;
    const F: Pt[] = [P(u - w, b + d), P(u + w, b + d), P(u + w, b + d, h), P(u - w, b + d, h)], R: Pt[] = [P(u + w, b + d), P(u + w, b), P(u + w, b, h), P(u + w, b + d, h)];
    poly(F, WHITE, 0); poly(R, "#c4bfb7", 0); hatch(R, 3.4, "#8d887f"); poly(F, null, 1.8); poly(R, null, 1.8);
    poly([P(u - w + 0.04, b + d, 6), P(u + w - 0.04, b + d, 6), P(u + w - 0.04, b + d, 16), P(u - w + 0.04, b + d, 16)], "#e9e6df", 1.2);
    for (let k = 0; k < 5; k++) { const p = P(u - w + 0.07 + k * 0.065, b + d, 6); poly([[p[0], p[1]], [p[0] + 2.6 * S, p[1]], [p[0] + 2.6 * S, p[1] - (4 + (k % 3) * 1.6) * S], [p[0], p[1] - (4 + (k % 3) * 1.6) * S]], k === 2 ? RED : "#6f6b65", 0.7); }
    poly([P(u - w - 0.05, b + d + 0.07, h), P(u + w + 0.05, b + d + 0.07, h), P(u + w + 0.05, b, h + 8), P(u - w - 0.05, b, h + 8)], "#c9c2b2", 1.8);
  }
  function bench(u: number, y: number) {
    for (const k of [-0.16, 0.16]) line([P(u + k, y, 0), P(u + k, y, 6)], 1.8);
    poly([P(u - 0.2, y - 0.05, 6), P(u + 0.2, y - 0.05, 6), P(u + 0.2, y + 0.07, 6), P(u - 0.2, y + 0.07, 6)], "#cfcac2", 1.4);
  }
  function barrel(x: number, y: number) {
    const p = P(x, y), r = 6 * S;
    c.beginPath(); c.ellipse(p[0], p[1], r, r / 2, 0, 0, Math.PI); c.lineTo(p[0] - r, p[1] - 13 * S); c.lineTo(p[0] + r, p[1] - 13 * S); c.closePath(); c.fillStyle = "#cfcac2"; c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
    for (const z of [3, 10]) { c.beginPath(); c.ellipse(p[0], p[1] - z * S, r, r / 2, 0, 0, Math.PI); c.stroke(); }
    ell(p[0], p[1] - 13 * S, r, r / 2, "#e3dfd8", 1.4);
  }
  function cart(x: number, y: number) {
    const b: Pt[] = [P(x - 0.3, y + 0.15, 8), P(x + 0.3, y + 0.15, 8), P(x + 0.3, y + 0.15, 15), P(x - 0.3, y + 0.15, 15)];
    poly([P(x + 0.3, y + 0.15, 8), P(x + 0.3, y - 0.15, 8), P(x + 0.3, y - 0.15, 15), P(x + 0.3, y + 0.15, 15)], "#a8a39b", 1.4);
    poly(b, "#d9d5ce", 1.4); for (let k = 1; k < 4; k++) line([P(x - 0.3 + k * 0.15, y + 0.15, 8), P(x - 0.3 + k * 0.15, y + 0.15, 15)], 0.8, "#8d887f");
    line([P(x - 0.3, y + 0.15, 9), P(x - 0.7, y + 0.35, 4)], 1.6);
    const w = P(x + 0.05, y + 0.18, 6); ell(w[0], w[1], 6 * S, 6 * S, "#ebe8e2", 1.6); line([[w[0] - 5 * S, w[1]], [w[0] + 5 * S, w[1]]], 0.8); line([[w[0], w[1] - 5 * S], [w[0], w[1] + 5 * S]], 0.8);
  }
  function haystack(x: number, y: number) {
    const p = P(x, y);
    c.beginPath(); c.moveTo(p[0] - 14 * S, p[1]); c.quadraticCurveTo(p[0] - 14 * S, p[1] - 26 * S, p[0], p[1] - 30 * S); c.quadraticCurveTo(p[0] + 14 * S, p[1] - 26 * S, p[0] + 14 * S, p[1]); c.closePath();
    c.fillStyle = "#ddd5c2"; c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke();
    for (let k = 0; k < 9; k++) line([[p[0] - 10 * S + k * 2.5 * S, p[1] - 3 * S], [p[0] - 7 * S + k * 1.8 * S, p[1] - 22 * S]], 0.7, "#8f897d");
  }
  function signpost(x: number, y: number) {
    const b = P(x, y); line([b, [b[0], b[1] - 30 * S]], 2.2);
    poly([[b[0] - 12 * S, b[1] - 28 * S], [b[0] + 9 * S, b[1] - 28 * S], [b[0] + 14 * S, b[1] - 24 * S], [b[0] + 9 * S, b[1] - 20 * S], [b[0] - 12 * S, b[1] - 20 * S]], "#efece6", 1.4);
    poly([[b[0] + 12 * S, b[1] - 17 * S], [b[0] - 9 * S, b[1] - 17 * S], [b[0] - 14 * S, b[1] - 13 * S], [b[0] - 9 * S, b[1] - 9 * S], [b[0] + 12 * S, b[1] - 9 * S]], "#efece6", 1.4);
  }
  function shadow(a: number, b: number) {
    const s: Pt[] = [P(a, -b), P(a + 0.9, -b + 0.25), P(a + 0.9, b + 0.7), P(-a + 0.5, b + 0.7), P(-a, b)];
    c.globalAlpha = 0.5; hatch(s, 4, "#9b968f"); c.globalAlpha = 1;
  }
  return { __c: c, P, FF, SF, poly, line, clip, hatch, ell, stones, walls, door, windowF, windowR, thatch, slate, chimney, woodpile, lantern, mushrooms, birdhouse, fence, well, tree, pen, dormer, bay, bench, barrel, cart, haystack, signpost, shadow };
}
export type Kit = ReturnType<typeof kit>;
