import express from 'express';
import { createServerClient } from '../../lib/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const createBookingSchema = z.object({
  trip_id: z.string().uuid(),
  itinerary_item_id: z.string().uuid().optional(),
  ota_name: z.string().min(1, 'OTA name is required'),
  ota_reference: z.string().optional(),
  product_type: z.enum(['hotel', 'flight', 'activity', 'car_rental', 'restaurant']),
  product_id: z.string().optional(),
  affiliate_code: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  confirmation_number: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Create booking
router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const validatedData = createBookingSchema.parse(req.body);
  const supabase = createServerClient();
  
  // Verify trip ownership
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', validatedData.trip_id)
    .eq('user_id', req.user!.id)
    .single();

  if (tripError || !trip) {
    throw createError('Trip not found or access denied', 404);
  }

  // Create booking
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      ...validatedData,
      user_id: req.user!.id,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    throw createError('Failed to create booking', 400);
  }

  res.status(201).json({ booking });
}));

// Get bookings for user
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { trip_id, status, product_type } = req.query;
  const supabase = createServerClient();
  
  let query = supabase
    .from('bookings')
    .select(`
      *,
      trips(name, destination),
      itinerary_items(title, type)
    `)
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (trip_id) {
    query = query.eq('trip_id', trip_id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (product_type) {
    query = query.eq('product_type', product_type);
  }

  const { data: bookings, error } = await query;

  if (error) {
    throw createError('Failed to fetch bookings', 500);
  }

  res.json({ bookings: bookings || [] });
}));

// Get single booking
router.get('/:bookingId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { bookingId } = req.params;
  const supabase = createServerClient();
  
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      trips(name, destination),
      itinerary_items(title, type, description)
    `)
    .eq('id', bookingId)
    .eq('user_id', req.user!.id)
    .single();

  if (error || !booking) {
    throw createError('Booking not found', 404);
  }

  res.json({ booking });
}));

// Update booking status
router.patch('/:bookingId/status', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { bookingId } = req.params;
  const { status, confirmation_number, metadata } = req.body;

  if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
    throw createError('Invalid booking status', 400);
  }

  const supabase = createServerClient();
  
  const { data: booking, error } = await supabase
    .from('bookings')
    .update({
      status,
      confirmation_number,
      metadata: metadata || {},
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .eq('user_id', req.user!.id)
    .select()
    .single();

  if (error || !booking) {
    throw createError('Failed to update booking or booking not found', 400);
  }

  res.json({ booking });
}));

// Cancel booking
router.delete('/:bookingId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { bookingId } = req.params;
  const supabase = createServerClient();
  
  // Update status to cancelled instead of deleting
  const { data: booking, error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .eq('user_id', req.user!.id)
    .select()
    .single();

  if (error || !booking) {
    throw createError('Failed to cancel booking or booking not found', 400);
  }

  res.json({ message: 'Booking cancelled successfully', booking });
}));

// Generate affiliate URL
router.post('/affiliate-url', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { ota_name, product_type, product_id, destination, check_in, check_out, guests } = req.body;

  if (!ota_name || !product_type) {
    throw createError('OTA name and product type are required', 400);
  }

  let affiliateUrl = '';

  // Generate affiliate URLs based on OTA
  switch (ota_name.toLowerCase()) {
    case 'booking.com':
      const bookingAffiliateId = process.env.BOOKING_AFFILIATE_ID;
      if (bookingAffiliateId) {
        affiliateUrl = `https://www.booking.com/searchresults.html?aid=${bookingAffiliateId}&dest_type=city&dest_id=${product_id || destination}&checkin=${check_in}&checkout=${check_out}&group_adults=${guests || 1}`;
      }
      break;

    case 'expedia':
      const expediaAffiliateId = process.env.EXPEDIA_AFFILIATE_ID;
      if (expediaAffiliateId) {
        affiliateUrl = `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(destination || '')}&startDate=${check_in}&endDate=${check_out}&rooms=1&adults=${guests || 1}&affId=${expediaAffiliateId}`;
      }
      break;

    case 'skyscanner':
      if (product_type === 'flight') {
        affiliateUrl = `https://www.skyscanner.com/transport/flights/${destination}/?affiliateId=${process.env.SKYSCANNER_AFFILIATE_ID}`;
      }
      break;

    default:
      throw createError('Unsupported OTA', 400);
  }

  if (!affiliateUrl) {
    throw createError('Could not generate affiliate URL', 400);
  }

  res.json({ affiliateUrl });
}));

// Get booking statistics
router.get('/stats/summary', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const supabase = createServerClient();
  
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('status, product_type, amount, currency, created_at')
    .eq('user_id', req.user!.id);

  if (error) {
    throw createError('Failed to fetch booking statistics', 500);
  }

  const stats = {
    total_bookings: bookings?.length || 0,
    total_spent: bookings?.reduce((sum, booking) => sum + booking.amount, 0) || 0,
    bookings_by_status: {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0
    },
    bookings_by_type: {
      hotel: 0,
      flight: 0,
      activity: 0,
      car_rental: 0,
      restaurant: 0
    },
    recent_bookings: bookings?.slice(-5) || []
  };

  bookings?.forEach(booking => {
    stats.bookings_by_status[booking.status as keyof typeof stats.bookings_by_status]++;
    stats.bookings_by_type[booking.product_type as keyof typeof stats.bookings_by_type]++;
  });

  res.json({ stats });
}));

export default router;