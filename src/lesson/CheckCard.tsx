import { useState } from "react";
import type { Check } from "../content/lesson";
import { Rich } from "./Rich";

/** An optional question. Nothing is scored or stored: it's a moment to commit to an idea. */
export function CheckCard({ check }: { check: Check }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  return (
    <section className="check" aria-labelledby={`q-${check.question.length}`}>
      <p className="check-label">Quick check</p>
      <p className="check-q" id={`q-${check.question.length}`}><Rich text={check.question} /></p>
      <div className="check-options" role="group" aria-label="Answers">
        {check.options.map((o, i) => {
          const state = !answered ? "" : i === check.answer ? "right" : i === picked ? "wrong" : "dim";
          return (
            <button key={i} type="button" className={`check-opt ${state}`} onClick={() => setPicked(i)} aria-pressed={picked === i}>
              <Rich text={o} />
              {answered && i === check.answer && <span className="sr-only"> (correct answer)</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className="check-explain" role="status">
          <strong>{picked === check.answer ? "Right. " : "Not quite. "}</strong>
          <Rich text={check.explain} />
        </p>
      )}
    </section>
  );
}
