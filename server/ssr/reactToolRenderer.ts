import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { Helmet } from 'react-helmet';
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

export async function renderPublicDocument(pathname: string, template: string): Promise<string | null> {
  // Load the component before the synchronous render/Helmet collection so
  // concurrent requests cannot mix metadata between documents.
  const Component = await loadPublicToolComponent(pathname);
  if (!Component) return null;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const markup = renderToString(React.createElement(PublicToolApp, { Component, queryClient, ssrPath: pathname }));
  const head = Helmet.renderStatic();
  queryClient.clear();
  const escapedPath = pathname.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const links = head.link.toString();
  return template
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:name|property)=["'](?:description|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace('</head>', `${head.title.toString()}${head.meta.toString()}${head.script.toString()}${links}${links.includes('canonical') ? '' : `<link rel="canonical" href="https://aitracker.run${escapedPath}">`}</head>`)
    .replace('<div id="root"></div>', `<div id="root" data-ssr-tool="true">${markup}</div>`);
}
