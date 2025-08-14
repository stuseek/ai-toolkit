/**
 * Configuration Management for AI Toolkit
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class ConfigLoader {
  load(options = {}) {
    // Start with defaults
    let config = this.getDefaults();

    // Load from config file
    const fileConfig = this.loadFromFile(options.configFile);
    if (fileConfig) {
      config = { ...config, ...fileConfig };
    }

    // Load from environment variables
    const envConfig = this.loadFromEnv();
    config = { ...config, ...envConfig };

    // Apply runtime options (highest priority)
    config = { ...config, ...options };

    // Handle special cases
    this.processConfig(config);

    return config;
  }

  getDefaults() {
    return {
      defaultEngine: 'openai',
      engines: {},
      models: {
        openai: 'gpt-4',
        anthropic: 'claude-3-sonnet-20240229'
      },
      temperature: 0.3,
      maxTokens: 1000,
      telemetry: true,
      validateOutputs: false,
      withExecutor: false,
      logging: false,
      audit: false,
      debug: false
    };
  }

  loadFromFile(configFile) {
    const searchPaths = configFile ? [configFile] : [
      './ai-toolkit.config.js',
      './ai-toolkit.config.json',
      './.ai-toolkit.rc',
      path.join(process.cwd(), 'ai-toolkit.config.js'),
      path.join(os.homedir(), '.ai-toolkit', 'config.json')
    ];

    for (const configPath of searchPaths) {
      try {
        if (fs.existsSync(configPath)) {
          const ext = path.extname(configPath);

          if (ext === '.js') {
            return require(path.resolve(configPath));
          } else {
            const content = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(content);
          }
        }
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}:`, error.message);
      }
    }

    return null;
  }

  loadFromEnv() {
    const config = {};

    // API Keys
    if (process.env.OPENAI_API_KEY) {
      config.engines = config.engines || {};
      config.engines.openai = process.env.OPENAI_API_KEY;
    }

    if (process.env.ANTHROPIC_API_KEY) {
      config.engines = config.engines || {};
      config.engines.anthropic = process.env.ANTHROPIC_API_KEY;
    }

    // AI Toolkit Token (for telemetry/premium)
    if (process.env.AI_TOOLKIT_TOKEN) {
      config.token = process.env.AI_TOOLKIT_TOKEN;
    }

    if (process.env.AI_TOOLKIT_KEY) {
      config.telemetryKey = process.env.AI_TOOLKIT_KEY;
    }

    // Settings
    if (process.env.AI_DEFAULT_ENGINE) {
      config.defaultEngine = process.env.AI_DEFAULT_ENGINE;
    }

    if (process.env.AI_MODEL_OPENAI) {
      config.models = config.models || {};
      config.models.openai = process.env.AI_MODEL_OPENAI;
    }

    if (process.env.AI_MODEL_ANTHROPIC) {
      config.models = config.models || {};
      config.models.anthropic = process.env.AI_MODEL_ANTHROPIC;
    }

    if (process.env.AI_TELEMETRY === 'false') {
      config.telemetry = false;
    }

    if (process.env.AI_VALIDATE_OUTPUTS === 'true') {
      config.validateOutputs = true;
    }

    if (process.env.AI_DEBUG === 'true') {
      config.debug = true;
    }

    return config;
  }

  processConfig(config) {
    // If token is present, it can be used instead of individual API keys
    if (config.token && !config.engines.openai && !config.engines.anthropic) {
      // Using AI Toolkit token for API access
      // Token will be used for cloud mode
      config.cloudMode = true;
    }

    // Check if at least one engine is configured
    if (!config.token && !config.engines.openai && !config.engines.anthropic) {
      console.warn(`
⚠️  No AI engines configured!

To get started, you need either:

1. API Keys (for local mode):
   export OPENAI_API_KEY=sk-...
   export ANTHROPIC_API_KEY=sk-ant-...

2. AI Toolkit Token (for cloud mode - no API keys needed):
   export AI_TOOLKIT_TOKEN=aitk_...

   Get your free token at: https://aitoolkit.test

Or pass them directly:
   new AIToolkit({ engines: { openai: 'sk-...' } })
   new AIToolkit({ token: 'aitk_...' })
      `);
    }

    return config;
  }
}

module.exports = { ConfigLoader };
