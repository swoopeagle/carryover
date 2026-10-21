# Friction log — Bee developer platform

_Submitted with the entry. Devpost, verbatim (read 2026-10-20): *"Friction log entries for each
one: the task you attempted, the steps you took, what you expected vs. what actually happened, a
severity rating, any workaround you used, and an actionable suggestion. Submissions with friction
logs can earn up to a 10% judging bonus."*_

_Rule for this file: only friction we hit or measured ourselves, with the evidence. Entries marked
(Rhubarb spike) were measured on a physical Bee on 2026-09-12 by the Rhubarb team and re-confirmed
against the captured log in `fixtures/`._

---

### 1. Live utterances carry no speaker, though the type says they can
- **Task:** Separate the wearer's own speech from everyone else's, for a personal speech record.
- **Steps:** Consumed `bee stream --json`; inspected every `new-utterance` event in a real capture.
- **Expected:** A `speaker` label per utterance. The SSE description lists `new-utterance` as
  *"live per-utterance transcript w/ speaker"*, and the utterance type declares `speaker?`.
- **Actual:** `speaker` appears in **0** events of the captured log.
- **Severity:** High for any personal-metrics app. Every number blends the wearer with the room.
- **Workaround:** Metrics are reported at room level and labelled as such. Planned: read the REST
  transcript of conversations that survive, and treat the dominant pseudonymous label as the wearer.
- **Suggestion:** Emit a boolean `is_wearer` on live utterances. Bee already voice-trains on the
  owner at onboarding; exposing that one bit (not a name) would unlock every self-coaching use case
  without exposing anyone else's identity.

### 2. No way to tell Bee's cleanup from the wearer's delete
- **Task:** Keep conversations Bee discards automatically, and honour ones the wearer deletes.
- **Steps:** Replayed the capture; watched `delete-conversation` events.
- **Expected:** A reason on the delete event (Bee's own `journal-deleted` has
  `reason: "silence"`, so the pattern exists).
- **Actual:** `delete-conversation` carries only the conversation object. All 5 conversations in
  the capture were deleted by Bee within minutes, while `CAPTURING` or `PROCESSING`. Their
  utterances are then unrecoverable through any read endpoint.
- **Severity:** High. Silent data loss for short conversations, and a privacy guess for apps.
- **Workaround:** Infer from state: deleted while `CAPTURING`/`PROCESSING` = Bee cleanup (keep);
  deleted after finishing = the wearer (forget). Tested in `test/store.test.ts`. It's a heuristic.
- **Suggestion:** Add `reason` to `delete-conversation`, mirroring `journal-deleted`:
  `"too_short" | "user" | "retention"`.

### 3. Speech use cases have no audio to work with
- **Task:** Measure speech fluency for someone who stutters.
- **Expected:** Some acoustic signal, even derived (pause durations inside an utterance, a
  per-word timestamp, a confidence score).
- **Actual:** Audio is never stored and no endpoint exposes it (by design, and for good privacy
  reasons). Utterances carry only `start` and `end` for the whole utterance.
- **Severity:** Medium. It caps what speech-therapy and accessibility apps can do on Bee.
- **Workaround:** Words/second per utterance, plus disfluencies that survive into the transcript
  (Bee's ASR keeps repetitions: *"honey bees actually make honey bees actually make"*).
- **Suggestion:** Per-word timestamps on utterances. They expose nothing beyond the transcript Bee
  already shares, and they make pause and pace analysis possible with no audio leaving Bee.

### 4. Bare `application/json` is rejected by the proxy (Rhubarb spike)
- **Task:** `POST /v1/todos` through `bee proxy`.
- **Actual:** `415 FST_ERR_CTP_INVALID_MEDIA_TYPE`. Works only with `application/json; charset=utf-8`.
- **Severity:** Low, but it costs every new developer the same half hour.
- **Suggestion:** Accept bare `application/json`, or document the charset requirement on `/docs/proxy`.

### 5. 6–40 s from speech to event (Rhubarb spike)
- **Measured:** n=5: ~6, 12, 21, 26, 38 s.
- **Severity:** Medium. Rules out anything that responds in the moment.
- **Workaround:** Carryover is a notepad by design; latency doesn't matter to a record.
- **Suggestion:** Document the expected latency range, so builders design for it up front.
