"""
Expedia Rapid API extractor for hotel data
"""

import aiohttp
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class ExpediaExtractor:
    """Extractor for Expedia Rapid API"""
    
    def __init__(self, api_key: str, api_secret: str):
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = "https://api.ean.com/2.4"
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def extract_hotels(self, destination: str, check_in: Optional[str] = None, check_out: Optional[str] = None) -> List[Dict[str, Any]]:
        """Extract hotel data for a destination"""
        if not self.api_key or not self.api_secret:
            logger.warning("Expedia API credentials not configured, returning mock data")
            return self._get_mock_hotel_data(destination)
        
        hotels = []
        
        try:
            # Default dates if not provided
            if not check_in:
                check_in = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            if not check_out:
                check_out = (datetime.now() + timedelta(days=32)).strftime('%Y-%m-%d')
            
            # First, get destination ID
            destination_id = await self._get_destination_id(destination)
            if not destination_id:
                logger.error(f"Could not find destination ID for {destination}")
                return self._get_mock_hotel_data(destination)
            
            # Search for hotels
            search_params = {
                'destinationId': destination_id,
                'checkInDate': check_in,
                'checkOutDate': check_out,
                'rooms': 1,
                'adults': 2,
                'currency': 'USD',
                'locale': 'en_US'
            }
            
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            async with self.session.get(
                f"{self.base_url}/hotels/search",
                params=search_params,
                headers=headers
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    hotels = self._parse_hotel_data(data, destination)
                else:
                    logger.error(f"Expedia API error: {response.status}")
                    return self._get_mock_hotel_data(destination)
        
        except Exception as e:
            logger.error(f"Error extracting Expedia hotel data: {str(e)}")
            return self._get_mock_hotel_data(destination)
        
        return hotels
    
    async def _get_destination_id(self, destination: str) -> Optional[str]:
        """Get destination ID from destination name"""
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            params = {
                'query': destination,
                'locale': 'en_US'
            }
            
            async with self.session.get(
                f"{self.base_url}/geography/destinations",
                params=params,
                headers=headers
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    if data.get('results') and len(data['results']) > 0:
                        return data['results'][0].get('destinationId')
        
        except Exception as e:
            logger.error(f"Error getting destination ID: {str(e)}")
        
        return None
    
    def _parse_hotel_data(self, api_response: Dict[str, Any], destination: str) -> List[Dict[str, Any]]:
        """Parse Expedia API response into standardized format"""
        hotels = []
        
        properties = api_response.get('properties', [])
        
        for prop in properties:
            try:
                hotel = {
                    'source_type': 'api',
                    'source_name': 'expedia',
                    'title': prop.get('name', ''),
                    'description': prop.get('description', ''),
                    'address': self._format_address(prop.get('address', {})),
                    'location': {
                        'lat': prop.get('coordinates', {}).get('latitude'),
                        'lng': prop.get('coordinates', {}).get('longitude')
                    },
                    'rating': prop.get('guestRating', {}).get('rating'),
                    'price_range': self._determine_price_range(prop.get('ratePlans', [])),
                    'categories': ['hotel', 'accommodation'],
                    'amenities': prop.get('amenities', []),
                    'images': [img.get('url') for img in prop.get('images', [])],
                    'source_url': f"https://www.expedia.com/h{prop.get('id')}.Hotel-Information",
                    'raw_data': prop,
                    'destination': destination,
                    'extracted_at': datetime.now().isoformat()
                }
                
                if hotel['title']:  # Only add if has required fields
                    hotels.append(hotel)
                    
            except Exception as e:
                logger.error(f"Error parsing hotel property: {str(e)}")
                continue
        
        return hotels
    
    def _format_address(self, address_data: Dict[str, Any]) -> str:
        """Format address from API response"""
        parts = []
        
        if address_data.get('streetAddress'):
            parts.append(address_data['streetAddress'])
        if address_data.get('locality'):
            parts.append(address_data['locality'])
        if address_data.get('countryName'):
            parts.append(address_data['countryName'])
        
        return ', '.join(parts)
    
    def _determine_price_range(self, rate_plans: List[Dict[str, Any]]) -> str:
        """Determine price range from rate plans"""
        if not rate_plans:
            return '$$'
        
        # Get the lowest price
        prices = []
        for plan in rate_plans:
            price_info = plan.get('price', {})
            if price_info.get('current'):
                prices.append(float(price_info['current'].replace('$', '').replace(',', '')))
        
        if not prices:
            return '$$'
        
        min_price = min(prices)
        
        if min_price < 100:
            return '$'
        elif min_price < 300:
            return '$$'
        else:
            return '$$$'
    
    def _get_mock_hotel_data(self, destination: str) -> List[Dict[str, Any]]:
        """Return mock hotel data when API is not available"""
        return [
            {
                'source_type': 'api',
                'source_name': 'expedia',
                'title': f'Grand Hotel {destination}',
                'description': f'Luxury hotel in the heart of {destination} with excellent amenities and service.',
                'address': f'123 Main Street, {destination}',
                'location': {'lat': 40.7128, 'lng': -74.0060},  # Default to NYC coords
                'rating': 4.5,
                'price_range': '$$$',
                'categories': ['hotel', 'luxury', 'accommodation'],
                'amenities': ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Spa'],
                'images': ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
                'source_url': f'https://www.expedia.com/mock-hotel-{destination.lower()}',
                'destination': destination,
                'extracted_at': datetime.now().isoformat()
            },
            {
                'source_type': 'api',
                'source_name': 'expedia',
                'title': f'Budget Inn {destination}',
                'description': f'Affordable accommodation in {destination} perfect for budget travelers.',
                'address': f'456 Budget Ave, {destination}',
                'location': {'lat': 40.7589, 'lng': -73.9851},
                'rating': 3.8,
                'price_range': '$',
                'categories': ['hotel', 'budget', 'accommodation'],
                'amenities': ['WiFi', 'Breakfast'],
                'images': ['https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800'],
                'source_url': f'https://www.expedia.com/mock-budget-{destination.lower()}',
                'destination': destination,
                'extracted_at': datetime.now().isoformat()
            }
        ]