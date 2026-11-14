import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import autoprefixer from "autoprefixer";
import { transform } from "esbuild";
import postcss from "postcss";
import tailwind from "tailwindcss";
import type { Plugin } from "vite";
import tailwindConfig from "../tailwind.config";

// The hub uses the same Tailwind reset, tokens and components as the app, but
// does not need utility rules for unrelated routes. Include client-only states
// (menu, overflow results, saved comparison, toasts) as well as the SSR markup.
const hubSources = [
  "pages/tools/shoe-comparison-list.tsx",
  "components/shoes/ShoeChooser.tsx",
  "components/PublicHeader.tsx",
  "components/Footer.tsx",
  "components/StravaConnect.tsx",
  "components/ToolJourneyTracker.tsx",
  "components/ui/{button,toast,toaster,tooltip}.tsx",
];

export function shoeHubStyles(): Plugin {
  return {
    name: "shoe-hub-styles",
    apply: "build",
    generateBundle: {
      order: "post",
      async handler(_options, bundle) {
        const html = bundle["index.html"];
        if (html?.type !== "asset" || typeof html.source !== "string") return;
        const from = resolve("client/src/index.css");
        const source = await readFile(from, "utf8");
        const emitStyles = async (name: string, content: string[]) => {
          const result = await postcss([
            tailwind({ ...tailwindConfig, content }),
            autoprefixer(),
          ]).process(source, { from });
          const { code } = await transform(result.css, { loader: "css", minify: true });
          const hash = createHash("sha256").update(code).digest("hex").slice(0, 12);
          const fileName = `assets/${name}-${hash}.css`;
          this.emitFile({ type: "asset", fileName, source: code });
          return fileName;
        };
        const app = await emitStyles("index", tailwindConfig.content);
        const hub = await emitStyles("shoe-hub", hubSources.map(file => resolve("client/src", file)));
        // Link styles outside Vite's JS module graph so hydrating the hub
        // cannot fetch the unrelated full app stylesheet as a dependency.
        html.source = html.source.replace("</head>", `<link rel="stylesheet" href="/${app}"><!--shoe-hub-css:/${hub}--></head>`);
      },
    },
  };
}
