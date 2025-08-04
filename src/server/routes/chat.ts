import express from 'express';
import { createServerClient } from '../../lib/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { openaiService, ChatMessage, TravelContext } from '../services/openai';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  tripId: z.string().uuid().optional(),
  context: z.object({
    destination: z.string().optional(),
    budget: z.number().optional(),
    travelers: z.number().optional(),
    interests: z.array(z.string()).optional(),
    duration: z.number().optional(),
    language: z.enum(['en', 'he']).default('en')
  }).optional()
});

// Send message to chat
router.post('/message', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { message, tripId, context = {} } = chatMessageSchema.parse(req.body);
  const supabase = createServerClient();
  
  // Moderate content
  const moderation = await openaiService.moderateContent(message);
  if (moderation.flagged) {
    throw createError('Message contains inappropriate content', 400);
  }

  // Save user message
  const { data: userMessage, error: userMessageError } = await supabase
    .from('messages')
    .insert({
      user_id: req.user!.id,
      trip_id: tripId || null,
      role: 'user',
      content: message,
      metadata: { context }
    })
    .select()
    .single();

  if (userMessageError) {
    throw createError('Failed to save message', 500);
  }

  try {
    // Get conversation history
    const { data: messageHistory } = await supabase
      .from('messages')
      .select('role, content')
      .eq('user_id', req.user!.id)
      .eq('trip_id', tripId || null)
      .order('created_at', { ascending: false })
      .limit(20);

    const chatHistory: ChatMessage[] = messageHistory
      ?.reverse()
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })) || [];

    // Search for relevant content
    const retrievedContent = await openaiService.searchSimilarContent(
      message,
      undefined, // location filter not implemented yet
      5
    );

    // Generate AI response
    const aiResponse = await openaiService.generateResponse(
      chatHistory,
      context as TravelContext,
      retrievedContent
    );

    // Save AI response
    const { data: assistantMessage, error: assistantMessageError } = await supabase
      .from('messages')
      .insert({
        user_id: req.user!.id,
        trip_id: tripId || null,
        role: 'assistant',
        content: aiResponse,
        metadata: { retrievedContent: retrievedContent.map(c => c.id) }
      })
      .select()
      .single();

    if (assistantMessageError) {
      console.error('Failed to save AI response:', assistantMessageError);
    }

    res.json({
      userMessage,
      assistantMessage: assistantMessage || { content: aiResponse },
      retrievedContent: retrievedContent.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        similarity: item.similarity
      }))
    });

  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Save error message
    await supabase
      .from('messages')
      .insert({
        user_id: req.user!.id,
        trip_id: tripId || null,
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again.',
        metadata: { error: true }
      });

    throw createError('Failed to generate response', 500);
  }
}));

// Get conversation history
router.get('/history', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { tripId, limit = 50 } = req.query;
  const supabase = createServerClient();
  
  let query = supabase
    .from('messages')
    .select('*')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false })
    .limit(Number(limit));

  if (tripId) {
    query = query.eq('trip_id', tripId);
  } else {
    query = query.is('trip_id', null);
  }

  const { data: messages, error } = await query;

  if (error) {
    throw createError('Failed to fetch conversation history', 500);
  }

  res.json({ messages: messages?.reverse() || [] });
}));

// Generate itinerary
router.post('/itinerary', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { destination, duration, budget, travelers, interests, language = 'en' } = req.body;

  if (!destination || !duration) {
    throw createError('Destination and duration are required', 400);
  }

  try {
    const itinerary = await openaiService.generateItinerary(
      destination,
      duration,
      budget || 1000,
      travelers || 1,
      interests || [],
      language
    );

    res.json({ itinerary });
  } catch (error) {
    console.error('Error generating itinerary:', error);
    throw createError('Failed to generate itinerary', 500);
  }
}));

// Extract location from text
router.post('/extract-location', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { text } = req.body;

  if (!text) {
    throw createError('Text is required', 400);
  }

  try {
    const location = await openaiService.extractLocationFromText(text);
    res.json({ location });
  } catch (error) {
    console.error('Error extracting location:', error);
    throw createError('Failed to extract location', 500);
  }
}));

// Translate text
router.post('/translate', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { text, targetLanguage = 'en' } = req.body;

  if (!text) {
    throw createError('Text is required', 400);
  }

  if (!['en', 'he'].includes(targetLanguage)) {
    throw createError('Invalid target language', 400);
  }

  try {
    const translatedText = await openaiService.translateText(text, targetLanguage);
    res.json({ translatedText });
  } catch (error) {
    console.error('Error translating text:', error);
    throw createError('Failed to translate text', 500);
  }
}));

// Get suggested questions
router.get('/suggestions', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { language = 'en' } = req.query;
  
  const suggestions = language === 'he' ? [
    'תכנן נסיעה של 5 ימים לטוקיו',
    'מצא מסעדות רומנטיות בפריז',
    'מה הפעילויות הטובות ביותר בניו יורק?',
    'הצע מלונות מתחת ל-200 דולר ללילה',
    'איך להגיע מתל אביב לירושלים?',
    'מה החגים והפסטיבלים באיטליה?'
  ] : [
    'Plan a 5-day trip to Tokyo',
    'Find romantic restaurants in Paris',
    'What are the best activities in New York?',
    'Suggest hotels under $200 per night',
    'How to get from Tel Aviv to Jerusalem?',
    'What are the festivals in Italy?'
  ];

  res.json({ suggestions });
}));

// Clear conversation history
router.delete('/history', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { tripId } = req.query;
  const supabase = createServerClient();
  
  let query = supabase
    .from('messages')
    .delete()
    .eq('user_id', req.user!.id);

  if (tripId) {
    query = query.eq('trip_id', tripId);
  } else {
    query = query.is('trip_id', null);
  }

  const { error } = await query;

  if (error) {
    throw createError('Failed to clear conversation history', 500);
  }

  res.json({ message: 'Conversation history cleared' });
}));

export default router;