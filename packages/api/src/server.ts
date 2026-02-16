import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './index.js';

const port = parseInt(process.env.PORT ?? '3000', 10);
const { app } = createApp();

// Serve static in production
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: '../web/dist' }));
  app.get('*', serveStatic({ root: '../web/dist', path: 'index.html' }));
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Planner API running on http://localhost:${info.port}`);
});
