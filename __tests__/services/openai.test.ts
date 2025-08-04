import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { OpenAIService } from '../../src/server/services/openai';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

// Mock Supabase
jest.mock('../../src/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    rpc: jest.fn()
  }))
}));

describe('OpenAIService', () => {
  let openaiService: OpenAIService;
  let mockOpenAIInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOpenAIInstance = {
      embeddings: {
        create: jest.fn()
      },
      chat: {
        completions: {
          create: jest.fn()
        }
      },
      moderations: {
        create: jest.fn()
      }
    };

    mockOpenAI.mockImplementation(() => mockOpenAIInstance);
    openaiService = new OpenAIService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embeddings for text', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4];
      mockOpenAIInstance.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }]
      });

      const result = await openaiService.generateEmbedding('test text');

      expect(result).toEqual(mockEmbedding);
      expect(mockOpenAIInstance.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test text'
      });
    });

    it('should handle embedding generation errors', async () => {
      mockOpenAIInstance.embeddings.create.mockRejectedValue(new Error('API Error'));

      await expect(openaiService.generateEmbedding('test')).rejects.toThrow('Failed to generate embedding');
    });
  });

  describe('generateResponse', () => {
    it('should generate AI responses', async () => {
      const mockResponse = 'This is a helpful travel response';
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: mockResponse } }]
      });

      const messages = [
        { role: 'user', content: 'Plan a trip to Tokyo' }
      ];

      const result = await openaiService.generateResponse(messages as any);

      expect(result).toBe(mockResponse);
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo-preview',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: 'Plan a trip to Tokyo' })
          ])
        })
      );
    });

    it('should handle Hebrew language context', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'תשובה בעברית' } }]
      });

      const messages = [
        { role: 'user', content: 'תכנן נסיעה לטוקיו' }
      ];

      const context = { language: 'he' as const };

      const result = await openaiService.generateResponse(messages as any, context);

      expect(result).toBe('תשובה בעברית');
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('Hebrew')
            })
          ])
        })
      );
    });

    it('should include retrieved content in context', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response with context' } }]
      });

      const messages = [{ role: 'user', content: 'Tell me about hotels' }];
      const retrievedContent = [
        { title: 'Hotel ABC', description: 'Great hotel in downtown' }
      ];

      await openaiService.generateResponse(messages as any, {}, retrievedContent);

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('Hotel ABC')
            })
          ])
        })
      );
    });
  });

  describe('generateItinerary', () => {
    it('should generate travel itineraries', async () => {
      const mockItinerary = 'Day 1: Arrive in Tokyo, check into hotel...';
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: mockItinerary } }]
      });

      const result = await openaiService.generateItinerary(
        'Tokyo',
        5,
        2000,
        2,
        ['culture', 'food'],
        'en'
      );

      expect(result).toBe(mockItinerary);
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Tokyo')
            })
          ])
        })
      );
    });

    it('should generate Hebrew itineraries', async () => {
      const mockItinerary = 'יום 1: הגעה לטוקיו...';
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: mockItinerary } }]
      });

      const result = await openaiService.generateItinerary(
        'Tokyo',
        3,
        1500,
        1,
        [],
        'he'
      );

      expect(result).toBe(mockItinerary);
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('עברית')
            })
          ])
        })
      );
    });
  });

  describe('extractLocationFromText', () => {
    it('should extract locations from text', async () => {
      const mockLocation = { location: 'Paris, France', confidence: 0.9 };
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockLocation) } }]
      });

      const result = await openaiService.extractLocationFromText('I want to visit Paris');

      expect(result).toEqual(mockLocation);
    });

    it('should handle invalid JSON responses', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'invalid json' } }]
      });

      const result = await openaiService.extractLocationFromText('I want to visit Paris');

      expect(result).toBeNull();
    });
  });

  describe('translateText', () => {
    it('should translate text to target language', async () => {
      const translatedText = 'Bonjour le monde';
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: translatedText } }]
      });

      const result = await openaiService.translateText('Hello world', 'he');

      expect(result).toBe(translatedText);
    });

    it('should return original text on translation error', async () => {
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(new Error('Translation failed'));

      const originalText = 'Hello world';
      const result = await openaiService.translateText(originalText, 'he');

      expect(result).toBe(originalText);
    });
  });

  describe('moderateContent', () => {
    it('should moderate content and return results', async () => {
      const mockModerationResult = {
        results: [{
          flagged: false,
          categories: {
            'hate': false,
            'violence': false,
            'sexual': false
          }
        }]
      };

      mockOpenAIInstance.moderations.create.mockResolvedValue(mockModerationResult);

      const result = await openaiService.moderateContent('This is safe content');

      expect(result).toEqual({
        flagged: false,
        categories: []
      });
    });

    it('should flag inappropriate content', async () => {
      const mockModerationResult = {
        results: [{
          flagged: true,
          categories: {
            'hate': true,
            'violence': false,
            'sexual': false
          }
        }]
      };

      mockOpenAIInstance.moderations.create.mockResolvedValue(mockModerationResult);

      const result = await openaiService.moderateContent('Inappropriate content');

      expect(result).toEqual({
        flagged: true,
        categories: ['hate']
      });
    });

    it('should handle moderation errors gracefully', async () => {
      mockOpenAIInstance.moderations.create.mockRejectedValue(new Error('Moderation failed'));

      const result = await openaiService.moderateContent('test content');

      expect(result).toEqual({
        flagged: false,
        categories: []
      });
    });
  });
});