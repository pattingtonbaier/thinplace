// Each staff is a few inked shapes in the Guiser's 120 x 150 frame, so the same drawing
// renders as SVG (portraits) and on the canvas (the walking Scáth).
import { STAVES } from "./content";

const INK = "#1e1c1a", RED = "#d2483a";
type Part = { d?: string; c?: [number, number, number]; fill?: string; stroke?: string; w?: number };

function shaft(d: string, wood: string, w = 4.5): Part[] {
  return [{ d, stroke: INK, w: w + 2.6 }, { d, stroke: wood, w }];
}

export function staffParts(id: string, glow = "#f2b84b"): Part[] {
  const wood = STAVES.find((s) => s.id === id)?.wood ?? "#8c6a48";
  const straight = "M90 34L86 138";
  switch (id) {
    case "rowan": return [...shaft(straight, wood),
      { d: "M90 34l-9 -7M90 34l1 -12M90 34l9 -7", stroke: "#5f5b55", w: 1.4 },
      { d: "M83 28l-3 -3M86 25l-1 -4M93 24l2 -4M96 28l4 -2", stroke: "#5f5b55", w: 1.2 },
      { c: [92, 38, 2.8], fill: RED, stroke: INK, w: 1 }, { c: [96, 36, 2.8], fill: RED, stroke: INK, w: 1 }, { c: [93, 42, 2.6], fill: RED, stroke: INK, w: 1 }];
    case "hazel": return [...shaft(straight, wood), ...shaft("M90 36L84 24M90 36L96 25", wood, 3),
      { c: [84, 22, 3.4], fill: "#c9b48c", stroke: INK, w: 1.2 }, { c: [96, 23, 3.4], fill: "#c9b48c", stroke: INK, w: 1.2 }];
    case "ash": return [...shaft("M90 28L86 138", wood, 4),
      { d: "M91 40l8 -3M91 45l8 -1M91 50l7 1", stroke: "#8f887c", w: 2 }, { c: [90, 28, 2.6], fill: "#3a3430" }];
    case "blackthorn": return [...shaft(straight, wood, 5),
      { c: [90, 28, 7], fill: wood, stroke: INK, w: 2.2 },
      { d: "M88 58l-5 -3M90 74l5 -3M88 92l-5 -3M89 110l5 -3", stroke: INK, w: 1.6 },
      { c: [85, 23, 2], fill: "#f7f5f0", stroke: INK, w: 0.8 }, { c: [95, 24, 2], fill: "#f7f5f0", stroke: INK, w: 0.8 }];
    case "willow": return [...shaft("M92 30Q82 86 86 138", wood, 4),
      { d: "M92 32q-7 8 -9 24M92 32q-2 10 -1 24M92 32q6 8 8 22", stroke: "#6d6862", w: 1.3 },
      { c: [90, 26, 2], fill: "#f3f1ec", stroke: INK, w: 0.8 }];
    case "drift": return [...shaft("M90 34Q80 80 88 138", wood, 5), ...shaft("M90 34q4 -8 10 -10", wood, 3),
      { d: "M88 46v8", stroke: INK, w: 1 }, { c: [88, 58, 4], fill: "#b5afa6", stroke: INK, w: 1.3 }, { c: [88, 58, 1.4], fill: "#d6d1c9" }];
    case "crook": return [...shaft("M87 138L91 40q2 -16 -9 -16q-9 0 -7 9", wood, 4.5), { c: [75, 34, 3], fill: "#d6b26a", stroke: INK, w: 1.2 }];
    case "lantern": return [...shaft(straight, wood), ...shaft("M90 34q10 0 10 8", wood, 3),
      { d: "M100 42v3", stroke: INK, w: 1.6 }, { d: "M95 45h10v13h-10z", fill: "#fbf3dc", stroke: INK, w: 1.6 },
      { d: "M94 45h12M94 58h12", stroke: INK, w: 1.8 }, { d: "M100 55q-3 -3 0 -7q3 4 0 7z", fill: RED }];
    case "oak": return [...shaft(straight, wood, 5),
      { d: "M90 34q-12 -2 -12 -10q8 0 12 10zM90 34q10 -6 14 -2q-6 6 -14 2z", fill: "#e3ddcf", stroke: INK, w: 1.2 },
      { c: [87, 38, 2.8], fill: "#cdb88f", stroke: INK, w: 1 }, { c: [93, 38, 2.8], fill: "#cdb88f", stroke: INK, w: 1 }];
    case "holly": return [...shaft(straight, wood),
      { d: "M90 34l-10 -3l2 -3l-3 -2l5 -1l1 -3l5 4zM90 34l9 -6l1 3l3 0l-3 4l2 3z", fill: "#57534d", stroke: INK, w: 1 },
      { c: [89, 36, 2.6], fill: RED, stroke: INK, w: 1 }, { c: [93, 37, 2.6], fill: RED, stroke: INK, w: 1 }];
    case "ogham": return [...shaft(straight, wood),
      { d: "M88 60h6M88 66h6M88 72h4M88 78h6M88 84h4M88 90h6M88 96h4", stroke: "#2d2621", w: 1.4 },
      { d: "M90 20l5 8 -5 8 -5 -8z", fill: "#9cb6b8", stroke: INK, w: 1.6 }];
    case "bogoak": return [...shaft("M90 36Q84 88 86 138", wood, 5.5), ...shaft("M90 38c-8 -10 2 -20 8 -12c3 5 -2 8 -4 6", wood, 4),
      { d: "M85 52h8M85 56h8", stroke: "#d6b26a", w: 2 }];
    case "yew": return [...shaft("M90 32Q94 86 86 138", wood),
      { d: "M90 32l-10 -6M90 32l-6 -10M90 32l0 -12M90 32l6 -10M90 32l10 -6", stroke: "#3d3934", w: 1.6 },
      { c: [87, 36, 2.8], fill: RED, stroke: INK, w: 1 }, { c: [94, 34, 2.8], fill: RED, stroke: INK, w: 1 }];
    default: return shaft(straight, wood);
  }
}

export function staffSVG(id: string, dx = 0): string {
  return staffParts(id).map((p) => p.c
    ? `<circle cx="${p.c[0] + dx}" cy="${p.c[1]}" r="${p.c[2]}" fill="${p.fill ?? "none"}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.w ?? 1}"` : ""}/>`
    : `<path d="${p.d}" transform="translate(${dx} 0)" fill="${p.fill ?? "none"}" stroke="${p.stroke ?? "none"}" stroke-width="${p.w ?? 1}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
}

const cache = new Map<string, { path?: Path2D; p: Part }[]>();
export function drawStaff(c: CanvasRenderingContext2D, id: string) {
  let parts = cache.get(id);
  if (!parts) { parts = staffParts(id).map((p) => ({ p, path: p.d ? new Path2D(p.d) : undefined })); cache.set(id, parts); }
  c.lineCap = "round"; c.lineJoin = "round";
  for (const { p, path } of parts) {
    const shape = path ?? (() => { const q = new Path2D(); q.arc(p.c![0], p.c![1], p.c![2], 0, Math.PI * 2); return q; })();
    if (p.fill) { c.fillStyle = p.fill; c.fill(shape); }
    if (p.stroke) { c.strokeStyle = p.stroke; c.lineWidth = p.w ?? 1; c.stroke(shape); }
  }
}
