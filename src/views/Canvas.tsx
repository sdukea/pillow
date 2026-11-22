import type { ViewModel } from "../../engine/interpreter/viewmodel";
import { ArrayView } from "./ArrayView";
import { MapView, SetView, StackView, VarsView } from "./CollectionViews";
import { CallStackView, LinkedListView, TreeView } from "./StructureViews";
import { GraphView, GridView, HeapView, UnionFindView } from "./AlgoViews";

/** Draws every view for a moment. Purely generic: it only reads view models. */
export function Canvas({ views }: { views: ViewModel[] }) {
  return (
    <div className="canvas">
      {views.map((v) => {
        switch (v.kind) {
          case "array": return <ArrayView key={v.id} {...v} />;
          case "map": return <MapView key={v.id} {...v} />;
          case "set": return <SetView key={v.id} {...v} />;
          case "stack":
          case "queue": return <StackView key={v.id} {...v} />;
          case "vars": return <VarsView key={v.id} {...v} />;
          case "linked-list": return <LinkedListView key={v.id} {...v} />;
          case "tree": return <TreeView key={v.id} {...v} />;
          case "call-stack": return <CallStackView key={v.id} {...v} />;
          case "grid": return <GridView key={v.id} {...v} />;
          case "heap": return <HeapView key={v.id} {...v} />;
          case "graph": return <GraphView key={v.id} {...v} />;
          case "union-find": return <UnionFindView key={v.id} {...v} />;
        }
      })}
    </div>
  );
}
