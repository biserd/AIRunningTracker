import { trackFunnelEvent } from "./analytics";

export interface SavedToolResult { source: string; title: string; summary: string; path: string; savedAt: string }
export const SAVED_TOOL_KEY = "ra_saved_tool_result_v1";
export const TOOL_OFFER_KEY = "ra_tool_offer_v1";
export function saveToolResult(result: Omit<SavedToolResult, "savedAt">): boolean {
  try {
    localStorage.setItem(SAVED_TOOL_KEY, JSON.stringify({ ...result, summary: result.summary.slice(0, 16000), savedAt: new Date().toISOString() }));
    trackFunnelEvent("tool_result_saved", { source: result.source, capability: "saved_tool", experimentVariant: "contextual_v1" }, { dedupeParts: [result.source, "saved"] });
    return true;
  } catch { return false; }
}
export function readSavedToolResult(): SavedToolResult | null {
  try {
    const data = JSON.parse(localStorage.getItem(SAVED_TOOL_KEY) || "null");
    return data && typeof data.summary === "string" && typeof data.title === "string" && typeof data.path === "string" && data.path.startsWith("/tools/") && !data.path.includes("\\") ? data : null;
  } catch { return null; }
}
