import os
import sys
import json

# Add the fastapi_backend directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
fastapi_backend_path = os.path.join(current_dir, '..', 'fastapi_backend')
if fastapi_backend_path not in sys.path:
    sys.path.append(fastapi_backend_path)

# Set environment variables for Vercel deployment
def set_vercel_env():
    """Set environment variables for Vercel deployment"""
    env_vars = {
        'SUPABASE_URL': os.getenv('VERCEL_SUPABASE_URL', os.getenv('SUPABASE_URL', '')),
        'SUPABASE_ANON_KEY': os.getenv('VERCEL_SUPABASE_ANON_KEY', os.getenv('SUPABASE_ANON_KEY', '')),
        'SUPABASE_SERVICE_ROLE_KEY': os.getenv('VERCEL_SUPABASE_SERVICE_ROLE_KEY', os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')),
        'DATABASE_URL': os.getenv('VERCEL_DATABASE_URL', os.getenv('DATABASE_URL', '')),
        'JWT_SECRET': os.getenv('VERCEL_JWT_SECRET', os.getenv('JWT_SECRET', 'default-secret-change-in-production')),
        'CORS_ORIGINS_STR': os.getenv('VERCEL_CORS_ORIGINS_STR', os.getenv('CORS_ORIGINS_STR', '*')),
        'SESSION_SECRET': os.getenv('VERCEL_SESSION_SECRET', os.getenv('SESSION_SECRET', 'default-session-secret'))
    }
    
    for key, value in env_vars.items():
        if value and not os.getenv(key):
            os.environ[key] = value

# Initialize environment
set_vercel_env()

# Try to import FastAPI app with error handling
app = None
import_error = None

try:
    from main import app as fastapi_app
    app = fastapi_app
except Exception as e:
    import_error = str(e)
    print(f"Failed to import FastAPI app: {import_error}")
    
    # Create a minimal fallback app
    try:
        from fastapi import FastAPI
        from fastapi.responses import JSONResponse
        
        app = FastAPI(title="Family Financial API - Fallback")
        
        @app.get("/")
        async def root():
            return {
                "error": "FastAPI app failed to initialize",
                "import_error": import_error,
                "message": "Deployment issue - check logs"
            }
            
        @app.get("/api/health")
        async def health():
            return {"status": "healthy", "app": "fallback"}
            
    except Exception as fallback_error:
        print(f"Failed to create fallback app: {fallback_error}")

# Simple request handler for Vercel
def handler(request):
    """Vercel serverless function handler"""
    
    if app is None:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Failed to initialize application',
                'import_error': import_error
            })
        }
    
    try:
        # For Vercel, we'll use a simple approach - just return basic info
        method = getattr(request, 'method', 'GET')
        path = getattr(request, 'path', '/')
        
        # Basic routing for essential endpoints
        if path == '/' and method == 'GET':
            # Return basic API info
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'message': 'Family Financial API',
                    'status': 'running',
                    'import_success': import_error is None,
                    'endpoints': [
                        '/api/health',
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
                    'app_initialized': app is not None,
                    'import_error': import_error
                })
            }
        
        # For other endpoints, return a message indicating they're not available in this simple mode
        else:
            return {
                'statusCode': 501,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Endpoint not available in simplified deployment mode',
                    'path': path,
                    'method': method,
                    'message': 'Full FastAPI functionality requires proper ASGI server'
                })
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Handler error',
                'message': str(e)
            })
        }

# Export for Vercel
module = type(sys)('handler')
module.handler = handler
sys.modules[__name__] = module