# PRODUCTION — what runs, and how to demo it

_Updated as things ship. If it isn't here, it isn't running._

| Piece | State |
|---|---|
| Feature extractors | ✅ 17 tests |
| Replay of real captured events | ✅ `npm run replay` → `data/replay.db` |
| Report (win log, context map, quiet rooms) | ✅ |
| One-page view | ✅ `npm run demo` → http://127.0.0.1:4747 (dark, follows system theme) |
| Live capture from a Bee | ⛔ waiting on the Watch SE stream check (README § First step). Daemon's restart loop verified unauthenticated: backs off 1→2→4 s, surfaces *"Not logged in"*, page keeps serving |
| Durability sweep (`/v1/changes` + REST refill) | ✅ tested on the documented shape; ⚠️ REST field names unconfirmed live |
| Unattended run | `ops/com.carryover.daemon.plist` (launchd, KeepAlive). Needs an awake machine |

## Demo path (for the video)

One terminal, one browser.

1. `npm start` — stream, page and sweep in one process. Every utterance lands in `data/carryover.db` with its features; the page at http://127.0.0.1:4747 re-reads it every 15 s.
2. Talk near the Watch. 6–40 s later the hero number ticks up and the terminal shows the utterance.

**What the video has to show** (Devpost, verbatim): *"your video and code need to show your project actually using live Bee data to do something for a user, mentioning Bee isn't enough."* So: the daemon terminal with a real `new-utterance` arriving, then the page changing because of it. Lead with that; judges aren't required to watch past 3:00.

Fallback if the Watch never streams: `npm run demo` on the fixture, and say so on camera. Weaker, and honest.
