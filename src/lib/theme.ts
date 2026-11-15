import { useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";
const KEY = "leetsee.theme";

function stored(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** Follows the system theme unless the learner picks one; the choice is remembered. */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(stored);
  useEffect(() => {
    const root = document.documentElement;
    if (choice === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", choice);
    try {
      if (choice === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch { /* storage unavailable: the choice lasts for this visit */ }
  }, [choice]);
  const cycle = () => setChoice((c) => (c === "system" ? "dark" : c === "dark" ? "light" : "system"));
  return { choice, cycle };
}
