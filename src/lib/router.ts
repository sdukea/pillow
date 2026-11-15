import { useCallback, useEffect, useState } from "react";

export interface Route { path: string; search: URLSearchParams }

// The app may be served under a base path (GitHub Pages serves it at /pillow/). Routes are
// written without it ("/p/two-sum") and the base is added and removed here only.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export const href = (to: string) => BASE + to;
const read = (): Route => {
  const path = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) || "/" : location.pathname;
  return { path, search: new URLSearchParams(location.search) };
};

/** A minimal history-API router: the app only has a home and a workspace. */
export function useRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    addEventListener("popstate", on);
    return () => removeEventListener("popstate", on);
  }, []);
  const go = useCallback((to: string, opts: { replace?: boolean } = {}) => {
    if (opts.replace) history.replaceState(null, "", href(to));
    else history.pushState(null, "", href(to));
    setRoute(read());
    if (!opts.replace) scrollTo(0, 0);
  }, []);
  return [route, go] as const;
}
