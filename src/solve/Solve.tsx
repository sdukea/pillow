import { useEffect, useMemo, useRef, useState } from "react";
import { prepare, type Prepared } from "../../engine/interpreter/viewmodel";
import type { Problem } from "../content/problems";
import { type ConceptId } from "../knowledge/concepts";
import { record } from "../knowledge/evidence";
import { sourceOf } from "../lib/data";
import { pythonReady, traceLive } from "../lib/live";
import { CodePane } from "../workspace/CodePane";
import { asGoodAs, buildCases, type CaseResult, checkableOf, checkSolution, type Growth, measureGrowth, type Runner, starter } from "./check";

// Write it yourself: the strongest evidence that the idea is yours. Your code runs against the
// example, the edge cases and random inputs (compared with the reference), then on growing inputs
// to see whether it's as fast as the trick. Failing cases open in a step-through debugger.

const run: Runner = (request) => traceLive(request);
const draftKey = (slug: string) => `pillow.code.${slug}`;

type Status =
  | { kind: "idle" }
  | { kind: "running"; firstLoad: boolean }
  | { kind: "done"; results: CaseResult[]; growth: Growth | null }
  | { kind: "error"; message: string };

export function Solve({ problem, onSolved }: { problem: Problem; onSolved: () => void }) {
  const checkable = useMemo(() => checkableOf(problem), [problem]);
  const [code, setCode] = useState(() => { try { return localStorage.getItem(draftKey(problem.slug)) ?? starter(checkable); } catch { return starter(checkable); } });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [revealed, setRevealed] = useState(false);
  const [debugging, setDebugging] = useState<CaseResult | null>(null);
  const recorded = useRef(false);
  const reference = useMemo(() => sourceOf(problem.approaches.at(-1)!), [problem]);
  const fast = problem.approaches.at(-1)!;

  useEffect(() => { try { localStorage.setItem(draftKey(problem.slug), code); } catch { /* drafts are a convenience */ } }, [code, problem.slug]);

  const check = async () => {
    setDebugging(null);
    setStatus({ kind: "running", firstLoad: !pythonReady() });
    try {
      const cases = await buildCases(checkable, run);
      const results = await checkSolution(checkable, code, reference, run, cases);
      const allPass = results.every((r) => r.pass);
      const growth = allPass ? await measureGrowth(checkable, code, run) : null;
      setStatus({ kind: "done", results, growth });
      if (allPass && !recorded.current) {
        recorded.current = true;
        const efficient = !!growth && asGoodAs(growth.cls, growth.target);
        record({
          task: "implement", problem: problem.slug, approach: fast.id,
          concepts: problem.lesson!.approaches[fast.id].concepts as ConceptId[],
          correct: efficient, hinted: revealed,
          detail: efficient ? `wrote a working O(${growth!.cls}) solution` : `wrote a working solution that grows like O(${growth?.cls ?? "?"})`,
        });
        onSolved();
      }
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
    }
  };

  const results = status.kind === "done" ? status.results : [];
  const failing = results.filter((r) => !r.pass);
  const allPass = status.kind === "done" && failing.length === 0;

  return (
    <section className="solve" aria-label="Write it yourself">
      <p className="trick-label">Write it yourself</p>
      <Editor value={code} onChange={setCode} onRun={check} />
      <div className="solve-actions">
        <button type="button" className="btn-filled" onClick={check} disabled={status.kind === "running"}>{status.kind === "running" ? "Running…" : "Run"}</button>
        <span className="solve-keys">⌘ Enter</span>
        <span className="solve-spacer" />
        {!revealed ? (
          <button type="button" className="link" onClick={() => setRevealed(true)}>Show a solution</button>
        ) : (
          <button type="button" className="link" onClick={() => setCode(reference)}>Use it</button>
        )}
      </div>
      {revealed && <pre className="solve-reference" aria-label="A solution"><code>{reference}</code></pre>}

      {status.kind === "running" && <p className="solve-status">{status.firstLoad ? "Starting Python in your browser…" : "Checking…"}</p>}
      {status.kind === "error" && <p className="solve-status bad" role="alert">{status.message}</p>}
      {status.kind === "done" && (
        <div className="solve-results" role="status">
          {allPass ? (
            <Verdict growth={status.growth} total={results.length} revealed={revealed} />
          ) : (
            <p className="solve-summary"><strong>{results.length - failing.length} of {results.length}</strong> cases pass.</p>
          )}
          {failing.slice(0, 3).map((r, i) => (
            <article key={i} className="case fail">
              <p className="case-input"><span className="case-kind">{r.kind}</span> <code>{r.label}</code></p>
              {r.error ? (
                <p className="case-error">{r.error.line ? `Line ${r.error.line}: ` : ""}<strong>{r.error.type}</strong> {r.error.message}</p>
              ) : (
                <dl className="case-diff">
                  <div><dt>Expected</dt><dd><code>{show(r.expected)}</code></dd></div>
                  <div><dt>Yours</dt><dd><code>{show(r.got)}</code></dd></div>
                </dl>
              )}
              {r.error?.type !== "SyntaxError" && <button type="button" className="link" onClick={() => setDebugging(r)}>Step through it</button>}
            </article>
          ))}
          {failing.length > 3 && <p className="muted">…and {failing.length - 3} more.</p>}
        </div>
      )}
      {debugging && <Debugger problem={problem} code={code} failing={debugging} onClose={() => setDebugging(null)} />}
    </section>
  );
}

function Verdict({ growth, total, revealed }: { growth: Growth | null; total: number; revealed: boolean }) {
  if (!growth) return <p className="solve-summary good"><strong>All {total} cases pass.</strong></p>;
  const ok = asGoodAs(growth.cls, growth.target);
  const n = growth.sizes.at(-1)!;
  return (
    <p className={`solve-summary ${ok ? "good" : "warn"}`}>
      <strong>All {total} cases pass</strong>{" "}
      {ok ? <>and it grows like O({growth.cls}), as fast as the trick.</> : <>but it grows like O({growth.cls}). The trick makes it O({growth.target}).</>}
      <span className="solve-n"> {growth.steps.at(-1)!.toLocaleString()} steps at n = {n}.</span>
      {revealed && <span className="solve-n"> You looked at a solution, so this counts as practice.</span>}
    </p>
  );
}

function show(v: unknown): string {
  return v === undefined ? "nothing" : JSON.stringify(v);
}

/** A small code editor: Tab indents, Enter keeps the indentation (and adds a level after a colon). */
export function Editor({ value, onChange, onRun }: { value: string; onChange: (v: string) => void; onRun: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lines = value.split("\n").length;
  const edit = (el: HTMLTextAreaElement, text: string, start: number, end: number, caret: number) => {
    onChange(el.value.slice(0, start) + text + el.value.slice(end));
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = caret; });
  };
  return (
    <div className="editor-box">
      <ol className="gutter" aria-hidden="true">{Array.from({ length: lines }, (_, i) => <li key={i}>{i + 1}</li>)}</ol>
      <textarea
        ref={ref}
        className="code-input"
        value={value}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label="Your solution, in Python"
        rows={Math.max(8, lines + 1)}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          const el = e.currentTarget;
          const { selectionStart: s, selectionEnd: t } = el;
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); onRun(); return; }
          if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); edit(el, "    ", s, t, s + 4); }
          else if (e.key === "Tab" && e.shiftKey) {
            e.preventDefault();
            const lineStart = el.value.lastIndexOf("\n", s - 1) + 1;
            const spaces = el.value.slice(lineStart, lineStart + 4).match(/^ */)![0].length;
            if (spaces) edit(el, "", lineStart, lineStart + spaces, Math.max(lineStart, s - spaces));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const lineStart = el.value.lastIndexOf("\n", s - 1) + 1;
            const line = el.value.slice(lineStart, s);
            const indent = line.match(/^ */)![0] + (line.trimEnd().endsWith(":") ? "    " : "");
            edit(el, "\n" + indent, s, t, s + 1 + indent.length);
          }
        }}
      />
    </div>
  );
}

/** Your code on a failing case, one line at a time, with your variables. */
function Debugger({ problem, code, failing, onClose }: { problem: Problem; code: string; failing: CaseResult; onClose: () => void }) {
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    let live = true;
    traceLive({ source: code, entry: problem.approaches.at(-1)!.entry, args: failing.args, maxSteps: 4000 })
      .then((t) => { if (!live) return; if (!t.steps.length) { setError(t.error ? `${t.error.type}: ${t.error.message}` : "Nothing ran."); return; } const p = prepare(t, { views: [], lines: {} }); setPrepared(p); setI(0); })
      .catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, [code, failing, problem]);
  if (error) return <p className="solve-status bad">{error}</p>;
  if (!prepared) return <p className="solve-status">Tracing your code…</p>;
  const n = prepared.moments.length;
  const view = prepared.view(i);
  const step = prepared.trace.steps[prepared.moments[i].stepIndex];
  return (
    <section className="debugger" aria-label="Step through your code">
      <header className="debugger-head">
        <span><code>{failing.label}</code></span>
        <button type="button" className="link" onClick={onClose}>Close</button>
      </header>
      <div className="debugger-pane"><CodePane source={code.trimEnd()} ranLine={view.ranLine} nextLine={view.nextLine} step={step} /></div>
      <div className="debugger-controls">
        <button type="button" className="tool" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} aria-label="Back one line">‹</button>
        <input type="range" min={0} max={n - 1} value={i} onChange={(e) => setI(Number(e.target.value))} aria-label="Step" />
        <button type="button" className="tool" onClick={() => setI((x) => Math.min(n - 1, x + 1))} disabled={i === n - 1} aria-label="Forward one line">›</button>
        <span className="muted">{i + 1} / {n}</span>
      </div>
      {view.final && <p className="solve-status">{view.error ? `Stopped: ${view.error}` : `Returned ${view.returned ?? "None"}. Expected ${show(failing.expected)}.`}</p>}
    </section>
  );
}
