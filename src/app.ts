import { bonfire, buildingArt, DEFS, guiser, lookToOpts } from "./art";
import { attachWorld, standAtDoor, worldSVG } from "./iso";
import { attachBothy, placeAt, STATIONS } from "./bothy";
import { drawLive, drawTable, SPOTS, type Motion, type TableData } from "./table";
import { inkify, interiorSVG, roomsOf } from "./world";
import {
  type Need, ACTIONS, ACTION_BY_ID, BLOCKERS, BUILDINGS, CALLINGS, CALLING_BY_ID, EMBERS, FEELINGS, GLOWS, HOODS, SATCHELS, STAVES,
  type Action, type BuildingId, type Ember,
} from "./content";
import {
  addDays, dayKey, derive, lastNewMoon, EMBER_STEP, habitTicks, isOpen, levelFromXP, pointsSpent, searchActions, START_CAP, START_POINTS,
  startEmbers, uid, weekStart, type Derived, type Habit, type Log, type Profile, type Save,
} from "./engine";
import { exportBackup, getPage, importBackup, load, persist, pressPhoto, putPage, save } from "./store";
import { ANCHORS, anchorScores, DILEMMAS, dilemmaTally, gaps, MIRROR, promptForDay, PROMPTS, suggestCalling, suggestPoints } from "./quiz";

// ---------- state ----------
type View = "hollow" | "bothy";
type Sheet =
  | null | "log" | "journal" | "gate" | "points" | "habits" | "settings" | "install" | "look" | "firstweek"
  | "day" | "tally" | "embers" | "moons" | "relics" | "pack" | "cairn" | "book" | "notes" | "paperask" | "glean" | "familiar"
  | { found: BuildingId } | { level: number };

const st = {
  s: null as unknown as Save,
  d: null as unknown as Derived,
  view: "hollow" as View,
  sheet: null as Sheet,
  queue: [] as Sheet[], // celebrations waiting their turn
  list: false,
  intake: { step: 0, name: "", pronouns: "", calling: "", anchors: {} as Record<string, number>, unusual: false, points: {} as Partial<Record<Ember, number>>, look: { hood: "ink", satchel: "satchel", staff: "rowan", glow: "amber" } },
  q: "",
  withSomeone: false,
  note: "",
  toast: "" as string,
  inside: null as BuildingId | null,
  station: 0,
  near: null as BuildingId | null,
  journalDraft: { feel: undefined as number | undefined, text: "", blocker: "", ptext: "", book: 0, page: 0, pressed: false },
  reveal: 0, // the night whose tale was just revealed
  cairnDraft: "",
  installEvt: null as any,
  bothy: "room" as "room" | "table",
  stationAt: null as string | null, // the part of the Bothy you're standing at
  names: false, // show the names of things on the table
  famDraft: { kind: "cat" as "cat" | "hound" | "hare" | "hen", name: "" },
  motion: { grind: 0, boil: 0, notch: 0 }, // when each ritual started
};

// On the claude.ai preview, downloads and home-screen install aren't available.
const PREVIEW = /claude(usercontent)?\.(ai|com)$/.test(location.hostname);
const $app = () => document.getElementById("app")!;
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const today = () => dayKey(Date.now(), st.s.settings.cutoffHour);
const emberName = (k: Ember) => EMBERS.find((e) => e.key === k)!.name;
const bName = (id: string) => BUILDINGS.find((b) => b.id === id)?.name ?? "the Old Roads";
const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const glowSize = () => Math.min(1.35, 0.7 + st.d.level * 0.035);

async function commit() {
  const before = st.d;
  st.d = derive(st.s);
  if (before) {
    for (const up of st.d.levelUps.slice(before.levelUps.length)) {
      st.queue.push({ level: up.level });
      const o = st.d.openings.find((x) => x.level === up.level && x.level > 1);
      if (o) st.queue.push({ found: o.building as BuildingId });
    }
  }
  await save(st.s);
}

function nextSheet() {
  st.sheet = st.queue.shift() ?? null;
}

function toast(msg: string) {
  st.toast = msg;
  render();
  const mine = msg;
  setTimeout(() => {
    if (st.toast === mine) {
      st.toast = "";
      const el = document.querySelector(".toast");
      el?.classList.add("out");
    }
  }, 2600);
}

// ---------- logging ----------
async function logAction(actionId: string, extra: Partial<Log> = {}) {
  const a = ACTION_BY_ID[actionId];
  if (!a) return;
  const l: Log = { id: uid(), ts: Date.now(), action: actionId, ...extra };
  if (st.withSomeone && a.type === "experience") l.withSomeone = true;
  if (st.note.trim()) l.note = st.note.trim();
  st.s.logs.push(l);
  await commit();
  const aw = st.d.awards[l.id];
  st.note = "";
  const prev = st.s.logs.filter((x) => !x.deleted && x.action === l.action && x.id !== l.id).pop();
  const newRhythm = aw.rhythm && (!prev || !st.d.awards[prev.id]?.rhythm);
  const parts = Object.entries(aw.byEmber).map(([e, v]) => `+${v} ${emberName(e as Ember)}`).join(" · ");
  if (aw.rhythm && aw.capped) toast(`${a.name} is already notched today. It's a rhythm, so once a day is enough.`);
  else if (aw.capped) toast(`${a.name}: into the day-book. That's three today, so this one is for the record.`);
  else if (newRhythm) toast(`${a.name} is a rhythm now: part of your life, not something to prove. It earns a little each day; going further earns in full. ${parts}`);
  else if (aw.week) toast(`${a.name}: a whole week kept. The notches bundle in · ${parts}`);
  else if (aw.rhythm) toast(`${a.name}: notched, a rhythm · ${parts}`);
  else toast(`${a.name}: ground in · ${parts}`);
  if (a.room === "the familiars' pen" && !(st.s.familiars ?? []).length) { st.famDraft = { kind: "cat", name: "" }; st.queue.unshift("familiar"); if (st.sheet === "log") st.sheet = null; }
  if (atTable()) { st.motion.grind = performance.now(); if (st.sheet === "log") st.sheet = null; if (st.queue.some((q) => q && typeof q === "object" && "level" in q)) st.motion.boil = performance.now(); }
  if (st.queue.length && (st.sheet === null || st.sheet === "log")) nextSheet();
  render();
}
const atTable = () => st.view === "bothy" && st.bothy === "table" && !st.inside;

async function deleteLog(id: string) {
  const l = st.s.logs.find((x) => x.id === id);
  if (!l) return;
  l.deleted = Date.now();
  await commit();
  toast("Log removed.");
}

// ---------- pieces ----------
function xpBar() {
  const pct = Math.round((st.d.into / st.d.need) * 100);
  return `<div class="xpbar" role="progressbar" aria-label="Level ${st.d.level}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>`;
}

function topbar() {
  const p = st.s.profile!;
  return `<header class="top">
    <div class="who"><b>${esc(p.name)}</b><span>Level ${st.d.level} · ${CALLING_BY_ID[p.calling]?.name ?? "Finding your calling"}</span>${xpBar()}<small>${st.d.into} / ${st.d.need} XP</small></div>
    <button class="ghost" data-act="toggle-list" aria-pressed="${st.list}">${st.list ? "Map" : "List"}</button>
  </header>`;
}

function nav() {
  const t = (v: View, label: string, icon: string) =>
    `<button class="tab ${st.view === v ? "on" : ""}" data-act="view" data-arg="${v}" aria-current="${st.view === v ? "page" : "false"}"><span aria-hidden="true">${icon}</span>${label}</button>`;
  return `<nav class="tabs" aria-label="Main">${t("hollow", "Hollow", "⌂")}<button class="logbtn" data-act="open-log" aria-label="Quick log">＋ Log</button>${t("bothy", "Bothy", "☼")}</nav>`;
}

function mapView() {
  const look = lookToOpts(st.s.profile!.look, glowSize());
  const ws = {
    open: (id: BuildingId) => isOpen(st.d, id),
    level: (id: BuildingId) => st.d.openings.find((o) => o.building === id)?.level ?? 0,
    rooms: (id: BuildingId) => st.d.rooms[id] ?? {},
    ember: st.d.ember, lvl: st.d.level, look, firstTime: !st.s.done.walked,
  };
  return `<section class="world-wrap" aria-label="Your Hollow">${worldSVG(ws)}
    ${st.s.done.walked ? "" : `<p class="hint">Tap the ground to walk · tap a building to go in<br><small>Arrow keys or WASD work too</small></p>`}
    <button class="enter" data-act="enter" hidden></button></section>`;
}

function insideView(id: BuildingId) {
  const b = BUILDINGS.find((x) => x.id === id)!;
  const rooms = roomsOf(id), i = Math.min(st.station, rooms.length - 1), room = rooms[i];
  const look = lookToOpts(st.s.profile!.look, glowSize());
  const acts = ACTIONS.filter((a) => a.building === id && a.room === room && a.id !== "journal");
  const hearthDesk = id === "bothy" && room === "the hearth desk";
  const title = room[0].toUpperCase() + room.slice(1);
  return `<section class="inside" aria-label="Inside ${esc(b.name)}">
    <div class="inhead"><h2>${esc(b.name)}</h2><button class="ghost" data-act="leave">Leave</button></div>
    <div class="scene" id="scene">${interiorSVG(id, i, look)}</div>
    <p class="quiet scenehint">Tap a corner of the room to go there.</p>
    <section class="card station"><h3>${esc(title)}</h3>
      ${hearthDesk ? `<p class="quiet">Your journal, habits and today's logs live here.</p><div class="row2"><button class="primary" data-act="open-journal">Evening journal</button><button class="ghost" data-act="view" data-arg="bothy">Habits and today</button></div>` : `<ul class="actions">${acts.map(actionRow).join("")}</ul>`}
    </section></section>`;
}

function listView() {
  return `<section class="listmode" aria-label="Your Hollow as a list"><h2>Your Hollow</h2><ul class="blist">${BUILDINGS.map((b, i) => {
    const o = st.d.openings[i], open = isOpen(st.d, b.id);
    return `<li><button class="brow ${open ? "" : "dim"}" data-act="go" data-arg="${b.id}"><b>${esc(b.name)}</b><span>${open ? (o.level === 1 ? "Open" : `Found ${fmtDate(o.ts!)}`) : `Opens at level ${o.level}`}</span></button></li>`;
  }).join("")}</ul></section>`;
}

// ---------- the Bothy: the room you walk, and the table you sit at ----------
const stationOf = (id: string | null) => STATIONS.find((x) => x.id === id);
function stationCard(id: string | null): string {
  const s = stationOf(id);
  if (!s) return `<p class="quiet">Walk to any part of the house. The hearth desk is beside the fire.</p>`;
  if (s.id === "desk") return `<h3>The hearth desk</h3><p class="quiet">Your day-book and quill, the ember flask and the map of the Hollow are on the table.</p><button class="primary wide" data-act="sit">Sit at the table</button>`;
  const made = st.d.rooms.bothy?.[s.room] !== undefined;
  const acts = ACTIONS.filter((a) => a.building === "bothy" && a.room === s.room);
  const fams = st.s.familiars ?? [];
  const famLine = s.id === "pen" && fams.length ? `<p class="quiet">${fams.map((f) => `${esc(f.name)} the ${f.kind}`).join(", ")}.</p>${fams.length < 3 ? `<button class="link" data-act="fam-add">Another familiar</button>` : ""}` : "";
  return `<h3>${esc(s.name[0].toUpperCase() + s.name.slice(1))}</h3>${made ? "" : `<p class="quiet">Not made yet. Log here once and it's built.</p>`}${famLine}<ul class="actions">${acts.map(actionRow).join("")}</ul>${s.id === "oak" ? `<button class="ghost wide" data-act="leave-bothy">Leave the Bothy</button>` : ""}`;
}
function bothyView() {
  if (st.bothy === "table") return tableView();
  return `<section class="bothy-room" aria-label="Inside your Bothy">
    <div class="inhead"><h2>Your Bothy</h2><button class="ghost" data-act="leave-bothy">Leave</button></div>
    <canvas id="room" role="application" aria-label="Your Bothy, in cutaway. Tap a part of the house to walk there."></canvas>
    <section class="card station" id="station" aria-live="polite">${stationCard(st.stationAt)}</section>
    <details class="plain"><summary>The rooms, as a list</summary><ul class="blist">${STATIONS.map((x) => `<li><button class="brow" data-act="station-go" data-arg="${x.id}"><b>${esc(x.name[0].toUpperCase() + x.name.slice(1))}</b><span>${x.id === "desk" || st.d.rooms.bothy?.[x.room] !== undefined ? "made" : "not made yet"}</span></button></li>`).join("")}</ul></details>
  </section>`;
}
function tableView() {
  return `<section class="table-view" aria-label="The working table">
    <div class="inhead"><h2>The working table</h2><div class="row"><button class="ghost" data-act="names" aria-pressed="${st.names}">${st.names ? "Hide names" : "Names"}</button><button class="ghost" data-act="stand">Stand up</button></div></div>
    <canvas id="table" role="application" aria-label="Your working table. Tap a thing to use it; the same things are listed below."></canvas>
    <details class="plain"><summary>What's on the table</summary><ul class="blist">${SPOTS.filter((x) => x.id !== "notes" || hasNotes()).map((x) => `<li><button class="brow" data-act="spot" data-arg="${x.id}"><b>${esc(x.label.split(":")[0])}</b><span>${esc(x.label.split(":")[1]?.trim() ?? "")}</span></button></li>`).join("")}</ul></details>
  </section>`;
}
function hasNotes() { return tasks() !== "" || gleaningDue() || (st.s.quiz?.mirror !== undefined && !st.s.quiz?.settled); }
function tableData(): TableData {
  const t = today(), now = new Date();
  const samhain = (now.getMonth() === 9 && now.getDate() === 31) || (now.getMonth() === 10 && now.getDate() === 1);
  const day = (st.d.byDay[t] ?? []).map((l) => ({ name: ACTION_BY_ID[l.action]?.name ?? l.action }));
  const since = Date.now() - 30 * 864e5;
  const notches = new Set(st.s.logs.filter((l) => !l.deleted && (l.habit || st.d.awards[l.id]?.rhythm) && l.ts > since).map((l) => (l.habit ?? l.action) + dayKey(l.ts, st.s.settings.cutoffHour))).size;
  const moons = Array.from({ length: 28 }, (_, k) => { const dk = addDays(t, k - 27); return (st.d.byDay[dk]?.length ?? 0) > 0 || !!st.s.journal[dk]; });
  const last = (st.d.byDay[t] ?? []).slice(-1)[0];
  const hot = last ? EMBERS.findIndex((e) => e.key === ACTION_BY_ID[last.action]?.ember) : -1;
  const jars = EMBERS.flatMap((e) => [3, 6, 9].filter((n) => st.d.emberEarned[e.key] >= n).map((n) => `${e.name} ${"I".repeat(n / 3)}`));
  const fp = folklorePrompt();
  const prompt = fp ? fp.prompt.q : !st.s.quiz?.settled ? "Tonight the hearth has a question for you." : "Sit a while. What stayed with you today?";
  const cut = st.s.settings.cutoffHour, end = new Date(now); end.setHours(cut, 0, 0, 0); if (end <= now) end.setDate(end.getDate() + 1);
  return {
    dateLabel: (samhain ? "Samhain, " : "") + now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }),
    day, journal: st.s.journal[t]?.paper ? `Written in ${pageRef(st.s.journal[t].paper!)}.${st.s.journal[t].text ? ` “${st.s.journal[t].text}”` : ""}` : st.s.journal[t]?.text || null, notches, moons,
    found: BUILDINGS.filter((b) => isOpen(st.d, b.id)).map((b) => b.id),
    stones: EMBERS.map((e) => st.d.ember[e.key]), hot, flask: st.d.into / st.d.need, jars,
    sealed: (st.s.cairn ?? []).some((c) => Date.now() < c.opens), prompt,
    candle: (end.getTime() - now.getTime()) / 864e5, notes: hasNotes(),
    labels: st.names || (st.s.done.tableVisits ?? 0) < 4,
    look: { hood: HOODS.find((h) => h.id === st.s.profile!.look.hood)?.hood ?? "#26231f" },
  };
}
let tableRaf = 0;
function attachTable() {
  const cv = document.getElementById("table") as HTMLCanvasElement | null;
  cancelAnimationFrame(tableRaf);
  if (!cv) return;
  const DPR = Math.min(2, devicePixelRatio || 1), data = tableData();
  const still = document.createElement("canvas"); still.width = 1000 * DPR; still.height = 1000 * DPR;
  const sc = still.getContext("2d")!; sc.scale(DPR, DPR); drawTable(sc, data);
  const size = () => { const w = cv.getBoundingClientRect().width; cv.width = w * DPR; cv.height = w * DPR; cv.style.height = w + "px"; return w; };
  let w = size();
  const ctx = cv.getContext("2d")!;
  cv.onpointerdown = (e) => {
    const r = cv.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 1000, y = ((e.clientY - r.top) / r.height) * 1000;
    const hit = SPOTS.find((s) => (s.id !== "notes" || data.notes) && x >= s.r[0] && x <= s.r[2] && y >= s.r[1] && y <= s.r[3]);
    if (hit) useSpot(hit.id);
  };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const frame = (now: number) => {
    if (!cv.isConnected) return;
    if (Math.abs(cv.getBoundingClientRect().width - w) > 1) w = size();
    const k = (w * DPR) / 1000, t = reduce ? 0 : now / 1000;
    const prog = (s: number) => (s && now - s < 1000 ? (now - s) / 1000 : 0);
    const m: Motion = { grind: prog(st.motion.grind), boil: prog(st.motion.boil), notch: prog(st.motion.notch) };
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(still, 0, 0, cv.width, cv.height);
    ctx.setTransform(k, 0, 0, k, 0, 0); drawLive(ctx, data, t, m);
    tableRaf = requestAnimationFrame(frame);
  };
  tableRaf = requestAnimationFrame(frame);
}
function useSpot(id: string) {
  const open: Record<string, Sheet> = { day: "day", tally: "tally", embers: "embers", stones: "embers", moons: "moons", relics: "relics", bag: "pack", cairn: "cairn", book: "book", notes: "notes", bowl: "look", key: "settings" };
  if (id === "log") { st.q = ""; st.withSomeone = false; st.sheet = "log"; }
  else if (id === "journal" || id === "quill" || id === "prompt") { openJournal(); }
  else if (id === "map") { st.view = "hollow"; standAtDoor("bothy"); }
  else if (id === "candle") { const d = tableData(); toast(`The candle burns until ${st.s.settings.cutoffHour} am, when the day turns over. About ${Math.max(1, Math.round(d.candle * 24))} hours left in it.`); return; }
  else if (open[id]) st.sheet = open[id];
  render();
}
function attachRoom() {
  const cv = document.getElementById("room") as HTMLCanvasElement | null;
  if (!cv) return;
  const look = lookToOpts(st.s.profile!.look, glowSize());
  const card = () => { const el = document.getElementById("station"); if (el) el.innerHTML = stationCard(st.stationAt); };
  attachBothy(cv, { "the hearth desk": 1, ...(st.d.rooms.bothy ?? {}) }, look, {
    arrive: (id) => { st.stationAt = id; card(); },
    near: (id) => { if (id && id !== st.stationAt) { st.stationAt = id; card(); } },
    tapStation: (id) => { if (id === "desk") sit(); },
  }, (st.s.done.roomVisits ?? 0) < 4, st.s.familiars?.[0]?.kind ?? "cat", (st.s.books ?? []).filter((b) => b.finished).map((b) => b.n));
}
function sit() {
  st.bothy = "table"; st.s.done.tableVisits = (st.s.done.tableVisits ?? 0) + 1; save(st.s); render();
}

function hollow() {
  if (st.inside) return insideView(st.inside);
  return st.list ? listView() : mapView();
}

function enterBuilding(id: BuildingId) {
  if (!isOpen(st.d, id)) return lockedToast(id);
  if (id === "bothy") { st.inside = null; st.view = "bothy"; st.bothy = "room"; placeAt("desk"); st.stationAt = "desk"; render(); return; }
  st.inside = id;
  st.station = 0;
  st.view = "hollow";
  render();
}

function lockedToast(id: BuildingId) {
  const o = st.d.openings.find((x) => x.building === id);
  toast(`${bName(id)} is still in the fog. It's drawn in at level ${o?.level}, and you can log anything there now with ＋ Log.`);
}

function habitRow(h: Habit) {
  const t = today(), ws = weekStart(t);
  const ticks = new Set(habitTicks(st.s, h.id, ws, 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const doneToday = ticks.has(t);
  return `<li class="habit">
    <button class="tick ${doneToday ? "done" : ""}" data-act="tick" data-arg="${h.id}" aria-pressed="${doneToday}" aria-label="${esc(h.name)}${doneToday ? ", done today" : ""}">${doneToday ? "✓" : ""}</button>
    <div class="hname"><b>${esc(h.name)}</b><span>${ticks.size} of ${h.perWeek} this week</span></div>
    <div class="week" aria-hidden="true">${days.map((d) => `<i class="${ticks.has(d) ? "on" : ""} ${d === t ? "now" : ""}">${"MTWTFSS"[days.indexOf(d)]}</i>`).join("")}</div>
  </li>`;
}

function tasks() {
  const items: [string, string, string][] = [];
  const done = st.s.done;
  if (!done.points) items.push(["points", "Spread your 14 ember points", "Choose where your Scáth starts strong."]);
  if (!done.habits) items.push(["habits", "Choose up to three habits", "One tap each day on the calendar."]);
  if (!PREVIEW && !done.install && !isStandalone()) items.push(["install", "Add Thinplace to your home screen", "So your Hollow is kept safe on this device."]);
  const lastBackup = done.backup ?? 0;
  const needBackup = !PREVIEW && st.s.logs.length > 0 && Date.now() - lastBackup > 7 * 864e5;
  if (needBackup) items.push(["backup", "Back up your Hollow", lastBackup ? `Last backup ${fmtDate(lastBackup)}.` : "A one-tap file you can keep anywhere."]);
  if (!items.length) return "";
  return `<section class="card tasks"><h3>${done.points && done.habits ? "Gentle reminders" : "Your first week"}</h3><ul>${items.map(([k, t, sub]) =>
    `<li><button class="task" data-act="task" data-arg="${k}"><span class="dot ${k === "backup" ? "red" : ""}" aria-hidden="true"></span><b>${t}</b><small>${sub}</small></button></li>`).join("")}</ul></section>`;
}

function todayLogs() {
  const logs = (st.d.byDay[today()] ?? []).slice().reverse();
  if (!logs.length) return `<p class="quiet">Nothing logged yet today. The ＋ Log button works from anywhere.</p>`;
  return `<ul class="logs">${logs.map((l) => {
    const a = ACTION_BY_ID[l.action], aw = st.d.awards[l.id];
    return `<li><span class="lt">${new Date(l.ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span><b>${esc(a?.name ?? l.action)}</b>${l.note ? `<em>${esc(l.note)}</em>` : ""}<span class="lx">${aw?.xp ? "+" + aw.xp : "·"}</span><button class="x" data-act="del" data-arg="${l.id}" aria-label="Remove ${esc(a?.name ?? "log")}">×</button></li>`;
  }).join("")}</ul>`;
}

// ---------- what the table opens ----------
function daySheet() {
  return sheetWrap("The day-book", `<p class="quiet">${esc(tableData().dateLabel)}. Everything you've ground in today.</p>${todayLogs()}<button class="primary wide" data-act="spot" data-arg="log">Grind something in</button>`);
}
function tallySheet() {
  const habits = st.s.habits.filter((h) => !h.archived);
  const t = today(), notchedToday = new Set((st.d.byDay[t] ?? []).map((l) => l.action));
  const rhythms = st.d.rhythms.map((id) => ACTION_BY_ID[id]).filter(Boolean);
  const rhythmList = rhythms.length ? `<p class="label">Your rhythms</p><p class="quiet">Things you do most days. They're part of your life, so they earn a little each day, and a full log's worth for each whole week kept.</p>
    <ul class="habits">${rhythms.map((a) => `<li class="habit"><button class="tick ${notchedToday.has(a.id) ? "done" : ""}" data-act="${notchedToday.has(a.id) ? "noop" : "log"}" data-arg="${a.id}" aria-pressed="${notchedToday.has(a.id)}" aria-label="${esc(a.name)}${notchedToday.has(a.id) ? ", notched today" : ""}">${notchedToday.has(a.id) ? "✓" : ""}</button><div class="hname"><b>${esc(a.name)}</b><span>${esc(a.room)}</span></div></li>`).join("")}</ul>` : "";
  return sheetWrap("The tally stick", `${rhythmList}<p class="label">Habits</p><p class="blurb">Cut a notch for each day you keep a habit. A notch counts as a log, so it earns like anything else.</p>
    ${habits.length ? `<ul class="habits">${habits.map(habitRow).join("")}</ul>` : `<p class="quiet">No habits chosen yet.</p>`}
    <button class="ghost wide" data-act="task" data-arg="habits">${habits.length ? "Change your habits" : "Choose up to three"}</button>`);
}
function embersSheet() {
  const p = st.s.profile!, d = st.d, c = CALLING_BY_ID[p.calling];
  const rows = EMBERS.map((e) => {
    const xp = d.emberXP[e.key], into = xp % EMBER_STEP, earned = d.emberEarned[e.key];
    const nextTier = [3, 6, 9].find((n) => n > earned);
    return `<tr><th scope="row">${e.name}</th><td class="num">${d.ember[e.key]}</td><td><div class="mini"><span style="width:${(into / EMBER_STEP) * 100}%"></span></div><small>${into} / ${EMBER_STEP} toward the next point${nextTier ? ` · a relic at ${nextTier} earned` : ""}</small></td></tr>`;
  }).join("");
  return sheetWrap("The ember flask", `<p class="blurb">Level ${d.level}${c ? `, ${esc(c.name)}` : ""}. The flask fills as you log and boils over when you rise a level: ${d.into} of ${d.need} toward the next.</p>
    <div class="fire">${bonfire(d.ember, d.level, { labels: true })}</div>
    <table class="embers"><tbody>${rows}</tbody></table>
    ${!st.s.done.points ? `<button class="primary wide" data-act="task" data-arg="points">Spread your ${d.pointsLeft} starting points</button>` : ""}`);
}
function moonsSheet() {
  const t = today();
  const days = Array.from({ length: 28 }, (_, k) => addDays(t, k - 27));
  const year = st.s.journal[addDays(t, -365)];
  return sheetWrap("The moon-strip", `<p class="blurb">A dark moon for each night you came to the desk, over the last four weeks.</p>
    <ol class="moons">${days.map((dk) => { const n = st.d.byDay[dk]?.length ?? 0, j = st.s.journal[dk]; return `<li class="${n || j ? "kept" : ""} ${dk === t ? "now" : ""}" title="${dk}"><i aria-hidden="true"></i><span>${Number(dk.slice(8))}</span><span class="sr">${n} logs${j ? ", journal written" : ""}</span></li>`; }).join("")}</ol>
    ${year ? `<section class="card"><h3>On this night, a year ago</h3>${year.text ? `<p>“${esc(year.text)}”</p>` : ""}${year.paper ? `<p class="quiet">Written in ${pageRef(year.paper)}. Go to the shelf and read the page.</p>` : ""}${year.pressed ? `<img class="pressed" data-page="${addDays(t, -365)}" alt="The page you pressed a year ago"/>` : ""}</section>` : ""}`);
}
function relicsSheet() {
  const p = st.s.profile!, c = CALLING_BY_ID[p.calling];
  const reached = EMBERS.flatMap((e) => [3, 6, 9].filter((n) => st.d.emberEarned[e.key] >= n).map((n) => `${e.name}, tier ${n / 3}`));
  return sheetWrap("The relic jars", `${c ? `<p><b>${c.charm}.</b> ${c.charmText}</p>` : `<p>Your calling is settled on night 7 of your first week, and its charm with it.</p>`}
    ${reached.length ? `<p class="label">Tiers reached</p><ul class="found">${reached.map((r) => `<li>${esc(r)}</li>`).join("")}</ul><p class="quiet">Choosing between a steady and a deep relic comes in a later build. Your jars are kept until then.</p>`
      : `<p class="quiet">A jar is filled when an ember earns its third point by logging. The first one is waiting on the shelf.</p>`}`);
}
function packSheet() {
  return sheetWrap("The crane bag", `<p class="blurb">Pack your whole Hollow into the bag, to keep it safe or carry it to another device.</p>
    ${PREVIEW ? `<p class="quiet">This is the preview. Packing works in the installed app.</p>` : `<div class="row2"><button class="primary" data-act="backup">Pack the bag</button><label class="ghost filebtn">Unpack a bag<input type="file" accept=".thinplace,application/json" data-input="import" hidden/></label></div>`}
    <p class="quiet">Unpacking blends a bag into this Hollow, so nothing here is lost. ${st.s.done.backup ? `Last packed ${fmtDate(st.s.done.backup)}.` : "Never packed yet."}</p>
    <p class="label">Two candles</p><p class="quiet">Soon you'll light your phone's candle from your computer's, and they'll catch each other up whenever both are lit.</p>`);
}
function cairnSheet() {
  const cs = st.s.cairn ?? [];
  return sheetWrap("The sealed scroll", cs.length ? cs.map((c) => Date.now() >= c.opens ? `<section class="card"><h3>Opened</h3><p>“${esc(c.text)}”</p><p class="quiet">Written ${fmtDate(c.written)}.</p></section>` : `<section class="card cairn"><h3>Sealed in red</h3><p class="quiet">Written ${fmtDate(c.written)}. It opens on ${new Date(c.opens).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}.</p></section>`).join("")
    : `<p class="blurb">On the seventh night of your first week, you'll write one line to yourself. It's sealed here and opens next Samhain.</p>`);
}
function bookSheet() {
  const found = st.d.openings.filter((o) => o.level > 1 && o.ts).map((o) => {
    const l = st.s.logs.find((x) => x.id === o.logId);
    return `<li><b>${esc(bName(o.building))}</b>, found ${fmtDate(o.ts!)}${l ? `, the day you logged “${esc(ACTION_BY_ID[l.action]?.name.toLowerCase() ?? "")}”` : ""}.</li>`;
  }).join("");
  const gl = (st.s.gleanings ?? []).slice().reverse().map((g) => `<section class="card glean"><h3>${new Date(g.written).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>${g.lines.map((x) => `<p>“${esc(x)}”</p>`).join("")}</section>`).join("");
  const books = (st.s.books ?? []).map((b) => `<li><b>Book ${roman(b.n)}</b>, begun ${fmtDate(b.started)}${b.finished ? `, finished ${fmtDate(b.finished)}` : ", in use"}.</li>`).join("");
  return sheetWrap("The Field Book", `<p class="label">Places you've found</p>${found ? `<ul class="found">${found}</ul>` : `<p class="quiet">Only your Bothy so far. The next place is drawn in at level 2.</p>`}
    ${st.s.settings.paper ? `<p class="label">Gleanings from your notebooks</p>${gl || `<p class="quiet">At each new moon, the table asks you to copy a few lines from the month's pages in here.</p>`}<button class="ghost wide" data-act="glean">Glean now</button>${books ? `<p class="label">Your notebooks</p><ul class="found">${books}</ul>` : ""}` : ""}`);
}
function notesSheet() {
  return sheetWrap("A slip of reminders", `${gleaningDue() ? `<section class="card"><h3>The gleaning</h3><p>The moon is new. Copy two or three lines from this month's pages into the Field Book.</p><button class="primary" data-act="glean">Glean the month</button></section>` : ""}${tasks()}${st.s.quiz?.mirror !== undefined && !st.s.quiz?.settled ? `<section class="card"><h3>Your first week</h3><p>Your seven nights of questions are done.</p><button class="primary" data-act="sheet" data-arg="firstweek">Read it back</button></section>` : ""}${hasNotes() ? "" : `<p class="quiet">Nothing to remember. The slip is gone from the wall.</p>`}`);
}

// ---------- sheets ----------
function sheetWrap(title: string, body: string, opts: { cls?: string; close?: boolean } = {}) {
  return `<div class="scrim" data-act="close"></div><div class="sheet ${opts.cls ?? ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="grip" aria-hidden="true"></div><div class="shead"><h2>${title}</h2>${opts.close === false ? "" : `<button class="x big" data-act="close" aria-label="Close">×</button>`}</div>${body}</div>`;
}

function actionRow(a: Action) {
  const r = st.d.rhythms.includes(a.id);
  return `<li><button class="arow" data-act="log" data-arg="${a.id}"><b>${esc(a.name)}</b><span>${esc(a.room)} · ${bName(a.building)}</span><em>${r ? `a rhythm · +${Math.max(1, Math.round(a.xp * 0.25))}` : `+${a.xp}`} ${emberName(a.ember)}${a.type === "experience" ? " · light" : ""}</em></button></li>`;
}

function recentActions(): Action[] {
  const since = Date.now() - 14 * 864e5, n: Record<string, number> = {};
  for (const l of st.s.logs) if (!l.deleted && l.ts > since && l.action !== "journal") n[l.action] = (n[l.action] ?? 0) + 1;
  const ids = Object.entries(n).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const base = ["cook", "walk", "read", "gym", "water", "tidy"];
  return [...new Set([...ids, ...base])].slice(0, 6).map((id) => ACTION_BY_ID[id]).filter(Boolean);
}

function logResults() {
  const res = st.q.trim() ? searchActions(st.q) : recentActions();
  if (!res.length) return `<p class="quiet">Nothing matches “${esc(st.q)}” yet. Try a simpler word, like “walk” or “read”.</p>`;
  return `${st.q.trim() ? "" : `<p class="label">Quick picks</p>`}<ul class="actions">${res.map(actionRow).join("")}</ul>`;
}

function logSheet() {
  return sheetWrap("Into the mortar", `
    <label class="field"><span class="sr">Search what you did</span><input id="q" type="search" autocomplete="off" placeholder="What did you do? ran, cooked, read…" value="${esc(st.q)}" data-input="q"/></label>
    <div class="chips"><button class="chip ${st.withSomeone ? "on" : ""}" data-act="with" aria-pressed="${st.withSomeone}">With someone</button>
    <input class="note" placeholder="Add a note (optional)" value="${esc(st.note)}" data-input="note" aria-label="Note"/></div>
    <div id="results">${logResults()}</div>`, { cls: "logsheet" });
}

function journalSheet() {
  const t = today(), j = st.s.journal[t], dr = st.journalDraft;
  const loggedToday = new Set((st.d.byDay[t] ?? []).map((l) => l.action));
  const ticked = new Set((st.d.byDay[t] ?? []).map((l) => l.habit).filter(Boolean));
  const missedHabits = st.s.habits.filter((h) => !h.archived && !ticked.has(h.id));
  const week: Record<string, number> = {};
  for (let i = 1; i <= 7; i++) for (const l of st.d.byDay[addDays(t, -i)] ?? []) if (l.action !== "journal") week[l.action] = (week[l.action] ?? 0) + 1;
  const usual = Object.entries(week).sort((a, b) => b[1] - a[1]).map(([k]) => k).filter((k) => !loggedToday.has(k) && !missedHabits.some((h) => h.action === k)).slice(0, 4);
  const catchup = [
    ...missedHabits.map((h) => `<button class="chip" data-act="tick" data-arg="${h.id}">${esc(h.name)}?</button>`),
    ...usual.map((k) => `<button class="chip" data-act="log" data-arg="${k}">${esc(ACTION_BY_ID[k].name)}?</button>`),
  ].join("");
  const feel = dr.feel ?? j?.feel;
  const asked = questionCard();
  const fp = !asked ? folklorePrompt() : null;
  const paper = !!st.s.settings.paper;
  return sheetWrap("By the candle", `
    ${asked}
    ${catchup ? `<p class="label">Anything you might have missed today?</p><div class="chips wrap">${catchup}</div>` : ""}
    <p class="label">How do you feel?</p><div class="chips wrap" role="radiogroup">${FEELINGS.map((f, i) => `<button class="chip ${feel === i ? "on" : ""}" role="radio" aria-checked="${feel === i}" data-act="feel" data-arg="${i}">${f}</button>`).join("")}</div>
    ${paper ? paperBlock() : `<label class="field"><span class="label">What did today hold?</span><textarea rows="4" data-input="jtext" placeholder="A line is enough.">${esc(dr.text || j?.text || "")}</textarea></label>`}
    <p class="label">What got in the way? <small>(optional, skip any time)</small></p>
    <div class="chips wrap">${BLOCKERS.map((b) => `<button class="chip ${(dr.blocker || j?.blocker) === b.id ? "on" : ""}" data-act="blocker" data-arg="${b.id}">${b.name}</button>`).join("")}</div>
    ${fp ? `<section class="folk"><p class="label">From the old tales <small>(optional)</small></p><p class="tale">${esc(fp.prompt.tale)}</p>
      ${fp.last ? `<p class="quiet">Last time you wrote: “${esc(fp.last)}”. What's changed?</p>` : ""}
      <label class="field"><span class="label">${esc(fp.prompt.q)}</span>${paper ? `<span class="quiet">Answer it in your book. Keep a line of it here if you like.</span>` : ""}<textarea rows="2" data-input="ptext">${esc(dr.ptext || j?.prompt?.answer || "")}</textarea></label></section>` : ""}
    <button class="primary wide" data-act="save-journal">${paper ? "I wrote tonight · close the gate" : "Close the gate for tonight"}</button>`);
}

function paperBlock() {
  const dr = st.journalDraft, j = st.s.journal[today()], pos = paperPos();
  const maxBook = Math.max(0, ...(st.s.books ?? []).map((b) => b.n));
  const pressed = dr.pressed || j?.pressed;
  return `<p class="label">I wrote tonight in</p>
    <div class="bookpage"><span>Book</span><button class="step" data-act="bk" data-arg="-1" aria-label="Earlier book" ${pos.book <= 1 ? "disabled" : ""}>−</button><b>${roman(pos.book)}</b><button class="step" data-act="bk" data-arg="1" aria-label="Next book">＋</button>
      <span>page</span><button class="step" data-act="pg" data-arg="-1" aria-label="Earlier page" ${pos.page <= 1 ? "disabled" : ""}>−</button><b>${pos.page}</b><button class="step" data-act="pg" data-arg="1" aria-label="Next page">＋</button></div>
    ${maxBook && pos.book > maxBook ? `<p class="quiet">A new book. Book ${roman(pos.book)} begins tonight, and Book ${roman(maxBook)} goes to the shelf in the Scriptorium.</p>` : ""}
    <label class="field"><span class="label">The kept line <small>(optional)</small></span><textarea rows="2" data-input="jtext" placeholder="The one line from tonight's page worth keeping.">${esc(dr.text || j?.text || "")}</textarea></label>
    ${st.s.settings.press ? `<label class="ghost filebtn wide">${pressed ? "Tonight's page is pressed · press again" : "Press tonight's page"}<input type="file" accept="image/*" capture="environment" data-input="press" hidden/></label>` : ""}`;
}

const dayNum = (key: string) => Math.round(Date.parse(key + "T12:00:00") / 864e5);
const roman = (n: number) => { let r = "", x = n; for (const [v, s2] of [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]] as [number, string][]) while (x >= v) { r += s2; x -= v; } return r || "I"; };
const pageRef = (p: { book: number; page: number }) => `Book ${roman(p.book)}, p. ${p.page}`;

// ---------- the paper journal ----------
function openJournal() {
  st.journalDraft = { feel: undefined, text: "", blocker: "", ptext: "", book: 0, page: 0, pressed: false };
  st.reveal = 0;
  st.sheet = st.s.settings.paper === undefined ? "paperask" : "journal";
}
function lastPaper(): { book: number; page: number } | null {
  const t = today();
  const keys = Object.keys(st.s.journal).filter((k) => k !== t && st.s.journal[k].paper).sort();
  return keys.length ? st.s.journal[keys[keys.length - 1]].paper! : null;
}
// Where tonight's writing is: the draft, tonight's entry, or the page after last time.
function paperPos(): { book: number; page: number } {
  const dr = st.journalDraft, j = st.s.journal[today()], last = lastPaper();
  const book = dr.book || j?.paper?.book || last?.book || 1;
  const page = dr.page || j?.paper?.page || (last && last.book === book ? last.page + 1 : 1);
  return { book, page };
}
function paperAskSheet() {
  return sheetWrap("Before you write", `<p class="blurb">Do you keep a paper journal?</p>
    <p class="quiet">If you write in a notebook, the game won't ask you to write it all again. You'll tap "I wrote tonight", note the book and page, and keep one line if you like. A year from now, it points you back to the real page.</p>
    <div class="row2"><button class="primary" data-act="paper" data-arg="yes">Yes, I write on paper</button><button class="ghost" data-act="paper" data-arg="no">No, I'll write here</button></div>
    <p class="quiet">You can change this any time with the iron key.</p>`);
}
// ---------- familiars ----------
const KINDS: { id: "cat" | "hound" | "hare" | "hen"; name: string; lore: string }[] = [
  { id: "cat", name: "Cat", lore: "a rush basket by the hearth, like the Cat Sí's" },
  { id: "hound", name: "Hound", lore: "a straw bed and a water bowl by the door" },
  { id: "hare", name: "Hare", lore: "a hutch with a hazel latch, for a shape-shifter" },
  { id: "hen", name: "Hen", lore: "a nesting box and a scatter of grain" },
];
function familiarSheet() {
  const f = st.famDraft, have = st.s.familiars ?? [];
  return sheetWrap(have.length ? "Another familiar" : "Your familiar", `<p class="blurb">${have.length ? `You keep ${have.map((x) => esc(x.name)).join(" and ")}. Who else shares the Bothy?` : "Who shares the Bothy with you? The pen is made for them."}</p>
    <p class="label">What kind?</p><div class="chips wrap" role="radiogroup">${KINDS.map((k) => `<button class="chip ${f.kind === k.id ? "on" : ""}" role="radio" aria-checked="${f.kind === k.id}" data-act="fam-kind" data-arg="${k.id}">${k.name}</button>`).join("")}</div>
    <p class="quiet">The pen: ${KINDS.find((k) => k.id === f.kind)!.lore}.</p>
    <label class="field"><span class="label">Their name</span><input data-input="famname" maxlength="24" value="${esc(f.name)}" placeholder="What do you call them?"/></label>
    <button class="primary wide" data-act="fam-save">Welcome them in</button>`);
}

function gleaningDue(): boolean {
  if (!st.s.settings.paper) return false;
  const moon = lastNewMoon(Date.now()), key = dayKey(moon, st.s.settings.cutoffHour);
  if ((st.s.gleanings ?? []).some((g) => g.moon === key)) return false;
  const since = moon - 31 * 864e5;
  return Object.entries(st.s.journal).some(([k, e]) => e.paper && Date.parse(k + "T12:00:00") >= since && Date.parse(k + "T12:00:00") < moon + 864e5);
}
function gleanSheet() {
  const moon = new Date(lastNewMoon(Date.now()));
  return sheetWrap("The gleaning", `<p class="blurb">The moon is new again. Leaf back through this month's pages and copy two or three lines worth keeping into the Field Book.</p>
    ${[0, 1, 2].map((i) => `<label class="field"><span class="label">${["The first line", "Another", "One more, if there is one"][i]}</span><textarea rows="2" data-input="glean${i}"></textarea></label>`).join("")}
    <button class="primary wide" data-act="save-glean">Into the Field Book</button>
    <p class="quiet">This month's new moon was ${moon.toLocaleDateString(undefined, { day: "numeric", month: "long" })}.</p>`);
}

function quizState() {
  const q = st.s.quiz;
  if (!q) return null;
  const answered = Object.keys(q.dilemmas).length, t = today();
  const answeredTonight = Object.values(q.nights).includes(t);
  return { q, answered, t, answeredTonight };
}

// One dilemma a night in the first week; the mirror after night 7.
function questionCard(): string {
  const qs = quizState();
  if (!qs) return "";
  const { q, answered, answeredTonight } = qs;
  if (st.reveal) {
    const d = DILEMMAS.find((x) => x.night === st.reveal)!;
    const tail = d.night < 7 ? "" : q.mirror === undefined
      ? `<p class="label">One last question</p><p class="aq">${esc(MIRROR.q)}</p><div class="chips wrap">${MIRROR.options.map((o, i) => `<button class="chip" data-act="mirror" data-arg="${i}">${esc(o)}</button>`).join("")}</div>`
      : `<p>Your seven nights are done.</p><button class="ghost" data-act="sheet" data-arg="firstweek">Read your first week back</button>`;
    return `<section class="ask done"><p class="label">Tonight's question · night ${d.night} of 7</p><p class="aq">${esc(d.q)}</p><p class="chosen">You chose: <b>${esc(d.options[q.dilemmas[d.night]].label)}</b></p><p class="tale">${esc(d.reveal)}</p>${tail}</section>`;
  }
  if (answered < 7 && !answeredTonight) {
    const d = DILEMMAS[answered];
    return `<section class="ask"><p class="label">Tonight's question · night ${d.night} of 7</p><p class="aq">${esc(d.q)}</p>
      <div class="chips wrap">${d.options.map((o, i) => `<button class="chip" data-act="dilemma" data-arg="${i}">${esc(o.label)}</button>`).join("")}</div>
      <p class="quiet">There's no better answer. Each one leans a different way.</p></section>`;
  }
  if (answered >= 7 && q.mirror === undefined) {
    return `<section class="ask"><p class="label">One last question</p><p class="aq">${esc(MIRROR.q)}</p>
      <div class="chips wrap">${MIRROR.options.map((o, i) => `<button class="chip" data-act="mirror" data-arg="${i}">${esc(o)}</button>`).join("")}</div></section>`;
  }
  if (q.mirror !== undefined && !q.settled) return `<section class="ask"><p class="label">Your first week</p><p>Your seven nights are done.</p><button class="ghost" data-act="sheet" data-arg="firstweek">Read it back</button></section>`;
  return "";
}

function folklorePrompt() {
  const p = st.s.profile!;
  if (!PROMPTS[p.calling] || !st.s.quiz?.settled) return null;
  const history = Object.entries(st.s.journal).filter(([, e]) => e.prompt).map(([k, e]) => ({ id: e.prompt!.id, day: dayNum(k), answer: e.prompt!.answer })).sort((a, b) => a.day - b.day);
  const t = today(), dn = dayNum(t);
  const tonight = st.s.journal[t]?.prompt;
  if (tonight) {
    const pr = PROMPTS[p.calling].find((x) => x.id === tonight.id);
    return pr ? { prompt: pr, last: undefined } : null;
  }
  return promptForDay(p.calling, dn - dayNum(dayKey(st.s.created, st.s.settings.cutoffHour)), history);
}

function firstWeekSheet() {
  const q = st.s.quiz!, p = st.s.profile!;
  const g = gaps(q.anchors, q.dilemmas, q.mirror);
  const suggested = suggestCalling(dilemmaTally(q.dilemmas)), cur = CALLING_BY_ID[p.calling], sug = CALLING_BY_ID[suggested];
  const choice = (c: typeof sug, label: string, primary: boolean) => `<button class="${primary ? "primary" : "ghost"}" data-act="settle" data-arg="${c.id}">${label}</button>`;
  return sheetWrap("Your first week", `
    <p class="blurb">Seven nights of questions, set beside your usual fortnight.</p>
    ${g.length ? `<p class="label">Two things pulled in different directions</p><ul class="gaps">${g.map((x) => `<li>${esc(x[0].toUpperCase() + x.slice(1))}</li>`).join("")}</ul><p>That gap is where your Hollow begins. Which feels truer right now? Your embers already follow your fortnight; your calling can follow who you'd choose to be.</p>`
      : `<p>Your answers and your fortnight line up closely. That's rare, and it means your Hollow starts on solid ground.</p>`}
    <p class="label">Your calling</p>
    <p>Your answers lean towards <b>${sug.name}</b>: ${emberName(sug.main)} first, then ${emberName(sug.second)}. “${sug.motto}”</p>
    <div class="row2">${cur && cur.id !== sug.id ? choice(cur, `Keep ${cur.name}`, false) + choice(sug, `Become ${sug.name}`, true) : choice(sug, cur ? `Keep ${sug.name}` : `Become ${sug.name}`, true)}</div>
    <details class="others"><summary>Or choose another calling</summary><div class="chips wrap">${CALLINGS.filter((c) => c.id !== sug.id).map((c) => `<button class="chip" data-act="settle" data-arg="${c.id}">${c.name}</button>`).join("")}</div></details>
    <label class="field"><span class="label">One line to yourself, a year from now</span><textarea rows="2" data-input="cairn" placeholder="It's sealed in a cairn and opens next Samhain.">${esc(st.cairnDraft)}</textarea></label>
    <p class="quiet">Switching is free, this once. The +2 and +1 move with your calling. These seven questions come back each Samhain, so you can see how your answers move.</p>`);
}

function gateSheet() {
  const p = st.s.profile!;
  return sheetWrap("The gate is closed", `<div class="gate">${guiser({ ...lookToOpts(p.look, glowSize()), label: "Your Scáth by the gate" })}
    <p>Goodnight, ${esc(p.name)}. Your Hollow will keep. Go and live the rest of your evening.</p>
    <button class="primary wide" data-act="close">Back to the Hollow</button></div>`, { close: false });
}

function pointsSheet() {
  const p = st.s.profile!, start = startEmbers(p), left = START_POINTS - pointsSpent(p);
  const c = CALLING_BY_ID[p.calling];
  return sheetWrap("Kindle your embers", `
    <p class="blurb">Every ember starts at 1${c ? `, and ${c.name} adds 2 to ${emberName(c.main)} and 1 to ${emberName(c.second)}` : ""}. Spread 14 more however feels true. Nothing can start above 6, and there's no respec later: a weak ember grows by doing.</p>
    <p class="left"><b>${left}</b> points left</p>
    <ul class="pts">${EMBERS.map((e) => `<li><div><b>${e.name}</b><small>${e.stands}</small></div>
      <button class="step" data-act="pt" data-arg="${e.key}:-1" aria-label="Less ${e.name}" ${(p.points[e.key] ?? 0) <= 0 ? "disabled" : ""}>−</button>
      <span class="num" aria-live="polite">${start[e.key]}</span>
      <button class="step" data-act="pt" data-arg="${e.key}:1" aria-label="More ${e.name}" ${left <= 0 || start[e.key] >= START_CAP ? "disabled" : ""}>＋</button></li>`).join("")}</ul>
    <button class="primary wide" data-act="points-done" ${left > 0 ? "disabled" : ""}>${left > 0 ? `Spread ${left} more` : "Light these embers"}</button>`);
}

const HABIT_SUGGESTIONS: [string, string, number][] = [
  ["Drink water", "water", 7], ["Go for a walk", "walk", 5], ["Read a chapter", "read", 5], ["Stretch", "stretch", 5],
  ["Cook at home", "cook", 4], ["Meditate", "meditate", 5], ["Sleep on time", "sleep", 7], ["Tidy up", "tidy", 3], ["Train", "gym", 3],
];

function habitsSheet() {
  const active = st.s.habits.filter((h) => !h.archived);
  return sheetWrap("Up to three habits", `
    <p class="blurb">A habit is one tap a day on the calendar. It counts as a log, so it earns XP like anything else. Start small: three is plenty.</p>
    <ul class="hpick">${HABIT_SUGGESTIONS.map(([name, act, n]) => {
      const on = active.find((h) => h.action === act);
      return `<li><button class="hp ${on ? "on" : ""}" data-act="habit-toggle" data-arg="${act}" aria-pressed="${!!on}" ${!on && active.length >= 3 ? "disabled" : ""}><b>${name}</b><span>${n === 7 ? "Every day" : `${n} times a week`} · ${bName(ACTION_BY_ID[act].building)}</span></button></li>`;
    }).join("")}</ul>
    <button class="primary wide" data-act="habits-done">${active.length ? `Keep these ${active.length}` : "Skip for now"}</button>`);
}

function isStandalone() {
  return matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

function installSheet() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return sheetWrap("Keep your Hollow safe", `
    <p class="blurb">Your Hollow lives only on this device. Adding Thinplace to your home screen stops the browser clearing it, and makes it open like an app.</p>
    ${st.installEvt ? `<button class="primary wide" data-act="do-install">Add to home screen</button>`
      : ios ? `<ol class="steps"><li>Tap the <b>Share</b> button in Safari.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Open Thinplace from the new icon.</li></ol>`
      : `<p>Use your browser's menu and choose <b>Install app</b> or <b>Add to home screen</b>.</p>`}
    <button class="ghost wide" data-act="install-done">Done</button>`);
}

function settingsSheet() {
  const c = st.s.settings.cutoffHour;
  const pp = !!st.s.settings.paper, pr = !!st.s.settings.press;
  return sheetWrap("The iron key", `<p class="blurb">The rules of the house.</p>
    <p class="label">Your journal</p>
    <div class="chips wrap"><button class="chip ${pp ? "on" : ""}" data-act="set-paper" aria-pressed="${pp}">I keep a paper journal</button>${pp ? `<button class="chip ${pr ? "on" : ""}" data-act="set-press" aria-pressed="${pr}">Press pages (photos, on this device)</button>` : ""}</div>
    <p class="quiet">${pp ? "Tonight's entry is a tap, a book and page, and one kept line if you like." : "You write your evening entries here, at the table."}</p>
    <p class="label">When does your day end?</p>
    <div class="chips wrap">${[2, 3, 4, 5, 6].map((h) => `<button class="chip ${c === h ? "on" : ""}" data-act="cutoff" data-arg="${h}">${h} am</button>`).join("")}</div>
    <p class="quiet">Logs before this time count toward the day before. Night owls move it later.</p>
    <p class="label">Backups</p>
    ${PREVIEW ? `<p class="quiet">This is the preview. Backups and home-screen install work in the installed app.</p>` : ""}
    <div class="row2" ${PREVIEW ? "hidden" : ""}><button class="primary" data-act="backup">Save a backup</button><label class="ghost filebtn">Open a backup<input type="file" accept=".thinplace,application/json" data-input="import" hidden/></label></div>
    <p class="quiet">Opening a backup blends it into this Hollow, so nothing here is lost. ${st.s.done.backup ? `Last backup ${fmtDate(st.s.done.backup)}.` : "No backup yet."}</p>
    <p class="label">Your other devices</p>
    <p class="quiet">Live sync between your phone and computer comes in the next build: pair once with a QR code, then they catch up whenever both are open. Until then, a backup file moves your Hollow across.</p>
    <p class="label">Monsters</p><p class="quiet">Monsters arrive in a later build. They'll sleep while you're away, and gentle mode can turn them off entirely.</p>`);
}

function lookSheet() {
  const p = st.s.profile!, c = CALLING_BY_ID[p.calling];
  return sheetWrap("The scrying bowl", `<p class="blurb">${esc(p.name)} · ${esc(p.pronouns)} · ${c ? esc(c.name) : "calling still to be found"}${c ? `. <em>“${esc(c.motto)}”</em>` : ""}</p>` + lookPicker(st.s.profile!.look, st.s.profile!.calling, "look-") + `<button class="primary wide" data-act="close">Done</button>`);
}

// Is a hood or staff yours yet? Starting items always are; the rest are earned.
function earned(it: { id: string; unlock: string; need?: Need }, calling: string): boolean {
  const c = CALLING_BY_ID[calling];
  if (it.unlock === "start") return true;
  if (it.unlock === "calling") return c?.staff === it.id;
  if (it.unlock === "samhain") return st.s.logs.some((l) => { if (l.deleted) return false; const d = new Date(l.ts); return (d.getMonth() === 9 && d.getDate() === 31) || (d.getMonth() === 10 && d.getDate() === 1); });
  const n = it.need ?? {};
  if (n.ember) return (st.d?.emberEarned?.[n.ember] ?? 0) >= (n.tier ?? 1) * 3;
  if (n.level) return (st.d?.level ?? 1) >= n.level;
  return false;
}
function howToEarn(it: { unlock: string; need?: Need }): string {
  if (it.unlock === "samhain") return "log on Samhain, 31 Oct or 1 Nov";
  const n = it.need ?? {};
  if (n.ember) return `${EMBERS.find((e) => e.key === n.ember)!.name} tier ${n.tier ?? 1} · ${(n.tier ?? 1) * 3} points`;
  if (n.level) return `reach level ${n.level}`;
  return "";
}

function lookPicker(look: Profile["look"], calling: string, prefix: string) {
  const c = CALLING_BY_ID[calling];
  const satchels = SATCHELS.filter((b) => b.id === "satchel" || b.id === "sack" || b.id === c?.satchel);
  const staves = STAVES.filter((x) => x.unlock !== "calling" || x.id === c?.staff);
  const hoods = HOODS;
  type Item = { id: string; name: string; unlock?: string; need?: Need; note?: string };
  const pick = (kind: string, items: Item[], cur: string, sw?: (id: string) => string) => {
    const mine = items.filter((it) => !it.unlock || it.id === cur || earned(it as any, calling));
    const locked = items.filter((it) => !mine.includes(it));
    const chip = (it: Item, on: boolean) => `<button class="chip ${on ? "on" : ""}" role="radio" aria-checked="${on}" data-act="${prefix}${kind.toLowerCase()}" data-arg="${it.id}"${it.note ? ` title="${esc(it.note)}"` : ""}>${sw ? sw(it.id) : ""}${esc(it.name)}</button>`;
    const lockChip = (it: Item) => `<span class="chip locked" title="${esc(`${it.name}: ${howToEarn(it as any)}`)}" aria-label="${esc(`${it.name}, locked. Earned by ${howToEarn(it as any)}`)}"><span class="nm">${sw ? sw(it.id) : ""}${esc(it.name)}</span><small>${esc(howToEarn(it as any))}</small></span>`;
    return `<p class="label">${kind}</p><div class="chips wrap" role="radiogroup">${mine.map((it) => chip(it, cur === it.id)).join("")}</div>`
      + (locked.length ? `<details class="locked-set"><summary>${locked.length} more to earn</summary><div class="chips wrap">${locked.map(lockChip).join("")}</div></details>` : "");
  };
  const stf = STAVES.find((x) => x.id === look.staff), hd = HOODS.find((h) => h.id === look.hood);
  return `<div class="lookgrid"><div class="preview">${guiser({ ...lookToOpts(look, 0.95), label: "Preview of your Scáth" })}</div><div>
    ${pick("Hood", hoods, look.hood, (id) => `<i class="sw" style="background:${HOODS.find((h) => h.id === id)!.hood}"></i>`)}
    ${hd ? `<p class="quiet">${esc(hd.name)}: ${esc(hd.note)}.</p>` : ""}
    ${pick("Satchel", satchels, look.satchel)}
    ${pick("Staff", staves, look.staff)}
    ${stf ? `<p class="quiet">${esc(stf.ogham ? `${stf.name} (${stf.ogham}): ${stf.meaning}.` : `${stf.name}: ${stf.meaning}.`)}</p>` : ""}
    ${pick("Glow", Object.keys(GLOWS).map((k) => ({ id: k, name: k[0].toUpperCase() + k.slice(1) })), look.glow, (id) => `<i class="sw" style="background:${GLOWS[id]}"></i>`)}
    <p class="quiet">Change any of this whenever you like, from Me. Masks come later.</p></div></div>`;
}

function levelSheet(level: number) {
  return sheetWrap(`Level ${level}`, `<div class="gate"><div class="fire">${bonfire(st.d.ember, level)}</div><p>Your bonfire burns a little bigger. ${levelFromXP(st.d.total).level === level ? `${100 * level} XP to the next level.` : ""}</p><button class="primary wide" data-act="next">Lovely</button></div>`, { close: false });
}

function foundSheet(id: BuildingId) {
  const o = st.d.openings.find((x) => x.building === id)!, b = BUILDINGS.find((x) => x.id === id)!;
  const l = st.s.logs.find((x) => x.id === o.logId);
  return sheetWrap(`You found ${b.name}`, `<div class="gate"><svg viewBox="-60 -110 120 130" class="found-art" role="img" aria-label="${esc(b.name)}"><g filter="url(#wob)">${inkify(buildingArt(id))}</g></svg>
    <p class="dated">Inked on your map on ${fmtDate(o.ts!)}${l ? `, the day you logged “${esc(ACTION_BY_ID[l.action]?.name.toLowerCase() ?? "")}”` : ""}.</p><p>${esc(b.blurb)}</p>
    <button class="primary wide" data-act="next">Walk there later</button></div>`, { close: false });
}

function sheet() {
  const sh = st.sheet;
  if (!sh) return "";
  if (sh === "log") return logSheet();
  if (sh === "journal") return journalSheet();
  if (sh === "gate") return gateSheet();
  if (sh === "points") return pointsSheet();
  if (sh === "firstweek") return firstWeekSheet();
  if (sh === "habits") return habitsSheet();
  if (sh === "install") return installSheet();
  if (sh === "settings") return settingsSheet();
  if (sh === "look") return lookSheet();
  if (sh === "day") return daySheet();
  if (sh === "tally") return tallySheet();
  if (sh === "embers") return embersSheet();
  if (sh === "moons") return moonsSheet();
  if (sh === "relics") return relicsSheet();
  if (sh === "pack") return packSheet();
  if (sh === "cairn") return cairnSheet();
  if (sh === "book") return bookSheet();
  if (sh === "notes") return notesSheet();
  if (sh === "paperask") return paperAskSheet();
  if (sh === "familiar") return familiarSheet();
  if (sh === "glean") return gleanSheet();
  if ("found" in sh) return foundSheet(sh.found);
  if ("level" in sh) return levelSheet(sh.level);
  return "";
}

// ---------- intake ----------
function intake() {
  const it = st.intake;
  const steps = ["You", "Calling", "Look", "Fortnight", "Embers"];
  const dots = `<ol class="dots" aria-label="Step ${it.step + 1} of ${steps.length}">${steps.map((s, i) => `<li class="${i === it.step ? "on" : i < it.step ? "done" : ""}">${s}</li>`).join("")}</ol>`;
  let body = "";
  if (it.step === 0) {
    body = `<div class="hello">${guiser({ glowSize: 1.1, label: "A Scáth at the thin place" })}<div>
      <h1>Thinplace</h1><p class="lede">A thin place is where the veil between worlds wears thin. Here, it's where you meet yourself.</p></div></div>
      <label class="field"><span class="label">What should the Hollow call you?</span><input data-input="name" value="${esc(it.name)}" autocomplete="nickname" maxlength="24" placeholder="Your name"/></label>
      <p class="label">Your pronouns</p><div class="chips wrap" role="radiogroup">${["she/her", "he/him", "they/them"].map((p) => `<button class="chip ${it.pronouns === p ? "on" : ""}" role="radio" aria-checked="${it.pronouns === p}" data-act="pron" data-arg="${p}">${p}</button>`).join("")}
      <input class="note" data-input="pron-own" placeholder="Or your own" aria-label="Your own pronouns" value="${["she/her", "he/him", "they/them"].includes(it.pronouns) ? "" : esc(it.pronouns)}"/></div>
      <button class="primary wide" data-act="intake-next" ${it.name.trim() && it.pronouns.trim() ? "" : "disabled"}>Next</button>`;
  } else if (it.step === 1) {
    body = `<h2>Choose a calling</h2><p class="blurb">A calling shapes your start without locking anything. You can rename its title later.</p>
      <ul class="callings">${CALLINGS.map((c) => `<li><button class="calling ${it.calling === c.id ? "on" : ""}" data-act="calling" data-arg="${c.id}" aria-pressed="${it.calling === c.id}">
        <b>${c.name}</b><span>Leans on ${emberName(c.main)} and ${emberName(c.second)} · ${c.charm}</span><em>${c.motto}</em></button></li>`).join("")}</ul>
      <div class="row2"><button class="ghost" data-act="surprise">Surprise me</button><button class="ghost ${it.calling === "later" ? "on" : ""}" data-act="calling-later" aria-pressed="${it.calling === "later"}">Decide after my first week</button></div>
      ${it.calling === "later" ? `<p class="quiet">Each evening of your first week, the hearth asks one question. On night 7 they suggest a calling.</p>` : ""}
      <button class="primary wide" data-act="intake-next" ${it.calling ? "" : "disabled"}>Next</button>`;
  } else if (it.step === 2) {
    body = `<h2>Make your Scáth yours</h2>${lookPicker(it.look, it.calling === "later" ? "" : it.calling, "in-")}<button class="primary wide" data-act="intake-next">Next</button>`;
  } else if (it.step === 3) {
    const done = ANCHORS.every((a) => it.anchors[a.id] !== undefined);
    body = `<h2>Your usual fortnight</h2><p class="blurb">Not your best two weeks, and not your worst. These set where your embers start, so honest beats impressive.</p>
      ${ANCHORS.map((a) => `<p class="label">${esc(a.q)}</p><div class="chips wrap" role="radiogroup">${a.options.map((o, i) => `<button class="chip ${it.anchors[a.id] === i ? "on" : ""}" role="radio" aria-checked="${it.anchors[a.id] === i}" data-act="anc" data-arg="${a.id}:${i}">${esc(o.label)}</button>`).join("")}</div>`).join("")}
      <div class="chips"><button class="chip ${it.unusual ? "on" : ""}" data-act="unusual" aria-pressed="${it.unusual}">These two weeks were unusual for me</button></div>
      <button class="primary wide" data-act="intake-next" ${done ? "" : "disabled"}>See my embers</button>`;
  } else {
    const calling = it.calling === "later" ? "" : it.calling;
    const start = startEmbers({ name: "", pronouns: "", look: it.look, calling, points: it.points, updated: 0 });
    const left = START_POINTS - Object.values(it.points).reduce((n, v) => n + (v ?? 0), 0);
    body = `<h2>Your embers</h2><p class="blurb">Your answers suggest this spread of your 14 starting points. Adjust it if it doesn't feel true. Nothing starts above 6, and there's no respec later: a weak ember grows by doing.</p>
      <div class="fire">${bonfire(start, 1, { labels: true })}</div>
      <p class="left"><b>${left}</b> points left</p>
      <ul class="pts">${EMBERS.map((e) => `<li><div><b>${e.name}</b><small>${e.stands}</small></div>
        <button class="step" data-act="ipt" data-arg="${e.key}:-1" aria-label="Less ${e.name}" ${(it.points[e.key] ?? 0) <= 0 ? "disabled" : ""}>−</button>
        <span class="num">${start[e.key]}</span>
        <button class="step" data-act="ipt" data-arg="${e.key}:1" aria-label="More ${e.name}" ${left <= 0 || start[e.key] >= START_CAP ? "disabled" : ""}>＋</button></li>`).join("")}</ul>
      <button class="primary wide" data-act="intake-finish">Step into the Hollow</button>`;
  }
  return `<main class="intake">${dots}${body}${it.step > 0 ? `<button class="link back" data-act="intake-back">Back</button>` : ""}</main>`;
}

// ---------- render ----------
const worldHooks = {
  enter: (id: BuildingId) => enterBuilding(id),
  locked: (id: BuildingId) => lockedToast(id),
  isOpen: (id: BuildingId) => isOpen(st.d, id),
  near: (id: BuildingId | null) => {
    st.near = id && isOpen(st.d, id) ? id : null;
    const b = document.querySelector(".enter") as HTMLButtonElement | null;
    if (!b) return;
    b.hidden = !st.near;
    if (st.near) b.innerHTML = `Go into ${esc(bName(st.near))} <kbd>Enter</kbd>`;
  },
  moved: () => {
    if (st.s.done.walked) return;
    st.s.done.walked = Date.now();
    save(st.s);
    document.querySelector(".hint")?.remove();
  },
};

let lastSheetKey = "";
function render() {
  const root = $app();
  if (!st.s.profile) {
    root.innerHTML = DEFS + intake();
    return;
  }
  const main = st.view === "hollow" ? hollow() : bothyView();
  const sheetKey = JSON.stringify(st.sheet);
  root.innerHTML = `${DEFS}${topbar()}<main class="view ${st.view}">${main}</main>${nav()}${sheet()}${st.toast ? `<div class="toast" role="status">${esc(st.toast)}</div>` : ""}`;
  if (st.sheet === "log" && sheetKey !== lastSheetKey) {
    const q = document.getElementById("q") as HTMLInputElement | null;
    q?.focus();
  }
  if (st.sheet && sheetKey !== lastSheetKey) (document.querySelector(".sheet") as HTMLElement | null)?.scrollTo(0, 0);
  if (document.getElementById("world")) attachWorld(worldHooks);
  if (document.getElementById("room")) attachRoom();
  if (document.getElementById("table")) attachTable();
  document.querySelectorAll<HTMLImageElement>("img.pressed[data-page]").forEach(async (img) => { const u = await getPage(img.dataset.page!); if (u) img.src = u; else img.remove(); });
  const scene = document.getElementById("scene"), on = scene?.querySelector(".prop.on") as SVGGElement | null;
  if (scene && on) {
    const sr = scene.getBoundingClientRect(), r = on.getBoundingClientRect();
    scene.scrollLeft += r.left + r.width / 2 - (sr.left + sr.width / 2);
  }
  lastSheetKey = sheetKey;
}

// ---------- events ----------
async function onAct(act: string, arg: string, el: HTMLElement) {
  const it = st.intake;
  switch (act) {
    case "view":
      if (arg === "hollow" && st.view === "hollow" && st.inside) standAtDoor(st.inside);
      if (arg === "hollow" && st.view === "bothy") standAtDoor("bothy");
      if (arg === "bothy" && st.view !== "bothy") { st.bothy = "room"; placeAt("desk"); st.stationAt = "desk"; st.s.done.roomVisits = (st.s.done.roomVisits ?? 0) + 1; save(st.s); }
      st.inside = null; st.view = arg as View; st.sheet = null; break;
    case "sit": sit(); return;
    case "stand": st.bothy = "room"; placeAt("desk"); st.stationAt = "desk"; break;
    case "names": st.names = !st.names; break;
    case "spot": useSpot(arg); return;
    case "leave-bothy": st.view = "hollow"; standAtDoor("bothy"); break;
    case "station-go": { if (arg === "desk") { sit(); return; } placeAt(arg); st.stationAt = arg; break; }
    case "toggle-list": st.list = !st.list; break;
    case "open-log": st.q = ""; st.withSomeone = false; st.sheet = "log"; break;
    case "open-journal": openJournal(); break;
    case "close": st.sheet = null; nextSheet(); break;
    case "next": nextSheet(); break;
    case "sheet": st.sheet = arg as Sheet; break;
    case "go": enterBuilding(arg as BuildingId); return;
    case "enter": if (st.near) enterBuilding(st.near); return;
    case "leave": if (st.inside) standAtDoor(st.inside); st.inside = null; break;
    case "station": st.station = Number(arg); break;
    case "log": if (st.sheet === "tally") st.motion.notch = performance.now(); await logAction(arg); return;
    case "noop": return;
    case "paper": st.s.settings = { ...st.s.settings, paper: arg === "yes", updated: Date.now() }; await commit(); st.sheet = "journal"; break;
    case "set-paper": st.s.settings = { ...st.s.settings, paper: !st.s.settings.paper, updated: Date.now() }; await commit(); break;
    case "set-press": st.s.settings = { ...st.s.settings, press: !st.s.settings.press, updated: Date.now() }; await commit(); break;
    case "bk": { keepJournalDraft(); const p0 = paperPos(); st.journalDraft.book = Math.max(1, p0.book + Number(arg)); st.journalDraft.page = Number(arg) > 0 ? 1 : p0.page; break; }
    case "pg": { keepJournalDraft(); const p0 = paperPos(); st.journalDraft.book = p0.book; st.journalDraft.page = Math.max(1, p0.page + Number(arg)); break; }
    case "glean": st.sheet = "glean"; break;
    case "fam-kind": st.famDraft.name = (document.querySelector("[data-input=famname]") as HTMLInputElement)?.value ?? st.famDraft.name; st.famDraft.kind = arg as any; break;
    case "fam-add": st.famDraft = { kind: "cat", name: "" }; st.sheet = "familiar"; break;
    case "fam-save": {
      const name = ((document.querySelector("[data-input=famname]") as HTMLInputElement)?.value ?? st.famDraft.name).trim();
      if (!name) { toast("Give them a name first."); return; }
      (st.s.familiars ??= []).push({ id: uid(), kind: st.famDraft.kind, name, since: Date.now() });
      await commit(); st.sheet = null; nextSheet(); toast(`${name} has a place in the Bothy now.`); break;
    }
    case "save-glean": {
      const lines = [0, 1, 2].map((i) => ((document.querySelector(`[data-input=glean${i}]`) as HTMLTextAreaElement)?.value ?? "").trim()).filter(Boolean);
      if (!lines.length) { toast("Copy at least one line, or close this for now."); return; }
      (st.s.gleanings ??= []).push({ id: uid(), moon: dayKey(lastNewMoon(Date.now()), st.s.settings.cutoffHour), written: Date.now(), lines });
      await commit(); st.sheet = null; toast(`Gleaned: ${lines.length} line${lines.length > 1 ? "s" : ""} into the Field Book.`); return;
    }
    case "with": st.withSomeone = !st.withSomeone; break;
    case "del": await deleteLog(arg); return;
    case "tick": {
      const h = st.s.habits.find((x) => x.id === arg);
      if (!h) return;
      const t = today();
      const existing = st.s.logs.find((l) => !l.deleted && l.habit === h.id && dayKey(l.ts, st.s.settings.cutoffHour) === t);
      if (existing) { await deleteLog(existing.id); return; }
      st.motion.notch = performance.now();
      await logAction(h.action, { habit: h.id });
      return;
    }
    case "feel": st.journalDraft.feel = Number(arg); break;
    case "dilemma": {
      const q = st.s.quiz!, night = Object.keys(q.dilemmas).length + 1;
      keepJournalDraft();
      q.dilemmas[night] = Number(arg);
      q.nights[night] = today();
      q.updated = Date.now();
      st.reveal = night;
      await commit();
      break;
    }
    case "mirror": { const q = st.s.quiz!; keepJournalDraft(); q.mirror = Number(arg); q.updated = Date.now(); await commit(); break; }
    case "settle": {
      const p = st.s.profile!, q = st.s.quiz!;
      const line = ((document.querySelector("[data-input=cairn]") as HTMLTextAreaElement)?.value ?? st.cairnDraft).trim();
      if (line) {
        const now = Date.now(), y = new Date().getFullYear();
        let opens = new Date(y, 9, 31, 18).getTime();
        if (opens - now < 200 * 864e5) opens = new Date(y + 1, 9, 31, 18).getTime();
        (st.s.cairn ??= []).push({ text: line, written: now, opens });
      }
      const changed = p.calling !== arg;
      p.calling = arg;
      p.updated = Date.now();
      q.settled = Date.now();
      q.updated = Date.now();
      st.cairnDraft = "";
      await commit();
      st.sheet = null;
      toast(changed ? `You are ${CALLING_BY_ID[arg].name} now.` : `${CALLING_BY_ID[arg].name} it is.`);
      return;
    }
    case "blocker": st.journalDraft.blocker = st.journalDraft.blocker === arg ? "" : arg; break;
    case "save-journal": {
      const t = today(), dr = st.journalDraft, prev = st.s.journal[t];
      const text = (document.querySelector("[data-input=jtext]") as HTMLTextAreaElement)?.value ?? dr.text;
      const pt = ((document.querySelector("[data-input=ptext]") as HTMLTextAreaElement)?.value ?? "").trim();
      const fp = folklorePrompt();
      st.s.journal[t] = { feel: dr.feel ?? prev?.feel, text: text.trim(), blocker: dr.blocker || prev?.blocker, updated: Date.now(),
        ...(fp && pt ? { prompt: { id: fp.prompt.id, answer: pt } } : prev?.prompt ? { prompt: prev.prompt } : {}) };
      if (st.s.settings.paper) {
        const pos = paperPos(), now = Date.now(), books = (st.s.books ??= []);
        const maxBook = Math.max(0, ...books.map((b) => b.n));
        if (pos.book > maxBook) { for (const b of books) b.finished ??= now; books.push({ n: pos.book, started: now }); }
        st.s.journal[t].paper = pos;
        if (dr.pressed || prev?.pressed) st.s.journal[t].pressed = true;
      }
      st.reveal = 0;
      const already = (st.d.byDay[t] ?? []).some((l) => l.action === "journal");
      if (!already) st.s.logs.push({ id: uid(), ts: Date.now(), action: "journal" });
      await commit();
      st.sheet = "gate";
      break;
    }
    case "task":
      if (arg === "backup") { exportBackup(st.s); st.s.done.backup = Date.now(); await commit(); toast("Backup saved. Keep the file somewhere safe."); return; }
      st.sheet = arg as Sheet;
      break;
    case "pt": {
      const [k, dlt] = arg.split(":"), p = st.s.profile!;
      const cur = p.points[k as Ember] ?? 0, next = cur + Number(dlt);
      const left = START_POINTS - pointsSpent(p);
      if (next < 0 || (Number(dlt) > 0 && (left <= 0 || startEmbers(p)[k as Ember] >= START_CAP))) return;
      p.points[k as Ember] = next;
      p.updated = Date.now();
      await commit();
      break;
    }
    case "points-done": st.s.done.points = Date.now(); await commit(); st.sheet = null; toast("Your embers are lit."); return;
    case "habit-toggle": {
      const active = st.s.habits.filter((h) => !h.archived);
      const on = active.find((h) => h.action === arg);
      if (on) on.archived = Date.now();
      else if (active.length < 3) {
        const sug = HABIT_SUGGESTIONS.find((x) => x[1] === arg)!;
        st.s.habits.push({ id: uid(), name: sug[0], action: arg, perWeek: sug[2], created: Date.now() });
      }
      await commit();
      break;
    }
    case "habits-done": st.s.done.habits = Date.now(); await commit(); st.sheet = null; break;
    case "do-install": st.installEvt?.prompt(); st.installEvt = null; st.s.done.install = Date.now(); await commit(); st.sheet = null; break;
    case "install-done": st.s.done.install = Date.now(); await commit(); st.sheet = null; break;
    case "cutoff": st.s.settings = { ...st.s.settings, cutoffHour: Number(arg), updated: Date.now() }; await commit(); break;
    case "backup": exportBackup(st.s); st.s.done.backup = Date.now(); await commit(); toast("Backup saved."); return;
    case "look-hood": case "look-satchel": case "look-staff": case "look-glow": {
      const p = st.s.profile!;
      p.look = { ...p.look, [act.slice(5)]: arg };
      p.updated = Date.now();
      await commit();
      break;
    }
    // intake
    case "pron": it.pronouns = arg; break;
    case "calling": {
      it.calling = arg;
      const c = CALLING_BY_ID[arg];
      it.look = { ...it.look, staff: c.staff, satchel: c.satchel };
      break;
    }
    case "calling-later": it.calling = "later"; break;
    case "anc": { const [id, i] = arg.split(":"); it.anchors[id] = Number(i); break; }
    case "unusual": it.unusual = !it.unusual; break;
    case "ipt": {
      const [k, dlt] = arg.split(":"), e = k as Ember;
      const start = startEmbers({ name: "", pronouns: "", look: it.look, calling: it.calling === "later" ? "" : it.calling, points: it.points, updated: 0 });
      const spent = Object.values(it.points).reduce((n, v) => n + (v ?? 0), 0);
      const cur = it.points[e] ?? 0, next = cur + Number(dlt);
      if (next < 0 || (Number(dlt) > 0 && (spent >= START_POINTS || start[e] >= START_CAP))) return;
      it.points = { ...it.points, [e]: next };
      break;
    }
    case "surprise": {
      const c = CALLINGS[Math.floor(Math.random() * CALLINGS.length)];
      it.calling = c.id;
      it.look = { ...it.look, staff: c.staff, satchel: c.satchel };
      break;
    }
    case "in-hood": case "in-satchel": case "in-staff": case "in-glow": it.look = { ...it.look, [act.slice(3)]: arg }; break;
    case "intake-next": {
      if (it.step === 3) {
        const calling = it.calling === "later" ? "" : it.calling;
        const base = startEmbers({ name: "", pronouns: "", look: it.look, calling, points: {}, updated: 0 });
        it.points = suggestPoints(anchorScores(it.anchors, it.unusual), base);
      }
      it.step++;
      break;
    }
    case "intake-back": it.step = Math.max(0, it.step - 1); break;
    case "intake-finish": {
      const now = Date.now();
      st.s.profile = { name: it.name.trim(), pronouns: it.pronouns.trim(), calling: it.calling === "later" ? "" : it.calling, look: it.look, points: it.points, updated: now };
      st.s.created = now;
      st.s.done.points = now;
      st.s.quiz = { anchors: it.anchors, unusual: it.unusual, dilemmas: {}, nights: {}, updated: now };
      await commit();
      persist();
      st.view = "hollow";
      toast(`Welcome to Thinplace, ${st.s.profile.name}. Your Hollow has 1 building open.`);
      return;
    }
    default: return;
  }
  render();
}

function onInput(key: string, el: HTMLInputElement | HTMLTextAreaElement) {
  const v = el.value;
  if (key === "q") {
    st.q = v;
    const r = document.getElementById("results");
    if (r) r.innerHTML = logResults();
    return;
  }
  if (key === "note") { st.note = v; return; }
  if (key === "jtext") { st.journalDraft.text = v; return; }
  if (key === "ptext") { st.journalDraft.ptext = v; return; }
  if (key === "cairn") { st.cairnDraft = v; return; }
  if (key === "famname") { st.famDraft.name = v; return; }
  if (key === "name") { st.intake.name = v; toggleNext(); return; }
  if (key === "pron-own") {
    st.intake.pronouns = v;
    document.querySelectorAll(".intake .chip[data-act=pron]").forEach((c) => c.classList.remove("on"));
    toggleNext();
    return;
  }
}

function toggleNext() {
  const b = document.querySelector(".intake [data-act=intake-next]") as HTMLButtonElement | null;
  if (b) b.disabled = !(st.intake.name.trim() && st.intake.pronouns.trim());
}

async function onFile(input: HTMLInputElement) {
  const f = input.files?.[0];
  if (!f) return;
  try {
    const before = st.s.logs.length;
    st.s = await importBackup(f, st.s);
    await commit();
    toast(`Backup opened. ${st.s.logs.length - before} new logs blended in.`);
  } catch {
    toast("That file isn't a Thinplace backup.");
  }
}

async function onPress(input: HTMLInputElement) {
  const f = input.files?.[0];
  if (!f) return;
  try {
    keepJournalDraft();
    await putPage(today(), await pressPhoto(f));
    st.journalDraft.pressed = true; render(); toast("Pressed. Tonight's page is kept on this device.");
  } catch { toast("That photo couldn't be pressed. Try another."); }
}

export async function start() {
  st.s = await load();
  st.d = derive(st.s);
  render();
  document.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
    if (!el || (el as HTMLButtonElement).disabled) return;
    e.preventDefault();
    onAct(el.dataset.act!, el.dataset.arg ?? "", el);
  });
  document.addEventListener("keydown", (e) => {
    const el = e.target as HTMLElement;
    if ((e.key === "Enter" || e.key === " ") && el.getAttribute("role") === "button" && el.dataset.act) {
      e.preventDefault();
      onAct(el.dataset.act, el.dataset.arg ?? "", el);
    }
    if (e.key === "Escape" && st.sheet) { st.sheet = null; render(); return; }
    if (!st.sheet && st.inside && !el.closest("input,textarea")) {
      const n = roomsOf(st.inside).length;
      if (e.key === "Escape") { standAtDoor(st.inside); st.inside = null; render(); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { st.station = (st.station + (e.key === "ArrowRight" ? 1 : n - 1)) % n; render(); return; }
    }
    if (e.key === "Enter" && !st.sheet && st.near && document.getElementById("world") && !el.closest("input,textarea,button")) { e.preventDefault(); enterBuilding(st.near); return; }
    if (e.key === "Enter" && el.id === "q") {
      const first = searchActions(st.q)[0];
      if (first) logAction(first.id);
    }
  });
  document.addEventListener("input", (e) => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.input && el.type !== "file") onInput(el.dataset.input, el);
  });
  document.addEventListener("change", (e) => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.input === "import") onFile(el);
    if (el.dataset.input === "press") onPress(el);
  });
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); st.installEvt = e; });
}

function keepJournalDraft() {
  const t = document.querySelector("[data-input=jtext]") as HTMLTextAreaElement | null;
  if (t) st.journalDraft.text = t.value;
  const p = document.querySelector("[data-input=ptext]") as HTMLTextAreaElement | null;
  if (p) st.journalDraft.ptext = p.value;
}
