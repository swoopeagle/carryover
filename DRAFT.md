# DRAFT — Devpost submission text + video script

_Unknown facts are `[BRACKETED]` and never submitted with placeholders. Ian edits, Ian submits._

## Devpost fields

**Project name:** Carryover

**Tagline:** A speech notepad for people who stutter, built on Bee's live stream. It keeps the record your memory won't.

**Track:** Bee (Wearable AI) · **Mini challenge:** Open Source

### Inspiration

I stutter. Like most people who do, I remember the sentences that got stuck and forget the hundreds that didn't. By evening, my sense of how the day went is built from the worst thirty seconds of it.

Bee is the first thing I've worn that was actually listening all day. That makes it the only device positioned to keep the other record: how much I actually said, where it flowed, and which rooms I've started going quiet in. In speech therapy the word for a skill making it out of the clinic and into real life is *carryover*. Nobody has ever been able to measure it in real life. Bee can.

### What it does

Carryover runs on your own machine, consumes Bee's live stream, and keeps three things:

1. **The win log.** Minutes with words in them, words said, conversations had, per day. The count of all of it, not just the hard parts.
2. **The context map.** Speech rate and transcript-level signals broken out by place and time of day. A personal map of which situations are hard, from evidence rather than dread.
3. **The quiet-rooms flag.** Avoidance doesn't look like stuttering; it looks like saying less. Carryover compares words-per-conversation in each context against your own baseline and flags a room you've gone quiet in.

It is a notepad, not a diagnostic tool. It never claims to measure stuttering.

### How we built it

Node 26 TypeScript with zero dependencies: `node:sqlite` for the store, `node:http` for the page, `node:test` for the checks. The daemon spawns `bee stream --json` and consumes every `new-utterance`, `new-conversation`, `update-conversation` and `delete-conversation` event. Each utterance gets features computed on arrival: words per second from Bee's `start`/`end` timing, immediate repeats, filled pauses, and part-word repetitions that survived into the transcript. A report layer buckets by day and by place × time slot, and one HTML page shows it.

Bee keeps no audio, so every signal here is read from the transcript and the timing. That's a hard constraint and we designed to it instead of around it.

The stream consumer is adapted from Rhubarb (MIT). The pipeline was built and tested entirely against a real captured Bee event log before the hardware was on, so the replay path (`npm run replay`) is a first-class way to run it.

### Challenges we ran into

- **Bee deletes short conversations on its side, minutes after they end**, while they're still `CAPTURING` or `PROCESSING`. Their utterances then can't be read back from any endpoint. The live stream is the only copy, so Carryover treats a delete-while-processing as Bee's cleanup and keeps the data, and a delete-after-finish as the wearer's choice and honours it. That's a heuristic; a `reason` on the event would make it a rule (friction log #2).
- **Live utterances carry no speaker label**, even though the type declares one. A personal speech tool can't tell the wearer from the room. We report at room level and say so on the page (friction log #1).
- **No audio means no acoustics.** We lost prolongations and blocks and kept what the transcript keeps: Bee's ASR preserves repetitions verbatim ("honey bees actually make honey bees actually make" is in our fixture). That was enough to build on.

### Accomplishments we're proud of

Every number on the page comes from a real Bee event and is labelled for exactly what it is. Nothing is a clinical claim. The whole thing runs with `npm start` and nothing installed.

### What we learned

Bee's constraints are privacy decisions, and the honest products are the ones that work inside them. Also: an at-most-once SSE stream plus server-side deletion is a sharper edge than it looks; it decided the architecture.

### What's next

The one bit that would unlock every self-coaching use case on Bee is an `is_wearer` boolean on live utterances (friction log #1). With it, the context map becomes personal instead of room-level. After that: a voice-note practice loop (Bee transcribes a press-and-hold note in ~3 s), and a weekly summary delivered the only way Bee can reach the wearer, a todo alarm.

**Built with:** Node.js, TypeScript, SQLite (`node:sqlite`), `@beeai/cli` (`bee stream`, `bee proxy`), Geist.

**Repo:** https://github.com/swoopeagle/carryover (public, MIT)

**Video:** `[YOUTUBE URL — Thu]`

### Product feedback

See [FRICTION-LOG.md](FRICTION-LOG.md): five entries, each with task, steps, expected vs actual, severity, workaround and suggestion. The two that matter most for the platform: a speaker/wearer bit on live utterances, and a `reason` on `delete-conversation`.

### Open Source mini challenge fields

- **Contribution URL:** https://github.com/swoopeagle/carryover
- **Repo URL:** https://github.com/swoopeagle/carryover
- **GitHub username:** `[swoopeagle — Ian to confirm]`
- **What you did, how it works, why it matters:** Opened Carryover as a public MIT repo during the hackathon window: a zero-dependency reference implementation of a `bee stream` consumer that survives Bee's server-side cleanup of short conversations (`src/store.ts`, tested), plus transcript-level speech feature extraction. No third-party project had ever used `bee stream` before this hackathon; this is a reusable, tested starting point for anyone who wants to.

---

## Video script (<3:00) — Ian edits the first 20 seconds into his own words

**0:00–0:20 — you, on camera.** *[Your words. The draft: "I stutter. By the end of most days, what I remember is the sentence that got stuck. I built a thing for the Bee that keeps the other record."]*

**0:20–0:50 — the daemon.** Terminal with `npm start` running. Say a sentence near the Watch. Wait on camera; narrate the wait: "Bee takes somewhere between six and forty seconds." The `new-utterance` line arrives. Point at `wps`, `repeats`.

**0:50–1:30 — the page.** Switch to the browser. The spoken-time counter has moved. Walk the win log tile, then the context table: "This is one afternoon. With a week of data, this row splits into the places I actually go."

**1:30–2:10 — what it is and isn't.** "Bee doesn't keep audio, so nothing here is acoustic. It's words per second from the timing, and the repeats Bee's transcription keeps. Both are proxies against my own baseline. It is a notepad, not a diagnostic tool."

**2:10–2:40 — the platform ask.** "One bit would make this personal instead of room-level: is this utterance the wearer? Bee already knows my voice. Friction log has the details, with four more."

**2:40–2:55 — close.** Repo URL on screen. "Carryover. Public, MIT, zero dependencies, runs on your own machine."
