import assert from "node:assert/strict";
import { classifyAdminError, sanitizeAdminLogText } from "./adminTelemetry";

assert.deepEqual(
  classifyAdminError({ statusCode: 403, endpoint: "/api/activities/42/quality", errorMessage: "Premium access required." }),
  { severity: "info", expected: true, category: "expected" },
);
assert.equal(classifyAdminError({ statusCode: 500, endpoint: "/mcp", errorMessage: "server_error" }).severity, "critical");
assert.equal(classifyAdminError({ statusCode: 429, endpoint: "/api/other", errorMessage: "limited" }).severity, "warning");
assert.equal(sanitizeAdminLogText("Authorization: Bearer abc.def.ghi"), "Authorization: [REDACTED]");
assert.equal(sanitizeAdminLogText("token=super-secret-value"), "[REDACTED]");

console.log("Admin telemetry safety tests passed");
