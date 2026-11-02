// The intake quiz (anchors and dilemmas), the night-7 gaps, and the folklore prompt decks.
import { CALLINGS, EMBERS, type Ember } from "./content";

// ---------- anchors: who you are right now, in a usual fortnight ----------
export interface Anchor {
  id: string;
  q: string;
  embers: Ember[];
  options: { label: string; level: number | null; ember?: Ember; hint?: string }[]; // null = neutral, never low
}

export const ANCHORS: Anchor[] = [
  { id: "move", q: "How many times did you move enough to breathe hard?", embers: ["B"], options: [
    { label: "None", level: 0 }, { label: "1 to 3", level: 1 }, { label: "4 to 8", level: 2 }, { label: "9 or more", level: 3 },
    { label: "My body doesn't allow it right now", level: null },
  ] },
  { id: "new", q: "When did you last do something for the very first time?", embers: ["E"], options: [
    { label: "This week", level: 3 }, { label: "This month", level: 2 }, { label: "This year", level: 1 }, { label: "I honestly can't remember", level: 0 },
  ] },
  { id: "finish", q: "When did you last finish something: a book, a course, a project?", embers: ["I", "R"], options: [
    { label: "This week", level: 3 }, { label: "This month", level: 2 }, { label: "This year", level: 1 }, { label: "Over a year ago", level: 0 },
  ] },
  { id: "meal", q: "When did you last make a meal for someone else?", embers: ["N", "F"], options: [
    { label: "This week", level: 3 }, { label: "This month", level: 2 }, { label: "This year", level: 1 }, { label: "I can't remember", level: 0 },
  ] },
  { id: "evening", q: "Where does your evening usually go?", embers: [], options: [
    { label: "A screen", level: 0, hint: "each-uisce" }, { label: "People", level: 3, ember: "F" }, { label: "Making something", level: 3, ember: "O" }, { label: "Rest", level: 3, ember: "N" },
  ] },
];

export type AnchorAnswers = Record<string, number>; // anchor id -> option index

export function anchorScores(ans: AnchorAnswers, unusual = false): Record<Ember, number> {
  const s = Object.fromEntries(EMBERS.map((e) => [e.key, 0])) as Record<Ember, number>;
  for (const a of ANCHORS) {
    const i = ans[a.id];
    if (i === undefined) continue;
    const o = a.options[i];
    if (o.level === null) continue;
    // An unusual stretch pulls every answer halfway back to the middle.
    const lv = unusual ? (o.level + 1.5) / 2 : o.level;
    for (const e of o.ember ? [o.ember] : a.embers) s[e] += lv;
  }
  return s;
}

// Spread the 14 starting points in proportion to the anchors, never past 6 including the calling.
export function suggestPoints(scores: Record<Ember, number>, start: Record<Ember, number>, total = 14, cap = 6): Partial<Record<Ember, number>> {
  const given = Object.fromEntries(EMBERS.map((e) => [e.key, 0])) as Record<Ember, number>;
  for (let n = 0; n < total; n++) {
    let best: Ember | null = null, bestV = -1;
    for (const e of EMBERS) {
      if (start[e.key] + given[e.key] >= cap) continue;
      const v = (1 + scores[e.key]) / (1 + given[e.key]);
      if (v > bestV) { bestV = v; best = e.key; }
    }
    if (!best) break;
    given[best]++;
  }
  return given;
}

// ---------- dilemmas: who you want to be, one a night ----------
export interface Dilemma {
  night: number;
  q: string;
  options: { label: string; embers: Ember[] }[];
  reveal: string;
}

export const DILEMMAS: Dilemma[] = [
  { night: 1, q: "For the next ten years, you can keep one.", options: [{ label: "A body that never tires", embers: ["B"] }, { label: "A mind that never stops learning", embers: ["I"] }],
    reveal: "The Fianna, Fionn's warriors, had to be both: to join, you ran through a forest with your hair braided, and failed if a single strand was caught or a twig cracked underfoot. And you had to know twelve books of poetry by heart." },
  { night: 2, q: "A door opens to a place where you'd be happy, but every year there costs ten at home. Do you step through?", options: [{ label: "Go", embers: ["E"] }, { label: "Stay", embers: ["N"] }, { label: "Only if someone comes with me", embers: ["F"] }],
    reveal: "This was Oisín's choice. Niamh of the golden hair took him to Tír na nÓg, the land of youth. Three happy years later he rode home and found three hundred had passed, and everyone he knew was gone." },
  { night: 3, q: "Which regret would you rather carry?", options: [{ label: "The thing I tried and failed at", embers: ["R"] }, { label: "The thing I never tried", embers: ["N"] }],
    reveal: "Bran heard a woman sing of islands beyond the sea and set out to find them. When his crew came home, one man leapt ashore and crumbled to dust: centuries had passed. Bran wrote his story in ogham, and sailed away again." },
  { night: 4, q: "Would you rather be remembered for something you made, or for how you made people feel?", options: [{ label: "Something I made", embers: ["R"] }, { label: "How I made people feel", embers: ["F"] }],
    reveal: "Goibniu the smith forged a spear in three strokes, and his feast kept the gods from growing old. Brigid was goddess of smithcraft, poetry and healing all at once: of making things, and of mending people." },
  { night: 5, q: "Would you rather be envied, or understood?", options: [{ label: "Envied", embers: ["R"] }, { label: "Understood", embers: ["F"] }],
    reveal: "Lugh arrived at Tara and was turned away until he proved he held every art at once: smith, harper, poet, healer, warrior. The king was so struck that he gave Lugh his own seat for thirteen days." },
  { night: 6, q: "The Cailleach offers a bargain: perfect discipline, but your curiosity goes quiet.", options: [{ label: "Accept", embers: ["R"] }, { label: "Refuse", embers: ["E"] }],
    reveal: "The Cailleach is the winter hag who rules from Samhain to spring. She keeps the land orderly and still. Some say she gathers firewood on St Brigid's Day: if the day is bright, she wants a long winter." },
  { night: 7, q: "What do you guard most fiercely?", options: [{ label: "My time", embers: ["R"] }, { label: "My people", embers: ["F"] }, { label: "My peace", embers: ["N"] }],
    reveal: "Every household kept its fire through the night by smooring it: banking the embers under ash, with a blessing, so it could be woken in the morning. What you guard is what you smoor." },
];

export const MIRROR = {
  q: "The thing you say you want most: are you actually doing anything about it?",
  options: ["Yes", "No, and I know why", "No, and I don't know why"],
};

export type DilemmaAnswers = Record<number, number>; // night -> option index

export function dilemmaTally(ans: DilemmaAnswers): Record<Ember, number> {
  const t = Object.fromEntries(EMBERS.map((e) => [e.key, 0])) as Record<Ember, number>;
  for (const d of DILEMMAS) {
    const i = ans[d.night];
    if (i === undefined) continue;
    for (const e of d.options[i].embers) t[e]++;
  }
  return t;
}

export function suggestCalling(tally: Record<Ember, number>): string {
  let best = CALLINGS[0].id, bestV = -1;
  for (const c of CALLINGS) {
    const v = tally[c.main] * 2 + tally[c.second];
    if (v > bestV) { bestV = v; best = c.id; }
  }
  return best;
}

// At most two gaps between who you'd choose to be and your usual fortnight.
export function gaps(anchors: AnchorAnswers, dilemmas: DilemmaAnswers, mirror?: number): string[] {
  const lv = (id: string) => {
    const a = ANCHORS.find((x) => x.id === id)!, i = anchors[id];
    return i === undefined ? null : a.options[i].level;
  };
  const soft = mirror === 2; // "no, and I don't know why": the gentlest wording
  const lead = soft ? "Gently: " : "";
  const out: string[] = [];
  const finish = lv("finish"), fresh = lv("new"), move = lv("move");
  const evening = anchors.evening;
  if (dilemmas[1] === 1 && finish !== null && finish <= 1) out.push(`${lead}you'd choose a mind that never stops learning, and it's been a while since you finished a book, a course or a project.`);
  if (dilemmas[1] === 0 && move !== null && move <= 1) out.push(`${lead}you'd choose a body that never tires, and your usual fortnight has little time for moving.`);
  if (dilemmas[6] === 0 && finish !== null && finish <= 1) out.push(`${lead}you'd accept the Cailleach's discipline, and things you start often stay unfinished.`);
  if (dilemmas[2] === 0 && fresh !== null && fresh <= 1) out.push(`${lead}you'd step through the door to Tír na nÓg, and it's been a long time since you did something for the first time.`);
  if (dilemmas[7] === 2 && evening === 0) out.push(`${lead}you guard your peace most fiercely, and your evenings mostly go to a screen.`);
  if (dilemmas[4] === 0 && finish !== null && finish <= 1) out.push(`${lead}you'd want to be remembered for something you made, and your making has slowed.`);
  return out.slice(0, 2);
}

// ---------- folklore prompt decks ----------
export interface Prompt {
  id: string;
  tale: string;
  q: string;
}

export const PROMPTS: Record<string, Prompt[]> = {
  athlete: [
    { id: "ath-twig", tale: "The Fianna ran through forests without cracking a twig.", q: "What did you do today with care, not force?" },
    { id: "ath-cu", tale: "Cú Chulainn took his name by keeping a hound's place until a new one was raised.", q: "What did you keep going today because someone needed you to?" },
    { id: "ath-salmon", tale: "Cú Chulainn's salmon leap was learned from Scáthach, who trained heroes on the Isle of Skye.", q: "Who taught you something your body still remembers?" },
  ],
  scholar: [
    { id: "sch-thumb", tale: "Fionn burned his thumb on the Salmon of Knowledge, and all its wisdom passed to him.", q: "What small mistake taught you something today?" },
    { id: "sch-well", tale: "Nine hazels dropped their nuts into Connla's Well, and the salmon who ate them grew wise.", q: "What fed your mind today, a little at a time?" },
    { id: "sch-ogham", tale: "Ogma made the ogham alphabet so that words could be cut into stone and outlast their speakers.", q: "What did you learn today that's worth keeping?" },
  ],
  storyteller: [
    { id: "sto-amergin", tale: "Amergin sang the land of Ireland into being as he stepped ashore.", q: "Name today in one line." },
    { id: "sto-fili", tale: "A fili trained for twelve years and knew hundreds of tales by heart.", q: "What story did you tell, or hear, today?" },
    { id: "sto-satire", tale: "A poet's satire could raise blisters on a king's face; their praise could make him.", q: "Whose words stayed with you today?" },
  ],
  founder: [
    { id: "fou-strokes", tale: "Goibniu the smith forged a spear in three strokes.", q: "What took fewer strokes than you feared?" },
    { id: "fou-lugh", tale: "Lugh was let into Tara because he held every art at once.", q: "Which of your skills did today need?" },
    { id: "fou-dian", tale: "Dian Cécht made King Nuada a silver hand, and it worked as well as the one he'd lost.", q: "What did you mend or rebuild today?" },
  ],
  wanderer: [
    { id: "wan-bran", tale: "Bran sailed west to islands where the sea was a flowering plain.", q: "What did you see for the first time today?" },
    { id: "wan-roads", tale: "The old roads of Ireland, the slighe, ran out from Tara in five directions.", q: "Where would you go tomorrow if nothing held you?" },
    { id: "wan-hy", tale: "Hy-Brasil appears off the west coast once every seven years, then sinks into mist.", q: "What place do you keep meaning to visit?" },
  ],
  curator: [
    { id: "cur-treasures", tale: "The Tuatha Dé Danann carried four treasures into Ireland: a stone, a spear, a sword and a cauldron.", q: "What one thing you own would you carry into the Otherworld?" },
    { id: "cur-cauldron", tale: "The Dagda's cauldron sent no one away hungry.", q: "What did something you own give you today?" },
    { id: "cur-branch", tale: "The silver branch rang with music that made people forget their sorrows.", q: "What beautiful thing caught you today?" },
  ],
  homesteader: [
    { id: "hom-brigid", tale: "Brigid's fire at Kildare was never let go out, kept by nineteen nuns and, on the twentieth night, by Brigid herself.", q: "What kept your fire going today?" },
    { id: "hom-smoor", tale: "Every night the hearth was smoored: the embers banked under ash, with a blessing, to wake in the morning.", q: "What are you banking for tomorrow?" },
    { id: "hom-cross", tale: "A Brigid's cross is woven from rushes on her feast day and hung to keep the house safe.", q: "What did you make with your own hands to keep home good?" },
  ],
};

// A prompt is offered two or three times a week, never repeats within two weeks, and a repeat
// comes back with your last answer.
export function promptForDay(calling: string, dayIndex: number, history: { id: string; day: number; answer?: string }[]): { prompt: Prompt; last?: string } | null {
  const deck = PROMPTS[calling];
  if (!deck || dayIndex % 3 !== 2) return null;
  const recent = new Set(history.filter((h) => dayIndex - h.day < 14).map((h) => h.id));
  const pool = deck.filter((p) => !recent.has(p.id));
  if (!pool.length) return null;
  const prompt = pool[Math.floor(dayIndex / 3) % pool.length];
  const prev = [...history].reverse().find((h) => h.id === prompt.id && h.answer);
  return { prompt, last: prev?.answer };
}
