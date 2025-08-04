import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server/index';
import { createServerClient } from '../../src/lib/supabase';

// Mock Supabase
jest.mock('../../src/lib/supabase');
const mockSupabase = createServerClient as jest.MockedFunction<typeof createServerClient>;

describe('/api/trips', () => {
  let mockSupabaseClient: any;
  let authToken: string;
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(() => ({
          data: { user: { id: mockUserId, email: 'test@example.com' } },
          error: null
        }))
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({ data: [], error: null })),
            single: jest.fn(() => ({ data: null, error: null }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({ data: { id: 'trip-123' }, error: null }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({ data: { id: 'trip-123' }, error: null }))
              }))
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({ error: null }))
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

  describe('GET /api/trips', () => {
    it('should return user trips', async () => {
      const mockTrips = [
        {
          id: 'trip-1',
          name: 'Tokyo Adventure',
          destination: 'Tokyo',
          user_id: mockUserId,
          itinerary_items: []
        }
      ];

      mockSupabaseClient.from().select().eq().order.mockResolvedValue({
        data: mockTrips,
        error: null
      });

      const response = await request(app)
        .get('/api/trips')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.trips).toEqual(mockTrips);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/trips');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/trips', () => {
    it('should create a new trip', async () => {
      const tripData = {
        name: 'Paris Vacation',
        destination: 'Paris',
        start_date: '2024-06-01',
        end_date: '2024-06-07',
        budget: 3000,
        travelers_count: 2
      };

      const response = await request(app)
        .post('/api/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tripData);

      expect(response.status).toBe(201);
      expect(response.body.trip).toHaveProperty('id');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Invalid: empty name
          destination: 'Paris'
        });

      expect(response.status).toBe(400);
    });

    it('should validate destination is required', async () => {
      const response = await request(app)
        .post('/api/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Trip'
          // Missing destination
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/trips/:tripId', () => {
    it('should return a specific trip', async () => {
      const mockTrip = {
        id: 'trip-123',
        name: 'Tokyo Adventure',
        destination: 'Tokyo',
        user_id: mockUserId,
        itinerary_items: [],
        bookings: []
      };

      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue({
        data: mockTrip,
        error: null
      });

      const response = await request(app)
        .get('/api/trips/trip-123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.trip).toEqual(mockTrip);
    });

    it('should return 404 for non-existent trip', async () => {
      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      const response = await request(app)
        .get('/api/trips/non-existent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/trips/:tripId', () => {
    it('should update a trip', async () => {
      const updateData = {
        name: 'Updated Trip Name',
        budget: 4000
      };

      const response = await request(app)
        .put('/api/trips/trip-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.trip).toHaveProperty('id');
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .put('/api/trips/trip-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          travelers_count: -1 // Invalid: negative travelers
        });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/trips/:tripId', () => {
    it('should delete a trip', async () => {
      const response = await request(app)
        .delete('/api/trips/trip-123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Trip deleted successfully');
    });
  });

  describe('POST /api/trips/:tripId/itinerary', () => {
    it('should add an itinerary item', async () => {
      // Mock trip ownership verification
      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { id: 'trip-123' },
        error: null
      });

      // Mock itinerary item creation
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: { id: 'item-123', title: 'Visit Eiffel Tower' },
        error: null
      });

      const itemData = {
        type: 'activity',
        title: 'Visit Eiffel Tower',
        description: 'Iconic Paris landmark',
        start_time: '2024-06-01T10:00:00Z'
      };

      const response = await request(app)
        .post('/api/trips/trip-123/itinerary')
        .set('Authorization', `Bearer ${authToken}`)
        .send(itemData);

      expect(response.status).toBe(201);
      expect(response.body.item).toHaveProperty('id');
    });

    it('should validate itinerary item data', async () => {
      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'trip-123' },
        error: null
      });

      const response = await request(app)
        .post('/api/trips/trip-123/itinerary')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'invalid-type', // Invalid enum value
          title: 'Test Item'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/trips/:tripId/itinerary', () => {
    it('should return itinerary items for a trip', async () => {
      // Mock trip ownership verification
      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValueOnce({
        data: { id: 'trip-123' },
        error: null
      });

      const mockItems = [
        {
          id: 'item-1',
          title: 'Check into hotel',
          type: 'hotel',
          start_time: '2024-06-01T15:00:00Z'
        }
      ];

      // Mock itinerary items fetch
      mockSupabaseClient.from().select().eq().order.mockResolvedValue({
        data: mockItems,
        error: null
      });

      const response = await request(app)
        .get('/api/trips/trip-123/itinerary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual(mockItems);
    });
  });
});