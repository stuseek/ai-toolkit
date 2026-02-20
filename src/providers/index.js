const AIProvider = require('./base');
const OpenAIProvider = require('./openai');
const AnthropicProvider = require('./anthropic');

/**
 * Provider factory and registry
 */
class ProviderFactory {
  constructor() {
    this.providers = new Map();
    this.registerDefaults();
  }

  registerDefaults() {
    this.register('openai', OpenAIProvider);
    this.register('anthropic', AnthropicProvider);
    this.register('claude', AnthropicProvider); // Alias
  }

  /**
   * Register a custom provider
   * @param {string} name - Provider name
   * @param {Class} ProviderClass - Provider class extending AIProvider
   */
  register(name, ProviderClass) {
    if (!ProviderClass.prototype instanceof AIProvider && ProviderClass !== AIProvider) {
      throw new Error('Provider must extend AIProvider base class');
    }
    this.providers.set(name.toLowerCase(), ProviderClass);
  }

  /**
   * Create a provider instance
   * @param {string} name - Provider name
   * @param {Object} config - Provider configuration
   * @returns {AIProvider} - Provider instance
   */
  create(name, config = {}) {
    const ProviderClass = this.providers.get(name.toLowerCase());

    if (!ProviderClass) {
      throw new Error(
        `Unknown provider: ${name}. Available providers: ${Array.from(this.providers.keys()).join(', ')}`
      );
    }

    return new ProviderClass(config);
  }

  /**
   * Get list of available providers
   * @returns {string[]} - List of provider names
   */
  getAvailable() {
    return Array.from(this.providers.keys());
  }

  /**
   * Auto-detect provider from environment
   * @param {Object} config - Optional config override
   * @returns {AIProvider|null} - Provider instance or null
   */
  autoDetect(config = {}) {
    // Check for API keys in environment
    if (process.env.OPENAI_API_KEY) {
      return this.create('openai', config);
    }

    if (process.env.ANTHROPIC_API_KEY) {
      return this.create('anthropic', config);
    }

    return null;
  }
}

// Singleton instance
const factory = new ProviderFactory();

module.exports = {
  AIProvider,
  OpenAIProvider,
  AnthropicProvider,
  ProviderFactory: factory,

  // Convenience methods
  createProvider: (name, config) => factory.create(name, config),
  registerProvider: (name, ProviderClass) => factory.register(name, ProviderClass),
  autoDetectProvider: (config) => factory.autoDetect(config)
};