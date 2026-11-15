import { useEffect } from "react";
import { PROBLEMS } from "./content/problems";
import { Home, rememberVisit } from "./home/Home";
import { href, useRoute } from "./lib/router";
import { useTheme } from "./lib/theme";
import { Workspace } from "./workspace/Workspace";

const THEME_LABEL = { system: "Theme: system", dark: "Theme: dark", light: "Theme: light" } as const;

export function App() {
  const [route, go] = useRoute();
  const theme = useTheme();
  const slug = route.path.match(/^\/p\/([\w-]+)/)?.[1];
  const problem = slug ? PROBLEMS.find((p) => p.slug === slug) : undefined;

  useEffect(() => {
    if (problem) rememberVisit(problem.slug);
    else document.title = "LeetSee";
  }, [problem]);

  return (
    <>
      <button type="button" className="theme-toggle" onClick={theme.cycle} aria-label={`${THEME_LABEL[theme.choice]}. Click to change.`} title={THEME_LABEL[theme.choice]}>
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <circle cx="10" cy="10" r="6.5" />
          <path d="M10 3.5a6.5 6.5 0 0 1 0 13z" className="fill" />
        </svg>
      </button>
      {problem ? (
        <Workspace
          key={problem.slug}
          problem={problem}
          chapter={route.search.get("chapter")}
          onChapter={(id) => go(`/p/${problem.slug}?chapter=${id}`)}
          onHome={() => go("/")}
        />
      ) : slug ? (
        <main className="home"><h1>Not found</h1><p>There’s no problem at this address. <a href={href("/")} onClick={(e) => { e.preventDefault(); go("/"); }}>See all problems</a>.</p></main>
      ) : (
        <Home onOpen={(p) => go(`/p/${p.slug}`)} />
      )}
    </>
  );
}
