// FSRS-6, the review scheduler: how well a student remembers a concept, and when to ask again.
//
// The formulas and default weights are ported from open-spaced-repetition/fsrs4anki
// (fsrs4anki_scheduler.js, commit ff7c85c), MIT License, Copyright (c) 2022 open-spaced-repetition.
// Differences: no fuzz (Pillow's schedule must be deterministic and testable), and the memory state
// is never stored. It's replayed from the evidence log, like everything else in the student model.
//
//   stability S    days until recall probability falls to 90%
//   difficulty D   1 (easy) … 10 (hard)
//   retrievability R(t) = (1 + FACTOR · t / S) ^ DECAY: the chance of recalling it t days later
//
// Ratings come from evidence: right without a hint = Good (3), right with a hint = Hard (2),
// wrong = Again (1). Pillow never rates Easy.

export type Rating = 1 | 2 | 3 | 4;

export const W = [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542];
export const REQUEST_RETENTION = 0.9;
const MAX_INTERVAL = 36500;
const DECAY = -W[20];
const FACTOR = 0.9 ** (1 / DECAY) - 1;
const DAY = 86_400_000;

export interface Memory {
  stability: number;
  difficulty: number;
  /** When it was last reviewed (ms). */
  last: number;
  reviews: number;
  lapses: number;
}

// Like the reference, round stability and difficulty to two decimals at every step.
const round2 = (x: number) => +x.toFixed(2);
const clampD = (d: number) => Math.min(Math.max(round2(d), 1), 10);
const initDifficulty = (r: Rating) => clampD(W[4] - Math.exp(W[5] * (r - 1)) + 1);
const initStability = (r: Rating) => round2(Math.max(W[r - 1], 0.1));

export function retrievability(elapsedDays: number, stability: number): number {
  return Math.pow(1 + FACTOR * elapsedDays / stability, DECAY);
}

/** Days until recall probability falls to the requested retention (90%), at least one. */
export function intervalDays(stability: number): number {
  const ivl = stability / FACTOR * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return Math.min(Math.max(Math.round(ivl), 1), MAX_INTERVAL);
}

function nextDifficulty(d: number, r: Rating): number {
  const delta = -W[6] * (r - 3);
  const next = d + delta * (10 - d) / 9; // linear damping
  return clampD(W[7] * initDifficulty(4) + (1 - W[7]) * next); // mean reversion towards Easy's start
}

function recallStability(d: number, s: number, r: number, rating: Rating): number {
  const hard = rating === 2 ? W[15] : 1;
  const easy = rating === 4 ? W[16] : 1;
  return s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * hard * easy);
}

function forgetStability(d: number, s: number, r: number): number {
  const sMin = s / Math.exp(W[17] * W[18]);
  return Math.min(W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]), sMin);
}

function shortTermStability(s: number, rating: Rating): number {
  let inc = Math.exp(W[17] * (rating - 3 + W[18])) * Math.pow(s, -W[19]);
  if (rating >= 3) inc = Math.max(inc, 1);
  return s * inc;
}

/** One review: the memory after rating it at time `at`. */
export function review(memory: Memory | null, rating: Rating, at: number): Memory {
  if (!memory) return { stability: initStability(rating), difficulty: initDifficulty(rating), last: at, reviews: 1, lapses: rating === 1 ? 1 : 0 };
  const elapsed = Math.max(0, (at - memory.last) / DAY);
  const r = retrievability(elapsed, memory.stability);
  const stability = elapsed < 1 ? shortTermStability(memory.stability, rating)
    : rating === 1 ? forgetStability(memory.difficulty, memory.stability, r)
    : recallStability(memory.difficulty, memory.stability, r, rating);
  return {
    stability: round2(stability), difficulty: nextDifficulty(memory.difficulty, rating), last: at,
    reviews: memory.reviews + 1, lapses: memory.lapses + (rating === 1 ? 1 : 0),
  };
}

/** When the next review is due (ms). */
export const dueAt = (m: Memory) => m.last + intervalDays(m.stability) * DAY;

/** The chance the student recalls it now. */
export const recallNow = (m: Memory, now: number) => retrievability(Math.max(0, (now - m.last) / DAY), m.stability);
