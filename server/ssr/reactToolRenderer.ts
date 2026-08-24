import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { loadPublicToolComponent, PublicToolApp } from "../../client/src/publicToolApp";

export async function renderReactToolPage(pathname: string): Promise<string | null> {
  const Component = await loadPublicToolComponent(pathname);
  if (!Component) return null;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

  return renderToString(
    React.createElement(PublicToolApp, {
      Component,
      queryClient,
      ssrPath: pathname,
    }),
  );
}
