import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Store } from "../src/store.ts";
import { handleEvent } from "../src/daemon.ts";
import { parseEventLine } from "../src/bee.ts";

const conv = (uuid: string, state: string) => ({
  id: 1,
  conversation_uuid: uuid,
  start_time: "2026-10-20T19:00:00Z",
  end_time: null,
  state,
});
const utt = (id: number) => ({ id, text: "the the cat sat", spoken_at: "2026-10-20T19:00:05Z", start: 1, end: 3 });

test("Bee's own short-conversation cleanup is survived", () => {
  const s = new Store(":memory:");
  s.upsertConversation(conv("a", "CAPTURING"));
  s.addUtterance("a", utt(1));
  assert.equal(s.onConversationDeleted(conv("a", "PROCESSING")), "kept");
  assert.deepEqual(s.counts(), { conversations: 1, utterances: 1 });
});

test("a wearer deleting a finished conversation is honoured", () => {
  const s = new Store(":memory:");
  s.upsertConversation(conv("b", "COMPLETED"));
  s.addUtterance("b", utt(2));
  assert.equal(s.onConversationDeleted(conv("b", "COMPLETED")), "forgotten");
  assert.deepEqual(s.counts(), { conversations: 0, utterances: 0 });
});

test("an utterance arriving before its conversation still lands", () => {
  const s = new Store(":memory:");
  s.addUtterance("late", utt(3));
  assert.deepEqual(s.counts(), { conversations: 1, utterances: 1 });
});

test("later events don't erase context we already have", () => {
  const s = new Store(":memory:");
  s.upsertConversation({ ...conv("c", "CAPTURING"), city: "San Francisco", business: "Blue Bottle" });
  s.upsertConversation({ ...conv("c", "PROCESSING"), city: null, business: null });
  const row = s.db.prepare("SELECT city, business, state FROM conversations WHERE uuid = 'c'").get();
  assert.deepEqual({ ...row }, { city: "San Francisco", business: "Blue Bottle", state: "PROCESSING" });
});

test("the real captured log replays into the expected store", () => {
  const s = new Store(":memory:");
  for (const line of readFileSync("fixtures/spike-stream.log", "utf8").split("\n")) {
    const ev = parseEventLine(line);
    if (ev && ev !== "handshake") handleEvent(s, ev);
  }
  // Five conversations, all deleted by Bee mid-processing, all kept.
  assert.deepEqual(s.counts(), { conversations: 5, utterances: 8 });
  const repeats = s.db.prepare("SELECT SUM(repeats) AS n FROM utterances").get() as { n: number };
  assert.equal(repeats.n, 1);
});
