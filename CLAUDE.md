# Carryover — rules for working here

A local, non-diagnostic speech notepad for people who stutter, built on the Bee wearable's live
stream. Bee Track entry for Build, Ship, Shape (due **2026-10-23 12:00 PM PDT**). Owner: Ian.

## Rules — inherited, non-negotiable

1. **Provenance or it doesn't exist.** Every deadline, prize and rule carries a URL and was read
   off that page. Unconfirmed = ⚠️ and not planned around. A hallucinated deadline is a P0 bug.
2. **Agents draft; humans submit.** No agent presses submit on Devpost, ever.
3. **Primary sources only.** The Devpost page and Bee's own docs/CLI, not blog summaries.
4. **Verbatim quotes for anything load-bearing** (rules, eligibility, judging criteria).
5. **No new product built solely for one application.** ⚠️ Known tension, recorded in
   CONTEXT.md: Ian's call (2026-10-20) is that this is a tool he'd use himself first.
6. **Update the MASTER row the same day** something changes here.

## Rules — this project

7. **Never claim acoustic measurement.** Bee stores no audio and exposes none. Carryover reads
   transcript text and per-utterance timing. No "%SS", no "block duration", no "detects
   stuttering". Say *speech rate* and *transcript signals*.
8. **Non-diagnostic everywhere** — README, UI copy, video, Devpost text. It is a notepad.
9. **Live capture is mandatory.** Bee deletes short conversations server-side minutes after they
   end (measured 2026-09-12, 3 of 3). The stream is the only copy. Never design around backfill.
10. **Data stays on the machine.** SQLite under `data/`, gitignored. Nothing leaves except the Bee
    CLI's own calls.
11. **Zero dependencies until one earns its place.** Node 26 strips TypeScript natively; use
    `node:sqlite`, `node:test`, `node:http`. No enums or constructor parameter properties (type
    stripping can't handle them).
12. **The Bee CLI owns auth.** Never read, store, or log a Bee token.

## Known constraints (measured, not assumed)

- **No speaker labels on live utterances.** `speaker` is optional in the type and absent from
  every event in the real capture. Live metrics include everyone in the room. See CONTEXT.md.
- **Latency 6–40 s** speech → `new-utterance`. Fine for a notepad; rules out live nudges.
- **The only push channel** to the wearer is a todo with `alarm_at` (fires on a locked phone).
- Proxy POSTs need `Content-Type: application/json; charset=utf-8` (bare JSON → 415).

## Conventions

- `npm test` before every commit. Non-trivial logic gets one check in `test/`.
- Commit small, push immediately, author `swoopeagle`. Stage explicit paths, never `git add -A`.
- Dated findings go in `research/YYYY-MM-DD-slug.md`; supersede, don't edit.

## Files

`README.md` front door · `CONTEXT.md` handoff · `TODO.md` board · `PRODUCTION.md` what runs ·
`ELIGIBILITY.md` team gates · `src/` code · `fixtures/` real Bee events · `research/` findings.
