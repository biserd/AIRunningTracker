---
name: OpenAI GPT-5.x Chat Completions params
description: Param quirks when calling GPT-5.x models via openai.chat.completions.create
---

# GPT-5.x on Chat Completions API

When calling GPT-5.x models (e.g. `gpt-5.4-mini`) via `openai.chat.completions.create`:

- **`max_tokens` is rejected with a 400** — must use `max_completion_tokens` instead.
- `temperature` IS accepted (tested 0.7 on `gpt-5.4-mini`); `response_format: { type: "json_object" }` works.
- GPT-5 models can spend tokens on internal reasoning that counts against the completion
  budget, so set `max_completion_tokens` with headroom (used 1200 for a ~3-field JSON email)
  to avoid truncation. Check `finish_reason` (`length` = truncated) and
  `usage.completion_tokens_details.reasoning_tokens` when sizing.

**Why:** the post-run webhook email (`server/services/stravaWebhook.ts`,
`generatePersonalizedEmail`) was switched gpt-4o → gpt-5.4-mini and 400'd on the old
`max_tokens` param.

**How to apply:** any GPT-5.x call via `chat.completions.create` needs
`max_completion_tokens`. Note the rest of this app calls gpt-5.1 via the **Responses API**
(`openai.responses.create` with `input` / `text.format`) in `chat.ts` and `ai.ts`, which is
a different param shape entirely — don't copy params between the two APIs.
