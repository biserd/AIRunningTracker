// Staging only: no database, production service binding, or write routes.
const base = "/tools/shoes";
const models = /^\/tools\/shoes(?:\/[a-z0-9-]{1,120})?$/;
const comparisons = /^\/tools\/shoes\/compare\/[a-z0-9-]{1,230}$/;
const assets = /^\/(?:assets|icons)\/[a-zA-Z0-9_.-]+$/;

function reply(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("Content-Security-Policy", "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'");
  return new Response(response.body, { status: response.status, headers });
}
export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return reply(new Response("Read-only preview", { status:405, headers:{Allow:"GET, HEAD"} }));
    }
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";
    if (path === "/") return reply(new Response(null, { status:302, headers:{Location:`${base}/adidas-boston-13`} }));
    if (path === "/robots.txt") return reply(new Response("User-agent: *\nDisallow: /\n"));
    if (path === "/api/auth/user") return reply(Response.json(null, {status:401}));
    if (models.test(path) || comparisons.test(path)) url.pathname = path + "/index.html";
    else if (!assets.test(path) && !["/manifest.webmanifest", "/sw.js"].includes(path)) {
      return reply(new Response("Not included in this staging preview", { status:404 }));
    }
    url.search = "";
    return reply(await env.ASSETS.fetch(new Request(url, { method:request.method })));
  },
};
