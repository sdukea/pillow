import { useId, useState } from "react";
import type { Arg } from "../../engine/tracer/types";
import { labelOf, parseInputs, toText } from "../content/inputs";
import type { Problem } from "../content/problems";
import { warmPython } from "../lib/live";
import type { LiveInput, LiveRun } from "../lib/useLiveRun";

interface Props {
  problem: Problem;
  input: LiveInput | null;
  run: LiveRun;
  onInput: (input: LiveInput | null) => void;
}

export const liveInputOf = (problem: Problem, args: Arg[]): LiveInput => ({ args, label: labelOf(problem.inputs, args), key: JSON.stringify(args) });

/** Shows which input is playing, and lets the learner type their own or pick an edge case. */
export function InputBar({ problem, input, run, onInput }: Props) {
  const [open, setOpen] = useState(false);
  const base = useId();
  const startArgs = input?.args ?? problem.example;
  const [texts, setTexts] = useState<string[]>(() => problem.inputs.map((f, i) => toText(f, startArgs[i])));
  const [error, setError] = useState<{ field: string; message: string } | null>(null);

  const presets: { label: string; args: Arg[] }[] = (problem.lesson?.edgeCases ?? []).map((args) => ({ label: labelOf(problem.inputs, args), args }));

  const openForm = () => {
    warmPython();
    setTexts(problem.inputs.map((f, i) => toText(f, startArgs[i])));
    setError(null);
    setOpen(true);
  };
  const runArgs = (args: Arg[]) => { onInput(liveInputOf(problem, args)); setOpen(false); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInputs(problem.inputs, texts);
    if (!parsed.ok) { setError(parsed); return; }
    runArgs(parsed.args);
  };

  const status =
    run.status === "loading" ? (run.firstLoad ? "Starting Python in your browser. The first run takes a few seconds…" : "Running…")
    : run.status === "error" ? run.message
    : undefined;

  return (
    <div className="input-bar">
      <div className="input-row">
        <p className="example" title={input ? "Your input" : "The example"}>{input?.label ?? problem.exampleLabel}</p>
        {!open && (
          <div className="input-actions">
            {input && <button type="button" className="link-btn" onClick={() => onInput(null)}>Back to the example</button>}
            <button type="button" className="pill-btn" onClick={openForm}>{input ? "Change input" : "Try your own input"}</button>
          </div>
        )}
      </div>
      {status && <p className={`input-status ${run.status === "error" ? "is-error" : ""}`} role={run.status === "error" ? "alert" : "status"}>{status}</p>}

      {open && (
        <form className="input-form" onSubmit={submit} noValidate>
          {problem.inputs.map((f, i) => {
            const id = `${base}-${f.name}`;
            const bad = error?.field === f.name;
            return (
              <div key={f.name} className="input-field">
                <label htmlFor={id}><code>{f.name}</code></label>
                <input
                  id={id}
                  value={texts[i]}
                  autoFocus={i === 0}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  inputMode={f.type === "int" ? "numeric" : "text"}
                  aria-invalid={bad || undefined}
                  aria-describedby={`${id}-hint`}
                  onChange={(e) => { const next = [...texts]; next[i] = e.target.value; setTexts(next); setError(null); }}
                />
                <p id={`${id}-hint`} className={`input-hint ${bad ? "is-error" : ""}`}>{bad ? error!.message : f.hint ?? hintFor(f.type, f.max)}</p>
              </div>
            );
          })}
          <div className="input-form-actions">
            <button type="submit" className="pill-btn primary">Run</button>
            <button type="button" className="link-btn" onClick={() => setOpen(false)}>Cancel</button>
          </div>
          {presets.length > 0 && (
            <div className="presets">
              <span className="presets-label">Or try an edge case</span>
              {presets.map((p) => (
                <button key={p.label} type="button" className="preset" onClick={() => runArgs(p.args)}>{p.label}</button>
              ))}
            </div>
          )}
        </form>
      )}
    </div>
  );
}

function hintFor(type: string, max?: number): string {
  switch (type) {
    case "int": return "A whole number";
    case "int-list": return `A list like [1, 2, 3], up to ${max} numbers`;
    case "string": return `Up to ${max} characters, without quotes`;
    default: return "";
  }
}
