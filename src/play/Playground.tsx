import { useEffect, useMemo, useRef, useState } from "react";
import type { Prepared } from "../../engine/interpreter/viewmodel";
import type { Arg } from "../../engine/tracer/types";
import { parseInputs, toText } from "../content/inputs";
import type { Problem } from "../content/problems";
import { growthOf } from "../lib/data";
import { saveToShelf, useShelf } from "../lib/shelf";
import { Canvas } from "../views/Canvas";
import { InputEditor } from "./InputEditor";
import { useTraces } from "./useTraces";

interface Props { problem: Problem; onHome: () => void; onLesson: () => void }

const TICK = 700;

/**
 * Hands on, not read: the input is objects you move, both approaches race on it side by side,
 * and you drag time and size yourself. Every change re-runs real code.
 */
export function Playground({ problem, onHome, onLesson }: Props) {
  const [args, setArgs] = useState<Arg[]>(problem.example);
  const [history, setHistory] = useState<Arg[][]>([]);
  const [settled, setSettled] = useState<Arg[] | null>(null); // the input being traced (debounced)
  const isExample = JSON.stringify(args) === JSON.stringify(problem.example);
  const invalid = useMemo(() => {
    const r = parseInputs(problem.inputs, problem.inputs.map((f, i) => toText(f, args[i])));
    return r.ok ? null : r.message;
  }, [args, problem.inputs]);

  // Trace after the hands stop moving for a moment, and only valid inputs.
  useEffect(() => {
    if (invalid) return;
    const t = setTimeout(() => setSettled(isExample ? null : args), 250);
    return () => clearTimeout(t);
  }, [args, invalid, isExample]);

  const traced = useTraces(problem, settled);
  const lanes = traced.lanes;
  const longest = Math.max(...lanes.map((l) => l.moments.length));
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const shelf = useShelf();
  const saved = shelf.some((x) => x.slug === problem.slug);

  useEffect(() => { document.title = `${problem.title} · Pillow`; }, [problem]);
  // New traces: start the race again from the top.
  const lanesKey = lanes.map((l) => l.moments.length).join(",") + (traced.status === "ready" ? JSON.stringify(settled) : "");
  useEffect(() => { setT(0); setPlaying(true); }, [lanesKey]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT((x) => {
      if (x >= longest - 1) { setPlaying(false); return x; }
      return x + 1;
    }), TICK);
    return () => clearInterval(id);
  }, [playing, longest]);
  // Finishing a race puts the problem on the shelf.
  useEffect(() => { if (t >= longest - 1 && longest > 1) saveToShelf(problem.slug, problem.title); }, [t, longest, problem]);

  const change = (next: Arg[]) => { setHistory((h) => [...h.slice(-30), args]); setArgs(next); };
  const undo = () => { const prev = history.at(-1); if (prev) { setHistory((h) => h.slice(0, -1)); setArgs(prev); } };

  // Keyboard: Space plays, ← → step through time.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : document.body;
      if (e.metaKey || e.ctrlKey || el.closest("input, textarea, .editor, button")) return;
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === "ArrowRight") { e.preventDefault(); setPlaying(false); setT((x) => Math.min(longest - 1, x + 1)); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setPlaying(false); setT((x) => Math.max(0, x - 1)); }
      else if (e.key === "Escape") onHome();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [longest, onHome]);

  return (
    <div className="playground">
      <header className="play-top">
        <button type="button" className="glass-circle" onClick={onHome} aria-label="Back to search">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
        </button>
        <div className="play-title">
          <h1>{problem.title}</h1>
          <p>{problem.summary}</p>
        </div>
        <button type="button" className="glass-circle" onClick={() => saveToShelf(problem.slug, problem.title)} aria-pressed={saved} aria-label={saved ? "Saved to Shelf" : "Save to Shelf"}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path className={saved ? "solid" : ""} d="M6 3.5h8v13l-4-3-4 3z" /></svg>
        </button>
      </header>

      <section className="play-input" aria-label="Input: drag it, change it">
        <InputEditor fields={problem.inputs} args={args} onChange={change} />
        <div className="input-tools">
          <span className={`input-state ${invalid || traced.status === "error" ? "bad" : traced.status === "running" ? "busy" : ""}`} role="status">
            {invalid ?? (traced.status === "error" ? traced.message : traced.status === "running" ? "Running…" : "")}
          </span>
          <button type="button" className="tool" onClick={undo} disabled={!history.length} aria-label="Undo">
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M7 8H13a4 4 0 0 1 0 8H9M7 8l3-3M7 8l3 3" /></svg>
          </button>
          <button type="button" className="tool" onClick={() => change(problem.example)} disabled={isExample} aria-label="Back to the example">
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4 10a6 6 0 1 0 2-4.5M4 4v3h3" /></svg>
          </button>
        </div>
      </section>

      <section className={`lanes ${traced.status === "running" ? "is-running" : ""}`}>
        {problem.approaches.map((a, i) => lanes[i] && (
          <Lane key={a.id} name={a.name} prepared={lanes[i]} t={t} rank={i} finishedFirst={lanes.every((l) => lanes[i].moments.length <= l.moments.length)} />
        ))}
      </section>

      <footer className="timebar glass">
        <button type="button" className="ctl play" onClick={() => { if (t >= longest - 1) setT(0); setPlaying((p) => !(p && t < longest - 1)); }} aria-label={playing ? "Pause" : "Play"}>
          {playing
            ? <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M7 4.5v11M13 4.5v11" /></svg>
            : <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path className="solid" d="M6.5 4.2 15.5 10l-9 5.8z" /></svg>}
        </button>
        <input
          className="time"
          type="range"
          min={0}
          max={Math.max(0, longest - 1)}
          value={Math.min(t, longest - 1)}
          aria-label="Time: drag to move through the run"
          onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }}
          style={{ ["--p" as string]: `${(Math.min(t, longest - 1) / Math.max(1, longest - 1)) * 100}%` }}
        />
        <button type="button" className="text-btn" onClick={onLesson}>Lesson</button>
      </footer>

      <Grow problem={problem} />
    </div>
  );
}

function Lane({ name, prepared, t, rank, finishedFirst }: { name: string; prepared: Prepared; t: number; rank: number; finishedFirst: boolean }) {
  const total = prepared.moments.length;
  const index = Math.min(t, total - 1);
  const view = prepared.view(index);
  const done = t >= total - 1;
  return (
    <article className={`lane ${done ? "done" : ""} ${done && finishedFirst ? "winner" : ""}`} aria-label={name}>
      <header className="lane-head">
        <span className={`lane-chip c${rank}`}>{name}</span>
        <span className="lane-count" aria-label={`${index + 1} of ${total} steps`}>
          <strong>{index + 1}</strong><span>/ {total}</span>
        </span>
      </header>
      <div className="lane-canvas"><Canvas views={view.views} /></div>
      <p className="lane-line">
        {done ? <><span className="lane-done">✓</span> {view.returned ?? "done"}</> : view.narration ?? " "}
      </p>
    </article>
  );
}

/** How the gap grows: drag n, watch the real step counts. */
function Grow({ problem }: { problem: Problem }) {
  const growth = growthOf(problem);
  const [k, setK] = useState(0);
  const touched = useRef(false);
  // Sweep once on arrival so the gap opens up in front of you; stop as soon as someone drags.
  useEffect(() => {
    if (!growth) return;
    let i = 0;
    const id = setInterval(() => { if (touched.current || i >= Math.max(growth.sizes.length, growth.spaceSizes.length) - 1) clearInterval(id); else setK(++i); }, 900);
    return () => clearInterval(id);
  }, [growth]);
  if (!growth || problem.approaches.length < 2) return null;
  // Show what actually differs: steps, or (when both take the same time) memory.
  const cx = problem.approaches.map((a) => problem.lesson?.approaches[a.id]?.complexity);
  const memory = !!cx[0] && cx.every((c) => c?.time === cx[0]!.time);
  const sizes = memory ? growth.spaceSizes : growth.sizes;
  const series = (id: string) => (memory ? growth.approaches[id].space : growth.approaches[id].steps);
  const at = Math.min(k, sizes.length - 1);
  const n = sizes[at];
  const rows = problem.approaches.map((a) => ({ name: a.name, steps: series(a.id)[at] }));
  const max = Math.max(1, ...sizes.map((_, i) => Math.max(...problem.approaches.map((a) => series(a.id)[i]))));
  const ratio = rows[0].steps / Math.max(1, rows.at(-1)!.steps);
  return (
    <section className="grow" aria-label="How it grows">
      <label className="grow-n">
        <span>n = <strong>{n}</strong></span>
        <span className="grow-unit">{memory ? "held in memory" : "steps"}</span>
        <input type="range" min={0} max={sizes.length - 1} value={at} onChange={(e) => { touched.current = true; setK(Number(e.target.value)); }} aria-label="Input size" />
      </label>
      <ul className="grow-bars">
        {rows.map((r, i) => (
          <li key={r.name}>
            <span className={`lane-chip c${i}`}>{r.name}</span>
            <span className="bar"><span className={`c${i}`} style={{ width: `${Math.max(0.6, (r.steps / max) * 100)}%` }} /></span>
            <span className="grow-num">{r.steps.toLocaleString()}</span>
          </li>
        ))}
      </ul>
      {ratio >= 1.5 && <p className="grow-ratio">×{ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)}</p>}
    </section>
  );
}
