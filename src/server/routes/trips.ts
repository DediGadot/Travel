import express from 'express';
import { createServerClient } from '../../lib/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const createTripSchema = z.object({
  name: z.string().min(1, 'Trip name is required'),
  description: z.string().optional(),
  destination: z.string().min(1, 'Destination is required'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.number().optional(),
  currency: z.string().default('USD'),
  travelers_count: z.number().min(1).default(1),
  language: z.enum(['en', 'he']).default('en')
});

const updateTripSchema = createTripSchema.partial();

const createItineraryItemSchema = z.object({
  type: z.enum(['flight', 'hotel', 'restaurant', 'activity', 'transport', 'other']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  address: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  price: z.number().optional(),
  currency: z.string().default('USD'),
  source_url: z.string().optional(),
  media_urls: z.array(z.string()).optional()
});

// Get all trips for user
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const supabase = createServerClient();
  
  const { data: trips, error } = await supabase
    .from('trips')
    .select(`
      *,
      itinerary_items(*)
    `)
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw createError('Failed to fetch trips', 500);
  }

  res.json({ trips });
}));

// Get single trip
router.get('/:tripId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { tripId } = req.params;
  const supabase = createServerClient();
  
  const { data: trip, error } = await supabase
    .from('trips')
    .select(`
      *,
      itinerary_items(*),
      bookings(*)
    `)
    .eq('id', tripId)
    .eq('user_id', req.user!.id)
    .single();

  if (error || !trip) {
    throw createError('Trip not found', 404);
  }

  res.json({ trip });
}));

// Create new trip
router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const validatedData = createTripSchema.parse(req.body);
  const supabase = createServerClient();
  
  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      ...validatedData,
      user_id: req.user!.id
    })
    .select()
    .single();

  if (error) {
    throw createError('Failed to create trip', 400);
  }

  res.status(201).json({ trip });
}));

// Update trip
router.put('/:tripId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { tripId } = req.params;
  const validatedData = updateTripSchema.parse(req.body);
  const supabase = createServerClient();
  
  const { data: trip, error } = await supabase
    .from('trips')
    .update({
      ...validatedData,
      updated_at: new Date().toISOString()
    })
    .eq('id', tripId)
    .eq('user_id', req.user!.id)
    .select()
    .single();

  if (error || !trip) {
    throw createError('Failed to update trip', 400);
  }

  res.json({ trip });
}));

// Delete trip
router.delete('/:tripId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { tripId } = req.params;
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)
    .eq('user_id', req.user!.id);

  if (error) {
    throw createError('Failed to delete trip', 400);
  }

  res.json({ message: 'Trip deleted successfully' });
}));

// Get itinerary items for trip
router.get('/:tripId/itinerary', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { tripId } = req.params;
  const supabase = createServerClient();
  
  // Verify trip ownership
  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', req.user!.id)
    .single();

  if (!trip) {
    throw createError('Trip not found', 404);
  }

  const { data: items, error } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('start_time', { ascending: true });

  if (error) {
    throw createError('Failed to fetch itinerary items', 500);
  }

  res.json({ items });
}));

// Add itinerary item
router.post('/:tripId/itinerary', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { tripId } = req.params;
  const validatedData = createItineraryItemSchema.parse(req.body);
  const supabase = createServerClient();
  
  // Verify trip ownership
  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', req.user!.id)
    .single();

  if (!trip) {
    throw createError('Trip not found', 404);
  }

  const { data: item, error } = await supabase
    .from('itinerary_items')
    .insert({
      ...validatedData,
      trip_id: tripId
    })
    .select()
    .single();

  if (error) {
    throw createError('Failed to create itinerary item', 400);
  }

  res.status(201).json({ item });
}));

// Update itinerary item
router.put('/:tripId/itinerary/:itemId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { tripId, itemId } = req.params;
  const validatedData = createItineraryItemSchema.partial().parse(req.body);
  const supabase = createServerClient();
  
  // Verify trip ownership and item exists
  const { data: item } = await supabase
    .from('itinerary_items')
    .select(`
      *,
      trips!inner(user_id)
    `)
    .eq('id', itemId)
    .eq('trip_id', tripId)
    .single();

  if (!item || item.trips.user_id !== req.user!.id) {
    throw createError('Itinerary item not found', 404);
  }

  const { data: updatedItem, error } = await supabase
    .from('itinerary_items')
    .update({
      ...validatedData,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    throw createError('Failed to update itinerary item', 400);
  }

  res.json({ item: updatedItem });
}));

// Delete itinerary item
router.delete('/:tripId/itinerary/:itemId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { tripId, itemId } = req.params;
  const supabase = createServerClient();
  
  // Verify trip ownership and item exists
  const { data: item } = await supabase
    .from('itinerary_items')
    .select(`
      *,
      trips!inner(user_id)
    `)
    .eq('id', itemId)
    .eq('trip_id', tripId)
    .single();

  if (!item || item.trips.user_id !== req.user!.id) {
    throw createError('Itinerary item not found', 404);
  }

  const { error } = await supabase
    .from('itinerary_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    throw createError('Failed to delete itinerary item', 400);
  }

  res.json({ message: 'Itinerary item deleted successfully' });
}));

export default router;