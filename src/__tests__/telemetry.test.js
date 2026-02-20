const { TelemetryClient } = require('../telemetry');

describe('TelemetryClient', () => {
  let client;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (client) {
      client.destroy();
    }
  });

  describe('Constructor', () => {
    test('should initialize with token', () => {
      client = new TelemetryClient({
        token: 'test-token',
        endpoint: 'https://test.endpoint'
      });

      expect(client.token).toBe('test-token');
      expect(client.endpoint).toBe('https://test.endpoint');
      expect(client.enabled).toBe(true);
    });

    test('should be disabled without token', () => {
      client = new TelemetryClient({});

      expect(client.enabled).toBe(false);
    });

    test('should generate session ID', () => {
      client = new TelemetryClient({ token: 'test' });

      expect(client.sessionId).toBeDefined();
      expect(typeof client.sessionId).toBe('string');
      expect(client.sessionId.length).toBe(32);
    });
  });

  describe('track', () => {
    test('should add events to queue when enabled', () => {
      client = new TelemetryClient({ token: 'test' });

      client.track('test_event', { data: 'value' });

      expect(client.queue.length).toBe(1);
      expect(client.queue[0].event).toBe('test_event');
    });

    test('should not track when disabled', () => {
      client = new TelemetryClient({ enabled: false });

      client.track('test_event', { data: 'value' });

      expect(client.queue.length).toBe(0);
    });

    test('should flush when queue reaches 50 events', () => {
      client = new TelemetryClient({ token: 'test' });
      client.flush = jest.fn();

      for (let i = 0; i < 50; i++) {
        client.track('event', { index: i });
      }

      expect(client.flush).toHaveBeenCalled();
    });
  });

  describe('sanitizeData', () => {
    test('should remove sensitive fields', () => {
      client = new TelemetryClient({ token: 'test' });

      const sanitized = client.sanitizeData({
        input: 'sensitive',
        output: 'sensitive',
        content: 'sensitive',
        duration: 100,
        success: true
      });

      expect(sanitized.input).toBeUndefined();
      expect(sanitized.output).toBeUndefined();
      expect(sanitized.content).toBeUndefined();
      expect(sanitized.duration).toBe(100);
      expect(sanitized.success).toBe(true);
    });

    test('should only keep allowed fields', () => {
      client = new TelemetryClient({ token: 'test' });

      const sanitized = client.sanitizeData({
        duration: 100,
        success: true,
        randomField: 'should be removed',
        confidence: 0.9
      });

      expect(sanitized.duration).toBe(100);
      expect(sanitized.success).toBe(true);
      expect(sanitized.confidence).toBe(0.9);
      expect(sanitized.randomField).toBeUndefined();
    });
  });

  describe('isPremium', () => {
    test('should return premium status', () => {
      client = new TelemetryClient({ token: 'test' });
      client.premium = true;

      expect(client.isPremium()).toBe(true);
    });
  });

  describe('flush', () => {
    test('should clear queue after flush', async () => {
      client = new TelemetryClient({ token: 'test' });
      client.send = jest.fn().mockResolvedValue('success');

      client.track('event1', {});
      client.track('event2', {});

      await client.flush();

      expect(client.queue.length).toBe(0);
      expect(client.send).toHaveBeenCalled();
    });

    test('should restore queue on error', async () => {
      client = new TelemetryClient({ token: 'test' });
      client.send = jest.fn().mockRejectedValue(new Error('Network error'));

      client.track('event1', {});
      client.track('event2', {});

      await client.flush();

      expect(client.queue.length).toBe(2);
    });
  });

  describe('destroy', () => {
    test('should clear interval and flush', () => {
      client = new TelemetryClient({ token: 'test' });
      client.flush = jest.fn();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      client.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(client.flush).toHaveBeenCalled();
    });
  });
});