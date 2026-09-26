import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {IosAppContent,IosPrivacyContent} from '../../shared/iosAppView';
import {iosAppMeta,iosPrivacyMeta,iosAppSchema} from '../../shared/iosAppContent';
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
// Identical public content for humans and crawlers; no JavaScript or auth needed.
export function renderIosAppPage(privacy=false){
 const m=privacy?iosPrivacyMeta:iosAppMeta,url='https://aitracker.run'+m.path;
 const schema=privacy?{'@context':'https://schema.org','@type':'WebPage',name:m.title,url}:iosAppSchema;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(m.title)}</title><meta name="description" content="${escape(m.description)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:title" content="${escape(m.title)}"><meta property="og:description" content="${escape(m.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${m.image}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(m.title)}"><meta name="twitter:description" content="${escape(m.description)}"><meta name="twitter:image" content="${m.image}"><meta name="theme-color" content="#ffffff"><link rel="stylesheet" href="/ios-app/landing-v1.css"><style>body{margin:0}</style><script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script></head><body>${renderToStaticMarkup(privacy?<IosPrivacyContent/>:<IosAppContent/>)}</body></html>`;
}
