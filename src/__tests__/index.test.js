const AIToolkit = require('../index');

describe('AIToolkit Core', () => {
  let ai;

  beforeEach(() => {
    ai = new AIToolkit({
      engines: { openai: 'test-key' }
    });
  });

  describe('Constructor', () => {
    test('should create instance with config', () => {
      expect(ai).toBeInstanceOf(AIToolkit);
      expect(ai.engines.openai).toBe('test-key');
    });

    test('should apply preset', () => {
      const securityAI = new AIToolkit({
        preset: 'security',
        engines: { openai: 'test-key' }
      });
      expect(securityAI.config.temperature).toBe(0.2);
      expect(securityAI.config.validateOutputs).toBe(true);
    });
  });

  describe('Extract', () => {
    test('should return proper structure', async () => {
      const mockResponse = JSON.stringify({ name: 'John', age: 30 });
      ai.makeAIRequest = jest.fn().mockResolvedValue(mockResponse);

      const result = await ai.extract('test data', { name: 'string', age: 'number' });
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('Validate', () => {
    test('should return validation structure', async () => {
      const mockResponse = JSON.stringify({ 
        score: 0.8, 
        reasoning: 'Valid', 
        confidence: 0.9,
        recommendation: 'pass'
      });
      ai.makeAIRequest = jest.fn().mockResolvedValue(mockResponse);

      const result = await ai.validate('criteria', 'subject');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('recommendation');
    });
  });

  describe('Summarize', () => {
    test('should return summary structure', async () => {
      const mockResponse = JSON.stringify({ 
        summary: 'Brief summary',
        keyPoints: ['point1', 'point2'],
        confidence: 0.85
      });
      ai.makeAIRequest = jest.fn().mockResolvedValue(mockResponse);

      const result = await ai.summarize('long content');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('keyPoints');
      expect(Array.isArray(result.keyPoints)).toBe(true);
    });
  });

  describe('Decide', () => {
    test('should return decision structure', async () => {
      const mockResponse = JSON.stringify({ 
        action: 'escalate',
        reasoning: 'High priority',
        confidence: 0.95,
        parameters: {}
      });
      ai.makeAIRequest = jest.fn().mockResolvedValue(mockResponse);

      const result = await ai.decide('context', ['escalate', 'ignore']);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('parameters');
    });
  });

  describe('Method Chaining', () => {
    test('should store last result', async () => {
      const testData = { data: 'test', confidence: 0.9 };
      ai.lastResult = testData;
      
      expect(ai.lastResult).toEqual(testData);
    });
  });

  describe('Pipeline', () => {
    test('should create pipeline function', () => {
      const pipeline = ai.pipeline(
        async (input) => ({ ...input, step1: true }),
        async (input) => ({ ...input, step2: true })
      );
      
      expect(typeof pipeline).toBe('function');
    });
  });

  describe('Error Handling', () => {
    test('should handle extraction errors gracefully', async () => {
      ai.makeAIRequest = jest.fn().mockRejectedValue(new Error('API Error'));

      const result = await ai.extract('data', { schema: 'test' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
      expect(result.data).toBeNull();
    });

    test('should handle validation errors gracefully', async () => {
      ai.makeAIRequest = jest.fn().mockRejectedValue(new Error('API Error'));

      const result = await ai.validate('criteria', 'subject');
      
      expect(result.success).toBe(false);
      expect(result.score).toBe(0);
    });
  });
});