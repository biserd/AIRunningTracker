import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { renderPublicDocument } from "./ssr/reactToolRenderer";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Missing discovery documents and retired routes must not return a 200 SPA
// shell. Keep this after real routes/static files (including Apple association).
export function missingPublicResource(pathname: string): boolean {
  return pathname === '/release-notes' || pathname.startsWith('/.well-known/') || pathname === '/ai-catalog.json';
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (missingPublicResource(new URL(url, 'http://localhost').pathname)) {
      return res.status(404).set('X-Robots-Tag', 'noindex, follow').type('text/plain').send('Resource not found. Visit https://aitracker.run/ for current features.');
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express, distPath = path.resolve(import.meta.dirname, "public")) {
  const indexPath = path.resolve(distPath, "index.html");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Let the document renderer handle /; otherwise Express serves the empty SPA index.
  app.use(express.static(distPath, { index: false }));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (req, res, next) => {
    const requestPath = new URL(req.originalUrl, "http://localhost").pathname;
    if (missingPublicResource(requestPath)) {
      return res.status(404).set('X-Robots-Tag', 'noindex, follow').type('text/plain').send('Resource not found. Visit https://aitracker.run/ for current features.');
    }
    try {
      const template = await fs.promises.readFile(indexPath, "utf-8");
      const page = await renderPublicDocument(requestPath, template);
      if (!page) {
        res.sendFile(indexPath);
        return;
      }

      res.status(200).set({
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      }).send(page);
    } catch (error) {
      console.error(`[SSR] React tool render failed for ${requestPath}:`, error);
      next(error);
    }
  });
}
