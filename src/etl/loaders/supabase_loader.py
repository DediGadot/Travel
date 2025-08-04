"""
Supabase loader for inserting processed data into the database
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
import os
from datetime import datetime

logger = logging.getLogger(__name__)

class SupabaseLoader:
    """Load processed data into Supabase database"""
    
    def __init__(self):
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase configuration missing")
        
        self.client: Client = create_client(supabase_url, supabase_key)
        self.batch_size = 100
    
    async def bulk_insert(self, items: List[Dict[str, Any]]) -> None:
        """Insert items in batches"""
        if not items:
            logger.info("No items to insert")
            return
        
        logger.info(f"Starting bulk insert of {len(items)} items")
        
        # Process in batches
        for i in range(0, len(items), self.batch_size):
            batch = items[i:i + self.batch_size]
            await self._insert_batch(batch)
            logger.info(f"Inserted batch {i//self.batch_size + 1} ({len(batch)} items)")
        
        logger.info(f"Completed bulk insert of {len(items)} items")
    
    async def _insert_batch(self, batch: List[Dict[str, Any]]) -> None:
        """Insert a single batch of items"""
        try:
            # Transform items for database insertion
            db_items = []
            for item in batch:
                db_item = self._transform_for_db(item)
                if db_item:
                    db_items.append(db_item)
            
            if not db_items:
                logger.warning("No valid items in batch after transformation")
                return
            
            # Insert into scraped_data table
            result = self.client.table('scraped_data').insert(db_items).execute()
            
            if result.data:
                logger.debug(f"Successfully inserted {len(result.data)} items")
            else:
                logger.error("Insert returned no data")
                
        except Exception as e:
            logger.error(f"Error inserting batch: {str(e)}")
            # Try inserting items individually to identify problematic ones
            await self._insert_individually(batch)
    
    async def _insert_individually(self, batch: List[Dict[str, Any]]) -> None:
        """Insert items individually when batch insert fails"""
        logger.info("Attempting individual inserts for failed batch")
        
        for item in batch:
            try:
                db_item = self._transform_for_db(item)
                if db_item:
                    # Check for duplicates
                    if not await self._is_duplicate(db_item):
                        result = self.client.table('scraped_data').insert(db_item).execute()
                        if result.data:
                            logger.debug(f"Individually inserted: {db_item.get('title', 'Unknown')}")
                    else:
                        logger.debug(f"Skipped duplicate: {db_item.get('title', 'Unknown')}")
                        
            except Exception as e:
                logger.error(f"Error inserting individual item: {str(e)}")
                logger.debug(f"Problematic item: {item.get('title', 'Unknown')}")
    
    def _transform_for_db(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Transform processed item for database insertion"""
        try:
            # Handle location data
            location = None
            if item.get('location'):
                loc = item['location']
                if isinstance(loc, dict) and loc.get('lat') is not None and loc.get('lng') is not None:
                    # PostGIS POINT format
                    location = f"POINT({loc['lng']} {loc['lat']})"
            
            # Prepare database record
            db_item = {
                'source_type': item.get('source_type', 'manual'),
                'source_url': item.get('source_url'),
                'title': item.get('title', '')[:500],  # Limit title length
                'description': item.get('description', '')[:2000] if item.get('description') else None,
                'location': location,
                'address': item.get('address', '')[:500] if item.get('address') else None,
                'rating': item.get('rating'),
                'price_range': item.get('price_range'),
                'categories': item.get('categories', []),
                'raw_json': {
                    'original_data': item.get('raw_data', {}),
                    'processed_data': {
                        'amenities': item.get('amenities'),
                        'images': item.get('images'),
                        'destination': item.get('destination'),
                        'origin': item.get('origin'),
                        'extracted_at': item.get('extracted_at'),
                        'processed_at': item.get('processed_at')
                    }
                },
                'processed_text': item.get('processed_text', '')[:5000] if item.get('processed_text') else None,
                'embedding': item.get('embedding'),
                'language': item.get('language', 'en'),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            # Remove None values and empty strings
            db_item = {k: v for k, v in db_item.items() if v is not None and v != ''}
            
            # Ensure required fields are present
            if not db_item.get('title'):
                logger.warning("Item missing title, skipping")
                return None
            
            return db_item
            
        except Exception as e:
            logger.error(f"Error transforming item for DB: {str(e)}")
            return None
    
    async def _is_duplicate(self, item: Dict[str, Any]) -> bool:
        """Check if item already exists in database"""
        try:
            # Check for duplicates based on title and source_url
            query = self.client.table('scraped_data').select('id')
            
            if item.get('source_url'):
                query = query.eq('source_url', item['source_url'])
            else:
                # If no source URL, check by title and source_type
                query = query.eq('title', item['title']).eq('source_type', item['source_type'])
            
            result = query.limit(1).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Error checking for duplicates: {str(e)}")
            return False
    
    async def update_item(self, item_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing item"""
        try:
            updates['updated_at'] = datetime.now().isoformat()
            
            result = self.client.table('scraped_data').update(updates).eq('id', item_id).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Error updating item {item_id}: {str(e)}")
            return False
    
    async def delete_old_data(self, days_old: int = 90) -> int:
        """Delete data older than specified days"""
        try:
            cutoff_date = datetime.now().replace(day=datetime.now().day - days_old).isoformat()
            
            result = self.client.table('scraped_data').delete().lt('created_at', cutoff_date).execute()
            
            deleted_count = len(result.data) if result.data else 0
            logger.info(f"Deleted {deleted_count} old records")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error deleting old data: {str(e)}")
            return 0
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the data"""
        try:
            # Total count
            total_result = self.client.table('scraped_data').select('id', count='exact').execute()
            total_count = total_result.count if hasattr(total_result, 'count') else 0
            
            # Count by source type
            source_stats = {}
            for source_type in ['api', 'scraping', 'social', 'manual']:
                result = self.client.table('scraped_data').select('id', count='exact').eq('source_type', source_type).execute()
                source_stats[source_type] = result.count if hasattr(result, 'count') else 0
            
            # Recent additions (last 24 hours)
            yesterday = datetime.now().replace(day=datetime.now().day - 1).isoformat()
            recent_result = self.client.table('scraped_data').select('id', count='exact').gte('created_at', yesterday).execute()
            recent_count = recent_result.count if hasattr(recent_result, 'count') else 0
            
            return {
                'total_items': total_count,
                'by_source_type': source_stats,
                'recent_additions': recent_count,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting stats: {str(e)}")
            return {}
    
    async def cleanup_duplicates(self) -> int:
        """Remove duplicate entries based on source_url"""
        try:
            # Find duplicates
            duplicates_query = """
            SELECT source_url, array_agg(id ORDER BY created_at DESC) as ids
            FROM scraped_data 
            WHERE source_url IS NOT NULL 
            GROUP BY source_url 
            HAVING COUNT(*) > 1
            """
            
            # This would require raw SQL execution which might not be available
            # For now, return 0 and implement in a separate maintenance script
            logger.info("Duplicate cleanup not implemented in loader, use maintenance script")
            return 0
            
        except Exception as e:
            logger.error(f"Error cleaning up duplicates: {str(e)}")
            return 0