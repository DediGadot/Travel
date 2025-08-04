"""
Data processor for cleaning, enriching and standardizing extracted data
"""

import asyncio
import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime
import aiohttp
import openai
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut

logger = logging.getLogger(__name__)

class DataProcessor:
    """Process and enrich extracted travel data"""
    
    def __init__(self):
        self.geocoder = Nominatim(user_agent="travel-assistant-etl")
        self.openai_client = None
        if openai.api_key:
            self.openai_client = openai
    
    async def process_item(self, raw_item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single data item"""
        try:
            # Validate required fields
            if not self._validate_item(raw_item):
                return None
            
            # Clean and standardize
            cleaned_item = self._clean_item(raw_item)
            
            # Enrich with additional data
            enriched_item = await self._enrich_item(cleaned_item)
            
            # Generate embeddings
            if self.openai_client and enriched_item.get('processed_text'):
                try:
                    embedding = await self._generate_embedding(enriched_item['processed_text'])
                    enriched_item['embedding'] = embedding
                except Exception as e:
                    logger.error(f"Error generating embedding: {str(e)}")
                    enriched_item['embedding'] = None
            
            return enriched_item
            
        except Exception as e:
            logger.error(f"Error processing item: {str(e)}")
            return None
    
    def _validate_item(self, item: Dict[str, Any]) -> bool:
        """Validate that item has required fields"""
        required_fields = ['title', 'source_type']
        
        for field in required_fields:
            if not item.get(field):
                logger.warning(f"Item missing required field: {field}")
                return False
        
        # Check minimum content requirements
        title = item.get('title', '')
        if len(title) < 3:
            logger.warning("Item title too short")
            return False
        
        return True
    
    def _clean_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and standardize item data"""
        cleaned = item.copy()
        
        # Clean title
        if cleaned.get('title'):
            cleaned['title'] = self._clean_text(cleaned['title'])
        
        # Clean description
        if cleaned.get('description'):
            cleaned['description'] = self._clean_text(cleaned['description'])
        
        # Standardize categories
        if cleaned.get('categories'):
            cleaned['categories'] = self._standardize_categories(cleaned['categories'])
        
        # Clean and validate rating
        if cleaned.get('rating'):
            cleaned['rating'] = self._clean_rating(cleaned['rating'])
        
        # Standardize price range
        if cleaned.get('price_range'):
            cleaned['price_range'] = self._standardize_price_range(cleaned['price_range'])
        
        # Clean address
        if cleaned.get('address'):
            cleaned['address'] = self._clean_text(cleaned['address'])
        
        # Ensure consistent field names
        cleaned = self._standardize_field_names(cleaned)
        
        return cleaned
    
    def _clean_text(self, text: str) -> str:
        """Clean text content"""
        if not isinstance(text, str):
            return str(text) if text else ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Remove special characters that might cause issues
        text = re.sub(r'[^\w\s\-\.,!?()&%$#@:;]', '', text)
        
        return text
    
    def _standardize_categories(self, categories: List[str]) -> List[str]:
        """Standardize category names"""
        if not isinstance(categories, list):
            return []
        
        # Category mapping
        category_map = {
            'lodging': 'hotel',
            'accommodation': 'hotel',
            'dining': 'restaurant',
            'food': 'restaurant',
            'sightseeing': 'attraction',
            'tour': 'activity',
            'entertainment': 'activity',
            'transport': 'transportation',
            'transportation': 'transport'
        }
        
        standardized = []
        for cat in categories:
            if isinstance(cat, str):
                cat_lower = cat.lower().strip()
                standardized_cat = category_map.get(cat_lower, cat_lower)
                if standardized_cat not in standardized:
                    standardized.append(standardized_cat)
        
        return standardized
    
    def _clean_rating(self, rating: Any) -> Optional[float]:
        """Clean and validate rating"""
        try:
            if isinstance(rating, str):
                # Extract number from string
                match = re.search(r'(\d+\.?\d*)', rating)
                if match:
                    rating = float(match.group(1))
                else:
                    return None
            
            rating = float(rating)
            
            # Normalize to 0-5 scale
            if rating > 10:
                rating = rating / 10 * 5  # Convert from 0-100 to 0-5
            elif rating > 5:
                rating = rating / 2  # Convert from 0-10 to 0-5
            
            # Ensure within valid range
            rating = max(0, min(5, rating))
            
            return round(rating, 1)
            
        except (ValueError, TypeError):
            return None
    
    def _standardize_price_range(self, price_range: str) -> str:
        """Standardize price range format"""
        if not isinstance(price_range, str):
            return "$$"
        
        price_range = price_range.lower().strip()
        
        # Map various formats to standard $ symbols
        if any(word in price_range for word in ['budget', 'cheap', 'low', 'inexpensive']):
            return "$"
        elif any(word in price_range for word in ['luxury', 'expensive', 'high-end', 'premium']):
            return "$$$"
        elif '$' in price_range:
            dollar_count = price_range.count('$')
            return '$' * min(max(dollar_count, 1), 3)
        else:
            return "$$"  # Default to moderate
    
    def _standardize_field_names(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure consistent field naming"""
        field_mapping = {
            'name': 'title',
            'summary': 'description',
            'location_lat': 'latitude',
            'location_lng': 'longitude',
            'location_lon': 'longitude',
            'img_url': 'image_url',
            'image': 'image_url',
            'url': 'source_url',
            'link': 'source_url'
        }
        
        standardized = {}
        for key, value in item.items():
            new_key = field_mapping.get(key, key)
            standardized[new_key] = value
        
        return standardized
    
    async def _enrich_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich item with additional data"""
        enriched = item.copy()
        
        # Add processing timestamp
        enriched['processed_at'] = datetime.now().isoformat()
        
        # Create processed text for embedding
        processed_text = self._create_processed_text(enriched)
        enriched['processed_text'] = processed_text
        
        # Geocoding if address provided but no coordinates
        if enriched.get('address') and not enriched.get('location'):
            coordinates = await self._geocode_address(enriched['address'])
            if coordinates:
                enriched['location'] = coordinates
        
        # Detect language
        if enriched.get('title') or enriched.get('description'):
            language = self._detect_language(enriched.get('title', '') + ' ' + enriched.get('description', ''))
            enriched['language'] = language
        
        return enriched
    
    def _create_processed_text(self, item: Dict[str, Any]) -> str:
        """Create processed text for embedding generation"""
        text_parts = []
        
        # Add title
        if item.get('title'):
            text_parts.append(item['title'])
        
        # Add description
        if item.get('description'):
            text_parts.append(item['description'])
        
        # Add categories
        if item.get('categories'):
            text_parts.append(' '.join(item['categories']))
        
        # Add address
        if item.get('address'):
            text_parts.append(item['address'])
        
        # Add other relevant fields
        for field in ['destination', 'origin', 'amenities']:
            if item.get(field):
                if isinstance(item[field], list):
                    text_parts.append(' '.join(map(str, item[field])))
                else:
                    text_parts.append(str(item[field]))
        
        return ' '.join(text_parts)
    
    async def _geocode_address(self, address: str) -> Optional[Dict[str, float]]:
        """Geocode address to get coordinates"""
        try:
            location = self.geocoder.geocode(address, timeout=10)
            if location:
                return {
                    'lat': float(location.latitude),
                    'lng': float(location.longitude)
                }
        except (GeocoderTimedOut, Exception) as e:
            logger.warning(f"Geocoding failed for address '{address}': {str(e)}")
        
        return None
    
    def _detect_language(self, text: str) -> str:
        """Detect language of text (simple heuristic)"""
        if not text:
            return 'en'
        
        # Simple Hebrew detection
        hebrew_chars = re.findall(r'[\u0590-\u05FF]', text)
        if len(hebrew_chars) > len(text) * 0.3:  # If >30% Hebrew characters
            return 'he'
        
        return 'en'  # Default to English
    
    async def _generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for text using OpenAI"""
        try:
            if not self.openai_client:
                return None
            
            response = await self.openai_client.embeddings.acreate(
                model="text-embedding-3-small",
                input=text
            )
            
            return response.data[0].embedding
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            return None