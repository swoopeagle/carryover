// Transcript-level speech signals. Bee keeps no audio, so everything here is read from the text
// Bee's speech recognition produced and the utterance's start/end timing. These are proxies,
// not measurements of stuttering, and nothing downstream may present them as more than that.

export interface UtteranceFeatures {
  words: number;
  durationSec: number | null;
  /** Words per second; null when the timing is missing or too short to mean anything. */
  wordsPerSec: number | null;
  /** Immediate repeats of a 1–4 word sequence ("the the", "make honey make honey"). */
  repeats: number;
  /** Filled pauses that survived transcription: um, uh, er, erm, ah, hmm. */
  fillers: number;
  /** Part-word repetitions: "b-b-but", or a lone fragment before its word ("b but"). */
  partWords: number;
}

const FILLERS = new Set(["um", "uh", "er", "erm", "ah", "hmm", "mm", "uhm"]);
const MAX_NGRAM = 4;
// Under ~0.4 s, start/end rounding swamps the rate.
const MIN_DURATION_SEC = 0.4;

/** Lowercased word tokens with punctuation removed; pure-punctuation tokens dropped. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9'-]/g, "").replace(/^[-']+|[-']+$/g, ""))
    .filter((t) => t.length > 0);
}

function countPartWords(tokens: string[]): number {
  let n = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    // "b-b-but": every piece but the last is a 1–2 letter fragment the last word starts with.
    if (t.includes("-")) {
      const parts = t.split("-").filter(Boolean);
      const last = parts[parts.length - 1];
      const frags = parts.slice(0, -1);
      if (frags.length > 0 && frags.every((f) => f.length <= 2 && last.startsWith(f) && last.length > f.length)) n++;
      continue;
    }
    // "b but": a lone fragment, then a word starting with it. "a" and "i" are real words.
    const next = tokens[i + 1];
    if (t.length === 1 && t !== "a" && t !== "i" && next && next.length > 1 && next.startsWith(t)) n++;
  }
  return n;
}

function countRepeats(tokens: string[]): number {
  // Hyphen pieces are already counted as part-words; compare whole tokens only.
  let count = 0;
  let i = 0;
  while (i < tokens.length) {
    let matched = 0;
    for (let n = MAX_NGRAM; n >= 1; n--) {
      if (i + 2 * n > tokens.length) continue;
      let same = true;
      for (let k = 0; k < n; k++) {
        if (tokens[i + k] !== tokens[i + n + k]) {
          same = false;
          break;
        }
      }
      if (same) {
        matched = n;
        break;
      }
    }
    if (matched > 0) {
      count++;
      // Step past one copy only, so "I I I" counts two repeats, not one.
      i += matched;
    } else {
      i++;
    }
  }
  return count;
}

export function extractFeatures(text: string, startSec?: number | null, endSec?: number | null): UtteranceFeatures {
  const tokens = tokenize(text);
  const words = tokens.filter((t) => !FILLERS.has(t)).length;
  const hasTiming = typeof startSec === "number" && typeof endSec === "number" && endSec > startSec;
  const durationSec = hasTiming ? endSec - startSec : null;
  const wordsPerSec = durationSec !== null && durationSec >= MIN_DURATION_SEC && words > 0 ? words / durationSec : null;
  return {
    words,
    durationSec,
    wordsPerSec,
    // ponytail: legitimate doubles ("that that's", "very very") count too. Fine for a proxy read
    // against the wearer's own baseline; add a grammar-aware exception list if it skews real data.
    repeats: countRepeats(tokens),
    fillers: tokens.filter((t) => FILLERS.has(t)).length,
    partWords: countPartWords(tokens),
  };
}

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
