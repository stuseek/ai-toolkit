/**
 * AI Toolkit Microservice Server
 *
 * Exposes the same primitives (extract, validate, summarize, decide, chat)
 * as HTTP endpoints. Zero external dependencies — uses Node's built-in http.
 *
 * Usage:
 *   const { serve } = require('@stuseek/ai-toolkit');
 *   const server = serve({ port: 3000, engines: { anthropic: '...' } });
 *
 * Or CLI:
 *   npx @stuseek/ai-toolkit-serve
 */

const http = require('http');

function serve(options = {}) {
  // Lazy-require to avoid circular — server.js only loaded when serve() called
  const AIToolkit = require('./index');

  const port = options.port ?? (process.env.AI_TOOLKIT_PORT ? parseInt(process.env.AI_TOOLKIT_PORT, 10) : 3000);
  const host = options.host ?? process.env.AI_TOOLKIT_HOST ?? '0.0.0.0';
  const apiKey = options.apiKey || process.env.AI_TOOLKIT_API_KEY || null;

  // Strip server-only options, pass the rest to AIToolkit
  const { port: _p, host: _h, apiKey: _k, cors, ...toolkitOpts } = options;
  const ai = new AIToolkit(toolkitOpts);

  const corsOrigin = cors || process.env.AI_TOOLKIT_CORS || '*';

  // Route table — maps path to method + arg parser
  const routes = {
    '/extract': async (body) => {
      const { data, schema, ...opts } = body;
      return ai.extract(data, schema, opts);
    },
    '/validate': async (body) => {
      const { criteria, subject, reference, ...opts } = body;
      return ai.validate(criteria, subject, reference || null, opts);
    },
    '/summarize': async (body) => {
      const { content, ...opts } = body;
      return ai.summarize(content, opts);
    },
    '/decide': async (body) => {
      const { context, actions, ...opts } = body;
      return ai.decide(context, actions, opts);
    },
    '/chat': async (body) => {
      const { prompt, ...opts } = body;
      // Strip stream — HTTP response is always collected
      delete opts.stream;
      return ai.chat(prompt, opts);
    },
    '/health': async () => ({
      status: 'ok',
      version: require('../package.json').version,
      engine: ai.defaultEngine,
      circuitBreaker: ai.resilience.getStats()
    })
  };

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString();
          resolve(raw ? JSON.parse(raw) : {});
        } catch (e) {
          reject(new Error('Invalid JSON body'));
        }
      });
      req.on('error', reject);
    });
  }

  function sendJSON(res, status, data) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(body);
  }

  const server = http.createServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      sendJSON(res, 204, null);
      return;
    }

    // Auth check
    if (apiKey) {
      const auth = req.headers.authorization;
      if (!auth || auth !== `Bearer ${apiKey}`) {
        sendJSON(res, 401, { error: 'Unauthorized' });
        return;
      }
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    // GET /health
    if (path === '/health' && req.method === 'GET') {
      try {
        const result = await routes['/health']();
        sendJSON(res, 200, result);
      } catch (e) {
        sendJSON(res, 500, { error: e.message });
      }
      return;
    }

    // All other routes are POST
    if (req.method !== 'POST') {
      sendJSON(res, 405, { error: 'Method not allowed. Use POST.' });
      return;
    }

    const handler = routes[path];
    if (!handler) {
      sendJSON(res, 404, {
        error: `Unknown endpoint: ${path}`,
        available: Object.keys(routes)
      });
      return;
    }

    try {
      const body = await readBody(req);
      const result = await handler(body);
      sendJSON(res, 200, result);
    } catch (err) {
      const status = err.name === 'CircuitBreakerError' ? 503 : 500;
      sendJSON(res, status, { error: err.message });
    }
  });

  server.listen(port, host, () => {
    console.log(`ai-toolkit server running on http://${host}:${port}`);
    console.log(`  POST /extract, /validate, /summarize, /decide, /chat`);
    console.log(`  GET  /health`);
    if (apiKey) console.log('  Auth: Bearer token required');
  });

  // Attach the toolkit instance so callers can use it directly too
  server.ai = ai;
  server.routes = Object.keys(routes);

  return server;
}

module.exports = { serve };
