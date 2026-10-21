// Turns stored utterances into the three things Carryover shows: the win log, the context map,
// and the avoidance signal. Everything here is a transcript or timing proxy and is labelled as
// such in the page; nothing is a clinical measure.
import type { Store } from "./store.ts";
import { median } from "./features.ts";

export interface DayRow {
  day: string;
  conversations: number;
  utterances: number;
  words: number;
  /** Sum of utterance durations, seconds. Time with words in it, not wall-clock. */
  spokenSec: number;
  medianWps: number | null;
  /** Repeats + fillers + part-words per 100 words. */
  signalsPer100: number | null;
}

export interface ContextRow {
  /** "morning" | "afternoon" | "evening" | "night" */
  slot: string;
  place: string;
  conversations: number;
  words: number;
  medianWps: number | null;
  signalsPer100: number | null;
  /** Median words per conversation in this context. */
  medianWordsPerConv: number | null;
}

export interface Report {
  generatedAt: string;
  days: DayRow[];
  contexts: ContextRow[];
  /** Contexts where words-per-conversation has fallen against the wearer's own baseline. */
  quietRooms: Array<{ place: string; slot: string; recent: number; baseline: number }>;
  totals: { conversations: number; utterances: number; words: number; spokenSec: number };
}

interface UttRow {
  conversation_uuid: string;
  spoken_at: string;
  words: number;
  duration_s: number | null;
  wps: number | null;
  repeats: number;
  fillers: number;
  part_words: number;
  city: string | null;
  business: string | null;
  address: string | null;
}

function slotOf(iso: string, tzOffsetMin: number): string {
  const h = new Date(new Date(iso).getTime() + tzOffsetMin * 60_000).getUTCHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 22) return "evening";
  return "night";
}

function dayOf(iso: string, tzOffsetMin: number): string {
  return new Date(new Date(iso).getTime() + tzOffsetMin * 60_000).toISOString().slice(0, 10);
}

function placeOf(r: UttRow): string {
  return r.business ?? r.address ?? r.city ?? "unknown place";
}

function signalsPer100(words: number, signals: number): number | null {
  return words >= 20 ? (signals / words) * 100 : null;
}

export function buildReport(store: Store, opts: { tzOffsetMin?: number; now?: Date } = {}): Report {
  // ponytail: local-time bucketing by a fixed offset; use /v1/me timezone + Intl when the demo
  // crosses a DST boundary or a trip.
  const tz = opts.tzOffsetMin ?? -new Date().getTimezoneOffset();
  const now = opts.now ?? new Date();
  const rows = store.db
    .prepare(
      `SELECT u.conversation_uuid, u.spoken_at, u.words, u.duration_s, u.wps, u.repeats, u.fillers, u.part_words,
              c.city, c.business, c.address
       FROM utterances u LEFT JOIN conversations c ON c.uuid = u.conversation_uuid
       ORDER BY u.spoken_at`
    )
    .all() as unknown as UttRow[];

  // Win log, per day.
  const byDay = new Map<string, { convs: Set<string>; utts: number; words: number; sec: number; wps: number[]; signals: number }>();
  for (const r of rows) {
    const d = dayOf(r.spoken_at, tz);
    const b = byDay.get(d) ?? { convs: new Set(), utts: 0, words: 0, sec: 0, wps: [], signals: 0 };
    b.convs.add(r.conversation_uuid);
    b.utts++;
    b.words += r.words;
    b.sec += r.duration_s ?? 0;
    if (r.wps !== null) b.wps.push(r.wps);
    b.signals += r.repeats + r.fillers + r.part_words;
    byDay.set(d, b);
  }
  const days: DayRow[] = [...byDay.entries()].map(([day, b]) => ({
    day,
    conversations: b.convs.size,
    utterances: b.utts,
    words: b.words,
    spokenSec: Math.round(b.sec),
    medianWps: median(b.wps),
    signalsPer100: signalsPer100(b.words, b.signals),
  }));

  // Context map: place × time slot.
  const byCtx = new Map<string, { place: string; slot: string; convWords: Map<string, number>; words: number; wps: number[]; signals: number }>();
  for (const r of rows) {
    const place = placeOf(r);
    const slot = slotOf(r.spoken_at, tz);
    const key = `${place}\u0000${slot}`;
    const b = byCtx.get(key) ?? { place, slot, convWords: new Map(), words: 0, wps: [], signals: 0 };
    b.convWords.set(r.conversation_uuid, (b.convWords.get(r.conversation_uuid) ?? 0) + r.words);
    b.words += r.words;
    if (r.wps !== null) b.wps.push(r.wps);
    b.signals += r.repeats + r.fillers + r.part_words;
    byCtx.set(key, b);
  }
  const contexts: ContextRow[] = [...byCtx.values()]
    .map((b) => ({
      slot: b.slot,
      place: b.place,
      conversations: b.convWords.size,
      words: b.words,
      medianWps: median(b.wps),
      signalsPer100: signalsPer100(b.words, b.signals),
      medianWordsPerConv: median([...b.convWords.values()]),
    }))
    .sort((a, b) => b.words - a.words);

  // Avoidance: in a context with history, have the last 7 days gone quiet against the 30 before?
  const quietRooms: Report["quietRooms"] = [];
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const monthAgo = new Date(now.getTime() - 37 * 86_400_000).toISOString();
  for (const b of byCtx.values()) {
    const recent: number[] = [];
    const baseline: number[] = [];
    const perConv = new Map<string, { words: number; at: string }>();
    for (const r of rows) {
      if (placeOf(r) !== b.place || slotOf(r.spoken_at, tz) !== b.slot) continue;
      const c = perConv.get(r.conversation_uuid) ?? { words: 0, at: r.spoken_at };
      c.words += r.words;
      perConv.set(r.conversation_uuid, c);
    }
    for (const c of perConv.values()) {
      if (c.at >= weekAgo) recent.push(c.words);
      else if (c.at >= monthAgo) baseline.push(c.words);
    }
    const mr = median(recent);
    const mb = median(baseline);
    // Needs real history on both sides; a 40% drop is the flag.
    if (mr !== null && mb !== null && recent.length >= 2 && baseline.length >= 3 && mr < mb * 0.6) {
      quietRooms.push({ place: b.place, slot: b.slot, recent: mr, baseline: mb });
    }
  }

  return {
    generatedAt: now.toISOString(),
    days,
    contexts,
    quietRooms,
    totals: {
      conversations: new Set(rows.map((r) => r.conversation_uuid)).size,
      utterances: rows.length,
      words: rows.reduce((n, r) => n + r.words, 0),
      spokenSec: Math.round(rows.reduce((n, r) => n + (r.duration_s ?? 0), 0)),
    },
  };
}
