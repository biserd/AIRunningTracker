import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION, type McpScope } from "./contract";
import type { McpPrincipal } from "./oauthService";
import { recordMcpAudit } from "./oauthService";
import {
  McpToolError,
  listPublicTools,
  listRunnerActivities,
  listRunnerGoals,
  listRunnerTrainingPlans,
  readDashboardTrends,
  readFitnessMetrics,
  readPublicShoe,
  readRecoveryStatus,
  readRunnerActivity,
  readRunnerProfile,
  readRunnerScore,
  readRunnerTrainingPlan,
  searchPublicShoes,
} from "./adapters";

const READ_ONLY_ANNOTATIONS = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

const TOOL_TIMEOUT_MS = 8_000;

export interface McpToolDescriptor {
  name: string;
  visibility: "private" | "public";
  scope?: McpScope;
  readOnly: true;
}

export const MCP_TOOL_DESCRIPTORS: readonly McpToolDescriptor[] = Object.freeze([
  { name: "get_runner_profile", visibility: "private", scope: "mcp:profile.read", readOnly: true },
  { name: "list_activities", visibility: "private", scope: "mcp:activities.read", readOnly: true },
  { name: "get_activity", visibility: "private", scope: "mcp:activities.read", readOnly: true },
  { name: "get_dashboard_trends", visibility: "private", scope: "mcp:analytics.read", readOnly: true },
  { name: "get_fitness_metrics", visibility: "private", scope: "mcp:analytics.read", readOnly: true },
  { name: "get_recovery_status", visibility: "private", scope: "mcp:analytics.read", readOnly: true },
  { name: "get_runner_score", visibility: "private", scope: "mcp:analytics.read", readOnly: true },
  { name: "list_goals", visibility: "private", scope: "mcp:goals.read", readOnly: true },
  { name: "list_training_plans", visibility: "private", scope: "mcp:plans.read", readOnly: true },
  { name: "get_training_plan", visibility: "private", scope: "mcp:plans.read", readOnly: true },
  { name: "search_running_shoes", visibility: "public", readOnly: true },
  { name: "get_running_shoe", visibility: "public", readOnly: true },
  { name: "list_runanalytics_tools", visibility: "public", readOnly: true },
]);

function withTimeout<T>(operation: Promise<T>, timeoutMs = TOOL_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new McpToolError("timeout", "The read operation exceeded its time limit")), timeoutMs);
    operation.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

function successResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

function errorResult(error: unknown) {
  const known = error instanceof McpToolError;
  const payload = {
    error: known ? error.code : "internal_error",
    message: known ? error.message : "The RunAnalytics read request could not be completed",
  };
  return {
    isError: true,
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}

function privateHandler<TArgs, TResult extends Record<string, unknown>>(
  principal: McpPrincipal,
  toolName: string,
  requiredScope: McpScope,
  handler: (args: TArgs) => Promise<TResult>,
) {
  return async (args: TArgs) => {
    const started = Date.now();
    if (!principal.scopes.includes(requiredScope)) {
      await recordMcpAudit({ eventType: "tool_called", userId: principal.userId, clientId: principal.clientId, toolName, success: false, errorCode: "insufficient_scope", durationMs: 0 });
      return errorResult(new McpToolError("insufficient_scope", `Tool requires ${requiredScope}`));
    }
    try {
      const result = await withTimeout(handler(args));
      await recordMcpAudit({ eventType: "tool_called", userId: principal.userId, clientId: principal.clientId, toolName, success: true, durationMs: Date.now() - started });
      return successResult(result);
    } catch (error) {
      const code = error instanceof McpToolError ? error.code : "internal_error";
      await recordMcpAudit({ eventType: "tool_called", userId: principal.userId, clientId: principal.clientId, toolName, success: false, errorCode: code, durationMs: Date.now() - started });
      return errorResult(error);
    }
  };
}

function publicHandler<TArgs, TResult extends Record<string, unknown>>(
  toolName: string,
  handler: (args: TArgs) => Promise<TResult> | TResult,
) {
  return async (args: TArgs) => {
    const started = Date.now();
    try {
      const result = await withTimeout(Promise.resolve(handler(args)));
      await recordMcpAudit({ eventType: "public_tool_called", toolName, success: true, durationMs: Date.now() - started });
      return successResult(result);
    } catch (error) {
      const code = error instanceof McpToolError ? error.code : "internal_error";
      await recordMcpAudit({ eventType: "public_tool_called", toolName, success: false, errorCode: code, durationMs: Date.now() - started });
      return errorResult(error);
    }
  };
}

export function createPrivateMcpServer(principal: McpPrincipal): McpServer {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION });
  const has = (scope: McpScope) => principal.scopes.includes(scope);

  if (has("mcp:profile.read")) server.registerTool("get_runner_profile", {
    title: "Get runner profile",
    description: "Read the authorized runner's safe profile, preferences, and last computed running profile. Never recomputes or updates it.",
    inputSchema: z.object({}).strict(),
    outputSchema: z.object({ profile: z.record(z.unknown()), preferences: z.record(z.unknown()), computedRunningProfile: z.record(z.unknown()).nullable() }),
    annotations: READ_ONLY_ANNOTATIONS,
  }, privateHandler(principal, "get_runner_profile", "mcp:profile.read", async () => readRunnerProfile(principal.userId)));

  if (has("mcp:activities.read")) {
    server.registerTool("list_activities", {
      title: "List activities",
      description: "List only the authorized runner's visible running activities. Date ranges are limited to 365 days and pages to 100 records.",
      inputSchema: z.object({
        page: z.number().int().min(1).max(10000).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        minDistanceMeters: z.number().nonnegative().max(1_000_000).optional(),
        maxDistanceMeters: z.number().nonnegative().max(1_000_000).optional(),
      }).strict(),
      outputSchema: z.object({ activities: z.array(z.record(z.unknown())), page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number(), range: z.record(z.unknown()), truncatedByPlan: z.boolean() }),
      annotations: READ_ONLY_ANNOTATIONS,
    }, privateHandler(principal, "list_activities", "mcp:activities.read", (args) => listRunnerActivities(principal.userId, args)));

    server.registerTool("get_activity", {
      title: "Get activity",
      description: "Read one bounded activity owned by the authorized runner. Raw GPS polylines, full streams, Strava IDs, and internal fields are omitted.",
      inputSchema: z.object({ activityId: z.number().int().positive(), includeLaps: z.boolean().optional() }).strict(),
      outputSchema: z.object({ activity: z.record(z.unknown()) }),
      annotations: READ_ONLY_ANNOTATIONS,
    }, privateHandler(principal, "get_activity", "mcp:activities.read", (args) => readRunnerActivity(principal.userId, args.activityId, args.includeLaps)));
  }

  if (has("mcp:analytics.read")) {
    server.registerTool("get_dashboard_trends", {
      title: "Get dashboard trends",
      description: "Compare bounded current and prior running periods for the authorized runner.",
      inputSchema: z.object({ days: z.number().int().min(7).max(180).optional() }).strict(),
      outputSchema: z.object({ periodDays: z.number(), current: z.record(z.unknown()), previous: z.record(z.unknown()), change: z.record(z.unknown()), generatedAt: z.string() }),
      annotations: READ_ONLY_ANNOTATIONS,
    }, privateHandler(principal, "get_dashboard_trends", "mcp:analytics.read", (args) => readDashboardTrends(principal.userId, args.days)));

    server.registerTool("get_fitness_metrics", {
      title: "Get fitness metrics",
      description: "Read bounded CTL, ATL, and TSB fitness metrics without triggering processing or cache writes.",
      inputSchema: z.object({ days: z.number().int().min(30).max(180).optional() }).strict(),
      outputSchema: z.object({ periodDays: z.number(), current: z.record(z.unknown()).nullable(), interpretation: z.record(z.unknown()).nullable(), daily: z.array(z.record(z.unknown())) }),
      annotations: READ_ONLY_ANNOTATIONS,
    }, privateHandler(principal, "get_fitness_metrics", "mcp:analytics.read", (args) => readFitnessMetrics(principal.userId, args.days)));

    server.registerTool("get_recovery_status", {
      title: "Get recovery status",
      description: "Read a request-scoped training-load and recovery snapshot. Does not update the runner's recovery cache.",
      inputSchema: z.object({}).strict(),
      outputSchema: z.record(z.unknown()),
      annotations: READ_ONLY_ANNOTATIONS,
    }, privateHandler(principal, "get_recovery_status", "mcp:analytics.read", async () => readRecoveryStatus(principal.userId)));

    server.registerTool("get_runner_score", {
      title: "Get runner score",
      description: "Read the current runner score for the authorized runner.",
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({ score: z.record(z.unknown()) }),
      annotations: READ_ONLY_ANNOTATIONS,
    }, privateHandler(principal, "get_runner_score", "mcp:analytics.read", async () => readRunnerScore(principal.userId)));
  }

  if (has("mcp:goals.read")) server.registerTool("list_goals", {
    title: "List goals",
    description: "List goals owned by the authorized runner.",
    inputSchema: z.object({ status: z.enum(["active", "completed"]).optional() }).strict(),
    outputSchema: z.object({ goals: z.array(z.record(z.unknown())), truncated: z.boolean() }),
    annotations: READ_ONLY_ANNOTATIONS,
  }, privateHandler(principal, "list_goals", "mcp:goals.read", (args) => listRunnerGoals(principal.userId, args.status)));

  if (has("mcp:plans.read")) {
    server.registerTool("list_training_plans", {
      title: "List training plans",
      description: "List bounded training-plan summaries owned by the authorized runner.",
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({ plans: z.array(z.record(z.unknown())), truncated: z.boolean() }),
      annotations: READ_ONLY_ANNOTATIONS,
    }, privateHandler(principal, "list_training_plans", "mcp:plans.read", async () => listRunnerTrainingPlans(principal.userId)));

    server.registerTool("get_training_plan", {
      title: "Get training plan",
      description: "Read one training plan owned by the authorized runner, capped at 32 weeks and seven days per week.",
      inputSchema: z.object({ planId: z.number().int().positive() }).strict(),
      outputSchema: z.record(z.unknown()),
      annotations: READ_ONLY_ANNOTATIONS,
    }, privateHandler(principal, "get_training_plan", "mcp:plans.read", (args) => readRunnerTrainingPlan(principal.userId, args.planId)));
  }

  return server;
}

export function createPublicMcpServer(): McpServer {
  const server = new McpServer({ name: `${MCP_SERVER_NAME}-public`, version: MCP_SERVER_VERSION });
  server.registerTool("search_running_shoes", {
    title: "Search running shoes",
    description: "Search the public RunAnalytics running-shoe catalog. Returns at most 50 sanitized catalog records.",
    inputSchema: z.object({
      query: z.string().max(120).optional(),
      brand: z.string().max(80).optional(),
      category: z.string().max(80).optional(),
      minPrice: z.number().nonnegative().max(2000).optional(),
      maxPrice: z.number().nonnegative().max(2000).optional(),
      hasCarbonPlate: z.boolean().optional(),
      stability: z.string().max(80).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }).strict(),
    outputSchema: z.object({ shoes: z.array(z.record(z.unknown())), returned: z.number(), totalMatches: z.number(), truncated: z.boolean() }),
    annotations: READ_ONLY_ANNOTATIONS,
  }, publicHandler("search_running_shoes", searchPublicShoes));

  server.registerTool("get_running_shoe", {
    title: "Get running shoe",
    description: "Read one public running-shoe catalog record by slug.",
    inputSchema: z.object({ slug: z.string().min(1).max(120) }).strict(),
    outputSchema: z.object({ shoe: z.record(z.unknown()) }),
    annotations: READ_ONLY_ANNOTATIONS,
  }, publicHandler("get_running_shoe", (args) => readPublicShoe(args.slug)));

  server.registerTool("list_runanalytics_tools", {
    title: "List RunAnalytics tools",
    description: "Search the approved public calculator and tool catalog without private runner access.",
    inputSchema: z.object({ query: z.string().max(120).optional(), limit: z.number().int().min(1).max(50).optional() }).strict(),
    outputSchema: z.object({ tools: z.array(z.record(z.unknown())), returned: z.number(), totalMatches: z.number(), truncated: z.boolean() }),
    annotations: READ_ONLY_ANNOTATIONS,
  }, publicHandler("list_runanalytics_tools", listPublicTools));
  return server;
}
