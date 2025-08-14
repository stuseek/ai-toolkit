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

export declare class AIToolkit {
  constructor(options?: AIToolkitOptions);
  
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

export default AIToolkit;