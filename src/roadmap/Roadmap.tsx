import { useEffect, useMemo, useState } from "react";
import { ATTRIBUTION, CURRICULUM, WEEKS, weekDates, type CurriculumProblem, type Tier } from "../curriculum/curriculum";
import { currentWeek, nextProblem, progressOf, type Progress } from "../curriculum/roadmap";
import { conceptById } from "../knowledge/concepts";
import { useEvidence } from "../knowledge/evidence";
import { assess } from "../knowledge/model";

// The 16-week plan: what each week teaches, its problems, and where the evidence says you are.

const TIER_LABEL: Record<Tier, string> = { core: "Core", reinforcement: "Reinforcement", stretch: "Stretch" };
const PROGRESS_LABEL: Record<Progress, string> = { new: "", practised: "Practised", solved: "Solved" };
const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });

interface Props { onOpen: (slug: string) => void; onConcept: (id: string) => void; onHome: () => void }

export function Roadmap({ onOpen, onConcept, onHome }: Props) {
  const log = useEvidence();
  const states = useMemo(() => assess(log), [log]);
  const now = currentWeek(states);
  const next = nextProblem(states, log);
  const [all, setAll] = useState<boolean>(() => { try { return localStorage.getItem("pillow.roadmapTiers") === "all"; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem("pillow.roadmapTiers", all ? "all" : "core"); } catch { /* a convenience */ } }, [all]);
  useEffect(() => { document.title = "Roadmap · Pillow"; }, []);
  const shown = all ? CURRICULUM : CURRICULUM.filter((p) => p.tier === "core");

  return (
    <main className="roadmap">
      <header className="map-top">
        <button type="button" className="glass-circle" onClick={onHome} aria-label="Back to search">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
        </button>
        <div>
          <h1>Roadmap</h1>
          <p className="map-sub">Week {now} of {WEEKS.length} · {CURRICULUM.length} problems · {CURRICULUM.filter((p) => progressOf(log, p.slug) === "solved").length} solved</p>
        </div>
      </header>

      {next && (
        <button type="button" className="next-row rm-next" onClick={() => onOpen(next.slug)}>
          <span className="next-kind">Next</span>
          <span className="next-title">{next.title}</span>
          <span className="next-why">Week {next.week}: {WEEKS[next.week - 1].title.toLowerCase()}. It teaches {next.concepts.slice(0, 2).map((c) => conceptById.get(c)!.name.toLowerCase()).join(" and ")}.</span>
        </button>
      )}

      <div className="map-modes" role="tablist" aria-label="Problems shown">
        <button type="button" role="tab" aria-selected={!all} className={!all ? "on" : ""} onClick={() => setAll(false)}>Core</button>
        <button type="button" role="tab" aria-selected={all} className={all ? "on" : ""} onClick={() => setAll(true)}>All tiers</button>
      </div>

      <ol className="rm-weeks">
        {WEEKS.map((w) => {
          const problems = shown.filter((p) => p.week === w.week);
          const { from, to } = weekDates(w.week);
          return (
            <li key={w.week} className={`rm-week ${w.week === now ? "now" : ""}`}>
              <details open={w.week === now}>
                <summary>
                  <span className="rm-num">Week {w.week}</span>
                  <span className="rm-title">{w.title}</span>
                  <span className="rm-dates">{fmt(from)} – {fmt(to)}{w.week === now ? " · You’re here" : ""}</span>
                </summary>
                {w.introduces.length > 0 && (
                  <div className="rm-concepts" aria-label="Concepts this week">
                    {w.introduces.map((c) => (
                      <button key={c} type="button" className="rm-chip" onClick={() => onConcept(c)}>
                        <i className={`dot ${states.get(c)?.state ?? "unseen"}`} aria-hidden="true" />
                        {conceptById.get(c)!.name}
                      </button>
                    ))}
                  </div>
                )}
                {problems.length ? (
                  <ul className="rm-problems">
                    {problems.map((p) => <Row key={p.slug} p={p} progress={progressOf(log, p.slug)} onOpen={onOpen} />)}
                  </ul>
                ) : (
                  <p className="rm-empty">{w.introduces.length ? "No core problems this week: switch to All tiers." : "Review what’s due, and practise unseen problems against the clock."}</p>
                )}
              </details>
            </li>
          );
        })}
      </ol>

      <p className="rm-credit">
        Problem lists: {ATTRIBUTION.lists.join(", ")}, compiled in <a href={ATTRIBUTION.source} target="_blank" rel="noreferrer">sumitsingh4411/faang</a> ({ATTRIBUTION.license}). Problems link to LeetCode; Pillow restates them in its own words.
      </p>
    </main>
  );
}

function Row({ p, progress, onOpen }: { p: CurriculumProblem; progress: Progress; onOpen: (slug: string) => void }) {
  const body = (
    <>
      <span className="rm-ptitle">{p.title}</span>
      <span className="rm-meta">
        <span className={`rm-diff ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
        <span>{TIER_LABEL[p.tier]}</span>
        <span>{conceptById.get(p.primary)!.name}</span>
      </span>
      <span className={`rm-status ${progress}`}>{p.lesson === "built" ? PROGRESS_LABEL[progress] || "Lesson" : "On LeetCode ↗"}</span>
    </>
  );
  return (
    <li>
      {p.lesson === "built"
        ? <button type="button" className="rm-row" onClick={() => onOpen(p.slug)}>{body}</button>
        : <a className="rm-row planned" href={p.url} target="_blank" rel="noreferrer" title="Lesson coming: practise it on LeetCode for now">{body}</a>}
    </li>
  );
}
