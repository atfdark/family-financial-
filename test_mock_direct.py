#!/usr/bin/env python3

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'fastapi_backend'))

# Test the mock database directly
from database import get_supabase_admin_client
from auth import get_password_hash, create_access_token

def test_mock_database_directly():
    print("Testing mock database directly...")
    
    # Get the mock client
    client = get_supabase_admin_client()
    print(f"Client type: {type(client)}")
    
    # Test inserting a user
    user_data = {
        "name": "testuser",
        "email": "testuser@example.com",
        "password_hash": get_password_hash("testpass123")
    }
    
    print(f"User data: {user_data}")
    
    response = client.table('users').insert(user_data).select().execute()
    print(f"Insert response: {response.data}")
    
    # Test selecting a user
    response = client.table('users').select('id, name, email, password_hash').eq('email', 'testuser@example.com').execute()
    print(f"Select response: {response.data}")
    
    # Test creating a JWT token
    if response.data:
        user = response.data[0]
        token = create_access_token({
            "userId": str(user['id']),
            "name": user['name'],
            "email": user['email']
        })
        print(f"Token: {token}")
    
    print("Mock database test completed successfully!")

if __name__ == "__main__":
    test_mock_database_directly()