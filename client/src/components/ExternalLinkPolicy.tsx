import { useEffect } from "react";

const REQUIRED_REL_TOKENS = ["nofollow", "noopener", "noreferrer"];

function secureExternalAnchor(anchor: HTMLAnchorElement) {
  try {
    const url = new URL(anchor.href, window.location.href);
    if (!/^https?:$/.test(url.protocol) || url.origin === window.location.origin) return;

    const tokens = new Set(anchor.rel.split(/\s+/).filter(Boolean));
    REQUIRED_REL_TOKENS.forEach((token) => tokens.add(token));
    anchor.rel = Array.from(tokens).join(" ");
  } catch {
    // Invalid and non-web URLs are ignored.
  }
}

function secureLinksWithin(root: ParentNode) {
  if (root instanceof HTMLAnchorElement) secureExternalAnchor(root);
  root.querySelectorAll?.("a[href]").forEach((anchor) => secureExternalAnchor(anchor as HTMLAnchorElement));
}

/**
 * Defense in depth for links created after hydration by third-party widgets,
 * map attribution controls, or future page components.
 */
export function ExternalLinkPolicy() {
  useEffect(() => {
    secureLinksWithin(document);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) secureLinksWithin(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
