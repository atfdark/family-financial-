#!/usr/bin/env python3

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'fastapi_backend'))

from database import get_supabase_admin_client

def test_mock_database():
    print("Testing mock database...")
    
    # Get the mock client
    client = get_supabase_admin_client()
    print(f"Client type: {type(client)}")
    
    # Test inserting a user
    user_data = {
        "name": "testuser",
        "email": "testuser@example.com",
        "password_hash": "hashed_password"
    }
    
    response = client.table('users').insert(user_data).select().execute()
    print(f"Insert response: {response.data}")
    
    # Test selecting a user
    response = client.table('users').select('id, name, email, password_hash').eq('email', 'testuser@example.com').execute()
    print(f"Select response: {response.data}")
    
    print("Mock database test completed successfully!")

if __name__ == "__main__":
    test_mock_database()