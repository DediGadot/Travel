-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE trip_status AS ENUM ('planning', 'active', 'completed', 'cancelled');
CREATE TYPE itinerary_item_type AS ENUM ('flight', 'hotel', 'restaurant', 'activity', 'transport', 'other');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE source_type AS ENUM ('api', 'scraping', 'social', 'manual');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'he')),
    avatar_url TEXT,
    user_metadata JSONB DEFAULT '{}',
    role user_role DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trips table
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
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'he')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itinerary items table
CREATE TABLE public.itinerary_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
    type itinerary_item_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326),
    address TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
    price DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    source source_type DEFAULT 'manual',
    source_url TEXT,
    media_urls TEXT[],
    booking_status booking_status DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table for chatbot conversations
CREATE TABLE public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE public.bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
    itinerary_item_id UUID REFERENCES public.itinerary_items(id) ON DELETE SET NULL,
    ota_name TEXT NOT NULL,
    ota_reference TEXT,
    product_type TEXT NOT NULL,
    product_id TEXT,
    affiliate_code TEXT,
    booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status booking_status DEFAULT 'pending',
    confirmation_number TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scraped data table for external content
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
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    language TEXT DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Translations table for dynamic content
CREATE TABLE public.translations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key TEXT NOT NULL,
    lang TEXT NOT NULL CHECK (lang IN ('en', 'he')),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(key, lang)
);

-- Group chat rooms for collaboration
CREATE TABLE public.group_chat_rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group chat participants
CREATE TABLE public.group_chat_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.group_chat_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Group chat messages
CREATE TABLE public.group_chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.group_chat_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'itinerary_update')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    itinerary_item_id UUID REFERENCES public.itinerary_items(id) ON DELETE CASCADE,
    scraped_data_id UUID REFERENCES public.scraped_data(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    title TEXT,
    content TEXT,
    photos TEXT[],
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (
        (itinerary_item_id IS NOT NULL AND scraped_data_id IS NULL) OR
        (itinerary_item_id IS NULL AND scraped_data_id IS NOT NULL)
    )
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_itinerary_items_trip_id ON public.itinerary_items(trip_id);
CREATE INDEX idx_itinerary_items_type ON public.itinerary_items(type);
CREATE INDEX idx_itinerary_items_location ON public.itinerary_items USING GIST(location);
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_trip_id ON public.messages(trip_id);
CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_trip_id ON public.bookings(trip_id);
CREATE INDEX idx_scraped_data_source_type ON public.scraped_data(source_type);
CREATE INDEX idx_scraped_data_location ON public.scraped_data USING GIST(location);
CREATE INDEX idx_scraped_data_embedding ON public.scraped_data USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_translations_key_lang ON public.translations(key, lang);
CREATE INDEX idx_group_chat_messages_room_id ON public.group_chat_messages(room_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Trips policies
CREATE POLICY "Users can view own trips" ON public.trips
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trips" ON public.trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON public.trips
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON public.trips
    FOR DELETE USING (auth.uid() = user_id);

-- Itinerary items policies
CREATE POLICY "Users can view items from own trips" ON public.itinerary_items
    FOR SELECT USING (
        trip_id IN (
            SELECT id FROM public.trips WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create items for own trips" ON public.itinerary_items
    FOR INSERT WITH CHECK (
        trip_id IN (
            SELECT id FROM public.trips WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update items from own trips" ON public.itinerary_items
    FOR UPDATE USING (
        trip_id IN (
            SELECT id FROM public.trips WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete items from own trips" ON public.itinerary_items
    FOR DELETE USING (
        trip_id IN (
            SELECT id FROM public.trips WHERE user_id = auth.uid()
        )
    );

-- Messages policies
CREATE POLICY "Users can view own messages" ON public.messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" ON public.bookings
    FOR UPDATE USING (auth.uid() = user_id);

-- Scraped data policies (read-only for users)
CREATE POLICY "Users can view scraped data" ON public.scraped_data
    FOR SELECT TO authenticated USING (true);

-- Translations policies (read-only for users)
CREATE POLICY "Users can view translations" ON public.translations
    FOR SELECT TO authenticated USING (true);

-- Group chat policies
CREATE POLICY "Participants can view room messages" ON public.group_chat_messages
    FOR SELECT USING (
        room_id IN (
            SELECT room_id FROM public.group_chat_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can send messages" ON public.group_chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        room_id IN (
            SELECT room_id FROM public.group_chat_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Reviews policies
CREATE POLICY "Users can view all reviews" ON public.reviews
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create own reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON public.reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON public.trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_itinerary_items_updated_at
    BEFORE UPDATE ON public.itinerary_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_scraped_data_updated_at
    BEFORE UPDATE ON public.scraped_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function for semantic search
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