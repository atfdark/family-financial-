import sys
import os
import logging
from typing import Any, Dict
import json

# Add the fastapi_backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'fastapi_backend'))

# Configure logging for Vercel
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    # Import the FastAPI app from the fastapi_backend module
    from fastapi_backend.main import app
    
    logger.info("Vercel API entry point loaded successfully")
    logger.info(f"FastAPI app routes: {[route.path for route in app.routes]}")
except Exception as e:
    logger.error(f"Failed to load FastAPI app: {e}")
    logger.error("This is expected during Vercel build phase when environment variables are not yet set")
    # Create a minimal app for build phase
    from fastapi import FastAPI
    app = FastAPI(title="Family Financial API (Build Phase)")
    app.add_route("/", lambda: {"status": "building"}, methods=["GET"])

# Vercel Python serverless function handler
async def handler(request: Any, context: Any) -> Dict[str, Any]:
    """
    Vercel serverless function handler for FastAPI application.
    
    This function converts Vercel's request format to ASGI format
    and processes it through the FastAPI application.
    """
    try:
        # Extract request information
        method = request.method
        path = request.path
        headers = dict(request.headers)
        query_params = dict(request.query)
        
        # Get request body if present
        body = await request.body() if hasattr(request, 'body') else b''
        
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
        await app(scope, receive, send)
        
        # Prepare response
        response = {
            'statusCode': response_data.get('status', 200),
            'headers': response_data.get('headers', {}),
            'body': response_data.get('body', b'').decode('utf-8') if response_data.get('body') else ''
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error in handler: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Internal server error'})
        }

# Export the handler for Vercel
__all__ = ['handler']