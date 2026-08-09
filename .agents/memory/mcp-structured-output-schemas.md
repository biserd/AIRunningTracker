---
name: MCP structured output schemas
description: Constraint for defining structured output on RunAnalytics MCP tools.
---

MCP tools with structured output must define `outputSchema` as a top-level Zod object, not a top-level record or another schema type.

**Why:** The MCP SDK normalizes structured output as an object before JSON Schema conversion. A top-level record can reach an undefined internal Zod node and fail tool discovery with an error mentioning `_zod`, even though registration-only tests pass.

**How to apply:** Use explicit object envelopes for every tool response and keep an in-memory MCP client/server test that calls tool discovery and verifies every input and output schema has JSON Schema type `object`.