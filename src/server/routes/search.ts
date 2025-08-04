import express from 'express';
import { createServerClient } from '../../lib/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { openaiService } from '../services/openai';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  type: z.enum(['all', 'hotels', 'restaurants', 'activities', 'attractions']).default('all'),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  radius: z.number().default(50), // km
  limit: z.number().min(1).max(50).default(20),
  priceRange: z.enum(['budget', 'moderate', 'luxury', 'all']).default('all'),
  rating: z.number().min(0).max(5).optional()
});

// Semantic search
router.post('/semantic', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { query, type, location, radius, limit, priceRange, rating } = searchSchema.parse(req.body);
  
  try {
    // Generate embedding for search query
    const queryEmbedding = await openaiService.generateEmbedding(query);
    const supabase = createServerClient();

    // Build additional filters
    let additionalFilters = '';
    
    if (type !== 'all') {
      const categoryMap = {
        hotels: ['hotel', 'accommodation', 'resort', 'hostel'],
        restaurants: ['restaurant', 'cafe', 'bar', 'dining'],
        activities: ['activity', 'tour', 'experience', 'adventure'],
        attractions: ['attraction', 'landmark', 'museum', 'park']
      };
      
      const categories = categoryMap[type] || [];
      if (categories.length > 0) {
        additionalFilters += ` AND (${categories.map(cat => `categories @> '["${cat}"]'`).join(' OR ')})`;
      }
    }

    if (priceRange !== 'all') {
      const priceMap = {
        budget: '$',
        moderate: '$$',
        luxury: '$$$'
      };
      additionalFilters += ` AND price_range = '${priceMap[priceRange]}'`;
    }

    if (rating) {
      additionalFilters += ` AND rating >= ${rating}`;
    }

    // Perform vector search
    const { data, error } = await supabase.rpc('search_similar_content', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
      location_filter: location ? `POINT(${location.lng} ${location.lat})` : null,
      radius_km: radius
    });

    if (error) {
      console.error('Search error:', error);
      throw createError('Search failed', 500);
    }

    // Enhance results with additional data
    const enhancedResults = data?.map((item: any) => ({
      ...item,
      relevanceScore: item.similarity,
      distance: location ? calculateDistance(
        location.lat, 
        location.lng, 
        item.location_lat, 
        item.location_lng
      ) : null
    })) || [];

    res.json({
      results: enhancedResults,
      total: enhancedResults.length,
      query,
      filters: { type, location, radius, priceRange, rating }
    });

  } catch (error) {
    console.error('Semantic search error:', error);
    throw createError('Failed to perform semantic search', 500);
  }
}));

// Text search with filters
router.get('/text', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { 
    q: query, 
    type = 'all', 
    location, 
    radius = 50, 
    limit = 20, 
    priceRange = 'all',
    rating,
    source
  } = req.query;

  if (!query || typeof query !== 'string') {
    throw createError('Search query is required', 400);
  }

  const supabase = createServerClient();

  try {
    let searchQuery = supabase
      .from('scraped_data')
      .select(`
        id,
        title,
        description,
        source_type,
        source_url,
        rating,
        price_range,
        categories,
        address,
        created_at
      `)
      .textSearch('processed_text', query, {
        type: 'websearch',
        config: 'english'
      })
      .limit(Number(limit));

    // Apply filters
    if (type !== 'all') {
      const categoryMap = {
        hotels: ['hotel', 'accommodation', 'resort', 'hostel'],
        restaurants: ['restaurant', 'cafe', 'bar', 'dining'],
        activities: ['activity', 'tour', 'experience', 'adventure'],
        attractions: ['attraction', 'landmark', 'museum', 'park']
      };
      
      const categories = categoryMap[type as keyof typeof categoryMap] || [];
      if (categories.length > 0) {
        searchQuery = searchQuery.overlaps('categories', categories);
      }
    }

    if (priceRange !== 'all') {
      const priceMap = {
        budget: '$',
        moderate: '$$',
        luxury: '$$$'
      };
      searchQuery = searchQuery.eq('price_range', priceMap[priceRange as keyof typeof priceMap]);
    }

    if (rating) {
      searchQuery = searchQuery.gte('rating', Number(rating));
    }

    if (source) {
      searchQuery = searchQuery.eq('source_type', source);
    }

    const { data, error } = await searchQuery;

    if (error) {
      throw createError('Text search failed', 500);
    }

    res.json({
      results: data || [],
      total: data?.length || 0,
      query,
      filters: { type, location, radius, priceRange, rating, source }
    });

  } catch (error) {
    console.error('Text search error:', error);
    throw createError('Failed to perform text search', 500);
  }
}));

// Popular destinations
router.get('/destinations', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { limit = 10, language = 'en' } = req.query;
  const supabase = createServerClient();

  try {
    const { data, error } = await supabase
      .from('scraped_data')
      .select('title, description, address, rating, categories, source_url')
      .contains('categories', ['destination', 'city'])
      .not('rating', 'is', null)
      .order('rating', { ascending: false })
      .limit(Number(limit));

    if (error) {
      throw createError('Failed to fetch destinations', 500);
    }

    res.json({ destinations: data || [] });

  } catch (error) {
    console.error('Error fetching destinations:', error);
    throw createError('Failed to fetch popular destinations', 500);
  }
}));

// Trending searches
router.get('/trending', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { language = 'en' } = req.query;
  
  // Mock trending searches - in production, this would come from analytics
  const trendingSearches = language === 'he' ? [
    'טוקיו יפן',
    'פריז צרפת',
    'ניו יורק ארהב',
    'לונדון אנגליה',
    'רומא איטליה',
    'ברלין גרמניה',
    'אמסטרדם הולנד',
    'ברצלונה ספרד'
  ] : [
    'Tokyo Japan',
    'Paris France', 
    'New York USA',
    'London England',
    'Rome Italy',
    'Berlin Germany',
    'Amsterdam Netherlands',
    'Barcelona Spain'
  ];

  res.json({ trending: trendingSearches });
}));

// Search suggestions/autocomplete
router.get('/suggestions', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { q: query, limit = 5 } = req.query;

  if (!query || typeof query !== 'string' || query.length < 2) {
    return res.json({ suggestions: [] });
  }

  const supabase = createServerClient();

  try {
    const { data, error } = await supabase
      .from('scraped_data')
      .select('title')
      .ilike('title', `%${query}%`)
      .limit(Number(limit));

    if (error) {
      throw createError('Failed to get suggestions', 500);
    }

    const suggestions = data?.map(item => item.title) || [];
    res.json({ suggestions });

  } catch (error) {
    console.error('Error getting suggestions:', error);
    throw createError('Failed to get search suggestions', 500);
  }
}));

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default router;