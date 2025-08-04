export type UserRole = 'user' | 'admin';
export type TripStatus = 'planning' | 'active' | 'completed' | 'cancelled';
export type ItineraryItemType = 'flight' | 'hotel' | 'restaurant' | 'activity' | 'transport' | 'other';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type MessageRole = 'user' | 'assistant' | 'system';
export type SourceType = 'api' | 'scraping' | 'social' | 'manual';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          preferred_language: 'en' | 'he';
          avatar_url: string | null;
          user_metadata: Record<string, any>;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          preferred_language?: 'en' | 'he';
          avatar_url?: string | null;
          user_metadata?: Record<string, any>;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          preferred_language?: 'en' | 'he';
          avatar_url?: string | null;
          user_metadata?: Record<string, any>;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      trips: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          destination: string;
          start_date: string | null;
          end_date: string | null;
          budget: number | null;
          currency: string;
          travelers_count: number;
          status: TripStatus;
          language: 'en' | 'he';
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          destination: string;
          start_date?: string | null;
          end_date?: string | null;
          budget?: number | null;
          currency?: string;
          travelers_count?: number;
          status?: TripStatus;
          language?: 'en' | 'he';
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          destination?: string;
          start_date?: string | null;
          end_date?: string | null;
          budget?: number | null;
          currency?: string;
          travelers_count?: number;
          status?: TripStatus;
          language?: 'en' | 'he';
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      itinerary_items: {
        Row: {
          id: string;
          trip_id: string;
          type: ItineraryItemType;
          title: string;
          description: string | null;
          location: string | null;
          address: string | null;
          start_time: string | null;
          end_time: string | null;
          rating: number | null;
          price: number | null;
          currency: string;
          source: SourceType;
          source_url: string | null;
          media_urls: string[] | null;
          booking_status: BookingStatus;
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          type: ItineraryItemType;
          title: string;
          description?: string | null;
          location?: string | null;
          address?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          rating?: number | null;
          price?: number | null;
          currency?: string;
          source?: SourceType;
          source_url?: string | null;
          media_urls?: string[] | null;
          booking_status?: BookingStatus;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          type?: ItineraryItemType;
          title?: string;
          description?: string | null;
          location?: string | null;
          address?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          rating?: number | null;
          price?: number | null;
          currency?: string;
          source?: SourceType;
          source_url?: string | null;
          media_urls?: string[] | null;
          booking_status?: BookingStatus;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string | null;
          role: MessageRole;
          content: string;
          metadata: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trip_id?: string | null;
          role: MessageRole;
          content: string;
          metadata?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trip_id?: string | null;
          role?: MessageRole;
          content?: string;
          metadata?: Record<string, any>;
          created_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string;
          itinerary_item_id: string | null;
          ota_name: string;
          ota_reference: string | null;
          product_type: string;
          product_id: string | null;
          affiliate_code: string | null;
          booking_date: string;
          amount: number;
          currency: string;
          status: BookingStatus;
          confirmation_number: string | null;
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trip_id: string;
          itinerary_item_id?: string | null;
          ota_name: string;
          ota_reference?: string | null;
          product_type: string;
          product_id?: string | null;
          affiliate_code?: string | null;
          booking_date?: string;
          amount: number;
          currency?: string;
          status?: BookingStatus;
          confirmation_number?: string | null;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trip_id?: string;
          itinerary_item_id?: string | null;
          ota_name?: string;
          ota_reference?: string | null;
          product_type?: string;
          product_id?: string | null;
          affiliate_code?: string | null;
          booking_date?: string;
          amount?: number;
          currency?: string;
          status?: BookingStatus;
          confirmation_number?: string | null;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      scraped_data: {
        Row: {
          id: string;
          source_type: SourceType;
          source_url: string | null;
          title: string | null;
          description: string | null;
          location: string | null;
          address: string | null;
          rating: number | null;
          price_range: string | null;
          categories: string[] | null;
          raw_json: Record<string, any> | null;
          processed_text: string | null;
          embedding: number[] | null;
          language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source_type: SourceType;
          source_url?: string | null;
          title?: string | null;
          description?: string | null;
          location?: string | null;
          address?: string | null;
          rating?: number | null;
          price_range?: string | null;
          categories?: string[] | null;
          raw_json?: Record<string, any> | null;
          processed_text?: string | null;
          embedding?: number[] | null;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          source_type?: SourceType;
          source_url?: string | null;
          title?: string | null;
          description?: string | null;
          location?: string | null;
          address?: string | null;
          rating?: number | null;
          price_range?: string | null;
          categories?: string[] | null;
          raw_json?: Record<string, any> | null;
          processed_text?: string | null;
          embedding?: number[] | null;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      translations: {
        Row: {
          id: string;
          key: string;
          lang: 'en' | 'he';
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          lang: 'en' | 'he';
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          lang?: 'en' | 'he';
          text?: string;
          created_at?: string;
        };
      };
      group_chat_rooms: {
        Row: {
          id: string;
          trip_id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          name: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          name?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      group_chat_participants: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          role: 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
      };
      group_chat_messages: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          content: string;
          message_type: 'text' | 'image' | 'file' | 'itinerary_update';
          metadata: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          content: string;
          message_type?: 'text' | 'image' | 'file' | 'itinerary_update';
          metadata?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          content?: string;
          message_type?: 'text' | 'image' | 'file' | 'itinerary_update';
          metadata?: Record<string, any>;
          created_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          itinerary_item_id: string | null;
          scraped_data_id: string | null;
          rating: number;
          title: string | null;
          content: string | null;
          photos: string[] | null;
          helpful_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          itinerary_item_id?: string | null;
          scraped_data_id?: string | null;
          rating: number;
          title?: string | null;
          content?: string | null;
          photos?: string[] | null;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          itinerary_item_id?: string | null;
          scraped_data_id?: string | null;
          rating?: number;
          title?: string | null;
          content?: string | null;
          photos?: string[] | null;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      search_similar_content: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
          location_filter?: string;
          radius_km?: number;
        };
        Returns: {
          id: string;
          title: string;
          description: string;
          source_type: SourceType;
          similarity: number;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      trip_status: TripStatus;
      itinerary_item_type: ItineraryItemType;
      booking_status: BookingStatus;
      message_role: MessageRole;
      source_type: SourceType;
    };
  };
}