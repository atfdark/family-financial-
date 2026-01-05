#!/usr/bin/env python3

import requests
import json

def test_registration_final():
    print("Testing registration functionality (final)...")
    
    # Test the registration endpoint with a shorter password
    try:
        response = requests.post('http://localhost:8000/api/auth/register', 
                               json={'username': 'testuser', 'password': '123456'},
                               headers={'Content-Type': 'application/json'})
        
        print(f'Registration API Response: {response.status_code}')
        print(f'Response Content: {response.text}')
        
        if response.status_code == 200:
            print("Registration API is working!")
            data = response.json()
            print(f"Token: {data.get('token', 'N/A')}")
            print(f"User: {data.get('user', {})}")
        else:
            print("Registration API failed")
            
    except Exception as e:
        print(f"Error testing registration API: {e}")

def test_registration_page():
    print("\nTesting registration page...")
    
    try:
        response = requests.get('http://localhost:8000/register')
        print(f'Registration page Response: {response.status_code}')
        
        if response.status_code == 200:
            print("Registration page is accessible!")
            print(f"Page length: {len(response.text)} characters")
        else:
            print("Registration page failed")
            
    except Exception as e:
        print(f"Error testing registration page: {e}")

if __name__ == "__main__":
    test_registration_page()
    test_registration_final()