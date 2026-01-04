import sys
import os

# Add the fastapi_backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'fastapi_backend'))

# Import the FastAPI app from the main module
from main import app

# Vercel expects the app to be named 'app' for ASGI
# This file serves as the entry point for the serverless function