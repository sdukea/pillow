import { PROBLEMS, type Problem } from "../content/problems";

/**
 * Problems that match what someone typed: a LeetCode link, a number, or words from the title.
 * Most specific first.
 */
export function matchProblems(query: string): Problem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const slug = q.match(/leetcode\.com\/problems\/([a-z0-9-]+)/)?.[1];
  if (slug) return PROBLEMS.filter((p) => p.leetcode.slug === slug);
  const num = q.replace(/^#/, "").match(/^\d+$/)?.[0];
  if (num) return PROBLEMS.filter((p) => String(p.leetcode.number) === num);
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 1);
  const score = (p: Problem) => {
    const title = p.title.toLowerCase();
    if (title === q) return 100;
    if (title.startsWith(q)) return 50;
    const hits = words.filter((w) => title.includes(w)).length;
    return hits === words.length ? 20 + hits : hits >= 2 ? hits : 0;
  };
  return PROBLEMS.map((p) => [p, score(p)] as const).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([p]) => p).slice(0, 6);
}
