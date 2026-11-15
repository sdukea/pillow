import type { ViewModel } from "../../engine/interpreter/viewmodel";

type ListProps = Extract<ViewModel, { kind: "linked-list" }>;
type TreeProps = Extract<ViewModel, { kind: "tree" }>;
type StackProps = Extract<ViewModel, { kind: "call-stack" }>;

// ------------------------------------------------------------------ linked list
const NODE_W = 76;   // value box + next slot
const NODE_H = 40;
const GAP = 44;
const STEP = NODE_W + GAP;
const LABELS = 26;   // room above the nodes for pointer names

/**
 * Nodes stay in their original order, so the learner watches the arrows flip rather than boxes move.
 * Each node is [value | next]. An arrow leaves the next slot; an empty slot shows ∅.
 */
export function LinkedListView({ label, nodes }: ListProps) {
  const pos = new Map(nodes.map((n, i) => [n.id, i]));
  const width = Math.max(nodes.length * STEP - GAP, NODE_W);
  const height = LABELS + NODE_H + 46;
  const y = LABELS + NODE_H / 2;

  const arrows = nodes.flatMap((n, i) => {
    if (n.next === null || !pos.has(n.next)) return [];
    const j = pos.get(n.next)!;
    const slotX = i * STEP + NODE_W - 14;
    if (j === i + 1) return [{ key: n.id, d: `M ${i * STEP + NODE_W} ${y - 6} L ${j * STEP - 3} ${y - 6}`, changed: n.nextChanged }];
    if (j === i - 1) return [{ key: n.id, d: `M ${slotX} ${y + NODE_H / 2} C ${slotX} ${y + 40}, ${j * STEP + NODE_W / 2} ${y + 40}, ${j * STEP + NODE_W / 2} ${y + NODE_H / 2 + 3}`, changed: n.nextChanged }];
    // Farther away: arc underneath.
    return [{ key: n.id, d: `M ${slotX} ${y + NODE_H / 2} C ${slotX} ${y + 46}, ${j * STEP + NODE_W / 2} ${y + 46}, ${j * STEP + NODE_W / 2} ${y + NODE_H / 2 + 3}`, changed: n.nextChanged }];
  });

  return (
    <figure className="view">
      <figcaption className="view-label">{label}</figcaption>
      {nodes.length === 0 ? <p className="view-empty">Empty list</p> : (
        <div className="array-scroll">
          <div className="llist" style={{ width, height }}>
            <svg className="llist-arrows" width={width} height={height} aria-hidden="true">
              <defs>
                <marker id="ll-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 z" className="arrowhead" /></marker>
                <marker id="ll-head-hot" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 z" className="arrowhead hot" /></marker>
              </defs>
              {arrows.map((a) => <path key={a.key} d={a.d} className={`arrow ${a.changed ? "hot" : ""}`} markerEnd={`url(#${a.changed ? "ll-head-hot" : "ll-head"})`} />)}
            </svg>
            {nodes.map((n, i) => (
              <div key={n.id} className={`lnode ${n.nextChanged ? "rewired" : ""} ${n.pointers.length ? "pointed" : ""}`} style={{ left: i * STEP, top: LABELS }}>
                <span className="lnode-val">{n.text}</span>
                <span className="lnode-next" aria-label={n.next === null ? "next is None" : "next"}>{n.next === null ? "∅" : "•"}</span>
                <div className="lnode-labels">{n.pointers.map((p) => <span key={p} className="ptr-tag">{p}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="sr-only">
        {nodes.map((n) => `${n.text}${n.pointers.length ? ` (${n.pointers.join(", ")})` : ""} points to ${n.next === null ? "nothing" : nodes.find((m) => m.id === n.next)?.text}`).join("; ")}
      </p>
    </figure>
  );
}

// ------------------------------------------------------------------ tree
const COL = 54;
const ROW = 70;
const R = 20;

/** A binary tree with a fixed layout. The active call's node is filled; nodes waiting on the call stack are ringed. */
export function TreeView({ label, nodes, edges }: TreeProps) {
  const at = new Map(nodes.map((n) => [n.id, n]));
  const width = Math.max(...nodes.map((n) => n.x), 0) * COL + 2 * R + 8;
  const height = Math.max(...nodes.map((n) => n.y), 0) * ROW + 2 * R + 30;
  const cx = (x: number) => x * COL + R + 4;
  const cy = (y: number) => y * ROW + R + 4;
  return (
    <figure className="view">
      <figcaption className="view-label">{label}</figcaption>
      {nodes.length === 0 ? <p className="view-empty">Empty tree</p> : (
        <div className="array-scroll">
          <div className="tree" style={{ width, height }}>
            <svg width={width} height={height} aria-hidden="true">
              {edges.map((e) => {
                const a = at.get(e.from)!, b = at.get(e.to)!;
                return <line key={`${e.from}-${e.to}`} x1={cx(a.x)} y1={cy(a.y)} x2={cx(b.x)} y2={cy(b.y)} className={`edge ${a.onStack && b.onStack ? "hot" : ""}`} />;
              })}
            </svg>
            {nodes.map((n) => (
              <div key={n.id} className={`tnode ${n.current ? "current" : ""} ${n.onStack && !n.current ? "waiting" : ""} ${n.returned !== undefined ? "done" : ""}`} style={{ left: cx(n.x) - R, top: cy(n.y) - R }}>
                <span>{n.text}</span>
                {n.returned !== undefined && <span className="tnode-ret" aria-label={`returned ${n.returned}`}>{n.returned}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </figure>
  );
}

/** The call stack, most recent call on top. */
export function CallStackView({ label, frames }: StackProps) {
  return (
    <figure className="view">
      <figcaption className="view-label">{label}</figcaption>
      <ol className="callstack" reversed>
        {[...frames].reverse().map((f, i) => (
          <li key={frames.length - i} className={f.active ? "active" : ""}>
            <code>{f.fn}({f.detail || <span className="muted">None</span>})</code>
          </li>
        ))}
      </ol>
    </figure>
  );
}
