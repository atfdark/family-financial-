#!/usr/bin/env python3

import requests
import json

def debug_registration():
    print("Debugging registration functionality...")
    
    # Test the registration endpoint with detailed error handling
    try:
        response = requests.post('http://localhost:8000/api/auth/register', 
                               json={'username': 'testuser', 'password': 'testpass123'},
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        print(f'Registration API Response: {response.status_code}')
        print(f'Response Headers: {dict(response.headers)}')
        print(f'Response Content: {response.text}')
        
        if response.status_code == 200:
            print("✅ Registration API is working!")
            data = response.json()
            print(f"Token: {data.get('token', 'N/A')}")
            print(f"User: {data.get('user', {})}")
        else:
            print("❌ Registration API failed")
            
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection Error: {e}")
    except requests.exceptions.Timeout as e:
        print(f"❌ Timeout Error: {e}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Request Error: {e}")
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")

if __name__ == "__main__":
    debug_registration()