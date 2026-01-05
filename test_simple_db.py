#!/usr/bin/env python3
"""
Simple database connection test script
"""
import os
import sys
import asyncio
from pathlib import Path

# Add the fastapi_backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "fastapi_backend"))

from config import settings
from supabase import create_client

async def test_supabase_connection():
    """Test Supabase connection with minimal setup"""
    try:
        print("Testing Supabase connection...")
        print(f"URL: {settings.supabase_url}")
        print(f"Anon Key: {settings.supabase_anon_key[:20]}...")
        
        # Try to create a simple client
        client = create_client(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_anon_key
        )
        
        print("✓ Supabase client created successfully")
        
        # Try a simple query
        response = client.table('users').select('id, name').limit(1).execute()
        
        if response.data:
            print(f"✓ Database query successful, found {len(response.data)} users")
            print(f"Sample user: {response.data[0]}")
        else:
            print("✓ Database query successful, no users found (expected for new database)")
            
        return True
        
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_supabase_connection())
    sys.exit(0 if success else 1)