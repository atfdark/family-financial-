import sys
import os
import logging
import json
from typing import Any, Dict, Callable, Awaitable
import asyncio

# Configure logging for Vercel
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the fastapi_backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'fastapi_backend'))

def handler(request, context):
    """
    Vercel serverless function handler for FastAPI application.
    
    This function converts Vercel's request format to ASGI format
    and processes it through the FastAPI application.
    """
    try:
        # Import the FastAPI app from the fastapi_backend module
        from fastapi_backend.main import app
        
        # Extract request information
        method = request.method
        path = request.path
        headers = dict(request.headers)
        query_params = dict(request.query)
        
        # Get request body if present
        body = request.body() if hasattr(request, 'body') else b''
        
        # Prepare ASGI scope
        scope = {
            'type': 'http',
            'method': method,
            'path': path,
            'query_string': '&'.join([f"{k}={v}" for k, v in query_params.items()]).encode(),
            'headers': [[k.lower().encode(), v.encode()] for k, v in headers.items()],
            'scheme': 'https' if request.headers.get('x-forwarded-proto') == 'https' else 'http',
            'server': (request.headers.get('host', 'localhost'), 443 if request.headers.get('x-forwarded-proto') == 'https' else 80),
        }
        
        # Create ASGI receive function
        async def receive():
            return {
                'type': 'http.request',
                'body': body,
                'more_body': False
            }
        
        # Create ASGI send function
        response_data = {}
        async def send(message):
            if message['type'] == 'http.response.start':
                response_data['status'] = message['status']
                response_data['headers'] = {k.decode(): v.decode() for k, v in message.get('headers', [])}
            elif message['type'] == 'http.response.body':
                response_data['body'] = message.get('body', b'')
        
        # Run the FastAPI app with ASGI
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def run_app():
            await app(scope, receive, send)
        
        loop.run_until_complete(run_app())
        loop.close()
        
        # Prepare response
        response = {
            'statusCode': response_data.get('status', 200),
            'headers': response_data.get('headers', {}),
            'body': response_data.get('body', b'').decode('utf-8') if response_data.get('body') else ''
        }
        
        return response
        
    except ImportError as e:
        logger.error(f"Import error: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Import error',
                'message': str(e),
                'hint': 'Check that fastapi_backend/main.py exists and is properly structured'
            })
        }
    except Exception as e:
        logger.error(f"Error in handler: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
                'hint': 'Check Vercel logs for detailed error information'
            })
        }

# Export the handler for Vercel
__all__ = ['handler']