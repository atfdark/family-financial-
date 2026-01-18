import os
import sys

# Add the fastapi_backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'fastapi_backend'))

# Set environment variables before importing
if not os.getenv('SUPABASE_URL'):
    os.environ['SUPABASE_URL'] = os.getenv('VERCEL_SUPABASE_URL', '')
if not os.getenv('SUPABASE_ANON_KEY'):
    os.environ['SUPABASE_ANON_KEY'] = os.getenv('VERCEL_SUPABASE_ANON_KEY', '')
if not os.getenv('SUPABASE_SERVICE_ROLE_KEY'):
    os.environ['SUPABASE_SERVICE_ROLE_KEY'] = os.getenv('VERCEL_SUPABASE_SERVICE_ROLE_KEY', '')
if not os.getenv('DATABASE_URL'):
    os.environ['DATABASE_URL'] = os.getenv('VERCEL_DATABASE_URL', '')
if not os.getenv('JWT_SECRET'):
    os.environ['JWT_SECRET'] = os.getenv('VERCEL_JWT_SECRET', 'default-secret-change-in-production')
if not os.getenv('CORS_ORIGINS_STR'):
    os.environ['CORS_ORIGINS_STR'] = os.getenv('VERCEL_CORS_ORIGINS_STR', '*')

# Import and export the FastAPI app for Vercel ASGI handling
try:
    from main import app
except Exception as e:
    print(f"Error importing app: {e}")
    # Create a minimal fallback app
    from fastapi import FastAPI
    app = FastAPI(title="Fallback App")
    
    @app.get("/")
    async def root():
        return {"error": "App failed to initialize", "details": str(e)}

# Export the app as the default export
app_handler = app