import { useEffect, useRef, useState } from "react";
import { Rich } from "../lesson/Rich";
import { explain, type ExplainEvent, loadRemote, serverStatus } from "../lib/remote";

const STAGES = [
  { id: "identify", label: "Reading the problem" },
  { id: "draft", label: "Writing both solutions" },
  { id: "check", label: "Checking it runs" },
  { id: "film", label: "Running them" },
] as const;

type State =
  | { kind: "starting" }
  | { kind: "working"; stage: (typeof STAGES)[number]["id"]; message: string; problem?: { title: string; number: number; statement: string } }
  | { kind: "unavailable" }
  | { kind: "error"; message: string; problem?: { title: string; number: number; statement: string } };

/** A problem that isn't in the library yet: it's explained live, with every stage on screen. */
export function Explain({ query, onOpen, onHome }: { query: string; onOpen: (slug: string) => void; onHome: () => void }) {
  const [state, setState] = useState<State>({ kind: "starting" });
  const [seconds, setSeconds] = useState(0);
  const started = useRef(false);

  useEffect(() => { document.title = "Explaining… · Pillow"; }, []);
  useEffect(() => {
    if (state.kind !== "working") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state.kind]);

  useEffect(() => {
    if (started.current || !query.trim()) return;
    started.current = true;
    const abort = new AbortController();
    (async () => {
      const status = await serverStatus();
      if (!status.reachable || !status.explain) { setState({ kind: "unavailable" }); return; }
      let problem: { title: string; number: number; statement: string } | undefined;
      await explain(query, async (e: ExplainEvent) => {
        if (e.type === "status") setState({ kind: "working", stage: e.stage, message: e.message, problem });
        else if (e.type === "problem") { problem = e; setState((s) => (s.kind === "working" ? { ...s, problem } : s)); }
        else if (e.type === "error") setState({ kind: "error", message: e.message, problem });
        else if (e.type === "ready") {
          try {
            if (!e.builtIn) await loadRemote(e.slug);
            onOpen(e.slug);
          } catch (err) { setState({ kind: "error", message: (err as Error).message, problem }); }
        }
      }, abort.signal);
    })().catch((err) => setState({ kind: "error", message: (err as Error).message }));
    return () => abort.abort();
  }, [query, onOpen]);

  const problem = state.kind === "working" || state.kind === "error" ? state.problem : undefined;
  const current = state.kind === "working" ? STAGES.findIndex((s) => s.id === state.stage) : -1;

  return (
    <main className="explain">
      <button type="button" className="glass-circle explain-back" onClick={onHome} aria-label="Back to search">
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
      </button>
      <section className="explain-body" aria-live="polite">
        {problem ? (
          <>
            <p className="eyebrow">{problem.number}. {problem.title}</p>
            <h1 className="sc-headline"><Rich text={problem.statement} /></h1>
          </>
        ) : (
          <>
            <p className="eyebrow">New problem</p>
            <h1 className="sc-headline">{query.length > 120 ? `${query.slice(0, 120)}…` : query}</h1>
          </>
        )}

        {(state.kind === "starting" || state.kind === "working") && (
          <>
            <ol className="stages">
              {STAGES.map((s, i) => (
                <li key={s.id} className={i < current ? "done" : i === current ? "now" : ""}>{s.label}</li>
              ))}
            </ol>
            <p className="sc-body muted">
              {state.kind === "working" ? state.message : "Connecting…"} {seconds > 4 && <span className="elapsed">{seconds}s. The first time takes a minute or two; after that it’s instant for everyone.</span>}
            </p>
          </>
        )}

        {state.kind === "unavailable" && (
          <div className="explain-end">
            <p className="sc-body">Explaining new problems needs Pillow’s server, and it isn’t running here yet.</p>
            <button type="button" className="btn-filled" onClick={onHome}>Choose a Ready Problem</button>
          </div>
        )}
        {state.kind === "error" && (
          <div className="explain-end">
            <p className="sc-body" role="alert">{state.message}</p>
            <button type="button" className="btn-filled" onClick={onHome}>Try Another</button>
          </div>
        )}
      </section>
    </main>
  );
}
