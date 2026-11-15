import { useMemo, useState } from "react";
import { PROBLEMS, type Pattern, type Problem } from "../content/problems";

const RECENT_KEY = "leetsee.recent";

export function recentSlugs(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function rememberVisit(slug: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([slug, ...recentSlugs().filter((s) => s !== slug)].slice(0, 4)));
  } catch { /* storage unavailable: recents just won't show */ }
}

const ORDER: Pattern[] = ["Hashing", "Stack", "Binary search", "Sliding window", "Linked list", "Trees and recursion"];

export function Home({ onOpen }: { onOpen: (p: Problem) => void }) {
  const [query, setQuery] = useState("");
  const recent = useMemo(() => recentSlugs().map((s) => PROBLEMS.find((p) => p.slug === s)).filter(Boolean) as Problem[], []);
  const q = query.trim().toLowerCase();
  const matches = PROBLEMS.filter((p) => !q || p.title.toLowerCase().includes(q) || String(p.leetcode.number) === q || p.pattern.toLowerCase().includes(q));

  const Row = ({ p }: { p: Problem }) => (
    <li>
      <button type="button" className="row" onClick={() => onOpen(p)}>
        <span className="row-num">{p.leetcode.number}</span>
        <span className="row-main">
          <span className="row-title">{p.title}</span>
          <span className="row-summary">{p.summary}</span>
        </span>
        <span className="row-approaches">{p.approaches.map((a) => a.name).join(" → ")}</span>
      </button>
    </li>
  );

  return (
    <div className="home">
      <header className="home-head">
        <h1>LeetSee</h1>
        <p>Don’t just see the answer. See how it thinks.</p>
      </header>
      <label className="search">
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
        <span className="sr-only">Search problems</span>
        <input id="search" type="search" placeholder="Search by name, number or pattern" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
      </label>

      {!q && recent.length > 0 && (
        <section className="group">
          <h2>Recently explored</h2>
          <ul className="rows">{recent.map((p) => <Row key={p.slug} p={p} />)}</ul>
        </section>
      )}

      {q ? (
        <section className="group">
          <h2>{matches.length ? `${matches.length} result${matches.length > 1 ? "s" : ""}` : "No problems match"}</h2>
          <ul className="rows">{matches.map((p) => <Row key={p.slug} p={p} />)}</ul>
        </section>
      ) : (
        ORDER.map((pattern) => {
          const list = PROBLEMS.filter((p) => p.pattern === pattern);
          return list.length ? (
            <section key={pattern} className="group">
              <h2>{pattern}</h2>
              <ul className="rows">{list.map((p) => <Row key={p.slug} p={p} />)}</ul>
            </section>
          ) : null;
        })
      )}
    </div>
  );
}
