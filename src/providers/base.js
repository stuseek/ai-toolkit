/**
 * Base AI Provider Interface
 * All AI providers must implement this interface
 */
class AIProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = this.constructor.name;
    this.supportsStreaming = false;
    this.supportsEmbeddings = false;
    this.supportsFunctionCalling = false;
  }

  /**
   * Generate text completion
   * @param {string} prompt - The prompt to send to the AI
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - The generated text
   */
  async generate(prompt, _options = {}) {
    throw new Error(`${this.name} must implement generate() method`);
  }

  /**
   * Generate structured output
   * @param {string} prompt - The prompt to send to the AI
   * @param {Object} schema - Expected output schema
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - The structured output
   */
  async generateStructured(prompt, schema, options = {}) {
    const response = await this.generate(prompt, {
      ...options,
      responseFormat: 'json'
    });

    try {
      return JSON.parse(response);
    } catch (error) {
      throw new Error(`Failed to parse structured output: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for input texts
   * @param {string[]} inputs - Array of texts to embed
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async embed(_inputs) {
    if (!this.supportsEmbeddings) {
      throw new Error(`${this.name} does not support embeddings`);
    }
    throw new Error(`${this.name} must implement embed() method`);
  }

  /**
   * Stream text completion
   * @param {string} prompt - The prompt to send to the AI
   * @param {Object} options - Generation options
   * @returns {AsyncGenerator<string>} - Stream of text chunks
   */
  async* stream(prompt, options = {}) {
    if (!this.supportsStreaming) {
      // Fallback to non-streaming
      const result = await this.generate(prompt, options);
      yield result;
      return;
    }
    throw new Error(`${this.name} must implement stream() method`);
  }

  /**
   * Get the model name being used
   * @returns {string} - The model name
   */
  getModel() {
    return this.config.model || 'default';
  }

  /**
   * Get token count for a given text
   * @param {string} text - Text to count tokens for
   * @returns {number} - Approximate token count
   */
  countTokens(text) {
    // Default implementation - rough approximation
    return Math.ceil(text.length / 4);
  }

  /**
   * Validate provider configuration
   * @throws {Error} - If configuration is invalid
   */
  validateConfig() {
    // Override in subclasses
  }

  /**
   * Get provider capabilities
   * @returns {Object} - Provider capabilities
   */
  getCapabilities() {
    return {
      streaming: this.supportsStreaming,
      embeddings: this.supportsEmbeddings,
      functionCalling: this.supportsFunctionCalling,
      maxTokens: this.config.maxTokens || 4096,
      models: this.getAvailableModels()
    };
  }

  /**
   * Get available models for this provider
   * @returns {string[]} - List of available models
   */
  getAvailableModels() {
    return ['default'];
  }

  /**
   * Format messages for the provider's API
   * @param {Array} messages - Array of message objects
   * @returns {any} - Formatted messages for the provider
   */
  formatMessages(messages) {
    return messages;
  }

  /**
   * Handle rate limiting with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<any>} - Result of the function
   */
  async withRetry(fn, maxRetries = 3) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          throw error;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Check if an error is retryable
   * @param {Error} error - The error to check
   * @returns {boolean} - Whether the error is retryable
   */
  isRetryableError(error) {
    // Check for common retryable errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Rate limiting errors
    if (error.status === 429 || error.statusCode === 429) {
      return true;
    }

    // Service unavailable
    if (error.status === 503 || error.statusCode === 503) {
      return true;
    }

    return false;
  }
}

module.exports = AIProvider;