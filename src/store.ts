// Local store. Everything Carryover knows lives in one SQLite file on the wearer's machine.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { BeeConversation, BeeUtterance } from "./bee.ts";
import { extractFeatures } from "./features.ts";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS conversations (
  uuid        TEXT PRIMARY KEY,
  bee_id      INTEGER,
  start_time  TEXT,
  end_time    TEXT,
  state       TEXT,
  city        TEXT,
  business    TEXT,
  address     TEXT
);
CREATE TABLE IF NOT EXISTS utterances (
  id                INTEGER PRIMARY KEY,
  conversation_uuid TEXT NOT NULL,
  text              TEXT NOT NULL,
  spoken_at         TEXT NOT NULL,
  start_s           REAL,
  end_s             REAL,
  speaker           TEXT,
  words             INTEGER NOT NULL,
  duration_s        REAL,
  wps               REAL,
  repeats           INTEGER NOT NULL,
  fillers           INTEGER NOT NULL,
  part_words        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS utterances_spoken_at ON utterances(spoken_at);
CREATE INDEX IF NOT EXISTS utterances_conv ON utterances(conversation_uuid);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

// Bee deletes short conversations itself while they are still being captured or processed
// (3 of 3 in the 2026-09-12 spike). Keeping our copy of those is the whole reason live capture
// exists. A delete of a conversation that had finished is the wearer deleting it, and we honour it.
const BEE_CLEANUP_STATES = new Set(["CAPTURING", "PROCESSING"]);

export class Store {
  readonly db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec(SCHEMA);
  }

  upsertConversation(c: BeeConversation): void {
    // COALESCE keeps context we already have when a later event arrives with nulls.
    this.db
      .prepare(
        `INSERT INTO conversations (uuid, bee_id, start_time, end_time, state, city, business, address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(uuid) DO UPDATE SET
           bee_id = excluded.bee_id,
           start_time = COALESCE(excluded.start_time, conversations.start_time),
           end_time = COALESCE(excluded.end_time, conversations.end_time),
           state = excluded.state,
           city = COALESCE(excluded.city, conversations.city),
           business = COALESCE(excluded.business, conversations.business),
           address = COALESCE(excluded.address, conversations.address)`
      )
      .run(
        c.conversation_uuid,
        c.id,
        c.start_time ?? null,
        c.end_time ?? null,
        c.state,
        c.city ?? null,
        c.business ?? null,
        c.primary_location?.address ?? null
      );
  }

  addUtterance(conversationUuid: string, u: BeeUtterance): void {
    const f = extractFeatures(u.text, u.start, u.end);
    // A conversation row must exist even if we joined the stream mid-conversation.
    this.db.prepare("INSERT OR IGNORE INTO conversations (uuid, state) VALUES (?, 'UNKNOWN')").run(conversationUuid);
    this.db
      .prepare(
        `INSERT OR REPLACE INTO utterances
           (id, conversation_uuid, text, spoken_at, start_s, end_s, speaker, words, duration_s, wps, repeats, fillers, part_words)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        u.id,
        conversationUuid,
        u.text,
        u.spoken_at,
        u.start ?? null,
        u.end ?? null,
        u.speaker ?? null,
        f.words,
        f.durationSec,
        f.wordsPerSec,
        f.repeats,
        f.fillers,
        f.partWords
      );
  }

  /** Returns what happened, so the daemon can log it. */
  onConversationDeleted(c: BeeConversation): "kept" | "forgotten" {
    if (BEE_CLEANUP_STATES.has(c.state)) {
      this.db.prepare("UPDATE conversations SET state = 'KEPT_AFTER_BEE_CLEANUP' WHERE uuid = ?").run(c.conversation_uuid);
      return "kept";
    }
    this.forgetConversation(c.conversation_uuid);
    return "forgotten";
  }

  forgetConversation(uuid: string): void {
    this.db.prepare("DELETE FROM utterances WHERE conversation_uuid = ?").run(uuid);
    this.db.prepare("DELETE FROM conversations WHERE uuid = ?").run(uuid);
  }

  getMeta(key: string): string | null {
    const r = this.db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as { value: string } | undefined;
    return r?.value ?? null;
  }

  setMeta(key: string, value: string): void {
    this.db.prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
  }

  uuidForBeeId(beeId: number): string | null {
    const r = this.db.prepare("SELECT uuid FROM conversations WHERE bee_id = ?").get(beeId) as { uuid: string } | undefined;
    return r?.uuid ?? null;
  }

  hasUtterance(id: number): boolean {
    return this.db.prepare("SELECT 1 FROM utterances WHERE id = ?").get(id) !== undefined;
  }

  counts(): { conversations: number; utterances: number } {
    const c = this.db.prepare("SELECT COUNT(*) AS n FROM conversations").get() as { n: number };
    const u = this.db.prepare("SELECT COUNT(*) AS n FROM utterances").get() as { n: number };
    return { conversations: c.n, utterances: u.n };
  }
}
