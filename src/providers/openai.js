const AIProvider = require('./base');

/**
 * OpenAI Provider Implementation
 */
class OpenAIProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.model = config.model || 'gpt-4o';
    this.timeout = config.timeout || 30000; // 30 second default timeout
    this.supportsStreaming = true;
    this.supportsEmbeddings = true;
    this.supportsFunctionCalling = true;

    this.validateConfig();
  }

  validateConfig() {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass apiKey in config');
    }
  }

  async generate(prompt, options = {}) {
    return this.withRetry(async () => {
      const response = await this.makeRequest('/chat/completions', {
        model: options.model || this.model,
        messages: this.formatPrompt(prompt, options.systemPrompt),
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        seed: options.seed,
        response_format: options.responseFormat ? { type: options.responseFormat } : undefined,
        tools: options.tools,
        tool_choice: options.toolChoice
      });

      return response.choices[0].message.content;
    });
  }

  async generateStructured(prompt, schema, options = {}) {
    const structuredPrompt = `${prompt}\n\nRespond with valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`;

    const response = await this.generate(structuredPrompt, {
      ...options,
      responseFormat: 'json_object'
    });

    try {
      return JSON.parse(response);
    } catch (error) {
      throw new Error(`Failed to parse structured output from OpenAI: ${error.message}`);
    }
  }

  async embed(inputs) {
    return this.withRetry(async () => {
      const response = await this.makeRequest('/embeddings', {
        model: 'text-embedding-3-small', // Latest embedding model
        input: inputs
      });

      return response.data.map(item => item.embedding);
    });
  }

  async* stream(prompt, options = {}) {
    const response = await this.makeStreamRequest('/chat/completions', {
      model: options.model || this.model,
      messages: this.formatPrompt(prompt, options.systemPrompt),
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
      seed: options.seed,
      tools: options.tools,
      tool_choice: options.toolChoice,
      stream: true
    });

    for await (const chunk of response) {
      const lines = chunk.toString().split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {return;}

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {yield content;}
          } catch (_e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  formatPrompt(prompt, systemPrompt) {
    const messages = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    if (typeof prompt === 'string') {
      messages.push({ role: 'user', content: prompt });
    } else if (Array.isArray(prompt)) {
      messages.push(...prompt);
    } else {
      messages.push(prompt);
    }

    return messages;
  }

  async makeRequest(endpoint, body) {
    const https = require('https');
    const url = new URL(this.baseURL + endpoint);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      }, this.timeout);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      };

      const req = https.request(options, (res) => {
        clearTimeout(timeoutId);
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const json = JSON.parse(data);

            if (res.statusCode >= 400) {
              const error = new Error(json.error?.message || 'OpenAI API error');
              error.status = res.statusCode;
              error.response = json;
              reject(error);
            } else {
              resolve(json);
            }
          } catch (e) {
            reject(new Error(`Failed to parse OpenAI response: ${e.message}`));
          }
        });

        res.on('error', (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
      });

      req.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });

      req.write(JSON.stringify(body));
      req.end();
    });
  }

  async makeStreamRequest(endpoint, body) {
    const https = require('https');
    const url = new URL(this.baseURL + endpoint);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        req.destroy();
        reject(new Error(`Stream request timeout after ${this.timeout}ms`));
      }, this.timeout);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'text/event-stream'
        }
      };

      const req = https.request(options, (res) => {
        clearTimeout(timeoutId);

        if (res.statusCode >= 400) {
          let errorData = '';
          res.on('data', chunk => errorData += chunk);
          res.on('end', () => {
            reject(new Error(`OpenAI API error: ${errorData}`));
          });
          return;
        }

        res.on('error', (err) => {
          reject(err);
        });

        resolve(res);
      });

      req.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });

      req.write(JSON.stringify(body));
      req.end();
    });
  }

  getAvailableModels() {
    return [
      'gpt-4o', // Latest and most capable
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4',
      'gpt-4-32k',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'o1-preview', // Reasoning model
      'o1-mini' // Faster reasoning model
    ];
  }

  countTokens(text) {
    // More accurate token counting for OpenAI models
    // This is still an approximation - for exact counts use tiktoken
    const words = text.split(/\s+/).length;
    const chars = text.length;

    // GPT models use roughly 1 token per 4 chars or 0.75 words
    return Math.ceil(Math.max(chars / 4, words * 1.3));
  }
}

module.exports = OpenAIProvider;