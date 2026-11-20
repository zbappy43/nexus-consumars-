import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health endpoint specified in docs/SPEC.md
  app.get('/api/health', (_req, res) => {
    const dhakaTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());

    res.json({
      status: 'ok',
      service: 'nexus-consumers-limited',
      domain: 'nexusglobalplc.com',
      timezone: 'Asia/Dhaka',
      timestampDhaka: dhakaTime,
    });
  });

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /api/',
        'Sitemap: https://nexusglobalplc.com/sitemap.xml',
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', (_req, res) => {
    const urls = [
      'https://nexusglobalplc.com/',
      'https://nexusglobalplc.com/bn',
      'https://nexusglobalplc.com/en',
      'https://nexusglobalplc.com/bn/track',
      'https://nexusglobalplc.com/en/track',
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${u}</loc><changefreq>daily</changefreq></url>`)
      .join('\n')}\n</urlset>`;
    res.type('application/xml').send(xml);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nexus Consumers Limited server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
