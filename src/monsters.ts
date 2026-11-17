// Monsters and runs: worked out from the save alone, day by day, so two synced devices always agree.
// Monsters are weather passing through the Hollow, never verdicts. They never take XP, items or runs away.
import { ACTION_BY_ID, type BuildingId } from "./content";
import { addDays, dayKey, liveLogs, weekStart, type Log, type Save } from "./engine";

export type MonsterId = "puca" | "each-uisce" | "sluagh" | "leannan-si" | "cailleach" | "fear-dearg" | "changeling" | "hungry-grass" | "dullahan";
export interface Monster {
  id: MonsterId; name: string; say: string; nick: string; stands: string; lore: string;
  beats: string[]; // the actions that hit it
  beatsText: string;
  lurk: BuildingId; strength: number; drop: string;
  gap?: { days: number; of: string[] }; // wanders in after this many active days without any of these
  came: string; // the weather line when it arrives
}
const BODY = ["gym", "run", "walk", "hike", "ride", "stretch"];
const REST = ["sleep", "sauna", "seaweed", "meditate", "therapy", "appointment"];
export const MONSTERS: Monster[] = [
  { id: "puca", name: "The Púca", say: "POO-kuh", nick: "The Detour", stands: "Putting things off", lore: "A shapeshifter, often a black horse or goat, that offers a ride and drops you somewhere you never meant to go.",
    beats: ["task", "ship", "deep-work", "admin", "tidy", "repair"], beatsText: "Small tasks, project work and admin", lurk: "forge", strength: 100, drop: "Rider of the Púca",
    gap: { days: 7, of: ["task", "ship", "deep-work"] }, came: "The Púca is grazing by the Forge, waiting to offer you a ride." },
  { id: "each-uisce", name: "The Each-uisce", say: "AKH-ish-kuh", nick: "The Undertow", stands: "Scrolling", lore: "A beautiful water horse that rises from the lake and carries its riders down into it.",
    beats: ["read", "finish-book", "lesson", "art", "pottery", "photo", "nature", "walk", "hike"], beatsText: "Reading, making something, time outside", lurk: "wildwood", strength: 80, drop: "Dry Feet",
    gap: { days: 3, of: ["read", "finish-book", "lesson", "art", "pottery", "photo"] }, came: "Something is moving under the lake in the Wildwood." },
  { id: "sluagh", name: "The Sluagh", say: "SLOO-uh", nick: "The Swarm", stands: "Too much at once", lore: "The restless host of the dead that rolls in from the west as a dark flock, looking for open windows.",
    beats: ["journal", "admin", "tidy", "meditate", "notes"], beatsText: "Journaling, a short plan, clearing one small thing", lurk: "raven-post", strength: 80, drop: "Window-Shutter",
    came: "A dark flock has come in from the west over the Raven Post." },
  { id: "leannan-si", name: "The Leannán Sí", say: "LAN-awn SHEE", nick: "The Hungry Muse", stands: "Waiting for perfect", lore: "A fairy muse who gives the artist brilliance and slowly drains them of everything else.",
    beats: ["poem", "art", "music", "pottery", "photo", "ship", "playlist"], beatsText: "Finishing and sharing something rough", lurk: "bards-lane", strength: 100, drop: "Rough Draft",
    gap: { days: 14, of: ["poem", "art", "music", "pottery", "photo"] }, came: "A pale muse is waiting at the end of Bards' Lane." },
  { id: "cailleach", name: "The Cailleach", say: "KAL-yukh", nick: "The Long Winter", stands: "No energy to move", lore: "The winter hag who rules from Samhain to spring, striding the hills with her staff and freezing the ground where she strikes it.",
    beats: BODY, beatsText: "Training, walks, hikes and rides", lurk: "stone-field", strength: 100, drop: "Winter Breaker",
    gap: { days: 5, of: BODY }, came: "The Cailleach has settled over the Stone Field for a few days." },
  { id: "fear-dearg", name: "The Fear Dearg", say: "far JAR-ug", nick: "The Trickster", stands: "Routine slipped", lore: "A little man in a red coat and cap who plays tricks on households that forget their customs.",
    beats: [], beatsText: "Ticking your habits", lurk: "bothy", strength: 60, drop: "Red Cap",
    came: "The Fear Dearg is in the Bothy, moving things about." },
  { id: "changeling", name: "The Changeling", say: "CHAYNJ-ling", nick: "The Double", stands: "Feeling like a fraud", lore: "Something left in place of the real one: it looks exactly like you, and isn't.",
    beats: ["lesson", "finish-book", "journal", "notes", "ship"], beatsText: "Lessons done, and wins written down", lurk: "ogham-tower", strength: 80, drop: "True Name",
    gap: { days: 10, of: ["lesson"] }, came: "Someone who looks just like you has been seen at the Ogham Tower." },
  { id: "hungry-grass", name: "The Hungry Grass", say: "FAYR GUR-tukh", nick: "The Wanting", stands: "Wanting more things", lore: "Féar gortach: a patch of grass that gives whoever steps on it a hunger nothing will satisfy.",
    beats: ["let-go", "mend", "kept-back", "bike-care", "car-care", "repair"], beatsText: "Mending, letting go, waiting on a want", lurk: "market-square", strength: 80, drop: "Full Pockets",
    came: "A patch of hungry grass has grown in the Market Square." },
  { id: "dullahan", name: "The Dullahan", say: "DUL-uh-han", nick: "Burnout", stands: "Running on empty", lore: "The headless rider who comes once a year at Samhain, holding his own head up like a lantern.",
    beats: [...REST, "friends", "family-meal", "kids", "garden"], beatsText: "Rest, the Healing Well, and time with your people", lurk: "bothy", strength: 200, drop: "Rider at the Gate",
    came: "It's Samhain. The Dullahan rides through the Hollow tonight." },
];
export const MONSTER_BY_ID = Object.fromEntries(MONSTERS.map((m) => [m.id, m])) as Record<MonsterId, Monster>;
// The seven the evening journal can name, plus the Dullahan, show as silhouettes in the Field Book from day one.
export const CORE: MonsterId[] = ["puca", "each-uisce", "sluagh", "leannan-si", "cailleach", "fear-dearg", "changeling", "dullahan"];

export type Relics = Map<string, number>; // relic id -> since
export interface Out { id: MonsterId; since: string; strength: number; left: number; why: string }
export interface Event { key: string; day: string; id: MonsterId; kind: "came" | "left"; why: string; by?: string }
export interface Run { id: string; name: string; weeks: number; best: number; thisWeek: number; need: number; kept: boolean }
export interface Sim {
  out: Out[]; events: Event[];
  record: Partial<Record<MonsterId, { met: number; beaten: number; last: string }>>;
  runs: Run[]; titles: string[];
  near: { id: MonsterId; days: number }[]; // gap monsters this many active days from arriving
  hits: Record<string, { id: MonsterId; dmg: number; left: boolean }[]>; // log id -> what it did
}
const SEASON = (k: string) => { const m = +k.slice(5, 7); return k.slice(0, 4) + ":" + (m >= 2 && m <= 4 ? "sp" : m >= 5 && m <= 7 ? "su" : m >= 8 && m <= 10 ? "au" : "wi"); };

export function simulate(s: Save, relics: Relics, now = Date.now()): Sim {
  const cut = s.settings.cutoffHour, today = dayKey(now, cut);
  const has = (id: string, ts: number) => (relics.get(id) ?? Infinity) <= ts;
  const logs = liveLogs(s), byDay: Record<string, Log[]> = {};
  for (const l of logs) (byDay[dayKey(l.ts, cut)] ??= []).push(l);
  const paused = (k: string) => (s.pauses ?? []).some((p) => { const a = dayKey(p.from, cut), b = p.to ? dayKey(p.to, cut) : today; return k >= a && k <= b; });
  const gentle = !!s.settings.gentle;
  const out = new Map<MonsterId, Out>(); const events: Event[] = []; const record: Sim["record"] = {}; const hits: Sim["hits"] = {};
  const gapCount: Partial<Record<MonsterId, number>> = {};
  const lastUsed: Record<string, string> = {};
  const seenAction = new Set<string>();
  const start = dayKey(Math.min(s.created, logs[0]?.ts ?? s.created), cut);
  const spawn = (id: MonsterId, day: string, why: string) => {
    if (gentle || out.has(id)) return;
    const m = MONSTER_BY_ID[id]; out.set(id, { id, since: day, strength: m.strength, left: m.strength, why });
    events.push({ key: `${id}:${day}:came`, day, id, kind: "came", why });
    const r = (record[id] ??= { met: 0, beaten: 0, last: day }); r.met++; r.last = day;
  };
  const hit = (l: Log, id: MonsterId, dmg: number) => {
    const o = out.get(id); if (!o || dmg <= 0) return;
    o.left -= dmg; const gone = o.left <= 0;
    (hits[l.id] ??= []).push({ id, dmg, left: gone });
    if (gone) { out.delete(id); const day = dayKey(l.ts, cut); events.push({ key: `${id}:${day}:left`, day, id, kind: "left", why: "", by: l.action }); const r = record[id]!; r.beaten++; r.last = day; }
  };
  // runs: per habit, by the week
  const habitWeeks = new Map<string, { kept: boolean[]; season: Set<string> }>();
  const brokeThisWeek = new Set<string>();
  for (let day = start; day <= today; day = addDays(day, 1)) {
    const L = byDay[day] ?? [];
    const away = paused(day);
    // the day's logs strike whatever is out
    for (const l of L) {
      const a = ACTION_BY_ID[l.action]; if (!a) continue;
      const first = !seenAction.has(l.action); seenAction.add(l.action);
      lastUsed[l.action] = day;
      for (const o of [...out.values()]) {
        const m = MONSTER_BY_ID[o.id];
        let match = m.beats.includes(l.action) || (o.id === "fear-dearg" && !!l.habit);
        if (has("horn", l.ts) && a.ember === "B") match = true;
        if (has("salmonscale", l.ts) && l.action === "finish-book" && (o.id === "each-uisce" || o.id === "changeling")) match = true;
        if (!match) continue;
        let dmg = a.xp;
        if (has("hobnails", l.ts) && (l.action === "walk" || l.action === "hike")) dmg *= 2;
        if (has("mether", l.ts) && l.withSomeone) dmg *= 2;
        if (has("salmonscale", l.ts) && l.action === "finish-book" && (o.id === "each-uisce" || o.id === "changeling")) dmg *= 2;
        if (has("whetstone", l.ts) && l.action === "task" && o.id === "puca") dmg *= 2;
        hit(l, o.id, dmg);
      }
      // the relics that strike every monster, or drive one off outright
      if (has("bellows", l.ts) && l.action === "ship") for (const o of [...out.values()]) if (MONSTER_BY_ID[o.id].lurk === "forge") hit(l, o.id, o.left);
      if (has("claddagh", l.ts) && (l.action === "friends" || l.action === "family-meal") && out.has("leannan-si")) hit(l, "leannan-si", out.get("leannan-si")!.left);
      if (has("hearthstone", l.ts) && (l.action === "family-meal" || l.action === "kids")) for (const o of [...out.values()]) hit(l, o.id, Math.ceil(o.left / 2));
      if (has("compass", l.ts) && l.action === "somewhere-new") for (const o of [...out.values()]) hit(l, o.id, 20);
      if (has("harefam", l.ts) && (first || l.action === "somewhere-new") && out.size) { const weakest = [...out.values()].sort((x, y) => x.left - y.left)[0]; hit(l, weakest.id, weakest.left); }
    }
    if (has("mortar", Date.parse(day + "T23:00:00")) && L.some((l) => ACTION_BY_ID[l.action]?.building === "healing-well" || l.action === "sleep")) for (const o of [...out.values()]) { o.left -= 10; if (o.left <= 0) { out.delete(o.id); events.push({ key: `${o.id}:${day}:left`, day, id: o.id, kind: "left", why: "", by: "a gentle day" }); const r = record[o.id]!; r.beaten++; r.last = day; } }
    const tsDay = Date.parse(day + "T12:00:00");
    // gaps: only days you were here count, so monsters sleep while you're away
    const active = !away && (L.length > 0 || !!s.journal[day]);
    const misted = has("mistcloak", tsDay) && L.some((l) => l.action === "somewhere-new");
    for (const m of MONSTERS) {
      if (!m.gap) continue;
      if (L.some((l) => m.gap!.of.includes(l.action))) { gapCount[m.id] = 0; continue; }
      if (!active || misted) continue;
      const used = m.gap.of.some((a) => lastUsed[a] && lastUsed[a] >= addDays(day, -60));
      if (!used) { gapCount[m.id] = 0; continue; }
      gapCount[m.id] = (gapCount[m.id] ?? 0) + 1;
      if (gapCount[m.id]! >= m.gap.days) { spawn(m.id, day, "gap"); gapCount[m.id] = 0; }
    }
    if (away) continue;
    // named in the evening journal
    const named = s.journal[day]?.blocker as MonsterId | undefined;
    if (named && MONSTER_BY_ID[named]) spawn(named, day, "named");
    // the Sluagh: three or more habits untouched for three active days
    if (s.habits.filter((h) => !h.archived).length >= 3 && active) {
      const recent = [0, 1, 2].map((k) => addDays(day, -k));
      const quiet = s.habits.filter((h) => !h.archived && h.created < tsDay - 3 * 864e5 && !recent.some((k) => (byDay[k] ?? []).some((l) => l.habit === h.id)));
      if (quiet.length >= 3) spawn("sluagh", day, "gap");
    }
    // the Hungry Grass: bringing things home far outpaces keeping, over a month
    const month = Array.from({ length: 30 }, (_, k) => byDay[addDays(day, -k)] ?? []).flat();
    const buys = month.filter((l) => l.action === "clothes" || l.action === "homeware").length;
    const keeps = month.filter((l) => ["let-go", "mend", "kept-back", "repair"].includes(l.action)).length;
    if (buys >= 6 && keeps === 0) spawn("hungry-grass", day, "gap");
    // the Dullahan rides at Samhain
    if (day.slice(5) === "10-31") spawn("dullahan", day, "samhain");
    // the end of the week: runs are reckoned, and a broken one calls the Fear Dearg
    const dow = new Date(tsDay).getDay();
    if (dow === 0) {
      const ws = weekStart(day), wk = Array.from({ length: 7 }, (_, k) => addDays(ws, k));
      const wkLogs = wk.flatMap((k) => byDay[k] ?? []);
      const gathering = has("brooch", tsDay) && wkLogs.some((l) => ["friends", "family-meal", "volunteer"].includes(l.action));
      const trip = has("starmap", tsDay) && wkLogs.some((l) => l.action === "somewhere-new");
      const pausedWeek = wk.some(paused);
      for (const h of s.habits) {
        if (h.created > tsDay || (h.archived && h.archived < Date.parse(ws))) continue;
        const w = habitWeeks.get(h.id) ?? { kept: [], season: new Set<string>() }; habitWeeks.set(h.id, w);
        const ticks = tickCount(h.id, h.action, wk, byDay, (k) => has("kettle", Date.parse(k)), (k) => has("sweathouse", Date.parse(k)) && BODY.includes(h.action));
        const tol = has("torc", tsDay) ? 2 : has("bracers", tsDay) || (has("oghamsticks", tsDay) && ["lesson", "read"].includes(h.action)) ? 1 : 0;
        let kept = pausedWeek || gathering || trip || ticks >= h.perWeek - tol;
        if (!kept && has("brigid", tsDay) && !w.season.has(SEASON(day))) { w.season.add(SEASON(day)); kept = true; }
        w.kept.push(kept);
        if (!kept && h.created < Date.parse(ws)) brokeThisWeek.add(h.id);
      }
      if (brokeThisWeek.size) spawn("fear-dearg", day, "routine");
      brokeThisWeek.clear();
    }
  }
  // runs as they stand: whole weeks kept in a row, and how this week is going
  const runs: Run[] = [];
  const thisWeek = Array.from({ length: 7 }, (_, k) => addDays(weekStart(today), k)).filter((k) => k <= today);
  for (const h of s.habits.filter((x) => !x.archived)) {
    const w = habitWeeks.get(h.id); const kept = w?.kept ?? [];
    let weeks = 0; for (let k = kept.length - 1; k >= 0 && kept[k]; k--) weeks++;
    let best = 0, cur = 0; for (const k of kept) { cur = k ? cur + 1 : 0; best = Math.max(best, cur); }
    const tw = thisWeek.flatMap((k) => byDay[k] ?? []).filter((l) => l.habit === h.id).length;
    runs.push({ id: h.id, name: h.name, weeks, best, thisWeek: tw, need: h.perWeek, kept: tw >= h.perWeek });
  }
  // the work run at the Forge: weeks with any project work; the hourglass and the smith's hammer forgive
  if (logs.some((l) => ["task", "ship", "deep-work"].includes(l.action))) {
    const first = dayKey(logs.find((l) => ["task", "ship", "deep-work"].includes(l.action))!.ts, cut);
    const kept: boolean[] = []; const seasons = new Set<string>(); let lastEmpty = false;
    for (let ws = weekStart(first); addDays(ws, 6) < today; ws = addDays(ws, 7)) {
      const wk = Array.from({ length: 7 }, (_, k) => addDays(ws, k)), t = Date.parse(addDays(ws, 6));
      let ok = wk.some((k) => (byDay[k] ?? []).some((l) => ["task", "ship", "deep-work"].includes(l.action))) || wk.some(paused);
      if (!ok && has("hourglass", t) && !lastEmpty) { ok = true; lastEmpty = true; } else if (ok) lastEmpty = false;
      if (!ok && has("hammer", t) && !seasons.has(SEASON(ws))) { seasons.add(SEASON(ws)); ok = true; }
      kept.push(ok);
    }
    let weeks = 0; for (let k = kept.length - 1; k >= 0 && kept[k]; k--) weeks++;
    let best = 0, cur = 0; for (const k of kept) { cur = k ? cur + 1 : 0; best = Math.max(best, cur); }
    const tw = thisWeek.flatMap((k) => byDay[k] ?? []).filter((l) => ["task", "ship", "deep-work"].includes(l.action)).length;
    runs.push({ id: "forge", name: "Work at the Forge", weeks, best, thisWeek: tw, need: 1, kept: tw >= 1 });
  }
  const near = MONSTERS.filter((m) => m.gap && !out.has(m.id) && (gapCount[m.id] ?? 0) > 0).map((m) => ({ id: m.id, days: m.gap!.days - (gapCount[m.id] ?? 0) }));
  const titles = [...new Set(events.filter((e) => e.kind === "left").map((e) => MONSTER_BY_ID[e.id].drop))];
  return { out: [...out.values()], events, record, runs, titles, near, hits };
}

function tickCount(habit: string, action: string, wk: string[], byDay: Record<string, Log[]>, kettle: (k: string) => boolean, sweat: (k: string) => boolean): number {
  let n = 0;
  for (let i = 0; i < wk.length; i++) {
    const L = byDay[wk[i]] ?? [];
    if (L.some((l) => l.habit === habit || (!l.habit && l.action === action))) { n++; continue; }
    if (kettle(wk[i]) && L.length && L.every((l) => REST.includes(l.action))) { n++; continue; }
    if (sweat(wk[i]) && [1, 2, 3].every((b) => (byDay[addDays(wk[i], -b)] ?? []).some((l) => BODY.includes(l.action)))) n++;
  }
  return n;
}
