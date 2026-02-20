/**
 * Telemetry Client for AI Toolkit
 * Sends anonymous usage data for analytics (when token is present)
 */

const https = require('https');
const crypto = require('crypto');

class TelemetryClient {
  constructor(options = {}) {
    this.token = options.token;
    this.endpoint = options.endpoint || 'https://telemetry.aitoolkit.test';
    this.enabled = options.enabled !== false && !!this.token;
    this.sessionId = this.generateSessionId();
    this.queue = [];
    this.flushInterval = null;

    this.premium = false;

    if (this.enabled) {
      // Flush every 10 seconds
      this.flushInterval = setInterval(() => this.flush(), 10000);

      // Flush on exit
      process.on('beforeExit', () => this.flush());
    }
  }

  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  isPremium() {
    return this.premium;
  }

  track(event, data = {}) {
    if (!this.enabled) {return;}

    const safeData = {
      event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      token: this.token,
      data: this.sanitizeData(data)
    };

    this.queue.push(safeData);

    // Flush if queue is large
    if (this.queue.length >= 50) {
      this.flush();
    }
  }

  sanitizeData(data) {
    const safe = { ...data };

    delete safe.input;
    delete safe.output;
    delete safe.content;
    delete safe.subject;
    delete safe.context;
    delete safe.result;

    const allowed = [
      'duration',
      'success',
      'error',
      'confidence',
      'score',
      'operation',
      'engine',
      'schemaSize',
      'actionCount',
      'chosenAction',
      'inputLength',
      'outputLength'
    ];

    const sanitized = {};
    for (const key of allowed) {
      if (safe[key] !== undefined) {
        sanitized[key] = safe[key];
      }
    }

    return sanitized;
  }

  async flush() {
    if (!this.enabled || this.queue.length === 0) {return;}

    const events = [...this.queue];
    this.queue = [];

    try {
      await this.send(events);
    } catch (error) {
      if (process.env.AI_DEBUG === 'true') {
        console.error('Telemetry error:', error.message);
      }
      this.queue.unshift(...events);
    }
  }

  send(events) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({ events });

      const url = new URL(this.endpoint);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: '/api/telemetry',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'Authorization': `Bearer ${this.token}`
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const response = JSON.parse(body);
              if (response.tier) {
                this.premium = response.tier !== 'free';
              }
              if (response.rateLimit) {
                this.rateLimit = response.rateLimit;
              }
            } catch {}
            resolve(body);
          } else if (res.statusCode === 429) {
            reject(new Error('Rate limit exceeded'));
          } else {
            reject(new Error(`Telemetry failed: ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

module.exports = { TelemetryClient };
