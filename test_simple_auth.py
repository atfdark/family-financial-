#!/usr/bin/env python3

# Simple test without config dependencies

import sys
import os

# Add the fastapi_backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'fastapi_backend'))

# Mock the config module to avoid loading environment variables
class MockSettings:
    jwt_secret = "your-very-secure-jwt-secret-key-change-this-in-production"
    jwt_algorithm = "HS256"
    jwt_expiration_hours = 24

# Replace the config module with our mock
sys.modules['config'] = type('config', (), {'settings': MockSettings()})()

# Now import the auth module
from auth import get_password_hash, create_access_token

def test_auth_functions():
    print("Testing auth functions...")
    
    # Test password hashing
    password = "testpass123"
    hashed_password = get_password_hash(password)
    print(f"Password: {password}")
    print(f"Hashed password: {hashed_password}")
    
    # Test JWT token creation
    token_data = {
        "userId": "1",
        "name": "testuser",
        "email": "testuser@example.com"
    }
    
    token = create_access_token(token_data)
    print(f"Token: {token}")
    
    print("Auth functions test completed successfully!")

if __name__ == "__main__":
    test_auth_functions()