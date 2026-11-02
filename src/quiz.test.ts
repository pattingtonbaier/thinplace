import { describe, expect, test } from "bun:test";
import { anchorScores, DILEMMAS, dilemmaTally, gaps, promptForDay, PROMPTS, suggestCalling, suggestPoints } from "./quiz";
import { startEmbers } from "./engine";

describe("anchors", () => {
  test("points always add up to 14 and respect the cap of 6", () => {
    const base = startEmbers({ name: "", pronouns: "", calling: "scholar", look: { hood: "ink", satchel: "books", staff: "ogham", glow: "amber" }, points: {}, updated: 0 });
    const pts = suggestPoints(anchorScores({ move: 3, new: 3, finish: 3, meal: 3, evening: 2 }), base);
    const sum = Object.values(pts).reduce((a, b) => a + (b ?? 0), 0);
    expect(sum).toBe(14);
    for (const [k, v] of Object.entries(pts)) expect(base[k as keyof typeof base] + (v ?? 0)).toBeLessThanOrEqual(6);
    expect((pts.B ?? 0)).toBeGreaterThan(pts.E ?? 0);
  });
  test("a body that doesn't allow it counts as neutral, not low", () => {
    expect(anchorScores({ move: 4 }).B).toBe(0);
    expect(anchorScores({ move: 0 }, true).B).toBeGreaterThan(0);
  });
});

describe("dilemmas", () => {
  test("every answer is worth the same total", () => {
    for (const d of DILEMMAS) for (const o of d.options) expect(o.embers.length).toBe(1);
  });
  test("answers suggest a calling", () => {
    const t = dilemmaTally({ 1: 1, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 });
    expect(t.R).toBe(5);
    expect(suggestCalling(t)).toBe("founder");
  });
  test("at most two gaps", () => {
    const g = gaps({ finish: 0, new: 0, move: 0, evening: 0 }, { 1: 0, 2: 0, 4: 0, 6: 0, 7: 2 });
    expect(g.length).toBeLessThanOrEqual(2);
    expect(g[0]).toContain("body that never tires");
  });
});

describe("folklore prompts", () => {
  test("offered on some days only, never within two weeks of itself, and repeats recall the last answer", () => {
    expect(promptForDay("scholar", 0, [])).toBeNull();
    const first = promptForDay("scholar", 2, [])!;
    expect(first.prompt.id).toBe(PROMPTS.scholar[0].id);
    const again = promptForDay("scholar", 20, [{ id: first.prompt.id, day: 2, answer: "the burnt toast" }, { id: PROMPTS.scholar[1].id, day: 14 }]);
    expect(again?.last ?? "").toMatch(/burnt toast|^$/);
  });
});
