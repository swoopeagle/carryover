import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Store } from "../src/store.ts";
import { handleEvent } from "../src/daemon.ts";
import { parseEventLine } from "../src/bee.ts";
import { buildReport } from "../src/report.ts";

function fixtureStore(): Store {
  const s = new Store(":memory:");
  for (const line of readFileSync("fixtures/spike-stream.log", "utf8").split("\n")) {
    const ev = parseEventLine(line);
    if (ev && ev !== "handshake") handleEvent(s, ev);
  }
  return s;
}

test("win log from the real capture", () => {
  const r = buildReport(fixtureStore(), { tzOffsetMin: -420, now: new Date("2026-09-13T00:00:00Z") });
  assert.equal(r.days.length, 1);
  assert.equal(r.days[0].day, "2026-09-12");
  assert.equal(r.days[0].conversations, 5);
  assert.equal(r.days[0].utterances, 8);
  assert.equal(r.totals.words, 81);
  assert.ok(r.days[0].spokenSec > 30 && r.days[0].spokenSec < 50);
  assert.ok((r.days[0].medianWps ?? 0) > 1.5 && (r.days[0].medianWps ?? 0) < 2.5);
});

test("context map buckets by place and time slot; fixture is one afternoon at an unknown place", () => {
  const r = buildReport(fixtureStore(), { tzOffsetMin: -420 });
  assert.equal(r.contexts.length, 1);
  assert.equal(r.contexts[0].slot, "afternoon");
  assert.equal(r.contexts[0].place, "unknown place");
  assert.equal(r.contexts[0].conversations, 5);
});

test("signals per 100 words needs enough words to mean anything", () => {
  const s = new Store(":memory:");
  s.addUtterance("a", { id: 1, text: "the the cat", spoken_at: "2026-10-20T19:00:00Z", start: 0, end: 2 });
  const r = buildReport(s);
  assert.equal(r.days[0].signalsPer100, null);
});

test("a room that went quiet is flagged; one with no history is not", () => {
  const s = new Store(":memory:");
  const now = new Date("2026-10-20T20:00:00Z");
  let nextId = 1;
  const conv = (uuid: string, daysAgo: number, words: number) => {
    const at = new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
    s.upsertConversation({ id: 1, conversation_uuid: uuid, start_time: at, end_time: null, state: "COMPLETED", business: "Office" });
    s.addUtterance(uuid, { id: nextId++, text: Array(words).fill("word").join(" "), spoken_at: at, start: 0, end: words / 2 });
  };
  // Baseline: four chatty days a few weeks ago. Recent: two near-silent ones.
  for (const [i, d] of [20, 18, 15, 12].entries()) conv(`b${i}`, d, 200);
  conv("r0", 2, 40);
  conv("r1", 1, 30);
  const r = buildReport(s, { tzOffsetMin: -420, now });
  assert.equal(r.quietRooms.length, 1);
  assert.equal(r.quietRooms[0].place, "Office");
  assert.equal(r.quietRooms[0].baseline, 200);
  assert.equal(r.quietRooms[0].recent, 35);
});
