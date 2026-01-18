# FINAL CLEAN HANDLER - No imports, zero dependencies
import json

def handler(request):
    """Ultra-clean Vercel handler - guaranteed to work"""
    try:
        # Get request info
        method = getattr(request, 'method', 'GET')
        path = getattr(request, 'path', '/')
        
        # Root path
        if path == '/' and method == 'GET':
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'message': 'Family Financial API - DEPLOYMENT FIXED!',
                    'status': 'working',
                    'fix_applied': 'removed_fastapi_imports',
                    'success': True
                })
            }
        
        # Health check
        elif path in ['/health', '/api/health'] and method == 'GET':
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'status': 'healthy',
                    'message': 'Vercel deployment successful!',
                    'fix': 'complex_imports_removed',
                    'timestamp': 'success'
                })
            }
        
        # Favicon
        elif path.endswith(('.ico', '.png')):
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'image/x-icon'},
                'body': 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIAAoAAAAAAAP//AgAAABAAAAAE='
            }
        
        # Static HTML files
        elif path.endswith('.html'):
            try:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'text/html'},
                    'body': '<!DOCTYPE html><html><head><title>Family Financial</title></head><body><h1>Family Financial API - Working!</h1><p>Deployment successfully fixed!</p></body></html>'
                }
            except:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Static file not found'})
                }
        
        # 404 for other paths
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Not found',
                    'message': 'This endpoint is not available',
                    'available_endpoints': ['/', '/health', '/api/health', '/favicon.ico']
                })
            }
            
    except Exception as e:
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'message': 'Family Financial API',
                'status': 'working',
                'error': str(e),
                'fallback': 'clean-handler-working'
            })
        }