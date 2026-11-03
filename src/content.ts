// Content as data: places, actions, callings and looks live here, not in the engine.
// A new lore land or room is a data change, never new code.

export type Ember = "B" | "O" | "N" | "F" | "I" | "R" | "E";
export const EMBERS: { key: Ember; name: string; stands: string }[] = [
  { key: "B", name: "Body", stands: "Strength and movement" },
  { key: "O", name: "Observation", stands: "The eye and the hand" },
  { key: "N", name: "Nurture", stands: "Caring for yourself and others" },
  { key: "F", name: "Fellowship", stands: "Connection and voice" },
  { key: "I", name: "Insight", stands: "Learning" },
  { key: "R", name: "Resolve", stands: "Getting things done" },
  { key: "E", name: "Exploration", stands: "Curiosity and new things" },
];

export type LogType = "growth" | "experience";

export interface Action {
  id: string;
  name: string;
  building: BuildingId;
  room: string;
  type: LogType;
  xp: number;
  ember: Ember;
  words?: string[]; // extra words quick-log matches on
  private?: boolean;
}

export type BuildingId =
  | "bothy" | "stone-field" | "ogham-tower" | "forge" | "craft-hall" | "bards-lane"
  | "wildwood" | "feasting-halls" | "market-square" | "healing-well" | "raven-post" | "old-roads";

export interface Building {
  id: BuildingId;
  name: string;
  blurb: string;
  embers: Ember[];
}

// The default opening order. Intake ranking (a first-week task, later) reorders everything after the Bothy.
export const BUILDINGS: Building[] = [
  { id: "bothy", name: "Your Bothy", blurb: "Home: the hearth desk, the Cauldron, the Dreaming Loft, and the Tobar and familiars' pen in the yard.", embers: ["N", "F"] },
  { id: "stone-field", name: "The Stone Field", blurb: "Training, the Sweat House, and the trailheads to the Old Roads.", embers: ["B"] },
  { id: "ogham-tower", name: "The Ogham Tower", blurb: "A floor per subject, the Hedge Library and the Whispering Well.", embers: ["I"] },
  { id: "forge", name: "The Forge", blurb: "Projects, the Guild room and repairs.", embers: ["R"] },
  { id: "craft-hall", name: "The Craft Hall", blurb: "The illuminator's desk, the Kiln, the Camera Obscura and the Builder's Bench.", embers: ["O", "R"] },
  { id: "bards-lane", name: "Bards' Lane", blurb: "Poems as lamp posts, the Song Cellar and the Shadow Theatre.", embers: ["F", "O"] },
  { id: "wildwood", name: "The Wildwood", blurb: "The Glasshouse, the Wort Garden and the lake.", embers: ["O", "B"] },
  { id: "feasting-halls", name: "The Feasting Halls", blurb: "Restaurants, Fidchell Hall and the Moot Hall.", embers: ["F", "E"] },
  { id: "market-square", name: "The Market Square", blurb: "The Weaver, the Peddler's Market and the Barter Stall.", embers: ["E"] },
  { id: "healing-well", name: "The Healing Well", blurb: "Therapy, the Apothecary, the Moon Garden and the Stone Circle. Every room is safe and private.", embers: ["N"] },
  { id: "raven-post", name: "The Raven Post", blurb: "Letters and admin, the Steward's desk and the Treasury.", embers: ["R"] },
];

// Buildings 2 to 11 open at these levels (the opening schedule in the framework).
export const OPEN_LEVELS = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

const A = (id: string, name: string, building: BuildingId, room: string, type: LogType, xp: number, ember: Ember, words: string[] = [], priv = false): Action =>
  ({ id, name, building, room, type, xp, ember, words, private: priv || undefined });

// The log table. XP values follow the framework: journal 15, cooked meal 20, lesson 20 to 40,
// gym 25, poem 30, finished book 100. Experience logs are worth about 20% of a growth log.
export const ACTIONS: Action[] = [
  A("journal", "Evening journal", "bothy", "the hearth desk", "growth", 15, "N", ["journal", "diary"]),
  A("cook", "Cooked a meal", "bothy", "the Cauldron", "growth", 20, "N", ["cook", "dinner", "lunch", "breakfast", "meal", "bake"]),
  A("new-recipe", "Tried a new recipe", "bothy", "the Cauldron", "growth", 25, "E", ["recipe", "new dish"]),
  A("family-meal", "Family meal at the long table", "bothy", "the Cauldron", "growth", 20, "F", ["family", "dinner together"]),
  A("sleep", "Slept to my target", "bothy", "the Dreaming Loft", "growth", 15, "N", ["sleep", "bed", "early night"]),
  A("water", "Reached my water target", "bothy", "the Tobar", "growth", 15, "N", ["water", "hydrate", "drink water"]),
  A("kids", "Time with the kids", "bothy", "the Hollow Oak", "growth", 20, "N", ["kids", "daughter", "son", "child", "play", "park"]),
  A("pet-walk", "Walked or played with a pet", "bothy", "the familiars' pen", "growth", 15, "N", ["dog", "pet", "walk the dog"]),
  A("pet-care", "Pet care or a vet day", "bothy", "the familiars' pen", "growth", 10, "N", ["vet", "feed", "groom"]),
  A("thought", "Wrote down a thought", "bothy", "the window seat", "growth", 5, "I", ["thought", "idea"]),
  A("notes", "Wrote notes", "bothy", "the Scriptorium nook", "growth", 10, "I", ["notes", "write"]),
  A("tidy", "Tidied or cleaned", "bothy", "the hearth", "growth", 10, "R", ["clean", "tidy", "laundry", "dishes", "chores"]),

  A("gym", "Training session", "stone-field", "Training", "growth", 25, "B", ["gym", "workout", "lift", "weights", "train"]),
  A("run", "Run", "stone-field", "Training", "growth", 25, "B", ["run", "ran", "jog"]),
  A("walk", "Walk", "stone-field", "the trailheads", "growth", 15, "B", ["walk", "stroll"]),
  A("hike", "Hike", "stone-field", "the trailheads", "growth", 30, "B", ["hike", "trail"]),
  A("ride", "Bike ride", "stone-field", "the trailheads", "growth", 25, "B", ["bike", "cycle", "ride"]),
  A("stretch", "Yoga or stretching", "stone-field", "Training", "growth", 15, "B", ["yoga", "stretch", "mobility"]),
  A("sauna", "Sauna or cold plunge", "stone-field", "the Sweat House", "growth", 15, "B", ["sauna", "plunge", "cold"]),

  A("read", "Read a chapter", "ogham-tower", "the Hedge Library", "growth", 15, "I", ["read", "chapter", "book"]),
  A("finish-book", "Finished a book", "ogham-tower", "the Hedge Library", "growth", 100, "I", ["finished", "book"]),
  A("lesson", "Academy lesson", "ogham-tower", "a subject floor", "growth", 30, "I", ["lesson", "study", "course", "learn"]),
  A("podcast", "Podcast episode", "ogham-tower", "the Whispering Well", "experience", 5, "I", ["podcast", "episode"]),

  A("task", "Project task done", "forge", "Projects", "growth", 15, "R", ["task", "project", "todo"]),
  A("ship", "Shipped a project", "forge", "Projects", "growth", 150, "R", ["ship", "launch", "finish project"]),
  A("deep-work", "Deep-work block", "forge", "the Guild room", "growth", 20, "R", ["work", "deep work", "focus"]),
  A("repair", "Repaired something", "forge", "Repairs", "growth", 20, "R", ["fix", "repair", "mend"]),

  A("art", "Drew or painted", "craft-hall", "the illuminator's desk", "growth", 25, "O", ["draw", "paint", "sketch", "art"]),
  A("photo", "Photography session", "craft-hall", "the Camera Obscura", "growth", 20, "O", ["photo", "camera", "shoot"]),
  A("pottery", "Pottery session", "craft-hall", "the Kiln", "growth", 25, "O", ["pottery", "clay", "throw", "glaze"]),
  A("lego", "Lego build session", "craft-hall", "the Builder's Bench", "growth", 15, "R", ["lego", "build"]),

  A("poem", "Wrote a poem", "bards-lane", "the lamp posts", "growth", 30, "F", ["poem", "poetry", "verse"]),
  A("playlist", "Made a playlist for someone", "bards-lane", "the Song Cellar", "growth", 20, "F", ["playlist", "mix"]),
  A("music", "Played music", "bards-lane", "the Song Cellar", "growth", 20, "O", ["guitar", "piano", "sing", "music", "practice"]),
  A("album", "Listened to an album", "bards-lane", "the Song Cellar", "experience", 4, "O", ["album", "record", "vinyl"]),
  A("film", "Watched a film", "bards-lane", "the Shadow Theatre", "experience", 5, "O", ["film", "movie", "cinema"]),

  A("nature", "Nature find", "wildwood", "the Glasshouse", "growth", 10, "O", ["nature", "bird", "plant", "flower"]),
  A("garden", "Gardening", "wildwood", "the Wort Garden", "growth", 20, "N", ["garden", "plant", "grow"]),

  A("friends", "Time with friends", "feasting-halls", "the long tables", "growth", 20, "F", ["friends", "friend", "hang out", "visit"]),
  A("eat-out", "Ate out", "feasting-halls", "Restaurants", "experience", 5, "E", ["restaurant", "eat out", "cafe", "brunch"]),
  A("volunteer", "Volunteered", "feasting-halls", "the Moot Hall", "growth", 30, "F", ["volunteer", "community"]),
  A("games", "Played games", "feasting-halls", "Fidchell Hall", "experience", 4, "E", ["game", "games", "arcade", "board game"]),

  A("meditate", "Meditation or breathwork", "healing-well", "the Moon Garden", "growth", 15, "N", ["meditate", "breathe", "breathwork"]),
  A("therapy", "Therapy session", "healing-well", "Therapy", "growth", 25, "N", ["therapy", "counselling"], true),
  A("appointment", "Health appointment", "healing-well", "the Apothecary", "growth", 15, "N", ["doctor", "dentist", "appointment", "checkup"], true),

  A("admin", "Life admin", "raven-post", "the Steward's desk", "growth", 15, "R", ["admin", "errand", "email", "bills", "paperwork"]),
  A("budget", "Budget check-in", "raven-post", "the Treasury", "growth", 15, "R", ["budget", "money", "finances"]),

  A("somewhere-new", "Went somewhere new", "old-roads", "the Old Roads", "growth", 20, "E", ["new", "explore", "trip", "visit"]),
];

export const ACTION_BY_ID: Record<string, Action> = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

// Looks. Hoods are muted folk dyes from Irish wool-craft: mid-tones that stand out on grey ink
// and never compete with the red. There is no red hood.
export type Unlock = "start" | "calling" | "ember" | "milestone" | "samhain";
// What earns an item: an ember tier (points earned by logging: 3, 6, 9) or a level.
export type Need = { ember?: Ember; tier?: number; level?: number };
export const HOODS: { id: string; name: string; hood: string; trim?: string; note: string; unlock: Unlock; need?: Need }[] = [
  { id: "ink", name: "Ink", hood: "#26231f", note: "bog-oak black", unlock: "start" },
  { id: "oatmeal", name: "Oatmeal", hood: "#cdbfa3", trim: "#6f6656", note: "undyed wool", unlock: "start" },
  { id: "peat", name: "Peat", hood: "#6a5444", trim: "#d9c9a8", note: "turf-smoke brown", unlock: "start" },
  { id: "woad", name: "Woad", hood: "#4c6680", trim: "#e6dcc4", note: "the old blue", unlock: "start" },
  { id: "bracken", name: "Bracken", hood: "#6f7a4c", trim: "#e6dcc4", note: "autumn fern green", unlock: "start" },
  { id: "weld", name: "Weld", hood: "#c29a3e", trim: "#3d3529", note: "yellow-weed gold", unlock: "ember", need: { ember: "R", tier: 1 } },
  { id: "crotal", name: "Crotal", hood: "#9a5f3a", trim: "#e6dcc4", note: "lichen rust", unlock: "ember", need: { ember: "B", tier: 1 } },
  { id: "heather", name: "Heather", hood: "#76607e", trim: "#e2cf8c", note: "hillside purple", unlock: "ember", need: { ember: "E", tier: 1 } },
  { id: "sloe", name: "Sloe", hood: "#4e3a4b", trim: "#c9b8cf", note: "blackthorn plum", unlock: "ember", need: { ember: "N", tier: 1 } },
  { id: "seaholly", name: "Sea-holly", hood: "#7f9696", trim: "#2f3a3a", note: "grey-blue shore", unlock: "ember", need: { ember: "O", tier: 1 } },
  { id: "moss", name: "Moss", hood: "#55684f", trim: "#d6b26a", note: "bog moss", unlock: "milestone", need: { level: 5 } },
  { id: "samhain", name: "Samhain", hood: "#2f2b29", trim: "#c97b3d", note: "guising soot and ember", unlock: "samhain" },
];
export const SATCHELS = [
  { id: "satchel", name: "Satchel", color: "#8c5a3c" },
  { id: "sack", name: "Herb sack", color: "#a89a7c" },
  { id: "books", name: "Book bag", color: "#5a3f33" },
  { id: "basket", name: "Basket", color: "#b08a52" },
];
// Staves, mostly named for the trees of the Ogham alphabet.
export const STAVES: { id: string; name: string; ogham?: string; meaning: string; wood: string; unlock: Unlock; need?: Need }[] = [
  { id: "rowan", name: "Rowan", ogham: "Luis", meaning: "protection from enchantment", wood: "#a58463", unlock: "start" },
  { id: "hazel", name: "Hazel", ogham: "Coll", meaning: "wisdom", wood: "#b39674", unlock: "start" },
  { id: "ash", name: "Ash", ogham: "Nion", meaning: "journeys and the world-tree", wood: "#e2d8c4", unlock: "start" },
  { id: "blackthorn", name: "Blackthorn", ogham: "Straif", meaning: "strength", wood: "#4a3c33", unlock: "start" },
  { id: "willow", name: "Willow", ogham: "Saille", meaning: "poetry, dreams and the moon", wood: "#c3b08e", unlock: "start" },
  { id: "drift", name: "Driftwood", meaning: "what the sea gave back", wood: "#cfc9bd", unlock: "start" },
  { id: "crook", name: "Shepherd's crook", meaning: "tending", wood: "#a07e5c", unlock: "calling" },
  { id: "lantern", name: "Lantern staff", meaning: "seeing", wood: "#8c6a48", unlock: "calling" },
  { id: "oak", name: "Oak", ogham: "Duir", meaning: "the door; steadfastness", wood: "#8a6a4c", unlock: "ember", need: { ember: "B", tier: 2 } },
  { id: "holly", name: "Holly", ogham: "Tinne", meaning: "winter's guard", wood: "#d8cfbd", unlock: "ember", need: { ember: "F", tier: 2 } },
  { id: "ogham", name: "Ogham-carved", meaning: "letters cut in the wood", wood: "#9c7c5a", unlock: "ember", need: { ember: "I", tier: 2 } },
  { id: "bogoak", name: "Bog oak", meaning: "five thousand years in the peat", wood: "#2f2a26", unlock: "milestone", need: { level: 10 } },
  { id: "yew", name: "Yew", ogham: "Iodhadh", meaning: "the long life", wood: "#6b3f33", unlock: "samhain" },
];
export const GLOWS: Record<string, string> = {
  amber: "#f2b84b", ember: "#e8794a", moss: "#9fc27a", sea: "#7fc3c7", lilac: "#b9a3e0", rose: "#ec9cb4", pale: "#f1e7c8",
};

export interface Calling {
  id: string;
  name: string;
  classic: string;
  main: Ember;
  second: Ember;
  staff: string;
  satchel: string;
  charm: string;
  charmText: string;
  motto: string;
}

export const CALLINGS: Calling[] = [
  { id: "athlete", name: "The Athlete", classic: "Warrior", main: "B", second: "N", staff: "blackthorn", satchel: "satchel", charm: "Second Wind", charmText: "One missed day a week doesn't break a streak.", motto: "The body keeps the fire lit." },
  { id: "scholar", name: "The Scholar", classic: "Mage", main: "I", second: "O", staff: "hazel", satchel: "books", charm: "Bookworm", charmText: "Finished books and lessons fade the Each-uisce and the Changeling twice as fast.", motto: "Every page is a step through the veil." },
  { id: "storyteller", name: "The Storyteller", classic: "Bard", main: "F", second: "O", staff: "willow", satchel: "satchel", charm: "Wordsmith", charmText: "Each poem lights a new lamp post on Bards' Lane.", motto: "A story told is a fire shared." },
  { id: "founder", name: "The Founder", classic: "Warlock", main: "R", second: "I", staff: "ash", satchel: "satchel", charm: "Quick Fix", charmText: "Tasks under 15 minutes count as full hits on the Púca.", motto: "A pact with deadlines, kept." },
  { id: "wanderer", name: "The Wanderer", classic: "Ranger", main: "E", second: "B", staff: "rowan", satchel: "satchel", charm: "Wanderer", charmText: "A first visit anywhere drops a hood trim or a minor relic.", motto: "The Old Roads are wider than they look." },
  { id: "curator", name: "The Curator", classic: "Rogue", main: "O", second: "E", staff: "lantern", satchel: "basket", charm: "Keen Eye", charmText: "Item cards show one extra stat, and each collection stage needs one fewer item.", motto: "Keep only what you love." },
  { id: "homesteader", name: "The Homesteader", classic: "Druid", main: "N", second: "O", staff: "crook", satchel: "sack", charm: "Steady Hands", charmText: "A streak shield every 7 days of showing up.", motto: "Tend the hearth and the hearth tends you." },
];
export const CALLING_BY_ID: Record<string, Calling> = Object.fromEntries(CALLINGS.map((c) => [c.id, c]));

export const FEELINGS = ["Heavy", "Low", "Even", "Bright", "Glowing"];

export const BLOCKERS = [
  { id: "puca", name: "Putting things off", monster: "The Púca" },
  { id: "each-uisce", name: "Scrolling", monster: "The Each-uisce" },
  { id: "sluagh", name: "Too much at once", monster: "The Sluagh" },
  { id: "leannan-si", name: "Waiting for perfect", monster: "The Leannán Sí" },
  { id: "cailleach", name: "No energy to move", monster: "The Cailleach" },
  { id: "fear-dearg", name: "Routine slipped", monster: "The Fear Dearg" },
  { id: "changeling", name: "Feeling like a fraud", monster: "The Changeling" },
];

// ---------- relics: the perks ----------
// At each ember tier (3, 6 and 9 points earned by logging) you choose one of two relics: steady or deep.
// No relic ever changes how much XP a log is worth. Effects belong to four families: Shield, Sight, Strike, Ease.
// "yesterday" relics let some logs be added for the day before; "wisp" shows the next place through the fog.
// Effects marked waits come alive when monsters and runs arrive.
export type Family = "Shield" | "Sight" | "Strike" | "Ease";
export interface Relic {
  id: string; ember: Ember; tier: 1 | 2 | 3; side: "steady" | "deep";
  name: string; lore: string; family: Family; effect: string;
  live?: { yesterday?: { buildings?: BuildingId[]; actions?: string[]; withSomeone?: boolean; days?: number }; wisp?: boolean };
}
const R = (id: string, ember: Ember, tier: 1 | 2 | 3, side: "steady" | "deep", name: string, lore: string, family: Family, effect: string, live?: Relic["live"]): Relic => ({ id, ember, tier, side, name, lore, family, effect, live });
export const RELICS: Relic[] = [
  R("bracers", "B", 1, "steady", "Leather bracers", "Worn by those who come back to the work.", "Shield", "One missed day a week doesn't break a habit's run."),
  R("hobnails", "B", 1, "deep", "Hobnail boots", "For the long road and the bad weather on it.", "Strike", "Monsters met on walks and hikes fade twice as fast."),
  R("hurley", "B", 2, "steady", "Hurley", "Cúchulainn drove a ball with one before he was a man.", "Ease", "Anything at the Stone Field can be added for yesterday.", { yesterday: { buildings: ["stone-field"] } }),
  R("sweathouse", "B", 2, "deep", "Sweat-house stone", "From the little stone houses where the old people sweated out a sickness.", "Shield", "A rest day after three hard days never counts as a missed one."),
  R("torc", "B", 3, "steady", "Gold torc", "The neck-ring of the strong, worn for life.", "Shield", "Two missed days a week don't break a run."),
  R("horn", "B", 3, "deep", "Fionn's hunting horn", "Its call brought the Fianna from every corner of Ireland.", "Strike", "Every Body log hits whatever monster is out, not only its own."),
  R("hagstone", "O", 1, "steady", "Hag stone", "A stone with a hole worn through. Look through it to see the other world.", "Sight", "See a monster coming the day before it arrives."),
  R("wisp", "O", 1, "deep", "Wisp lantern", "A light that leads you off the path, toward something worth finding.", "Sight", "The next place in the fog shows its name, and a wisp lights the way.", { wisp: true }),
  R("quill", "O", 2, "steady", "Quill and inkpot", "Oak-gall ink keeps for a thousand years.", "Ease", "Anything at the Craft Hall can be added for yesterday.", { yesterday: { buildings: ["craft-hall"] } }),
  R("seerglass", "O", 2, "deep", "Seer's glass", "A bead of rock crystal for reading what's coming.", "Sight", "The Field Book names one pattern a week, unasked."),
  R("raven", "O", 3, "steady", "Raven familiar", "The Morrígan's bird, who sees the field before the fight.", "Sight", "The raven warns you a day before a rhythm lapses."),
  R("harefam", "O", 3, "deep", "Hare familiar", "The shape-shifter, never quite where you left it.", "Strike", "A first time anywhere drives off one monster."),
  R("herbpouch", "N", 1, "steady", "Herb pouch", "Meadowsweet, yarrow and a sprig of rowan.", "Ease", "Well and Cauldron logs can be added for yesterday.", { yesterday: { actions: ["water", "cook", "new-recipe", "family-meal", "sleep"] } }),
  R("mortar", "N", 1, "deep", "Mortar and pestle", "For remedies, ground slowly.", "Strike", "A gentle day calms every monster for 24 hours."),
  R("potionbelt", "N", 2, "steady", "Potion belt", "Small bottles for long days.", "Ease", "Once a week, your day can end an hour later."),
  R("kettle", "N", 2, "deep", "Copper kettle", "Always on, for whoever comes in.", "Shield", "A day you only rested still keeps every habit's run."),
  R("brigid", "N", 3, "steady", "Brigid's cross", "Woven from rushes on her day and hung for the year.", "Shield", "Once a season, a lost run is restored."),
  R("hearthstone", "N", 3, "deep", "Hearth stone", "The stone the fire was never let go out on.", "Strike", "Family meals and time with the kids fade any monster by half."),
  R("ribbon", "F", 1, "steady", "Bard's ribbon", "Tied on by someone who wanted to be remembered.", "Sight", "The Hollow marks a friend you haven't seen in a month."),
  R("mether", "F", 1, "deep", "Mether", "The four-handled guest cup, passed around the table.", "Strike", "Anything done with someone hits a monster twice."),
  R("harp", "F", 2, "steady", "Small harp", "The Dagda's harp played the seasons into order.", "Ease", "Anything done with someone can be added for yesterday.", { yesterday: { withSomeone: true } }),
  R("brooch", "F", 2, "deep", "Cloak brooch", "A gift that fastens one person to another.", "Shield", "A week with a gathering in it keeps all your runs."),
  R("silverbranch", "F", 3, "steady", "Silver branch", "Its bells play the music of the Otherworld.", "Sight", "You hear when a Fellowship rhythm is about to lapse."),
  R("claddagh", "F", 3, "deep", "Claddagh ring", "Hands for friendship, a heart for love, a crown for loyalty.", "Strike", "The Gancanagh and the Leannán Sí flee from shared evenings."),
  R("scrollcase", "I", 1, "steady", "Scroll case", "Leather, worn soft at the clasp.", "Ease", "Notes and thoughts can be added for yesterday.", { yesterday: { actions: ["notes", "thought", "read", "lesson"] } }),
  R("hazelnut", "I", 1, "deep", "Hazelnut of wisdom", "Nine hazels dropped their nuts into the Well of Segais.", "Sight", "A wisp shows which subject has gone quiet."),
  R("oghamsticks", "I", 2, "steady", "Ogham sticks", "Twenty letters, each a tree.", "Shield", "One missed lesson a week doesn't break a subject's run."),
  R("salmonscale", "I", 2, "deep", "Salmon scale", "From the salmon that ate the hazelnuts and knew everything.", "Strike", "Finished books fade the Each-uisce and the Changeling twice as fast."),
  R("moonstone", "I", 3, "steady", "Moonstone", "Cool in the hand, and brighter as the moon fills.", "Sight", "Your kept lines from a year ago come back on their nights, unasked."),
  R("cranebag", "I", 3, "deep", "Crane-skin bag", "Manannán's bag, full only at high tide.", "Ease", "Anything you finish can be added up to three days late.", { yesterday: { actions: ["finish-book", "ship", "lesson"], days: 3 } }),
  R("flask", "R", 1, "steady", "Alchemist's flask", "For the work that runs past midnight.", "Ease", "Tasks done after midnight count for the day before, until dawn."),
  R("whetstone", "R", 1, "deep", "Whetstone", "A sharp edge does the job in half the strokes.", "Strike", "Tasks under fifteen minutes count as full hits on the Púca."),
  R("hourglass", "R", 2, "steady", "Hourglass", "Turned once, it gives you the time you need.", "Shield", "A project's run survives one empty week."),
  R("bellows", "R", 2, "deep", "Forge bellows", "Breath for a fire that's nearly out.", "Strike", "Shipping something drives off any monster at the Forge."),
  R("hammer", "R", 3, "steady", "Smith's hammer", "Goibniu's hammer never needed a fourth blow.", "Shield", "Once a season, a missed week of work is forgiven."),
  R("anvil", "R", 3, "deep", "Anvil charm", "A little iron anvil, for luck at the work.", "Sight", "See which project has gone cold before the Púca does."),
  R("lodestone", "E", 1, "steady", "Lodestone", "It always knows where north is.", "Sight", "Your map marks every place you haven't been in a month."),
  R("compass", "E", 1, "deep", "Compass rose", "Thirty-two winds, and a way through each.", "Strike", "A first visit anywhere fades every monster a little."),
  R("waymarker", "E", 2, "steady", "Waymarker stone", "Left on the old roads so the next one finds the way.", "Ease", "Walks, hikes and trips can be added for yesterday.", { yesterday: { actions: ["walk", "hike", "ride", "nature", "somewhere-new"] } }),
  R("oar", "E", 2, "deep", "Curragh oar", "From the hide boats that went west to find islands.", "Sight", "The Old Roads show one new place to try each week."),
  R("starmap", "E", 3, "steady", "Star map", "The way home, in any weather.", "Shield", "A trip away keeps every run while you're gone."),
  R("mistcloak", "E", 3, "deep", "Mist cloak", "Manannán's mist, that hid a whole island.", "Strike", "Monsters lose your trail while you're away from home."),
];
export const RELIC_BY_ID: Record<string, Relic> = Object.fromEntries(RELICS.map((r) => [r.id, r]));
export const relicsAt = (ember: Ember, tier: number) => RELICS.filter((r) => r.ember === ember && r.tier === tier);
