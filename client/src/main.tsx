import "./index.css";

const root = document.getElementById("root");

async function hydratePublicTool() {
  if (!root) return;
  const [{ hydrateRoot }, { loadPublicToolComponent, PublicToolApp }, { queryClient }] = await Promise.all([
    import("react-dom/client"),
    import("./publicToolApp"),
    import("./lib/queryClient"),
  ]);
  const Component = await loadPublicToolComponent(window.location.pathname);
  if (Component) {
    hydrateRoot(root, <PublicToolApp Component={Component} queryClient={queryClient} />);
    return;
  }

  const { mountSpa } = await import("./spa-entry");
  mountSpa(root);
}

async function bootSpa() {
  if (!root) return;
  const { mountSpa } = await import("./spa-entry");
  mountSpa(root);
}

if (root?.dataset.ssrTool === "true") {
  // Let the browser paint the server-rendered tool before downloading and
  // parsing the hydration graph. A short post-load grace period prevents
  // background module parsing from stealing the first paint on slower CPUs.
  const scheduleHydration = () => {
    window.setTimeout(() => void hydratePublicTool(), 1500);
  };
  if (document.readyState === "complete") scheduleHydration();
  else window.addEventListener("load", scheduleHydration, { once: true });
} else {
  void bootSpa();
}

// Register PWA service worker (production only: avoids interfering with Vite HMR).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("[SW] registration failed:", err);
    });
  });
}
