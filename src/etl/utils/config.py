"""
Configuration management for ETL pipeline
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Configuration class for ETL pipeline"""
    
    def __init__(self):
        # Database
        self.database_url = os.getenv('DATABASE_URL')
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        # Travel APIs
        self.expedia_api_key = os.getenv('EXPEDIA_RAPID_API_KEY')
        self.expedia_api_secret = os.getenv('EXPEDIA_RAPID_API_SECRET')
        self.skyscanner_api_key = os.getenv('SKYSCANNER_API_KEY')
        self.booking_affiliate_id = os.getenv('BOOKING_AFFILIATE_ID')
        
        # Social Media APIs
        self.instagram_access_token = os.getenv('INSTAGRAM_ACCESS_TOKEN')
        self.youtube_api_key = os.getenv('YOUTUBE_API_KEY')
        self.tiktok_access_token = os.getenv('TIKTOK_ACCESS_TOKEN')
        
        # AI Services
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.google_translate_api_key = os.getenv('GOOGLE_TRANSLATE_API_KEY')
        
        # Rate limiting
        self.rate_limits = {
            'expedia': {'requests': 100, 'window': 3600},  # 100 requests per hour
            'skyscanner': {'requests': 1000, 'window': 86400},  # 1000 requests per day
            'instagram': {'requests': 200, 'window': 3600},  # 200 requests per hour
            'youtube': {'requests': 10000, 'window': 86400},  # 10000 requests per day
            'tripadvisor': {'requests': 100, 'window': 3600},  # 100 requests per hour (scraping)
        }
        
        # Processing settings
        self.batch_size = 100
        self.max_retries = 3
        self.retry_delay = 5  # seconds
        
        # Scraping settings
        self.scraping_delay = 2  # seconds between requests
        self.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        
        # Data quality settings
        self.min_description_length = 10
        self.required_fields = ['title', 'source_type']
        
        # Language settings
        self.supported_languages = ['en', 'he']
        self.default_language = 'en'
    
    def validate(self) -> bool:
        """Validate that required configuration is present"""
        required_vars = [
            'database_url',
            'supabase_url', 
            'supabase_service_key',
            'openai_api_key'
        ]
        
        missing_vars = []
        for var in required_vars:
            if not getattr(self, var):
                missing_vars.append(var)
        
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        return True