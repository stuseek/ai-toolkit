/**
 * AI Toolkit - The 4 Fundamental AI Operations
 *
 * Usage:
 *   // Stateless
 *   import { extract, validate, summarize, decide } from 'ai-toolkit';
 *
 *   // Stateful with context
 *   const securityAI = new AIToolkit({ basePrompt: "You are a security analyst..." });
 *   const devopsAI = new AIToolkit({ preset: 'devops' });
 */

const { ConfigLoader } = require('./config');
const { TelemetryClient } = require('./telemetry');
const { ActionExecutor } = require('./executor');

// Global instance for functional usage
let globalInstance = null;

/**
 * Main AIToolkit Class
 */
/**
 * Industry presets for common use cases
 */
const PRESETS = {
  security: {
    basePrompt: 'You are a senior security analyst with expertise in threat detection and incident response. Prioritize security over convenience. Be paranoid about potential threats.',
    temperature: 0.2,
    validateOutputs: true
  },

  devops: {
    basePrompt: 'You are a DevOps engineer focused on reliability and automation. Balance uptime with development velocity. Consider scalability and monitoring.',
    temperature: 0.3,
    validateOutputs: false
  },

  customer_support: {
    basePrompt: 'You are a customer service expert. Be empathetic and solution-oriented. Prioritize customer satisfaction while following company policies.',
    temperature: 0.4,
    validateOutputs: false
  },

  financial: {
    basePrompt: 'You are a financial analyst with expertise in risk assessment and compliance. Be precise with numbers and conservative with recommendations. Consider regulatory requirements.',
    temperature: 0.1,
    validateOutputs: true,
    audit: true
  },

  medical: {
    basePrompt: 'You are a medical professional assistant. Prioritize patient safety and privacy. Be conservative with health recommendations. Always suggest consulting healthcare providers for medical decisions.',
    temperature: 0.1,
    validateOutputs: true,
    audit: true
  },

  legal: {
    basePrompt: 'You are a legal analyst. Be precise with terminology and conservative with interpretations. Consider jurisdictional differences. This is not legal advice.',
    temperature: 0.2,
    validateOutputs: true,
    audit: true
  },

  marketing: {
    basePrompt: 'You are a marketing strategist. Focus on engagement, conversion, and brand consistency. Be creative but data-driven.',
    temperature: 0.6,
    validateOutputs: false
  },

  engineering: {
    basePrompt: 'You are a software engineer. Focus on clean code, performance, and maintainability. Consider edge cases and error handling.',
    temperature: 0.3,
    validateOutputs: true
  }
};

class AIToolkit {
  constructor(options = {}) {
    // Apply preset if specified
    if (options.preset && PRESETS[options.preset]) {
      options = { ...PRESETS[options.preset], ...options };
    }

    // Store base prompt for context
    this.basePrompt = options.basePrompt || null;
    // Context store for stateful mode
    this.context = new Map();
    // Load configuration
    this.config = new ConfigLoader().load(options);

    this.telemetry = null;
    if (this.config.token || this.config.telemetryKey) {
      this.telemetry = new TelemetryClient({
        token: this.config.token || this.config.telemetryKey,
        endpoint: this.config.telemetryEndpoint || 'https://telemetry.aitoolkit.dev',
        enabled: this.config.telemetry !== false
      });
      this.isPremium = this.telemetry.isPremium();
    }

    this.engines = this.config.engines || {};
    this.defaultEngine = this.config.defaultEngine || 'openai';
    this.clients = {};
    this.initializeClients();

    this.executor = this.config.withExecutor ? new ActionExecutor() : null;
    this.validateOutputs = this.config.validateOutputs || false;

    this.logging = this.isPremium && this.config.logging;
    this.audit = this.isPremium && this.config.audit;
    this.debug = this.isPremium && this.config.debug;

    this.lastResult = null;
  }

  /**
   * Add context for stateful mode
   */
  addContext(key, value) {
    this.context.set(key, value);
    return this;
  }

  /**
   * Remove context
   */
  removeContext(key) {
    this.context.delete(key);
    return this;
  }

  /**
   * Clear all context
   */
  clearContext() {
    this.context.clear();
    return this;
  }

  /**
   * Get formatted context string
   */
  getContextString() {
    if (this.context.size === 0) return '';
    
    const contextParts = [];
    for (const [key, value] of this.context) {
      contextParts.push(`${key}: ${JSON.stringify(value)}`);
    }
    return `\nContext:\n${contextParts.join('\n')}`;
  }

  /**
   * Create a new instance with additional context
   */
  withContext(additionalPrompt) {
    const newPrompt = this.basePrompt
      ? `${this.basePrompt}\n\n${additionalPrompt}`
      : additionalPrompt;

    return new AIToolkit({
      ...this.config,
      basePrompt: newPrompt,
      engines: this.engines
    });
  }

  /**
   * Create specialized instance for specific domain
   */
  forDomain(domain) {
    if (!PRESETS[domain]) {
      throw new Error(`Unknown domain: ${domain}. Available: ${Object.keys(PRESETS).join(', ')}`);
    }

    return new AIToolkit({
      ...this.config,
      ...PRESETS[domain],
      engines: this.engines
    });
  }

  /**
   * Build messages with base prompt
   */
  buildMessages(systemPrompt, userPrompt, additionalContext = null) {
    let finalSystemPrompt = this.basePrompt ? `${this.basePrompt}\n\n${systemPrompt}` : systemPrompt;
    
    // Add stored context for stateful mode
    const contextString = this.getContextString();
    if (contextString) {
      finalSystemPrompt += contextString;
    }
    
    // Add additional context if provided
    if (additionalContext) {
      if (typeof additionalContext === 'string') {
        finalSystemPrompt += `\n\nAdditional context: ${additionalContext}`;
      } else {
        finalSystemPrompt += `\n\nAdditional context: ${JSON.stringify(additionalContext)}`;
      }
    }
    
    return {
      system: finalSystemPrompt,
      user: userPrompt
    };
  }

  initializeClients() {
    if (this.config.cloudMode) {
      this.clients.openai = { cloudMode: true };
      this.clients.anthropic = { cloudMode: true };
      return;
    }
    if (this.engines.openai) {
      try {
        const { OpenAI } = require('openai');
        this.clients.openai = new OpenAI({
          apiKey: this.engines.openai
        });
      } catch {
        console.warn('OpenAI SDK not installed. Run: npm install openai');
      }
    }

    if (this.engines.anthropic) {
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        this.clients.anthropic = new Anthropic({
          apiKey: this.engines.anthropic
        });
      } catch {
        console.warn('Anthropic SDK not installed. Run: npm install @anthropic-ai/sdk');
      }
    }
  }

  async makeAIRequest(messages, options = {}) {
    const engine = options.engine || this.defaultEngine;
    const client = this.clients[engine];

    if (!client) {
      throw new Error(`AI engine ${engine} not configured. Pass API key or use token for cloud mode.`);
    }

    const start = Date.now();

    try {
      let response;

      if (client.cloudMode) {
        throw new Error('Cloud mode requires AI Toolkit token. Get one at https://aitoolkit.dev');
      } else {
        const { system, user } = messages;
        
        switch (engine) {
        case 'openai': {
          const completion = await client.chat.completions.create({
            model: options.model || this.config.models?.openai || 'gpt-4',
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user }
            ],
            temperature: options.temperature || this.config.temperature || 0.3,
            max_tokens: options.maxTokens || this.config.maxTokens || 1000
          });
          response = completion.choices[0].message.content;
          break;
        }

        case 'anthropic': {
          const message = await client.messages.create({
            model: options.model || this.config.models?.anthropic || 'claude-3-sonnet-20240229',
            system,
            messages: [{ role: 'user', content: user }],
            max_tokens: options.maxTokens || this.config.maxTokens || 1000,
            temperature: options.temperature || this.config.temperature || 0.3
          });
          response = message.content[0].text;
          break;
        }

        default:
          throw new Error(`Unknown engine: ${engine}`);
        }
      }

      // Track telemetry
      if (this.telemetry) {
        this.telemetry.track('ai_request', {
          engine,
          duration: Date.now() - start,
          success: true,
          operation: options.operation
        });
      }

      return response;

    } catch (error) {
      // Track error
      if (this.telemetry) {
        this.telemetry.track('ai_request', {
          engine,
          duration: Date.now() - start,
          success: false,
          error: error.message,
          operation: options.operation
        });
      }

      throw error;
    }
  }

  /**
   * Parse JSON from AI response
   */
  parseJSON(response) {
    try {
      if (typeof response === 'object') {return response;}

      let cleaned = response
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const objectMatch = cleaned.match(/^\{[\s\S]*\}$/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }

      const arrayMatch = cleaned.match(/^\[[\s\S]*\]$/);
      if (arrayMatch) {
        return JSON.parse(arrayMatch[0]);
      }

      const firstObject = cleaned.indexOf('{');
      const firstArray = cleaned.indexOf('[');
      
      if (firstObject === -1 && firstArray === -1) {
        return JSON.parse(cleaned);
      }

      const isArray = firstArray !== -1 && (firstObject === -1 || firstArray < firstObject);
      
      if (isArray) {
        let depth = 0;
        let start = firstArray;
        for (let i = firstArray; i < cleaned.length; i++) {
          if (cleaned[i] === '[') {depth++;}
          if (cleaned[i] === ']') {depth--;}
          if (depth === 0) {
            return JSON.parse(cleaned.substring(start, i + 1));
          }
        }
      } else {
        let depth = 0;
        let start = firstObject;
        for (let i = firstObject; i < cleaned.length; i++) {
          if (cleaned[i] === '{') {depth++;}
          if (cleaned[i] === '}') {depth--;}
          if (depth === 0) {
            return JSON.parse(cleaned.substring(start, i + 1));
          }
        }
      }

      return JSON.parse(cleaned);
    } catch (error) {
      if (this.debug) {
        console.error('JSON parse error:', error.message);
        console.error('Raw response:', response);
      }
      return { error: 'Failed to parse response' };
    }
  }

  /**
   * 📊 EXTRACT - Structure unstructured data
   */
  async extract(data, schema, options = {}) {
    const start = Date.now();
    const { additionalContext, ...apiOptions } = options;

    try {
      const systemPrompt = 'Extract structured information according to the schema. Return valid JSON.';
      const userPrompt = `Data: ${JSON.stringify(data)}\n\nSchema: ${JSON.stringify(schema)}\n\nExtract the information and return JSON matching the schema.`;

      const messages = this.buildMessages(systemPrompt, userPrompt, additionalContext);

      const response = await this.makeAIRequest(messages, {
        ...apiOptions,
        operation: 'extract'
      });

      const extracted = this.parseJSON(response);

      // Validate output if enabled
      let validation = null;
      if (this.validateOutputs || options.validate) {
        validation = await this.validateExtraction(extracted, schema, data);
      }

      const result = {
        success: !extracted.error,
        data: extracted.error ? null : extracted,
        confidence: this.calculateConfidence(extracted, schema),
        validation
      };

      // Store for chaining
      this.lastResult = result;

      // Telemetry
      if (this.telemetry) {
        this.telemetry.track('extract', {
          duration: Date.now() - start,
          schemaSize: Object.keys(schema).length,
          confidence: result.confidence,
          success: result.success
        });
      }

      // Premium logging
      if (this.logging) {
        this.log('extract', { input: data, schema, result });
      }

      return result;

    } catch (error) {
      return {
        success: false,
        data: null,
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * ✅ VALIDATE - Assess against criteria
   */
  async validate(criteria, subject, reference = null, options = {}) {
    const start = Date.now();
    const { additionalContext, ...apiOptions } = options;

    try {
      // Support chaining - use last result if subject not provided
      if (typeof criteria === 'string' && !subject && this.lastResult) {
        subject = this.lastResult.data || this.lastResult;
      }

      const systemPrompt = 'Validate the subject against criteria. Return JSON with score (0-1), reasoning, and recommendation.';
      const userPrompt = `Criteria: ${criteria}\n\nSubject: ${JSON.stringify(subject)}${reference ? `\n\nReference: ${JSON.stringify(reference)}` : ''}\n\nReturn: { score: 0-1, reasoning: "...", confidence: 0-1, recommendation: "pass/fail/conditional" }`;

      const messages = this.buildMessages(systemPrompt, userPrompt, additionalContext);

      const response = await this.makeAIRequest(messages, {
        ...apiOptions,
        operation: 'validate'
      });

      const validation = this.parseJSON(response);

      const result = {
        success: !validation.error,
        score: validation.score || 0,
        reasoning: validation.reasoning || '',
        confidence: validation.confidence || 0,
        recommendation: validation.recommendation
      };

      // Store for chaining
      this.lastResult = result;

      // Telemetry
      if (this.telemetry) {
        this.telemetry.track('validate', {
          duration: Date.now() - start,
          score: result.score,
          confidence: result.confidence,
          success: result.success
        });
      }

      // Premium logging
      if (this.logging) {
        this.log('validate', { criteria, subject, reference, result });
      }

      return result;

    } catch (error) {
      return {
        success: false,
        score: 0,
        reasoning: error.message,
        confidence: 0
      };
    }
  }

  /**
   * 📝 SUMMARIZE - Synthesize key insights
   */
  async summarize(content, options = {}) {
    const start = Date.now();
    const { maxLength = 200, focus = 'key_insights', additionalContext, ...apiOptions } = options;

    try {
      // Support chaining - use last result if content not provided
      if (!content && this.lastResult) {
        content = this.lastResult.data || this.lastResult;
      }

      const systemPrompt = 'Create concise summaries focusing on actionable insights. Return JSON.';
      const userPrompt = `Content: ${JSON.stringify(content)}\n\nCreate a summary (max ${maxLength} chars) focusing on ${focus}.\n\nReturn: { summary: "...", keyPoints: [...], confidence: 0-1 }`;

      const messages = this.buildMessages(systemPrompt, userPrompt, additionalContext);

      const response = await this.makeAIRequest(messages, {
        ...apiOptions,
        operation: 'summarize'
      });

      const summary = this.parseJSON(response);

      const result = {
        success: !summary.error,
        summary: summary.summary || '',
        keyPoints: summary.keyPoints || [],
        confidence: summary.confidence || 0
      };

      // Store for chaining
      this.lastResult = result;

      // Telemetry
      if (this.telemetry) {
        this.telemetry.track('summarize', {
          duration: Date.now() - start,
          inputLength: JSON.stringify(content).length,
          outputLength: result.summary.length,
          success: result.success
        });
      }

      // Premium logging
      if (this.logging) {
        this.log('summarize', { content, options, result });
      }

      return result;

    } catch (error) {
      return {
        success: false,
        summary: '',
        keyPoints: [],
        error: error.message
      };
    }
  }

  /**
   * 🧠 DECIDE - Choose best action
   */
  async decide(context, actions, options = {}) {
    const start = Date.now();
    const { additionalContext, ...apiOptions } = options;

    try {
      // Support chaining - use last result if context not provided
      if (!context && this.lastResult) {
        context = this.lastResult.data || this.lastResult;
      }

      const systemPrompt = 'Analyze context and choose the best action. Return JSON with your decision.';
      const userPrompt = `Context: ${JSON.stringify(context)}\n\nAvailable actions: ${JSON.stringify(actions)}\n\nReturn: { action: "chosen_action", reasoning: "...", confidence: 0-1, parameters: {} }`;

      const messages = this.buildMessages(systemPrompt, userPrompt, additionalContext);

      const response = await this.makeAIRequest(messages, {
        ...apiOptions,
        operation: 'decide'
      });

      const decision = this.parseJSON(response);

      const result = {
        success: !decision.error,
        action: decision.action || null,
        reasoning: decision.reasoning || '',
        confidence: decision.confidence || 0,
        parameters: decision.parameters || {}
      };

      // Store for chaining
      this.lastResult = result;

      // Telemetry
      if (this.telemetry) {
        this.telemetry.track('decide', {
          duration: Date.now() - start,
          actionCount: actions.length,
          chosenAction: result.action,
          confidence: result.confidence,
          success: result.success
        });
      }

      // Premium logging
      if (this.logging) {
        this.log('decide', { context, actions, result });
      }

      // Audit trail for decisions (premium)
      if (this.audit) {
        this.auditLog({
          type: 'decision',
          context,
          availableActions: actions,
          decision: result,
          timestamp: new Date().toISOString()
        });
      }

      return result;

    } catch (error) {
      return {
        success: false,
        action: null,
        reasoning: error.message,
        confidence: 0
      };
    }
  }

  /**
   * 🔄 CHAIN - Compose multiple operations
   */
  async chain(...operations) {
    let result = null;

    for (const op of operations) {
      if (typeof op === 'function') {
        result = await op(result);
      } else if (Array.isArray(op)) {
        const [method, ...args] = op;
        if (typeof this[method] === 'function') {
          result = await this[method](...args, result);
        }
      }
    }

    return result;
  }

  /**
   * 🎯 PIPELINE - Create reusable pipeline
   */
  pipeline(...steps) {
    return async (input) => {
      let result = input;

      for (const step of steps) {
        if (typeof step === 'function') {
          result = await step.call(this, result);
        } else if (typeof step === 'object' && step.method) {
          const { method, args = [] } = step;
          result = await this[method](result, ...args);
        }
      }

      return result;
    };
  }

  /**
   * Execute action (if executor configured)
   */
  async execute(decision) {
    if (!this.executor) {
      throw new Error('Executor not configured. Initialize with { withExecutor: true }');
    }

    // Support chaining - use last result if decision not provided
    if (!decision && this.lastResult && this.lastResult.action) {
      decision = this.lastResult;
    }

    return await this.executor.execute(decision);
  }

  /**
   * Register action for execution
   */
  registerAction(name, handler, metadata) {
    if (!this.executor) {
      this.executor = new ActionExecutor();
    }

    return this.executor.register(name, handler, metadata);
  }

  /**
   * Validate extraction result
   */
  async validateExtraction(extracted, schema, originalData) {
    if (!this.isPremium && !this.validateOutputs) {return null;}

    const system = 'Validate if the extraction was done correctly.';
    const user = 
      `Original: ${JSON.stringify(originalData)}\n` +
      `Schema: ${JSON.stringify(schema)}\n` +
      `Extracted: ${JSON.stringify(extracted)}\n\n` +
      `Is this correct? Return: { "isValid": boolean, "score": 0-1, "issues": [] }`;

    const response = await this.makeAIRequest({ system, user }, {
      operation: 'validate_extraction'
    });

    return this.parseJSON(response);
  }

  /**
   * Calculate extraction confidence
   */
  calculateConfidence(extracted, schema) {
    if (!extracted || extracted.error) {return 0;}
    
    const schemaKeys = Object.keys(schema);
    if (schemaKeys.length === 0) {return 0;}
    
    let filledCount = 0;
    let totalCount = schemaKeys.length;
    
    for (const key of schemaKeys) {
      const value = extracted[key];
      if (value !== null && value !== undefined && value !== '') {
        filledCount++;
      }
    }
    
    return filledCount / totalCount;
  }

  /**
   * Premium: Log operation
   */
  log(operation, data) {
    if (!this.isPremium) {return;}

    if (this.telemetry) {
      this.telemetry.track('log', {
        operation,
        ...data
      });
    }
  }

  /**
   * Premium: Audit log
   */
  auditLog(entry) {
    if (!this.isPremium) {return;}

    if (this.telemetry) {
      this.telemetry.track('audit', entry);
    }
  }
}

/**
 * Initialize global instance for functional usage
 */
function getGlobalInstance() {
  if (!globalInstance) {
    globalInstance = new AIToolkit();
  }
  return globalInstance;
}

/**
 * Functional exports - can be used directly
 */
const extract = (data, schema, options) => getGlobalInstance().extract(data, schema, options);
const validate = (criteria, subject, reference, options) => getGlobalInstance().validate(criteria, subject, reference, options);
const summarize = (content, options) => getGlobalInstance().summarize(content, options);
const decide = (context, actions, options) => getGlobalInstance().decide(context, actions, options);
const execute = (decision) => getGlobalInstance().execute(decision);

/**
 * Configure global instance
 */
function configure(options) {
  globalInstance = new AIToolkit(options);
  return globalInstance;
}

/**
 * Factory functions for creating specialized instances
 */
const createAI = {
  security: () => new AIToolkit({ preset: 'security' }),
  devops: () => new AIToolkit({ preset: 'devops' }),
  support: () => new AIToolkit({ preset: 'customer_support' }),
  financial: () => new AIToolkit({ preset: 'financial' }),
  medical: () => new AIToolkit({ preset: 'medical' }),
  legal: () => new AIToolkit({ preset: 'legal' }),
  marketing: () => new AIToolkit({ preset: 'marketing' }),
  engineering: () => new AIToolkit({ preset: 'engineering' })
};

// Export everything
module.exports = AIToolkit;
module.exports.AIToolkit = AIToolkit;
module.exports.extract = extract;
module.exports.validate = validate;
module.exports.summarize = summarize;
module.exports.decide = decide;
module.exports.execute = execute;
module.exports.configure = configure;
module.exports.createAI = createAI;
module.exports.presets = PRESETS;

// Default export
module.exports.default = AIToolkit;