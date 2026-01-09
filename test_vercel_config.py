#!/usr/bin/env python3
"""
Test script to verify Vercel configuration and Supabase connection.
This script tests the configuration without actually deploying to Vercel.
"""

import os
import sys
import logging
from pathlib import Path

# Add the fastapi_backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'fastapi_backend'))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_env_variables():
    """Test if all required environment variables are set."""
    logger.info("Testing environment variables...")
    
    required_vars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY', 
        'SUPABASE_SERVICE_ROLE_KEY',
        'DATABASE_URL'
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            logger.info(f"✓ {var}: Set")
        else:
            missing_vars.append(var)
            logger.error(f"✗ {var}: Missing")
    
    if missing_vars:
        logger.error(f"Missing environment variables: {missing_vars}")
        return False
    
    return True

def test_imports():
    """Test if all required imports work."""
    logger.info("Testing imports...")
    
    try:
        # Test FastAPI import
        from fastapi import FastAPI
        logger.info("✓ FastAPI imported successfully")
        
        # Test Supabase import
        from supabase import create_client
        logger.info("✓ Supabase imported successfully")
        
        # Test config import
        from config import settings
        logger.info("✓ Config imported successfully")
        
        # Test main app import
        from fastapi_backend.main import app
        logger.info("✓ FastAPI app imported successfully")
        
        # Test routes
        routes = [route.path for route in app.routes]
        logger.info(f"✓ App has {len(routes)} routes: {routes}")
        
        return True
        
    except ImportError as e:
        logger.error(f"✗ Import error: {e}")
        return False
    except Exception as e:
        logger.error(f"✗ Unexpected error: {e}")
        return False

def test_supabase_connection():
    """Test Supabase connection."""
    logger.info("Testing Supabase connection...")
    
    try:
        from supabase import create_client
        
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_ANON_KEY')
        
        if not url or not key:
            logger.error("✗ Supabase credentials not found in environment")
            return False
        
        # Create client
        client = create_client(url, key)
        
        # Test connection by making a simple request
        response = client.table('users').select('id').limit(1).execute()
        
        logger.info("✓ Supabase connection successful")
        return True
        
    except Exception as e:
        logger.error(f"✗ Supabase connection failed: {e}")
        return False

def test_vercel_handler():
    """Test Vercel handler import."""
    logger.info("Testing Vercel handler...")
    
    try:
        # Test api/index.py import
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))
        from index import handler
        logger.info("✓ Vercel handler imported successfully")
        
        return True
        
    except ImportError as e:
        logger.error(f"✗ Vercel handler import failed: {e}")
        return False
    except Exception as e:
        logger.error(f"✗ Unexpected error in Vercel handler test: {e}")
        return False

def main():
    """Run all tests."""
    logger.info("Starting Vercel configuration tests...")
    
    tests = [
        ("Environment Variables", test_env_variables),
        ("Imports", test_imports),
        ("Supabase Connection", test_supabase_connection),
        ("Vercel Handler", test_vercel_handler)
    ]
    
    results = []
    for test_name, test_func in tests:
        logger.info(f"\n{'='*50}")
        logger.info(f"Running test: {test_name}")
        logger.info(f"{'='*50}")
        
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"Test {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    logger.info(f"\n{'='*50}")
    logger.info("TEST SUMMARY")
    logger.info(f"{'='*50}")
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "PASSED" if result else "FAILED"
        logger.info(f"{test_name}: {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    logger.info(f"\nTotal: {len(results)} tests")
    logger.info(f"Passed: {passed}")
    logger.info(f"Failed: {failed}")
    
    if failed == 0:
        logger.info("🎉 All tests passed! Vercel configuration is ready.")
        return True
    else:
        logger.info("❌ Some tests failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    # Load environment variables from .env file
    from dotenv import load_dotenv
    load_dotenv()
    
    success = main()
    sys.exit(0 if success else 1)