// Whether the placement check has been taken: a convenience so Home stops offering it. The
// placement itself is never read from here; it's re-derived from the evidence log.
const KEY = "pillow.placement";

export function placementTaken(): boolean {
  try { return localStorage.getItem(KEY) !== null; } catch { return false; }
}

export function markPlacementTaken(placed: number) {
  try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), placed })); } catch { /* a convenience */ }
}
