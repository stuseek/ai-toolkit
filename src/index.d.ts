/**
 * AI Toolkit TypeScript Definitions
 */

export interface BaseOptions {
  engine?: 'openai' | 'anthropic';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Additional context for a single call (string or arbitrary object) */
  additionalContext?: string | Record<string, unknown>;
}

export interface RetryOptions {
  maxRetries?: number;
}

export interface CircuitBreakerOptions {
  threshold?: number;
  resetAfterMs?: number;
}

export interface ModelAliases {
  openai?: string;
  anthropic?: string;
  fast?: string;
  balanced?: string;
  powerful?: string;
  [alias: string]: string | undefined;
}

export interface AIToolkitOptions {
  engines?: {
    openai?: string;
    anthropic?: string;
  };
  defaultEngine?: 'openai' | 'anthropic';
  basePrompt?: string;
  preset?: 'security' | 'devops' | 'customer_support' | 'financial' | 'medical' | 'legal' | 'marketing' | 'engineering';
  temperature?: number;
  maxTokens?: number;
  validateOutputs?: boolean;
  withExecutor?: boolean;
  token?: string;
  telemetryKey?: string;
  telemetryEndpoint?: string;
  telemetry?: boolean;
  logging?: boolean;
  audit?: boolean;
  debug?: boolean;
  /** Model aliases and per-engine defaults */
  models?: ModelAliases;
  /** Retry configuration */
  retry?: RetryOptions;
  /** Request timeout in milliseconds (default 30000) */
  timeout?: number;
  /** Circuit breaker configuration */
  circuitBreaker?: CircuitBreakerOptions;
  /** Enable automatic conversation history tracking for chat() */
  trackHistory?: boolean;
  /** Max tokens to keep in conversation history (default 50000) */
  maxHistoryTokens?: number;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

export interface ToolCallResult {
  name: string;
  parameters: Record<string, any>;
  result: any;
}

export interface ExtractOptions extends BaseOptions {
  validate?: boolean;
}

export interface ValidateOptions extends BaseOptions {}

export interface SummarizeOptions extends BaseOptions {
  maxLength?: number;
  focus?: string;
}

export interface DecideOptions extends BaseOptions {}

export interface ChatOptions extends BaseOptions {
  /** Custom system prompt for the conversation */
  systemPrompt?: string;
  /** Tools available for the AI to call */
  tools?: ToolDefinition[];
  /** Callback invoked when the AI makes a tool call */
  onToolCall?: (name: string, parameters: Record<string, any>) => Promise<any>;
  /** Enable streaming mode — returns async generator */
  stream?: boolean;
  /** When streaming, collect all chunks and return a ChatResult instead of a generator */
  collect?: boolean;
  /** Override constructor-level trackHistory for this call */
  trackHistory?: boolean;
}

export interface ExtractResult {
  success: boolean;
  data: any | null;
  confidence: number;
  validation?: any;
  error?: string;
}

export interface ValidateResult {
  success: boolean;
  score: number;
  reasoning: string;
  confidence: number;
  recommendation: string;
  error?: string;
}

export interface SummarizeResult {
  success: boolean;
  summary: string;
  keyPoints: string[];
  confidence: number;
  error?: string;
}

export interface DecideResult {
  success: boolean;
  action: string | null;
  reasoning: string;
  confidence: number;
  parameters: Record<string, any>;
  error?: string;
}

export interface ChatResult {
  success: boolean;
  message: string | null;
  confidence: number;
  toolCalls?: ToolCallResult[];
  error?: string;
}

export interface ResilienceStats {
  failures: number;
  tripped: boolean;
  totalSkipped: number;
  tripTime: number | null;
}

export declare class CircuitBreakerError extends Error {
  name: 'CircuitBreakerError';
  failures: number;
  totalSkipped: number;
}

export declare class Resilience {
  constructor(options?: {
    maxRetries?: number;
    timeout?: number;
    circuitBreakerThreshold?: number;
    circuitBreakerResetMs?: number;
  });
  execute<T>(fn: () => Promise<T>): Promise<T>;
  isTripped(): boolean;
  reset(): void;
  recordSuccess(): void;
  recordFailure(): void;
  getStats(): ResilienceStats;
}

export declare class AIToolkit {
  constructor(options?: AIToolkitOptions);

  /** Resilience instance (retry + circuit breaker + timeout) */
  resilience: Resilience;

  /** Conversation history messages */
  messages: Array<{ role: string; content: string }>;

  /**
   * Add context for stateful mode
   */
  addContext(key: string, value: any): this;

  /**
   * Remove context
   */
  removeContext(key: string): this;

  /**
   * Clear all context
   */
  clearContext(): this;

  /**
   * Add a message to conversation history
   */
  addMessage(role: string, content: string): this;

  /**
   * Get a copy of the conversation history
   */
  getHistory(): Array<{ role: string; content: string }>;

  /**
   * Clear conversation history
   */
  clearHistory(): this;

  /**
   * Extract structured information from unstructured data
   */
  extract(
    data: any,
    schema: Record<string, any>,
    options?: ExtractOptions
  ): Promise<ExtractResult>;

  /**
   * Validate data against criteria
   */
  validate(
    criteria: string,
    subject: any,
    reference?: any,
    options?: ValidateOptions
  ): Promise<ValidateResult>;

  /**
   * Summarize content into key insights
   */
  summarize(
    content: any,
    options?: SummarizeOptions
  ): Promise<SummarizeResult>;

  /**
   * Make intelligent decision from available actions
   */
  decide(
    context: any,
    actions: string[],
    options?: DecideOptions
  ): Promise<DecideResult>;

  /**
   * Conversational AI interaction with optional tool use and streaming
   */
  chat(
    prompt: string | Array<{ role: string; content: string }>,
    options?: ChatOptions & { stream?: false; collect?: false }
  ): Promise<ChatResult>;
  chat(
    prompt: string | Array<{ role: string; content: string }>,
    options: ChatOptions & { stream: true; collect: true }
  ): Promise<ChatResult>;
  chat(
    prompt: string | Array<{ role: string; content: string }>,
    options: ChatOptions & { stream: true; collect?: false }
  ): Promise<AsyncGenerator<string, void, unknown>>;

  /**
   * Execute registered action
   */
  execute(decision: DecideResult): Promise<any>;

  /**
   * Register action for execution
   */
  registerAction(name: string, handler: Function, metadata?: any): this;

  /**
   * Create pipeline for chaining operations
   */
  pipeline(...steps: Function[]): (input: any) => Promise<any>;

  /**
   * Create new instance with additional context
   */
  withContext(additionalPrompt: string): AIToolkit;

  /**
   * Create specialized instance for domain
   */
  forDomain(domain: string): AIToolkit;
}

// Stateless function exports
export function extract(
  data: any,
  schema: Record<string, any>,
  options?: ExtractOptions
): Promise<ExtractResult>;

export function validate(
  criteria: string,
  subject?: any,
  reference?: any,
  options?: ValidateOptions
): Promise<ValidateResult>;

export function summarize(
  content?: any,
  options?: SummarizeOptions
): Promise<SummarizeResult>;

export function decide(
  context?: any,
  actions?: string[],
  options?: DecideOptions
): Promise<DecideResult>;

export function chat(
  prompt: string | Array<{ role: string; content: string }>,
  options?: ChatOptions
): Promise<ChatResult>;

export function configure(options: AIToolkitOptions): AIToolkit;

export const presets: Record<string, any>;

export const createAI: {
  security(): AIToolkit;
  devops(): AIToolkit;
  support(): AIToolkit;
  financial(): AIToolkit;
  medical(): AIToolkit;
  legal(): AIToolkit;
  marketing(): AIToolkit;
  engineering(): AIToolkit;
};

export interface ServeOptions extends AIToolkitOptions {
  /** Port to listen on (default: 3000) */
  port?: number;
  /** Bind address (default: 0.0.0.0) */
  host?: string;
  /** Require Bearer token auth */
  apiKey?: string;
  /** CORS origin (default: *) */
  cors?: string;
}

import type { Server } from 'http';

export interface AIServer extends Server {
  /** The AIToolkit instance powering the server */
  ai: AIToolkit;
  /** Available route paths */
  routes: string[];
}

/**
 * Start an HTTP microservice exposing all AI primitives as endpoints.
 * POST /extract, /validate, /summarize, /decide, /chat
 * GET  /health
 */
export function serve(options?: ServeOptions): AIServer;

export default AIToolkit;
