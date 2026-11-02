// The XP engine. Everything a Hollow shows is derived from its logs, so two devices
// can merge their logs and recompute the same Hollow.
import { ACTION_BY_ID, BUILDINGS, CALLING_BY_ID, EMBERS, OPEN_LEVELS, type Ember } from "./content";

export const SAVE_VERSION = 1;
export const DAILY_CAP = 3; // the first 3 of the same action count each day
export const WITH_SOMEONE_BONUS = 0.4; // experience logs done with someone, going to Fellowship
export const EMBER_STEP = 300; // XP tagged to an ember per point
export const START_POINTS = 14;
export const START_CAP = 6;
export const EMBER_CAP = 10;

export interface Look {
  hood: string;
  satchel: string;
  staff: string;
  glow: string;
}

export interface Profile {
  name: string;
  pronouns: string;
  look: Look;
  calling: string;
  points: Partial<Record<Ember, number>>; // the 14 starting points, spread in the first week
  updated: number;
}

export interface Habit {
  id: string;
  name: string;
  action: string;
  perWeek: number;
  created: number;
  archived?: number;
}

export interface Log {
  id: string;
  ts: number;
  action: string;
  note?: string;
  withSomeone?: boolean;
  habit?: string;
  deleted?: number; // a tombstone, so a deletion survives a merge
}

export interface JournalEntry {
  feel?: number;
  prompt?: { id: string; answer: string };
  text?: string;
  blocker?: string;
  updated: number;
  previous?: { text?: string; updated: number }; // the older version, kept when a merge picks the newer
}

export interface Save {
  v: number;
  id: string;
  created: number;
  profile: Profile | null;
  habits: Habit[];
  logs: Log[];
  journal: Record<string, JournalEntry>;
  settings: { cutoffHour: number; nudges: boolean; updated: number };
  done: Record<string, number>; // first-week tasks and other one-off moments
  quiz?: Quiz;
  cairn?: { text: string; written: number; opens: number }[];
}

export interface Quiz {
  anchors: Record<string, number>;
  unusual?: boolean;
  dilemmas: Record<number, number>;
  nights: Record<number, string>; // night -> the day it was answered
  mirror?: number;
  settled?: number;
  updated: number;
}

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function emptySave(now = Date.now()): Save {
  return {
    v: SAVE_VERSION,
    id: uid(),
    created: now,
    profile: null,
    habits: [],
    logs: [],
    journal: {},
    settings: { cutoffHour: 4, nudges: false, updated: now },
    done: {},
  };
}

// Older saves are converted here on load, one version step at a time.
export function migrate(raw: any): Save {
  const s = { ...emptySave(), ...raw } as Save;
  s.v = SAVE_VERSION;
  s.logs ??= [];
  s.habits ??= [];
  s.journal ??= {};
  s.done ??= {};
  return s;
}

const pad = (n: number) => String(n).padStart(2, "0");

// The day ends at the cutoff hour (4 am by default) in local time.
export function dayKey(ts: number, cutoffHour = 4): string {
  const d = new Date(ts - cutoffHour * 3600_000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(y, m - 1, d + n, 12);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

// Level L to L+1 costs 100 x L XP.
export function xpForLevel(level: number): number {
  return 100 * level;
}
export function levelFromXP(total: number): { level: number; into: number; need: number } {
  let level = 1, left = total;
  while (left >= xpForLevel(level)) {
    left -= xpForLevel(level);
    level++;
  }
  return { level, into: left, need: xpForLevel(level) };
}

export interface Award {
  xp: number;
  byEmber: Partial<Record<Ember, number>>;
  capped: boolean;
}

export function awardFor(log: Log, countToday: number): Award {
  const a = ACTION_BY_ID[log.action];
  if (!a || countToday >= DAILY_CAP) return { xp: 0, byEmber: {}, capped: !!a };
  const byEmber: Partial<Record<Ember, number>> = { [a.ember]: a.xp };
  let xp = a.xp;
  if (log.withSomeone && a.type === "experience") {
    const bonus = Math.round(a.xp * WITH_SOMEONE_BONUS);
    byEmber.F = (byEmber.F ?? 0) + bonus;
    xp += bonus;
  }
  return { xp, byEmber, capped: false };
}

export interface LevelUp {
  level: number;
  ts: number;
  logId: string;
}

export interface Opening {
  building: string;
  level: number;
  ts?: number; // when it was found, if it has been
  logId?: string;
}

export interface Derived {
  total: number;
  level: number;
  into: number;
  need: number;
  emberXP: Record<Ember, number>;
  emberEarned: Record<Ember, number>; // points earned by logging (tiers count these only)
  emberStart: Record<Ember, number>; // 1 + calling + spread points
  ember: Record<Ember, number>; // what the bonfire shows
  awards: Record<string, Award>;
  levelUps: LevelUp[];
  openings: Opening[];
  byDay: Record<string, Log[]>;
  pointsLeft: number;
}

export function startEmbers(p: Profile | null): Record<Ember, number> {
  const out = Object.fromEntries(EMBERS.map((e) => [e.key, 1])) as Record<Ember, number>;
  if (!p) return out;
  const c = CALLING_BY_ID[p.calling];
  if (c) {
    out[c.main] += 2;
    out[c.second] += 1;
  }
  for (const e of EMBERS) out[e.key] = Math.min(START_CAP, out[e.key] + (p.points[e.key] ?? 0));
  return out;
}

export function pointsSpent(p: Profile | null): number {
  if (!p) return 0;
  return EMBERS.reduce((n, e) => n + (p.points[e.key] ?? 0), 0);
}

export function liveLogs(s: Save): Log[] {
  return s.logs.filter((l) => !l.deleted).sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1));
}

export function derive(s: Save): Derived {
  const cutoff = s.settings.cutoffHour;
  const emberXP = Object.fromEntries(EMBERS.map((e) => [e.key, 0])) as Record<Ember, number>;
  const awards: Record<string, Award> = {};
  const levelUps: LevelUp[] = [];
  const byDay: Record<string, Log[]> = {};
  const counts: Record<string, number> = {};
  let total = 0;
  let level = 1;
  for (const l of liveLogs(s)) {
    const day = dayKey(l.ts, cutoff);
    (byDay[day] ??= []).push(l);
    const k = day + "|" + l.action;
    const aw = awardFor(l, counts[k] ?? 0);
    counts[k] = (counts[k] ?? 0) + 1;
    awards[l.id] = aw;
    total += aw.xp;
    for (const [e, v] of Object.entries(aw.byEmber)) emberXP[e as Ember] += v!;
    const now = levelFromXP(total).level;
    while (level < now) {
      level++;
      levelUps.push({ level, ts: l.ts, logId: l.id });
    }
  }
  const lv = levelFromXP(total);
  const start = startEmbers(s.profile);
  const earned = {} as Record<Ember, number>;
  const ember = {} as Record<Ember, number>;
  for (const e of EMBERS) {
    earned[e.key] = Math.floor(emberXP[e.key] / EMBER_STEP);
    ember[e.key] = Math.min(EMBER_CAP, start[e.key] + earned[e.key]);
  }
  const openings: Opening[] = BUILDINGS.map((b, i) => {
    const at = OPEN_LEVELS[i];
    const up = levelUps.find((u) => u.level === at);
    return { building: b.id, level: at, ts: at === 1 ? s.created : up?.ts, logId: up?.logId };
  });
  return {
    total, level: lv.level, into: lv.into, need: lv.need,
    emberXP, emberEarned: earned, emberStart: start, ember,
    awards, levelUps, openings, byDay,
    pointsLeft: START_POINTS - pointsSpent(s.profile),
  };
}

export function isOpen(d: Derived, building: string): boolean {
  const o = d.openings.find((x) => x.building === building);
  return !!o && (o.level === 1 || !!o.ts);
}

// Habits: how many ticks this week (weeks start Monday).
export function weekStart(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dow = (new Date(y, m - 1, d, 12).getDay() + 6) % 7;
  return addDays(key, -dow);
}

export function habitTicks(s: Save, habitId: string, fromKey: string, days: number): string[] {
  const end = addDays(fromKey, days);
  const keys = new Set<string>();
  for (const l of s.logs) {
    if (l.deleted || l.habit !== habitId) continue;
    const k = dayKey(l.ts, s.settings.cutoffHour);
    if (k >= fromKey && k < end) keys.add(k);
  }
  return [...keys];
}

// Merging two Hollows: logs are only ever added, so the union is safe. Deletions travel as
// tombstones. For edited things (profile, habits, journal), the newer version wins and the
// older journal text is kept underneath.
export function merge(a: Save, b: Save): Save {
  const out: Save = { ...a };
  const logs = new Map<string, Log>();
  for (const l of [...a.logs, ...b.logs]) {
    const prev = logs.get(l.id);
    if (!prev) logs.set(l.id, l);
    else if (l.deleted && !prev.deleted) logs.set(l.id, l);
  }
  out.logs = [...logs.values()].sort((x, y) => x.ts - y.ts);

  const habits = new Map<string, Habit>();
  for (const h of [...a.habits, ...b.habits]) {
    const prev = habits.get(h.id);
    if (!prev || (h.archived ?? 0) > (prev.archived ?? 0)) habits.set(h.id, h);
  }
  out.habits = [...habits.values()];

  out.journal = { ...a.journal };
  for (const [k, e] of Object.entries(b.journal)) {
    const mine = out.journal[k];
    if (!mine) out.journal[k] = e;
    else if (e.updated > mine.updated) out.journal[k] = { ...e, previous: mine.text !== e.text ? { text: mine.text, updated: mine.updated } : mine.previous };
    else if (e.updated < mine.updated && e.text !== mine.text) out.journal[k] = { ...mine, previous: { text: e.text, updated: e.updated } };
  }

  if (!a.profile || (b.profile && b.profile.updated > a.profile.updated)) out.profile = b.profile;
  if (b.settings.updated > a.settings.updated) out.settings = b.settings;
  out.done = { ...b.done, ...a.done };
  if (!a.quiz || (b.quiz && b.quiz.updated > a.quiz.updated)) out.quiz = b.quiz;
  const cairn = new Map<number, { text: string; written: number; opens: number }>();
  for (const c of [...(a.cairn ?? []), ...(b.cairn ?? [])]) cairn.set(c.written, c);
  if (cairn.size) out.cairn = [...cairn.values()];
  out.created = Math.min(a.created, b.created);
  return out;
}

// Quick-log search: words first, then names.
export function searchActions(q: string, limit = 8) {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const scored: { id: string; score: number }[] = [];
  for (const a of Object.values(ACTION_BY_ID)) {
    const name = a.name.toLowerCase();
    let score = 0;
    if (name.startsWith(t)) score = 5;
    else if (a.words?.some((w) => w === t)) score = 4;
    else if (a.words?.some((w) => w.startsWith(t))) score = 3;
    else if (name.includes(t)) score = 2;
    else if (a.room.toLowerCase().includes(t) || a.words?.some((w) => w.includes(t))) score = 1;
    if (score) scored.push({ id: a.id, score });
  }
  return scored.sort((x, y) => y.score - x.score).slice(0, limit).map((x) => ACTION_BY_ID[x.id]);
}
