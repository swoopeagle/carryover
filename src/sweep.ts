// Durability sweep. The stream is at-most-once: anything said while the daemon was disconnected
// never arrives. Bee's /v1/changes cursor says which conversations changed; for ones Bee kept,
// the REST transcript refills what we missed. Short conversations Bee deleted are gone either
// way, which is why the stream still runs first.
//
// ⚠️ The REST transcript's field names come from the 2026-09-11 CLI string-dump ("per-utterance
// text, pseudonymous speaker label, spoken_at"), not from a live read. extractUtterances is
// tolerant on purpose. Confirm against one real response, then tighten.
import type { BeeClient, BeeUtterance } from "./bee.ts";
import type { Store } from "./store.ts";

export function extractUtterances(conversation: Record<string, unknown>): BeeUtterance[] {
  const list = (["utterances", "transcript", "transcriptions"] as const)
    .map((k) => conversation[k])
    .find(Array.isArray) as Array<Record<string, unknown>> | undefined;
  if (!list) return [];
  const out: BeeUtterance[] = [];
  for (const u of list) {
    const text = typeof u.text === "string" ? u.text : null;
    const id = typeof u.id === "number" ? u.id : null;
    if (!text || id === null) continue;
    // spoken_at is ISO on the stream and epoch ms on REST, per the research. Normalise to ISO.
    const raw = u.spoken_at;
    const spokenAt = typeof raw === "number" ? new Date(raw).toISOString() : typeof raw === "string" ? raw : null;
    if (!spokenAt) continue;
    out.push({
      id,
      text,
      spoken_at: spokenAt,
      start: typeof u.start === "number" ? u.start : (null as unknown as number),
      end: typeof u.end === "number" ? u.end : (null as unknown as number),
      speaker: typeof u.speaker === "string" ? u.speaker : undefined,
    });
  }
  return out;
}

export async function sweep(client: BeeClient, store: Store, log: (m: string) => void): Promise<void> {
  const cursor = store.getMeta("changes_cursor");
  const ch = await client.changes(cursor ?? undefined);
  let filled = 0;
  for (const beeId of ch.conversations) {
    const uuid = store.uuidForBeeId(beeId);
    if (!uuid) continue; // Never saw it on the stream: no uuid to file utterances under.
    let conv: Record<string, unknown>;
    try {
      conv = await client.getConversation(beeId);
    } catch (e) {
      log(`sweep: conversation ${beeId} unreadable (${(e as Error).message.slice(0, 80)})`);
      continue;
    }
    for (const u of extractUtterances(conv)) {
      if (store.hasUtterance(u.id)) continue;
      store.addUtterance(uuid, u);
      filled++;
    }
  }
  store.setMeta("changes_cursor", ch.next_cursor);
  log(`sweep: ${ch.conversations.length} changed conversations, ${filled} utterances filled`);
}
