// Syntax highlighting for the read-only code pane. This is for display only; nothing here
// interprets the code (the tracer does that), so a careful tokenizer is all it needs.

export type TokenKind = "keyword" | "builtin" | "string" | "number" | "comment" | "def" | "op" | "plain";
export interface Token { kind: TokenKind; text: string }

const KEYWORDS = new Set(["def", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or", "is", "None", "True", "False", "break", "continue", "pass", "class", "lambda", "from", "import", "as", "with", "try", "except", "finally", "raise", "yield", "global", "nonlocal", "del", "assert"]);
const BUILTINS = new Set(["len", "range", "enumerate", "max", "min", "sum", "abs", "sorted", "reversed", "list", "dict", "set", "tuple", "int", "str", "float", "zip", "map", "filter", "print", "any", "all", "isinstance", "deque", "float"]);

const PATTERN = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z_\d])/g;

export function tokenizeLine(line: string): Token[] {
  const out: Token[] = [];
  let afterDef = false;
  for (const m of line.matchAll(PATTERN)) {
    const [text, comment, str, num, word, space] = m;
    let kind: TokenKind = "op";
    if (comment) kind = "comment";
    else if (str) kind = "string";
    else if (num) kind = "number";
    else if (word) kind = afterDef ? "def" : KEYWORDS.has(word) ? "keyword" : BUILTINS.has(word) ? "builtin" : "plain";
    else if (space) kind = "plain";
    if (word) afterDef = word === "def";
    out.push({ kind, text });
  }
  return out;
}
