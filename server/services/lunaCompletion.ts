import type { ReasoningEffort } from "openai/resources/shared";
import { TEXT_MODEL } from "../../shared/aiModels";

// The deployed SDK predates the documented "none" enum value.
export const NO_REASONING = "none" as ReasoningEffort;

/** Existing Chat Completions paths are short, tool-free requests. Keep their
 * budgets and avoid spending any of those tokens on hidden reasoning. */
export function lunaCompletionOptions(maxCompletionTokens: number) {
  return {
    model: TEXT_MODEL,
    max_completion_tokens: maxCompletionTokens,
    reasoning_effort: NO_REASONING,
    store: false,
  } as const;
}
