import { useEffect, useMemo, useRef, useState } from "react";
import type { Problem } from "../content/problems";
import { Rich } from "../lesson/Rich";
import { prepare } from "../../engine/interpreter/viewmodel";
import { growthOf, preparedFor, sourceOf } from "../lib/data";
import { saveToShelf, useShelf } from "../lib/shelf";
import { Canvas } from "../views/Canvas";
import { CodePane } from "../workspace/CodePane";
import { BEAT, buildFilm, runPacing, type Scene, sceneMs } from "./film";
import { useFilm } from "./useFilm";

interface Props {
  problem: Problem;
  onHome: () => void;
  onLesson: () => void;
  onAnother: () => void;
}

/** Plays a problem's lesson as a film: it starts on its own, and every control is optional. */
export function FilmPlayer({ problem, onHome, onLesson, onAnother }: Props) {
  const film = useMemo(() => buildFilm(problem, growthOf(problem)), [problem]);
  const runs = useMemo(() => Object.fromEntries(film.scenes.filter((s) => s.kind === "run").map((s) => [s.id, preparedFor(problem, s.approach)])), [film, problem]);
  const durations = useMemo(() => film.scenes.map((s) => sceneMs(s, s.kind === "run" ? runs[s.id].moments.length : undefined)), [film, runs]);
  const reduced = useMemo(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const clock = useFilm(durations);
  const [showCode, setShowCode] = useState(false);
  const shelf = useShelf();
  const saved = shelf.some((x) => x.slug === problem.slug);
  const scene = film.scenes[clock.scene];

  useEffect(() => { document.title = `${problem.title} · Pillow`; }, [problem]);
  // Reaching the last scene puts the film on the shelf.
  useEffect(() => { if (clock.scene === film.scenes.length - 1) saveToShelf(problem.slug, problem.title); }, [clock.scene, film.scenes.length, problem]);

  // Keyboard: Space plays or pauses, ← and → move between scenes, C shows the code, Escape goes home.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : document.body;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, select")) return;
      if (e.key === " " && !el.closest("button")) { e.preventDefault(); clock.toggle(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); clock.go(clock.scene + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); clock.go(clock.scene - 1); }
      else if (e.key === "c" || e.key === "C") setShowCode((v) => !v);
      else if (e.key === "Escape") onHome();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [clock, onHome]);

  return (
    <div className={`film ${showCode && scene.kind === "run" ? "with-code" : ""} ${reduced ? "reduced" : ""}`}>
      <header className="film-top">
        <button type="button" className="glass-circle" onClick={onHome} aria-label="Back to search">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
        </button>
        <nav className="film-progress" aria-label="Scenes">
          {film.scenes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="seg"
              aria-label={`Scene ${i + 1}: ${sceneLabel(s)}`}
              aria-current={i === clock.scene ? "step" : undefined}
              onClick={() => clock.go(i)}
            >
              <span style={{ transform: `scaleX(${i < clock.scene ? 1 : i > clock.scene ? 0 : Math.min(1, clock.elapsed / durations[i])})` }} />
            </button>
          ))}
        </nav>
        <button type="button" className="text-btn" onClick={onLesson}>Full Lesson</button>
      </header>

      <main className="film-stage" aria-live="polite">
        <div key={scene.id} className="scene">
          <SceneView scene={scene} elapsed={clock.elapsed} prepared={scene.kind === "run" ? runs[scene.id] : scene.kind === "question" ? runs["run-obvious"] : undefined} showCode={showCode} />
        </div>
        {clock.ended && (
          <div className="end-actions">
            <p className="end-note">Saved to Shelf</p>
            <button type="button" className="btn-filled" onClick={onAnother}>Explain Another</button>
            <button type="button" className="btn-gray" onClick={clock.toggle}>Watch Again</button>
          </div>
        )}
      </main>

      <footer className="film-controls glass" role="toolbar" aria-label="Playback">
        <button type="button" className="ctl" onClick={() => clock.go(clock.scene - 1)} disabled={clock.scene === 0} aria-label="Previous scene">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
        </button>
        <button type="button" className={`ctl play ${clock.ended ? "quiet" : ""}`} onClick={clock.toggle} aria-label={clock.playing ? "Pause" : clock.ended ? "Watch again" : "Play"}>
          {clock.playing
            ? <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M7 4.5v11M13 4.5v11" /></svg>
            : <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path className="solid" d="M6.5 4.2 15.5 10l-9 5.8z" /></svg>}
        </button>
        <button type="button" className="ctl" onClick={() => clock.go(clock.scene + 1)} disabled={clock.scene === film.scenes.length - 1} aria-label="Next scene">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" /></svg>
        </button>
        <span className="ctl-sep" aria-hidden="true" />
        <button type="button" className="ctl" onClick={() => setShowCode((v) => !v)} aria-pressed={showCode} aria-label="Show code (C)" title="Show code (C)">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="m7 6-4 4 4 4M13 6l4 4-4 4" /></svg>
        </button>
        <button type="button" className="ctl" onClick={() => saveToShelf(problem.slug, problem.title)} aria-pressed={saved} aria-label={saved ? "Saved to Shelf" : "Save to Shelf"} title={saved ? "Saved to Shelf" : "Save to Shelf"}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path className={saved ? "solid" : ""} d="M6 3.5h8v13l-4-3-4 3z" /></svg>
        </button>
      </footer>
    </div>
  );
}

function sceneLabel(s: Scene): string {
  switch (s.kind) {
    case "question": return "The question";
    case "idea": return s.eyebrow;
    case "run": return `Watch: ${s.approach.name}`;
    case "race": return "Side by side";
    case "remember": return "Remember";
  }
}

function SceneView({ scene, elapsed, prepared, showCode }: { scene: Scene; elapsed: number; prepared?: ReturnType<typeof preparedFor>; showCode: boolean }) {
  switch (scene.kind) {
    case "question":
      return <QuestionScene scene={scene} prepared={prepared!} />;
    case "idea":
      return (
        <section className="sc-idea">
          <p className="eyebrow">{scene.eyebrow}</p>
          <h1 className="sc-headline"><Rich text={scene.headline} /></h1>
          <p className="sc-body reveal-2"><Rich text={scene.body} /></p>
        </section>
      );
    case "run":
      return <RunScene scene={scene} elapsed={elapsed} prepared={prepared!} showCode={showCode} />;
    case "race":
      return <RaceScene scene={scene} elapsed={elapsed} />;
    case "remember":
      return (
        <section className="sc-idea">
          <p className="eyebrow">Remember</p>
          <h1 className="sc-headline">{scene.pattern}</h1>
          <p className="sc-body reveal-2"><Rich text={scene.recognize} /></p>
          {scene.takeaway && <p className="sc-body muted reveal-3"><Rich text={scene.takeaway} /></p>}
        </section>
      );
  }
}

function QuestionScene({ scene, prepared }: { scene: Extract<Scene, { kind: "question" }>; prepared: ReturnType<typeof preparedFor> }) {
  // The inputs, drawn from the real trace's first step: the same data the film then runs on.
  const views = useMemo(() => prepare(prepared.trace, scene.picture).view(0).views, [prepared, scene]);
  return (
    <section className="sc-question">
      <p className="eyebrow">{scene.title}</p>
      <h1 className="sc-headline"><Rich text={scene.statement} /></h1>
      <div className="sc-canvas reveal-2"><Canvas views={views} /></div>
      <p className="sc-body reveal-3"><Rich text={scene.output} /></p>
    </section>
  );
}

function RunScene({ scene, elapsed, prepared, showCode }: { scene: Extract<Scene, { kind: "run" }>; elapsed: number; prepared: ReturnType<typeof preparedFor>; showCode: boolean }) {
  const pacing = useMemo(() => runPacing(prepared.moments.length), [prepared]);
  let t = elapsed, index = 0;
  while (index < pacing.length - 1 && t >= pacing[index]) { t -= pacing[index]; index++; }
  const view = prepared.view(index);
  const fast = pacing[index] < BEAT;
  const step = prepared.trace.steps[prepared.moments[index].stepIndex];
  const source = useMemo(() => sourceOf(scene.approach), [scene.approach]);
  const captionRef = useRef(view.narration);
  if (!fast) captionRef.current = view.narration ?? captionRef.current;

  return (
    <section className="sc-run">
      <div className="sc-run-main">
        <p className="eyebrow">{scene.eyebrow}</p>
        <div className="sc-canvas"><Canvas views={view.views} /></div>
        <p className={`caption ${fast ? "is-fast" : ""}`}>
          {view.final
            ? <>{view.narration ?? "Done."} <span className="caption-result">Returned {view.returned ?? "nothing"}</span></>
            : fast ? <>Fast-forwarding through the repetitive part…</> : captionRef.current ?? " "}
        </p>
        <p className="step-count">Step {index + 1} of {prepared.moments.length}{fast ? " · ⏩" : ""}</p>
      </div>
      {showCode && (
        <div className="sc-code">
          <CodePane source={source} ranLine={view.ranLine} nextLine={view.nextLine} step={step} />
        </div>
      )}
    </section>
  );
}

function RaceScene({ scene, elapsed }: { scene: Extract<Scene, { kind: "race" }>; elapsed: number }) {
  const max = Math.max(1, ...scene.rows.map((r) => r.value));
  const grow = Math.min(1, elapsed / 2500);
  return (
    <section className="sc-race">
      <p className="eyebrow">{scene.eyebrow}</p>
      <h1 className="sc-headline">{scene.headline}</h1>
      <ul className="race">
        {scene.rows.map((r) => (
          <li key={r.name}>
            <span className="race-name">{r.name} <code>{r.complexity}</code></span>
            <span className="race-bar"><span style={{ transform: `scaleX(${(r.value / max) * grow})` }} /></span>
            <span className="race-num">{Math.round(r.value * grow).toLocaleString()} {scene.unit}</span>
          </li>
        ))}
      </ul>
      <p className="sc-body muted reveal-3">{scene.note}</p>
    </section>
  );
}
