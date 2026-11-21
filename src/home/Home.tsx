import { useEffect, useId, useRef, useState } from "react";
import { PROBLEMS, type Problem } from "../content/problems";
import { matchProblems } from "../lib/match";
import { markRecalled, migrateOld, type Note, removeNote, useNotes } from "../lib/notes";
import { record, useEvidence } from "../knowledge/evidence";
import { assess, summarize } from "../knowledge/model";
import { recallFor } from "../knowledge/questions";
import { recommend } from "../knowledge/recommend";

interface Props {
  onOpen: (slug: string) => void;
  onExplain: (query: string) => void;
  onMap: () => void;
  onRoadmap: () => void;
}

export function Home({ onOpen, onExplain, onMap, onRoadmap }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const notes = useNotes();
  const log = useEvidence();
  const states = assess(log);
  const counts = summarize(states);
  const next = recommend(PROBLEMS, states)[0];
  const started = log.length > 0;

  useEffect(() => { document.title = "Pillow"; migrateOld(PROBLEMS); input.current?.focus(); }, []);

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

      {next && (
        <section className="home-next" aria-label="What to do next">
          <button type="button" className="next-row" onClick={() => onOpen(next.problem.slug)}>
            <span className="next-kind">{next.kind === "fix" ? "Fix" : next.kind === "review" ? "Review" : started ? "Next" : "Start here"}</span>
            <span className="next-title">{next.problem.title}</span>
            <span className="next-why">{next.reason}</span>
          </button>
          <button type="button" className="map-link" onClick={onRoadmap}>
            <span>Your 16-week roadmap</span>
            <span className="muted">From arrays to dynamic programming</span>
          </button>
          {started && (
            <button type="button" className="map-link" onClick={onMap}>
              <span>Your map</span>
              <span className="muted">{counts.understood} understood · {counts.learning} learning{counts.shaky ? ` · ${counts.shaky} shaky` : ""}{counts.due ? ` · ${counts.due} to review` : ""}</span>
            </button>
          )}
        </section>
      )}

      {notes.length > 0 ? (
        <section className="notes" aria-labelledby="notes-title">
          <h2 id="notes-title">Notes</h2>
          <ul className="note-list">
            {notes.map((n, i) => <NoteRow key={n.slug} note={n} seed={i + log.length} onOpen={() => onOpen(n.slug)} />)}
          </ul>
        </section>
      ) : (
        <section className="shelf-empty">
          <p>Every problem you learn leaves a note here.</p>
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

/**
 * A note hides its trick until you try to remember it: pick the right trick from three. That's
 * recall, not rereading, and it's evidence: a right pick strengthens the concepts behind the trick,
 * a wrong one marks them shaky.
 */
function NoteRow({ note, seed, onOpen }: { note: Note; seed: number; onOpen: () => void }) {
  const problem = PROBLEMS.find((p) => p.slug === note.slug);
  // Frozen when asked: recording the answer changes the log, and the choices must not reshuffle
  // under the student's finger.
  const [question, setQuestion] = useState<ReturnType<typeof recallFor>>(null);
  const [asking, setAsking] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const shown = picked !== null || (asking && !question);
  const pick = (i: number) => {
    if (!question || !problem) return;
    setPicked(i);
    markRecalled(note.slug);
    const fast = problem.approaches.at(-1)!;
    record({ task: "recall", problem: problem.slug, approach: fast.id, concepts: problem.lesson!.approaches[fast.id].concepts, correct: question.choices[i].correct, detail: "recalled the trick" });
  };
  return (
    <li className={`note-row ${shown ? "shown" : ""}`}>
      <div className="note-head">
        <button type="button" className="note-title" onClick={onOpen}>{note.title}</button>
        <button type="button" className="note-remove" onClick={() => removeNote(note.slug)} aria-label={`Remove the note for ${note.title}`}>
          <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15" /></svg>
        </button>
      </div>
      {!asking && picked === null ? (
        <button type="button" className="recall" onClick={() => { setQuestion(problem ? recallFor(problem, PROBLEMS, seed) : null); setAsking(true); }}>What’s the trick? <span>Recall it</span></button>
      ) : question && picked === null ? (
        <div className="recall-choices" role="group" aria-label={question.prompt}>
          {question.choices.map((c, i) => <button key={c.label} type="button" className="choice" onClick={() => pick(i)}>{c.label}</button>)}
        </div>
      ) : (
        <p className="note-body">
          {question && picked !== null && <span className={`ask-verdict ${question.choices[picked].correct ? "right" : "wrong"}`}>{question.choices[picked].correct ? "Right." : "Not quite. It’s:"}</span>}
          <span className="note-trick">{note.trick}</span><span className="note-spot">{note.recognize}</span>
        </p>
      )}
    </li>
  );
}
