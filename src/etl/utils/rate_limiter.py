"""
Rate limiter for API requests
"""

import asyncio
import time
from typing import Dict
from collections import defaultdict

class RateLimiter:
    """Rate limiter to respect API limits"""
    
    def __init__(self):
        self.requests = defaultdict(list)
        self.limits = {
            'expedia': {'requests': 100, 'window': 3600},  # 100 requests per hour
            'skyscanner': {'requests': 1000, 'window': 86400},  # 1000 requests per day
            'instagram': {'requests': 200, 'window': 3600},  # 200 requests per hour
            'youtube': {'requests': 10000, 'window': 86400},  # 10000 requests per day
            'tripadvisor': {'requests': 100, 'window': 3600},  # 100 requests per hour (scraping)
        }
    
    async def acquire(self, service: str) -> None:
        """Acquire a rate limit slot for the service"""
        if service not in self.limits:
            return  # No rate limit for unknown services
        
        limit_config = self.limits[service]
        max_requests = limit_config['requests']
        window_seconds = limit_config['window']
        
        current_time = time.time()
        
        # Clean old requests outside the window
        self.requests[service] = [
            req_time for req_time in self.requests[service]
            if current_time - req_time < window_seconds
        ]
        
        # Check if we're at the limit
        if len(self.requests[service]) >= max_requests:
            # Calculate sleep time until oldest request expires
            oldest_request = min(self.requests[service])
            sleep_time = window_seconds - (current_time - oldest_request) + 1
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)
                return await self.acquire(service)  # Retry after sleeping
        
        # Record this request
        self.requests[service].append(current_time)
    
    def get_remaining_requests(self, service: str) -> int:
        """Get remaining requests for a service"""
        if service not in self.limits:
            return float('inf')
        
        limit_config = self.limits[service]
        max_requests = limit_config['requests']
        window_seconds = limit_config['window']
        
        current_time = time.time()
        
        # Clean old requests
        self.requests[service] = [
            req_time for req_time in self.requests[service]
            if current_time - req_time < window_seconds
        ]
        
        return max_requests - len(self.requests[service])
    
    def get_reset_time(self, service: str) -> float:
        """Get time until rate limit resets"""
        if service not in self.limits or not self.requests[service]:
            return 0
        
        limit_config = self.limits[service]
        window_seconds = limit_config['window']
        current_time = time.time()
        
        oldest_request = min(self.requests[service])
        reset_time = oldest_request + window_seconds - current_time
        
        return max(0, reset_time)