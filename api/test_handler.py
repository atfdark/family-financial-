import os
import sys
import json
from urllib.parse import parse_qs

# Add the fastapi_backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'fastapi_backend'))

# Simple health check endpoint
def handler(request):
    """
    Basic Vercel serverless function handler for testing
    """
    try:
        # Get request info
        method = request.method
        path = request.path
        
        # Basic routing
        if path == '/' and method == 'GET':
            # Return the index.html file
            try:
                with open('../public/index.html', 'r') as f:
                    content = f.read()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'text/html'},
                    'body': content
                }
            except FileNotFoundError:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'message': 'Family Financial API',
                        'status': 'running',
                        'endpoints': [
                            '/api/auth/login',
                            '/api/auth/register', 
                            '/api/expenses',
                            '/api/dashboard/monthly',
                            '/api/dashboard/yearly',
                            '/api/categories',
                            '/api/payment-methods'
                        ]
                    })
                }
        
        elif path == '/api/health' and method == 'GET':
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'status': 'healthy',
                    'timestamp': str(os.environ.get('VERCEL_NOW', 'unknown'))
                })
            }
        
        # Return 404 for other paths
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Not found'})
        }
        
    except Exception as e:
        print(f"Handler error: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }

# Export the handler for Vercel
handler.handler = handler