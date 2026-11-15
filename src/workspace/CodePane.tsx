import { useEffect, useMemo, useRef, useState } from "react";
import type { Step } from "../../engine/tracer/types";
import { format } from "../../engine/interpreter/values";
import type { LineNote } from "../content/lesson";
import { Rich } from "../lesson/Rich";
import { tokenizeLine } from "../lib/highlight";

interface Props {
  source: string;
  ranLine?: number;
  nextLine?: number;
  step: Step;
  /** Explanations per line. When present, the line that ran (or a clicked line) is explained. */
  notes?: Record<number, LineNote>;
}

/**
 * The solution with two markers: the line that just ran (filled) and the line that runs next
 * (outlined). Below it, what the line does, and the variables of the running function.
 */
export function CodePane({ source, ranLine, nextLine, step, notes }: Props) {
  const lines = useMemo(() => source.split("\n").map(tokenizeLine), [source]);
  const ranRef = useRef<HTMLLIElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  // A clicked line stays explained until the next step.
  const [pinned, setPinned] = useState<number | null>(null);
  useEffect(() => { setPinned(null); }, [ranLine, step]);

  // Keep the line that ran visible by scrolling the code pane only. scrollIntoView would also
  // scroll the page, which on a phone pushes the visualization off screen at every step.
  useEffect(() => {
    const list = listRef.current, line = ranRef.current;
    if (!list || !line || list.scrollHeight <= list.clientHeight) return;
    const top = line.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + line.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: top - list.clientHeight / 3, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }, [ranLine]);

  const frame = step.frames.at(-1)!;
  const locals = Object.entries(frame.locals).filter(([, v]) => !(v && typeof v === "object" && "callable" in v));
  const shownLine = pinned ?? ranLine;
  const note = shownLine !== undefined ? notes?.[shownLine] : undefined;

  return (
    <section className="code-pane" aria-label="Solution code">
      <ol ref={listRef} className="code" aria-label="Code, with the line that just ran highlighted">
        {lines.map((tokens, i) => {
          const n = i + 1;
          const ran = n === ranLine;
          const next = n === nextLine && !ran;
          const explainable = !!notes?.[n];
          return (
            <li key={n} ref={ran ? ranRef : undefined} className={`${ran ? "ran" : ""} ${next ? "next" : ""} ${pinned === n ? "pinned" : ""}`} aria-current={ran ? "step" : undefined}>
              <span className="ln" aria-hidden="true">{n}</span>
              {explainable ? (
                <button type="button" className="code-line" onClick={() => setPinned(n)} aria-label={`Line ${n}: explain`}>
                  <code>{tokens.map((t, j) => <span key={j} className={`tk-${t.kind}`}>{t.text}</span>)}</code>
                </button>
              ) : (
                <code>
                  {tokens.map((t, j) => <span key={j} className={`tk-${t.kind}`}>{t.text}</span>)}
                  {tokens.length === 0 && " "}
                </code>
              )}
              {ran && <span className="sr-only">(just ran)</span>}
              {next && <span className="sr-only">(runs next)</span>}
            </li>
          );
        })}
      </ol>
      {notes && (
        <div className="note" aria-live="polite">
          {note ? (
            <>
              <p className="note-head">Line {shownLine}{pinned !== null && pinned !== ranLine ? "" : " just ran"}</p>
              <p className="note-what"><Rich text={note.what} /></p>
              <dl className="note-parts">
                <div><dt>Why</dt><dd><Rich text={note.why} /></dd></div>
                {note.affects && <div><dt>Changes</dt><dd><Rich text={note.affects} /></dd></div>}
                <div><dt>Without it</dt><dd><Rich text={note.ifRemoved} /></dd></div>
              </dl>
            </>
          ) : (
            <p className="note-empty">Step forward, or click a line, to see what it does.</p>
          )}
        </div>
      )}
      <div className="locals">
        <div className="locals-head">
          <span>Variables</span>
          <code>{frame.fn}{step.frames.length > 1 ? ` · call ${step.frames.length}` : ""}</code>
        </div>
        <dl>
          {locals.map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{format(value, step.heap)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
