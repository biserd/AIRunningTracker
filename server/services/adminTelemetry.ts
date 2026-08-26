export type AdminErrorSeverity = "critical" | "warning" | "info";

const EXPECTED_PATTERNS = [
  { endpoint: "/api/auth/user", statusCodes: [401] },
  { endpoint: "/api/activities/", statusCodes: [403], message: /premium access required/i },
  { endpoint: "/api/coach/channels/telegram/link", statusCodes: [429] },
  { endpoint: "/mcp", statusCodes: [401], message: /invalid_token/i },
  { endpoint: "/mcp/oauth/token", statusCodes: [400], message: /invalid_grant/i },
] as const;

const SECRET_VALUE_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\b(?:re|sk|whsec)_[A-Za-z0-9_-]+/gi,
  /\b(?:access_token|refresh_token|id_token|authorization_code|code_verifier|client_secret)\s*[=:]\s*[^\s,;}]+/gi,
  /\b(?:password|secret|api[_-]?key|token)\s*[=:]\s*[^\s,;}]+/gi,
];

export function sanitizeAdminLogText(value: unknown, maxLength = 500): string | null {
  if (value === null || value === undefined) return null;
  let text = String(value);
  for (const pattern of SECRET_VALUE_PATTERNS) text = text.replace(pattern, "[REDACTED]");
  return text.length > maxLength ? `${text.slice(0, maxLength)}... [truncated]` : text;
}

export function classifyAdminError(input: {
  statusCode: number;
  endpoint: string;
  errorMessage?: string | null;
}): { severity: AdminErrorSeverity; expected: boolean; category: string } {
  const message = input.errorMessage || "";
  const expected = EXPECTED_PATTERNS.some((pattern) =>
    input.endpoint.startsWith(pattern.endpoint) &&
    pattern.statusCodes.includes(input.statusCode as never) &&
    (!("message" in pattern) || pattern.message.test(message)),
  );

  if (expected) return { severity: "info", expected: true, category: "expected" };
  if (input.statusCode >= 500) return { severity: "critical", expected: false, category: "server" };
  if (input.statusCode === 429) return { severity: "warning", expected: false, category: "rate_limit" };
  if (input.statusCode === 401 || input.statusCode === 403) return { severity: "warning", expected: false, category: "access" };
  return { severity: "info", expected: false, category: "client" };
}
