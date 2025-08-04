import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server/index';
import { createServerClient } from '../../src/lib/supabase';

// Mock Supabase
jest.mock('../../src/lib/supabase');
const mockSupabase = createServerClient as jest.MockedFunction<typeof createServerClient>;

// Mock OpenAI service
jest.mock('../../src/server/services/openai');

describe('/api/chat', () => {
  let mockSupabaseClient: any;
  let authToken: string;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({ data: { id: '123', content: 'test' }, error: null }))
          }))
        })),
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({ data: [], error: null }))
              }))
            }))
          }))
        }))
      }))
    };

    mockSupabase.mockReturnValue(mockSupabaseClient);
    authToken = 'mock-jwt-token';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/chat/message', () => {
    it('should send a message successfully', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      });

      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Plan a trip to Tokyo',
          context: { destination: 'Tokyo', budget: 2000 }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userMessage');
      expect(response.body).toHaveProperty('assistantMessage');
    });

    it('should reject empty messages', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      });

      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: ''
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Test message'
        });

      expect(response.status).toBe(401);
    });

    it('should handle invalid trip ID', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      });

      const response = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test message',
          tripId: 'invalid-uuid'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/chat/history', () => {
    it('should retrieve conversation history', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      });

      const mockMessages = [
        { id: '1', role: 'user', content: 'Hello', created_at: '2024-01-01T00:00:00Z' },
        { id: '2', role: 'assistant', content: 'Hi there!', created_at: '2024-01-01T00:00:01Z' }
      ];

      mockSupabaseClient.from().select().eq().eq().order().limit.mockResolvedValue({
        data: mockMessages,
        error: null
      });

      const response = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.messages).toEqual(mockMessages);
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      });

      mockSupabaseClient.from().select().eq().eq().order().limit.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const response = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/chat/itinerary', () => {
    it('should generate an itinerary', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      });

      const response = await request(app)
        .post('/api/chat/itinerary')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          destination: 'Paris',
          duration: 5,
          budget: 3000,
          travelers: 2,
          language: 'en'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('itinerary');
    });

    it('should require destination and duration', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      });

      const response = await request(app)
        .post('/api/chat/itinerary')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          budget: 3000
        });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/chat/history', () => {
    it('should clear conversation history', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      });

      mockSupabaseClient.from().delete = jest.fn(() => ({
        eq: jest.fn(() => ({
          is: jest.fn(() => ({ error: null }))
        }))
      }));

      const response = await request(app)
        .delete('/api/chat/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Conversation history cleared');
    });
  });
});