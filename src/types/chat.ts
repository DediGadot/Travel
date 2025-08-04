export interface Message {
  id: string;
  user_id: string;
  trip_id: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ChatContext {
  destination?: string;
  budget?: number;
  travelers?: number;
  interests?: string[];
  duration?: number;
  language?: 'en' | 'he';
}

export interface TravelSuggestion {
  id: string;
  type: 'hotel' | 'restaurant' | 'activity' | 'attraction' | 'flight';
  title: string;
  description: string;
  location?: {
    lat: number;
    lng: number;
  };
  address?: string;
  rating?: number;
  price_range?: string;
  image_url?: string;
  booking_url?: string;
}