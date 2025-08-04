import OpenAI from 'openai';
import { createServerClient } from '../../lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TravelContext {
  destination?: string;
  budget?: number;
  travelers?: number;
  interests?: string[];
  duration?: number;
  language?: 'en' | 'he';
}

export class OpenAIService {
  private systemPrompt = `You are an expert travel assistant powered by AI. You help users plan amazing trips by:

1. Understanding their preferences, budget, and travel style
2. Providing personalized recommendations for destinations, hotels, restaurants, and activities
3. Creating detailed itineraries with timing and logistics
4. Helping with bookings and reservations
5. Supporting both English and Hebrew languages

Always be helpful, enthusiastic, and provide specific, actionable recommendations. When suggesting places or activities, include:
- Names and addresses when possible
- Price ranges
- Why you recommend them
- Best times to visit
- Booking tips

If asked in Hebrew, respond in Hebrew. Keep responses conversational but informative.`;

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async searchSimilarContent(
    query: string,
    location?: { lat: number; lng: number },
    limit = 10
  ): Promise<any[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const supabase = createServerClient();

      const { data, error } = await supabase.rpc('search_similar_content', {
        query_embedding: queryEmbedding,
        match_threshold: 0.78,
        match_count: limit,
        location_filter: location ? `POINT(${location.lng} ${location.lat})` : null,
        radius_km: 50
      });

      if (error) {
        console.error('Error searching similar content:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchSimilarContent:', error);
      return [];
    }
  }

  async generateResponse(
    messages: ChatMessage[],
    context: TravelContext = {},
    retrievedContent: any[] = []
  ): Promise<string> {
    try {
      // Prepare context information
      let contextPrompt = this.systemPrompt;
      
      if (context.language === 'he') {
        contextPrompt += '\n\nIMPORTANT: The user prefers Hebrew. Respond in Hebrew (עברית) and use right-to-left text formatting.';
      }

      if (context.destination) {
        contextPrompt += `\n\nUser is interested in: ${context.destination}`;
      }

      if (context.budget) {
        contextPrompt += `\nBudget: $${context.budget}`;
      }

      if (context.travelers) {
        contextPrompt += `\nNumber of travelers: ${context.travelers}`;
      }

      if (context.duration) {
        contextPrompt += `\nTrip duration: ${context.duration} days`;
      }

      // Add retrieved context
      if (retrievedContent.length > 0) {
        contextPrompt += '\n\nRelevant information from our database:\n';
        retrievedContent.forEach((item, index) => {
          contextPrompt += `${index + 1}. ${item.title}: ${item.description}\n`;
        });
        contextPrompt += '\nUse this information to provide more accurate and detailed recommendations.';
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: contextPrompt },
          ...messages.slice(-10) // Keep last 10 messages for context
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch (error) {
      console.error('Error generating OpenAI response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateItinerary(
    destination: string,
    duration: number,
    budget: number,
    travelers: number,
    interests: string[] = [],
    language: 'en' | 'he' = 'en'
  ): Promise<any> {
    try {
      const prompt = language === 'he' 
        ? `צור מסלול נסיעה מפורט ל${destination} למשך ${duration} ימים עבור ${travelers} נוסעים עם תקציב של $${budget}. תכלול המלצות על מלונות, מסעדות, אטרקציות ופעילויות. תכלול גם מחירים משוערים ועצות מעשיות.`
        : `Create a detailed ${duration}-day itinerary for ${destination} for ${travelers} travelers with a budget of $${budget}. Include recommendations for hotels, restaurants, attractions, and activities. Include estimated costs and practical tips.`;

      const interests_text = interests.length > 0 
        ? (language === 'he' ? `התחומי עניין: ${interests.join(', ')}` : `Interests: ${interests.join(', ')}`)
        : '';

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: language === 'he' 
              ? 'אתה מומחה תכנון נסיעות. צור מסלולי נסיעה מפורטים ומעשיים בעברית.'
              : 'You are a travel planning expert. Create detailed, practical itineraries with specific recommendations.'
          },
          {
            role: 'user',
            content: `${prompt} ${interests_text}`
          }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || 'Could not generate itinerary.';
    } catch (error) {
      console.error('Error generating itinerary:', error);
      throw new Error('Failed to generate itinerary');
    }
  }

  async extractLocationFromText(text: string): Promise<{ location: string; confidence: number } | null> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Extract the main travel destination from the user\'s message. Respond with JSON format: {"location": "City, Country", "confidence": 0.9}'
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 100,
        temperature: 0.1,
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        try {
          return JSON.parse(response);
        } catch {
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('Error extracting location:', error);
      return null;
    }
  }

  async translateText(text: string, targetLanguage: 'en' | 'he'): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Translate the following text to ${targetLanguage === 'he' ? 'Hebrew' : 'English'}. Maintain the original meaning and tone.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      return completion.choices[0]?.message?.content || text;
    } catch (error) {
      console.error('Error translating text:', error);
      return text;
    }
  }

  async moderateContent(text: string): Promise<{ flagged: boolean; categories: string[] }> {
    try {
      const moderation = await openai.moderations.create({
        input: text,
      });

      const result = moderation.results[0];
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category, _]) => category);

      return {
        flagged: result.flagged,
        categories: flaggedCategories
      };
    } catch (error) {
      console.error('Error moderating content:', error);
      return { flagged: false, categories: [] };
    }
  }
}

export const openaiService = new OpenAIService();