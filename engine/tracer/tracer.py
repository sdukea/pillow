"""LeetSee tracer: runs a reference solution and records every step of its execution.

The same file runs in two places, and must produce identical output in both:
  - CPython at build time, to precompute the traces shipped with the app;
  - Pyodide in a Web Worker on the learner's device, for custom inputs.

Each step records the event (call, line, return, exception), the line number,
every traced frame's local variables, and a heap graph of the containers and
objects reachable from them. Objects get stable sequential ids, so the same list
or node keeps the same id across steps (that is how aliasing and pointer moves
become visible) and two runs of the same input produce the same ids.

Command line (build time):
    PYTHONHASHSEED=0 python3 tracer.py < request.json > trace.json
"""

import json
import math
import sys
import types
from collections import deque

SOLUTION_FILE = "<solution>"
DEFAULT_MAX_STEPS = 3000
MAX_SAFE_INT = 2**53 - 1  # larger ints lose precision in JavaScript


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build_linked_list(values):
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head


def build_tree(values):
    """Build a binary tree from LeetCode-style level order, where None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        for side in ("left", "right"):
            if i < len(values) and values[i] is not None:
                child = TreeNode(values[i])
                setattr(node, side, child)
                queue.append(child)
            i += 1
    return root


def decode_arg(arg):
    kind = arg.get("kind", "value")
    if kind == "value":
        return arg["value"]
    if kind == "linked_list":
        return build_linked_list(arg["values"])
    if kind == "tree":
        return build_tree(arg["values"])
    raise ValueError(f"Unknown argument kind: {kind}")


class StepLimitReached(BaseException):
    """BaseException, not Exception, so a solution's own `except Exception` can't swallow it."""


class Tracer:
    def __init__(self, max_steps, count_only=False):
        self.max_steps = max_steps
        # Count-only mode records how often each line runs, without snapshots. Used to measure
        # how work grows with input size, on inputs too large to snapshot every step.
        self.count_only = count_only
        self.line_count = 0
        self.ids = {}       # id(obj) -> stable sequential id for this trace
        self.alive = []     # keep traced objects alive so CPython can't reuse their id()
        self.steps = []
        self.line_hits = {}

    def stable_id(self, obj):
        key = id(obj)
        if key not in self.ids:
            self.ids[key] = len(self.ids) + 1
            self.alive.append(obj)
        return self.ids[key]

    def encode(self, value, heap):
        """Encode a value for JSON. Containers and objects become {"ref": id} into the heap."""
        if value is None or isinstance(value, (bool, str)):
            return value
        if isinstance(value, int):
            return value if abs(value) <= MAX_SAFE_INT else {"bigint": str(value)}
        if isinstance(value, float):
            if math.isnan(value):
                return {"float": "nan"}
            if math.isinf(value):
                return {"float": "inf" if value > 0 else "-inf"}
            return value
        if isinstance(value, (types.FunctionType, types.BuiltinFunctionType, types.MethodType, type)):
            return {"callable": getattr(value, "__name__", type(value).__name__)}

        oid = self.stable_id(value)
        ref = {"ref": oid}
        key = str(oid)
        if key in heap:
            return ref
        heap[key] = None  # reserve before recursing, so cycles terminate
        if isinstance(value, (list, tuple, deque)):
            kind = "list" if isinstance(value, list) else "tuple" if isinstance(value, tuple) else "deque"
            heap[key] = {"type": kind, "items": [self.encode(v, heap) for v in value]}
        elif isinstance(value, dict):
            heap[key] = {"type": "dict", "entries": [[self.encode(k, heap), self.encode(v, heap)] for k, v in value.items()]}
        elif isinstance(value, (set, frozenset)):
            # Sort for determinism: set order depends on hashing, which differs between runtimes.
            heap[key] = {"type": "set", "items": [self.encode(v, heap) for v in sorted(value, key=repr)]}
        elif hasattr(value, "__dict__"):
            heap[key] = {"type": type(value).__name__, "fields": {k: self.encode(v, heap) for k, v in vars(value).items()}}
        else:
            heap[key] = {"type": type(value).__name__, "repr": repr(value)}
        return ref

    def snapshot(self, frame, event, arg):
        heap = {}
        frames = []
        f = frame
        while f is not None and f.f_code.co_filename == SOLUTION_FILE:
            local_vars = {k: self.encode(v, heap) for k, v in f.f_locals.items() if not k.startswith("__")}
            frames.append({"fn": f.f_code.co_name, "line": f.f_lineno, "locals": local_vars})
            f = f.f_back
        step = {"event": event, "line": frame.f_lineno, "frames": frames[::-1], "heap": heap}
        if event == "return":
            step["returned"] = self.encode(arg, heap)
        elif event == "exception":
            exc_type, exc_value, _ = arg
            step["exception"] = {"type": exc_type.__name__, "message": str(exc_value)}
        return step

    def hook(self, frame, event, arg):
        if frame.f_code.co_filename != SOLUTION_FILE:
            return None  # don't trace into library code
        if event in ("call", "line", "return", "exception"):
            if event == "line":
                self.line_hits[frame.f_lineno] = self.line_hits.get(frame.f_lineno, 0) + 1
                self.line_count += 1
            if self.count_only:
                if self.line_count > self.max_steps:
                    raise StepLimitReached()
                return self.hook
            if len(self.steps) >= self.max_steps:
                raise StepLimitReached()
            self.steps.append(self.snapshot(frame, event, arg))
        return self.hook

    def run(self, source, entry, args):
        namespace = {"ListNode": ListNode, "TreeNode": TreeNode, "deque": deque}
        exec(compile(source, SOLUTION_FILE, "exec"), namespace)
        fn = namespace.get(entry)
        if not callable(fn):
            raise NameError(f"The solution has no function called {entry}")
        call_args = [decode_arg(a) for a in args]
        result = {"steps": self.steps, "lineHits": None, "truncated": False}
        sys.settrace(self.hook)
        try:
            value = fn(*call_args)
            sys.settrace(None)
            result_heap = {}
            result["ok"] = True
            result["result"] = self.encode(value, result_heap)
            result["resultHeap"] = result_heap
        except StepLimitReached:
            result["ok"] = False
            result["truncated"] = True
            result["error"] = {"type": "StepLimitReached", "message": f"Stopped after {self.max_steps} steps"}
        except Exception as e:  # the solution itself raised
            result["ok"] = False
            result["error"] = {"type": type(e).__name__, "message": str(e)}
        finally:
            sys.settrace(None)
        result["lineHits"] = {str(k): v for k, v in sorted(self.line_hits.items())}
        return result


def trace(request):
    """Trace one call. request = {source, entry, args: [{kind, ...}], maxSteps?, countOnly?}."""
    tracer = Tracer(int(request.get("maxSteps", DEFAULT_MAX_STEPS)), bool(request.get("countOnly", False)))
    return tracer.run(request["source"], request["entry"], request.get("args", []))


def trace_json(request_json):
    return json.dumps(trace(json.loads(request_json)), sort_keys=True, allow_nan=False)


if __name__ == "__main__":
    sys.stdout.write(trace_json(sys.stdin.read()))
