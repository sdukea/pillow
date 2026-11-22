import { useEffect, useState } from "react";
import type { CurriculumProblem } from "../curriculum/curriculum";
import type { Correctness, FollowUp } from "../content/lesson";

/** One line on why the fast way is right, not just fast. */
export function WhyRight({ correctness }: { correctness: Correctness }) {
  return (
    <section className="why-right" aria-label="Why it’s right">
      <p className="why-label">Why it’s right</p>
      <p className="why-text">{correctness.invariant}</p>
    </section>
  );
}

/** What an interviewer asks next. The answer stays hidden until asked for: try it first. */
export function FollowUps({ items }: { items: FollowUp[] }) {
  return (
    <section className="followups" aria-labelledby="followups-title">
      <h2 id="followups-title">Interviewers ask next</h2>
      {items.map((f) => (
        <details key={f.ask} className="followup">
          <summary>{f.ask}</summary>
          <p>{f.answer}</p>
        </details>
      ))}
    </section>
  );
}

/** Problems to practise next, from the curriculum (loaded only here, so it stays out of the main bundle). */
export function PractiseNext({ slug, onOpen }: { slug: string; onOpen: (slug: string) => void }) {
  const [related, setRelated] = useState<CurriculumProblem[] | null>(null);
  useEffect(() => {
    let live = true;
    import("../curriculum/curriculum").then((m) => { if (live) setRelated(m.relatedProblems(slug)); });
    return () => { live = false; };
  }, [slug]);
  if (!related?.length) return null;
  return (
    <section className="practise-next" aria-labelledby="practise-title">
      <h2 id="practise-title">Practise next</h2>
      <ul>
        {related.map((p) => (
          <li key={p.slug}>
            {p.lesson === "built"
              ? <button type="button" className="link" onClick={() => onOpen(p.slug)}>{p.title}</button>
              : <a href={p.url} target="_blank" rel="noreferrer">{p.title} ↗</a>}
            <span className="muted"> · {p.difficulty}{p.lesson === "built" ? " · lesson" : " · on LeetCode"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
