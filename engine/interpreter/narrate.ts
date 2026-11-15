// Narration templates: text with {expressions} filled in from the real state at a moment.
// Write {{ or }} for a literal brace.

import { evaluate, isTruthy, type Scope } from "./expr";
import type { Narration } from "./spec";
import { format } from "./values";

export function render(template: string, scope: Scope): string {
  return template.replace(/\{\{|\}\}|\{([^{}]+)\}/g, (match, expr: string | undefined) => {
    if (match === "{{") return "{";
    if (match === "}}") return "}";
    const v = evaluate(expr!.trim(), scope);
    // Strings read naturally in prose without Python's quotes when they're single characters or words.
    return typeof v === "string" ? v : format(v, scope.heap);
  });
}

/** The first narration whose condition holds, rendered. Undefined if none apply. */
export function narrate(options: Narration[] | undefined, scope: Scope): string | undefined {
  for (const n of options ?? []) {
    if (n.when === undefined || isTruthy(n.when, scope)) return render(n.text, scope);
  }
  return undefined;
}
