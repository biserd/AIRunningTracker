// Isolated rendering harness. No production server, billing or schedulers.
// The homepage uses deterministic PUBLIC fixture statistics and offer terms.
import express from 'express';
import React from 'react';
import { readFile } from 'node:fs/promises';
import { renderPublicDocument } from '../server/ssr/reactToolRenderer';
import { registerAgentDiscovery } from '../server/mcp/discovery';
import { registerPublicMarkdown } from '../server/ssr/publicMarkdown';
(globalThis as any).React = React;
const app = express();
registerAgentDiscovery(app);
// Keep discovery audits on this local preview, not the still-unmodified production site.
app.use((_req, res, next) => { res.set('Link', String(res.get('Link')).replaceAll('https://aitracker.run', 'http://127.0.0.1:4176')); next(); });
registerPublicMarkdown(app);
app.get('/api/platform-stats',(_req,res)=>res.json({totalUsers:611,totalInsights:5533,totalActivities:89711,totalDistance:754164000}));
app.get('/api/stripe/web-intro-offer',(_req,res)=>res.json({active:true}));
app.use('/api',(_req,res)=>res.status(401).json({message:'Preview has no private account access'}));
app.use(express.static('dist/public', {index:false}));
app.get('*',async (req,res,next)=>{
  try {
    const template = await readFile('dist/public/index.html','utf8');
    const html = await renderPublicDocument(req.path,template);
    if (!html) return res.status(404).send('Not found');
    res.type('html').send(html);
  } catch (error) { next(error); }
});
app.listen(4176,'127.0.0.1',()=>console.log('SEO rendering preview: http://127.0.0.1:4176 (public fixture data only)'));
