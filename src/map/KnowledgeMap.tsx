import { useEffect, useMemo, useState } from "react";
import { PROBLEMS, type Problem } from "../content/problems";
import { CONCEPTS, type ConceptId, conceptById, depthOf } from "../knowledge/concepts";
import { DIMENSIONS, dimensionsOf, type DimensionLevel } from "../knowledge/dimensions";
import { MISCONCEPTIONS } from "../knowledge/misconceptions";
import { useEvidence } from "../knowledge/evidence";
import { assess, type ConceptState, type State, summarize } from "../knowledge/model";
import { recommend } from "../knowledge/recommend";

// The student's knowledge map: every concept, laid out by what it builds on, coloured by what the
// evidence shows. Tap a concept to see why it's in that state and what to practise.

export const STATE_LABEL: Record<State, string> = { unseen: "Not met yet", seen: "Seen", learning: "Learning", shaky: "Needs work", understood: "Understood" };
const DIM_LABEL: Record<DimensionLevel, string> = { none: "Not yet", emerging: "Started", solid: "Solid", slipping: "Slipping" };
const DIM_MARK: Record<DimensionLevel, string> = { none: "○", emerging: "◐", solid: "●", slipping: "!" };
const COL = 190, ROW = 58, PAD = 28;

interface Props { onOpen: (slug: string) => void; onHome: () => void; initial?: string | null }

export function KnowledgeMap({ onOpen, onHome, initial }: Props) {
  const log = useEvidence();
  const states = useMemo(() => assess(log), [log]);
  const counts = summarize(states);
  const layout = useMemo(layoutConcepts, []);
  const [selected, setSelected] = useState<ConceptId | null>(initial && conceptById.has(initial) ? (initial as ConceptId) : null);
  const [mode, setMode] = useState<"list" | "graph">(() => { try { return localStorage.getItem("pillow.mapMode") === "graph" ? "graph" : "list"; } catch { return "list"; } });
  useEffect(() => { try { localStorage.setItem("pillow.mapMode", mode); } catch { /* a convenience */ } }, [mode]);
  useEffect(() => { if (selected) document.querySelector(".concept")?.scrollIntoView({ block: "nearest" }); }, [selected]);
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

      <div className="map-modes" role="tablist" aria-label="View">
        <button type="button" role="tab" aria-selected={mode === "list"} className={mode === "list" ? "on" : ""} onClick={() => setMode("list")}>List</button>
        <button type="button" role="tab" aria-selected={mode === "graph"} className={mode === "graph" ? "on" : ""} onClick={() => setMode("graph")}>Graph</button>
      </div>

      <div className={`map-body ${selected ? "has-card" : ""}`}>
      <div className="map-main">
      {mode === "list" ? (
        <ConceptList states={states} selected={selected} onPick={setSelected} />
      ) : (
      <>
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
      </>
      )}
      </div>

      {selected ? (
        <ConceptDetail state={states.get(selected)!} states={states} onOpen={onOpen} onPick={setSelected} onClose={() => setSelected(null)} />
      ) : (
        <section className="map-next">
          {recs[0] && (
            <button type="button" className="next-row" onClick={() => onOpen(recs[0].problem.slug)}>
              <span className="next-kind">{recs[0].kind === "fix" ? "Fix" : recs[0].kind === "review" ? "Review" : "Next"}</span>
              <span className="next-title">{recs[0].problem.title}</span>
              <span className="next-why">{recs[0].reason}</span>
            </button>
          )}
          <p className="map-hint">Tap a concept for its reference card: what it is, the key facts, when to use it, common mistakes, and your evidence.</p>
        </section>
      )}
      </div>
    </main>
  );
}

/** Every concept, grouped by where you stand: what needs work comes first. */
function ConceptList({ states, selected, onPick }: { states: Map<ConceptId, ConceptState>; selected: ConceptId | null; onPick: (id: ConceptId) => void }) {
  const groups: { title: string; ids: ConceptId[] }[] = [
    { title: "Needs work", ids: [] }, { title: "Review", ids: [] }, { title: "Learning", ids: [] },
    { title: "Understood", ids: [] }, { title: "Seen", ids: [] }, { title: "Not met yet", ids: [] },
  ];
  for (const c of CONCEPTS) {
    const s = states.get(c.id)!;
    const g = s.state === "shaky" ? 0 : s.state === "understood" ? (s.due ? 1 : 3) : s.state === "learning" ? 2 : s.state === "seen" ? 4 : 5;
    groups[g].ids.push(c.id);
  }
  return (
    <div className="concept-list">
      {groups.filter((g) => g.ids.length).map((g) => (
        <section key={g.title} className="cl-group">
          <h2>{g.title} <span className="muted">{g.ids.length}</span></h2>
          <ul>
            {g.ids.map((id) => {
              const c = conceptById.get(id)!;
              const s = states.get(id)!;
              return (
                <li key={id}>
                  <button type="button" className={`cl-row ${selected === id ? "on" : ""}`} onClick={() => onPick(id)} aria-label={`${c.name}: ${STATE_LABEL[s.state]}`}>
                    <i className={`dot ${s.state}`} aria-hidden="true" />
                    <span className="cl-name">{c.name}</span>
                    <span className="cl-means">{c.means}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** A concept's reference card: everything worth keeping about it, and what you've shown. */
function ConceptDetail({ state, states, onOpen, onPick, onClose }: { state: ConceptState; states: Map<ConceptId, ConceptState>; onOpen: (slug: string) => void; onPick: (id: ConceptId) => void; onClose: () => void }) {
  const c = conceptById.get(state.id)!;
  const teaching = PROBLEMS.filter((p) => conceptsOf(p).includes(state.id));
  const title = (slug: string) => PROBLEMS.find((p) => p.slug === slug)?.title ?? slug;
  const mistakes = MISCONCEPTIONS.filter((m) => m.concept === state.id);
  const shown = new Set(state.misconceptions.map((m) => m.id));
  return (
    <section className="concept" aria-label={c.name}>
      <header className="concept-head">
        <p className={`concept-state ${state.state}`}>{STATE_LABEL[state.state]}{state.due && state.state === "understood" ? " · review due" : ""}</p>
        <button type="button" className="link" onClick={onClose}>Close</button>
      </header>
      <h2>{c.name}</h2>
      <p className="concept-means">{c.means}</p>
      <p className="concept-why">{state.why}</p>

      <h3>What you’ve shown</h3>
      <ul className="dims">
        {dimensionsOf(state).map((d, i) => (
          <li key={d.dimension} className={`dim ${d.level}`}>
            <span className="dim-mark" aria-hidden="true">{DIM_MARK[d.level]}</span>
            <span className="dim-name">{DIMENSIONS[i].name} <span className="dim-level">{DIM_LABEL[d.level]}</span></span>
            <span className="dim-why">{d.why}</span>
          </li>
        ))}
      </ul>

      <h3>Key facts</h3>
      <ul className="facts">{c.facts.map((f) => <li key={f}>{f}</li>)}</ul>

      <h3>Use it when</h3>
      <p className="concept-use">{c.useWhen}</p>

      {mistakes.length > 0 && (
        <>
          <h3>Common mistakes</h3>
          <ul className="mistakes">
            {mistakes.map((m) => <li key={m.id} className={shown.has(m.id) ? "yours" : ""}>Thinking {m.belief}.{shown.has(m.id) && <strong> You made this one.</strong>}</li>)}
          </ul>
        </>
      )}

      <h3>Practise with</h3>
      <div className="concept-practice">
        {teaching.length ? teaching.map((p) => <button key={p.slug} type="button" className="btn-gray" onClick={() => onOpen(p.slug)}>{p.title}</button>)
          : <p className="muted">No problem in the library teaches this yet.</p>}
      </div>

      {c.requires.length > 0 && (
        <>
          <h3>Builds on</h3>
          <p className="concept-requires">{c.requires.map((r, i) => (
            <span key={r}>{i > 0 && ", "}<button type="button" className="link" onClick={() => onPick(r as ConceptId)}>{conceptById.get(r)!.name}</button> <span className="muted">({STATE_LABEL[states.get(r as ConceptId)!.state].toLowerCase()})</span></span>
          ))}</p>
        </>
      )}

      {state.evidence.length > 0 && (
        <>
          <h3>Your evidence</h3>
          <ul className="evidence">
            {state.evidence.slice(0, 8).map((e, i) => (
              <li key={i}>
                <span className={`ev-mark ${e.correct === undefined ? "seen" : e.correct ? "right" : "wrong"}`} aria-label={e.correct === undefined ? "watched" : e.correct ? "right" : "wrong"}>{e.correct === undefined ? "•" : e.correct ? "✓" : "✗"}</span>
                <span className="ev-detail">{e.detail}{e.hinted ? " (with a hint)" : ""}</span>
                <span className="ev-where">{title(e.problem)} · {ago(e.at)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
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
