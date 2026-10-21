# CONTEXT — where Carryover stands

**Last updated: 2026-10-20, 23:00.** Read this first if you're picking this up cold.

## ⚡ 2026-10-20 — repo opened

**Status (end of Oct 20, ~11pm).** **Everything that can be built without hardware is built, tested
and pushed:** capture pipeline, report, the page, friction log, Devpost draft + video script, CI.
Repo is public. `@beeai/cli` is installed on this Mac (not yet logged in). **The critical path is now
entirely Ian's:** Bee app on the Watch SE → `bee login` → one live utterance → wear it Wednesday →
record Thursday morning → submit before noon PDT. Code only changes again if live data reveals a
surprise (likeliest: Watch-only capture behaving differently from the Pioneer).

**How we got here.** Ian first proposed a group swear-jar on Bee. It hit three documented walls:
no speaker identification (pseudonymous labels only, fails at 3+ speakers), single-user auth, and
no push channel except todo alarms. Ian then pivoted to what he actually cares about: **he
stutters**, and wanted to see what `bee stream` could do for speech. The notepad framing was his.
It also makes the 6–40 s latency irrelevant.

### Decisions on the record

| Date | Decision | Who |
|---|---|---|
| 2026-10-20 | Separate repo, separate entry. Rhubarb stays OJ's; no shared code beyond MIT reuse | Ian |
| 2026-10-20 | Concept: non-diagnostic speech notepad on `bee stream`. Not a behavior enforcer | Ian |
| 2026-10-20 | Occupies the BSS board's **Bee live lane** (slot #2, was Jay's, concept-blocked, unstarted) | Ian — ⚠️ **tell Jay** |
| 2026-10-20 | Known tension with pipeline rule 5 (no product for one application): built as a tool Ian would use | Ian |
| 2026-10-20 | Stack: Node 26 TS with native type stripping, zero deps, `node:sqlite` | build call |
| 2026-10-20 | **Name locked: Carryover.** Checked in-category; only adjacent hit is Arizona's unshipped articulation "Speech Sounds Carryover App" | Ian |
| 2026-10-20 | **Hardware: Apple Watch SE** (no Pioneer). Counts per Devpost: *"a Bee device or an Apple Watch running Bee software"*. ⚠️ Watch-only capture not yet seen first-hand | Ian |
| 2026-10-20 | **Repo is PUBLIC under MIT** → satisfies the Open Source mini ($5K) via the repo itself | Ian |
| 2026-10-20 | Jay: Ian texts him about slot #2 | Ian |
| 2026-10-20 | Ian hands the build to Claude to run autonomously through Wed; Ian records + submits Thu | Ian |

## What we need to do now

**Ian**
1. **Get the stream running on the Watch SE** — exact steps in [README § First step](README.md#first-step).
   The moment `bee stream --json` prints an utterance from the Watch, the video is unblocked.
2. Text Jay about slot #2.
3. **Wear it Wednesday.** Real data is the video. Fixture data is a fallback, and a worse one.
4. Thursday morning: record the <3 min video. Talk about stuttering in your own words; it's the
   strongest thing in the entry.

**Build (Claude, tonight → Wed)** — see [TODO.md](TODO.md).

## Open questions

- **Does the Watch app capture on its own?** The 09-11 capability read says the Watch app alone counts
  as Bee hardware, and Devpost says the same. Not yet seen first-hand on the SE. **Ian's install is the test.**
- **Whose voice is it?** Live utterances carry no speaker label (0 of all events in the capture).
  Options: (a) REST `/v1/conversations/:id` may carry pseudonymous labels for conversations that
  survive, then take the dominant speaker as the wearer; (b) accept room-level metrics and say so;
  (c) let the wearer mark solo practice via a voice note, which is unambiguously theirs. **Needs one
  live check: does a surviving conversation's REST transcript have speakers?**
- **Do Bee's transcripts keep fillers** ("um", "uh")? Unknown. Repetitions do survive.
- **Open Source mini challenge ($5K):** needs a public contribution during the window. Cheap if
  Carryover goes public under MIT; Ian's call.

## Known empty and worth knowing

- No clinical validation of any metric, and none is claimed.
- No multi-day data: the fixture is ~30 minutes of one afternoon.

## Where to look

| Question | File |
|---|---|
| What's the deadline / prize / rule? | BSS war room [BRIEF.md](https://github.com/swoopeagle/amazon-build-ship-shape/blob/main/BRIEF.md), then Devpost |
| What can Bee's API actually do? | [Rhubarb `docs/BEE-CAPABILITIES.md`](https://github.com/OJ-IRO/rhubarb-tools-competition/blob/main/docs/BEE-CAPABILITIES.md), `spike-results.md` |
| What's left to build? | [TODO.md](TODO.md) |
| How do I demo it? | [PRODUCTION.md](PRODUCTION.md) |
