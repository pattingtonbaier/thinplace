import { describe, expect, test } from "bun:test";
import { awardFor, dayKey, derive, emptySave, levelFromXP, merge, searchActions, startEmbers, type Log, type Save } from "./engine";

const T0 = new Date(2026, 10, 2, 12).getTime(); // 2 Nov 2026, noon local
const H = 3600_000;
const log = (id: string, action: string, ts: number, extra: Partial<Log> = {}): Log => ({ id, action, ts, ...extra });

function withProfile(): Save {
  const s = emptySave(T0 - 10 * 24 * H);
  s.profile = { name: "Patty", pronouns: "he", calling: "scholar", look: { hood: "ink", satchel: "books", staff: "ogham", glow: "amber" }, points: {}, updated: T0 };
  return s;
}

describe("days", () => {
  test("the day ends at 4 am", () => {
    expect(dayKey(new Date(2026, 10, 2, 3, 30).getTime())).toBe("2026-11-01");
    expect(dayKey(new Date(2026, 10, 2, 4, 1).getTime())).toBe("2026-11-02");
  });
  test("a night owl can move the cutoff", () => {
    expect(dayKey(new Date(2026, 10, 2, 5).getTime(), 6)).toBe("2026-11-01");
  });
});

describe("levels", () => {
  test("level L to L+1 costs 100 x L", () => {
    expect(levelFromXP(0)).toEqual({ level: 1, into: 0, need: 100 });
    expect(levelFromXP(100).level).toBe(2);
    expect(levelFromXP(299).level).toBe(2);
    expect(levelFromXP(300).level).toBe(3);
    expect(levelFromXP(4500).level).toBe(10);
  });
});

describe("awards", () => {
  test("experience done with someone adds 40% to Fellowship", () => {
    const a = awardFor(log("x", "film", T0, { withSomeone: true }), 0);
    expect(a.xp).toBe(7);
    expect(a.byEmber).toEqual({ O: 5, F: 2 });
  });
  test("growth logs get no with-someone boost", () => {
    expect(awardFor(log("x", "gym", T0, { withSomeone: true }), 0).xp).toBe(25);
  });
  test("only the first 3 of an action count each day", () => {
    const s = withProfile();
    s.logs = [1, 2, 3, 4].map((i) => log("g" + i, "gym", T0 + i * H));
    const d = derive(s);
    expect(d.total).toBe(75);
    expect(d.awards.g4.capped).toBe(true);
  });
});

describe("embers", () => {
  test("calling adds +2 and +1, starting points cap at 6", () => {
    const s = withProfile();
    s.profile!.points = { I: 9, B: 2 };
    const e = startEmbers(s.profile);
    expect(e.I).toBe(6);
    expect(e.O).toBe(2);
    expect(e.B).toBe(3);
  });
  test("300 XP tagged to an ember earns a point", () => {
    const s = withProfile();
    s.logs = [log("b1", "finish-book", T0), log("b2", "finish-book", T0 + 25 * H), log("b3", "finish-book", T0 + 49 * H)];
    const d = derive(s);
    expect(d.emberXP.I).toBe(300);
    expect(d.emberEarned.I).toBe(1);
    expect(d.ember.I).toBe(4);
  });
});

describe("openings", () => {
  test("the Bothy is open on day one and the next building opens at level 2", () => {
    const s = withProfile();
    expect(derive(s).openings[1].ts).toBeUndefined();
    s.logs = [log("s1", "ship", T0)];
    const d = derive(s);
    expect(d.level).toBe(2);
    expect(d.openings[1]).toMatchObject({ building: "stone-field", level: 2, logId: "s1" });
  });
});

describe("rooms", () => {
  test("a room opens the first time you log there", () => {
    const s = withProfile();
    s.logs = [log("c1", "cook", T0), log("c2", "cook", T0 + H), log("w1", "water", T0 + 2 * H)];
    const d = derive(s);
    expect(d.rooms.bothy["the Cauldron"]).toBe(T0);
    expect(d.rooms.bothy["the Tobar"]).toBe(T0 + 2 * H);
    expect(d.rooms.bothy["the hearth desk"]).toBeDefined();
    expect(d.rooms.bothy["the Dreaming Loft"]).toBeUndefined();
  });
});

describe("rhythms", () => {
  const D = 24 * H;
  test("after 5 of the last 7 days, an action earns a quarter, once a day", () => {
    const s = withProfile();
    s.logs = [0, 1, 2, 3, 4, 5].map((i) => log("c" + i, "cook", T0 + i * D));
    s.logs.push(log("c5b", "cook", T0 + 5 * D + H));
    const d = derive(s);
    expect(d.awards.c4.xp).toBe(20);
    expect(d.awards.c5.rhythm).toBe(true);
    expect(d.awards.c5.xp).toBe(5);
    expect(d.awards.c5b.xp).toBe(0);
  });
  test("a whole week kept bundles in one full log", () => {
    const s = withProfile();
    s.logs = [0, 1, 2, 3, 4, 5, 6].map((i) => log("c" + i, "cook", T0 + i * D));
    const d = derive(s);
    expect(d.awards.c6.week).toBe(true);
    expect(d.awards.c6.xp).toBe(25);
  });
  test("a rhythm lapses when it's let go", () => {
    const s = withProfile();
    s.logs = [0, 1, 2, 3, 4, 5, 14].map((i) => log("c" + i, "cook", T0 + i * D));
    expect(derive(s).awards.c14.rhythm).toBeFalsy();
    expect(derive(s).awards.c14.xp).toBe(20);
  });
  test("cooking for someone this week starts cooking as a rhythm", () => {
    const s = withProfile();
    s.quiz = { anchors: { meal: 0 }, dilemmas: {}, nights: {}, updated: T0 };
    s.logs = [log("c0", "cook", s.created + H)];
    expect(derive(s).awards.c0.xp).toBe(5);
  });
});

describe("relics", () => {
  test("an ember tier is reached, dated to the log that reached it", () => {
    const s = withProfile();
    // finishing a book is 100 Insight; nine of them is 900, three points earned: tier 1
    s.logs = Array.from({ length: 9 }, (_, i) => log("b" + i, "finish-book", T0 + i * 48 * H));
    const d = derive(s);
    expect(d.emberEarned.I).toBe(3);
    expect(d.tierUps).toEqual([{ ember: "I", tier: 1, ts: T0 + 8 * 48 * H, logId: "b8" }]);
  });
  test("a relic choice syncs, and the later swap wins", () => {
    const a = withProfile(), b: Save = JSON.parse(JSON.stringify(a));
    a.relics = [{ ember: "I", tier: 1, relic: "scrollcase", chosen: T0 }];
    b.relics = [{ ember: "I", tier: 1, relic: "hazelnut", chosen: T0, swapped: T0 + H }];
    expect(merge(a, b).relics).toEqual([{ ember: "I", tier: 1, relic: "hazelnut", chosen: T0, swapped: T0 + H }]);
  });
});

describe("merge", () => {
  test("logs from two devices combine without duplicates, and deletions travel", () => {
    const a = withProfile();
    const b: Save = JSON.parse(JSON.stringify(a));
    a.logs = [log("1", "gym", T0), log("2", "read", T0 + H)];
    b.logs = [log("2", "read", T0 + H, { deleted: T0 + 2 * H }), log("3", "cook", T0 + 3 * H)];
    const m = merge(a, b);
    expect(m.logs.map((l) => l.id)).toEqual(["1", "2", "3"]);
    expect(m.logs[1].deleted).toBeTruthy();
    expect(derive(m).total).toBe(45);
  });
  test("the newer journal entry wins and the older text is kept", () => {
    const a = withProfile();
    const b: Save = JSON.parse(JSON.stringify(a));
    a.journal["2026-11-02"] = { text: "phone", updated: T0 };
    b.journal["2026-11-02"] = { text: "laptop", updated: T0 + H };
    const m = merge(a, b);
    expect(m.journal["2026-11-02"].text).toBe("laptop");
    expect(m.journal["2026-11-02"].previous?.text).toBe("phone");
  });
});

describe("quick-log search", () => {
  test("typing ran finds Run", () => {
    expect(searchActions("ran")[0].id).toBe("run");
  });
  test("typing dinner finds cooking", () => {
    expect(searchActions("dinner")[0].id).toBe("cook");
  });
});
