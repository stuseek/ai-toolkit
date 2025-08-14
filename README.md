# AI Toolkit

<p align="center">
  <strong>🧠 The 4 fundamental operations that power every AI application</strong>
</p>

<p align="center">
  <a href="https://docs.aitoolkit.dev">📚 Full Documentation</a> •
  <a href="https://aitoolkit.dev">🌐 Website</a> •
  <a href="https://github.com/aitoolkit/ai-toolkit">GitHub</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ai-toolkit"><img src="https://img.shields.io/npm/v/ai-toolkit.svg" alt="NPM Version"></a>
  <a href="https://www.npmjs.com/package/ai-toolkit"><img src="https://img.shields.io/npm/dm/ai-toolkit.svg" alt="Downloads"></a>
  <a href="https://github.com/aitoolkit/ai-toolkit/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/ai-toolkit.svg" alt="License"></a>
</p>

---

## Why AI Toolkit?

Every AI application, from chatbots to autonomous agents, can be broken down into **4 fundamental operations**. Just like how all of mathematics builds on `+`, `-`, `×`, `÷`, all AI applications build on:

<table>
<tr>
<td width="25%" align="center">

### 📊 EXTRACT
Transform chaos into structure

</td>
<td width="25%" align="center">

### ✅ VALIDATE  
Ensure quality and truth

</td>
<td width="25%" align="center">

### 📝 SUMMARIZE
Distill insights from noise

</td>
<td width="25%" align="center">

### 🧠 DECIDE
Choose actions intelligently

</td>
</tr>
</table>

**Master these 4 primitives, and you can build ANY AI application.**

## 🚀 Quick Start

```bash
npm install ai-toolkit
```

### Optional: Enable Telemetry & Analytics (Free)

Create a free account at [aitoolkit.dev](https://aitoolkit.dev) to:
- 📊 View usage statistics and dashboards
- 🐛 Debug AI operations with detailed logs
- 📈 Track performance metrics
- 🔍 Analyze token usage and costs

> 🔒 **Privacy First:** Telemetry sends **only aggregates** (duration, success/error, score, sizes) without any `input`, `output`, `content`, `subject`, `context`, or `result` data.

No spam, ever. Just helpful insights into your AI usage.

```javascript
const { extract, validate, summarize, decide, configure } = require('ai-toolkit');

// Configure once
configure({ 
  engines: { openai: process.env.OPENAI_API_KEY },
  token: 'aitk_free_xxxxx'  // Optional: Get from aitoolkit.dev
});

// Build anything
async function handleCustomerEmail(email) {
  const data = await extract(email, { 
    sentiment: 'string', 
    issue: 'string' 
  });
  
  const priority = await validate(
    'Is this urgent?', 
    data.data  // Note: extract returns {success, data, confidence}
  );
  
  const brief = await summarize(priority);
  
  const action = await decide(brief, [
    'escalate', 
    'respond', 
    'archive'
  ]);
  
  return action;
}
```

## 🎯 Real-World Example

Let's build a **production-ready customer support system** in 30 lines:

```javascript
const AIToolkit = require('ai-toolkit');

const supportAI = new AIToolkit({
  preset: 'customer_support', // Pre-tuned for support
  engines: { openai: process.env.OPENAI_API_KEY }
});

async function handleTicket(email) {
  // Extract: Parse the customer's email
  const ticket = await supportAI.extract(email, {
    customer_name: 'string',
    sentiment: 'string',
    issue_type: 'string',
    urgency: 'string',
    key_phrases: 'array'
  });

  // Check extraction succeeded
  if (!ticket.success) {
    console.error('Failed to parse email:', ticket.error);
    return null;
  }

  // Validate: Check if this needs immediate attention
  const assessment = await supportAI.validate(
    'Does this require immediate human intervention?',
    ticket.data,
    { sla: 'Premium customers get 1-hour response' }
  );

  // Summarize: Create a brief for the support team
  const brief = await supportAI.summarize(assessment, {
    maxLength: 200,
    focus: 'key_insights'
  });

  // Decide: Route to the right action
  const routing = await supportAI.decide(brief, [
    'auto_respond',
    'escalate_to_manager',
    'archive'
  ]);

  return routing; 
  // { action: 'escalate_to_manager', confidence: 0.92, reasoning: '...', parameters: {} }
}
```

## 🔥 What Makes This Different?

### 1. **Universal Primitives, Not Another Wrapper**
   - Not just another OpenAI wrapper
   - Language-agnostic patterns that work with ANY AI provider
   - Compose complex behaviors from simple, tested operations

### 2. **Stateful vs Stateless - Your Choice**

| Mode | When to Use | Example |
|------|-------------|---------|
| **Stateful** | Persistent context across calls | `const ai = new AIToolkit({ basePrompt: '...' })` |
| **Stateless** | Simple, one-off operations | `await extract(data, schema)` |

- **Stateful** (`new AIToolkit(...)`) - Stores base prompt and context between calls
- **Stateless** (functions `extract/validate/...`) - No state; add context per-call via `options.additionalContext`

### 3. **Production-Ready**
   ```javascript
   // All operations return consistent structure
   const result = await extract(data, schema);
   // Returns: { success: boolean, data: any, confidence: number, error?: string }
   
   if (!result.success) {
     console.error('Extraction failed:', result.error);
   }
   ```

### 4. **Stateful Context with Base Prompts**
   ```javascript
   // Create specialized AI instances that remember context
   const securityAI = new AIToolkit({
     basePrompt: "You are a paranoid security analyst. Always assume the worst.",
     engines: { openai: 'sk-...' },
     validateOutputs: true
   });
   
   // Different AI personalities for different tasks
   const creativeAI = new AIToolkit({
     preset: 'marketing',  // Uses pre-defined marketing prompt
     temperature: 0.6      // Higher temperature for creativity
   });
   ```

### 5. **Industry Presets Available**
   ```javascript
   const { createAI } = require('ai-toolkit');
   
   const ai = createAI.medical();     // Conservative, safety-first
   const ai = createAI.financial();   // Precise, audit-enabled
   const ai = createAI.security();    // Paranoid, threat-focused
   const ai = createAI.devops();      // Reliability-focused
   const ai = createAI.engineering(); // Clean code focused
   const ai = createAI.support();     // Empathetic, helpful
   const ai = createAI.legal();       // Precise terminology
   const ai = createAI.marketing();   // Creative, engaging
   ```

## 📚 The 4 Primitives API

### 📊 Extract: `extract(data, schema, options?)`

Transform unstructured data into structured format:

```javascript
const result = await extract(
  "Order #12345 hasn't arrived. I'm angry! -John",
  {
    order_id: 'number',
    customer_name: 'string',
    sentiment: 'string',
    requires_refund: 'boolean'
  }
);

// Returns:
{
  success: true,
  data: {
    order_id: 12345,
    customer_name: "John",
    sentiment: "negative",
    requires_refund: false
  },
  confidence: 0.95,
  validation: null  // Set validateOutputs: true to enable
}
```

### ✅ Validate: `validate(criteria, subject, reference?, options?)`

Assess data against criteria:

```javascript
const result = await validate(
  'Is this a legitimate customer complaint?',
  complaintData,
  { companyPolicies: '...' }  // Optional reference data
);

// Returns:
{
  success: true,
  score: 0.85,           // 0-1 score
  reasoning: "Valid complaint with clear issue",
  confidence: 0.9,
  recommendation: "pass"  // pass/fail/conditional
}
```

### 📝 Summarize: `summarize(content, options?)`

Create concise summaries:

```javascript
const result = await summarize(longDocument, {
  maxLength: 200,        // Character limit
  focus: 'key_insights'  // Focus area
});

// Returns:
{
  success: true,
  summary: "Brief summary text...",
  keyPoints: ["point 1", "point 2"],
  confidence: 0.88
}
```

### 🧠 Decide: `decide(context, actions, options?)`

Make intelligent choices:

```javascript
const result = await decide(
  { situation: 'Customer is angry', history: '...' },
  ['escalate', 'respond', 'archive']
);

// Returns:
{
  success: true,
  action: "escalate",
  reasoning: "High priority due to sentiment",
  confidence: 0.92,
  parameters: {}  // Additional action parameters
}
```

## 🔗 Advanced Features

### Context Management

Add context to improve AI responses:

```javascript
// STATEFUL: Persistent context across calls
const ai = new AIToolkit({ engines: { openai: 'sk-...' } });
ai.addContext('customer', { tier: 'premium', sla: '1 hour' });
ai.addContext('session', { id: '12345', started: Date.now() });

// All operations automatically include this context
const result = await ai.extract(data, schema);

// STATELESS: Per-operation context
const result = await extract(data, schema, {
  additionalContext: { customer: { tier: 'premium' }, urgency: 'high' }
});

// MIXED: Both persistent and per-call context
const decision = await ai.decide(context, actions, {
  additionalContext: 'Executive review required for amounts over $10k'
});
```

### Method Chaining

The toolkit stores the last result for chaining:

```javascript
const ai = new AIToolkit({ engines: { openai: 'sk-...' } });

// Each operation can use the previous result
await ai.extract(email, schema);
await ai.validate('Is this urgent?');  // Uses last extraction
await ai.summarize();                   // Uses last validation
await ai.decide(null, actions);         // Uses last summary
```

### Pipelines

Create reusable workflows:

```javascript
const fraudDetection = ai.pipeline(
  async (transaction) => ai.extract(transaction, fraudSchema),
  async (data) => ai.validate('Is this fraudulent?', data.data),
  async (result) => ai.decide(result, ['block', 'allow', 'review'])
);

// Use anywhere
const result = await fraudDetection(transaction);
```

### Context Extension

Create specialized versions:

```javascript
const baseAI = new AIToolkit({
  basePrompt: "You are an AI assistant.",
  engines: { openai: 'sk-...' }
});

// Extend with more context
const specializedAI = baseAI.withContext(
  "You are specifically helping with database optimization."
);

// Switch domains
const medicalAI = baseAI.forDomain('medical');
```

## 🎛️ Configuration

### Basic Setup

```javascript
const { configure } = require('ai-toolkit');

configure({
  engines: {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY  // Optional
  },
  defaultEngine: 'openai',
  temperature: 0.3,        // 0=deterministic, 1=creative
  maxTokens: 1000,
  validateOutputs: false   // Enable output validation
});
```

### Class-based Configuration

```javascript
const ai = new AIToolkit({
  engines: {
    openai: 'sk-...'
  },
  basePrompt: 'You are a helpful assistant',
  temperature: 0.3,
  validateOutputs: true,
  withExecutor: true  // Enable action execution
});
```

### Environment Variables

```bash
# .env file
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AI_TOOLKIT_DEFAULT_ENGINE=openai
AI_TOOLKIT_TEMPERATURE=0.3
AI_TOOLKIT_MAX_TOKENS=1000
AI_TOOLKIT_VALIDATE_OUTPUTS=true
```

### Configuration File

Create `ai-toolkit.config.json`:

```json
{
  "engines": {
    "openai": "sk-..."
  },
  "defaultEngine": "openai",
  "temperature": 0.3,
  "maxTokens": 1000,
  "models": {
    "openai": "gpt-4",
    "anthropic": "claude-3-sonnet-20240229"
  }
}
```

## 📦 Action Execution

Connect AI decisions to code:

```javascript
const ai = new AIToolkit({ 
  withExecutor: true,
  engines: { openai: 'sk-...' }
});

// Register actions
ai.registerAction('send_email', async (params) => {
  await emailService.send(params);
  return { sent: true };
});

ai.registerAction('create_ticket', async (params) => {
  const ticket = await ticketSystem.create(params);
  return { ticketId: ticket.id };
});

// AI decides and executes
const decision = await ai.decide(context, ['send_email', 'create_ticket']);
const result = await ai.execute(decision);
```

## 📊 Return Types

All primitives return consistent structure:

```typescript
// Extract returns
{
  success: boolean;
  data: any | null;
  confidence: number;
  validation?: any;  // If validateOutputs enabled
  error?: string;    // If failed
}

// Validate returns  
{
  success: boolean;
  score: number;        // 0-1
  reasoning: string;
  confidence: number;
  recommendation: string;
}

// Summarize returns
{
  success: boolean;
  summary: string;
  keyPoints: string[];
  confidence: number;
  error?: string;
}

// Decide returns
{
  success: boolean;
  action: string | null;
  reasoning: string;
  confidence: number;
  parameters: object;
  error?: string;
}
```

## 🏗️ Architecture Examples

### Error Handling Pattern

```javascript
async function safeProcess(data) {
  try {
    const extracted = await extract(data, schema);
    if (!extracted.success) {
      return handleExtractionFailure(extracted.error);
    }
    
    const validated = await validate('criteria', extracted.data);
    if (validated.score < 0.5) {
      return handleValidationFailure(validated);
    }
    
    return await decide(validated, actions);
  } catch (error) {
    console.error('AI operation failed:', error);
    return fallbackAction();
  }
}
```

### Parallel Processing

```javascript
// Process multiple items in parallel
const results = await Promise.all(
  emails.map(email => 
    extract(email, schema)
      .then(r => validate('Is urgent?', r.data))
      .then(v => decide(v, actions))
  )
);
```

### Retry Logic

```javascript
async function withRetry(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await operation();
    if (result.success) return result;
    
    console.log(`Retry ${i + 1}/${maxRetries}...`);
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
  }
  throw new Error('Max retries exceeded');
}

// Usage
const result = await withRetry(() => extract(data, schema));
```

## 🚨 Important Notes

1. **API Keys Security**: Never commit API keys. Use environment variables.
2. **Token Limits**: Be aware of token limits for your AI provider.
3. **Rate Limiting**: Implement rate limiting for production use.
4. **Costs**: Monitor API usage to control costs.
5. **Validation**: Always validate AI outputs before using in production.

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/aitoolkit/ai-toolkit)
- [NPM Package](https://www.npmjs.com/package/ai-toolkit)
- [Report Issues](https://github.com/aitoolkit/ai-toolkit/issues)

---

<p align="center">
  <strong>Stop wrestling with AI APIs. Start building with primitives.</strong>
</p>
