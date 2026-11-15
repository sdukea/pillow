import { useEffect, useState } from "react";
import type { LiveInput } from "../lib/useLiveRun";
import type { Problem } from "../content/problems";
import { ApproachAfter, ApproachIntro, Compare, Understand } from "../lesson/chapters";
import { chaptersOf } from "./chapters";
import { Player } from "./Player";

interface Props {
  problem: Problem;
  /** "understand", an approach id, or "compare". Problems without a lesson only use approach ids. */
  chapter: string | null;
  onChapter: (chapter: string) => void;
  onHome: () => void;
}


export function Workspace({ problem, chapter, onChapter, onHome }: Props) {
  const chapters = chaptersOf(problem);
  const current = chapters.find((c) => c.id === chapter) ?? (problem.lesson ? chapters[0] : chapters.at(-1)!);
  const index = chapters.indexOf(current);
  const next = chapters[index + 1];
  const approach = problem.approaches.find((a) => a.id === current.id);
  const lesson = problem.lesson;
  // One custom input per visit, shared by every approach so they can be compared on it.
  const [input, setInput] = useState<LiveInput | null>(null);

  useEffect(() => {
    document.title = `${problem.title} · LeetSee`;
  }, [problem]);
  useEffect(() => {
    scrollTo(0, 0);
    // On narrow screens the chapter switcher scrolls sideways; keep the current chapter in view
    // (by scrolling the switcher itself, never the page).
    const nav = document.querySelector<HTMLElement>(".ws-head .segmented");
    const on = nav?.querySelector<HTMLElement>("[aria-current]");
    if (nav && on && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2;
  }, [current.id]);

  return (
    <div className="workspace">
      <header className="ws-head">
        <button type="button" className="back" onClick={onHome} aria-label="All problems">
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
        </button>
        <div className="ws-title">
          <h1>{problem.title}</h1>
          <a href={`https://leetcode.com/problems/${problem.leetcode.slug}/`} target="_blank" rel="noreferrer" className="lc-link">LeetCode {problem.leetcode.number}</a>
        </div>
        {chapters.length > 1 && (
          <nav className="segmented" aria-label={lesson ? "Chapters" : "Approach"}>
            {chapters.map((c, i) => (
              <button key={c.id} type="button" aria-current={c.id === current.id ? "page" : undefined} className={c.id === current.id ? "on" : ""} onClick={() => onChapter(c.id)}>
                {lesson && <span className="seg-num">{i + 1}</span>}{c.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {!lesson && approach && <main className="ws-solo"><Player problem={problem} approach={approach} input={input} onInput={setInput} /></main>}

      {lesson && current.id === "understand" && <Understand problem={problem} onNext={() => onChapter(next.id)} />}

      {lesson && approach && (
        <>
          <ApproachIntro problem={problem} approach={approach} index={index - 1} />
          <section className="player-band" aria-label="Watch it run"><Player problem={problem} approach={approach} notes={lesson.approaches[approach.id].notes} input={input} onInput={setInput} /></section>
          <ApproachAfter problem={problem} approach={approach} onNext={() => onChapter(next.id)} nextLabel={next.id === "compare" ? "Compare the approaches" : `Next: ${next.label.toLowerCase()}`} />
        </>
      )}

      {lesson && current.id === "compare" && <Compare problem={problem} onBack={onHome} />}
    </div>
  );
}
