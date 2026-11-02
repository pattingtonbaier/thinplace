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
export const HOODS: { id: string; name: string; hood: string; trim?: string; note: string; unlock: Unlock }[] = [
  { id: "ink", name: "Ink", hood: "#26231f", note: "bog-oak black", unlock: "start" },
  { id: "oatmeal", name: "Oatmeal", hood: "#cdbfa3", trim: "#6f6656", note: "undyed wool", unlock: "start" },
  { id: "peat", name: "Peat", hood: "#6a5444", trim: "#d9c9a8", note: "turf-smoke brown", unlock: "start" },
  { id: "woad", name: "Woad", hood: "#4c6680", trim: "#e6dcc4", note: "the old blue", unlock: "start" },
  { id: "bracken", name: "Bracken", hood: "#6f7a4c", trim: "#e6dcc4", note: "autumn fern green", unlock: "start" },
  { id: "weld", name: "Weld", hood: "#c29a3e", trim: "#3d3529", note: "yellow-weed gold", unlock: "ember" },
  { id: "crotal", name: "Crotal", hood: "#9a5f3a", trim: "#e6dcc4", note: "lichen rust", unlock: "ember" },
  { id: "heather", name: "Heather", hood: "#76607e", trim: "#e2cf8c", note: "hillside purple", unlock: "ember" },
  { id: "sloe", name: "Sloe", hood: "#4e3a4b", trim: "#c9b8cf", note: "blackthorn plum", unlock: "ember" },
  { id: "seaholly", name: "Sea-holly", hood: "#7f9696", trim: "#2f3a3a", note: "grey-blue shore", unlock: "ember" },
  { id: "moss", name: "Moss", hood: "#55684f", trim: "#d6b26a", note: "bog moss", unlock: "milestone" },
  { id: "samhain", name: "Samhain", hood: "#2f2b29", trim: "#c97b3d", note: "guising soot and ember", unlock: "samhain" },
];
export const SATCHELS = [
  { id: "satchel", name: "Satchel", color: "#8c5a3c" },
  { id: "sack", name: "Herb sack", color: "#a89a7c" },
  { id: "books", name: "Book bag", color: "#5a3f33" },
  { id: "basket", name: "Basket", color: "#b08a52" },
];
// Staves, mostly named for the trees of the Ogham alphabet.
export const STAVES: { id: string; name: string; ogham?: string; meaning: string; wood: string; unlock: Unlock }[] = [
  { id: "rowan", name: "Rowan", ogham: "Luis", meaning: "protection from enchantment", wood: "#a58463", unlock: "start" },
  { id: "hazel", name: "Hazel", ogham: "Coll", meaning: "wisdom", wood: "#b39674", unlock: "start" },
  { id: "ash", name: "Ash", ogham: "Nion", meaning: "journeys and the world-tree", wood: "#e2d8c4", unlock: "start" },
  { id: "blackthorn", name: "Blackthorn", ogham: "Straif", meaning: "strength", wood: "#4a3c33", unlock: "start" },
  { id: "willow", name: "Willow", ogham: "Saille", meaning: "poetry, dreams and the moon", wood: "#c3b08e", unlock: "start" },
  { id: "drift", name: "Driftwood", meaning: "what the sea gave back", wood: "#cfc9bd", unlock: "start" },
  { id: "crook", name: "Shepherd's crook", meaning: "tending", wood: "#a07e5c", unlock: "calling" },
  { id: "lantern", name: "Lantern staff", meaning: "seeing", wood: "#8c6a48", unlock: "calling" },
  { id: "oak", name: "Oak", ogham: "Duir", meaning: "the door; steadfastness", wood: "#8a6a4c", unlock: "ember" },
  { id: "holly", name: "Holly", ogham: "Tinne", meaning: "winter's guard", wood: "#d8cfbd", unlock: "ember" },
  { id: "ogham", name: "Ogham-carved", meaning: "letters cut in the wood", wood: "#9c7c5a", unlock: "ember" },
  { id: "bogoak", name: "Bog oak", meaning: "five thousand years in the peat", wood: "#2f2a26", unlock: "milestone" },
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
