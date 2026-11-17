// The monsters, in ink with one coral red. Original designs, drawn at about 70 units tall, standing on (x, y).
import type { MonsterId } from "./monsters";
type C = CanvasRenderingContext2D; type Pt = [number, number];
const INK = "#1e1c1a", RED = "#d2483a", PAPER = "#f4f2ed";
function poly(c: C, p: Pt[], fill: string | null, w = 2) { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (const q of p.slice(1)) c.lineTo(q[0], q[1]); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (w) { c.lineWidth = w; c.strokeStyle = INK; c.lineJoin = "round"; c.stroke(); } }
function ell(c: C, x: number, y: number, rx: number, ry: number, fill: string | null, w = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (w) { c.lineWidth = w; c.strokeStyle = INK; c.stroke(); } }
function line(c: C, p: Pt[], w = 2, col = INK) { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (const q of p.slice(1)) c.lineTo(q[0], q[1]); c.lineWidth = w; c.strokeStyle = col; c.lineCap = "round"; c.stroke(); }
function curve(c: C, a: Pt, ctl: Pt, b: Pt, w = 2, col = INK) { c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(ctl[0], ctl[1], b[0], b[1]); c.lineWidth = w; c.strokeStyle = col; c.lineCap = "round"; c.stroke(); }
// a folk pattern band across a body: little chevrons in pale ink
function band(c: C, x0: number, x1: number, y: number) { for (let x = x0; x < x1; x += 6) line(c, [[x, y], [x + 3, y - 3], [x + 6, y]], 1, "#bdb8b0"); }

export function drawMonster(c: C, id: MonsterId, x: number, y: number, s: number, t: number, fade = 1, silhouette = false) {
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = Math.max(0.12, Math.min(1, fade));
  const sil = silhouette, R = sil ? INK : RED, P = sil ? INK : PAPER, b = Math.sin(t * 1.4) * 1.2;
  switch (id) {
    case "puca": { // a black goat-horse with curling horns, mid-stride
      poly(c, [[-26, -30 + b], [14, -32 + b], [22, -26 + b], [20, -14], [-24, -12]], INK, 2);
      for (const [lx, d] of [[-20, 1], [-12, -1], [10, 1], [17, -1]] as Pt[]) line(c, [[lx, -14], [lx + d * 3 + Math.sin(t * 3 + lx) * 2, 0]], 3);
      poly(c, [[16, -30 + b], [30, -50 + b], [40, -46 + b], [30, -26 + b]], INK, 2);
      curve(c, [30, -50 + b], [22, -66 + b], [36, -64 + b], 2.4); curve(c, [34, -50 + b], [40, -66 + b], [46, -58 + b], 2.4);
      ell(c, 35, -46 + b, 2, 2, R); line(c, [[-26, -28 + b], [-38, -20 + Math.sin(t * 2) * 4]], 3);
      if (!sil) band(c, -20, 12, -22 + b);
      break;
    }
    case "each-uisce": { // a water horse rising from the waves, mane of weed
      for (let k = 0; k < 3; k++) curve(c, [-34 + k * 4, 0 - k * 4], [-10, -8 - k * 4 + Math.sin(t + k) * 2], [34 - k * 4, 0 - k * 4], 1.6, "#5f5b55");
      poly(c, [[-14, -6], [-10, -40 + b], [4, -56 + b], [18, -56 + b], [26, -46 + b], [12, -42 + b], [8, -6]], sil ? INK : "#e9e7e2", 2);
      for (let k = 0; k < 5; k++) curve(c, [-8 + k * 3, -44 + b + k * 2], [-22 - k * 2, -36 + k * 4 + Math.sin(t * 1.3 + k) * 3], [-18 - k, -20 + k * 4], 1.6, "#3a4a3a");
      ell(c, 14, -50 + b, 2, 2, R); line(c, [[24, -46 + b], [27, -44 + b]], 1.4);
      break;
    }
    case "sluagh": { // a hooded host, and a flock wheeling round it
      poly(c, [[-14, 0], [-10, -40], [0, -56], [10, -40], [14, 0]], INK, 2);
      ell(c, -3, -42, 1.6, 1.6, R); ell(c, 3, -42, 1.6, 1.6, R);
      for (let k = 0; k < 12; k++) { const a = t * 0.9 + k * 0.52, r = 22 + (k % 3) * 9, bx = Math.cos(a) * r, by = -34 + Math.sin(a) * r * 0.5, f = Math.sin(t * 8 + k) * 3; line(c, [[bx - 5, by - f], [bx, by], [bx + 5, by - f]], 1.8); }
      break;
    }
    case "leannan-si": { // a tall, veiled muse, hair to the ground
      poly(c, [[-10, 0], [-7, -44], [0, -62 + b], [7, -44], [10, 0]], sil ? INK : "#e9e7e2", 2);
      for (let k = -2; k <= 2; k++) curve(c, [k * 2, -58 + b], [k * 6 + Math.sin(t + k) * 3, -30], [k * 5, 0], 1.2, "#3a3733");
      ell(c, 0, -54 + b, 5, 6, sil ? INK : "#f4f2ed", 1.6);
      ell(c, 0, -50 + b, 1.6, 1, R); line(c, [[-12, -30], [-22, -36 + Math.sin(t) * 2]], 1.6); ell(c, -24, -38 + Math.sin(t) * 2, 3, 3, R);
      break;
    }
    case "cailleach": { // the winter hag, bent over her staff, snow coming off her shawl
      poly(c, [[-16, 0], [-14, -26], [-6, -44], [6, -48], [12, -40], [10, -24], [14, 0]], INK, 2);
      ell(c, 8, -44, 6, 6, sil ? INK : "#cfcac2", 1.6); ell(c, 9, -44, 1.2, 1.2, R);
      line(c, [[18, -56], [22, 0]], 2.6, "#6f6252"); line(c, [[10, -34], [19, -36]], 2);
      if (!sil) { band(c, -12, 8, -18); for (let k = 0; k < 6; k++) { const p = (t * 0.3 + k / 6) % 1; ell(c, -24 + k * 9 + Math.sin(p * 6) * 3, -60 + p * 60, 1.4, 1.4, "#ffffff", 0.5); } }
      break;
    }
    case "fear-dearg": { // a little man in a red coat and cap
      poly(c, [[-10, 0], [-9, -22], [0, -28], [9, -22], [10, 0]], R, 2);
      ell(c, 0, -32, 6, 6, sil ? INK : "#e3dfd8", 1.6); ell(c, 2, -32, 1.2, 1.2, INK);
      poly(c, [[-7, -36], [7, -36], [12, -50 + b * 2], [3, -40]], R, 1.8);
      line(c, [[9, -20], [16, -26 + Math.sin(t * 3) * 3]], 2); line(c, [[-9, -20], [-14, -12]], 2);
      line(c, [[-4, 0], [-5, 4]], 2); line(c, [[4, 0], [5, 4]], 2);
      break;
    }
    case "changeling": { // a hooded double, with the face not quite right
      poly(c, [[-14, 0], [-12, -34], [-6, -50], [0, -54], [6, -50], [12, -34], [14, 0]], INK, 2);
      ell(c, 0, -38, 7, 8, sil ? INK : "#3a3733");
      ell(c, -3, -39, 2, 2, P); ell(c, 3.4, -37, 1.4, 2.4, P);
      line(c, [[0, -52], [1, -46], [-1, -42], [1, -36], [0, -30]], 1.4, R);
      line(c, [[-14, -20], [-22, -16 + b * 2]], 2.2);
      break;
    }
    case "hungry-grass": { // a patch of tall grass, every blade leaning toward you
      for (let k = 0; k < 16; k++) { const gx = -24 + k * 3.2, h = 16 + ((k * 7) % 11) * 2, sw = Math.sin(t * 1.6 + k) * 3; curve(c, [gx, 0], [gx + 2, -h / 2], [gx + 6 + sw, -h], 1.6, "#3a4a3a"); }
      for (const [ex, ey] of [[-10, -14], [6, -18]] as Pt[]) { ell(c, ex, ey, 3.4, 2, P, 1); ell(c, ex, ey, 1.2, 1.2, R); }
      break;
    }
    case "dullahan": { // the headless rider, his head held up like a lantern
      poly(c, [[-30, -24], [16, -26], [24, -20], [22, -10], [-28, -8]], INK, 2);
      for (const lx of [-22, -14, 10, 18]) line(c, [[lx, -10], [lx + Math.sin(t * 4 + lx) * 3, 2]], 3);
      poly(c, [[18, -24], [28, -40], [34, -38], [28, -20]], INK, 2);
      poly(c, [[-8, -26], [-6, -50], [4, -52], [6, -26]], INK, 2);
      line(c, [[4, -48], [14, -60]], 2); ell(c, 16, -64, 6, 6, sil ? INK : "#e3dfd8", 1.6); ell(c, 15, -64, 1.4, 1.4, R); ell(c, 18, -64, 1.4, 1.4, R);
      if (!sil) { c.globalAlpha *= 0.3; ell(c, 16, -64, 12, 12, RED); }
      break;
    }
  }
  c.restore();
}
