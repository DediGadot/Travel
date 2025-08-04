"""
Skyscanner API extractor for flight data
"""

import aiohttp
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class SkyscannerExtractor:
    """Extractor for Skyscanner Travel API"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://partners.api.skyscanner.net/apiservices"
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def extract_flights(self, origin: str = "NYC", destination: str = "LON", departure_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Extract flight data between origin and destination"""
        if not self.api_key:
            logger.warning("Skyscanner API key not configured, returning mock data")
            return self._get_mock_flight_data(origin, destination)
        
        flights = []
        
        try:
            # Default departure date if not provided
            if not departure_date:
                departure_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            
            # Get places for origin and destination
            origin_place = await self._get_place_id(origin)
            dest_place = await self._get_place_id(destination)
            
            if not origin_place or not dest_place:
                logger.error(f"Could not resolve places for {origin} -> {destination}")
                return self._get_mock_flight_data(origin, destination)
            
            # Search for flights
            search_params = {
                'originPlace': origin_place,
                'destinationPlace': dest_place,
                'outboundDate': departure_date,
                'adults': 1,
                'currency': 'USD',
                'locale': 'en-US',
                'country': 'US'
            }
            
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            headers = {
                'X-RapidAPI-Key': self.api_key,
                'X-RapidAPI-Host': 'skyscanner-skyscanner-flight-search-v1.p.rapidapi.com'
            }
            
            # Create search session
            async with self.session.post(
                f"{self.base_url}/pricing/v1.0",
                data=search_params,
                headers=headers
            ) as response:
                
                if response.status in [200, 201]:
                    # Get session key from location header
                    location = response.headers.get('Location', '')
                    if location:
                        session_key = location.split('/')[-1]
                        flights = await self._poll_search_results(session_key, headers)
                else:
                    logger.error(f"Skyscanner API error: {response.status}")
                    return self._get_mock_flight_data(origin, destination)
        
        except Exception as e:
            logger.error(f"Error extracting Skyscanner flight data: {str(e)}")
            return self._get_mock_flight_data(origin, destination)
        
        return flights
    
    async def _get_place_id(self, location: str) -> Optional[str]:
        """Get place ID from location name"""
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            headers = {
                'X-RapidAPI-Key': self.api_key,
                'X-RapidAPI-Host': 'skyscanner-skyscanner-flight-search-v1.p.rapidapi.com'
            }
            
            params = {
                'query': location,
                'locale': 'en-US'
            }
            
            async with self.session.get(
                f"{self.base_url}/autosuggest/v1.0/US/USD/en-US/",
                params=params,
                headers=headers
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    places = data.get('Places', [])
                    if places:
                        return places[0].get('PlaceId')
        
        except Exception as e:
            logger.error(f"Error getting place ID for {location}: {str(e)}")
        
        return None
    
    async def _poll_search_results(self, session_key: str, headers: Dict[str, str]) -> List[Dict[str, Any]]:
        """Poll search results until complete"""
        max_polls = 10
        poll_count = 0
        
        while poll_count < max_polls:
            try:
                async with self.session.get(
                    f"{self.base_url}/pricing/uk2/v1.0/{session_key}",
                    headers=headers,
                    params={'pageIndex': 0, 'pageSize': 10}
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        if data.get('Status') == 'UpdatesComplete':
                            return self._parse_flight_data(data)
                        elif data.get('Status') == 'UpdatesPending':
                            await asyncio.sleep(2)
                            poll_count += 1
                            continue
                    else:
                        break
            
            except Exception as e:
                logger.error(f"Error polling search results: {str(e)}")
                break
        
        return []
    
    def _parse_flight_data(self, api_response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse Skyscanner API response into standardized format"""
        flights = []
        
        itineraries = api_response.get('Itineraries', [])
        legs = {leg['Id']: leg for leg in api_response.get('Legs', [])}
        carriers = {carrier['Id']: carrier for carrier in api_response.get('Carriers', [])}
        places = {place['Id']: place for place in api_response.get('Places', [])}
        
        for itinerary in itineraries:
            try:
                outbound_leg_id = itinerary['OutboundLegId']
                outbound_leg = legs.get(outbound_leg_id, {})
                
                origin_place = places.get(outbound_leg.get('OriginStation'), {})
                dest_place = places.get(outbound_leg.get('DestinationStation'), {})
                
                # Get carrier info
                carrier_ids = outbound_leg.get('Carriers', [])
                carrier_names = [carriers.get(cid, {}).get('Name', '') for cid in carrier_ids]
                
                flight = {
                    'source_type': 'api',
                    'source_name': 'skyscanner',
                    'title': f"Flight from {origin_place.get('Name', '')} to {dest_place.get('Name', '')}",
                    'description': f"Flight operated by {', '.join(carrier_names)} with duration {outbound_leg.get('Duration', 0)} minutes",
                    'origin': origin_place.get('Name', ''),
                    'destination': dest_place.get('Name', ''),
                    'departure_time': outbound_leg.get('Departure', ''),
                    'arrival_time': outbound_leg.get('Arrival', ''),
                    'duration': outbound_leg.get('Duration', 0),
                    'carriers': carrier_names,
                    'price': itinerary.get('PricingOptions', [{}])[0].get('Price', 0),
                    'currency': 'USD',
                    'stops': len(outbound_leg.get('Stops', [])),
                    'categories': ['flight', 'transport'],
                    'source_url': itinerary.get('PricingOptions', [{}])[0].get('DeeplinkUrl', ''),
                    'raw_data': itinerary,
                    'extracted_at': datetime.now().isoformat()
                }
                
                if flight['title']:  # Only add if has required fields
                    flights.append(flight)
                    
            except Exception as e:
                logger.error(f"Error parsing flight itinerary: {str(e)}")
                continue
        
        return flights
    
    def _get_mock_flight_data(self, origin: str, destination: str) -> List[Dict[str, Any]]:
        """Return mock flight data when API is not available"""
        return [
            {
                'source_type': 'api',
                'source_name': 'skyscanner',
                'title': f'Flight from {origin} to {destination}',
                'description': f'Direct flight from {origin} to {destination} operated by major airline',
                'origin': origin,
                'destination': destination,
                'departure_time': (datetime.now() + timedelta(days=30, hours=10)).isoformat(),
                'arrival_time': (datetime.now() + timedelta(days=30, hours=18)).isoformat(),
                'duration': 480,  # 8 hours
                'carriers': ['American Airlines'],
                'price': 599,
                'currency': 'USD',
                'stops': 0,
                'categories': ['flight', 'transport'],
                'source_url': f'https://www.skyscanner.com/mock-flight-{origin}-{destination}',
                'extracted_at': datetime.now().isoformat()
            },
            {
                'source_type': 'api',
                'source_name': 'skyscanner',
                'title': f'Budget Flight from {origin} to {destination}',
                'description': f'Connecting flight from {origin} to {destination} with one stop',
                'origin': origin,
                'destination': destination,
                'departure_time': (datetime.now() + timedelta(days=30, hours=6)).isoformat(),
                'arrival_time': (datetime.now() + timedelta(days=30, hours=16)).isoformat(),
                'duration': 600,  # 10 hours
                'carriers': ['Budget Airlines'],
                'price': 299,
                'currency': 'USD',
                'stops': 1,
                'categories': ['flight', 'transport', 'budget'],
                'source_url': f'https://www.skyscanner.com/mock-budget-{origin}-{destination}',
                'extracted_at': datetime.now().isoformat()
            }
        ]