import { useEffect, useMemo, useState } from "react";
import { WEEKS } from "../curriculum/weeks";
import { record } from "../knowledge/evidence";
import { shuffledIndices } from "../learn/Learn";
import { progress, TOTAL_WEEKS, type Answer } from "./flow";
import { markPlacementTaken } from "./store";

// The placement check: one question at a time, from week 1 on, stopping where the student stops
// knowing. Right answers become evidence; the roadmap re-derives the starting week from them.

interface Props { onRoadmap: () => void; onHome: () => void }

export function Placement({ onRoadmap, onHome }: Props) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const state = progress(answers);
  const q = state.next;
  const order = useMemo(() => (q ? shuffledIndices(q.choices.length, q.id) : []), [q]);
  useEffect(() => { document.title = "Find your starting week · Pillow"; }, []);
  useEffect(() => { if (!q) markPlacementTaken(state.placed); }, [q, state.placed]);

  const back = (
    <header className="map-top">
      <button type="button" className="glass-circle" onClick={onHome} aria-label="Back to search">
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
      </button>
      <div>
        <h1>Find your starting week</h1>
        <p className="map-sub">{q ? `Week ${q.week} of ${TOTAL_WEEKS}: ${WEEKS[q.week - 1].title.toLowerCase()}` : "Done"}</p>
      </div>
    </header>
  );

  if (!q) {
    const week = WEEKS[state.placed - 1];
    return (
      <main className="placement">
        {back}
        <section className="pl-result" aria-live="polite">
          <p className="eyebrow">Start at</p>
          <h2>Week {week.week}: {week.title}</h2>
          <p className="pl-sub">
            {state.passed.length === 0 ? "From the beginning: every idea builds on the ones before, so nothing is wasted."
              : `You showed you know ${state.passed.length === 1 ? "week 1" : `weeks 1–${state.passed.length}`}. They stay on your roadmap to review whenever you like.`}
          </p>
          <p className="pl-note">Your right answers are now evidence on your map. Wrong guesses weren’t recorded.</p>
          <div className="pl-actions">
            <button type="button" className="btn btn-filled" onClick={onRoadmap}>Open Your Roadmap</button>
          </div>
        </section>
      </main>
    );
  }

  const answered = picked !== null;
  const right = answered && order[picked] === 0;
  const pick = (i: number) => {
    if (answered) return;
    setPicked(i);
    if (order[i] === 0) {
      record({ task: "diagnostic", problem: "diagnostic", concepts: q.concepts, correct: true, facet: q.facet, week: q.week, detail: `Placement check: ${q.choices[0].toLowerCase()}` });
    }
  };
  const next = (outcome: Answer["outcome"]) => { setAnswers([...answers, { id: q.id, outcome }]); setPicked(null); };

  return (
    <main className="placement">
      {back}
      <section className="ask-card pl-card" key={q.id} aria-label="Question">
        {q.facet === "explanation" && <p className="pl-second">A second chance on this week</p>}
        <p className="ask-prompt">{q.prompt}</p>
        <div className="ask-choices" role="group">
          {order.map((c, i) => (
            <button key={c} type="button" disabled={answered}
              className={`choice ${!answered ? "" : c === 0 ? "right" : i === picked ? "wrong" : "dim"}`}
              onClick={() => pick(i)}>
              {q.choices[c]}
            </button>
          ))}
        </div>
        {answered ? (
          <div className="pl-after" role="status">
            <p className={`ask-verdict ${right ? "right" : "wrong"}`}>{right ? "Right." : "Not quite."}</p>
            <p className="pl-explain">{q.explain}</p>
            <button type="button" className="btn btn-filled" onClick={() => next(right ? "right" : "wrong")}>Continue</button>
          </div>
        ) : (
          <button type="button" className="text-btn pl-skip" onClick={() => next("skip")}>I haven’t learned this yet</button>
        )}
      </section>
    </main>
  );
}
