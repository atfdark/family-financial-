import sys
import os

# Add the fastapi_backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'fastapi_backend'))

# Import and export the FastAPI app for Vercel ASGI handling
from fastapi_backend.main import app