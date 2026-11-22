// Past mock interviews: the reports, kept in this browser. Evidence from each stage also goes into
// the evidence log, so the map and roadmap learn from interviews like everything else.
import type { Report } from "./grade";

const KEY = "pillow.interviews";

export function loadReports(): Report[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((r) => r && typeof r.slug === "string" && typeof r.at === "number") : [];
  } catch {
    return [];
  }
}

export function saveReport(report: Report) {
  try { localStorage.setItem(KEY, JSON.stringify([...loadReports(), report])); } catch { /* reports are a convenience; evidence is recorded separately */ }
}
