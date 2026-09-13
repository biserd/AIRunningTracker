// Deliberately do not import server/index.ts or server/routes.ts:
// their startup behavior initializes billing and background workers.
export default {
  fetch(request: Request): Response {
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    };
    const path = new URL(request.url).pathname;
    if ((request.method === "GET" || request.method === "HEAD") && path === "/health") {
      return new Response(request.method === "HEAD" ? null : JSON.stringify({
        status: "ok", environment: "staging", migrationReady: false,
      }), { headers });
    }
    // Never acknowledge production webhook deliveries or proxy to production.
    return new Response(request.method === "HEAD" ? null : JSON.stringify({
      error: "MIGRATION_NOT_READY",
      message: "The staging API is not connected yet.",
    }), { status: 503, headers });
  },
} satisfies ExportedHandler;
