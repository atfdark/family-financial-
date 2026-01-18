import os
import sys
import json

# Add the fastapi_backend directory to Python path
# sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'fastapi_backend'))

# Simple health check function for Vercel
def handler(request):
    """
    Simple Vercel serverless function handler
    """
    try:
        # Get request info
        method = getattr(request, 'method', 'GET')
        path = getattr(request, 'path', '/')
        
        # Basic routing
        if path == '/' and method == 'GET':
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'message': 'Family Financial API',
                    'status': 'running',
                    'endpoints': [
                        '/health',
                        '/api/health'
                    ]
                })
            }
        
        elif path in ['/health', '/api/health'] and method == 'GET':
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'status': 'healthy',
                    'timestamp': str(os.environ.get('VERCEL_NOW', 'unknown')),
                    'environment': 'vercel'
                })
            }
        
        # For static files
        elif path.endswith('.html') and method == 'GET':
            try:
                file_path = f"../public{path}"
                with open(file_path, 'r') as f:
                    content = f.read()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'text/html'},
                    'body': content
                }
            except FileNotFoundError:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Not found'})
                }
        
        # Return 404 for other paths
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Not found',
                    'message': 'This is a basic health check endpoint. Full API endpoints are available.',
                    'available_endpoints': ['/', '/health', '/api/health']
                })
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