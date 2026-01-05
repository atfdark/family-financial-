#!/usr/bin/env python3
"""
Test script to verify the Vercel handler works correctly
"""

import sys
import os
import asyncio
import logging

# Add the api directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_handler():
    """Test the Vercel handler"""
    try:
        # Import the handler
        from vercel_handler import handler
        logger.info("Successfully imported vercel_handler")
        
        # Create a mock request object
        class MockRequest:
            def __init__(self):
                self.method = "GET"
                self.path = "/"
                self.headers = {
                    "host": "localhost",
                    "x-forwarded-proto": "http"
                }
                self.query = {}
            
            async def body(self):
                return b""
        
        class MockContext:
            pass
        
        # Test the handler
        request = MockRequest()
        context = MockContext()
        
        logger.info("Testing handler with mock request...")
        response = await handler(request, context)
        
        logger.info(f"Handler response: {response}")
        
        if response.get('statusCode') == 200:
            logger.info("✅ Handler test passed!")
        else:
            logger.error(f"❌ Handler test failed with status: {response.get('statusCode')}")
            
    except Exception as e:
        logger.error(f"❌ Handler test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_handler())