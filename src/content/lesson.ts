// The lesson format: everything a problem needs beyond its code and visualization spec.
// Prose fields support `code` and **bold**.

import type { GrowthClass } from "../../engine/analysis/growth";
import type { Arg } from "../../engine/tracer/types";
import type { ConceptId } from "../knowledge/concepts";

/** An optional, ungraded question that asks the learner to commit to an idea. */
export interface Check {
  question: string;
  options: string[];
  answer: number;
  /** Why the answer is right, shown after any choice. */
  explain: string;
}

/** What one line does. Every line that runs needs one; the build fails otherwise. */
export interface LineNote {
  what: string;
  why: string;
  /** Variables or structures the line changes. Omit for lines that only read. */
  affects?: string;
  /** What would go wrong without the line, or with a tempting variation of it. */
  ifRemoved: string;
}

export interface Complexity {
  /** The class the measurements must match. */
  time: GrowthClass;
  space: GrowthClass;
  /**
   * How to show it, when the class alone would mislead. For example recursion on trees uses
   * O(h) memory: measured on a balanced tree that's O(log n), but a lopsided tree reaches O(n).
   */
  timeLabel?: string;
  spaceLabel?: string;
  /** The operation we count, in plain words, e.g. "comparisons of two numbers". */
  counted: string;
  timeWhy: string;
  spaceWhy: string;
}

export interface ApproachLesson {
  /** The concepts this approach exercises (ids from src/knowledge/concepts.ts). */
  concepts: ConceptId[];
  /** Chapter heading, e.g. "Check every pair". */
  headline: string;
  intuition: string;
  /** How someone might come up with this approach themselves. */
  discovery: string;
  /** The algorithm in plain English, one step per item. */
  steps: string[];
  /** For a better approach: the reasoning that leads to it from the previous one. */
  insight?: {
    inefficiency: string;
    repeatedWork: string;
    observation: string;
    technique: string;
    whyItWorks: string;
    tradeoffs: string;
  };
  notes: Record<number, LineNote>;
  complexity: Complexity;
  /** For brute force: why we can't stop here. */
  whyNotEnough?: string;
  check?: Check;
}

/**
 * The whole idea, sharp enough to keep: what the slow way does, what it wastes, the trick, and how
 * to spot the pattern next time. Each line is short (the build enforces it). This is what the
 * learn screen shows and what goes into the learner's note.
 */
export interface Card {
  /** The slow way, as an instruction: "Try every pair of numbers." */
  slow: string;
  /** What it wastes: "Each number gets paired with every other one." */
  waste: string;
  /** The trick, in one or two short sentences. */
  trick: string;
  /** How to recognise the pattern: "Looking for a pair that adds up? Store what you've seen." */
  recognize: string;
}

export interface Lesson {
  card: Card;
  understand: {
    statement: string;
    inputs: { name: string; meaning: string }[];
    output: string;
    /** A hand-worked walk through the example, one sentence per item. */
    walkthrough: string[];
    constraints: string[];
    /** What the problem is really testing. */
    testing: string;
    check?: Check;
  };
  /** Keyed by approach id, in the order they're taught. */
  approaches: Record<string, ApproachLesson>;
  compare: {
    tradeoffs: string;
    takeaways: string[];
    pattern: { name: string; recognize: string; alsoUsedIn: string[] };
  };
  /**
   * Inputs of growing size used to measure each approach. Sizes should double so growth is easy
   * to read (and to classify). Make the input a worst case for the approaches being compared.
   */
  growth: {
    sizes: number[];
    spaceSizes: number[];
    input: (n: number) => Arg[];
    /** What the input of size n looks like, finishing "Each point is a real run on …". */
    describe: string;
  };
  /**
   * Inputs that exercise rarely-run lines (no answer, an empty list). The build traces them,
   * validates narration on them, and counts their lines as lines that need explanations.
   */
  edgeCases: Arg[][];
}
