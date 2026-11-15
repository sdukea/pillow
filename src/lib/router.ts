import { useCallback, useEffect, useState } from "react";

export interface Route { path: string; search: URLSearchParams }

const read = (): Route => ({ path: location.pathname, search: new URLSearchParams(location.search) });

/** A minimal history-API router: the app only has a home and a workspace. */
export function useRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    addEventListener("popstate", on);
    return () => removeEventListener("popstate", on);
  }, []);
  const go = useCallback((to: string, opts: { replace?: boolean } = {}) => {
    if (opts.replace) history.replaceState(null, "", to);
    else history.pushState(null, "", to);
    setRoute(read());
    if (!opts.replace) scrollTo(0, 0);
  }, []);
  return [route, go] as const;
}
