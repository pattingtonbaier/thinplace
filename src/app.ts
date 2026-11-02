import { bonfire, buildingArt, DEFS, guiser, lookToOpts } from "./art";
import { attachWorld, standAtDoor, worldSVG } from "./iso";
import { inkify, interiorSVG, roomsOf } from "./world";
import {
  ACTIONS, ACTION_BY_ID, BLOCKERS, BUILDINGS, CALLINGS, CALLING_BY_ID, EMBERS, FEELINGS, GLOWS, HOODS, SATCHELS, STAVES,
  type Action, type BuildingId, type Ember,
} from "./content";
import {
  addDays, dayKey, derive, EMBER_STEP, habitTicks, isOpen, levelFromXP, pointsSpent, searchActions, START_CAP, START_POINTS,
  startEmbers, uid, weekStart, type Derived, type Habit, type Log, type Profile, type Save,
} from "./engine";
import { exportBackup, importBackup, load, persist, save } from "./store";
import { ANCHORS, anchorScores, DILEMMAS, dilemmaTally, gaps, MIRROR, promptForDay, PROMPTS, suggestCalling, suggestPoints } from "./quiz";

// ---------- state ----------
type View = "hollow" | "hearth" | "me";
type Sheet =
  | null | "log" | "journal" | "gate" | "points" | "habits" | "settings" | "install" | "look" | "firstweek"
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
  journalDraft: { feel: undefined as number | undefined, text: "", blocker: "", ptext: "" },
  reveal: 0, // the night whose tale was just revealed
  cairnDraft: "",
  installEvt: null as any,
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
  if (aw.capped) toast(`${a.name} logged. That's 3 today, so this one is just for the record.`);
  else {
    const parts = Object.entries(aw.byEmber).map(([e, v]) => `+${v} ${emberName(e as Ember)}`);
    toast(`${a.name} · ${parts.join(" · ")}`);
  }
  if (st.queue.length && (st.sheet === null || st.sheet === "log")) nextSheet();
  render();
}

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
  return `<nav class="tabs" aria-label="Main">${t("hollow", "Hollow", "⌂")}<button class="logbtn" data-act="open-log" aria-label="Quick log">＋ Log</button>${t("hearth", "Hearth", "☼")}${t("me", "Me", "◐")}</nav>`;
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
      ${hearthDesk ? `<p class="quiet">Your journal, habits and today's logs live here.</p><div class="row2"><button class="primary" data-act="open-journal">Evening journal</button><button class="ghost" data-act="view" data-arg="hearth">Habits and today</button></div>` : `<ul class="actions">${acts.map(actionRow).join("")}</ul>`}
    </section></section>`;
}

function listView() {
  return `<section class="listmode" aria-label="Your Hollow as a list"><h2>Your Hollow</h2><ul class="blist">${BUILDINGS.map((b, i) => {
    const o = st.d.openings[i], open = isOpen(st.d, b.id);
    return `<li><button class="brow ${open ? "" : "dim"}" data-act="go" data-arg="${b.id}"><b>${esc(b.name)}</b><span>${open ? (o.level === 1 ? "Open" : `Found ${fmtDate(o.ts!)}`) : `Opens at level ${o.level}`}</span></button></li>`;
  }).join("")}</ul></section>`;
}

function hollow() {
  if (st.inside) return insideView(st.inside);
  return st.list ? listView() : mapView();
}

function enterBuilding(id: BuildingId) {
  if (!isOpen(st.d, id)) return lockedToast(id);
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

function hearth() {
  const t = today();
  const j = st.s.journal[t];
  const habits = st.s.habits.filter((h) => !h.archived);
  const year = st.s.journal[addDays(t, -365)];
  return `<section class="hearth">
    <h2>The hearth desk</h2>
    ${tasks()}
    <section class="card"><h3>Habits</h3>${habits.length ? `<ul class="habits">${habits.map(habitRow).join("")}</ul>` : `<p class="quiet">No habits yet.</p>`}
      <button class="link" data-act="task" data-arg="habits">${habits.length ? "Change habits" : "Choose habits"}</button></section>
    <section class="card journal-card"><h3>Evening journal</h3>
      ${j ? `<p>${j.feel !== undefined ? `<b>${FEELINGS[j.feel]}.</b> ` : ""}${esc(j.text ?? "")}</p><button class="link" data-act="open-journal">Add to tonight's entry</button>`
        : `<p class="quiet">Three small prompts, and a catch-up for anything you missed. Then the Hollow closes the gate.</p><button class="primary" data-act="open-journal">Open the journal</button>`}
    </section>
    ${st.s.quiz?.mirror !== undefined && !st.s.quiz?.settled ? `<section class="card"><h3>Your first week</h3><p>Your seven nights of questions are done.</p><button class="primary" data-act="sheet" data-arg="firstweek">Read it back</button></section>` : ""}
    ${(st.s.cairn ?? []).map((c) => Date.now() >= c.opens ? `<section class="card"><h3>A letter from the cairn</h3><p>“${esc(c.text)}”</p><p class="quiet">Written ${fmtDate(c.written)}.</p></section>` : `<section class="card cairn"><h3>A cairn by the hearth</h3><p class="quiet">Sealed until ${new Date(c.opens).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}.</p></section>`).join("")}
    ${year ? `<section class="card"><h3>On this day, a year ago</h3><p>${esc(year.text ?? "")}</p></section>` : ""}
    <section class="card"><h3>Today</h3>${todayLogs()}</section>
  </section>`;
}

function me() {
  const p = st.s.profile!, d = st.d, c = CALLING_BY_ID[p.calling];
  const opts = lookToOpts(p.look, glowSize());
  const rows = EMBERS.map((e) => {
    const xp = d.emberXP[e.key], into = xp % EMBER_STEP, earned = d.emberEarned[e.key];
    const nextTier = [3, 6, 9].find((n) => n > earned);
    return `<tr><th scope="row">${e.name}</th><td class="num">${d.ember[e.key]}</td><td><div class="mini"><span style="width:${(into / EMBER_STEP) * 100}%"></span></div><small>${into} / ${EMBER_STEP} XP${nextTier ? ` · relic at ${nextTier} earned` : ""}</small></td></tr>`;
  }).join("");
  const found = d.openings.filter((o) => o.level > 1 && o.ts).map((o) => {
    const l = st.s.logs.find((x) => x.id === o.logId);
    return `<li><b>${esc(bName(o.building))}</b> found ${fmtDate(o.ts!)}${l ? `, the day you logged “${esc(ACTION_BY_ID[l.action]?.name.toLowerCase() ?? "")}”` : ""}.</li>`;
  }).join("");
  return `<section class="me">
    <div class="portrait">${guiser({ ...opts, label: p.name })}<div><h2>${esc(p.name)}</h2><p class="sub">${esc(p.pronouns)} · ${c?.name ?? "Calling to be found"} · level ${d.level}</p>${c ? `<p class="motto">“${c.motto}”</p>` : ""}<button class="link" data-act="sheet" data-arg="look">Change your look</button></div></div>
    <section class="card"><h3>Your bonfire</h3><div class="fire">${bonfire(d.ember, d.level, { labels: true })}</div>
      <table class="embers"><tbody>${rows}</tbody></table>
      ${!st.s.done.points ? `<button class="primary" data-act="task" data-arg="points">Spread your ${d.pointsLeft} starting points</button>` : ""}</section>
    <section class="card"><h3>Calling charm</h3>${c ? `<p><b>${c.charm}.</b> ${c.charmText}</p>` : `<p>Your calling is settled on night 7 of your first week, from the questions by the hearth.</p>`}<p class="quiet">Relic choices arrive when an ember earns its third point by logging.</p></section>
    <section class="card"><h3>Places you've found</h3>${found ? `<ul class="found">${found}</ul>` : `<p class="quiet">Your Bothy is open. The next building is drawn in at level 2.</p>`}</section>
    <section class="card"><h3>Settings</h3><button class="link" data-act="sheet" data-arg="settings">Day cutoff, backups and sync</button></section>
  </section>`;
}

// ---------- sheets ----------
function sheetWrap(title: string, body: string, opts: { cls?: string; close?: boolean } = {}) {
  return `<div class="scrim" data-act="close"></div><div class="sheet ${opts.cls ?? ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="grip" aria-hidden="true"></div><div class="shead"><h2>${title}</h2>${opts.close === false ? "" : `<button class="x big" data-act="close" aria-label="Close">×</button>`}</div>${body}</div>`;
}

function actionRow(a: Action) {
  return `<li><button class="arow" data-act="log" data-arg="${a.id}"><b>${esc(a.name)}</b><span>${esc(a.room)} · ${bName(a.building)}</span><em>+${a.xp} ${emberName(a.ember)}${a.type === "experience" ? " · light" : ""}</em></button></li>`;
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
  return sheetWrap("What did you do?", `
    <label class="field"><span class="sr">Search what you did</span><input id="q" type="search" autocomplete="off" placeholder="Type it: ran, cooked, read…" value="${esc(st.q)}" data-input="q"/></label>
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
  return sheetWrap("Evening journal", `
    ${asked}
    ${catchup ? `<p class="label">Anything you might have missed today?</p><div class="chips wrap">${catchup}</div>` : ""}
    <p class="label">How do you feel?</p><div class="chips wrap" role="radiogroup">${FEELINGS.map((f, i) => `<button class="chip ${feel === i ? "on" : ""}" role="radio" aria-checked="${feel === i}" data-act="feel" data-arg="${i}">${f}</button>`).join("")}</div>
    <label class="field"><span class="label">What did today hold?</span><textarea rows="4" data-input="jtext" placeholder="A line is enough.">${esc(dr.text || j?.text || "")}</textarea></label>
    <p class="label">What got in the way? <small>(optional, skip any time)</small></p>
    <div class="chips wrap">${BLOCKERS.map((b) => `<button class="chip ${(dr.blocker || j?.blocker) === b.id ? "on" : ""}" data-act="blocker" data-arg="${b.id}">${b.name}</button>`).join("")}</div>
    ${fp ? `<section class="folk"><p class="label">From the old tales <small>(optional)</small></p><p class="tale">${esc(fp.prompt.tale)}</p>
      ${fp.last ? `<p class="quiet">Last time you wrote: “${esc(fp.last)}”. What's changed?</p>` : ""}
      <label class="field"><span class="label">${esc(fp.prompt.q)}</span><textarea rows="2" data-input="ptext">${esc(dr.ptext || j?.prompt?.answer || "")}</textarea></label></section>` : ""}
    <button class="primary wide" data-act="save-journal">Close the gate for tonight</button>`);
}

const dayNum = (key: string) => Math.round(Date.parse(key + "T12:00:00") / 864e5);

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
  return sheetWrap("Spread your ember points", `
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
  return sheetWrap("Choose up to three habits", `
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
  return sheetWrap("Settings", `
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
  return sheetWrap("Your Scáth", lookPicker(st.s.profile!.look, st.s.profile!.calling, "look-") + `<button class="primary wide" data-act="close">Done</button>`);
}

function lookPicker(look: Profile["look"], calling: string, prefix: string) {
  const c = CALLING_BY_ID[calling];
  const satchels = SATCHELS.filter((b) => b.id === "satchel" || b.id === "sack" || b.id === c?.satchel);
  const staves = STAVES.filter((x) => x.unlock === "start" || x.id === c?.staff);
  const hoods = HOODS.filter((h) => h.unlock === "start");
  const pick = (kind: string, items: { id: string; name: string }[], cur: string, sw?: (id: string) => string) =>
    `<p class="label">${kind}</p><div class="chips wrap" role="radiogroup">${items.map((it) => `<button class="chip ${cur === it.id ? "on" : ""}" role="radio" aria-checked="${cur === it.id}" data-act="${prefix}${kind.toLowerCase()}" data-arg="${it.id}">${sw ? sw(it.id) : ""}${esc(it.name)}</button>`).join("")}</div>`;
  return `<div class="lookgrid"><div class="preview">${guiser({ ...lookToOpts(look, 0.95), label: "Preview of your Scáth" })}</div><div>
    ${pick("Hood", hoods, look.hood, (id) => `<i class="sw" style="background:${HOODS.find((h) => h.id === id)!.hood}"></i>`)}
    ${pick("Satchel", satchels, look.satchel)}
    ${pick("Staff", staves, look.staff)}
    ${pick("Glow", Object.keys(GLOWS).map((k) => ({ id: k, name: k[0].toUpperCase() + k.slice(1) })), look.glow, (id) => `<i class="sw" style="background:${GLOWS[id]}"></i>`)}
    <p class="quiet">${esc(STAVES.find((x) => x.id === look.staff)?.ogham ? `${STAVES.find((x) => x.id === look.staff)!.name} (${STAVES.find((x) => x.id === look.staff)!.ogham}): ${STAVES.find((x) => x.id === look.staff)!.meaning}.` : `${STAVES.find((x) => x.id === look.staff)?.name ?? ""}: ${STAVES.find((x) => x.id === look.staff)?.meaning ?? ""}.`)} More dyes, staves and masks unlock as you grow.</p></div></div>`;
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
  const main = st.view === "hollow" ? hollow() : st.view === "hearth" ? hearth() : me();
  const sheetKey = JSON.stringify(st.sheet);
  root.innerHTML = `${DEFS}${topbar()}<main class="view ${st.view}">${main}</main>${nav()}${sheet()}${st.toast ? `<div class="toast" role="status">${esc(st.toast)}</div>` : ""}`;
  if (st.sheet === "log" && sheetKey !== lastSheetKey) {
    const q = document.getElementById("q") as HTMLInputElement | null;
    q?.focus();
  }
  if (st.sheet && sheetKey !== lastSheetKey) (document.querySelector(".sheet") as HTMLElement | null)?.scrollTo(0, 0);
  if (document.getElementById("world")) attachWorld(worldHooks);
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
    case "view": if (arg === "hollow" && st.view === "hollow" && st.inside) { standAtDoor(st.inside); } st.inside = null; st.view = arg as View; st.sheet = null; break;
    case "toggle-list": st.list = !st.list; break;
    case "open-log": st.q = ""; st.withSomeone = false; st.sheet = "log"; break;
    case "open-journal": st.journalDraft = { feel: undefined, text: "", blocker: "", ptext: "" }; st.reveal = 0; st.sheet = "journal"; break;
    case "close": st.sheet = null; nextSheet(); break;
    case "next": nextSheet(); break;
    case "sheet": st.sheet = arg as Sheet; break;
    case "go": enterBuilding(arg as BuildingId); return;
    case "enter": if (st.near) enterBuilding(st.near); return;
    case "leave": if (st.inside) standAtDoor(st.inside); st.inside = null; break;
    case "station": st.station = Number(arg); break;
    case "log": await logAction(arg); return;
    case "with": st.withSomeone = !st.withSomeone; break;
    case "del": await deleteLog(arg); return;
    case "tick": {
      const h = st.s.habits.find((x) => x.id === arg);
      if (!h) return;
      const t = today();
      const existing = st.s.logs.find((l) => !l.deleted && l.habit === h.id && dayKey(l.ts, st.s.settings.cutoffHour) === t);
      if (existing) { await deleteLog(existing.id); return; }
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
  });
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); st.installEvt = e; });
}

function keepJournalDraft() {
  const t = document.querySelector("[data-input=jtext]") as HTMLTextAreaElement | null;
  if (t) st.journalDraft.text = t.value;
  const p = document.querySelector("[data-input=ptext]") as HTMLTextAreaElement | null;
  if (p) st.journalDraft.ptext = p.value;
}
