// Capture loop: Bee events in, features computed, rows stored. Live by default, or --replay a log.
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { BeeStreamConsumer, parseEventLine, type BeeConversation, type BeeEvent, type BeeUtterance } from "./bee.ts";
import { Store } from "./store.ts";

export function handleEvent(store: Store, ev: BeeEvent, log: (msg: string) => void = () => {}): void {
  switch (ev.type) {
    case "new-conversation":
    case "update-conversation":
      store.upsertConversation(ev.conversation as BeeConversation);
      return;
    case "new-utterance":
      store.addUtterance(ev.conversation_uuid as string, ev.utterance as BeeUtterance);
      return;
    case "delete-conversation": {
      const c = ev.conversation as BeeConversation;
      log(`delete-conversation ${c.id} (${c.state}): ${store.onConversationDeleted(c)}`);
      return;
    }
    default:
      // Journals, todos and locations aren't used yet.
      return;
  }
}

function main(): void {
  const { values } = parseArgs({
    options: {
      replay: { type: "string" },
      db: { type: "string" },
    },
  });
  const log = (msg: string) => console.log(`[carryover] ${msg}`);

  if (values.replay) {
    const store = new Store(values.db ?? "data/replay.db");
    let n = 0;
    for (const line of readFileSync(values.replay, "utf8").split("\n")) {
      const ev = parseEventLine(line);
      if (!ev || ev === "handshake") continue;
      handleEvent(store, ev, log);
      n++;
    }
    log(`replayed ${n} events from ${values.replay}`);
    log(`store now holds ${JSON.stringify(store.counts())}`);
    return;
  }

  const store = new Store(values.db ?? "data/carryover.db");
  const consumer = new BeeStreamConsumer({
    onEvent: (ev) => handleEvent(store, ev, log),
    onStatus: log,
  });
  consumer.start();
  const shutdown = () => {
    consumer.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (import.meta.main) main();
