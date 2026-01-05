import sys
import os
import logging

# Add the fastapi_backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'fastapi_backend'))

# Configure logging for Vercel
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    # Import the FastAPI app from the main module
    from main import app
    
    logger.info("Vercel API entry point loaded successfully")
    logger.info(f"FastAPI app routes: {[route.path for route in app.routes]}")
except Exception as e:
    logger.error(f"Failed to load FastAPI app: {e}")
    logger.error("This is expected during Vercel build phase when environment variables are not yet set")
    # Create a minimal app for build phase
    from fastapi import FastAPI
    app = FastAPI(title="Family Financial API (Build Phase)")
    app.add_route("/", lambda: {"status": "building"}, methods=["GET"])

# Vercel expects the app to be named 'app' for ASGI
# This file serves as the entry point for the serverless function