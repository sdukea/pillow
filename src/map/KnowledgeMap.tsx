import { useEffect, useMemo, useState } from "react";
import { PROBLEMS, type Problem } from "../content/problems";
import { CONCEPTS, type ConceptId, conceptById, depthOf } from "../knowledge/concepts";
import { useEvidence } from "../knowledge/evidence";
import { assess, type ConceptState, type State, summarize } from "../knowledge/model";
import { recommend } from "../knowledge/recommend";

// The student's knowledge map: every concept, laid out by what it builds on, coloured by what the
// evidence shows. Tap a concept to see why it's in that state and what to practise.

export const STATE_LABEL: Record<State, string> = { unseen: "Not yet", seen: "Seen", learning: "Learning", shaky: "Shaky", understood: "Understood" };
const COL = 190, ROW = 58, PAD = 28;

interface Props { onOpen: (slug: string) => void; onHome: () => void }

export function KnowledgeMap({ onOpen, onHome }: Props) {
  const log = useEvidence();
  const states = useMemo(() => assess(log), [log]);
  const counts = summarize(states);
  const layout = useMemo(layoutConcepts, []);
  const [selected, setSelected] = useState<ConceptId | null>(null);
  const recs = useMemo(() => recommend(PROBLEMS, states), [states]);
  useEffect(() => { document.title = "Your Map · Pillow"; }, []);

  return (
    <main className="kmap">
      <header className="map-top">
        <button type="button" className="glass-circle" onClick={onHome} aria-label="Back to search">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
        </button>
        <div>
          <h1>Your Map</h1>
          <p className="map-sub">{counts.understood} understood · {counts.learning} learning · {counts.shaky} shaky{counts.due ? ` · ${counts.due} to review` : ""}</p>
        </div>
      </header>

      <div className="map-legend" aria-hidden="true">
        {(["understood", "learning", "shaky", "seen", "unseen"] as State[]).map((s) => <span key={s}><i className={`dot ${s}`} />{STATE_LABEL[s]}</span>)}
      </div>

      <div className="map-scroll">
        <svg className="map-graph" width={layout.width} height={layout.height} role="group" aria-label="Concepts and what they build on">
          {layout.edges.map((e) => {
            const a = layout.pos.get(e.from)!, b = layout.pos.get(e.to)!;
            const lit = selected && (e.from === selected || e.to === selected);
            return <path key={`${e.from}-${e.to}`} className={`map-edge ${lit ? "lit" : ""}`} d={`M${a.x + 10},${a.y} C${a.x + COL / 2},${a.y} ${b.x - COL / 2},${b.y} ${b.x - 10},${b.y}`} />;
          })}
          {CONCEPTS.map((c) => {
            const p = layout.pos.get(c.id)!;
            const s = states.get(c.id)!;
            return (
              <g key={c.id} className={`map-node ${s.state} ${s.due && s.state === "understood" ? "due" : ""} ${selected === c.id ? "selected" : ""}`} transform={`translate(${p.x} ${p.y})`}
                role="button" tabIndex={0} aria-label={`${c.name}: ${STATE_LABEL[s.state]}${s.due && s.state === "understood" ? ", review due" : ""}`}
                onClick={() => setSelected(c.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(c.id); } }}>
                <circle r="9" />
                <text x="16" dy="4">{c.name}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {selected ? (
        <ConceptDetail state={states.get(selected)!} states={states} onOpen={onOpen} onPick={setSelected} />
      ) : (
        <section className="map-next">
          {recs[0] && (
            <button type="button" className="next-row" onClick={() => onOpen(recs[0].problem.slug)}>
              <span className="next-kind">{recs[0].kind === "fix" ? "Fix" : recs[0].kind === "review" ? "Review" : "Next"}</span>
              <span className="next-title">{recs[0].problem.title}</span>
              <span className="next-why">{recs[0].reason}</span>
            </button>
          )}
          <p className="map-hint">Tap a concept to see what you’ve shown about it.</p>
        </section>
      )}
    </main>
  );
}

function ConceptDetail({ state, states, onOpen, onPick }: { state: ConceptState; states: Map<ConceptId, ConceptState>; onOpen: (slug: string) => void; onPick: (id: ConceptId) => void }) {
  const c = conceptById.get(state.id)!;
  const teaching = PROBLEMS.filter((p) => conceptsOf(p).includes(state.id));
  const title = (slug: string) => PROBLEMS.find((p) => p.slug === slug)?.title ?? slug;
  return (
    <section className="concept" aria-label={c.name}>
      <p className={`concept-state ${state.state}`}>{STATE_LABEL[state.state]}{state.due && state.state === "understood" ? " · review due" : ""}</p>
      <h2>{c.name}</h2>
      <p className="concept-means">{c.means}</p>
      <p className="concept-why">{state.why}</p>
      {state.evidence.length > 0 && (
        <ul className="evidence">
          {state.evidence.slice(0, 6).map((e, i) => (
            <li key={i}>
              <span className={`ev-mark ${e.correct === undefined ? "seen" : e.correct ? "right" : "wrong"}`} aria-label={e.correct === undefined ? "watched" : e.correct ? "right" : "wrong"}>{e.correct === undefined ? "•" : e.correct ? "✓" : "✗"}</span>
              <span className="ev-detail">{e.detail}</span>
              <span className="ev-where">{title(e.problem)} · {ago(e.at)}</span>
            </li>
          ))}
        </ul>
      )}
      {c.requires.length > 0 && (
        <p className="concept-requires">Builds on {c.requires.map((r, i) => (
          <span key={r}>{i > 0 && ", "}<button type="button" className="link" onClick={() => onPick(r as ConceptId)}>{conceptById.get(r)!.name}</button> <span className="muted">({STATE_LABEL[states.get(r as ConceptId)!.state].toLowerCase()})</span></span>
        ))}</p>
      )}
      <div className="concept-practice">
        {teaching.length ? teaching.map((p) => <button key={p.slug} type="button" className="btn-gray" onClick={() => onOpen(p.slug)}>Practise with {p.title}</button>)
          : <p className="muted">No problem in the library teaches this yet.</p>}
      </div>
    </section>
  );
}

export const conceptsOf = (p: Problem): ConceptId[] => [...new Set(p.approaches.flatMap((a) => p.lesson?.approaches[a.id]?.concepts ?? []))];

function ago(t: number): string {
  const m = Math.round((Date.now() - t) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/** Columns by prerequisite depth; within a column, ordered near the concepts they build on. */
function layoutConcepts() {
  const cols = new Map<number, ConceptId[]>();
  for (const c of CONCEPTS) {
    const d = depthOf(c.id);
    cols.set(d, [...(cols.get(d) ?? []), c.id]);
  }
  const row = new Map<ConceptId, number>();
  const depths = [...cols.keys()].sort((a, b) => a - b);
  for (const d of depths) {
    const ids = cols.get(d)!;
    const bary = (id: ConceptId) => {
      const req = conceptById.get(id)!.requires.map((r) => row.get(r as ConceptId) ?? 0);
      return req.length ? req.reduce((a, b) => a + b, 0) / req.length : ids.indexOf(id);
    };
    ids.sort((a, b) => bary(a) - bary(b));
    ids.forEach((id, i) => row.set(id, i));
  }
  const maxRows = Math.max(...[...cols.values()].map((x) => x.length));
  const pos = new Map<ConceptId, { x: number; y: number }>();
  for (const d of depths) {
    const ids = cols.get(d)!;
    const offset = ((maxRows - ids.length) * ROW) / 2;
    ids.forEach((id, i) => pos.set(id, { x: PAD + d * COL, y: PAD + offset + i * ROW }));
  }
  const edges = CONCEPTS.flatMap((c) => c.requires.map((r) => ({ from: r as ConceptId, to: c.id as ConceptId })));
  return { pos, edges, width: PAD * 2 + (depths.length - 1) * COL + 220, height: PAD * 2 + (maxRows - 1) * ROW };
}
