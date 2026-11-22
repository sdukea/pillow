import type { ViewModel } from "../../engine/interpreter/viewmodel";

// Grids (DP tables), heaps, graphs and union-find. Like every view, they only draw a view model:
// all meaning (what changed, what's current) was decided from the real trace.

type GridProps = Extract<ViewModel, { kind: "grid" }>;
type HeapProps = Extract<ViewModel, { kind: "heap" }>;
type GraphProps = Extract<ViewModel, { kind: "graph" }>;
type ForestProps = Extract<ViewModel, { kind: "union-find" }>;

const R = 20;

/** A table with row and column numbers. Filled cells flash; cells the line reads are outlined. */
export function GridView({ label, present, rows }: GridProps) {
  const cols = Math.max(0, ...rows.map((r) => r.length));
  return (
    <figure className="view">
      <figcaption className="view-label">{label}</figcaption>
      {!present ? <p className="view-empty">Not created yet</p> : rows.length === 0 ? <p className="view-empty">Empty</p> : (
        <div className="array-scroll">
          <table className="grid-view">
            <thead><tr><th aria-hidden="true" />{Array.from({ length: cols }, (_, c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  <th scope="row">{r}</th>
                  {row.map((cell, c) => (
                    <td key={c} className={`gcell st-${cell.state} ${cell.focused ? "focused" : ""} ${cell.pointers.length ? "pointed" : ""}`}>
                      <span className="cell-value">{cell.text}</span>
                      {cell.pointers.length > 0 && <span className="gcell-tag">{cell.pointers.join(", ")}</span>}
                      {cell.focused && <span className="sr-only"> (read by this line)</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}

/** The heap as the tree it represents (top = index 0), with the list it's stored in underneath. */
export function HeapView({ label, present, items, removed }: HeapProps) {
  const levels = items.length ? Math.floor(Math.log2(items.length)) + 1 : 0;
  const slots = 2 ** Math.max(levels - 1, 0);
  const COLW = 50, ROWH = 64;
  const width = Math.max(slots * COLW, 2 * R + 8);
  const pos = items.map((_, i) => {
    const depth = Math.floor(Math.log2(i + 1));
    const inLevel = i - (2 ** depth - 1);
    const span = width / 2 ** depth;
    return { x: span * inLevel + span / 2, y: depth * ROWH + R + 4 };
  });
  const height = levels * ROWH + 8;
  return (
    <figure className="view">
      <figcaption className="view-label">{label}</figcaption>
      {!present ? <p className="view-empty">Not created yet</p> : items.length === 0 && removed.length === 0 ? <p className="view-empty">Empty</p> : (
        <div className="array-scroll">
          {items.length > 0 && (
            <div className="tree heap-tree" style={{ width, height }}>
              <svg width={width} height={height} aria-hidden="true">
                {items.map((_, i) => i === 0 ? null : <line key={i} x1={pos[Math.floor((i - 1) / 2)].x} y1={pos[Math.floor((i - 1) / 2)].y} x2={pos[i].x} y2={pos[i].y} className="edge" />)}
              </svg>
              {items.map((it, i) => (
                <div key={i} className={`tnode st-${it.state} ${i === 0 ? "top" : ""}`} style={{ left: pos[i].x - R, top: pos[i].y - R }}>
                  <span>{it.text}</span>
                </div>
              ))}
            </div>
          )}
          <p className="heap-list"><span className="muted">as a list:</span> [{items.map((it) => it.text).join(", ")}]{removed.length > 0 && <span className="heap-removed"> · removed {removed.join(", ")}</span>}</p>
        </div>
      )}
    </figure>
  );
}

/** Nodes on a circle that never moves. Filled: being handled. Ringed: waiting. Green: done. */
export function GraphView({ label, present, directed, nodes, edges }: GraphProps) {
  const SIZE = Math.min(360, Math.max(200, nodes.length * 46));
  const at = new Map(nodes.map((n) => [n.key, { x: n.x * SIZE, y: n.y * SIZE }]));
  const line = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    // Stop short of the circles so arrowheads stay visible.
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    return { x1: a.x + (dx / d) * R, y1: a.y + (dy / d) * R, x2: b.x - (dx / d) * (R + 3), y2: b.y - (dy / d) * (R + 3) };
  };
  return (
    <figure className="view">
      <figcaption className="view-label">{label}</figcaption>
      {!present ? <p className="view-empty">Not created yet</p> : (
        <div className="array-scroll">
          <div className="tree graph-view" style={{ width: SIZE, height: SIZE }}>
            <svg width={SIZE} height={SIZE} aria-hidden="true">
              <defs>
                <marker id="g-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 z" className="arrowhead" /></marker>
                <marker id="g-head-hot" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 z" className="arrowhead hot" /></marker>
              </defs>
              {edges.map((e) => {
                const a = at.get(e.from), b = at.get(e.to);
                if (!a || !b) return null;
                const l = line(a, b);
                return (
                  <g key={`${e.from}>${e.to}`}>
                    <line {...l} className={`edge ${e.fresh ? "hot" : ""}`} markerEnd={directed ? `url(#${e.fresh ? "g-head-hot" : "g-head"})` : undefined} />
                    {e.weight !== undefined && <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} className="edge-weight">{e.weight}</text>}
                  </g>
                );
              })}
            </svg>
            {nodes.map((n) => (
              <div key={n.key} className={`tnode ${n.current ? "current" : ""} ${n.frontier && !n.current ? "waiting" : ""} ${n.visited && !n.current ? "done" : ""}`} style={{ left: n.x * SIZE - R, top: n.y * SIZE - R }}>
                <span>{n.key}</span>
              </div>
            ))}
          </div>
          <p className="sr-only">{edges.map((e) => `${e.from} ${directed ? "to" : "and"} ${e.to}`).join(", ")}</p>
        </div>
      )}
    </figure>
  );
}

/** Union-find's groups: each item's arrow points up to its parent; a root (ringed twice) points to itself. */
export function UnionFindView({ label, present, nodes }: ForestProps) {
  const COLW = 54, ROWH = 70;
  const width = (Math.max(0, ...nodes.map((n) => n.x)) + 1) * COLW;
  const height = (Math.max(0, ...nodes.map((n) => n.y)) + 1) * ROWH;
  const cx = (x: number) => x * COLW + COLW / 2, cy = (y: number) => y * ROWH + R + 4;
  const at = new Map(nodes.map((n) => [n.key, n]));
  return (
    <figure className="view">
      <figcaption className="view-label">{label}</figcaption>
      {!present ? <p className="view-empty">Not created yet</p> : (
        <div className="array-scroll">
          <div className="tree" style={{ width, height }}>
            <svg width={width} height={height} aria-hidden="true">
              <defs>
                <marker id="uf-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 z" className="arrowhead" /></marker>
                <marker id="uf-head-hot" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 z" className="arrowhead hot" /></marker>
              </defs>
              {nodes.filter((n) => !n.root && at.has(n.parent)).map((n) => {
                const p = at.get(n.parent)!;
                const x1 = cx(n.x), y1 = cy(n.y) - R, x2 = cx(p.x), y2 = cy(p.y) + R + 3;
                return <line key={n.key} x1={x1} y1={y1} x2={x2} y2={y2} className={`edge ${n.changed ? "hot" : ""}`} markerEnd={`url(#${n.changed ? "uf-head-hot" : "uf-head"})`} />;
              })}
            </svg>
            {nodes.map((n) => (
              <div key={n.key} className={`tnode ${n.root ? "root" : ""} ${n.changed ? "st-updated" : ""}`} style={{ left: cx(n.x) - R, top: cy(n.y) - R }}>
                <span>{n.key}</span>
              </div>
            ))}
          </div>
          <p className="sr-only">{nodes.map((n) => (n.root ? `${n.key} is a root` : `${n.key} points to ${n.parent}`)).join(", ")}</p>
        </div>
      )}
    </figure>
  );
}
