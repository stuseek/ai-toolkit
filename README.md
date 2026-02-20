# @stuseek/ai-toolkit

AI primitives for Node.js. Extract, validate, summarize, decide, chat — with retry, circuit breakers, tool use, streaming, and conversation history built in. Works with OpenAI and Anthropic.

[![NPM Version](https://img.shields.io/npm/v/@stuseek/ai-toolkit.svg)](https://www.npmjs.com/package/@stuseek/ai-toolkit)
[![License](https://img.shields.io/npm/l/@stuseek/ai-toolkit.svg)](https://github.com/stuseek/ai-toolkit/blob/main/LICENSE)

## Install

```bash
npm install @stuseek/ai-toolkit
```

## Quick start

```javascript
const { AIToolkit } = require('@stuseek/ai-toolkit');

const ai = new AIToolkit({
  engines: { anthropic: process.env.ANTHROPIC_API_KEY },
  defaultEngine: 'anthropic'
});

// Extract structured data from text
const { data } = await ai.extract('Order #123 from John, wants a refund', {
  orderId: 'string',
  name: 'string',
  intent: 'string'
});

// Validate against criteria
const { score, reasoning } = await ai.validate(
  'Is this high priority?', data
);

// Summarize anything
const { summary } = await ai.summarize({ data, score, reasoning });

// Pick an action
const { action } = await ai.decide(summary, ['escalate', 'respond', 'archive']);

// Free-form chat
const { message } = await ai.chat('Explain this vulnerability to a junior dev');
```

## What's in 1.1.0

### Retry + circuit breaker + timeout

Every AI call goes through the resilience layer. Retries on 429/503/529 and network errors with exponential backoff. Circuit breaker trips after N consecutive failures and auto-resets.

```javascript
const ai = new AIToolkit({
  engines: { anthropic: process.env.ANTHROPIC_API_KEY },
  retry: { maxRetries: 3 },
  timeout: 15000,
  circuitBreaker: { threshold: 5, resetAfterMs: 60000 }
});

// Check circuit breaker state
ai.resilience.isTripped();
ai.resilience.getStats();
ai.resilience.reset();
```

Catch circuit breaker errors explicitly:

```javascript
const { CircuitBreakerError } = require('@stuseek/ai-toolkit');

try {
  await ai.chat('hello');
} catch (err) {
  if (err instanceof CircuitBreakerError) {
    console.log('AI is down, using fallback');
  }
}
```

### Tool use / function calling

Works with both OpenAI and Anthropic. The library handles format conversion and the multi-turn tool loop (up to 10 rounds).

```javascript
const result = await ai.chat('What is the weather in Tokyo?', {
  tools: [{
    name: 'get_weather',
    description: 'Get current weather',
    parameters: {
      type: 'object',
      properties: { location: { type: 'string' } },
      required: ['location']
    }
  }],
  onToolCall: async (name, params) => {
    if (name === 'get_weather') return { temp: 22, conditions: 'sunny' };
  }
});

console.log(result.message);    // "It's 22 degrees and sunny in Tokyo"
console.log(result.toolCalls);  // [{ name: 'get_weather', parameters: { location: 'Tokyo' }, result: { temp: 22, ... } }]
```

### Conversation history

Track multi-turn conversations. History is auto-injected into API calls.

```javascript
const ai = new AIToolkit({
  engines: { anthropic: process.env.ANTHROPIC_API_KEY },
  trackHistory: true,
  maxHistoryTokens: 50000
});

await ai.chat('My name is Alice');
await ai.chat('What is my name?');  // AI remembers: "Alice"

// Manual control
ai.addMessage('user', 'some context');
ai.getHistory();   // [{ role, content }, ...]
ai.clearHistory();

// Per-call override
await ai.chat('one-off question', { trackHistory: false });
```

Only `chat()` auto-tracks. The other primitives (extract, validate, summarize, decide) are one-shot by design.

### Model routing with aliases

Define named aliases and use them across operations.

```javascript
const ai = new AIToolkit({
  engines: { anthropic: process.env.ANTHROPIC_API_KEY },
  models: {
    anthropic: 'claude-sonnet-4-5-20250929',     // default for anthropic
    fast: 'claude-haiku-4-5-20251001',            // alias
    powerful: 'claude-opus-4-20250514'            // alias
  }
});

await ai.decide(ctx, actions, { model: 'fast' });      // uses haiku
await ai.chat('complex question', { model: 'powerful' }); // uses opus
await ai.extract(data, schema);                          // uses default sonnet
```

### Streaming

```javascript
// Async generator — process chunks as they arrive
const stream = await ai.chat('Write a haiku', { stream: true });
for await (const chunk of stream) {
  process.stdout.write(chunk);
}

// Or collect everything into a normal result
const result = await ai.chat('Write a haiku', { stream: true, collect: true });
console.log(result.message);
```

## API reference

### Primitives

All primitives return `{ success, ..., error? }`. They never throw — errors come back in the result.

| Method | Purpose | Returns |
|--------|---------|---------|
| `extract(data, schema, opts?)` | Structure unstructured data | `{ success, data, confidence }` |
| `validate(criteria, subject, ref?, opts?)` | Score against criteria | `{ success, score, reasoning, confidence, recommendation }` |
| `summarize(content, opts?)` | Distill key points | `{ success, summary, keyPoints, confidence }` |
| `decide(context, actions, opts?)` | Pick best action | `{ success, action, reasoning, confidence, parameters }` |
| `chat(prompt, opts?)` | Free-form conversation | `{ success, message, confidence, toolCalls? }` |

### Per-call options

Every primitive accepts these in the options object:

```javascript
{
  engine: 'anthropic',        // override default engine
  model: 'fast',              // model name or alias
  temperature: 0.5,           // 0-1
  maxTokens: 2000,            // max response tokens
  additionalContext: '...'    // extra context for this call only
}
```

### Constructor options

```javascript
new AIToolkit({
  // Required: at least one engine
  engines: {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY
  },
  defaultEngine: 'anthropic',

  // Model config
  models: {
    openai: 'gpt-4o',
    anthropic: 'claude-sonnet-4-5-20250929',
    fast: 'claude-haiku-4-5-20251001',
    powerful: 'claude-opus-4-20250514'
  },

  // Resilience
  retry: { maxRetries: 2 },
  timeout: 30000,
  circuitBreaker: { threshold: 5, resetAfterMs: 60000 },

  // Conversation
  trackHistory: false,
  maxHistoryTokens: 50000,

  // Behavior
  temperature: 0.3,
  maxTokens: 1000,
  basePrompt: 'You are a security analyst',
  preset: 'security',           // or devops, engineering, etc.
  validateOutputs: false,

  // Executor
  withExecutor: false
})
```

### Stateless usage

For simple scripts where you don't need an instance:

```javascript
const { extract, validate, summarize, decide, chat, configure } = require('@stuseek/ai-toolkit');

configure({ engines: { openai: process.env.OPENAI_API_KEY } });

const result = await extract('some text', { field: 'string' });
```

### Presets

```javascript
const { createAI } = require('@stuseek/ai-toolkit');

const ai = createAI.security();     // low temp, validate outputs
const ai = createAI.engineering();   // balanced
const ai = createAI.marketing();     // higher temp, creative
// Also: devops, support, financial, medical, legal
```

### Chaining

Operations store their last result. Subsequent calls can omit the input to use it:

```javascript
await ai.extract(email, schema);
await ai.validate('Is this urgent?');  // uses extract result
await ai.summarize();                   // uses validate result
await ai.decide(null, actions);         // uses summary result
```

### Action executor

Wire AI decisions to actual code:

```javascript
const ai = new AIToolkit({ engines: { ... }, withExecutor: true });

ai.registerAction('send_email', async (params) => {
  return await emailService.send(params);
});

const decision = await ai.decide(context, ['send_email', 'create_ticket']);
const result = await ai.execute(decision);
```

## HTTP server / microservice mode

Same interface, over HTTP. Zero extra dependencies.

### From code

```javascript
const { serve } = require('@stuseek/ai-toolkit');

const server = serve({
  engines: { anthropic: process.env.ANTHROPIC_API_KEY },
  defaultEngine: 'anthropic',
  port: 3000,
  apiKey: 'my-secret'  // optional Bearer token auth
});

// The server also exposes the AIToolkit instance directly
server.ai.chat('hello');  // still works as a library
```

### From CLI

```bash
# Set your keys
export ANTHROPIC_API_KEY=sk-ant-...

# Start the server
npx @stuseek/ai-toolkit-serve --port 3000

# Or with auth
AI_TOOLKIT_API_KEY=secret npx @stuseek/ai-toolkit-serve
```

### Endpoints

```bash
# Extract
curl -X POST http://localhost:3000/extract \
  -H 'Content-Type: application/json' \
  -d '{"data": "John is 30", "schema": {"name": "string", "age": "number"}}'

# Chat
curl -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Explain SQL injection"}'

# Health check (includes circuit breaker status)
curl http://localhost:3000/health
```

All endpoints accept the same options as the library methods. POST body fields map directly to method arguments — `data` and `schema` for extract, `prompt` for chat, etc.

If `AI_TOOLKIT_API_KEY` is set, pass `Authorization: Bearer <key>` header.

## Environment variables

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AI_DEFAULT_ENGINE=anthropic
AI_MODEL_OPENAI=gpt-4o
AI_MODEL_ANTHROPIC=claude-sonnet-4-5-20250929

# Server mode
AI_TOOLKIT_PORT=3000
AI_TOOLKIT_HOST=0.0.0.0
AI_TOOLKIT_API_KEY=my-secret     # require Bearer auth
AI_TOOLKIT_CORS=*                # CORS origin
```

## TypeScript

Full type definitions included. Key types:

```typescript
import {
  AIToolkit,
  ExtractResult, ValidateResult, SummarizeResult,
  DecideResult, ChatResult,
  ToolDefinition, ToolCallResult,
  Resilience, CircuitBreakerError,
  ChatOptions, AIToolkitOptions,
  serve, ServeOptions, AIServer
} from '@stuseek/ai-toolkit';
```

## Requirements

- Node.js >= 18
- At least one of: `openai` (^4.0.0), `@anthropic-ai/sdk` (>=0.9.0)

## License

MIT
