import { expect, test } from "bun:test";
import { emptySave, type Save } from "./engine";
import { simulate } from "./monsters";

const D = 864e5, noon = (y: number, m: number, d: number) => new Date(y, m, d, 12).getTime();
function save(start: number): Save { const s = emptySave(); s.created = start; return s; }
let n = 0; const log = (s: Save, action: string, ts: number, extra = {}) => s.logs.push({ id: `l${n++}`, ts, action, ...extra });

test("the Cailleach comes after five active days without moving, and lifts with walks and training", () => {
  const t0 = noon(2026, 2, 2), s = save(t0);
  log(s, "walk", t0);
  for (let k = 1; k <= 5; k++) log(s, "journal", t0 + k * D);
  let sim = simulate(s, new Map(), t0 + 5 * D + 3600e3);
  expect(sim.out.map((o) => o.id)).toContain("cailleach");
  log(s, "gym", t0 + 6 * D); log(s, "hike", t0 + 6 * D + 3600e3); log(s, "run", t0 + 6 * D + 7200e3); log(s, "gym", t0 + 7 * D);
  sim = simulate(s, new Map(), t0 + 7 * D + 3600e3);
  expect(sim.out.map((o) => o.id)).not.toContain("cailleach");
  expect(sim.record.cailleach).toEqual({ met: 1, beaten: 1, last: expect.any(String) });
  expect(sim.titles).toContain("Winter Breaker");
});

test("monsters sleep while you're away, never come for things you don't do, and gentle mode keeps them off", () => {
  const t0 = noon(2026, 2, 2), s = save(t0);
  log(s, "walk", t0);
  expect(simulate(s, new Map(), t0 + 20 * D).out).toEqual([]); // no days here at all: the gap never counts
  for (let k = 1; k <= 8; k++) log(s, "read", t0 + k * D);
  const ids = simulate(s, new Map(), t0 + 8 * D + 3600e3).out.map((o) => o.id);
  expect(ids).toContain("cailleach"); expect(ids).not.toContain("puca"); // never did project work, so no Púca
  s.settings.gentle = true;
  expect(simulate(s, new Map(), t0 + 8 * D + 3600e3).out).toEqual([]);
});

test("naming a blocker brings its monster; strike relics hit harder", () => {
  const t0 = noon(2026, 2, 2), s = save(t0);
  s.journal["2026-03-02"] = { blocker: "puca", updated: t0 };
  log(s, "task", t0 + D); // 15
  let sim = simulate(s, new Map(), t0 + D + 3600e3);
  expect(sim.out.find((o) => o.id === "puca")?.left).toBe(85);
  sim = simulate(s, new Map([["whetstone", 0]]), t0 + D + 3600e3);
  expect(sim.out.find((o) => o.id === "puca")?.left).toBe(70);
  log(s, "ship", t0 + 2 * D);
  sim = simulate(s, new Map([["bellows", 0]]), t0 + 2 * D + 3600e3);
  expect(sim.out.find((o) => o.id === "puca")).toBeUndefined();
});

test("runs count whole weeks kept, and the leather bracers forgive one missed day", () => {
  const mon = noon(2026, 2, 2), s = save(mon - D);
  s.habits = [{ id: "h", name: "Walk", action: "walk", perWeek: 5, created: mon - D }];
  for (let w = 0; w < 3; w++) for (let k = 0; k < (w === 1 ? 4 : 5); k++) log(s, "walk", mon + (w * 7 + k) * D, { habit: "h" });
  const at = mon + 21 * D + 3600e3;
  expect(simulate(s, new Map(), at).runs[0].weeks).toBe(1);
  expect(simulate(s, new Map([["bracers", 0]]), at).runs[0].weeks).toBe(3);
  expect(simulate(s, new Map(), at).record["fear-dearg"]?.met).toBe(1); // the broken week called it; the next week's walks drove it off
  expect(simulate(s, new Map(), at).record["fear-dearg"]?.beaten).toBe(1);
});
