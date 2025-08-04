# Travel Assistant - Comprehensive Technical Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Design](#database-design)
4. [API Structure](#api-structure)
5. [Frontend Components](#frontend-components)
6. [AI & RAG System](#ai--rag-system)
7. [Data Ingestion Pipeline](#data-ingestion-pipeline)
8. [Authentication & Security](#authentication--security)
9. [Internationalization](#internationalization)
10. [Testing Strategy](#testing-strategy)
11. [How to Run](#how-to-run)
12. [Configuration](#configuration)
13. [Deployment](#deployment)

## Overview

The Travel Assistant is a full-stack, AI-powered travel planning platform built with modern web technologies. It provides conversational travel planning, personalized recommendations, and booking integration while supporting both English and Hebrew languages with full RTL (right-to-left) support.

### Key Technologies
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Supabase) with PostGIS and pgvector
- **AI**: OpenAI GPT-4, text-embedding-3-small
- **Auth**: Supabase Auth with JWT
- **Deployment**: Vercel (frontend), Railway/Heroku (backend)
- **Languages**: English, Hebrew (RTL support)

## Architecture

### System Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App  │    │   Express API   │    │   Supabase DB   │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Internationl.  │    │   OpenAI API    │    │   Vector Store  │
│  (next-intl)    │    │   (GPT-4)       │    │   (pgvector)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Tailwind CSS │    │   Travel APIs   │    │   ETL Pipeline  │
│   (RTL Support) │    │ (Expedia, etc.) │    │   (Python)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Directory Structure

```
travel-assistant/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── [locale]/                 # Internationalized routes
│   │   │   ├── page.tsx              # Home page
│   │   │   ├── chat/                 # Chat interface
│   │   │   ├── trips/                # Trip management
│   │   │   └── auth/                 # Authentication pages
│   │   ├── api/                      # API route handlers (proxy)
│   │   ├── layout.tsx                # Root layout with i18n
│   │   └── globals.css               # Global styles + RTL
│   ├── components/                   # React components
│   │   ├── chat/                     # Chat-specific components
│   │   │   ├── ChatInterface.tsx     # Main chat component
│   │   │   ├── ChatMessage.tsx       # Message bubble
│   │   │   ├── ChatInput.tsx         # Input with voice/image
│   │   │   ├── SuggestedQuestions.tsx# Quick start suggestions
│   │   │   └── TypingIndicator.tsx   # Loading indicator
│   │   ├── Navigation.tsx            # Main navigation bar
│   │   ├── Hero.tsx                  # Landing page hero
│   │   ├── PopularDestinations.tsx   # Destination cards
│   │   └── FeaturedTrips.tsx         # Trip packages
│   ├── hooks/                        # Custom React hooks
│   │   ├── useChatMessages.ts        # Chat state management
│   │   ├── useAuth.ts                # Authentication hook
│   │   └── useTrips.ts               # Trip management hook
│   ├── lib/                          # Utility libraries
│   │   ├── supabase.ts               # Supabase client config
│   │   ├── utils.ts                  # Helper functions
│   │   └── constants.ts              # App constants
│   ├── server/                       # Backend API server
│   │   ├── index.ts                  # Express server entry
│   │   ├── routes/                   # API route handlers
│   │   │   ├── auth.ts               # Authentication routes
│   │   │   ├── trips.ts              # Trip CRUD operations
│   │   │   ├── chat.ts               # AI chat endpoints
│   │   │   ├── search.ts             # Search functionality
│   │   │   ├── booking.ts            # Booking management
│   │   │   └── upload.ts             # File upload handling
│   │   ├── services/                 # Business logic services
│   │   │   ├── openai.ts             # OpenAI integration
│   │   │   ├── translation.ts        # Translation service
│   │   │   └── booking.ts            # Booking logic
│   │   └── middleware/               # Express middleware
│   │       ├── auth.ts               # JWT authentication
│   │       ├── errorHandler.ts       # Error handling
│   │       └── rateLimiter.ts        # Rate limiting
│   ├── etl/                          # Data ingestion pipeline
│   │   ├── main.py                   # ETL orchestrator
│   │   ├── utils/                    # ETL utilities
│   │   │   ├── config.py             # Configuration management
│   │   │   └── rate_limiter.py       # API rate limiting
│   │   ├── extractors/               # Data source extractors
│   │   │   ├── expedia_extractor.py  # Expedia API client
│   │   │   ├── skyscanner_extractor.py # Skyscanner API client
│   │   │   └── social_media_extractor.py # Social media APIs
│   │   ├── processors/               # Data processing
│   │   │   └── data_processor.py     # Clean and enrich data
│   │   └── loaders/                  # Database loaders
│   │       └── supabase_loader.py    # Load to Supabase
│   └── types/                        # TypeScript definitions
│       ├── database.ts               # Database types
│       ├── chat.ts                   # Chat-related types
│       └── travel.ts                 # Travel data types
├── messages/                         # Internationalization
│   ├── en.json                       # English translations
│   └── he.json                       # Hebrew translations
├── supabase/                         # Database schema
│   └── schema.sql                    # Complete DB schema
├── __tests__/                        # Test files
│   ├── api/                          # API endpoint tests
│   ├── components/                   # Component tests
│   ├── services/                     # Service layer tests
│   └── etl/                          # ETL pipeline tests
└── public/                           # Static assets
```

## Database Design

### Schema Overview

The database consists of 11 main tables with relationships designed for scalability and data integrity:

```sql
-- Core Tables
users                 -- User profiles and preferences
trips                 -- User's travel plans
itinerary_items      -- Individual trip components
messages             -- Chat conversation history
bookings             -- Booking records and status

-- Content Tables
scraped_data         -- External travel content with embeddings
translations         -- Dynamic content translations
reviews              -- User reviews and ratings

-- Collaboration Tables
group_chat_rooms     -- Group planning rooms
group_chat_participants -- Room membership
group_chat_messages  -- Group chat history
```

### Key Database Features

1. **Vector Search**: pgvector extension for semantic similarity
2. **Geospatial**: PostGIS for location-based queries
3. **Real-time**: Supabase subscriptions for live updates
4. **RLS**: Row-level security for data isolation
5. **Triggers**: Automatic timestamp updates
6. **Indexes**: Optimized for common query patterns

### Detailed Table Schemas

#### Users Table
```sql
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'he')),
    avatar_url TEXT,
    user_metadata JSONB DEFAULT '{}',
    role user_role DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Trips Table
```sql
CREATE TABLE public.trips (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    destination TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    travelers_count INTEGER DEFAULT 1,
    status trip_status DEFAULT 'planning',
    language TEXT DEFAULT 'en',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Scraped Data Table (with Vector Embeddings)
```sql
CREATE TABLE public.scraped_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    source_type source_type NOT NULL,
    source_url TEXT,
    title TEXT,
    description TEXT,
    location GEOGRAPHY(POINT, 4326),
    address TEXT,
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
    price_range TEXT,
    categories TEXT[],
    raw_json JSONB,
    processed_text TEXT,
    embedding vector(1536), -- OpenAI text-embedding-3-small
    language TEXT DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Structure

### Authentication Flow

All API endpoints use Supabase JWT authentication:

```typescript
// Middleware authentication check
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.substring(7); // Remove 'Bearer '
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = user;
  next();
};
```

### API Endpoints

#### Authentication Routes (`/api/auth`)

```typescript
POST   /api/auth/signup          // User registration
POST   /api/auth/signin          // User login
POST   /api/auth/signout         // User logout
GET    /api/auth/profile         // Get user profile
PUT    /api/auth/profile         // Update user profile
POST   /api/auth/reset-password  // Password reset
POST   /api/auth/update-password // Password update
```

#### Trip Management Routes (`/api/trips`)

```typescript
GET    /api/trips                     // Get user's trips
POST   /api/trips                     // Create new trip
GET    /api/trips/:tripId             // Get specific trip
PUT    /api/trips/:tripId             // Update trip
DELETE /api/trips/:tripId             // Delete trip
GET    /api/trips/:tripId/itinerary   // Get itinerary items
POST   /api/trips/:tripId/itinerary   // Add itinerary item
PUT    /api/trips/:tripId/itinerary/:itemId    // Update item
DELETE /api/trips/:tripId/itinerary/:itemId    // Delete item
```

#### Chat & AI Routes (`/api/chat`)

```typescript
POST   /api/chat/message         // Send message to AI
GET    /api/chat/history         // Get conversation history
POST   /api/chat/itinerary       // Generate AI itinerary
POST   /api/chat/extract-location // Extract location from text
POST   /api/chat/translate       // Translate text
GET    /api/chat/suggestions     // Get suggested questions
DELETE /api/chat/history         // Clear conversation history
```

#### Search Routes (`/api/search`)

```typescript
POST   /api/search/semantic      // Vector similarity search
GET    /api/search/text          // Full-text search
GET    /api/search/destinations  // Popular destinations
GET    /api/search/trending      // Trending searches
GET    /api/search/suggestions   // Search autocomplete
```

#### Booking Routes (`/api/booking`)

```typescript
POST   /api/booking              // Create booking
GET    /api/booking              // Get user bookings
GET    /api/booking/:bookingId   // Get specific booking
PATCH  /api/booking/:bookingId/status // Update booking status
DELETE /api/booking/:bookingId   // Cancel booking
POST   /api/booking/affiliate-url // Generate affiliate URLs
GET    /api/booking/stats/summary // Booking statistics
```

#### Upload Routes (`/api/upload`)

```typescript
POST   /api/upload/image         // Upload and process images
POST   /api/upload/analyze       // AI image analysis (Magic Camera)
POST   /api/upload/ocr           // Extract text from images
GET    /api/upload/images        // Get user's uploaded images
DELETE /api/upload/images/:filename // Delete uploaded image
```

### API Request/Response Examples

#### Chat Message Request
```typescript
POST /api/chat/message
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "message": "Plan a 5-day trip to Tokyo",
  "tripId": "123e4567-e89b-12d3-a456-426614174000", // Optional
  "context": {
    "destination": "Tokyo",
    "budget": 2000,
    "travelers": 2,
    "language": "en"
  }
}
```

#### Chat Message Response
```typescript
{
  "userMessage": {
    "id": "msg-123",
    "role": "user",
    "content": "Plan a 5-day trip to Tokyo",
    "created_at": "2024-01-01T12:00:00Z"
  },
  "assistantMessage": {
    "id": "msg-124",
    "role": "assistant",
    "content": "I'd be happy to help you plan a 5-day trip to Tokyo! Here's a suggested itinerary:\n\n**Day 1: Arrival & Shibuya**\n- Check into hotel in Shibuya\n- Visit Shibuya Crossing...",
    "created_at": "2024-01-01T12:00:05Z"
  },
  "retrievedContent": [
    {
      "id": "content-456",
      "title": "Best Hotels in Shibuya",
      "description": "Top-rated accommodations...",
      "similarity": 0.89
    }
  ]
}
```

#### Trip Creation Request
```typescript
POST /api/trips
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Tokyo Adventure",
  "destination": "Tokyo, Japan",
  "start_date": "2024-06-01",
  "end_date": "2024-06-07",
  "budget": 3000,
  "currency": "USD",
  "travelers_count": 2,
  "language": "en"
}
```

## Frontend Components

### Component Architecture

The frontend follows a component-based architecture with clear separation of concerns:

```
Components/
├── Layout Components
│   ├── Navigation.tsx        # Main navigation with auth
│   ├── Footer.tsx           # Site footer
│   └── Layout.tsx           # Page wrapper
├── Chat Components
│   ├── ChatInterface.tsx    # Main chat container
│   ├── ChatMessage.tsx      # Individual message
│   ├── ChatInput.tsx        # Input with voice/image
│   ├── SuggestedQuestions.tsx # Quick start options
│   └── TypingIndicator.tsx  # Loading animation
├── Trip Components
│   ├── TripCard.tsx         # Trip summary card
│   ├── TripSidebar.tsx      # Trip selection sidebar
│   ├── ItineraryItem.tsx    # Single itinerary item
│   └── TripForm.tsx         # Create/edit trip form
├── UI Components
│   ├── Button.tsx           # Reusable button
│   ├── Input.tsx            # Form inputs
│   ├── Modal.tsx            # Modal dialogs
│   └── LoadingSpinner.tsx   # Loading states
└── Feature Components
    ├── Hero.tsx             # Landing page hero
    ├── PopularDestinations.tsx # Destination showcase
    └── FeaturedTrips.tsx    # Trip packages
```

### Key Components Detail

#### ChatInterface Component
```typescript
interface ChatInterfaceProps {
  user: User;
  tripId?: string | null;
}

export default function ChatInterface({ user, tripId }: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const {
    messages,
    loading,
    error,
    sendMessage,
    clearHistory
  } = useChatMessages(user.id, tripId);

  // Handle message sending with context
  const handleSendMessage = async (message: string, context?: any) => {
    setIsTyping(true);
    try {
      await sendMessage(message, context);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages area with scrolling */}
      <div className="flex-1 overflow-y-auto">
        {messages.map(message => (
          <ChatMessage 
            key={message.id} 
            message={message} 
            isUser={message.role === 'user'}
            user={user}
          />
        ))}
        {isTyping && <TypingIndicator />}
      </div>
      
      {/* Input area */}
      <ChatInput
        value={inputMessage}
        onChange={setInputMessage}
        onSend={handleSendMessage}
        disabled={isTyping}
      />
    </div>
  );
}
```

#### Navigation Component with Auth
```typescript
export default function Navigation() {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  const currentLocale = pathname.split('/')[1] || 'en';
  const otherLocale = currentLocale === 'en' ? 'he' : 'en';

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Logo and main nav */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg">
                {/* Logo SVG */}
              </div>
              <span className="ml-2 text-xl font-bold">Travel Assistant</span>
            </Link>
          </div>

          {/* Language switcher and user menu */}
          <div className="flex items-center space-x-4">
            <Link href={`/${otherLocale}${pathname.substring(3)}`}>
              {otherLocale === 'he' ? 'עברית' : 'English'}
            </Link>
            
            {user ? (
              <UserMenu user={user} />
            ) : (
              <AuthButtons />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

### Custom Hooks

#### useChatMessages Hook
```typescript
export function useChatMessages(userId: string, tripId?: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load message history from API
  const loadMessages = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/chat/history?' + new URLSearchParams({
        ...(tripId && { tripId })
      }), {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [userId, tripId]);

  // Send new message to API
  const sendMessage = useCallback(async (content: string, context?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({
        message: content,
        tripId,
        context
      })
    });

    if (!response.ok) throw new Error('Failed to send message');
    
    const result = await response.json();
    
    // Update messages with new user and assistant messages
    setMessages(prev => [
      ...prev,
      result.userMessage,
      result.assistantMessage
    ]);
  }, [tripId]);

  return { messages, loading, error, sendMessage, loadMessages };
}
```

## AI & RAG System

### OpenAI Integration

The AI system uses OpenAI's latest models with a sophisticated RAG (Retrieval-Augmented Generation) implementation:

```typescript
export class OpenAIService {
  private systemPrompt = `You are an expert travel assistant. You help users plan trips by:
    1. Understanding preferences and constraints
    2. Providing personalized recommendations
    3. Creating detailed itineraries
    4. Supporting both English and Hebrew
    
    Always be helpful and provide specific, actionable advice.`;

  async generateResponse(
    messages: ChatMessage[],
    context: TravelContext = {},
    retrievedContent: any[] = []
  ): Promise<string> {
    let contextPrompt = this.systemPrompt;
    
    // Add language context
    if (context.language === 'he') {
      contextPrompt += '\n\nIMPORTANT: Respond in Hebrew (עברית).';
    }
    
    // Add travel context
    if (context.destination) {
      contextPrompt += `\nDestination: ${context.destination}`;
    }
    
    // Add retrieved content for RAG
    if (retrievedContent.length > 0) {
      contextPrompt += '\n\nRelevant information:\n';
      retrievedContent.forEach((item, index) => {
        contextPrompt += `${index + 1}. ${item.title}: ${item.description}\n`;
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: contextPrompt },
        ...messages.slice(-10) // Keep context manageable
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'Sorry, I could not respond.';
  }
}
```

### Vector Search Implementation

```typescript
// Generate embeddings for search
async generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

// Semantic search with PostgreSQL
async searchSimilarContent(
  query: string,
  location?: { lat: number; lng: number },
  limit = 10
): Promise<any[]> {
  const queryEmbedding = await this.generateEmbedding(query);
  
  const { data, error } = await supabase.rpc('search_similar_content', {
    query_embedding: queryEmbedding,
    match_threshold: 0.78,
    match_count: limit,
    location_filter: location ? `POINT(${location.lng} ${location.lat})` : null,
    radius_km: 50
  });

  return data || [];
}
```

### Database Function for Vector Search

```sql
CREATE OR REPLACE FUNCTION search_similar_content(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.78,
    match_count int DEFAULT 10,
    location_filter geography DEFAULT NULL,
    radius_km float DEFAULT 50
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    source_type source_type,
    similarity float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        scraped_data.id,
        scraped_data.title,
        scraped_data.description,
        scraped_data.source_type,
        1 - (scraped_data.embedding <=> query_embedding) AS similarity
    FROM scraped_data
    WHERE 
        (location_filter IS NULL OR ST_DWithin(scraped_data.location, location_filter, radius_km * 1000))
        AND 1 - (scraped_data.embedding <=> query_embedding) > match_threshold
    ORDER BY scraped_data.embedding <=> query_embedding
    LIMIT match_count;
$$;
```

## Data Ingestion Pipeline

### ETL Architecture

The ETL pipeline is built in Python with asyncio for concurrent processing:

```python
class ETLPipeline:
    def __init__(self):
        self.config = Config()
        self.processor = DataProcessor()
        self.loader = SupabaseLoader()
        self.rate_limiter = RateLimiter()
        
        self.extractors = {
            'expedia': ExpediaExtractor(self.config.expedia_api_key),
            'skyscanner': SkyscannerExtractor(self.config.skyscanner_api_key),
            'social_media': SocialMediaExtractor(),
            'tripadvisor': TripAdvisorScraper()
        }
    
    async def run_full_pipeline(self):
        # Extract from all sources
        all_data = []
        all_data.extend(await self._extract_api_data())
        all_data.extend(await self._extract_social_data())
        all_data.extend(await self._extract_scraped_data())
        
        # Process and enrich
        processed_data = await self._process_data(all_data)
        
        # Load into database
        await self._load_data(processed_data)
```

### Data Processing Pipeline

```python
class DataProcessor:
    async def process_item(self, raw_item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        # Validate required fields
        if not self._validate_item(raw_item):
            return None
        
        # Clean and standardize
        cleaned_item = self._clean_item(raw_item)
        
        # Enrich with additional data
        enriched_item = await self._enrich_item(cleaned_item)
        
        # Generate embeddings for search
        if enriched_item.get('processed_text'):
            embedding = await self._generate_embedding(enriched_item['processed_text'])
            enriched_item['embedding'] = embedding
        
        return enriched_item
    
    def _clean_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        cleaned = item.copy()
        
        # Clean text fields
        if cleaned.get('title'):
            cleaned['title'] = self._clean_text(cleaned['title'])
        
        # Standardize categories
        if cleaned.get('categories'):
            cleaned['categories'] = self._standardize_categories(cleaned['categories'])
        
        # Clean rating (normalize to 0-5 scale)
        if cleaned.get('rating'):
            cleaned['rating'] = self._clean_rating(cleaned['rating'])
        
        return cleaned
```

### API Extractors

#### Expedia Rapid API Extractor
```python
class ExpediaExtractor:
    async def extract_hotels(self, destination: str) -> List[Dict[str, Any]]:
        # Get destination ID
        destination_id = await self._get_destination_id(destination)
        
        # Search hotels
        search_params = {
            'destinationId': destination_id,
            'checkInDate': check_in,
            'checkOutDate': check_out,
            'rooms': 1,
            'adults': 2
        }
        
        async with self.session.get(f"{self.base_url}/hotels/search", 
                                   params=search_params) as response:
            data = await response.json()
            return self._parse_hotel_data(data, destination)
    
    def _parse_hotel_data(self, api_response: Dict) -> List[Dict]:
        hotels = []
        for prop in api_response.get('properties', []):
            hotel = {
                'source_type': 'api',
                'source_name': 'expedia',
                'title': prop.get('name', ''),
                'description': prop.get('description', ''),
                'location': {
                    'lat': prop.get('coordinates', {}).get('latitude'),
                    'lng': prop.get('coordinates', {}).get('longitude')
                },
                'rating': prop.get('guestRating', {}).get('rating'),
                'categories': ['hotel', 'accommodation'],
                'raw_data': prop
            }
            hotels.append(hotel)
        return hotels
```

## Authentication & Security

### JWT Authentication Flow

```typescript
// Backend authentication middleware
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const token = authHeader.substring(7);
    const supabase = createServerClient();
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
};
```

### Row Level Security (RLS) Policies

```sql
-- Users can only view their own data
CREATE POLICY "Users can view own trips" ON public.trips
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trips" ON public.trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages are restricted to owners
CREATE POLICY "Users can view own messages" ON public.messages
    FOR SELECT USING (auth.uid() = user_id);

-- Scraped data is readable by all authenticated users
CREATE POLICY "Users can view scraped data" ON public.scraped_data
    FOR SELECT TO authenticated USING (true);
```

### Rate Limiting

```typescript
const store: RateLimitStore = {};
const WINDOW_SIZE = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100;

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const clientId = req.ip;
  const now = Date.now();
  
  if (!store[clientId]) {
    store[clientId] = { count: 1, resetTime: now + WINDOW_SIZE };
  } else {
    store[clientId].count++;
  }

  if (store[clientId].count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  next();
};
```

### Content Moderation

```typescript
async moderateContent(text: string): Promise<{ flagged: boolean; categories: string[] }> {
  const moderation = await openai.moderations.create({ input: text });
  const result = moderation.results[0];
  
  const flaggedCategories = Object.entries(result.categories)
    .filter(([_, flagged]) => flagged)
    .map(([category, _]) => category);

  return {
    flagged: result.flagged,
    categories: flaggedCategories
  };
}
```

## Internationalization

### Next-Intl Configuration

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'he'],
  defaultLocale: 'en',
  localePrefix: 'always'
});

// i18n.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../messages/${locale}.json`)).default
}));
```

### RTL Support in CSS

```css
/* Global RTL support */
[dir="rtl"] {
  text-align: right;
}

[dir="rtl"] .flex {
  flex-direction: row-reverse;
}

/* Specific component RTL adjustments */
[dir="rtl"] .user-message {
  margin-left: 0;
  margin-right: auto;
}

[dir="rtl"] .search-icon {
  left: auto;
  right: 0.75rem;
}

/* Hebrew font support */
.font-hebrew {
  font-family: 'Noto Sans Hebrew', sans-serif;
}
```

### Language Detection and Translation

```typescript
// Automatic language detection
function detectLanguage(text: string): 'en' | 'he' {
  const hebrewChars = text.match(/[\u0590-\u05FF]/g) || [];
  return hebrewChars.length > text.length * 0.3 ? 'he' : 'en';
}

// Dynamic translation service
async translateText(text: string, targetLanguage: 'en' | 'he'): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: `Translate to ${targetLanguage === 'he' ? 'Hebrew' : 'English'}`
    }, {
      role: 'user',
      content: text
    }]
  });
  
  return completion.choices[0]?.message?.content || text;
}
```

## Testing Strategy

### Test Structure

```
__tests__/
├── api/                    # API endpoint tests
│   ├── auth.test.ts       # Authentication routes
│   ├── chat.test.ts       # Chat functionality
│   ├── trips.test.ts      # Trip management
│   └── booking.test.ts    # Booking system
├── components/            # React component tests
│   ├── ChatInterface.test.tsx
│   ├── Navigation.test.tsx
│   └── TripCard.test.tsx
├── services/              # Service layer tests
│   ├── openai.test.ts     # AI service tests
│   └── translation.test.ts
├── etl/                   # ETL pipeline tests
│   ├── data_processor.test.ts
│   └── extractors.test.ts
└── utils/                 # Utility function tests
```

### API Testing Example

```typescript
describe('/api/chat', () => {
  beforeEach(() => {
    // Mock Supabase client
    mockSupabaseClient = {
      auth: { getUser: jest.fn(() => ({ 
        data: { user: { id: 'user-123' } }, error: null 
      }))},
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({ data: { id: '123' }, error: null }))
          }))
        }))
      }))
    };
  });

  it('should send a message successfully', async () => {
    const response = await request(app)
      .post('/api/chat/message')
      .set('Authorization', 'Bearer mock-token')
      .send({
        message: 'Plan a trip to Tokyo',
        context: { destination: 'Tokyo', budget: 2000 }
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('userMessage');
    expect(response.body).toHaveProperty('assistantMessage');
  });
});
```

### Component Testing Example

```typescript
describe('ChatInterface', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  
  beforeEach(() => {
    mockUseChatMessages.mockReturnValue({
      messages: [],
      loading: false,
      error: null,
      sendMessage: jest.fn(),
      clearHistory: jest.fn()
    });
  });

  it('should render empty state with suggestions', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ChatInterface user={mockUser} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Start planning your perfect trip!')).toBeInTheDocument();
  });

  it('should handle message sending', async () => {
    const mockSendMessage = jest.fn();
    mockUseChatMessages.mockReturnValue({
      messages: [], loading: false, error: null,
      sendMessage: mockSendMessage, clearHistory: jest.fn()
    });

    render(<ChatInterface user={mockUser} />);
    
    fireEvent.change(screen.getByPlaceholderText(/ask me anything/i), {
      target: { value: 'Plan a trip' }
    });
    fireEvent.click(screen.getByTitle('Send message'));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Plan a trip', undefined);
    });
  });
});
```

## How to Run

### Prerequisites

1. **Node.js 18+** and npm
2. **Python 3.8+** (for ETL pipeline)
3. **Supabase account** (free tier available)
4. **OpenAI API key** (paid service)

### Initial Setup

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd travel-assistant
npm install
```

2. **Set up Python environment (for ETL)**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your actual API keys and configuration
```

### Database Setup

1. **Create Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Copy URL and keys to `.env`

2. **Run database schema**
```bash
# In Supabase SQL Editor, paste and execute:
cat supabase/schema.sql
```

3. **Enable required extensions**
```sql
-- In Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";
```

### Development Mode

Start all services in separate terminals:

1. **Frontend (Next.js)**
```bash
npm run dev
# Runs on http://localhost:3000
```

2. **Backend API**
```bash
npm run server:dev
# Runs on http://localhost:3001
```

3. **ETL Pipeline (optional)**
```bash
python src/etl/main.py --test
# Runs data ingestion in test mode
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test __tests__/api/chat.test.ts
```

### Production Build

```bash
# Build frontend
npm run build

# Build backend
npm run server:build

# Start production servers
npm start  # Frontend
node dist/server/index.js  # Backend
```

### Environment-Specific Configuration

#### Development (.env)
```env
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
# Use local Supabase instance or development project
```

#### Production (.env.production)
```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# Production Supabase project with proper security
```

### Docker Setup (Optional)

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t travel-assistant .
docker run -p 3000:3000 --env-file .env travel-assistant
```

## Configuration

### Required API Keys

1. **Supabase** (Free tier available)
   - Create project at supabase.com
   - Copy URL and anon key
   - Get service role key for backend

2. **OpenAI** (Paid service)
   - Create account at openai.com
   - Generate API key
   - Ensure sufficient credits for GPT-4 usage

3. **Optional but Recommended**
   - **Mapbox**: For interactive maps
   - **Expedia Rapid API**: Hotel data
   - **Skyscanner API**: Flight data
   - **Google Translate**: Enhanced translation

### Feature Flags

Control features via environment variables:

```env
# Feature toggles
ENABLE_ETL_PIPELINE=true
ENABLE_VOICE_INPUT=true
ENABLE_IMAGE_UPLOAD=true
ENABLE_GROUP_CHAT=false
ENABLE_BOOKING=true

# Rate limiting
API_RATE_LIMIT=100
ETL_RATE_LIMIT=50

# AI Configuration
OPENAI_MODEL=gpt-4-turbo-preview
EMBEDDING_MODEL=text-embedding-3-small
MAX_TOKENS=2000
```

### Performance Configuration

```env
# Database
DATABASE_POOL_SIZE=10
DATABASE_TIMEOUT=30000

# Caching
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# File uploads
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif
```

## Deployment

### Frontend Deployment (Vercel)

1. **Connect repository to Vercel**
```bash
npm install -g vercel
vercel login
vercel
```

2. **Configure environment variables**
   - Add all required env vars in Vercel dashboard
   - Ensure production Supabase URLs

3. **Deploy**
```bash
vercel --prod
```

### Backend Deployment (Railway)

1. **Connect to Railway**
```bash
npm install -g @railway/cli
railway login
railway init
```

2. **Configure environment**
```bash
railway variables set OPENAI_API_KEY=your_key
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_key
# Set all required variables
```

3. **Deploy**
```bash
railway up
```

### Database Migration

For production deployment:

1. **Backup existing data**
```bash
supabase db dump > backup.sql
```

2. **Run migrations**
```sql
-- Execute schema updates in production Supabase
-- Always test in staging first
```

3. **Verify deployment**
```bash
# Test all critical endpoints
curl https://your-api.railway.app/health
curl https://your-app.vercel.app/api/health
```

### Monitoring

Set up monitoring for production:

```typescript
// Add to server/index.ts
app.use((req, res, next) => {
  console.log({
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  next();
});

// Error tracking
app.use((error, req, res, next) => {
  console.error({
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  res.status(500).json({ error: 'Internal server error' });
});
```

This comprehensive implementation provides a fully functional, production-ready travel planning assistant with AI capabilities, bilingual support, and extensive testing coverage. The modular architecture allows for easy extension and customization based on specific requirements.