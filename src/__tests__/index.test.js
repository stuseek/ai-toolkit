const AIToolkit = require('../index');

describe('AIToolkit Core Operations', () => {
  let ai;
  let mockMakeRequest;

  beforeEach(() => {
    ai = new AIToolkit({
      engines: { openai: 'test-key' },
      debug: false
    });

    // Mock the makeAIRequest method
    mockMakeRequest = jest.fn();
    ai.makeAIRequest = mockMakeRequest;
  });

  describe('Constructor', () => {
    test('should create instance with config', () => {
      expect(ai).toBeInstanceOf(AIToolkit);
      expect(ai.engines.openai).toBe('test-key');
    });

    test('should apply preset configurations', () => {
      const securityAI = new AIToolkit({
        preset: 'security',
        engines: { openai: 'test-key' }
      });
      expect(securityAI.config.temperature).toBe(0.2);
      expect(securityAI.config.validateOutputs).toBe(true);
    });

    test('should merge custom config with defaults', () => {
      const customAI = new AIToolkit({
        engines: { openai: 'test-key' },
        maxTokens: 500,
        temperature: 0.5
      });
      expect(customAI.config.maxTokens).toBe(500);
      expect(customAI.config.temperature).toBe(0.5);
    });
  });

  describe('Extract Operation', () => {
    test('should extract structured data successfully', async () => {
      const mockResponse = JSON.stringify({
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      });
      mockMakeRequest.mockResolvedValue(mockResponse);

      const result = await ai.extract(
        'John Doe is 30 years old, email: john@example.com',
        { name: 'string', age: 'number', email: 'string' }
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual({
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      });
      expect(result).toHaveProperty('confidence');
      expect(typeof result.confidence).toBe('number');
    });

    test('should handle extraction with custom instructions', async () => {
      const mockResponse = JSON.stringify({
        sentiment: 'positive',
        score: 0.85
      });
      mockMakeRequest.mockResolvedValue(mockResponse);

      const result = await ai.extract(
        'This product is amazing!',
        { sentiment: 'string', score: 'number' },
        { instructions: 'Extract sentiment and confidence score' }
      );

      expect(result.success).toBe(true);
      expect(result.data.sentiment).toBe('positive');
      expect(result.data.score).toBe(0.85);
    });

    test('should handle extraction errors gracefully', async () => {
      mockMakeRequest.mockRejectedValue(new Error('API Error'));

      const result = await ai.extract(
        'test data',
        { field: 'string' }
      );

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('API Error');
    });
  });

  describe('Validate Operation', () => {
    test('should validate data successfully', async () => {
      const mockResponse = JSON.stringify({
        valid: true,
        score: 0.9,
        reasoning: 'All criteria met',
        confidence: 0.95,
        recommendation: 'pass'
      });
      mockMakeRequest.mockResolvedValue(mockResponse);

      const result = await ai.validate(
        { email: 'test@example.com' },
        { rule: 'Must be a valid email' }
      );

      expect(result).toHaveProperty('valid', true);
      expect(result).toHaveProperty('score', 0.9);
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('recommendation', 'pass');
    });

    test('should validate with multiple rules', async () => {
      const mockResponse = JSON.stringify({
        valid: false,
        score: 0.3,
        reasoning: 'Password too weak',
        confidence: 0.9,
        recommendation: 'reject',
        issues: ['Too short', 'No special characters']
      });
      mockMakeRequest.mockResolvedValue(mockResponse);

      const result = await ai.validate(
        { password: '12345' },
        {
          rules: [
            'Minimum 8 characters',
            'Must contain special characters',
            'Must contain numbers and letters'
          ]
        }
      );

      expect(result.valid).toBe(false);
      expect(result.score).toBeLessThan(0.5);
      expect(result.issues).toContain('Too short');
    });

    test('should handle validation errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('Validation failed'));

      const result = await ai.validate(
        { data: 'test' },
        { rule: 'test rule' }
      );

      expect(result.valid).toBe(false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('Summarize Operation', () => {
    test('should summarize text successfully', async () => {
      const mockResponse = 'This is a concise summary of the input text.';
      mockMakeRequest.mockResolvedValue(mockResponse);

      const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10);
      const result = await ai.summarize(longText);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('summary');
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result).toHaveProperty('metadata');
    });

    test('should summarize with custom options', async () => {
      const mockResponse = '• Point 1\\n• Point 2\\n• Point 3';
      mockMakeRequest.mockResolvedValue(mockResponse);

      const result = await ai.summarize(
        'Long document text here...',
        {
          style: 'bullet-points',
          maxLength: 100
        }
      );

      expect(result.success).toBe(true);
      expect(result.summary).toContain('•');
    });

    test('should handle array of texts', async () => {
      const mockResponse = 'Combined summary of multiple documents.';
      mockMakeRequest.mockResolvedValue(mockResponse);

      const texts = [
        'First document content',
        'Second document content',
        'Third document content'
      ];
      const result = await ai.summarize(texts);

      expect(result.success).toBe(true);
      expect(result.summary).toBeTruthy();
      expect(result.metadata.inputType).toBe('multiple');
    });

    test('should handle summarization errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('Summarization failed'));

      const result = await ai.summarize('test text');

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('Decide Operation', () => {
    test('should make decision successfully', async () => {
      const mockResponse = JSON.stringify({
        decision: 'approve',
        reasoning: 'All criteria satisfied',
        confidence: 0.85,
        alternatives: ['conditional_approve', 'reject']
      });
      mockMakeRequest.mockResolvedValue(mockResponse);

      const result = await ai.decide(
        { score: 85, history: 'good' },
        ['approve', 'reject', 'conditional_approve']
      );

      expect(result).toHaveProperty('decision', 'approve');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('confidence', 0.85);
      expect(result).toHaveProperty('alternatives');
      expect(Array.isArray(result.alternatives)).toBe(true);
    });

    test('should make decision with criteria', async () => {
      const mockResponse = JSON.stringify({
        decision: 'escalate',
        reasoning: 'High risk detected',
        confidence: 0.9,
        riskScore: 0.8
      });
      mockMakeRequest.mockResolvedValue(mockResponse);

      const result = await ai.decide(
        {
          transaction: { amount: 10000, country: 'high-risk' }
        },
        ['approve', 'review', 'escalate', 'block'],
        {
          criteria: {
            riskThreshold: 0.7,
            requiresReview: true
          }
        }
      );

      expect(result.decision).toBe('escalate');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('should handle binary decisions', async () => {
      const mockResponse = JSON.stringify({
        decision: true,
        reasoning: 'Conditions met',
        confidence: 0.95
      });
      mockMakeRequest.mockResolvedValue(mockResponse);

      const result = await ai.decide(
        { value: 42 },
        [true, false]
      );

      expect(result.decision).toBe(true);
      expect(typeof result.decision).toBe('boolean');
    });

    test('should handle decision errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('Decision failed'));

      const result = await ai.decide(
        { data: 'test' },
        ['option1', 'option2']
      );

      expect(result).toHaveProperty('decision', null);
      expect(result).toHaveProperty('error');
      expect(result.confidence).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing engine configuration', () => {
      expect(() => {
        new AIToolkit({});
      }).toThrow();
    });

    test('should handle invalid schema in extract', async () => {
      const result = await ai.extract('test', null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid schema');
    });

    test('should handle invalid options in validate', async () => {
      const result = await ai.validate(null, null);
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test('should handle empty input in summarize', async () => {
      const result = await ai.summarize('');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty input');
    });

    test('should handle empty options in decide', async () => {
      const result = await ai.decide({}, []);
      expect(result.decision).toBe(null);
      expect(result.error).toContain('No options provided');
    });
  });

  describe('Integration Scenarios', () => {
    test('should chain operations successfully', async () => {
      // Extract -> Validate -> Decide flow
      const extractMock = JSON.stringify({
        email: 'test@example.com',
        age: 25
      });
      const validateMock = JSON.stringify({
        valid: true,
        score: 0.9,
        confidence: 0.95,
        recommendation: 'pass'
      });
      const decideMock = JSON.stringify({
        decision: 'approve',
        confidence: 0.85
      });

      mockMakeRequest
        .mockResolvedValueOnce(extractMock)
        .mockResolvedValueOnce(validateMock)
        .mockResolvedValueOnce(decideMock);

      // Extract
      const extracted = await ai.extract(
        'Email: test@example.com, Age: 25',
        { email: 'string', age: 'number' }
      );
      expect(extracted.success).toBe(true);

      // Validate
      const validated = await ai.validate(
        extracted.data,
        { rules: ['Valid email', 'Age > 18'] }
      );
      expect(validated.valid).toBe(true);

      // Decide
      const decision = await ai.decide(
        { extraction: extracted.data, validation: validated },
        ['approve', 'reject', 'review']
      );
      expect(decision.decision).toBe('approve');
    });

    test('should handle parallel operations', async () => {
      mockMakeRequest.mockResolvedValue(JSON.stringify({ result: 'success' }));

      const promises = [
        ai.extract('test1', { field: 'string' }),
        ai.extract('test2', { field: 'string' }),
        ai.extract('test3', { field: 'string' })
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('success');
      });
    });
  });
});

describe('AIToolkit Advanced Features', () => {
  let ai;

  beforeEach(() => {
    ai = new AIToolkit({
      engines: { openai: 'test-key' },
      cache: true,
      retryAttempts: 3,
      timeout: 5000
    });
  });

  test('should support custom temperature per operation', async () => {
    ai.makeAIRequest = jest.fn().mockResolvedValue('result');

    await ai.summarize('text', { temperature: 0.3 });

    expect(ai.makeAIRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ temperature: 0.3 })
    );
  });

  test('should support custom model per operation', async () => {
    ai.makeAIRequest = jest.fn().mockResolvedValue('result');

    await ai.extract('text', { field: 'string' }, { model: 'gpt-4' });

    expect(ai.makeAIRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ model: 'gpt-4' })
    );
  });
});