const AIProvider = require('./base');

/**
 * Anthropic (Claude) Provider Implementation
 *
 * Note: Claude Sonnet 4 support will be added when it becomes publicly available
 * Current latest stable model: claude-3-5-sonnet-20241022
 */
class AnthropicProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
    this.model = config.model || 'claude-sonnet-4-5-20250929';
    this.timeout = config.timeout || 30000; // 30 second default timeout
    this.supportsStreaming = true;
    this.supportsEmbeddings = false;
    this.supportsFunctionCalling = true; // Tool use supported

    this.validateConfig();
  }

  validateConfig() {
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or pass apiKey in config');
    }
  }

  async generate(prompt, options = {}) {
    return this.withRetry(async () => {
      const response = await this.makeRequest('/messages', {
        model: options.model || this.model,
        messages: this.formatPrompt(prompt),
        system: options.systemPrompt,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        top_k: options.topK,
        tools: options.tools,
        tool_choice: options.toolChoice,
        metadata: options.metadata
      });

      return response.content[0].text;
    });
  }

  async generateStructured(prompt, schema, options = {}) {
    const structuredPrompt = `${prompt}

Please respond with valid JSON matching this schema:
${JSON.stringify(schema, null, 2)}

Important: Respond ONLY with the JSON object, no additional text or markdown.`;

    const response = await this.generate(structuredPrompt, {
      ...options,
      systemPrompt: options.systemPrompt || 'You are a helpful assistant that always responds with valid JSON.'
    });

    // Extract JSON from response (Claude might wrap it in markdown)
    let jsonStr = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    try {
      return JSON.parse(jsonStr.trim());
    } catch (error) {
      throw new Error(`Failed to parse structured output from Anthropic: ${error.message}`);
    }
  }

  async* stream(prompt, options = {}) {
    const response = await this.makeStreamRequest('/messages', {
      model: options.model || this.model,
      messages: this.formatPrompt(prompt),
      system: options.systemPrompt,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      tools: options.tools,
      tool_choice: options.toolChoice,
      stream: true
    });

    for await (const chunk of response) {
      const lines = chunk.toString().split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'content_block_delta') {
              const content = parsed.delta?.text;
              if (content) {yield content;}
            } else if (parsed.type === 'message_stop') {
              return;
            }
          } catch (_e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  formatPrompt(prompt) {
    if (typeof prompt === 'string') {
      return [{ role: 'user', content: prompt }];
    } else if (Array.isArray(prompt)) {
      // Convert from OpenAI format if needed
      return prompt.map(msg => {
        if (msg.role === 'system') {
          // System messages are handled separately in Anthropic
          return null;
        }
        return {
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        };
      }).filter(Boolean);
    }
    return [prompt];
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
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
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
              const error = new Error(json.error?.message || json.message || 'Anthropic API error');
              error.status = res.statusCode;
              error.response = json;
              reject(error);
            } else {
              resolve(json);
            }
          } catch (e) {
            reject(new Error(`Failed to parse Anthropic response: ${e.message}`));
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
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Accept': 'text/event-stream'
        }
      };

      const req = https.request(options, (res) => {
        clearTimeout(timeoutId);

        if (res.statusCode >= 400) {
          let errorData = '';
          res.on('data', chunk => errorData += chunk);
          res.on('end', () => {
            reject(new Error(`Anthropic API error: ${errorData}`));
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
      'claude-3-5-sonnet-20241022', // Latest stable
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
    ];
  }

  countTokens(text) {
    // Approximation for Claude models
    // Claude uses a similar tokenization to GPT models
    const words = text.split(/\s+/).length;
    const chars = text.length;

    // Rough estimate: 1 token per 3.5 chars or 0.8 words
    return Math.ceil(Math.max(chars / 3.5, words * 1.25));
  }
}

module.exports = AnthropicProvider;