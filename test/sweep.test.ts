import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.ts";
import { extractUtterances, sweep } from "../src/sweep.ts";
import type { BeeClient } from "../src/bee.ts";

test("extracts the documented REST shape, epoch-ms spoken_at, and tolerates junk", () => {
  const u = extractUtterances({
    id: 7,
    utterances: [
      { id: 1, text: "hello there", spoken_at: 1789240449348, start: 0.5, end: 1.5, speaker: "speaker_1" },
      { id: 2, text: "", spoken_at: 1789240449348 },
      { text: "no id", spoken_at: 1789240449348 },
      { id: 3, text: "iso works too", spoken_at: "2026-09-12T19:14:09.348Z" },
    ],
  });
  assert.equal(u.length, 2);
  assert.equal(u[0].spoken_at, "2026-09-12T19:14:09.348Z");
  assert.equal(u[0].speaker, "speaker_1");
  assert.equal(extractUtterances({ id: 1 }).length, 0);
});

test("sweep fills only what the stream missed, and advances the cursor", async () => {
  const s = new Store(":memory:");
  s.upsertConversation({ id: 42, conversation_uuid: "c42", start_time: null, end_time: null, state: "COMPLETED" });
  s.addUtterance("c42", { id: 100, text: "seen live", spoken_at: "2026-10-20T19:00:00Z", start: 0, end: 1 });
  const fake = {
    changes: async (cursor?: string) => ({ conversations: [42, 99], next_cursor: `after-${cursor ?? "start"}` }),
    getConversation: async (id: number) => ({
      id,
      utterances: [
        { id: 100, text: "seen live", spoken_at: 1760986800000, start: 0, end: 1 },
        { id: 101, text: "missed while asleep", spoken_at: 1760986860000, start: 2, end: 4 },
      ],
    }),
  } as unknown as BeeClient;
  const logs: string[] = [];
  await sweep(fake, s, (m) => logs.push(m));
  assert.deepEqual(s.counts(), { conversations: 1, utterances: 2 });
  assert.equal(s.getMeta("changes_cursor"), "after-start");
  assert.match(logs[0], /1 utterances filled/);
  // Conversation 99 was never on the stream, so it was skipped, not crashed on.
  await sweep(fake, s, (m) => logs.push(m));
  assert.deepEqual(s.counts(), { conversations: 1, utterances: 2 });
  assert.equal(s.getMeta("changes_cursor"), "after-after-start");
});
