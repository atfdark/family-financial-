#!/usr/bin/env python3
"""
Test script to verify Vercel configuration works correctly.
This tests the Vercel handler and configuration.
"""

import sys
import os
import json
from unittest.mock import Mock

def test_vercel_handler_import():
    """Test that the Vercel handler can be imported correctly."""
    try:
        # Add the api directory to the path
        api_path = os.path.join(os.path.dirname(__file__), 'api')
        sys.path.insert(0, api_path)
        
        from vercel_handler import handler
        print("PASS: Vercel handler imported successfully")
        return True
    except ImportError as e:
        print(f"FAIL: Failed to import Vercel handler: {e}")
        return False
    except Exception as e:
        print(f"FAIL: Error importing Vercel handler: {e}")
        return False

def test_vercel_json():
    """Test that vercel.json is properly formatted."""
    try:
        with open('vercel.json', 'r') as f:
            config = json.load(f)
        
        # Check required fields
        required_fields = ['version', 'functions', 'routes']
        for field in required_fields:
            if field not in config:
                print(f"FAIL: Missing required field in vercel.json: {field}")
                return False
        
        # Check function configuration
        if 'api/vercel_handler.py' not in config['functions']:
            print("FAIL: Missing api/vercel_handler.py function configuration")
            return False
        
        function_config = config['functions']['api/vercel_handler.py']
        if 'runtime' not in function_config:
            print("FAIL: Missing runtime configuration")
            return False
        
        if function_config['runtime'] != '@vercel/python@3.2.0':
            print(f"FAIL: Wrong runtime: {function_config['runtime']}")
            return False
        
        print("PASS: vercel.json configuration is valid")
        return True
    except json.JSONDecodeError as e:
        print(f"FAIL: Invalid JSON in vercel.json: {e}")
        return False
    except FileNotFoundError:
        print("FAIL: vercel.json not found")
        return False
    except Exception as e:
        print(f"FAIL: Error reading vercel.json: {e}")
        return False

def test_requirements():
    """Test that requirements.txt exists and has necessary dependencies."""
    try:
        with open('requirements.txt', 'r') as f:
            content = f.read()
        
        required_packages = ['fastapi', 'uvicorn', 'pydantic', 'supabase']
        missing_packages = []
        
        for package in required_packages:
            if package.lower() not in content.lower():
                missing_packages.append(package)
        
        if missing_packages:
            print(f"FAIL: Missing required packages in requirements.txt: {missing_packages}")
            return False
        
        print("PASS: requirements.txt contains necessary dependencies")
        return True
    except FileNotFoundError:
        print("FAIL: requirements.txt not found")
        return False
    except Exception as e:
        print(f"FAIL: Error reading requirements.txt: {e}")
        return False

def test_api_structure():
    """Test that the API directory structure is correct."""
    api_files = ['vercel_handler.py']
    
    for file in api_files:
        file_path = os.path.join('api', file)
        if not os.path.exists(file_path):
            print(f"FAIL: Missing required API file: {file_path}")
            return False
    
    print("PASS: API directory structure is correct")
    return True

def test_fastapi_backend_structure():
    """Test that the FastAPI backend structure is correct."""
    required_files = [
        'fastapi_backend/main.py',
        'fastapi_backend/models.py',
        'fastapi_backend/database.py'
    ]
    
    for file_path in required_files:
        if not os.path.exists(file_path):
            print(f"FAIL: Missing required backend file: {file_path}")
            return False
    
    print("PASS: FastAPI backend structure is correct")
    return True

def main():
    """Run all tests."""
    print("Testing Vercel Configuration...")
    print("=" * 50)
    
    tests = [
        test_vercel_handler_import,
        test_vercel_json,
        test_requirements,
        test_api_structure,
        test_fastapi_backend_structure
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("SUCCESS: All tests passed! Vercel configuration is ready.")
        return True
    else:
        print("WARNING: Some tests failed. Please fix issues before deploying to Vercel.")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)