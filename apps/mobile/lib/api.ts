import Constants from "expo-constants";
import { getToken } from "./auth";

const API_BASE_URL: string =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ||
  "https://aitracker.run";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function buildHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await buildHeaders((init.headers as Record<string, string>) || {});
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (body as { message?: string } | null)?.message || `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return body as T;
}

/**
 * POST that hits an SSE endpoint. Reads chunks as they arrive and
 * invokes onChunk with each `data: { type: 'chunk', content }` payload.
 * Resolves once the stream ends.
 */
export async function apiStreamChat(
  path: string,
  body: unknown,
  onChunk: (text: string) => void,
): Promise<void> {
  const headers = await buildHeaders({ Accept: "text/event-stream" });
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Chat failed (${res.status})`);
  }
  // RN fetch resolves with full body when stream ends. Parse all SSE events.
  const text = await res.text();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload) continue;
    try {
      const evt = JSON.parse(payload) as { type?: string; content?: string };
      if (evt.type === "chunk" && typeof evt.content === "string") {
        onChunk(evt.content);
      }
    } catch {
      // ignore malformed event
    }
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const apiBaseUrl = API_BASE_URL;
