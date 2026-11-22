import { useEffect, useMemo, useRef, useState } from "react";
import { currentWeek } from "../curriculum/progress";
import { conceptById } from "../knowledge/concepts";
import { allEvidence, record } from "../knowledge/evidence";
import { assess } from "../knowledge/model";
import { shuffledIndices } from "../learn/Learn";
import { fixtureSourceOf } from "../lib/data";
import { pythonReady, traceLive } from "../lib/live";
import { buildCases, type CaseResult, checkSolution, type Growth, measureGrowth, type Runner, starter } from "../solve/check";
import { Editor } from "../solve/Solve";
import {
  type Graded, gradeApproach, gradeClarify, gradeComplexity, gradeFollowUp, gradeImplement, type Level, nextInterview, passed, readiness, type Report, type Stage, STAGES,
} from "./grade";
import { type InterviewProblem, type Time, TIMES } from "./problems";
import { loadReports, saveReport } from "./store";

// A mock interview on a problem you've never seen: clarify, choose an approach, write it, say how it
// grows, take a follow-up. No hints and no feedback until the end, like the real thing; then a
// report built from what you did, which also becomes evidence on your map.

const run: Runner = (request) => traceLive(request);
const STAGE_LABEL: Record<Stage, string> = { clarify: "Clarify", approach: "Approach", implement: "Write it", complexity: "Its cost", "follow-up": "Follow-up" };
const SUGGESTED_MIN: Record<Stage, number> = { clarify: 3, approach: 5, implement: 20, complexity: 2, "follow-up": 5 };
const LEVEL_LABEL: Record<Level, string> = { pass: "Pass", partial: "Partly", miss: "Missed" };
const O = (t: string) => `O(${t})`;
const mins = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);

interface Props { onHome: () => void; onConcept: (id: string) => void }

export function Interview({ onHome, onConcept }: Props) {
  const [reports, setReports] = useState<Report[]>(loadReports);
  const [problem, setProblem] = useState<InterviewProblem | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  useEffect(() => { document.title = "Mock Interview · Pillow"; }, []);
  const log = allEvidence();
  const next = useMemo(() => nextInterview(log, reports, currentWeek(assess(log), log)), [log, reports]);
  const ready = readiness(reports);

  const header = (
    <header className="map-top">
      <button type="button" className="glass-circle" onClick={problem && !report ? () => { if (confirm("Leave this interview? Nothing will be recorded.")) setProblem(null); } : onHome} aria-label="Back">
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
      </button>
      <div>
        <h1>Mock Interview</h1>
        <p className="map-sub">{ready.of ? `Readiness: ${ready.passed} of your last ${ready.of} passed` : "An unseen problem, start to finish"}</p>
      </div>
    </header>
  );

  if (report) {
    return <main className="interview">{header}<ReportView report={report} problem={problem!} onConcept={onConcept} onDone={() => { setReport(null); setProblem(null); }} /></main>;
  }
  if (problem) {
    return (
      <main className="interview">
        {header}
        <Session problem={problem} onFinish={(r) => { saveReport(r); setReports(loadReports()); setReport(r); }} />
      </main>
    );
  }
  return (
    <main className="interview">
      {header}
      <section className="pl-result">
        {next ? (
          <>
            <p className="eyebrow">Your next interview</p>
            <h2>A problem you haven’t seen</h2>
            <p className="pl-sub">Five stages, about 35 minutes: clarify the problem, choose an approach and its cost, write the code, say how your code grows, then answer a follow-up. No hints, and no feedback until the end.</p>
            <ol className="iv-plan">{STAGES.map((s) => <li key={s}><strong>{STAGE_LABEL[s]}</strong> <span className="muted">· about {SUGGESTED_MIN[s]} min</span></li>)}</ol>
            <div className="pl-actions"><button type="button" className="btn-filled" onClick={() => setProblem(next)}>Start the Interview</button></div>
          </>
        ) : (
          <>
            <p className="eyebrow">All done</p>
            <h2>You’ve met every interview problem</h2>
            <p className="pl-sub">More arrive as lessons are added. Meanwhile, practise from your roadmap.</p>
          </>
        )}
      </section>
      {reports.length > 0 && (
        <section className="rv-history">
          <h2>Past interviews</h2>
          <ul className="evidence">
            {[...reports].sort((a, b) => b.at - a.at).map((r) => (
              <li key={r.at}>
                <span className={`ev-mark ${r.passed ? "right" : "wrong"}`} aria-label={r.passed ? "passed" : "not passed"}>{r.passed ? "✓" : "✗"}</span>
                <span className="ev-detail">{r.slug.replaceAll("-", " ")}: {STAGES.map((s) => `${STAGE_LABEL[s]} ${LEVEL_LABEL[r.stages[s].level].toLowerCase()}`).join(", ")}</span>
                <span className="ev-where">{new Date(r.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

/** The five stages, one at a time. Grading waits until the end. */
function Session({ problem, onFinish }: { problem: InterviewProblem; onFinish: (r: Report) => void }) {
  const [stage, setStage] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [asked, setAsked] = useState(false);
  const [approach, setApproach] = useState<number | null>(null);
  const [claim, setClaim] = useState<Time | null>(null);
  const [code, setCode] = useState(() => starter(problem));
  const [example, setExample] = useState<{ running: boolean; text?: string }>({ running: false });
  const [submitting, setSubmitting] = useState(false);
  const [codeResult, setCodeResult] = useState<{ results: CaseResult[] | null; growth: Growth | null }>({ results: null, growth: null });
  const [ownCost, setOwnCost] = useState<Time | null>(null);
  const [follow, setFollow] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const started = useRef(Date.now());
  const seconds = useRef<number[]>([]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const reference = useMemo(() => fixtureSourceOf(problem.solution), [problem]);
  const clarifyOrder = useMemo(() => shuffledIndices(problem.clarify.length, `${problem.slug}:clarify`), [problem]);
  const approachOrder = useMemo(() => shuffledIndices(problem.approaches.length, `${problem.slug}:approach`), [problem]);
  const followOrder = useMemo(() => shuffledIndices(problem.followUp.choices.length, `${problem.slug}:follow`), [problem]);
  const at = STAGES[stage];
  const elapsed = Math.floor((now - started.current) / 1000);

  const advance = () => {
    seconds.current[stage] = Math.round((Date.now() - started.current) / 1000);
    started.current = Date.now();
    setNow(Date.now());
    if (stage < STAGES.length - 1) { setStage(stage + 1); return; }
    finish();
  };

  const finish = () => {
    const implement = gradeImplement(problem, codeResult.results, codeResult.growth, approach);
    const graded: Record<Stage, Graded> = {
      clarify: gradeClarify(problem, picked),
      approach: approach !== null && claim ? gradeApproach(problem, approach, claim) : { level: "miss", why: "No approach was chosen." },
      implement,
      complexity: ownCost ? gradeComplexity(problem, ownCost, codeResult.growth, implement, approach) : { level: "miss", why: "No cost was given." },
      "follow-up": follow !== null ? gradeFollowUp(problem, follow) : { level: "miss", why: "No answer was given." },
    };
    const t = Date.now();
    for (const s of STAGES) {
      record({ task: "interview", stage: s, problem: problem.slug, concepts: problem.concepts, correct: graded[s].level === "pass", detail: `Mock interview, ${STAGE_LABEL[s].toLowerCase()}: ${graded[s].why}`, at: t });
    }
    const stages = Object.fromEntries(STAGES.map((s, i) => [s, { ...graded[s], seconds: seconds.current[i] ?? 0 }])) as Report["stages"];
    onFinish({ slug: problem.slug, at: t, stages, passed: passed(graded) });
  };

  const tryExample = async () => {
    setExample({ running: true, text: pythonReady() ? undefined : "Starting Python in your browser…" });
    const [result] = await checkSolution(problem, code, reference, run, [{ args: problem.example, label: problem.exampleLabel, kind: "example" }]);
    setExample({ running: false, text: result.error ? `${result.error.line ? `Line ${result.error.line}: ` : ""}${result.error.type}: ${result.error.message}` : result.pass ? "The example gives the right answer." : `The example gives ${JSON.stringify(result.got)}, not ${JSON.stringify(result.expected)}.` });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const cases = await buildCases(problem, run);
      const results = await checkSolution(problem, code, reference, run, cases);
      const growth = results.every((r) => r.pass) ? await measureGrowth(problem, code, run) : null;
      setCodeResult({ results, growth });
    } catch {
      setCodeResult({ results: null, growth: null });
    }
    setSubmitting(false);
    advance();
  };

  const canGo: Record<Stage, boolean> = { clarify: asked, approach: approach !== null && claim !== null, implement: true, complexity: ownCost !== null, "follow-up": follow !== null };

  return (
    <>
      <div className="iv-progress" aria-label="Stages">
        {STAGES.map((s, i) => <span key={s} className={i === stage ? "on" : i < stage ? "done" : ""}>{STAGE_LABEL[s]}</span>)}
        <span className={`iv-clock ${elapsed > SUGGESTED_MIN[at] * 60 ? "over" : ""}`} aria-label="Time on this stage">{mins(elapsed)} / {SUGGESTED_MIN[at]}m</span>
      </div>

      <section className="iv-problem">
        <p className="eyebrow">{problem.difficulty}</p>
        <p className="iv-statement">{problem.statement}</p>
        <p className="iv-example"><span className="muted">Example:</span> <code>{problem.exampleLabel}</code></p>
      </section>

      <section className="ask-card pl-card iv-stage" aria-label={STAGE_LABEL[at]}>
        {at === "clarify" && (
          <>
            <p className="ask-prompt">What would you ask before starting? Pick the questions worth asking.</p>
            <div className="iv-options">
              {clarifyOrder.map((i) => (
                <label key={i} className={`iv-option ${picked.includes(i) ? "on" : ""}`}>
                  <input type="checkbox" disabled={asked} checked={picked.includes(i)} onChange={() => setPicked(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i])} />
                  <span>{problem.clarify[i].ask}</span>
                </label>
              ))}
            </div>
            {!asked ? (
              <button type="button" className="btn-gray" disabled={!picked.length} onClick={() => setAsked(true)}>Ask {picked.length || ""}</button>
            ) : (
              <dl className="iv-answers">{picked.map((i) => <div key={i}><dt>{problem.clarify[i].ask}</dt><dd>{problem.clarify[i].answer}</dd></div>)}</dl>
            )}
          </>
        )}
        {at === "approach" && (
          <>
            <p className="ask-prompt">Which approach will you take?</p>
            <div className="iv-options">
              {approachOrder.map((i) => (
                <label key={i} className={`iv-option ${approach === i ? "on" : ""}`}>
                  <input type="radio" name="approach" checked={approach === i} onChange={() => setApproach(i)} />
                  <span>{problem.approaches[i].name}</span>
                </label>
              ))}
            </div>
            <p className="ask-prompt iv-sub">How does its running time grow?</p>
            <TimeChoices value={claim} onChange={setClaim} />
          </>
        )}
        {at === "implement" && (
          <>
            <p className="ask-prompt">Write it in Python. Run the example as often as you like; submitting runs the hidden tests.</p>
            <Editor value={code} onChange={setCode} onRun={tryExample} />
            <div className="solve-actions">
              <button type="button" className="btn-gray" onClick={tryExample} disabled={example.running || submitting}>{example.running ? "Running…" : "Run the Example"}</button>
              <span className="solve-spacer" />
              <button type="button" className="btn-filled" onClick={submit} disabled={submitting}>{submitting ? "Testing…" : "Submit"}</button>
            </div>
            {example.text && <p className="solve-status" role="status">{example.text}</p>}
          </>
        )}
        {at === "complexity" && (
          <>
            <p className="ask-prompt">How does the running time of <em>your</em> code grow?</p>
            <TimeChoices value={ownCost} onChange={setOwnCost} />
          </>
        )}
        {at === "follow-up" && (
          <>
            <p className="ask-prompt">{problem.followUp.ask}</p>
            <div className="iv-options">
              {followOrder.map((i) => (
                <label key={i} className={`iv-option ${follow === i ? "on" : ""}`}>
                  <input type="radio" name="follow" checked={follow === i} onChange={() => setFollow(i)} />
                  <span>{problem.followUp.choices[i].text}</span>
                </label>
              ))}
            </div>
          </>
        )}
        {at !== "implement" && (
          <div className="pl-actions">
            <button type="button" className="btn-filled" disabled={!canGo[at]} onClick={advance}>{stage === STAGES.length - 1 ? "Finish" : "Next"}</button>
          </div>
        )}
      </section>
    </>
  );
}

function TimeChoices({ value, onChange }: { value: Time | null; onChange: (t: Time) => void }) {
  return (
    <div className="iv-times" role="radiogroup" aria-label="Running time">
      {TIMES.map((t) => <button key={t} type="button" role="radio" aria-checked={value === t} className={`iv-time ${value === t ? "on" : ""}`} onClick={() => onChange(t)}>{O(t)}</button>)}
    </div>
  );
}

function ReportView({ report, problem, onConcept, onDone }: { report: Report; problem: InterviewProblem; onConcept: (id: string) => void; onDone: () => void }) {
  const best = problem.approaches.filter((a) => a.best);
  const missed = problem.clarify.filter((c) => c.matters);
  return (
    <>
      <section className={`pl-result iv-verdict ${report.passed ? "passed" : ""}`} aria-live="polite">
        <p className="eyebrow">{problem.title}</p>
        <h2>{report.passed ? "Passed" : "Not yet"}</h2>
        <p className="pl-sub">{report.passed ? "An optimal approach, working code, and the right cost, with nothing missed." : "To pass: an optimal approach, code that passes every test as fast as it should, and the right cost, with nothing missed elsewhere."}</p>
      </section>
      <ol className="iv-report">
        {STAGES.map((s) => (
          <li key={s} className={`iv-row ${report.stages[s].level}`}>
            <span className="iv-level">{LEVEL_LABEL[report.stages[s].level]}</span>
            <span className="iv-name">{STAGE_LABEL[s]} <span className="muted">· {mins(report.stages[s].seconds)}</span></span>
            <span className="iv-why">{report.stages[s].why}</span>
          </li>
        ))}
      </ol>
      <section className="followups">
        <h2>What an interviewer hoped to hear</h2>
        <details className="followup"><summary>The questions that matter</summary><ul className="bullets">{missed.map((c) => <li key={c.ask}><strong>{c.ask}</strong> {c.answer}</li>)}</ul></details>
        <details className="followup"><summary>The optimal approach</summary><ul className="bullets">{best.map((a) => <li key={a.name}><strong>{a.name}</strong> ({O(a.time)}). {a.why}</li>)}</ul></details>
        <details className="followup"><summary>A reference solution</summary><pre className="rv-code"><code>{fixtureSourceOf(problem.solution)}</code></pre></details>
      </section>
      <p className="rv-actions">
        Concepts: {problem.concepts.map((c, i) => <span key={c}>{i > 0 && ", "}<button type="button" className="link" onClick={() => onConcept(c)}>{conceptById.get(c)!.name}</button></span>)} · <a href={problem.url} target="_blank" rel="noreferrer">On LeetCode ↗</a>
      </p>
      <div className="pl-actions"><button type="button" className="btn-filled" onClick={onDone}>Done</button></div>
    </>
  );
}
