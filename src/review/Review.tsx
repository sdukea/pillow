import { useEffect, useMemo, useState } from "react";
import { PROBLEMS, type Problem } from "../content/problems";
import { conceptById, type ConceptId } from "../knowledge/concepts";
import { allEvidence, record, useEvidence } from "../knowledge/evidence";
import { assess } from "../knowledge/model";
import { shuffledIndices } from "../learn/Learn";
import { sourceOf } from "../lib/data";
import { conceptsOf } from "../map/KnowledgeMap";
import { reviewQuestion, type ReviewKind, type ReviewQuestion } from "./questions";
import { dueForReview, reviewHistory } from "./queue";

// Today's reviews: each due concept asked one question, its kind rotating review by review. A miss
// shows the concept's key facts straight away, and the concept comes back sooner (FSRS).

const KIND_LABEL: Record<ReviewKind, string> = { concept: "When to use it", pattern: "The trick", reconstruct: "Rebuild the solution", complexity: "How it grows" };
const solutionSource = (p: Problem) => sourceOf(p.approaches.at(-1)!);
const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });

interface Props { onOpen: (slug: string) => void; onConcept: (id: string) => void; onHome: () => void }

export function Review({ onOpen, onConcept, onHome }: Props) {
  const log = useEvidence();
  // The session is fixed when it starts, so answering doesn't reshuffle what's left.
  const [session] = useState(() => {
    const states = assess(allEvidence());
    return dueForReview(states).map((s) => {
      const teaching = PROBLEMS.filter((p) => conceptsOf(p).includes(s.id));
      return reviewQuestion(s.id, s.memory?.reviews ?? 0, teaching, PROBLEMS, solutionSource);
    });
  });
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  useEffect(() => { document.title = "Review · Pillow"; }, []);
  const states = useMemo(() => assess(log), [log]);
  const history = reviewHistory(log);

  const header = (
    <header className="map-top">
      <button type="button" className="glass-circle" onClick={onHome} aria-label="Back to search">
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
      </button>
      <div>
        <h1>Review</h1>
        <p className="map-sub">{session.length ? (i < session.length ? `${i + 1} of ${session.length}` : "Done for now") : "Nothing due"}</p>
      </div>
    </header>
  );

  const upcoming = [...states.values()].filter((s) => s.reviewAt && !s.due && (s.state === "learning" || s.state === "understood")).sort((a, b) => a.reviewAt! - b.reviewAt!);

  if (i >= session.length) {
    return (
      <main className="review">
        {header}
        <section className="pl-result" aria-live="polite">
          {session.length ? (
            <>
              <p className="eyebrow">Done</p>
              <h2>{right} of {session.length} remembered</h2>
              <p className="pl-sub">What you remembered comes back later; what you missed comes back sooner.</p>
            </>
          ) : (
            <>
              <p className="eyebrow">All caught up</p>
              <h2>Nothing to review right now</h2>
              <p className="pl-sub">{upcoming.length ? `Next: ${conceptById.get(upcoming[0].id)!.name}, ${fmtDate(upcoming[0].reviewAt!)}.` : "Answer questions in a lesson, and the concepts you get right will come back here to keep."}</p>
            </>
          )}
        </section>
        <History history={history} />
      </main>
    );
  }

  const q = session[i];
  return (
    <main className="review">
      {header}
      <Question key={i} q={q} picked={picked} onPick={(n, correct) => {
        setPicked(n);
        if (correct) setRight((r) => r + 1);
        record({ task: q.task, problem: q.problem, concepts: [q.concept], correct, detail: q.detail, review: true });
      }} onNext={() => { setPicked(null); setI(i + 1); }} onOpen={onOpen} onConcept={onConcept} />
      <History history={history} />
    </main>
  );
}

function Question({ q, picked, onPick, onNext, onOpen, onConcept }: {
  q: ReviewQuestion; picked: number | null; onPick: (i: number, correct: boolean) => void; onNext: () => void;
  onOpen: (slug: string) => void; onConcept: (id: string) => void;
}) {
  const order = useMemo(() => shuffledIndices(q.choices.length, `${q.concept}:${q.kind}:${q.prompt}`), [q]);
  const answered = picked !== null;
  const correct = answered && q.choices[order[picked]].correct;
  const c = conceptById.get(q.concept)!;
  const practise = PROBLEMS.find((p) => conceptsOf(p).includes(q.concept as ConceptId));
  return (
    <section className="ask-card pl-card" aria-label="Review question">
      <p className="rv-kind">{c.name} · {KIND_LABEL[q.kind]}</p>
      <p className="ask-prompt">{q.prompt}</p>
      {q.code && <pre className="rv-code" aria-label="The solution so far"><code>{q.code.join("\n")}</code></pre>}
      <div className={`ask-choices ${q.code ? "rv-lines" : ""}`} role="group">
        {order.map((n, k) => (
          <button key={q.choices[n].label} type="button" disabled={answered}
            className={`choice ${q.code ? "rv-line" : ""} ${!answered ? "" : q.choices[n].correct ? "right" : k === picked ? "wrong" : "dim"}`}
            onClick={() => onPick(k, q.choices[n].correct)}>
            {q.choices[n].label}
          </button>
        ))}
      </div>
      {answered && (
        <div className="pl-after" role="status">
          <p className={`ask-verdict ${correct ? "right" : "wrong"}`}>{correct ? "Remembered." : "Not this time. Here’s the refresher:"}</p>
          {!correct && (
            <div className="rv-refresh">
              <p className="rv-means">{c.name}: {c.means}</p>
              <ul className="facts">{c.facts.map((f) => <li key={f}>{f}</li>)}</ul>
              <p className="rv-actions">
                <button type="button" className="link" onClick={() => onConcept(c.id)}>Open its card</button>
                {practise && <> · <button type="button" className="link" onClick={() => onOpen(practise.slug)}>Practise with {practise.title}</button></>}
              </p>
            </div>
          )}
          <button type="button" className="btn btn-filled" onClick={onNext}>Continue</button>
        </div>
      )}
    </section>
  );
}

function History({ history }: { history: ReturnType<typeof reviewHistory> }) {
  if (!history.length) return null;
  return (
    <section className="rv-history" aria-labelledby="rv-history-title">
      <h2 id="rv-history-title">Past reviews</h2>
      <ul className="evidence">
        {history.map((e, k) => (
          <li key={k}>
            <span className={`ev-mark ${e.correct ? "right" : "wrong"}`} aria-label={e.correct ? "right" : "wrong"}>{e.correct ? "✓" : "✗"}</span>
            <span className="ev-detail">{conceptById.get(e.concepts[0])?.name}: {e.detail.replace(/^Review: /, "")}</span>
            <span className="ev-where">{fmtDate(e.at)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
