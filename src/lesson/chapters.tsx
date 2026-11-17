import { stepsOf } from "../../engine/analysis/growth";
import type { Approach, Problem } from "../content/problems";
import { growthOf, preparedFor } from "../lib/data";
import { CheckCard } from "./CheckCard";
import { GrowthChart } from "./GrowthChart";
import { Rich } from "./Rich";

const O = (g: string) => `O(${g})`;

// ------------------------------------------------------------------ chapter 1: understand
export function Understand({ problem, onNext }: { problem: Problem; onNext: () => void }) {
  const u = problem.lesson!.understand;
  const first = problem.approaches[0];
  return (
    <article className="chapter prose">
      <p className="eyebrow">Chapter 1 · Understand the problem</p>
      <h2 className="chapter-title"><Rich text={u.statement} /></h2>

      <section>
        <h3>What you get</h3>
        <dl className="defs">
          {u.inputs.map((i) => (
            <div key={i.name}><dt><code className="inline-code">{i.name}</code></dt><dd><Rich text={i.meaning} /></dd></div>
          ))}
        </dl>
      </section>
      <section>
        <h3>What you return</h3>
        <p><Rich text={u.output} /></p>
      </section>
      <section>
        <h3>Work through an example</h3>
        <ol className="walk">{u.walkthrough.map((w, i) => <li key={i}><Rich text={w} /></li>)}</ol>
      </section>
      <section>
        <h3>Things to keep in mind</h3>
        <ul className="bullets">{u.constraints.map((c, i) => <li key={i}><Rich text={c} /></li>)}</ul>
      </section>
      <section className="callout">
        <h3>What it’s really testing</h3>
        <p><Rich text={u.testing} /></p>
      </section>
      {u.check && <CheckCard check={u.check} />}
      <button type="button" className="next-chapter" onClick={onNext}>Start with {first.name.toLowerCase()} →</button>
      {problem.provenance && (
        <p className="provenance">
          Drafted with AI ({problem.provenance.model}), then checked against real runs of every line and reviewed by {problem.provenance.reviewer} on {problem.provenance.reviewedOn}.
        </p>
      )}
    </article>
  );
}

// ------------------------------------------------------------------ chapters 2+: before watching
export function ApproachIntro({ problem, approach, index }: { problem: Problem; approach: Approach; index: number }) {
  const al = problem.lesson!.approaches[approach.id];
  return (
    <article className="chapter prose">
      <p className="eyebrow">Chapter {index + 2} · {approach.name}</p>
      <h2 className="chapter-title">{al.headline}</h2>
      <p className="lede"><Rich text={al.intuition} /></p>
      {al.insight ? (
        <div className="insight">
          <section><h3>What held it back</h3><p><Rich text={al.insight.inefficiency} /></p></section>
          <section><h3>The wasted effort</h3><p><Rich text={al.insight.repeatedWork} /></p></section>
          <section className="key"><h3>The key observation</h3><p><Rich text={al.insight.observation} /></p></section>
          <section><h3>The tool</h3><p><Rich text={al.insight.technique} /></p></section>
          <section><h3>Why it works</h3><p><Rich text={al.insight.whyItWorks} /></p></section>
          <section><h3>The trade-off</h3><p><Rich text={al.insight.tradeoffs} /></p></section>
        </div>
      ) : (
        <section>
          <h3>How you’d think of it</h3>
          <p><Rich text={al.discovery} /></p>
        </section>
      )}
      <section>
        <h3>The plan</h3>
        <ol className="walk">{al.steps.map((s, i) => <li key={i}><Rich text={s} /></li>)}</ol>
      </section>
      <p className="watch-hint">Now watch it run on <code className="inline-code">{problem.exampleLabel}</code>. Click any line of code to read what it does, or try it on your own input.</p>
    </article>
  );
}

// ------------------------------------------------------------------ chapters 2+: after watching
export function ApproachAfter({ problem, approach, onNext, nextLabel }: { problem: Problem; approach: Approach; onNext: () => void; nextLabel: string }) {
  const al = problem.lesson!.approaches[approach.id];
  const growth = growthOf(problem);
  const m = growth?.approaches[approach.id];
  const c = al.complexity;
  return (
    <article className="chapter prose">
      <section>
        <h3>How the cost grows</h3>
        <div className="complexity">
          <div className="cx">
            <span className="cx-kind">Time</span>
            <span className="cx-big">{c.timeLabel ?? O(c.time)}</span>
            <p><Rich text={c.timeWhy} /></p>
          </div>
          <div className="cx">
            <span className="cx-kind">Extra memory</span>
            <span className="cx-big">{c.spaceLabel ?? O(c.space)}</span>
            <p><Rich text={c.spaceWhy} /></p>
          </div>
        </div>
        {m && growth && (
          <p className="measured">
            Measured by running it, counting {c.counted}:{" "}
            {growth.sizes.map((n, i) => <span key={n} className="m-pt">n = {n}: <strong>{m.steps[i].toLocaleString()}</strong></span>)}
          </p>
        )}
      </section>
      {al.whyNotEnough && (
        <section className="callout">
          <h3>Why we can’t stop here</h3>
          <p><Rich text={al.whyNotEnough} /></p>
        </section>
      )}
      {al.check && <CheckCard check={al.check} />}
      <button type="button" className="next-chapter" onClick={onNext}>{nextLabel} →</button>
    </article>
  );
}

// ------------------------------------------------------------------ last chapter: compare
/** A memory chart only earns its place when the approaches actually use memory differently. */
function memoryDiffers(growth: NonNullable<ReturnType<typeof growthOf>>, problem: Problem) {
  const [first, ...rest] = problem.approaches.map((a) => growth.approaches[a.id].space.join());
  return rest.some((s) => s !== first);
}

export function Compare({ problem, onBack }: { problem: Problem; onBack: () => void }) {
  const lesson = problem.lesson!;
  const growth = growthOf(problem);
  return (
    <article className="chapter prose wide">
      <p className="eyebrow">Chapter {problem.approaches.length + 2} · Compare</p>
      <h2 className="chapter-title">{problem.approaches.map((a) => a.name).join(" vs ")}</h2>

      <div className="table-wrap">
        <table className="compare">
          <thead>
            <tr><th scope="col">Approach</th><th scope="col">Time</th><th scope="col">Extra memory</th><th scope="col">Lines run on the example</th>{growth && <th scope="col">At n = {growth.sizes.at(-1)}</th>}</tr>
          </thead>
          <tbody>
            {problem.approaches.map((a) => {
              const al = lesson.approaches[a.id];
              return (
                <tr key={a.id}>
                  <th scope="row">{a.name}</th>
                  <td><code className="inline-code">{al.complexity.timeLabel ?? O(al.complexity.time)}</code></td>
                  <td><code className="inline-code">{al.complexity.spaceLabel ?? O(al.complexity.space)}</code></td>
                  <td>{stepsOf(preparedFor(problem, a).trace).toLocaleString()}</td>
                  {growth && <td>{growth.approaches[a.id].steps.at(-1)!.toLocaleString()}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {growth && (
        <section>
          <h3>Lines run as the input grows</h3>
          <p className="muted-p">Each point is a real run on <Rich text={lesson.growth.describe} />.</p>
          <GrowthChart measure="Lines run" sizes={growth.sizes} series={problem.approaches.map((a) => ({ name: a.name, values: growth.approaches[a.id].steps }))} />
        </section>
      )}

      {growth && memoryDiffers(growth, problem) && (
        <section>
          <h3>Memory as the input grows</h3>
          <p className="muted-p">The most items held at once in structures the code creates, plus calls waiting on the call stack. Same inputs as above.</p>
          <GrowthChart measure="Peak extra memory" sizes={growth.spaceSizes} series={problem.approaches.map((a) => ({ name: a.name, values: growth.approaches[a.id].space }))} />
        </section>
      )}

      <section>
        <h3>The trade-off</h3>
        <p><Rich text={lesson.compare.tradeoffs} /></p>
      </section>
      <section>
        <h3>Take these with you</h3>
        <ul className="bullets">{lesson.compare.takeaways.map((t, i) => <li key={i}><Rich text={t} /></li>)}</ul>
      </section>
      <section className="pattern">
        <p className="eyebrow">The pattern</p>
        <h3>{lesson.compare.pattern.name}</h3>
        <p><strong>Reach for it when: </strong><Rich text={lesson.compare.pattern.recognize} /></p>
        <p className="muted-p">Also used in {lesson.compare.pattern.alsoUsedIn.join(", ")}.</p>
      </section>
      <button type="button" className="next-chapter secondary" onClick={onBack}>← Back to all problems</button>
    </article>
  );
}
