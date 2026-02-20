#!/usr/bin/env node

/**
 * CLI: ai-toolkit-serve
 *
 * Start the ai-toolkit HTTP microservice.
 *
 * Usage:
 *   npx @stuseek/ai-toolkit-serve
 *   npx @stuseek/ai-toolkit-serve --port 8080
 *   AI_TOOLKIT_PORT=8080 AI_TOOLKIT_API_KEY=secret npx @stuseek/ai-toolkit-serve
 *
 * Environment:
 *   OPENAI_API_KEY       - OpenAI API key
 *   ANTHROPIC_API_KEY    - Anthropic API key
 *   AI_TOOLKIT_PORT      - Server port (default: 3000)
 *   AI_TOOLKIT_HOST      - Bind address (default: 0.0.0.0)
 *   AI_TOOLKIT_API_KEY   - Require Bearer token auth
 *   AI_TOOLKIT_CORS      - CORS origin (default: *)
 *   AI_DEFAULT_ENGINE    - Default engine (openai or anthropic)
 */

const { serve } = require('../src/server');

// Parse simple CLI args
const args = process.argv.slice(2);
const opts = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--port' && args[i + 1]) opts.port = parseInt(args[++i], 10);
  else if (arg === '--host' && args[i + 1]) opts.host = args[++i];
  else if (arg === '--engine' && args[i + 1]) opts.defaultEngine = args[++i];
  else if (arg === '--help' || arg === '-h') {
    console.log(`ai-toolkit serve — run AI primitives as HTTP endpoints

Usage:
  npx @stuseek/ai-toolkit-serve [options]

Options:
  --port <n>       Port to listen on (default: 3000)
  --host <addr>    Bind address (default: 0.0.0.0)
  --engine <name>  Default AI engine: openai or anthropic

Environment variables:
  OPENAI_API_KEY, ANTHROPIC_API_KEY, AI_TOOLKIT_PORT,
  AI_TOOLKIT_HOST, AI_TOOLKIT_API_KEY, AI_TOOLKIT_CORS

Endpoints:
  POST /extract    { data, schema, ...opts }
  POST /validate   { criteria, subject, reference?, ...opts }
  POST /summarize  { content, ...opts }
  POST /decide     { context, actions, ...opts }
  POST /chat       { prompt, ...opts }
  GET  /health     Server status + circuit breaker stats
`);
    process.exit(0);
  }
}

serve(opts);
