const { ConfigLoader } = require('../config');

describe('ConfigLoader', () => {
  let loader;
  let originalEnv;

  beforeEach(() => {
    loader = new ConfigLoader();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getDefaults', () => {
    test('should return default configuration', () => {
      const defaults = loader.getDefaults();
      
      expect(defaults.defaultEngine).toBe('openai');
      expect(defaults.temperature).toBe(0.3);
      expect(defaults.maxTokens).toBe(1000);
      expect(defaults.telemetry).toBe(true);
      expect(defaults.validateOutputs).toBe(false);
    });
  });

  describe('loadFromEnv', () => {
    test('should load OpenAI key from environment', () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      
      const config = loader.loadFromEnv();
      
      expect(config.engines.openai).toBe('test-openai-key');
    });

    test('should load Anthropic key from environment', () => {
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      
      const config = loader.loadFromEnv();
      
      expect(config.engines.anthropic).toBe('test-anthropic-key');
    });

    test('should load AI Toolkit token from environment', () => {
      process.env.AI_TOOLKIT_TOKEN = 'test-token';
      
      const config = loader.loadFromEnv();
      
      expect(config.token).toBe('test-token');
    });

    test('should disable telemetry from environment', () => {
      process.env.AI_TELEMETRY = 'false';
      
      const config = loader.loadFromEnv();
      
      expect(config.telemetry).toBe(false);
    });
  });

  describe('load', () => {
    test('should merge options with defaults', () => {
      const config = loader.load({
        temperature: 0.7,
        customOption: 'value'
      });
      
      expect(config.temperature).toBe(0.7);
      expect(config.customOption).toBe('value');
      expect(config.defaultEngine).toBe('openai');
    });

    test('should prioritize runtime options over environment', () => {
      process.env.OPENAI_API_KEY = 'env-key';
      
      const config = loader.load({
        engines: { openai: 'runtime-key' }
      });
      
      expect(config.engines.openai).toBe('runtime-key');
    });

    test('should set cloudMode when token present without API keys', () => {
      const config = loader.load({
        token: 'aitk_test_token'
      });
      
      expect(config.cloudMode).toBe(true);
    });

    test('should not set cloudMode when API keys present', () => {
      const config = loader.load({
        token: 'aitk_test_token',
        engines: { openai: 'test-key' }
      });
      
      expect(config.cloudMode).toBeUndefined();
    });
  });

  describe('processConfig', () => {
    test('should warn when no engines configured', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      loader.processConfig({});
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should not warn when token is present', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      loader.processConfig({ token: 'test-token' });
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});