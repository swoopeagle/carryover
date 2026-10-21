# Carryover *[working name]*

> ⚠️ **The board of record is elsewhere.** [competition-pipeline/MASTER.md](https://github.com/swoopeagle/competition-pipeline/blob/main/MASTER.md)
> holds status and priority. Competition facts (deadline, prizes, rules) live in the BSS war room
> [BRIEF.md](https://github.com/swoopeagle/amazon-build-ship-shape/blob/main/BRIEF.md).
> **When something changes here, update the MASTER row the same day.**

A speech notepad for people who stutter, built on the [Bee](https://bee.computer) wearable. It
listens through your day and keeps the record your memory won't: how much you actually spoke,
where it flowed, and which rooms are hard.

**It is not a diagnostic tool.** Bee never keeps audio, so Carryover never hears your voice. It
reads the transcript Bee produces and the timing of each utterance. It cannot measure a block the
way a speech-language pathologist does, and it doesn't pretend to.

Entry for the **Bee Track** of [Build, Ship, Shape](https://amazonappdev2026.devpost.com/).
Submissions close **October 23, 2026, 12:00 PM PDT** (✅ read off the Devpost schedule 2026-10-20).

**The name.** In speech therapy, *carryover* is a skill moving out of the therapy room and into
real life. An always-on record is the only thing positioned to see whether it did.

## What it does

1. **Win log.** Minutes spoken, conversations had, words said, per day. People who stutter tend to
   remember the hard sentences and forget the hundreds that went fine. This is the counter-record.
2. **Context map.** Speech rate and transcript-level disfluency signals, broken out by place, time
   of day, and conversation length. A personal map of which situations are hard.
3. **Avoidance signal.** Avoidance shows up as *saying less*. Words per conversation, tracked by
   context over time, catches a room you've started going quiet in.

## How it works

```
Bee wearable → bee stream (SSE) → features (rate, repeats, fillers) → SQLite on your machine → report → one page
```

Everything runs locally. The only network traffic is the Bee CLI talking to Bee's own API.

**What the signal actually is.** Each utterance from `bee stream` carries its text plus `start` and
`end` in seconds, so speech rate (words per second) is computed directly. Bee's speech recognition
does not clean up repetitions: a real capture in [`fixtures/spike-stream.log`](fixtures/spike-stream.log)
reads *"honey bees actually make honey bees actually make"*. Repeats and fillers that survive into
the transcript are the second signal. Both are proxies, and the page says so.

## Run it

Needs Node 26+ (runs TypeScript directly, no build step, no dependencies).

```
npm test                          # unit checks on the feature extractors
npm run replay                    # feed the real captured Bee log through the pipeline
npm start                         # live: needs `npm i -g @beeai/cli && bee login`
```

## Files

| File | What it's for |
|---|---|
| **`README.md`** | **Front door.** What this is and how to run it |
| `CLAUDE.md` | Rules for anyone (or any agent) working here. Read before changing code |
| `CONTEXT.md` | Session handoff: where things stand, what's decided, what's next |
| `TODO.md` | The build board: every task, its owner, its status |
| `PRODUCTION.md` | What's actually running and how to demo it |
| `ELIGIBILITY.md` | Settled team eligibility facts (mirror of competition-pipeline PROFILE.md) |
| `src/` | The code: `bee.ts` (stream), `features.ts`, `store.ts`, `daemon.ts`, `report.ts`, `server.ts` |
| `fixtures/` | Real captured Bee events, for building without hardware |
| `research/` | Dated findings only |

## Credits

The Bee stream consumer in `src/bee.ts` is adapted from
[Rhubarb](https://github.com/OJ-IRO/rhubarb-tools-competition) (MIT), as is the captured event
log in `fixtures/`. Thanks to the Rhubarb contributors for the hardware spike that mapped what
the stream really does.

## First step

**Ian:** `npm i -g @beeai/cli && bee login`, then `bee stream --json` and say a sentence. If an
utterance prints, the demo is unblocked. Everything else builds against the fixture.

---

_Team: Ian (solo entry). Working agreement:
[competition-pipeline CLAUDE.md § Working agreement](https://github.com/swoopeagle/competition-pipeline/blob/main/CLAUDE.md)._
