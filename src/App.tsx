import { lazy, Suspense, useEffect, useState } from "react";
import { PROBLEMS, type Problem } from "./content/problems";
import { Explain } from "./explain/Explain";
import { Learn } from "./learn/Learn";
import { KnowledgeMap } from "./map/KnowledgeMap";
import { Playground } from "./play/Playground";
import { Home } from "./home/Home";
import { loadRemote } from "./lib/remote";
import { href, useRoute } from "./lib/router";
import { Workspace } from "./workspace/Workspace";

// The roadmap carries the 205-problem curriculum: load it only when it's opened.
const Roadmap = lazy(() => import("./roadmap/Roadmap").then((m) => ({ default: m.Roadmap })));
const Placement = lazy(() => import("./diagnostic/Placement").then((m) => ({ default: m.Placement })));

// Routes:
//   /                      search, and your notes
//   /p/<slug>              learn it: problem, slow way, trick, fast way, note
//   /p/<slug>/play         play with it: edit the input, race both solutions
//   /p/<slug>/lesson       the full lesson, chapter by chapter (?chapter=)
//   /explain?q=…           a problem that isn't in the library yet
//   /map                   your knowledge map, from the evidence of what you've answered
//   /roadmap               the 16-week plan, and where you are in it
//   /placement             a few questions to find your starting week
export function App() {
  const [route, go] = useRoute();
  const m = route.path.match(/^\/p\/([\w-]+)(\/lesson|\/play)?\/?$/);
  const home = () => go("/");

  if (route.path === "/explain") {
    return <Explain query={route.search.get("q") ?? ""} onOpen={(slug) => go(`/p/${slug}`, { replace: true })} onHome={home} />;
  }
  if (m) {
    const show = (problem: Problem) => m[2] === "/play" ? (
      <Playground key={problem.slug} problem={problem} onHome={() => go(`/p/${problem.slug}`)} onLesson={() => go(`/p/${problem.slug}/lesson`)} />
    ) : m[2] ? (
      <Workspace
        key={problem.slug}
        problem={problem}
        chapter={route.search.get("chapter")}
        onChapter={(id) => go(`/p/${problem.slug}/lesson?chapter=${id}`)}
        onHome={() => go(`/p/${problem.slug}`)}
      />
    ) : (
      <Learn key={problem.slug} problem={problem} onHome={home} onPlay={() => go(`/p/${problem.slug}/play`)} onLesson={() => go(`/p/${problem.slug}/lesson`)} onConcept={(id) => go(`/map?c=${id}`)} />
    );
    const builtIn = PROBLEMS.find((p) => p.slug === m[1]);
    return builtIn ? show(builtIn) : <Remote key={m[1]} slug={m[1]} onHome={home} render={show} />;
  }
  if (route.path === "/map") {
    return <KnowledgeMap key={route.search.get("c") ?? ""} initial={route.search.get("c")} onOpen={(slug) => go(`/p/${slug}`)} onHome={() => (history.length > 1 ? history.back() : home())} />;
  }
  if (route.path === "/roadmap") {
    return (
      <Suspense fallback={<main className="roadmap" aria-busy="true" />}>
        <Roadmap onOpen={(slug) => go(`/p/${slug}`)} onConcept={(id) => go(`/map?c=${id}`)} onPlacement={() => go("/placement")} onHome={() => (history.length > 1 ? history.back() : home())} />
      </Suspense>
    );
  }
  if (route.path === "/placement") {
    return (
      <Suspense fallback={<main className="placement" aria-busy="true" />}>
        <Placement onRoadmap={() => go("/roadmap", { replace: true })} onHome={home} />
      </Suspense>
    );
  }
  if (route.path !== "/") return <NotFound onHome={home} message="There’s nothing at this address." />;
  return <Home onOpen={(slug) => go(`/p/${slug}`)} onExplain={(q) => go(`/explain?q=${encodeURIComponent(q)}`)} onMap={() => go("/map")} onRoadmap={() => go("/roadmap")} onPlacement={() => go("/placement")} />;
}

/** A problem explained live, loaded from Pillow's server, then shown like any other. */
function Remote({ slug, onHome, render }: { slug: string; onHome: () => void; render: (p: Problem) => React.ReactNode }) {
  const [state, setState] = useState<{ problem?: Problem; error?: string }>({});
  useEffect(() => {
    loadRemote(slug).then((problem) => setState({ problem }), (e: Error) => setState({ error: e.message }));
  }, [slug]);
  if (state.problem) return <>{render(state.problem)}</>;
  return state.error ? <NotFound onHome={onHome} message={state.error} /> : <main className="home" aria-busy="true" />;
}

function NotFound({ onHome, message }: { onHome: () => void; message: string }) {
  return (
    <main className="home">
      <h1 className="wordmark">Not Found</h1>
      <p className="home-sub">{message} <a href={href("/")} onClick={(e) => { e.preventDefault(); onHome(); }}>Search for a problem</a>.</p>
    </main>
  );
}
