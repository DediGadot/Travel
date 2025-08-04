# Travel Assistant - AI-Powered Travel Planning Platform

A comprehensive travel planning and booking assistant powered by AI, inspired by Mindtrip.ai. Built with Next.js, Supabase, and OpenAI, supporting both English and Hebrew languages.

## 🌟 Features

### Core Functionality
- **AI-Powered Chat Assistant**: Conversational travel planning with OpenAI GPT-4
- **Bilingual Support**: Full English and Hebrew (RTL) interface
- **Personalized Recommendations**: Hotels, restaurants, activities, and attractions
- **Smart Itinerary Generation**: AI-created detailed travel itineraries
- **Real-time Search**: Semantic search with vector embeddings
- **Trip Management**: Create, manage, and collaborate on trips

### Advanced Features
- **RAG System**: Retrieval-augmented generation for enhanced recommendations
- **Data Ingestion**: Automated collection from travel APIs and social media
- **Booking Integration**: Affiliate partnerships with Expedia, Booking.com, Skyscanner
- **Magic Camera**: Image analysis and translation (OCR)
- **Group Collaboration**: Shared trip planning and group chat
- **Multimodal AI**: Support for text, image, and voice input

## 🏗️ Architecture

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling with RTL support
- **next-intl**: Internationalization for English and Hebrew
- **Supabase Auth**: Authentication and user management

### Backend
- **Node.js/Express**: API server with TypeScript
- **Supabase**: PostgreSQL database with real-time features
- **OpenAI**: GPT-4 for conversations and text-embedding-3 for search
- **Vector Search**: pgvector for semantic similarity search
- **Rate Limiting**: Request throttling and API protection

### Data Layer
- **PostgreSQL**: Primary database with PostGIS for geospatial data
- **Vector Storage**: Embeddings for semantic search
- **Real-time**: Supabase channels for live updates
- **File Storage**: Supabase Storage for images and documents

### Data Sources
- **Travel APIs**: Expedia Rapid API, Skyscanner, Booking.com
- **Social Media**: Instagram, YouTube, TikTok (via APIs)
- **Web Scraping**: TripAdvisor and other travel sites
- **ETL Pipeline**: Python-based data processing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ (for ETL pipeline)
- Supabase account
- OpenAI API key

### Environment Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd travel-assistant
```

2. **Install dependencies**
```bash
npm install
pip install -r requirements.txt  # For ETL pipeline
```

3. **Environment variables**
Copy `.env.example` to `.env` and configure:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Travel APIs
EXPEDIA_RAPID_API_KEY=your_expedia_key
SKYSCANNER_API_KEY=your_skyscanner_key
BOOKING_AFFILIATE_ID=your_booking_affiliate_id

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# Other APIs (optional)
INSTAGRAM_ACCESS_TOKEN=your_instagram_token
YOUTUBE_API_KEY=your_youtube_key
GOOGLE_TRANSLATE_API_KEY=your_translate_key
```

### Database Setup

1. **Create Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Copy the URL and keys to your `.env` file

2. **Run database migrations**
```bash
# Execute the schema.sql file in your Supabase SQL editor
# Or use the Supabase CLI:
supabase db reset
```

3. **Enable extensions**
```sql
-- In Supabase SQL editor
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";
```

### Development

1. **Start the development servers**
```bash
# Frontend (Next.js)
npm run dev

# Backend API (separate terminal)
npm run server:dev

# ETL Pipeline (optional, separate terminal)
npm run etl:dev
```

2. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Supabase Dashboard: Your Supabase project URL

## 📁 Project Structure

```
travel-assistant/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── [locale]/          # Internationalized routes
│   │   ├── api/               # API routes (redirects to backend)
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── chat/              # Chat interface components
│   │   ├── Navigation.tsx     # Main navigation
│   │   └── ...
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   │   └── supabase.ts        # Supabase client
│   ├── server/                # Backend API server
│   │   ├── routes/            # API route handlers
│   │   ├── services/          # Business logic services
│   │   ├── middleware/        # Express middleware
│   │   └── index.ts           # Server entry point
│   ├── etl/                   # Data ingestion pipeline
│   │   ├── extractors/        # Data source extractors
│   │   ├── processors/        # Data processing logic
│   │   ├── loaders/           # Database loaders
│   │   └── main.py            # ETL entry point
│   └── types/                 # TypeScript type definitions
├── messages/                  # Internationalization files
├── supabase/                  # Database schema and migrations
├── __tests__/                 # Test files
├── public/                    # Static assets
└── ...config files
```

## 🧪 Testing

Run the test suite:
```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Test coverage includes:
- API endpoints (authentication, trips, chat, booking)
- React components (chat interface, forms)
- Services (OpenAI integration, data processing)
- Database operations and data validation

## 🌍 Internationalization

The application supports English and Hebrew with:
- **RTL Support**: Hebrew text direction and layout
- **Dynamic Translation**: User content translation via OpenAI
- **Localized Content**: Date formatting, currency, numbers
- **Language Detection**: Automatic detection of user's preferred language

### Adding New Languages
1. Create translation file in `/messages/[locale].json`
2. Add locale to `middleware.ts`
3. Update supported languages in configuration

## 🔐 Security

Security measures implemented:
- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Row-level security (RLS) policies
- **Rate Limiting**: API request throttling
- **Input Validation**: Zod schemas for request validation
- **Content Moderation**: OpenAI moderation for user content
- **Secure Headers**: Helmet.js for security headers
- **CORS**: Configured for production domains

## 📊 Monitoring & Analytics

- **Error Tracking**: Console logging with structured format
- **Performance**: Response time tracking
- **Usage Analytics**: User interaction tracking (anonymized)
- **API Monitoring**: Rate limit and error rate monitoring

## 🚀 Deployment

### Production Environment

1. **Frontend (Vercel)**
```bash
# Build and deploy
npm run build
vercel --prod
```

2. **Backend (Railway/Heroku)**
```bash
# Build server
npm run server:build
# Deploy to your platform
```

3. **Database (Supabase)**
   - Production Supabase project
   - Run schema migrations
   - Configure production environment variables

### Environment Variables for Production
Update environment variables for production domains and API keys.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and ensure they pass
6. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Use semantic commit messages
- Ensure accessibility compliance
- Test in both English and Hebrew

## 📝 API Documentation

### Authentication
All API endpoints require authentication via Bearer token:
```
Authorization: Bearer <supabase_jwt_token>
```

### Key Endpoints

**Chat & AI**
- `POST /api/chat/message` - Send message to AI assistant
- `GET /api/chat/history` - Get conversation history
- `POST /api/chat/itinerary` - Generate travel itinerary
- `POST /api/chat/translate` - Translate text

**Trip Management**
- `GET /api/trips` - Get user's trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get specific trip
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

**Bookings**
- `POST /api/booking` - Create booking
- `GET /api/booking` - Get user bookings
- `POST /api/booking/affiliate-url` - Generate affiliate URLs

**Search**
- `POST /api/search/semantic` - Semantic vector search
- `GET /api/search/text` - Text-based search
- `GET /api/search/destinations` - Popular destinations

## 🔧 Configuration

### OpenAI Configuration
- **Model**: GPT-4 Turbo for conversations
- **Embeddings**: text-embedding-3-small for search
- **Moderation**: Content safety checking
- **Vision**: GPT-4 Vision for image analysis

### Supabase Configuration
- **Database**: PostgreSQL with extensions
- **Auth**: Email/password and OAuth providers
- **Storage**: File uploads and image processing
- **Real-time**: Live chat and collaboration

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by [Mindtrip.ai](https://mindtrip.ai)
- Built with [Next.js](https://nextjs.org), [Supabase](https://supabase.com), and [OpenAI](https://openai.com)
- Travel data powered by Expedia, Skyscanner, and Booking.com APIs
- Icons and images from Unsplash and Heroicons

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation and FAQ
- Review the test files for usage examples

---

**Built with ❤️ for travelers worldwide**