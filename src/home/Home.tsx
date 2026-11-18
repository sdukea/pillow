import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PROBLEMS, type Problem } from "../content/problems";
import { matchProblems } from "../lib/match";
import { migrateRecents, removeFromShelf, useShelf } from "../lib/shelf";

interface Props {
  onOpen: (slug: string) => void;
  onExplain: (query: string) => void;
}

export function Home({ onOpen, onExplain }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const shelf = useShelf();
  const titles = useMemo(() => Object.fromEntries(PROBLEMS.map((p) => [p.slug, p.title])), []);

  useEffect(() => { document.title = "Pillow"; migrateRecents(titles); input.current?.focus(); }, [titles]);

  const matches = matchProblems(query);
  const typed = query.trim();
  // Every suggestion, then "Explain …" for anything not already here.
  const options: ({ kind: "open"; p: Problem } | { kind: "explain" })[] = [
    ...matches.map((p) => ({ kind: "open" as const, p })),
    ...(typed ? [{ kind: "explain" as const }] : []),
  ];
  const choose = (i: number) => {
    const o = options[i];
    if (!o) return;
    if (o.kind === "open") onOpen(o.p.slug);
    else onExplain(typed);
  };

  return (
    <main className="home">
      <header className="home-hero">
        <h1 className="wordmark">Pillow</h1>
        <p className="home-sub">Paste any LeetCode problem. Watch how to solve it.</p>
      </header>

      <form
        className="ask"
        role="search"
        onSubmit={(e) => { e.preventDefault(); choose(active); }}
      >
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-label="A LeetCode problem: its name, number, link or text"
          aria-expanded={options.length > 0}
          aria-controls={listId}
          aria-activedescendant={options.length ? `${listId}-${active}` : undefined}
          placeholder="Two Sum, 217, or a link"
          value={query}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
          }}
        />
        {options.length > 0 && (
          <ul className="suggestions" id={listId} role="listbox" aria-label="Suggestions">
            {options.map((o, i) => (
              <li
                key={o.kind === "open" ? o.p.slug : "explain"}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? "is-active" : ""}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); choose(i); }}
              >
                {o.kind === "open" ? (
                  <><span className="sg-num">{o.p.leetcode.number}</span><span className="sg-title">{o.p.title}</span><span className="sg-meta">Ready to watch</span></>
                ) : (
                  <><span className="sg-num">+</span><span className="sg-title">Explain “{typed.length > 60 ? `${typed.slice(0, 60)}…` : typed}”</span><span className="sg-meta">New</span></>
                )}
              </li>
            ))}
          </ul>
        )}
      </form>

      {shelf.length > 0 ? (
        <section className="shelf" aria-labelledby="shelf-title">
          <h2 id="shelf-title">Shelf</h2>
          <ul className="shelf-list">
            {shelf.map((item) => {
              const p = PROBLEMS.find((x) => x.slug === item.slug);
              return (
                <li key={item.slug}>
                  <button type="button" className="shelf-row" onClick={() => onOpen(item.slug)}>
                    <span className="shelf-title">{item.title}</span>
                    {p && <span className="shelf-meta">{p.pattern} · {p.approaches.map((a) => a.name).join(" → ")}</span>}
                  </button>
                  <button type="button" className="shelf-remove" onClick={() => removeFromShelf(item.slug)} aria-label={`Remove ${item.title} from Shelf`}>
                    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15" /></svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="shelf-empty">
          <p>Films you watch are saved here.</p>
          <p className="try">
            Try{" "}
            {PROBLEMS.slice(0, 3).map((p, i) => (
              <span key={p.slug}>{i > 0 && " · "}<button type="button" className="link" onClick={() => onOpen(p.slug)}>{p.title}</button></span>
            ))}
          </p>
        </section>
      )}
    </main>
  );
}
