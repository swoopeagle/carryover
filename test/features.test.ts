import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFeatures, tokenize, median } from "../src/features.ts";

test("real Bee capture: the ASR kept a 4-word repeat", () => {
  // Verbatim from fixtures/spike-stream.log, utterance 3377304577.
  const f = extractFeatures("So I wonder how honey bees actually make honey bees actually make", 7.36, 14.48);
  assert.equal(f.repeats, 1);
  assert.equal(f.words, 12);
  assert.ok(Math.abs((f.wordsPerSec ?? 0) - 12 / 7.12) < 1e-9);
});

test("rate from real capture timing", () => {
  const f = extractFeatures("I wonder how honeybees actually make honey.", 2.64, 6.24);
  assert.equal(f.words, 7);
  assert.ok(Math.abs((f.wordsPerSec ?? 0) - 7 / 3.6) < 1e-9);
  assert.equal(f.repeats, 0);
});

test("unigram runs count every extra copy", () => {
  assert.equal(extractFeatures("I I I want to go").repeats, 2);
  assert.equal(extractFeatures("the the cat").repeats, 1);
});

test("fillers are counted and excluded from word count", () => {
  const f = extractFeatures("um so uh I think, hmm, yes", 0, 2);
  assert.equal(f.fillers, 3);
  assert.equal(f.words, 4);
});

test("part-word repetitions", () => {
  assert.equal(extractFeatures("b-b-but I think").partWords, 1);
  assert.equal(extractFeatures("it was b but then").partWords, 1);
  // "a" and "i" are words, not fragments.
  assert.equal(extractFeatures("a apple and i idea").partWords, 0);
  // A normal hyphenated word is not a part-word.
  assert.equal(extractFeatures("a well-known fact").partWords, 0);
});

test("missing or degenerate timing gives no rate, never a fake one", () => {
  assert.equal(extractFeatures("hello there").wordsPerSec, null);
  assert.equal(extractFeatures("hello there", 5, 5).wordsPerSec, null);
  assert.equal(extractFeatures("hello there", 5, 5.1).wordsPerSec, null);
  assert.equal(extractFeatures("um", 0, 2).wordsPerSec, null);
});

test("ASR number formatting doesn't create phantom tokens", () => {
  assert.deepEqual(tokenize("at 12: 14 p. m."), ["at", "12", "14", "p", "m"]);
  assert.equal(extractFeatures("at 12: 14 p. m.").partWords, 0);
});

test("median", () => {
  assert.equal(median([]), null);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});
