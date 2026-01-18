# Ultra-minimal handler for Vercel
import json

def handler(request):
    """
    Ultra-simple Vercel handler that doesn't import anything complex
    """
    try:
        # Get request info
        method = getattr(request, 'method', 'GET')
        path = getattr(request, 'path', '/')
        
        # Simple routing without any imports
        if path == '/' and method == 'GET':
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'message': 'Family Financial API - Working!',
                    'status': 'healthy',
                    'deployment': 'successful'
                }, default=str)
            }
        
        elif path in ['/health', '/api/health'] and method == 'GET':
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'status': 'healthy',
                    'message': 'Vercel deployment working!',
                    'timestamp': 'success'
                }, default=str)
            }
        
        # For any other path, return API info
        else:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'message': 'Family Financial API',
                    'status': 'running',
                    'endpoints': [
                        '/',
                        '/health',
                        '/api/health'
                    ],
                    'info': 'Root path shows deployment status'
                }, default=str)
            }
            
    except Exception as e:
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'message': 'Family Financial API',
                'status': 'running', 
                'error': str(e),
                'fallback': 'basic-handler-working'
            }, default=str)
        }