/**
 * AI Toolkit - Quick Start Examples
 * Shows different ways to use the library
 */

// ============================================
// Method 1: Direct function imports (simplest)
// ============================================
const { extract, validate, summarize, decide, configure } = require('ai-toolkit');

async function functionalExample() {
  // Configure once (optional - will use env vars by default)
  configure({
    engines: {
      openai: process.env.OPENAI_API_KEY
    }
  });

  // Use the primitives directly
  const email = 'Your product broke after 2 days. I want a refund!';

  const extracted = await extract(email, {
    sentiment: 'string',
    issue: 'string',
    demand: 'string'
  });
  console.log('Extracted:', extracted);

  const validation = await validate('Is this high priority?', extracted.data);
  console.log('Priority Score:', validation.score);

  const summary = await summarize(validation);
  console.log('Summary:', summary.summary);

  const decision = await decide(summary, ['escalate', 'respond', 'ignore']);
  console.log('Decision:', decision.action);
}

// ============================================
// Method 2: Class instance (more control)
// ============================================
const AIToolkit = require('@aisec/ai-toolkit');

async function classExample() {
  const ai = new AIToolkit({
    engines: {
      openai: process.env.OPENAI_API_KEY
    },
    validateOutputs: true, // Enable self-validation
    telemetryKey: process.env.AI_TOOLKIT_KEY // Optional analytics
  });

  const result = await ai.extract('Meeting at 3pm tomorrow', {
    time: 'string',
    date: 'string'
  });

  console.log('Result with validation:', result);
}

// ============================================
// Method 3: ES6 imports (modern)
// ============================================
// import { extract, validate, summarize, decide } from '@aisec/ai-toolkit';
// import AIToolkit from '@aisec/ai-toolkit';

// ============================================
// Method 4: With action executor
// ============================================
async function executorExample() {
  const ai = new AIToolkit({
    engines: { openai: process.env.OPENAI_API_KEY },
    withExecutor: true
  });

  // Register actions
  ai.registerAction('send_email',
    async (params) => {
      console.log(`Sending email to ${params.to}: ${params.subject}`);
      return { sent: true };
    },
    {
      description: 'Send an email',
      parameters: {
        to: 'string',
        subject: 'string',
        body: 'string'
      }
    }
  );

  ai.registerAction('create_ticket',
    async (params) => {
      console.log(`Creating ticket: ${params.title}`);
      return { ticketId: '12345' };
    },
    {
      description: 'Create support ticket',
      parameters: {
        title: 'string',
        priority: 'string'
      }
    }
  );

  // Let AI decide and execute
  const context = {
    customerComplaint: 'Product not working',
    severity: 'high'
  };

  const decision = await ai.decide(
    context,
    ai.executor.getAvailableActions()
  );

  if (decision.success) {
    const result = await ai.execute(decision);
    console.log('Executed:', result);
  }
}

// ============================================
// Method 5: Cloud mode (no API keys needed)
// ============================================
async function cloudExample() {
  const ai = new AIToolkit({
    token: 'aitk_free_abc123' // Get from https://aitoolkit.test
    // No API keys needed!
  });

  const result = await ai.extract('Extract this', { text: 'string' });
  console.log('Cloud result:', result);
}

// ============================================
// Method 6: Complete workflow
// ============================================
async function workflowExample() {
  const ai = new AIToolkit({
    engines: { openai: process.env.OPENAI_API_KEY }
  });

  const customerEmail = `
    I ordered a laptop last week but received a tablet instead.
    This is unacceptable! I need the correct item urgently for work.
    Order #12345
  `;

  // Step 1: Extract
  const extracted = await ai.extract(customerEmail, {
    issue: 'string',
    orderId: 'string',
    urgency: 'string',
    item_ordered: 'string',
    item_received: 'string'
  });

  // Step 2: Validate
  const validation = await ai.validate(
    'Is this a valid shipping error complaint?',
    extracted.data
  );

  // Step 3: Summarize
  const summary = await ai.summarize(validation, {
    focus: 'action_required'
  });

  // Step 4: Decide
  const decision = await ai.decide(summary, [
    'ship_replacement_express',
    'offer_refund',
    'escalate_to_manager',
    'request_more_info'
  ]);

  console.log('Workflow result:', {
    extracted: extracted.data,
    valid: validation.score > 0.7,
    summary: summary.summary,
    action: decision.action,
    reasoning: decision.reasoning
  });
}

// Run examples
if (require.main === module) {
  (async () => {
    console.log('\n=== Functional Example ===');
    await functionalExample();

    console.log('\n=== Class Example ===');
    await classExample();

    console.log('\n=== Executor Example ===');
    await executorExample();

    console.log('\n=== Workflow Example ===');
    await workflowExample();
  })();
}

module.exports = {
  functionalExample,
  classExample,
  executorExample,
  cloudExample,
  workflowExample
};
