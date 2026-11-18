// Step one of explaining a new problem: turn whatever someone typed (a name, a number, a link or the
// pasted problem) into a brief. A separate model call from the draft, so the brief's expected
// outputs are an independent check on the drafted solutions, not something the drafter wrote.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Brief } from "../src/content/draft";
import { BriefSchema } from "./schema";

export const IdentifySchema = z.object({
  found: z.boolean().describe("True only if this is a real LeetCode problem you can state precisely."),
  reason: z.string().describe("If not found: one sentence saying why, for the person who typed it."),
  brief: BriefSchema.omit({ examples: true }).extend({
    examples: z.array(z.object({
      values: z.string().describe("JSON array, one plain value per input field."),
      expected: z.string().describe("JSON: the exact output a correct solution returns."),
    })).describe("Four to six examples, including edge cases. The outputs must be exactly right."),
  }).optional(),
});

export interface IdentifyModel {
  readonly id: string;
  identify(query: string): Promise<z.infer<typeof IdentifySchema>>;
}

export const IDENTIFY_SYSTEM = `You identify LeetCode problems for Pillow, which explains them as short visual films.
Given what someone typed (a problem name, a number, a link, or a pasted statement), decide which LeetCode problem it is and write a brief:
- slug and number exactly as on LeetCode; the title as on LeetCode.
- statement: the problem in your own plain words (never copy LeetCode's text).
- entry: a snake_case Python function name; inputs: one field per parameter, with a type from int, int-list, string, tree (level-order values with null), linked-list (values in order); min and max sizes a learner may type (lists and strings at most 16, trees at most 15 nodes).
- examples: four to six, as JSON, covering edge cases; every expected output must be exactly what a correct solution returns. Trees and linked lists are value lists.
- precondition: Python defining valid(...) when LeetCode guarantees something about inputs (e.g. exactly one answer); otherwise omit.
- pattern: the closest of the allowed patterns.
Only problems whose inputs fit those field types can be explained; if it doesn't fit, or isn't a LeetCode problem, set found to false and say why in one sentence.`;

/** Parse the model's brief (examples arrive as JSON strings) into a validated Brief. */
export function toBrief(raw: NonNullable<z.infer<typeof IdentifySchema>["brief"]>): Brief {
  const examples = raw.examples.map((e, i) => {
    try { return { values: JSON.parse(e.values), expected: JSON.parse(e.expected) }; }
    catch { throw new Error(`example ${i + 1} isn't valid JSON`); }
  });
  return BriefSchema.parse({ ...raw, examples }) as Brief;
}

export class ClaudeIdentifier implements IdentifyModel {
  readonly id = "claude-opus-5-5";
  private client = new Anthropic();

  async identify(query: string) {
    const stream = this.client.beta.messages.stream({
      model: this.id,
      max_tokens: 16_000,
      output_config: { effort: "medium", format: betaZodOutputFormat(IdentifySchema) },
      system: [{ type: "text", text: IDENTIFY_SYSTEM, cache_control: { type: "ephemeral", ttl: "1h" } }],
      messages: [{ role: "user", content: `Identify this and write the brief:\n\n${query.slice(0, 6000)}` }],
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") return { found: false, reason: "This request couldn't be explained." };
    if (!message.parsed_output) throw new Error("The problem couldn't be identified. Try its exact LeetCode name.");
    return message.parsed_output;
  }
}
