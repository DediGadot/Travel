import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DataProcessor } from '../../src/etl/processors/data_processor';

// Mock geopy and openai
jest.mock('geopy', () => ({
  Nominatim: jest.fn(() => ({
    geocode: jest.fn()
  }))
}));

jest.mock('openai');

describe('DataProcessor', () => {
  let processor: DataProcessor;

  beforeEach(() => {
    processor = new DataProcessor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('_validateItem', () => {
    it('should validate items with required fields', () => {
      const validItem = {
        title: 'Test Hotel',
        source_type: 'api',
        description: 'A nice hotel'
      };

      const result = processor._validateItem(validItem);
      expect(result).toBe(true);
    });

    it('should reject items missing title', () => {
      const invalidItem = {
        source_type: 'api',
        description: 'Missing title'
      };

      const result = processor._validateItem(invalidItem);
      expect(result).toBe(false);
    });

    it('should reject items with short titles', () => {
      const invalidItem = {
        title: 'ab', // Too short
        source_type: 'api'
      };

      const result = processor._validateItem(invalidItem);
      expect(result).toBe(false);
    });

    it('should reject items missing source_type', () => {
      const invalidItem = {
        title: 'Test Hotel',
        description: 'Missing source type'
      };

      const result = processor._validateItem(invalidItem);
      expect(result).toBe(false);
    });
  });

  describe('_cleanText', () => {
    it('should clean text properly', () => {
      const dirtyText = '  <p>Hello   world!</p>  \n\n  ';
      const result = processor._cleanText(dirtyText);
      
      expect(result).toBe('Hello world!');
    });

    it('should handle HTML tags', () => {
      const htmlText = '<div><span>Clean <strong>text</strong></span></div>';
      const result = processor._cleanText(htmlText);
      
      expect(result).toBe('Clean text');
    });

    it('should handle non-string input', () => {
      const result = processor._cleanText(null);
      expect(result).toBe('');
      
      const numberResult = processor._cleanText(123);
      expect(numberResult).toBe('123');
    });
  });

  describe('_standardizeCategories', () => {
    it('should standardize category names', () => {
      const categories = ['lodging', 'dining', 'sightseeing'];
      const result = processor._standardizeCategories(categories);
      
      expect(result).toEqual(['hotel', 'restaurant', 'attraction']);
    });

    it('should remove duplicates', () => {
      const categories = ['hotel', 'lodging', 'accommodation'];
      const result = processor._standardizeCategories(categories);
      
      expect(result).toEqual(['hotel']);
    });

    it('should handle empty array', () => {
      const result = processor._standardizeCategories([]);
      expect(result).toEqual([]);
    });

    it('should handle non-array input', () => {
      const result = processor._standardizeCategories('not-an-array');
      expect(result).toEqual([]);
    });
  });

  describe('_cleanRating', () => {
    it('should clean numeric ratings', () => {
      expect(processor._cleanRating(4.5)).toBe(4.5);
      expect(processor._cleanRating(3)).toBe(3.0);
    });

    it('should clean string ratings', () => {
      expect(processor._cleanRating('4.5 stars')).toBe(4.5);
      expect(processor._cleanRating('Rating: 3.8')).toBe(3.8);
    });

    it('should normalize ratings to 0-5 scale', () => {
      expect(processor._cleanRating(80)).toBe(4.0); // 80/100 -> 4/5
      expect(processor._cleanRating(9)).toBe(4.5); // 9/10 -> 4.5/5
    });

    it('should handle invalid ratings', () => {
      expect(processor._cleanRating('invalid')).toBeNull();
      expect(processor._cleanRating(null)).toBeNull();
      expect(processor._cleanRating(undefined)).toBeNull();
    });

    it('should clamp ratings to valid range', () => {
      expect(processor._cleanRating(-1)).toBe(0);
      expect(processor._cleanRating(6)).toBe(5);
    });
  });

  describe('_standardizePriceRange', () => {
    it('should standardize price keywords', () => {
      expect(processor._standardizePriceRange('budget')).toBe('$');
      expect(processor._standardizePriceRange('luxury')).toBe('$$$');
      expect(processor._standardizePriceRange('expensive')).toBe('$$$');
    });

    it('should handle dollar symbols', () => {
      expect(processor._standardizePriceRange('$')).toBe('$');
      expect(processor._standardizePriceRange('$$')).toBe('$$');
      expect(processor._standardizePriceRange('$$$$')).toBe('$$$'); // Max 3 dollars
    });

    it('should default to moderate for unknown input', () => {
      expect(processor._standardizePriceRange('unknown')).toBe('$$');
      expect(processor._standardizePriceRange('')).toBe('$$');
    });

    it('should handle non-string input', () => {
      expect(processor._standardizePriceRange(123)).toBe('$$');
      expect(processor._standardizePriceRange(null)).toBe('$$');
    });
  });

  describe('_createProcessedText', () => {
    it('should combine relevant fields', () => {
      const item = {
        title: 'Great Hotel',
        description: 'Beautiful location',
        categories: ['hotel', 'luxury'],
        address: '123 Main St, Paris',
        destination: 'Paris'
      };

      const result = processor._createProcessedText(item);
      
      expect(result).toContain('Great Hotel');
      expect(result).toContain('Beautiful location');
      expect(result).toContain('hotel luxury');
      expect(result).toContain('123 Main St, Paris');
      expect(result).toContain('Paris');
    });

    it('should handle missing fields', () => {
      const item = {
        title: 'Hotel Only'
      };

      const result = processor._createProcessedText(item);
      expect(result).toBe('Hotel Only');
    });

    it('should handle array fields', () => {
      const item = {
        title: 'Hotel',
        amenities: ['WiFi', 'Pool', 'Gym']
      };

      const result = processor._createProcessedText(item);
      expect(result).toContain('WiFi Pool Gym');
    });
  });

  describe('_detectLanguage', () => {
    it('should detect English text', () => {
      const result = processor._detectLanguage('This is English text');
      expect(result).toBe('en');
    });

    it('should detect Hebrew text', () => {
      const hebrewText = 'זהו טקסט בעברית';
      const result = processor._detectLanguage(hebrewText);
      expect(result).toBe('he');
    });

    it('should handle mixed text', () => {
      const mixedText = 'Hello שלום World';
      const result = processor._detectLanguage(mixedText);
      // Should detect as Hebrew if >30% Hebrew characters
      expect(result).toBe('en'); // Not enough Hebrew in this case
    });

    it('should default to English for empty text', () => {
      const result = processor._detectLanguage('');
      expect(result).toBe('en');
    });

    it('should handle heavily Hebrew text', () => {
      const heavyHebrew = 'שלום עולם זהו טקסט ארוך בעברית עם הרבה מילים';
      const result = processor._detectLanguage(heavyHebrew);
      expect(result).toBe('he');
    });
  });

  describe('processItem', () => {
    it('should process a valid item completely', async () => {
      const rawItem = {
        title: '  <b>Great Hotel</b>  ',
        source_type: 'api',
        description: 'A wonderful place to stay',
        categories: ['lodging', 'dining'],
        rating: '4.5 stars',
        price_range: 'luxury',
        address: '123 Main St'
      };

      const result = await processor.processItem(rawItem);

      expect(result).toBeDefined();
      expect(result.title).toBe('Great Hotel');
      expect(result.categories).toEqual(['hotel', 'restaurant']);
      expect(result.rating).toBe(4.5);
      expect(result.price_range).toBe('$$$');
      expect(result.processed_text).toContain('Great Hotel');
      expect(result.processed_at).toBeDefined();
      expect(result.language).toBe('en');
    });

    it('should return null for invalid items', async () => {
      const invalidItem = {
        description: 'Missing title and source_type'
      };

      const result = await processor.processItem(invalidItem);
      expect(result).toBeNull();
    });

    it('should handle processing errors gracefully', async () => {
      const problematicItem = {
        title: 'Test',
        source_type: 'api'
      };

      // Mock an error in enrichment
      jest.spyOn(processor, '_enrichItem').mockRejectedValue(new Error('Enrichment failed'));

      const result = await processor.processItem(problematicItem);
      expect(result).toBeNull();
    });
  });
});