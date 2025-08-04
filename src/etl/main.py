#!/usr/bin/env python3
"""
Main ETL script for travel data ingestion
Handles data extraction from various travel APIs and social media sources
"""

import asyncio
import logging
import os
import sys
from datetime import datetime
from typing import List, Dict, Any

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from etl.extractors.expedia_extractor import ExpediaExtractor
from etl.extractors.skyscanner_extractor import SkyscannerExtractor
from etl.extractors.social_media_extractor import SocialMediaExtractor
from etl.extractors.scrapers.tripadvisor_scraper import TripAdvisorScraper
from etl.processors.data_processor import DataProcessor
from etl.loaders.supabase_loader import SupabaseLoader
from etl.utils.rate_limiter import RateLimiter
from etl.utils.config import Config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('etl.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class ETLPipeline:
    """Main ETL Pipeline orchestrator"""
    
    def __init__(self):
        self.config = Config()
        self.processor = DataProcessor()
        self.loader = SupabaseLoader()
        self.rate_limiter = RateLimiter()
        
        # Initialize extractors
        self.extractors = {
            'expedia': ExpediaExtractor(self.config.expedia_api_key, self.config.expedia_api_secret),
            'skyscanner': SkyscannerExtractor(self.config.skyscanner_api_key),
            'social_media': SocialMediaExtractor(
                instagram_token=self.config.instagram_access_token,
                youtube_key=self.config.youtube_api_key,
                tiktok_token=self.config.tiktok_access_token
            ),
            'tripadvisor': TripAdvisorScraper()
        }
    
    async def run_full_pipeline(self):
        """Run the complete ETL pipeline"""
        logger.info("Starting ETL pipeline execution")
        start_time = datetime.now()
        
        try:
            # Extract data from all sources
            all_data = []
            
            # Extract from APIs
            logger.info("Extracting data from travel APIs...")
            api_data = await self._extract_api_data()
            all_data.extend(api_data)
            
            # Extract from social media
            logger.info("Extracting data from social media...")
            social_data = await self._extract_social_data()
            all_data.extend(social_data)
            
            # Scrape additional sources
            logger.info("Scraping additional travel sources...")
            scraped_data = await self._extract_scraped_data()
            all_data.extend(scraped_data)
            
            # Process all data
            logger.info(f"Processing {len(all_data)} data items...")
            processed_data = await self._process_data(all_data)
            
            # Load into database
            logger.info("Loading processed data into database...")
            await self._load_data(processed_data)
            
            # Cleanup and statistics
            end_time = datetime.now()
            duration = end_time - start_time
            
            logger.info(f"ETL pipeline completed successfully")
            logger.info(f"Duration: {duration}")
            logger.info(f"Items processed: {len(processed_data)}")
            
        except Exception as e:
            logger.error(f"ETL pipeline failed: {str(e)}", exc_info=True)
            raise
    
    async def _extract_api_data(self) -> List[Dict[str, Any]]:
        """Extract data from travel APIs"""
        api_data = []
        
        # Popular destinations for data extraction
        destinations = [
            "Tokyo", "Paris", "New York", "London", "Rome", 
            "Barcelona", "Amsterdam", "Berlin", "Tel Aviv", "Istanbul"
        ]
        
        try:
            # Extract hotel data from Expedia
            if self.config.expedia_api_key:
                for destination in destinations:
                    await self.rate_limiter.acquire('expedia')
                    hotels = await self.extractors['expedia'].extract_hotels(destination)
                    api_data.extend(hotels)
                    await asyncio.sleep(1)  # Be respectful to API
            
            # Extract flight data from Skyscanner
            if self.config.skyscanner_api_key:
                await self.rate_limiter.acquire('skyscanner')
                flights = await self.extractors['skyscanner'].extract_flights()
                api_data.extend(flights)
            
        except Exception as e:
            logger.error(f"Error extracting API data: {str(e)}")
        
        return api_data
    
    async def _extract_social_data(self) -> List[Dict[str, Any]]:
        """Extract data from social media platforms"""
        social_data = []
        
        try:
            if self.config.instagram_access_token:
                await self.rate_limiter.acquire('instagram')
                instagram_posts = await self.extractors['social_media'].extract_instagram_travel_posts()
                social_data.extend(instagram_posts)
            
            if self.config.youtube_api_key:
                await self.rate_limiter.acquire('youtube')
                youtube_videos = await self.extractors['social_media'].extract_youtube_travel_videos()
                social_data.extend(youtube_videos)
                
        except Exception as e:
            logger.error(f"Error extracting social media data: {str(e)}")
        
        return social_data
    
    async def _extract_scraped_data(self) -> List[Dict[str, Any]]:
        """Extract data from web scraping"""
        scraped_data = []
        
        try:
            await self.rate_limiter.acquire('tripadvisor')
            tripadvisor_data = await self.extractors['tripadvisor'].scrape_attractions()
            scraped_data.extend(tripadvisor_data)
            
        except Exception as e:
            logger.error(f"Error scraping data: {str(e)}")
        
        return scraped_data
    
    async def _process_data(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process and enrich the extracted data"""
        processed_items = []
        
        for item in raw_data:
            try:
                # Process item
                processed_item = await self.processor.process_item(item)
                if processed_item:
                    processed_items.append(processed_item)
                    
            except Exception as e:
                logger.error(f"Error processing item: {str(e)}")
                continue
        
        return processed_items
    
    async def _load_data(self, processed_data: List[Dict[str, Any]]) -> None:
        """Load processed data into Supabase"""
        try:
            await self.loader.bulk_insert(processed_data)
            logger.info(f"Successfully loaded {len(processed_data)} items")
            
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            raise

async def main():
    """Main entry point"""
    pipeline = ETLPipeline()
    
    # Check if running in test mode
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        logger.info("Running in test mode with limited data")
        # Run with limited scope for testing
        await pipeline.run_full_pipeline()
    else:
        # Run full pipeline
        await pipeline.run_full_pipeline()

if __name__ == "__main__":
    asyncio.run(main())