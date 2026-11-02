// Every building, drawn from the inking kit. Each room you've used adds something you can see.
import type { BuildingId } from "./content";
import { RED, WHITE, type Kit, type Pt } from "./ink";

export type Rooms = Record<string, number>;

// Returns the height (in px) of the building's top, for placing its sign.
export function drawBuilding(k: Kit, id: BuildingId, rooms: Rooms, t: number, all = false): number {
  const has = (r: string) => all || r in rooms;
  const { P, poly, line, hatch, ell, walls, door, windowF, windowR, thatch, slate, chimney } = k;
  switch (id) {
    case "bothy": {
      const a = 0.82, b = 0.6, h = 34, rh = 24;
      if (has("the Hollow Oak")) k.tree(-1.25, 0.9, 0.8, true);
      if (has("the Tobar")) k.well(1.15, -0.85);
      k.shadow(a, b);
      walls(a, b, h);
      if (has("the Scriptorium nook")) k.bay(-0.42, b); else windowF(b, -0.42, 11, 0.18, 12, true, has("the window seat"));
      door(b, 0.32, 0.17, 24);
      windowR(a, -0.2, 13);
      if (has("the hearth")) k.woodpile(a, 0.02);
      thatch(a, b, h, rh);
      if (has("the Cauldron")) chimney(-0.45, h + rh - 6, h + rh + 18, t, false);
      if (has("the Dreaming Loft")) k.dormer(0.22, b, h, rh);
      k.lantern(0.68, b + 0.16);
      if (has("the familiars' pen")) k.pen(0.95, 0.4, 1.55, 1.25);
      k.mushrooms(-0.95, 1.05, 2);
      return h + rh + (has("the Cauldron") ? 44 : 22);
    }
    case "stone-field": {
      const [cx, cy] = P(0, 0);
      ell(cx, cy, 60, 30, "#ebe8e2", 1.4);
      const stones: [number, number, number][] = [[-0.55, 0.45, 34], [0.1, 0.7, 42], [0.7, 0.25, 30], [0.55, -0.5, 38], [-0.45, -0.55, 28]];
      stones.sort((p, q) => p[0] + p[1] - (q[0] + q[1])).forEach(([u, v, hh]) => {
        const F: Pt[] = [P(u - 0.11, v + 0.09), P(u + 0.11, v + 0.09), P(u + 0.09, v + 0.09, hh), P(u - 0.1, v + 0.09, hh - 3)];
        const R: Pt[] = [P(u + 0.11, v + 0.09), P(u + 0.11, v - 0.09), P(u + 0.09, v - 0.09, hh - 2), P(u + 0.09, v + 0.09, hh)];
        poly(F, "#dcd8d1", 1.8); poly(R, "#a8a39b", 1.8); hatch(R, 3, "#7f7a73");
        line([P(u - 0.04, v + 0.09, hh * 0.3), P(u + 0.02, v + 0.09, hh * 0.6)], 0.8, "#8d887f");
      });
      if (has("Training")) { k.barrel(-0.9, 0.95); const p = P(0.95, 0.95); ell(p[0], p[1] - 4, 8, 6, "#b5afa6", 1.4); ell(p[0] + 12, p[1] - 2, 6, 5, "#c4bfb7", 1.4); }
      if (has("the trailheads")) k.signpost(1.25, 0.2);
      if (has("the Sweat House")) {
        const p = P(-1.05, -0.6); c_hut(k, p);
      }
      return 52;
    }
    case "ogham-tower": {
      const floors = 1 + ["the Hedge Library", "a subject floor", "the Whispering Well"].filter(has).length;
      const [x, y] = P(0, 0), r = 22, fh = 28, hh = 22 + floors * fh;
      const c = (k as any).__c as CanvasRenderingContext2D;
      c.beginPath(); c.moveTo(x - r, y); c.lineTo(x - r, y - hh); c.lineTo(x + r, y - hh); c.lineTo(x + r, y); c.ellipse(x, y, r, r / 2, 0, 0, Math.PI); c.closePath(); c.fillStyle = "#ece9e3"; c.fill();
      hatch([[x + 4, y + r / 2], [x + 4, y - hh], [x + r, y - hh], [x + r, y]], 3.4, "#8f8a83");
      for (let z = 6; z < hh - 4; z += 6) for (let q = 0; q < 4; q++) { const ang = Math.PI * (q + 0.5 + ((z / 6) % 2) * 0.5) / 4; ell(x - Math.cos(ang) * r * 0.9, y - z + Math.sin(ang) * r * 0.4, 3, 1.6, null, 0.6); }
      c.lineWidth = 2.2; c.strokeStyle = "#1e1c1a"; c.beginPath(); c.moveTo(x - r, y - hh); c.lineTo(x - r, y); c.ellipse(x, y, r, r / 2, 0, Math.PI, 0, true); c.lineTo(x + r, y - hh); c.stroke();
      for (let f = 1; f < floors + 1; f++) { const z = 22 + f * fh - fh / 2; poly([[x - 4, y - z - 6], [x + 4, y - z - 6], [x + 4, y - z + 4], [x - 4, y - z + 4]], "#3a3733", 1.4); line([[x - r + 1, y - 22 - f * fh + 2], [x + r - 1, y - 22 - f * fh + 2]], 1.2, "#6f6a64"); }
      poly([[x - 5, y - 30], [x + 5, y - 30], [x + 5, y - 14], [x - 5, y - 14]], "#2d2a27", 1.6);
      ell(x, y - hh, r, r / 2, "#e3dfd8", 2);
      const all3 = floors >= 4;
      if (all3) { poly([[x - 9, y - hh], [x + 9, y - hh], [x + 9, y - hh - 14], [x - 9, y - hh - 14]], "#fbf3dc", 1.6); line([[x, y - hh], [x, y - hh - 14]], 1); }
      const top = hh + (all3 ? 14 : 0);
      poly([[x - r - 3, y - top], [x, y - top - 36], [x + r + 3, y - top]], "#6f6b65", 2); hatch([[x, y - top - 36], [x + r + 3, y - top], [x, y - top + 3]], 3.4, "#4c4945");
      for (let q = 0; q < 6; q++) line([[x - 15, y - 12 - q * 5], [x - 10, y - 12 - q * 5]], 1.2);
      return top + 48;
    }
    case "forge": {
      const a = 0.72, b = 0.6, h = has("the Guild room") ? 46 : 28, rh = 18;
      if (has("Projects")) {
        const L: Pt[] = [P(-a - 0.55, b - 0.05), P(-a, b - 0.05), P(-a, b - 0.05, 22), P(-a - 0.55, b - 0.05, 22)];
        poly([P(-a - 0.55, b - 0.05, 22), P(-a, b - 0.05, 22), P(-a, -b + 0.1, 30), P(-a - 0.55, -b + 0.1, 30)], "#77736d", 1.6);
        line([P(-a - 0.5, b - 0.05, 0), P(-a - 0.5, b - 0.05, 22)], 2); poly([P(-a - 0.45, b - 0.1, 10), P(-a - 0.05, b - 0.1, 10), P(-a - 0.05, b - 0.3, 10), P(-a - 0.45, b - 0.3, 10)], "#cfcac2", 1.2); void L;
      }
      k.shadow(a, b);
      walls(a, b, h, { stone: true });
      poly([k.FF(b, -0.55, 0), k.FF(b, 0.05, 0), k.FF(b, 0.05, 18), k.FF(b, -0.55, 18)], "#2d2a27", 1.8);
      const g = P(-0.25, b, 6); ell(g[0], g[1], 7, 4, RED);
      door(b, 0.42, 0.15, 22, false);
      if (has("the Guild room")) { windowF(b, -0.25, h - 18, 0.14, 10, false); windowR(a, 0, h - 16); }
      slate(a, b, h, rh, "#5f5b56");
      chimney(0.35, h + rh - 8, h + rh + 20, t, true);
      const an = P(0.25, b + 0.45); poly([[an[0] - 8, an[1]], [an[0] + 8, an[1]], [an[0] + 5, an[1] - 7], [an[0] + 12, an[1] - 10], [an[0] - 12, an[1] - 10], [an[0] - 5, an[1] - 7]], "#6f6b65", 1.6);
      if (has("Repairs")) k.cart(1.15, 0.6);
      k.barrel(-0.95, 1.0);
      return h + rh + 46;
    }
    case "craft-hall": {
      const a = 0.9, b = 0.62, h = 32, rh = 22;
      if (has("the Kiln")) { const p = P(-1.2, -0.35); kiln(k, p, t); }
      k.shadow(a, b);
      walls(a, b, h);
      const big = has("the illuminator's desk");
      if (big) {
        const g: Pt[] = [k.FF(b, -a + 0.12, 9), k.FF(b, 0.15, 9), k.FF(b, 0.15, h - 5), k.FF(b, -a + 0.12, h - 5)];
        poly(g, "#e9eae6", 1.8); for (let u = 1; u < 4; u++) { const uu = -a + 0.12 + (u * (0.15 - (-a + 0.12))) / 4; line([k.FF(b, uu, 9), k.FF(b, uu, h - 5)], 1.1); }
        line([k.FF(b, -a + 0.12, (h + 4) / 2), k.FF(b, 0.15, (h + 4) / 2)], 1.1);
      } else windowF(b, -0.4, 11, 0.2, 12);
      door(b, 0.5, 0.15, 22);
      windowR(a, 0, 12);
      slate(a, b, h, rh, "#77736d");
      if (has("the Camera Obscura")) {
        const cb: Pt[] = [P(-0.15, 0.05, h + rh - 4), P(0.15, 0.05, h + rh - 4), P(0.15, 0.05, h + rh + 12), P(-0.15, 0.05, h + rh + 12)];
        poly(cb, "#3a3733", 1.6); const l = P(0, 0.05, h + rh + 4); ell(l[0], l[1], 4, 4, "#9cb6b8", 1.2);
      }
      if (has("the Builder's Bench")) for (const [u, v, col] of [[1.05, 0.7, RED], [1.2, 0.85, "#6f6b65"], [1.0, 0.95, "#cfcac2"]] as [number, number, string][]) { const p = P(u, v); poly([[p[0] - 5, p[1]], [p[0] + 5, p[1]], [p[0] + 5, p[1] - 6], [p[0] - 5, p[1] - 6]], col, 1.2); }
      const sp = P(a + 0.02, 0.1, 18); ell(sp[0] + 3, sp[1], 4.5, 6, RED); ell(sp[0] - 1.5, sp[1] + 6, 2.4, 2.4, RED);
      return h + rh + 34;
    }
    case "bards-lane": {
      const st: Pt[] = [P(-0.7, 0.5, 9), P(0.7, 0.5, 9), P(0.7, -0.5, 9), P(-0.7, -0.5, 9)];
      poly([P(-0.7, 0.5), P(0.7, 0.5), P(0.7, 0.5, 9), P(-0.7, 0.5, 9)], "#d9d5ce", 1.8); poly([P(0.7, 0.5), P(0.7, -0.5), P(0.7, -0.5, 9), P(0.7, 0.5, 9)], "#aaa59d", 1.8);
      poly(st, "#ebe8e2", 1.8); for (let u = -0.5; u <= 0.5; u += 0.25) line([P(u, 0.5, 9), P(u, -0.5, 9)], 0.7, "#a8a39b");
      line([P(-0.62, -0.45, 9), P(-0.62, -0.45, 52)], 2.2); line([P(0.62, -0.45, 9), P(0.62, -0.45, 52)], 2.2); line([P(-0.7, -0.45, 52), P(0.7, -0.45, 52)], 3);
      if (has("the Shadow Theatre")) {
        const cur: Pt[] = [P(-0.6, -0.45, 10), P(0.6, -0.45, 10), P(0.6, -0.45, 50), P(-0.6, -0.45, 50)];
        poly(cur, RED, 1.6); for (let u = -0.45; u <= 0.45; u += 0.15) line([P(u, -0.45, 12), P(u, -0.45, 48)], 0.9, "#8f2c22");
      } else poly([P(-0.55, -0.45, 12), P(0.55, -0.45, 12), P(0.55, -0.45, 46), P(-0.55, -0.45, 46)], "#cfcac2", 1.2);
      const lamps = has("the lamp posts") ? [[-1.0, 0.85], [1.0, 0.85], [1.05, -0.6]] : [[1.0, 0.85]];
      for (const [u, v] of lamps) { const p = P(u, v); line([p, [p[0], p[1] - 40]], 2.2); poly([[p[0] - 4.5, p[1] - 50], [p[0] + 4.5, p[1] - 50], [p[0] + 4.5, p[1] - 40], [p[0] - 4.5, p[1] - 40]], "#f8f3e3", 1.4); }
      if (has("the Song Cellar")) { const p = P(-0.95, -0.4); poly([[p[0] - 12, p[1]], [p[0] + 12, p[1] - 6], [p[0] + 12, p[1] + 2], [p[0] - 12, p[1] + 8]], "#3a3733", 1.6); line([[p[0] - 3, p[1] - 1], [p[0] - 3, p[1] + 6]], 0.8, "#cfcac2"); }
      return 68;
    }
    case "wildwood": {
      if (has("the Wort Garden")) { for (let r = 0; r < 4; r++) line([P(0.55, 0.3 + r * 0.18), P(1.25, 0.3 + r * 0.18)], 2, "#8f8a83"); k.fence([[0.45, 1.05], [1.35, 1.05], [1.35, 0.2]]); }
      k.tree(-0.6, -0.45, 0.85); k.tree(0.55, -0.75, 0.7);
      if (has("the Glasshouse")) {
        const a = 0.42, b = 0.32, h = 18, cx = -0.1, cy = 0.45;
        const F: Pt[] = [P(cx - a, cy + b), P(cx + a, cy + b), P(cx + a, cy + b, h), P(cx - a, cy + b, h)], R: Pt[] = [P(cx + a, cy + b), P(cx + a, cy - b), P(cx + a, cy - b, h), P(cx + a, cy + b, h)];
        poly(F, "rgba(236,240,238,.9)", 1.6); poly(R, "rgba(208,214,211,.9)", 1.6);
        for (let q = 1; q < 4; q++) line([P(cx - a + (q * 2 * a) / 4, cy + b), P(cx - a + (q * 2 * a) / 4, cy + b, h)], 1);
        poly([P(cx - a, cy + b, h), P(cx + a, cy + b, h), P(cx + a, cy, h + 12), P(cx - a, cy, h + 12)], "rgba(242,245,243,.95)", 1.6);
      }
      k.mushrooms(-1.0, 0.6, 3);
      return 92;
    }
    case "feasting-halls": {
      const a = 0.9, b = 0.72, h = 34, rh = 26;
      if (has("the Moot Hall")) { const w: Pt[] = [P(-a - 0.6, 0.3), P(-a, 0.3), P(-a, 0.3, 24), P(-a - 0.6, 0.3, 24)]; poly(w, WHITE, 1.8); poly([P(-a - 0.62, 0.36, 24), P(-a, 0.36, 24), P(-a, -0.2, 34), P(-a - 0.62, -0.2, 34)], "#55524d", 1.8); windowF(0.3, -a - 0.3, 9, 0.12, 10, false); }
      k.shadow(a, b);
      walls(a, b, h);
      for (const u of [-0.55, -0.15]) windowF(b, u, 12, 0.11, 12, false);
      door(b, 0.45, 0.2, 26);
      windowR(a, -0.2, 14); windowR(a, 0.3, 14);
      thatch(a, b, h, rh, 0.2, "#cfc8b8");
      chimney(-0.5, h + rh - 6, h + rh + 14, t);
      const banners = 1 + ["the long tables", "Restaurants", "Fidchell Hall"].filter(has).length;
      for (let q = 0; q < banners; q++) { const p = P(-0.4 + q * 0.32, b + 0.02, h + 2); line([p, [p[0], p[1] + 14]], 1.2); poly([[p[0] - 4, p[1] + 2], [p[0] + 4, p[1] + 2], [p[0] + 4, p[1] + 14], [p[0], p[1] + 10], [p[0] - 4, p[1] + 14]], RED, 1.2); }
      if (has("Restaurants")) { for (const u of [0.95, 1.25]) { k.bench(u, 1.1); } }
      if (has("Fidchell Hall")) k.lantern(-0.95, 1.0);
      k.barrel(1.15, -0.4);
      return h + rh + 40;
    }
    case "market-square": {
      for (const [u, v] of [[-0.45, 0.3], [0.5, -0.35]] as Pt[]) {
        const a = 0.38, b = 0.3;
        for (const [p, q] of [[-a, b], [a, b], [a, -b]]) line([P(u + p, v + q, 0), P(u + p, v + q, 24)], 2);
        poly([P(u - a, v + b), P(u + a, v + b), P(u + a, v + b, 11), P(u - a, v + b, 11)], "#e3dfd8", 1.6);
        poly([P(u + a, v + b), P(u + a, v - b), P(u + a, v - b, 11), P(u + a, v + b, 11)], "#aaa59d", 1.6);
        const aw: Pt[] = [P(u - a - 0.05, v + b + 0.1, 22), P(u + a + 0.05, v + b + 0.1, 22), P(u + a + 0.05, v - b, 31), P(u - a - 0.05, v - b, 31)];
        poly(aw, "#f6f3ee", 0); k.clip(aw, () => { for (let s = 0; s < 6; s += 2) poly([P(u - a - 0.05 + (s * (2 * a + 0.1)) / 6, v + b + 0.1, 22), P(u - a - 0.05 + ((s + 1) * (2 * a + 0.1)) / 6, v + b + 0.1, 22), P(u - a - 0.05 + ((s + 1) * (2 * a + 0.1)) / 6, v - b, 31), P(u - a - 0.05 + (s * (2 * a + 0.1)) / 6, v - b, 31)], RED, 0); });
        poly(aw, null, 1.8);
      }
      k.barrel(1.0, 0.75); k.cart(-1.1, -0.6);
      return 60;
    }
    case "healing-well": {
      if (has("the Moon Garden")) for (let q = 0; q < 7; q++) { const ang = (q / 7) * Math.PI * 2; const p = P(Math.cos(ang) * 1.05, Math.sin(ang) * 1.05); poly([[p[0] - 3, p[1]], [p[0] + 3, p[1]], [p[0] + 2.5, p[1] - 12], [p[0] - 2.5, p[1] - 11]], "#d9d5ce", 1.3); }
      if (has("Therapy")) { const hp = 0; void hp; }
      k.well(0, 0);
      if (has("the Apothecary")) { const p = P(0.95, 0.6); for (let q = 0; q < 3; q++) { const x = p[0] - 8 + q * 8; poly([[x - 2.5, p[1]], [x + 2.5, p[1]], [x + 2.5, p[1] - 9], [x + 1, p[1] - 12], [x - 1, p[1] - 12], [x - 2.5, p[1] - 9]], q === 1 ? "#cfcac2" : "#e9e6df", 1.1); } }
      if (has("Therapy")) k.bench(-0.9, 0.7);
      k.mushrooms(-0.7, -0.8, 2);
      return 74;
    }
    case "raven-post": {
      const a = 0.48, b = 0.48, h = 52;
      k.shadow(a, b);
      walls(a, b, h, { stone: true });
      door(b, 0.12, 0.14, 22);
      windowF(b, 0.12, 32, 0.1, 10, false); windowR(a, 0, 36, 0.1, 10);
      const pk = P(0, 0, h + 32), r = [P(-a - 0.08, b + 0.08, h), P(a + 0.08, b + 0.08, h), P(a + 0.08, -b - 0.08, h)];
      poly([r[0], r[1], pk], "#4e4b47", 2); poly([r[1], r[2], pk], "#3a3734", 2); hatch([r[1], r[2], pk], 3, "#2a2725");
      const c = (k as any).__c as CanvasRenderingContext2D; const [bx, by] = [pk[0] + 3, pk[1] + 1];
      c.fillStyle = "#1e1c1a"; c.beginPath(); c.moveTo(bx - 8, by); c.quadraticCurveTo(bx - 3, by - 9, bx + 4, by - 7); c.lineTo(bx + 9, by - 5); c.lineTo(bx + 4, by - 3); c.quadraticCurveTo(bx, by + 2, bx - 8, by); c.fill();
      if (has("the Steward's desk")) { const p = P(0.75, 0.65); line([p, [p[0], p[1] - 16]], 2); poly([[p[0] - 6, p[1] - 16], [p[0] + 6, p[1] - 16], [p[0] + 6, p[1] - 24], [p[0] - 6, p[1] - 24]], "#3a3733", 1.3); }
      if (has("the Treasury")) { const p = P(-0.8, 0.6); poly([[p[0] - 8, p[1]], [p[0] + 8, p[1]], [p[0] + 8, p[1] - 9], [p[0] - 8, p[1] - 9]], "#6f6b65", 1.4); line([[p[0] - 8, p[1] - 5], [p[0] + 8, p[1] - 5]], 1, "#d6b26a"); }
      return h + 44;
    }
    default: return 40;
  }
}

function c_hut(k: Kit, p: Pt) {
  const c = (k as any).__c as CanvasRenderingContext2D;
  c.beginPath(); c.moveTo(p[0] - 16, p[1]); c.quadraticCurveTo(p[0] - 16, p[1] - 26, p[0], p[1] - 28); c.quadraticCurveTo(p[0] + 16, p[1] - 26, p[0] + 16, p[1]); c.closePath();
  c.fillStyle = "#d9d5ce"; c.fill(); c.lineWidth = 1.8; c.strokeStyle = "#1e1c1a"; c.stroke();
  for (let q = 0; q < 4; q++) { c.beginPath(); c.ellipse(p[0], p[1] - 5 - q * 6, 15 - q * 3, 3, 0, 0, Math.PI); c.lineWidth = 0.8; c.stroke(); }
  c.fillStyle = "#2d2a27"; c.beginPath(); c.ellipse(p[0] + 4, p[1] - 4, 4, 5, 0, Math.PI, 0); c.fill();
  for (let q = 0; q < 2; q++) { c.beginPath(); c.arc(p[0] + 4 + q * 6, p[1] - 34 - q * 8, 3 + q * 2, 0, 7); c.fillStyle = "#f3f1ec"; c.fill(); c.lineWidth = 1; c.stroke(); }
}

function kiln(k: Kit, p: Pt, t: number) {
  const c = (k as any).__c as CanvasRenderingContext2D;
  c.beginPath(); c.moveTo(p[0] - 14, p[1]); c.quadraticCurveTo(p[0] - 15, p[1] - 22, p[0], p[1] - 26); c.quadraticCurveTo(p[0] + 15, p[1] - 22, p[0] + 14, p[1]); c.closePath();
  c.fillStyle = "#c9bfb2"; c.fill(); c.lineWidth = 1.8; c.strokeStyle = "#1e1c1a"; c.stroke();
  c.fillStyle = "#2d2a27"; c.beginPath(); c.ellipse(p[0], p[1] - 4, 5, 6, 0, Math.PI, 0); c.fill();
  c.fillStyle = RED; c.beginPath(); c.ellipse(p[0], p[1] - 2, 3, 2, 0, 0, 7); c.fill();
  const ph = (t * 0.3) % 1; c.globalAlpha = 1 - ph; c.beginPath(); c.arc(p[0] + ph * 10, p[1] - 30 - ph * 24, 3 + ph * 5, 0, 7); c.fillStyle = "#f3f1ec"; c.fill(); c.lineWidth = 1; c.stroke(); c.globalAlpha = 1;
}
